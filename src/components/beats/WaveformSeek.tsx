"use client";

import { useEffect, useRef, useState } from "react";
import { usePlayerStore } from "@/components/player/playerStore";
import { formatTime } from "@/lib/audio";
import type { Track } from "@/lib/types";

// The seek bar drawn as the track's own waveform (measured by
// scripts/analyze-tracks.mjs), in thin rounded bars. Played audio fills in
// the player's accent (the dusk blue of the theme easing into the lilac of
// the cover's rays, read from the colour tokens in globals.css); hover shows the time; click or drag to seek; arrow
// keys step five seconds. Tracks that haven't been analysed get a plain
// slider.

// The waveforms (src/data/trackWaveforms.json) aren't part of the first
// download: they load in their own small chunk once the seek bar is on
// screen. Until then the bar is drawn empty, so nothing jumps.
type Waveforms = Record<string, number[] | undefined>;
let waveforms: Waveforms | null = null;
let loading: Promise<Waveforms> | null = null;
function loadWaveforms() {
  loading ??= import("@/data/trackWaveforms.json").then((m) => (waveforms = m.default as Waveforms));
  return loading;
}
function useWaveforms() {
  const [all, setAll] = useState<Waveforms | null>(waveforms);
  useEffect(() => {
    if (all) return;
    let live = true;
    loadWaveforms().then((w) => live && setAll(w), () => live && setAll({}));
    return () => {
      live = false;
    };
  }, [all]);
  return all;
}

export default function WaveformSeek({ track }: { track: Track | undefined }) {
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const seek = usePlayerStore((s) => s.seek);
  const loop = usePlayerStore((s) => s.loop);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const dragging = useRef(false);
  const all = useWaveforms();
  const peaks = track && all ? (all[track.id] ?? null) : undefined;
  const frac = duration ? Math.min(1, currentTime / duration) : 0;

  useEffect(() => {
    const c = canvas.current;
    if (!c || peaks === null) return;
    const draw = () => {
      const r = c.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.max(1, Math.round(r.width * dpr));
      c.height = Math.max(1, Math.round(r.height * dpr));
      const g = c.getContext("2d");
      if (!g) return;
      const bars = Math.max(20, Math.floor(r.width / 3));
      const bw = c.width / bars;
      const mid = c.height / 2;
      g.clearRect(0, 0, c.width, c.height);
      if (!peaks) return; // still loading: an empty bar
      const css = getComputedStyle(c);
      const color = (name: string) => css.getPropertyValue(name).trim();
      const [accent, accent2, rest, cursor, wash] = ["--color-dusk", "--color-lilac", "--color-wave-rest", "--color-line", "--color-dusk-wash"].map(color);
      // the loop: a band behind the bars, edged in the accent
      if (loop && duration) {
        const x0 = (loop.start / duration) * c.width;
        const x1 = (loop.end / duration) * c.width;
        g.fillStyle = wash;
        g.fillRect(x0, 0, x1 - x0, c.height);
        g.fillStyle = accent;
        g.fillRect(x0, 0, dpr, c.height);
        g.fillRect(x1 - dpr, 0, dpr, c.height);
      }
      const played = g.createLinearGradient(0, 0, c.width, 0);
      played.addColorStop(0, accent);
      played.addColorStop(1, accent2);
      for (let i = 0; i < bars; i++) {
        const a = Math.floor((i / bars) * peaks.length);
        const b = Math.max(a + 1, Math.floor(((i + 1) / bars) * peaks.length));
        let p = 0;
        for (let k = a; k < b; k++) p = Math.max(p, peaks[k] ?? 0);
        const h = Math.max(2 * dpr, p * (c.height - 2 * dpr));
        const w = bw * 0.62;
        g.fillStyle = (i + 0.5) / bars <= frac ? played : rest;
        g.beginPath();
        if (g.roundRect) g.roundRect(i * bw + (bw - w) / 2, mid - h / 2, w, h, w / 2);
        else g.rect(i * bw + (bw - w) / 2, mid - h / 2, w, h);
        g.fill();
      }
      if (hover !== null) {
        g.fillStyle = cursor;
        g.fillRect(hover * c.width - dpr / 2, 0, dpr, c.height);
      }
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(c);
    return () => ro.disconnect();
  }, [peaks, frac, hover, loop, duration]);

  if (peaks === null) {
    return (
      <input
        type="range"
        className="mp-range w-full"
        aria-label="Seek"
        aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
        min={0}
        max={duration || 1}
        step={0.1}
        value={Math.min(currentTime, duration || 1)}
        disabled={!duration}
        onChange={(e) => seek(Number(e.target.value))}
        style={{ ["--fill" as string]: `${frac * 100}%` }}
      />
    );
  }

  const at = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  };

  return (
    <div className="relative">
      <canvas
        ref={canvas}
        className="mp-wave block h-11 w-full cursor-pointer touch-none rounded-[4px]"
        role="slider"
        tabIndex={0}
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration || 0)}
        aria-valuenow={Math.round(currentTime)}
        aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
        aria-disabled={!duration}
        data-testid="waveform"
        onPointerDown={(e) => {
          if (!duration) return;
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          seek(at(e) * duration);
        }}
        onPointerMove={(e) => {
          const f = at(e);
          setHover(f);
          if (dragging.current && duration) seek(f * duration);
        }}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
        onPointerLeave={() => setHover(null)}
        onKeyDown={(e) => {
          if (!duration) return;
          const jump: Record<string, number> = { ArrowLeft: -5, ArrowRight: 5, ArrowDown: -5, ArrowUp: 5, PageDown: -30, PageUp: 30 };
          if (e.key in jump) seek(currentTime + jump[e.key]);
          else if (e.key === "Home") seek(0);
          else if (e.key === "End") seek(duration - 1);
          else return;
          e.preventDefault();
          e.stopPropagation();
        }}
      />
      {hover !== null && duration > 0 && (
        <span
          className="pointer-events-none absolute -top-6 -translate-x-1/2 rounded-[4px] bg-line px-1.5 py-0.5 font-lcd text-[16px] leading-none text-cream"
          style={{ left: `${hover * 100}%` }}
        >
          {formatTime(hover * duration)}
        </span>
      )}
    </div>
  );
}
