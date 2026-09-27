"use client";

import { useEffect, useRef, useState } from "react";
import { DIAL, HIDDEN_STATION, STATIONS } from "@/data/radio";
import { RADIO_SNIPPET } from "@/data/secrets";
import { TRACKS } from "@/data/tracks";
import { setMuffle, usePlayerStore } from "@/components/player/playerStore";
import { startStatic, type RadioStatic } from "@/lib/radioStatic";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

// Night Radio: an old portable receiver. Drag the dial (or scroll it, or
// use the arrow keys) through live static; each of saeculo's tracks is a
// station, played through the global player, so the gadgets, the tray and
// the lock screen follow along. Off-station, the music bleeds through
// muffled under the hiss. Past the end of the printed scale there's one
// more station.

const LOCK = 0.15; // MHz either side of a station that counts as tuned in
const REACH = 0.7; // how far a station's bleed carries

const round = (f: number) => Math.round(f * 10) / 10;
const clampFreq = (f: number) => Math.min(DIAL.max, Math.max(DIAL.min, round(f)));
const pct = (f: number) => ((f - DIAL.min) / (DIAL.max - DIAL.min)) * 100;

/** What the dial is on: a station, the hidden one, or static. */
function tune(freq: number) {
  let best: { index: number; dist: number } | null = null;
  STATIONS.forEach((s, index) => {
    const dist = Math.abs(freq - s.freq);
    if (!best || dist < best.dist) best = { index, dist };
  });
  const near = best as { index: number; dist: number } | null;
  const hiddenDist = Math.abs(freq - HIDDEN_STATION.freq);
  const signal = Math.max(0, 1 - (near?.dist ?? 99) / REACH, 1 - hiddenDist / REACH);
  if (hiddenDist <= LOCK) return { station: null, hidden: true, signal: 1 };
  if (near && near.dist <= LOCK) return { station: STATIONS[near.index], hidden: false, signal: 1 };
  return { station: null, hidden: false, signal };
}

/** A DJ line typed out a letter at a time. */
function Typed({ text }: { text: string }) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setShown((n) => (n >= text.length ? n : n + 1)), 38);
    return () => clearInterval(id);
  }, [text, reduced]);
  const visible = reduced ? text : text.slice(0, shown);
  return (
    <>
      <span aria-hidden>
        {visible}
        {!reduced && shown < text.length && <span className="radio-caret">▌</span>}
      </span>
      <span className="sr-only">{text}</span>
    </>
  );
}

