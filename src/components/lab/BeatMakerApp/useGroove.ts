"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAudioContext } from "@/lib/audioContext";
import { usePlayerStore } from "@/components/player/playerStore";
import { encodeWav } from "@/lib/wav";
import {
  BARS,
  BPM_MAX,
  BPM_MIN,
  KEYS,
  LANES,
  STEPS,
  createGrooveBus,
  emptyPattern,
  grooveUrl,
  peekPendingGroove,
  playLane,
  renderGroove,
  scheduleStep,
  setFilter,
  setPendingGroove,
  stepDuration,
  subscribePendingGroove,
  type Cell,
  type Groove,
  type GrooveBus,
  type Lane,
} from "@/lib/groove";
import { DEFAULT_GROOVE, PRESETS, randomGroove } from "./presets";

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.12;
const HISTORY = 60;

// one master bus per AudioContext (the context is shared site-wide and
// outlives the window)
const buses = new WeakMap<BaseAudioContext, GrooveBus>();
function busFor(ctx: AudioContext, filter: number) {
  let bus = buses.get(ctx);
  if (!bus) {
    bus = createGrooveBus(ctx, filter, true);
    buses.set(ctx, bus);
  }
  return bus;
}

export function useGroove() {
  // a beat arriving from a share link (#beat=…) seeds the machine
  const [groove, setGroove] = useState<Groove>(() => peekPendingGroove() ?? DEFAULT_GROOVE);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState({ step: -1, bar: 0 });
  const [solo, setSolo] = useState<Lane[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFailed, setExportFailed] = useState(false);
  const [shareStatus, setShareStatus] = useState<{ state: "copied" | "manual"; url: string } | null>(null);

  const grooveRef = useRef(groove);
  const silentRef = useRef<ReadonlySet<Lane>>(new Set());
  const historyRef = useRef<Groove[]>([]);
  const ctxRef = useRef<AudioContext | null>(null);
  const busRef = useRef<GrooveBus | null>(null);
  const nextStepRef = useRef(0);
  const nextBarRef = useRef(0);
  const nextTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef(0);
  const scheduledRef = useRef<{ step: number; bar: number; time: number }[]>([]);
  const tapsRef = useRef<number[]>([]);

  useEffect(() => {
    grooveRef.current = groove;
    if (busRef.current && ctxRef.current) setFilter(busRef.current.filter, groove.filter, ctxRef.current.currentTime, 0.03);
  }, [groove]);
  useEffect(() => {
    silentRef.current = new Set(solo.length ? LANES.filter((l) => !solo.includes(l)) : groove.muted);
  }, [solo, groove.muted]);

  /** Change the groove; `undoable` edits (the pattern, presets) go on the undo stack. */
  const update = useCallback((fn: (g: Groove) => Groove, undoable = true) => {
    const prev = grooveRef.current;
    const next = fn(prev);
    if (next === prev) return;
    if (undoable) {
      historyRef.current.push(prev);
      if (historyRef.current.length > HISTORY) historyRef.current.shift();
      setCanUndo(true);
    }
    grooveRef.current = next;
    setGroove(next);
  }, []);

  const undo = useCallback(() => {
    const prev = historyRef.current.pop();
    if (prev) {
      grooveRef.current = prev;
      setGroove(prev);
    }
    setCanUndo(historyRef.current.length > 0);
  }, []);

  // the initializer above took any pending beat; later links (pasted into a
  // tab where the Beat Maker is already open) arrive through the subscription
  useEffect(() => {
    setPendingGroove(null);
    return subscribePendingGroove(() => {
      const g = peekPendingGroove();
      if (!g) return;
      setPendingGroove(null);
      update(() => g);
    });
  }, [update]);

  /** `stroke` continues a drag, so the whole drag undoes as one edit. */
  const setCell = useCallback(
    (lane: Lane, step: number, cell: Cell, stroke = false) =>
      update((g) => {
        if (g.pattern[lane][step] === cell) return g;
        const row = [...g.pattern[lane]];
        row[step] = cell;
        return { ...g, pattern: { ...g.pattern, [lane]: row } };
      }, !stroke),
    [update],
  );

  const ensureAudio = useCallback(() => {
    const ctx = getAudioContext();
    ctxRef.current = ctx;
    busRef.current = busFor(ctx, grooveRef.current.filter);
    return { ctx, bus: busRef.current };
  }, []);

  const scheduler = useCallback(() => {
    const ctx = ctxRef.current;
    const bus = busRef.current;
    if (!ctx || !bus) return;
    const stepDur = stepDuration(grooveRef.current.bpm);
    // Background tabs throttle timers to ~1/s; skip the steps that went by
    // instead of firing them all at once when the tab comes back.
    const behind = ctx.currentTime - nextTimeRef.current;
    if (behind > stepDur) {
      const missed = Math.ceil(behind / stepDur);
      nextTimeRef.current += missed * stepDur;
      const total = nextBarRef.current * STEPS + nextStepRef.current + missed;
      nextStepRef.current = total % STEPS;
      nextBarRef.current = Math.floor(total / STEPS) % BARS;
    }
    while (nextTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD_S) {
      const step = nextStepRef.current;
      const bar = nextBarRef.current;
      scheduleStep(ctx, bus.input, grooveRef.current, bar, step, nextTimeRef.current, silentRef.current);
      scheduledRef.current.push({ step, bar, time: nextTimeRef.current });
      nextTimeRef.current += stepDur;
      nextStepRef.current = (step + 1) % STEPS;
      if (nextStepRef.current === 0) nextBarRef.current = (bar + 1) % BARS;
    }
  }, []);

  useEffect(() => {
    if (!playing) return;
    const tick = () => {
      const ctx = ctxRef.current;
      if (ctx) {
        const q = scheduledRef.current;
        while (q.length > 1 && q[1].time <= ctx.currentTime) q.shift();
        if (q.length && q[0].time <= ctx.currentTime + 0.02) {
          const { step, bar } = q[0];
          setPosition((p) => (p.step === step && p.bar === bar ? p : { step, bar }));
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing]);

  const play = useCallback(() => {
    // one soundtrack at a time: the media player steps aside
    usePlayerStore.getState().pause();
    const { ctx } = ensureAudio();
    nextStepRef.current = 0;
    nextBarRef.current = 0;
    nextTimeRef.current = ctx.currentTime + 0.05;
    scheduledRef.current = [];
    scheduler();
    timerRef.current = setInterval(scheduler, LOOKAHEAD_MS);
    setPlaying(true);
  }, [ensureAudio, scheduler]);

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setPlaying(false);
    setPosition({ step: -1, bar: 0 });
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  /** Audition one lane (clicking its name). */
  const preview = useCallback(
    (lane: Lane) => {
      const { ctx, bus } = ensureAudio();
      const g = grooveRef.current;
      const bar = playing ? position.bar : 0;
      playLane(ctx, bus.input, lane, ctx.currentTime + 0.01, { accent: false, key: g.key, prog: g.prog, bar, stepDur: stepDuration(g.bpm) });
    },
    [ensureAudio, playing, position.bar],
  );

  const tapTempo = useCallback(() => {
    const now = performance.now();
    const taps = tapsRef.current.filter((t) => now - t < 2500);
    taps.push(now);
    tapsRef.current = taps.slice(-6);
    if (taps.length < 2) return;
    const gaps = taps.slice(1).map((t, i) => t - taps[i]);
    const bpm = Math.round(60000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length));
    update((g) => ({ ...g, bpm: Math.min(BPM_MAX, Math.max(BPM_MIN, bpm)) }), false);
  }, [update]);

  const exportWav = useCallback(async () => {
    setExporting(true);
    setExportFailed(false);
    try {
      const g = grooveRef.current;
      const blob = encodeWav(await renderGroove({ ...g, muted: [...silentRef.current] }));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `saeculo-beatmaker-${Math.round(g.bpm)}bpm-${KEYS[g.key].name.replace(/[^A-Za-z]+/g, "")}.wav`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      // offline rendering unsupported or out of memory
      setExportFailed(true);
    } finally {
      setExporting(false);
    }
  }, []);

  const share = useCallback(async () => {
    const url = grooveUrl(grooveRef.current);
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus({ state: "copied", url });
    } catch {
      // clipboard blocked — show the link so it can be copied by hand
      setShareStatus({ state: "manual", url });
    }
  }, []);

  const analyser = useCallback(() => busRef.current?.analyser ?? null, []);

  return {
    groove,
    playing,
    position,
    solo,
    canUndo,
    exporting,
    exportFailed,
    shareStatus,
    play,
    stop,
    undo,
    setCell,
    preview,
    tapTempo,
    exportWav,
    share,
    analyser,
    dismissShare: () => setShareStatus(null),
    set: (patch: Partial<Omit<Groove, "pattern">>) => update((g) => ({ ...g, ...patch }), false),
    clear: () => update((g) => ({ ...g, pattern: emptyPattern() })),
    clearLane: (lane: Lane) => update((g) => ({ ...g, pattern: { ...g.pattern, [lane]: Array<Cell>(STEPS).fill(0) } })),
    randomize: () => update((g) => randomGroove(g)),
    loadPreset: (name: string) => {
      const p = PRESETS[name];
      if (p) update((g) => ({ ...p, muted: g.muted }));
    },
    toggleMute: (lane: Lane) =>
      update((g) => ({ ...g, muted: g.muted.includes(lane) ? g.muted.filter((l) => l !== lane) : [...g.muted, lane] }), false),
    toggleSolo: (lane: Lane) => setSolo((s) => (s.includes(lane) ? s.filter((l) => l !== lane) : [...s, lane])),
  };
}
