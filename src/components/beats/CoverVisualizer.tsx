"use client";

import { useEffect, useRef } from "react";
import { readFrequencies } from "@/components/player/spectrum";
import { usePlayerStore } from "@/components/player/playerStore";
import type { Track } from "@/lib/types";
import { ALBUM } from "@/data/tracks";
import type { Palette } from "./palette";

// The cover is the visualizer. A dim print of the artwork sits underneath;
// the music reveals the full-brightness artwork through narrow columns, one
// per band of the real spectrum (log-spaced, so the kick and the hats both
// get room). The low end breathes the whole print and lifts a glow in the
// cover's own accent colour. Everything eases with a fast attack and slow
// release so it follows the groove instead of twitching. In calm mode (or
// with reduced motion) it's the cover, still.

const COLS = 28;
const images = new Map<string, HTMLImageElement>();

function imageFor(src: string): HTMLImageElement {
  let img = images.get(src);
  if (!img) {
    img = new Image();
    img.decoding = "async";
    img.src = src;
    images.set(src, img);
  }
  return img;
}

// "scan" is the other look: the cover cut into scanlines, each drifting
// sideways and brightening with its band (the low end at the bottom).
const SCAN_ROWS = 56;

export default function CoverVisualizer({ track, palette, calm, mode = "reveal" }: { track: Track | undefined; palette: Palette; calm: boolean; mode?: "reveal" | "scan" }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const levels = useRef(new Float32Array(COLS));
  const bass = useRef(0);
  // 0 = idle (the cover, nearly full), 1 = playing (dim print + reveal)
  const presence = useRef(0);

  useEffect(() => {
    const c = canvas.current;
    const g = c?.getContext("2d");
    if (!c || !g) return;
    const img = track ? imageFor(ALBUM.cover) : null;
    const freq = new Uint8Array(new ArrayBuffer(512));
    // log-spaced bin edges over ~40 Hz … 12 kHz of a 1024-point FFT
    const edges = Array.from({ length: COLS + 1 }, (_, i) => Math.round(2 * Math.pow(280 / 2, i / COLS)));
    let raf = 0;
    let running = false;
    let size = 0;

    const fit = () => {
      const r = c.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const s = Math.max(1, Math.round(Math.min(r.width, r.height) * dpr));
      if (s !== size) {
        size = s;
        c.width = c.height = s;
      }
    };

    const drawCover = (alpha: number, scale: number, filter: string) => {
      g.save();
      g.globalAlpha = alpha;
      g.filter = filter;
      const s = size * scale;
      const o = (size - s) / 2;
      if (img && img.complete && img.naturalWidth) g.drawImage(img, o, o, s, s);
      else {
        const grad = g.createLinearGradient(0, 0, size, size);
        grad.addColorStop(0, palette.deep);
        grad.addColorStop(1, "#2a2622");
        g.fillStyle = grad;
        g.fillRect(o, o, s, s);
        g.filter = "none";
        g.fillStyle = "rgba(233,227,210,0.55)";
        g.font = `${Math.round(size / 10)}px var(--font-lcd), monospace`;
        g.textAlign = "center";
        g.fillText(track?.title ?? "", size / 2, size / 2);
      }
      g.restore();
    };

    const still = () => {
      fit();
      g.clearRect(0, 0, size, size);
      drawCover(1, 1, "none");
    };

    const frame = () => {
      raf = 0;
      if (!c.isConnected) return;
      fit();
      const live = readFrequencies(freq);
      const lv = levels.current;
      let moving = live;
      for (let i = 0; i < COLS; i++) {
        let target = 0;
        if (live) {
          let sum = 0;
          const a = edges[i];
          const b = Math.max(a + 1, edges[i + 1]);
          for (let k = a; k < b; k++) sum += freq[k];
          // gentle tilt so the top end isn't always empty
          target = Math.min(1, Math.pow(sum / (b - a) / 255, 1.6) * (1 + i / COLS) * 1.1);
        }
        lv[i] += (target - lv[i]) * (target > lv[i] ? 0.5 : 0.08);
        if (lv[i] > 0.004) moving = true;
      }
      const low = live ? (freq[1] + freq[2] + freq[3] + freq[4]) / (4 * 255) : 0;
      bass.current += (Math.pow(low, 2.2) - bass.current) * (low > bass.current ? 0.45 : 0.06);
      const b = bass.current;
      const pr = presence.current + ((live ? 1 : 0) - presence.current) * 0.06;
      presence.current = pr;
      if (Math.abs((live ? 1 : 0) - pr) > 0.01) moving = true;

      g.clearRect(0, 0, size, size);
      g.fillStyle = palette.deep;
      g.fillRect(0, 0, size, size);

      if (mode === "scan" && img && img.complete && img.naturalWidth) {
        const rowH = size / SCAN_ROWS;
        const srcH = img.naturalHeight / SCAN_ROWS;
        for (let r = 0; r < SCAN_ROWS; r++) {
          const band = Math.min(COLS - 1, Math.floor(((SCAN_ROWS - 1 - r) / SCAN_ROWS) * COLS));
          const e = lv[band] * pr;
          const shift = (r % 2 ? 1 : -1) * e * size * 0.05;
          g.globalAlpha = 0.55 + 0.45 * Math.min(1, e * 1.4 + (1 - pr));
          g.drawImage(img, 0, r * srcH, img.naturalWidth, srcH, shift, r * rowH, size, Math.ceil(rowH) - (pr > 0.3 ? 1 : 0));
        }
        g.globalAlpha = 1;
        if (b > 0.01) {
          g.globalCompositeOperation = "screen";
          g.fillStyle = palette.accent;
          g.globalAlpha = Math.min(0.18, b * 0.25);
          g.fillRect(0, 0, size, size);
          g.globalCompositeOperation = "source-over";
          g.globalAlpha = 1;
        }
        if (moving && !document.hidden) raf = requestAnimationFrame(frame);
        else running = false;
        return;
      }

      // the dim print, breathing with the low end
      drawCover(1, 1 + pr * 0.02 + b * 0.025, `brightness(${(0.88 - pr * 0.58 + b * 0.12).toFixed(3)}) saturate(${(1 - pr * 0.35).toFixed(3)})`);

      // the artwork, revealed by the spectrum
      g.save();
      g.beginPath();
      const colW = size / COLS;
      const gap = Math.max(1, Math.round(colW * 0.18));
      for (let i = 0; i < COLS; i++) {
        const h = lv[i] * size * 0.92;
        if (h < 1) continue;
        g.rect(Math.round(i * colW), size - h, Math.ceil(colW) - gap, h);
      }
      g.clip();
      drawCover(1, 1 + pr * 0.02 + b * 0.025, "none");
      g.restore();

      // the column tips, in the cover's accent
      g.fillStyle = palette.accent;
      g.globalAlpha = 0.85;
      for (let i = 0; i < COLS; i++) {
        const h = lv[i] * size * 0.92;
        if (h < 2) continue;
        g.fillRect(Math.round(i * colW), size - h, Math.ceil(colW) - gap, Math.max(1, size / 240));
      }
      g.globalAlpha = 1;

      // low-end glow from the floor of the frame
      if (b > 0.01) {
        const glow = g.createRadialGradient(size / 2, size * 1.05, 0, size / 2, size * 1.05, size * 0.9);
        glow.addColorStop(0, palette.accent);
        glow.addColorStop(1, "transparent");
        g.globalAlpha = Math.min(0.35, b * 0.5);
        g.globalCompositeOperation = "screen";
        g.fillStyle = glow;
        g.fillRect(0, 0, size, size);
        g.globalCompositeOperation = "source-over";
        g.globalAlpha = 1;
      }

      if (moving && !document.hidden) raf = requestAnimationFrame(frame);
      else running = false;
    };

    const kick = () => {
      if (calm) return;
      if (!running) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    };

    if (calm) {
      still();
      if (img && !img.complete) img.addEventListener("load", still, { once: true });
    } else {
      kick();
      if (img && !img.complete) img.addEventListener("load", kick, { once: true });
    }

    // wake the loop when music starts, when the tab returns, on resize
    const unsub = usePlayerStore.subscribe((s, prev) => {
      if (s.playing !== prev.playing) (calm ? still : kick)();
    });
    const onVis = () => !document.hidden && (calm ? still() : kick());
    document.addEventListener("visibilitychange", onVis);
    const ro = new ResizeObserver(() => (calm ? still() : kick()));
    ro.observe(c);
    return () => {
      cancelAnimationFrame(raf);
      unsub();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      img?.removeEventListener("load", still);
      img?.removeEventListener("load", kick);
    };
  }, [track, palette, calm, mode]);

  return (
    <canvas
      ref={canvas}
      className="block aspect-square h-full max-h-full w-full max-w-full object-contain"
      role="img"
      aria-label={track ? `Cover art for ${track.title}${calm ? "" : ", moving with the music"}` : "No track"}
    />
  );
}