export default function RadioApp() {
  const [on, setOn] = useState(false);
  const [freq, setFreq] = useState(92.1);
  const hissRef = useRef<RadioStatic | null>(null);
  const snippetRef = useRef<HTMLAudioElement | null>(null);
  const dialRef = useRef<HTMLDivElement>(null);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const { station, hidden, signal } = tune(freq);

  // the hiss and the muffle follow the dial while the set is on
  useEffect(() => {
    if (!on) return;
    hissRef.current?.setLevel(muted ? 0 : Math.pow(1 - signal, 0.8) * volume);
    setMuffle(1 - signal, 0.12);
  }, [on, signal, volume, muted]);

  // landing on a station puts its track on the global player
  const stationTrack = station ? TRACKS.findIndex((t) => t.id === station.trackId) : -1;
  useEffect(() => {
    if (!on || stationTrack < 0) return;
    const player = usePlayerStore.getState();
    if (player.trackIndex !== stationTrack) player.selectTrack(stationTrack, true);
    else if (!player.playing) player.play();
  }, [on, stationTrack]);

  // the hidden station: the player goes quiet and a vault snippet plays,
  // thin and far away
  useEffect(() => {
    if (!on || !hidden) return;
    const player = usePlayerStore.getState();
    const wasPlaying = player.playing;
    player.pause();
    const a = new Audio(RADIO_SNIPPET);
    a.loop = true;
    a.volume = player.muted ? 0 : 0.55 * player.volume;
    snippetRef.current = a;
    a.play().catch(() => {});
    return () => {
      a.pause();
      snippetRef.current = null;
      if (wasPlaying) usePlayerStore.getState().play();
    };
  }, [on, hidden]);
  useEffect(() => {
    if (snippetRef.current) snippetRef.current.volume = muted ? 0 : 0.55 * volume;
  }, [muted, volume]);

  // switching off (or closing the window) leaves the player clear
  useEffect(() => {
    if (!on) return;
    return () => {
      hissRef.current?.stop();
      hissRef.current = null;
      setMuffle(0, 0.3);
    };
  }, [on]);

  const power = () => {
    if (on) {
      setOn(false);
      return;
    }
    hissRef.current = startStatic();
    setOn(true);
  };

  const fromPointer = (clientX: number) => {
    const r = dialRef.current?.getBoundingClientRect();
    if (!r) return;
    setFreq(clampFreq(DIAL.min + ((clientX - r.left) / r.width) * (DIAL.max - DIAL.min)));
  };

  const valueText = !on
    ? `${freq.toFixed(1)} FM, radio off`
    : hidden
      ? `${freq.toFixed(1)} FM, an unlisted station`
      : station
        ? `${freq.toFixed(1)} FM, ${station.call}, playing ${TRACKS[stationTrack]?.title}`
        : `${freq.toFixed(1)} FM, static`;

  const line = !on ? "" : hidden ? HIDDEN_STATION.line : station ? station.line : "";
  const bars = Math.round(signal * 5);

  return (
    <div className="radio-body flex h-full flex-col gap-3 overflow-y-auto p-3 text-[#e9dcc0] select-none">
      {/* speaker grille + display */}
      <div className="flex min-h-0 gap-3 max-sm:flex-col">
        <div className="radio-grille w-[110px] shrink-0 rounded-[6px] max-sm:hidden" aria-hidden />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-[15px] tracking-[0.25em] [font-family:var(--font-film)]">NIGHT RADIO</p>
            <button
              onClick={power}
              aria-pressed={on}
              aria-label="Power"
              className={`radio-power grid h-8 w-8 place-items-center rounded-full ${on ? "radio-power-on" : ""}`}
            >
              <span aria-hidden className="text-[13px]">⏻</span>
            </button>
          </div>
          <div
            className={`radio-lcd min-h-[74px] rounded-[4px] px-3 py-2 text-[13px] leading-snug [font-family:var(--font-type)] ${on ? "" : "radio-lcd-off"}`}
            aria-live="polite"
          >
            <div className="flex items-center justify-between text-[11px] tracking-widest">
              <span data-testid="radio-readout">{on ? `${freq.toFixed(1)} FM` : "—"}</span>
              <span>{on ? (hidden ? HIDDEN_STATION.call : (station?.call ?? "· · ·")) : ""}</span>
              <span aria-label={on ? `Signal ${bars} of 5` : undefined} className="flex items-end gap-[2px]">
                {on &&
                  [1, 2, 3, 4, 5].map((b) => (
                    <span key={b} className={`w-[3px] ${b <= bars ? "bg-current" : "bg-current opacity-20"}`} style={{ height: 3 + b * 2 }} />
                  ))}
              </span>
            </div>
            <p className="mt-1.5" data-testid="radio-dj">
              {line ? <Typed key={line} text={line} /> : on ? <span className="opacity-60">static…</span> : ""}
            </p>
          </div>
        </div>
      </div>

      {/* the dial */}
      <div
        ref={dialRef}
        role="slider"
        tabIndex={0}
        aria-label="Tuning dial"
        aria-valuemin={DIAL.min}
        aria-valuemax={DIAL.max}
        aria-valuenow={freq}
        aria-valuetext={valueText}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          fromPointer(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) fromPointer(e.clientX);
        }}
        onWheel={(e) => setFreq((f) => clampFreq(f + (e.deltaY > 0 ? -0.1 : 0.1)))}
        onKeyDown={(e) => {
          const step = { ArrowRight: 0.1, ArrowUp: 0.1, ArrowLeft: -0.1, ArrowDown: -0.1, PageUp: 1, PageDown: -1 }[e.key];
          if (step) {
            e.preventDefault();
            setFreq((f) => clampFreq(f + step));
          } else if (e.key === "Home" || e.key === "End") {
            e.preventDefault();
            setFreq(e.key === "Home" ? DIAL.min : DIAL.max);
          }
        }}
        className="radio-dial relative h-[64px] shrink-0 cursor-ew-resize touch-none rounded-[4px] focus-visible:outline-2 focus-visible:outline-[#ffcf6a]"
      >
        {Array.from({ length: (DIAL.printedMax - DIAL.printedMin) * 2 + 1 }, (_, i) => {
          const f = DIAL.printedMin + i / 2;
          const major = i % 4 === 0;
          return (
            <span key={i} aria-hidden className="absolute top-2 w-px bg-[#e8c98a]" style={{ left: `${pct(f)}%`, height: major ? 16 : 8, opacity: major ? 0.9 : 0.5 }}>
              {major && <span className="absolute top-[20px] -translate-x-1/2 text-[10px] text-[#e8c98a] [font-family:var(--font-type)]">{f}</span>}
            </span>
          );
        })}
        {/* the stations show as faint marks, as on an old set with pencil notes */}
        {STATIONS.map((s) => (
          <span key={s.freq} aria-hidden className="absolute bottom-2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#b3402e] opacity-70" style={{ left: `${pct(s.freq)}%` }} />
        ))}
        <span aria-hidden className="radio-needle absolute top-1 bottom-1 w-[2px] -translate-x-1/2" style={{ left: `${pct(freq)}%` }} />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="opacity-70">Presets</span>
        {STATIONS.map((s, i) => (
          <button key={s.freq} onClick={() => setFreq(s.freq)} className="radio-preset px-2.5 py-1" aria-label={`Preset ${i + 1}: ${s.freq} FM`}>
            {s.freq}
          </button>
        ))}
        <span className="ml-auto opacity-60 max-sm:hidden">drag, scroll or ← → to tune</span>
      </div>
      {/* on a phone the speaker sits under the dial */}
      <div className="radio-grille min-h-[90px] w-full flex-1 rounded-[6px] sm:hidden" aria-hidden />
    </div>
  );
}
