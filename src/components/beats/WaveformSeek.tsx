"use client";

import { useEffect, useRef, useState } from "react";
import { usePlayerStore } from "@/components/player/playerStore";
import analysis from "@/data/trackAnalysis.json";
import { formatTime } from "@/lib/audio";
import type { Track } from "@/lib/types";

// The seek bar drawn as the track's own waveform (measured by
// scripts/analyze-tracks.mjs). Played audio lights up in the player's
// colours; hover shows the time; click or drag to seek; arrow keys step
// five seconds. Tracks that haven't been analysed get a plain slider.

const peaksFor = (id: string) => (analysis as Record<string, { peaks?: number[] } | undefined>)[id]?.peaks;

export default function WaveformSeek({ track, accent, accent2 = accent, rest = "#4a4540" }: { track: Track | undefined; accent: string; accent2?: string; rest?: string }) {
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const seek = usePlayerStore((s) => s.seek);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const dragging = useRef(false);
  const peaks = track ? peaksFor(track.id) : undefined;
  const frac = duration ? Math.min(1, currentTime / duration) : 0;

  useEffect(() => {
    const c = canvas.current;
    if (!c || !peaks) return;
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
      const played = g.createLinearGradient(0, 0, c.width, 0);
      played.addColorStop(0, accent);
      played.addColorStop(1, accent2);
      for (let i = 0; i < bars; i++) {
        const a = Math.floor((i / bars) * peaks.length);
        const b = Math.max(a + 1, Math.floor(((i + 1) / bars) * peaks.length));
        let p = 0;
        for (let k = a; k < b; k++) p = Math.max(p, peaks[k] ?? 0);
        const h = Math.max(1.5 * dpr, p * (c.height - 2 * dpr));
        g.fillStyle = (i + 0.5) / bars <= frac ? played : rest;
        g.fillRect(i * bw + bw * 0.15, mid - h / 2, bw * 0.7, h);
      }
      if (hover !== null) {
        g.fillStyle = "rgba(244,239,228,0.8)";
        g.fillRect(hover * c.width - dpr / 2, 0, dpr, c.height);
      }
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(c);
    return () => ro.disconnect();
  }, [peaks, frac, accent, accent2, rest, hover]);

  if (!peaks) {
    return (
      <input
        type="range"
        className="deck-range w-full"
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
        className="block h-10 w-full cursor-pointer touch-none rounded-[2px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent,#f2b45a)]"
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
          className="pointer-events-none absolute -top-6 -translate-x-1/2 rounded-[2px] bg-black/85 px-1.5 py-0.5 font-lcd text-[15px] leading-none text-[var(--accent,#f2b45a)]"
          style={{ left: `${hover * 100}%` }}
        >
          {formatTime(hover * duration)}
        </span>
      )}
    </div>
  );
}
