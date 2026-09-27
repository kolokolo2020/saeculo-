"use client";

import { useEffect, useRef } from "react";
import { readFrequencies, readWaveform, beatInfo } from "./spectrum";
import { DEFAULT_PALETTE, type TrackPalette } from "./analysis";

export const VIZ_MODES = ["art", "aurora", "bars", "scope"] as const;
export type VizMode = (typeof VIZ_MODES)[number];
export const VIZ_LABEL: Record<VizMode, string> = {
  art: "Cover Art",
  aurora: "Aurora",
  bars: "Bars & Waves",
  scope: "Scope",
};

const BAR_COUNT = 32;
/** Dots per side of the Cover Art grid. */
const ART_GRID = 44;

interface ArtDots {
  n: number;
  color: string[];
  lum: Float32Array;
}

/** Sample the cover into an N×N grid of colours. */
function sampleCover(img: HTMLImageElement, n: number): ArtDots {
  const c = document.createElement("canvas");
  c.width = n;
  c.height = n;
  const g = c.getContext("2d")!;
  g.drawImage(img, 0, 0, n, n);
  const px = g.getImageData(0, 0, n, n).data;
  const color: string[] = [];
  const lum = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) {
    const [r, gg, b] = [px[i * 4], px[i * 4 + 1], px[i * 4 + 2]];
    color.push(`rgb(${r},${gg},${b})`);
    lum[i] = (0.2126 * r + 0.7152 * gg + 0.0722 * b) / 255;
  }
  return { n, color, lum };
}

