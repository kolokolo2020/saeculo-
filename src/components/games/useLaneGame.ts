"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LaneEngine, LANE_KEYS, generateLaneNotes, type Judgement } from "@/lib/laneEngine";
import { loadBuffer, startLoop } from "@/lib/backingTrack";
import { usePlayerStore } from "@/components/player/playerStore";
import type { Track } from "@/lib/types";

export type LanePhase = "idle" | "loading" | "running" | "done";

export interface LaneGameHandlers {
  /** A lane press landed on a note. */
  onHit?: (judgement: "perfect" | "good", lane: number, ctx: AudioContext) => void;
  /** A note scrolled past unhit. */
  onMiss?: (lane: number) => void;
  /** A lane press with no note in range. */
  onWhiff?: (lane: number, ctx: AudioContext) => void;
  /** Called once per frame with game time; return true to end the run. */
  onFrame?: (now: number) => boolean | void;
  /** Note fall time for the current moment (lets a game speed up). */
  travel?: (now: number) => number;
  /** The run ended (time up, or a handler ended it). */
  onEnd?: () => void;
}

const COUNT_LABELS = ["3", "2", "1", "GO"];

// Runs a lane game: plays the chosen track as a looping backing track,
// charts notes onto its beat grid, counts in over the first bar, and turns
// key presses / button taps into hit or miss callbacks. The game hook on
// top only has to implement its scoring rules.
export function useLaneGame(handlers: LaneGameHandlers) {
  const [phase, setPhase] = useState<LanePhase>("idle");
  const [countdown, setCountdown] = useState<string | null>(null);
  const [judgement, setJudgement] = useState<Judgement | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<LaneEngine | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const backingRef = useRef<{ stop(): void } | null>(null);
  const rafRef = useRef(0);
  const runningRef = useRef(false);
  const countRef = useRef<string | null>(null);
  const judgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlersRef = useRef(handlers);
  const loopRef = useRef<() => void>(() => {});

  useEffect(() => {
    handlersRef.current = handlers;
  });

  const flash = useCallback((j: Judgement) => {
    setJudgement(j);
    if (judgeTimerRef.current) clearTimeout(judgeTimerRef.current);
    judgeTimerRef.current = setTimeout(() => setJudgement(null), 320);
  }, []);

  const finish = useCallback(() => {
    if (!runningRef.current) return;
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    backingRef.current?.stop();
    backingRef.current = null;
    countRef.current = null;
    setCountdown(null);
    setPhase("done");
    handlersRef.current.onEnd?.();
  }, []);

  const loop = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !runningRef.current) return;
    const now = engine.now();
    const h = handlersRef.current;

    const beat = Math.floor(now / engine.beatDur);
    const label = now < 0 ? COUNT_LABELS[0] : beat < 4 ? COUNT_LABELS[beat] : null;
    if (label !== countRef.current) {
      countRef.current = label;
      setCountdown(label);
    }

    for (const note of engine.sweepMisses()) {
      h.onMiss?.(note.lane);
      flash("miss");
    }
    if (!runningRef.current) return; // a miss handler may have ended the run

    engine.draw(canvasRef.current, h.travel?.(now) ?? 1.5);

    if (h.onFrame?.(now) || now > engine.endTime) {
      finish();
      return;
    }
    rafRef.current = requestAnimationFrame(() => loopRef.current());
  }, [finish, flash]);

  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  const start = useCallback(async (track: Track, lengthS: number, density: number) => {
    // one soundtrack at a time: the media player steps aside for the game
    usePlayerStore.getState().pause();
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    const ctx = ctxRef.current;
    backingRef.current?.stop();
    cancelAnimationFrame(rafRef.current);
    setPhase("loading");
    setJudgement(null);
    try {
      await ctx.resume();
    } catch {
      // fine — the engine falls back to wall-clock time
    }
    let buffer: AudioBuffer | null = null;
    try {
      buffer = await loadBuffer(ctx, track.src);
    } catch {
      buffer = null; // play silently rather than not at all
    }
    const startAt = ctx.currentTime + 0.15;
    if (buffer) backingRef.current = startLoop(ctx, buffer, startAt, 0.55);
    const engine = engineRef.current ?? new LaneEngine();
    engine.begin(ctx, startAt, track.bpm, generateLaneNotes(track.bpm, lengthS, density), lengthS + 0.6);
    engineRef.current = engine;
    runningRef.current = true;
    setPhase("running");
    rafRef.current = requestAnimationFrame(() => loopRef.current());
  }, []);

  const hitLane = useCallback(
    (lane: number) => {
      const engine = engineRef.current;
      const ctx = ctxRef.current;
      if (!engine || !ctx || !runningRef.current) return;
      const result = engine.press(lane);
      if (result) {
        handlersRef.current.onHit?.(result.judgement, lane, ctx);
        flash(result.judgement);
      } else {
        handlersRef.current.onWhiff?.(lane, ctx);
        flash("miss");
      }
    },
    [flash],
  );

  useEffect(() => {
    if (phase !== "running") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const idx = LANE_KEYS.indexOf(e.key.toLowerCase() as (typeof LANE_KEYS)[number]);
      if (idx !== -1) hitLane(idx);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, hitLane]);

  useEffect(() => {
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(rafRef.current);
      backingRef.current?.stop();
      if (judgeTimerRef.current) clearTimeout(judgeTimerRef.current);
      void ctxRef.current?.close();
    };
  }, []);

  return { canvasRef, phase, countdown, judgement, start, finish, hitLane };
}
