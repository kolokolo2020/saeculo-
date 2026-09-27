"use client";

import { useEffect, useRef } from "react";
import { TRACKS } from "@/data/tracks";
import { usePlayerStore } from "@/components/player/playerStore";
import { paletteFor } from "@/components/player/analysis";
import { beatInfo, readFrequencies } from "@/components/player/spectrum";

// DreamScene: Vista Ultimate's moving wallpaper, redone as a live one. The
// sky takes the playing track's cover palette; aurora curtains sway and
// brighten with the low end, a glow breathes up from the horizon on every
// beat, and motes of light rise faster when the hats are busy. Paused, it
// drifts slowly in the last track's colours.

type HSL = [number, number, number];

function parseHsl(s: string): HSL {
  const m = /hsl\(\s*([\d.]+)[\s,]+([\d.]+)%[\s,]+([\d.]+)%/.exec(s);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [207, 80, 50];
}
const hsla = ([h, s, l]: HSL, a: number, dl = 0) => `hsla(${h.toFixed(1)}, ${s.toFixed(1)}%, ${Math.max(0, Math.min(100, l + dl)).toFixed(1)}%, ${a.toFixed(3)})`;
/** Ease toward a target colour, going the short way round the hue circle. */
function ease(c: HSL, t: HSL, k: number): HSL {
  let dh = t[0] - c[0];
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  return [(c[0] + dh * k + 360) % 360, c[1] + (t[1] - c[1]) * k, c[2] + (t[2] - c[2]) * k];
}

const SCALE = 0.33; // drawn small and upscaled: the softness is the look
const MOTES = 70;
const RAY = 64;

/** Covers can be muted; light needs colour, so lift saturation and lightness. */
const vivid = ([h, s, l]: HSL): HSL => [h, Math.max(s, 70), Math.min(68, Math.max(l, 58))];

let rayCanvas: HTMLCanvasElement | null = null;
/** A 1×RAY strip: transparent → bright → fading, in colour `c`. */
function raySprite(c: HSL) {
  rayCanvas ??= Object.assign(document.createElement("canvas"), { width: 1, height: RAY });
  const g = rayCanvas.getContext("2d")!;
  g.clearRect(0, 0, 1, RAY);
  const grad = g.createLinearGradient(0, 0, 0, RAY);
  grad.addColorStop(0, hsla(c, 0));
  grad.addColorStop(0.2, hsla(c, 1, 8));
  grad.addColorStop(0.5, hsla(c, 0.45));
  grad.addColorStop(1, hsla(c, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, 1, RAY);
  return rayCanvas;
}

export default function DreamScene() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const g = canvas?.getContext("2d");
    if (!canvas || !g) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const freq = new Uint8Array(256);
    const target = () => {
      const p = paletteFor(TRACKS[usePlayerStore.getState().trackIndex].id);
      return { a: parseHsl(p.accent), b: parseHsl(p.second), d: parseHsl(p.deep) };
    };
    let col = target();
    let low = 0;
    let high = 0;
    let t = 0;
    let last = performance.now();
    let raf = 0;
    let w = 0;
    let h = 0;
    const motes = Array.from({ length: MOTES }, () => ({ x: Math.random(), y: Math.random(), r: 0.4 + Math.random() * 1.4, v: 0.2 + Math.random() }));

    const frame = (now: number) => {
      // 30 fps is plenty for a wallpaper, and halves the work behind the glass
      if (!reduced && now - last < 30) {
        raf = requestAnimationFrame(frame);
        return;
      }
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const cw = Math.max(1, Math.round(canvas.clientWidth * SCALE));
      const ch = Math.max(1, Math.round(canvas.clientHeight * SCALE));
      if (cw !== w || ch !== h) {
        w = canvas.width = cw;
        h = canvas.height = ch;
      }

      // listen
      let lo = 0;
      let hi = 0;
      if (readFrequencies(freq)) {
        for (let i = 1; i < 10; i++) lo += freq[i];
        for (let i = 90; i < 180; i++) hi += freq[i];
        lo /= 9 * 255;
        hi /= 90 * 255;
      }
      low += (lo - low) * Math.min(1, dt * 8);
      high += (hi - high) * Math.min(1, dt * 10);
      const pulse = beatInfo()?.pulse ?? 0;
      t += dt * (0.25 + low * 0.9);
      const tg = target();
      const k = reduced ? 1 : Math.min(1, dt * 1.5);
      col = { a: ease(col.a, tg.a, k), b: ease(col.b, tg.b, k), d: ease(col.d, tg.d, k) };

      // sky: the cover's deepest colour, lifting toward the accent at the horizon
      const sky = g.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, hsla(col.d, 1, -2));
      sky.addColorStop(0.55, hsla([col.d[0], col.d[1], col.d[2] + 6], 1));
      sky.addColorStop(1, hsla([col.a[0], Math.min(col.a[1], 45), 11], 1));
      g.globalCompositeOperation = "source-over";
      g.fillStyle = sky;
      g.fillRect(0, 0, w, h);

      g.globalCompositeOperation = "lighter";
      // the horizon breathes on the beat
      const glow = g.createRadialGradient(w * 0.5, h * 1.08, 0, w * 0.5, h * 1.08, h * (0.75 + pulse * 0.15));
      glow.addColorStop(0, hsla(vivid(col.a), 0.12 + pulse * 0.2 + low * 0.15));
      glow.addColorStop(1, hsla(vivid(col.a), 0));
      g.fillStyle = glow;
      g.fillRect(0, 0, w, h);

      // aurora curtains: vertical rays hanging from a wandering line. Each
      // ray is a stretched copy of a small pre-drawn gradient, far cheaper
      // than building a gradient per ray.
      const curtains: [HSL, number, number, number][] = [
        [vivid(col.a), 0.3, 0.9, 0],
        [vivid(col.b), 0.42, 1.3, 2.1],
        [vivid(col.a), 0.22, 0.6, 4.2],
      ];
      for (const [c, base, speed, seed] of curtains) {
        const sprite = raySprite(c);
        for (let x = 0; x < w; x++) {
          const u = x / w;
          const y0 =
            h * base +
            Math.sin(u * 5.1 + t * speed + seed) * h * 0.06 +
            Math.sin(u * 11.3 - t * speed * 1.7 + seed * 2) * h * (0.02 + low * 0.03);
          const shimmer = 0.5 + 0.5 * Math.sin(u * 17 + t * 2.2 + seed * 5) * Math.sin(u * 7.3 - t * 1.1 + seed);
          const len = h * (0.16 + 0.12 * shimmer + low * 0.12);
          g.globalAlpha = Math.min(1, (0.1 + 0.22 * shimmer) * (0.5 + low * 1.2 + pulse * 0.3));
          g.drawImage(sprite, 0, 0, 1, RAY, x, y0, 1, len);
        }
      }
      g.globalAlpha = 1;

      // motes rising; the hats hurry them along
      for (const m of motes) {
        m.y -= dt * m.v * (0.012 + high * 0.08);
        m.x += Math.sin(t + m.v * 10) * dt * 0.004;
        if (m.y < -0.02) {
          m.y = 1.02;
          m.x = Math.random();
        }
        g.fillStyle = hsla(vivid(col.b), (0.15 + high * 0.6) * (1 - m.y * 0.6), 20);
        g.beginPath();
        g.arc(m.x * w, m.y * h, m.r * (0.6 + high), 0, Math.PI * 2);
        g.fill();
      }

      if (!reduced) raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    // reduced motion paints a still, repainted when the track changes
    const unsub = reduced ? usePlayerStore.subscribe((s, p) => s.trackIndex !== p.trackIndex && requestAnimationFrame(frame)) : undefined;
    return () => {
      cancelAnimationFrame(raf);
      unsub?.();
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full blur-[3px]" />;
}