// Live visualizer for whatever the global player is playing. It reads the
// spectrum and the beat clock straight off the store inside its own rAF
// loop, so React never re-renders per frame. Colours come from the track's
// cover palette; every mode breathes on the beat.
//
// Cover Art mode rebuilds the cover as a grid of dots: each dot keeps its
// pixel's colour, swells with the frequency band at its distance from the
// centre (bass in the middle, treble at the edges), and a ripple rolls out
// from the centre on every beat, harder on every bar.
export default function Visualizer({
  mode,
  playing,
  reducedMotion,
  className = "h-40",
  palette = DEFAULT_PALETTE,
  cover,
}: {
  mode: VizMode;
  playing: boolean;
  reducedMotion: boolean;
  className?: string;
  palette?: TrackPalette;
  cover?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

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

    const freq = new Uint8Array(256);
    const wave = new Uint8Array(512);
    const peaks = new Float32Array(BAR_COUNT);
    let t = 0;
    let raf = 0;
    let dots: ArtDots | null = null;
    let cancelled = false;
    if (mode === "art" && cover) {
      const img = new Image();
      img.onload = () => {
        if (!cancelled) dots = sampleCover(img, ART_GRID);
      };
      img.src = cover;
    }

    const pulseNow = () => (playing ? (beatInfo()?.pulse ?? 0) : 0);

    const bands = () => {
      if (playing && readFrequencies(freq)) {
        const avg = (from: number, to: number) => {
          let sum = 0;
          for (let i = from; i < to; i++) sum += freq[i];
          return sum / (to - from) / 255;
        };
        return { bass: avg(1, 8), mid: avg(8, 40), high: avg(40, 120) };
      }
      const s = (Math.sin(t * 0.02) + 1) / 2;
      return { bass: 0.12 + s * 0.1, mid: 0.08 + s * 0.06, high: 0.05 };
    };

    const drawArt = () => {
      ctx.clearRect(0, 0, w, h);
      const live = playing && readFrequencies(freq);
      const beat = playing ? beatInfo() : null;
      const pulse = beat?.pulse ?? 0;
      const barHit = beat && beat.beat % 4 === 0 ? 1 : 0.55;
      const size = Math.min(w, h) * 0.94;
      const x0 = (w - size) / 2;
      const y0 = (h - size) / 2;
      // a glow of the accent behind the grid, on the beat
      const glow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, size * 0.7);
      glow.addColorStop(0, palette.accent);
      glow.addColorStop(1, "transparent");
      ctx.globalAlpha = 0.12 + pulse * 0.25 * barHit;
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
      if (!dots) return;
      const { n, color, lum } = dots;
      const sp = size / n;
      const ripple = beat ? beat.phase * 1.25 : -1;
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const k = j * n + i;
          const dx = (i + 0.5) / n - 0.5;
          const dy = (j + 0.5) / n - 0.5;
          const d = Math.sqrt(dx * dx + dy * dy) * 1.414; // 0 centre … 1 corner
          const energy = live ? freq[Math.min(250, 2 + Math.floor(d * 110))] / 255 : 0.1 + 0.07 * Math.sin(t * 0.025 + d * 7);
          const ring = ripple < 0 ? 0 : Math.exp(-((d - ripple) ** 2) / 0.006) * (1 - (beat?.phase ?? 0)) * barHit;
          const r = Math.min(sp * 0.62, sp * (0.14 + 0.3 * lum[k] + 0.42 * energy + 0.5 * ring));
          const push = ring * sp * 0.9;
          const len = d || 1;
          const cx = x0 + (i + 0.5) * sp + (dx / len) * push;
          const cy = y0 + (j + 0.5) * sp + (dy / len) * push;
          ctx.globalAlpha = Math.min(1, 0.3 + 0.45 * lum[k] + 0.55 * energy + ring);
          ctx.fillStyle = color[k];
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };

    const drawAurora = () => {
      ctx.fillStyle = "rgba(3, 10, 22, 0.22)";
      ctx.fillRect(0, 0, w, h);
      const { bass, mid, high } = bands();
      const pulse = pulseNow();
      ctx.globalCompositeOperation = "lighter";
      const ribbons = [
        { color: palette.second, amp: 0.22 + bass * 0.5 + pulse * 0.08, speed: 0.011, freq: 0.006, y: 0.55, width: 10 + bass * 26 + pulse * 8 },
        { color: palette.accent, amp: 0.18 + mid * 0.6, speed: 0.016, freq: 0.009, y: 0.45, width: 8 + mid * 22 },
        { color: "hsl(260 80% 72%)", amp: 0.12 + high * 0.7, speed: 0.023, freq: 0.014, y: 0.6, width: 5 + high * 16 },
      ];
      for (const r of ribbons) {
        for (let layer = 0; layer < 3; layer++) {
          ctx.beginPath();
          for (let x = 0; x <= w; x += 6) {
            const y =
              h * r.y +
              Math.sin(x * r.freq + t * r.speed + layer * 0.6) * h * r.amp * 0.5 +
              Math.sin(x * r.freq * 2.3 - t * r.speed * 1.4) * h * r.amp * 0.18;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = r.color;
          ctx.globalAlpha = 0.16 - layer * 0.04;
          ctx.lineWidth = r.width * (1 + layer * 0.9);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

    const drawBars = () => {
      ctx.clearRect(0, 0, w, h);
      let levels: number[];
      if (playing && readFrequencies(freq)) {
        const usable = Math.floor(freq.length * 0.6);
        const chunk = usable / BAR_COUNT;
        levels = Array.from({ length: BAR_COUNT }, (_, i) => {
          let sum = 0;
          const start = Math.floor(i * chunk);
          const end = Math.max(start + 1, Math.floor((i + 1) * chunk));
          for (let j = start; j < end; j++) sum += freq[j];
          return sum / (end - start) / 255;
        });
      } else {
        levels = Array.from({ length: BAR_COUNT }, (_, i) => 0.04 + ((Math.sin(t * 0.03 + i * 0.4) + 1) / 2) * 0.05);
      }
      const pulse = pulseNow();
      const floor = h * 0.72;
      const gap = 2;
      const barW = (w - gap * (BAR_COUNT + 1)) / BAR_COUNT;
      const grad = ctx.createLinearGradient(0, floor, 0, 0);
      grad.addColorStop(0, palette.second);
      grad.addColorStop(0.6, palette.accent);
      grad.addColorStop(1, "#ffffff");
      for (let i = 0; i < BAR_COUNT; i++) {
        const x = gap + i * (barW + gap);
        const bh = Math.max(2, levels[i] * (floor - 6));
        ctx.fillStyle = grad;
        ctx.fillRect(x, floor - bh, barW, bh);
        // gloss: a lighter left half-highlight on each bar
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fillRect(x, floor - bh, barW * 0.45, bh);
        // mirrored reflection on the "glass floor"
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = grad;
        ctx.fillRect(x, floor + 2, barW, bh * 0.35);
        ctx.globalAlpha = 1;
        peaks[i] = Math.max(peaks[i] - 0.006, levels[i]);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x, floor - peaks[i] * (floor - 6) - 3, barW, 2);
      }
      // the glass floor flashes on the beat
      if (pulse > 0.02) {
        ctx.globalAlpha = pulse * 0.5;
        ctx.fillStyle = palette.accent;
        ctx.fillRect(0, floor, w, 2);
        ctx.globalAlpha = 1;
      }
      const fade = ctx.createLinearGradient(0, floor, 0, h);
      fade.addColorStop(0, "rgba(3,7,15,0)");
      fade.addColorStop(1, "rgba(3,7,15,1)");
      ctx.fillStyle = fade;
      ctx.fillRect(0, floor, w, h - floor);
    };

    const drawScope = () => {
      ctx.fillStyle = "rgba(3, 10, 22, 0.35)";
      ctx.fillRect(0, 0, w, h);
      const mid = h / 2;
      const pulse = pulseNow();
      ctx.lineWidth = 2 + pulse * 2;
      ctx.lineJoin = "round";
      ctx.strokeStyle = palette.accent;
      ctx.shadowColor = palette.accent;
      ctx.shadowBlur = 10 + pulse * 14;
      ctx.beginPath();
      if (playing && readWaveform(wave)) {
        const step = w / wave.length;
        for (let i = 0; i < wave.length; i++) {
          const y = mid + ((wave[i] - 128) / 128) * mid * 0.9;
          if (i === 0) ctx.moveTo(0, y);
          else ctx.lineTo(i * step, y);
        }
      } else {
        for (let x = 0; x <= w; x += 4) {
          const y = mid + Math.sin(x * 0.02 + t * 0.03) * mid * 0.12;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const frame = () => {
      t++;
      if (mode === "art") drawArt();
      else if (mode === "aurora") drawAurora();
      else if (mode === "bars") drawBars();
      else drawScope();
    };

    if (reducedMotion) {
      // a still frame, redrawn once the cover has loaded
      const still = () => {
        if (mode !== "art") {
          ctx.fillStyle = "#03070f";
          ctx.fillRect(0, 0, w, h);
        }
        for (let i = 0; i < 30; i++) frame();
      };
      still();
      const poll = setInterval(() => {
        if (dots) {
          still();
          clearInterval(poll);
        }
      }, 200);
      setTimeout(() => clearInterval(poll), 4000);
    } else {
      const loop = () => {
        raf = requestAnimationFrame(loop);
        frame();
      };
      loop();
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [mode, playing, reducedMotion, palette, cover]);

  return <canvas ref={canvasRef} className={`block w-full ${className}`} aria-label="Audio visualizer" role="img" />;
}
