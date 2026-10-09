"use client";

import { useEffect, useRef } from "react";
import { readFrequencies, readWaveform } from "@/components/player/spectrum";
import type { VisMode } from "@/components/site/siteStore";
import { restLevel, segColor, wordGrid } from "./wordmark";

// The album's wordmark, live. "led": a spectrum analyser whose columns are
// the real spectrum (log-spaced, so the kick and the hats both register),
// with "saeculo" always lit inside it and burning white where the music
// passes through a letter; peak caps hang and fall. "wave": the wordmark
// dimmed under a glowing trace of the waveform, mirrored. Still (calm or
// reduced motion): the wordmark as it is on the cover. Never on the cover.

const HEADROOM = 7;
const grid = wordGrid();
const ROWS = grid.segs + HEADROOM;

export default function Visualizer({ mode, still }: { mode: VisMode; still: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvas.current;
    const g = c?.getContext("2d");
    if (!c || !g) return;
    const freq = new Uint8Array(new ArrayBuffer(512));
    const wave = new Uint8Array(new ArrayBuffer(1024));
    const cols = grid.cols;
    // log-spaced bin edges over ~40 Hz … 14 kHz of a 1024-point FFT
    const edges = Array.from({ length: cols + 1 }, (_, i) => Math.round(2 * Math.pow(330 / 2, i / cols)));
    const level = new Float32Array(cols);
    const peak = new Float32Array(cols);
    const peakHold = new Float32Array(cols);
    let raf = 0;
    let last = performance.now();
    let W = 0;
    let H = 0;
    let dpr = 1;

    const fit = () => {
      const r = c.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(1, Math.round(r.width * dpr));
      H = Math.max(1, Math.round(r.height * dpr));
      if (c.width !== W || c.height !== H) {
        c.width = W;
        c.height = H;
      }
    };

    const draw = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      fit();
      g.clearRect(0, 0, W, H);
      const live = !still && readFrequencies(freq);
      // the grid fits the box: column pitch from the width, rows from the height
      const pitch = Math.min(W / cols, (H / ROWS) * 2.1);
      const segPitch = pitch / 2.1;
      const segW = pitch * 0.82;
      const segH = segPitch * 0.68;
      const gw = pitch * cols;
      const gh = segPitch * ROWS;
      const x0 = (W - gw) / 2 + (pitch - segW) / 2;
      const base = (H + gh) / 2;
      const segY = (s: number) => base - (s + 1) * segPitch + (segPitch - segH);
      const rad = Math.max(1, segH * 0.25);
      const seg = (col: number, s: number, fill: string) => {
        g.fillStyle = fill;
        g.beginPath();
        g.roundRect(x0 + col * pitch, segY(s), segW, segH, rad);
        g.fill();
      };

      // levels: fast up, slow down; resting shape when silent
      for (let i = 0; i < cols; i++) {
        let target = restLevel(i, cols) * 0.35;
        if (live) {
          let sum = 0;
          const a = edges[i];
          const b = Math.max(a + 1, edges[i + 1]);
          for (let k = a; k < b; k++) sum = Math.max(sum, freq[k]);
          target = Math.pow(sum / 255, 1.6) * (1 + i / cols);
        }
        target = Math.min(1, target);
        level[i] += (target - level[i]) * Math.min(1, dt * (target > level[i] ? 22 : 5));
        if (level[i] >= peak[i]) {
          peak[i] = level[i];
          peakHold[i] = 0.5;
        } else if ((peakHold[i] -= dt) < 0) peak[i] = Math.max(level[i], peak[i] - dt * 0.6);
      }

      if (mode === "led" || still) {
        for (let i = 0; i < cols; i++) {
          const h = still ? Math.round(restLevel(i, cols) * ROWS * 0.82) : Math.round(level[i] * ROWS);
          for (let s = 0; s < ROWS; s++) {
            const f = s / (ROWS - 1);
            const letter = grid.lit[i][s];
            if (letter) seg(i, s, s < h && live ? "rgba(240,250,255,0.98)" : segColor(s / (grid.segs - 1)));
            else if (s < h) seg(i, s, segColor(f, still ? 0.1 : 0.2));
            else seg(i, s, segColor(f, 0.05));
          }
          if (!still && peak[i] > 0.04) seg(i, Math.min(ROWS - 1, Math.round(peak[i] * ROWS)), segColor(peak[i], 0.6));
        }
      } else {
        // the wordmark, dim, then the trace over it
        for (let i = 0; i < cols; i++) for (let s = 0; s < grid.segs; s++) if (grid.lit[i][s]) seg(i, s, segColor(s / (grid.segs - 1), 0.32));
        const has = readWaveform(wave);
        const mid = base - (grid.segs * segPitch) / 2;
        const amp = (gh / 2) * 0.95;
        const grad = g.createLinearGradient(0, 0, W, 0);
        grad.addColorStop(0, segColor(0));
        grad.addColorStop(0.5, segColor(0.5));
        grad.addColorStop(1, segColor(1));
        const n = 160;
        const ys: number[] = [];
        for (let k = 0; k <= n; k++) {
          const v = has ? (wave[Math.floor((k / n) * (wave.length - 1))] - 128) / 128 : 0;
          const env = Math.sin((k / n) * Math.PI);
          ys.push(v * amp * env * 1.6);
        }
        g.strokeStyle = grad;
        g.lineJoin = "round";
        for (const [w, a] of [
          [10 * dpr, 0.12],
          [4 * dpr, 0.3],
          [1.6 * dpr, 1],
        ] as const) {
          g.globalAlpha = a;
          g.lineWidth = w;
          for (const sign of [1, -1]) {
            g.beginPath();
            for (let k = 0; k <= n; k++) {
              const x = (k / n) * W;
              const y = mid + ys[k] * sign;
              if (k) g.lineTo(x, y);
              else g.moveTo(x, y);
            }
            g.stroke();
          }
        }
        g.globalAlpha = 1;
      }
      if (!still) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    const ro = new ResizeObserver(() => still && requestAnimationFrame(draw));
    ro.observe(c);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [mode, still]);

  return <canvas ref={canvas} className="block h-full w-full" role="img" aria-label="saeculo, on a spectrum analyser" data-testid="visualizer" />;
}
