"use client";

import { useEffect, useRef, useState } from "react";
import { formatTime } from "@/lib/audio";
import { TRACKS, gridTempo } from "@/data/tracks";
import { usePlayerStore } from "./playerStore";
import { analysisFor, type TrackPalette } from "./analysis";
import { beatInfo } from "./spectrum";

// The seek bar as the track's real waveform (measured by
// scripts/analyze-tracks.mjs): peaks light, loudness solid, the played part
// in the cover's colours, bar lines on the track's beat grid, and a
// playhead that glows on every beat. Drag or click to seek; arrow keys too.
export default function WaveformSeek({ palette, reducedMotion }: { palette: TrackPalette; reducedMotion: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackIndex = usePlayerStore((s) => s.trackIndex);
  const duration = usePlayerStore((s) => s.duration);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const seek = usePlayerStore((s) => s.seek);
  const [hover, setHover] = useState<number | null>(null);
  const dragging = useRef(false);
  const track = TRACKS[trackIndex];
  const data = analysisFor(track.id);
  const total = duration || data?.duration || 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !data) return;
    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, w * dpr);
      canvas.height = Math.max(1, h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      const { audio } = usePlayerStore.getState();
      const len = audio && Number.isFinite(audio.duration) ? audio.duration : data.duration;
      const now = audio?.currentTime ?? 0;
      const progress = len ? now / len : 0;
      ctx.clearRect(0, 0, w, h);
      const cols = Math.max(24, Math.floor(w / 3));
      const colW = w / cols;
      const mid = h * 0.5;
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, palette.second);
      grad.addColorStop(1, palette.accent);
      const src = data.peaks.length;
      for (let c = 0; c < cols; c++) {
        const a = Math.floor((c / cols) * src);
        const b = Math.max(a + 1, Math.floor(((c + 1) / cols) * src));
        let pk = 0;
        let rm = 0;
        for (let i = a; i < b; i++) {
          pk = Math.max(pk, data.peaks[i]);
          rm += data.rms[i];
        }
        rm /= b - a;
        const x = c * colW;
        const played = (c + 0.5) / cols <= progress;
        const ph = Math.max(1, pk * (mid - 2));
        const rh = Math.max(1, rm * (mid - 2) * 0.95);
        ctx.fillStyle = played ? grad : "rgba(255,255,255,0.16)";
        ctx.globalAlpha = played ? 0.45 : 1;
        ctx.fillRect(x, mid - ph, Math.max(1, colW - 1), ph * 2);
        ctx.globalAlpha = 1;
        ctx.fillStyle = played ? grad : "rgba(255,255,255,0.34)";
        ctx.fillRect(x, mid - rh, Math.max(1, colW - 1), rh * 2);
      }
      // bar lines along the bottom edge, taller every 4 bars
      const barLen = (60 / gridTempo(track)) * 4;
      const offset = track.beatOffset ?? 0;
      if (len) {
        for (let bar = 0, t = offset; t < len; bar++, t += barLen) {
          const x = (t / len) * w;
          ctx.fillStyle = bar % 4 === 0 ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.14)";
          ctx.fillRect(x, h - (bar % 4 === 0 ? 5 : 3), 1, bar % 4 === 0 ? 5 : 3);
        }
      }
      // playhead, glowing on the beat
      const px = progress * w;
      const pulse = beatInfo()?.pulse ?? 0;
      ctx.shadowColor = palette.accent;
      ctx.shadowBlur = 6 + pulse * 14;
      ctx.fillStyle = "#fff";
      ctx.fillRect(px - 1, 1, 2, h - 2);
      ctx.shadowBlur = 0;
    };

    let raf = 0;
    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    if (reducedMotion) draw();
    else loop();
    const unsub = reducedMotion ? usePlayerStore.subscribe(draw) : () => {};
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      unsub();
    };
  }, [data, palette, track, reducedMotion]);

  const timeAt = (clientX: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * total;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 15 : 5;
    const to =
      e.key === "ArrowRight" ? currentTime + step : e.key === "ArrowLeft" ? currentTime - step : e.key === "Home" ? 0 : e.key === "End" ? total - 1 : null;
    if (to === null) return;
    e.preventDefault();
    seek(Math.min(total, Math.max(0, to)));
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        role="slider"
        tabIndex={0}
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(total)}
        aria-valuenow={Math.round(currentTime)}
        aria-valuetext={`${formatTime(currentTime)} of ${formatTime(total)}`}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          seek(timeAt(e.clientX));
        }}
        onPointerMove={(e) => {
          setHover(timeAt(e.clientX));
          if (dragging.current) seek(timeAt(e.clientX));
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerLeave={() => setHover(null)}
        className="block h-11 w-full cursor-pointer rounded-[3px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6fb4ff]"
      />
      {hover !== null && total > 0 && (
        <span
          className="pointer-events-none absolute -top-5 -translate-x-1/2 rounded-[3px] bg-black/85 px-1.5 py-[1px] font-mono text-[10.5px] text-white"
          style={{ left: `${(hover / total) * 100}%` }}
        >
          {formatTime(hover)}
        </span>
      )}
    </div>
  );
}
