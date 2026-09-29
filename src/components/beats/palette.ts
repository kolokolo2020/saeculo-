"use client";

import { useEffect, useState } from "react";

// A small palette pulled from a cover, in the browser, so any new cover
// themes the player without a build step. The image is shrunk to 40 × 40,
// its pixels are bucketed by hue/lightness, and we keep:
//   accent — the most present colour that's lively enough to glow
//   second — the next one with a clearly different hue
//   deep   — the cover's shadows, for backgrounds
export interface Palette {
  accent: string;
  second: string;
  deep: string;
}

export const FALLBACK: Palette = { accent: "#f2b45a", second: "#9ab8c9", deep: "#141210" };

const cache = new Map<string, Palette>();
const pending = new Map<string, Promise<Palette>>();

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return [h, s, l];
}

const hsl = (h: number, s: number, l: number) => `hsl(${h.toFixed(0)} ${(s * 100).toFixed(0)}% ${(l * 100).toFixed(0)}%)`;

export function extractPalette(img: HTMLImageElement): Palette {
  const N = 40;
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return FALLBACK;
  g.drawImage(img, 0, 0, N, N);
  const data = g.getImageData(0, 0, N, N).data;
  type Bucket = { n: number; h: number; s: number; l: number };
  const buckets = new Map<number, Bucket>();
  let darkN = 0;
  let dr = 0;
  let dg = 0;
  let db = 0;
  for (let i = 0; i < data.length; i += 4) {
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    if (l < 0.3) {
      darkN++;
      dr += data[i];
      dg += data[i + 1];
      db += data[i + 2];
    }
    if (s < 0.18 || l < 0.18 || l > 0.9) continue;
    const key = Math.floor(h / 24) * 10 + Math.floor(l * 4);
    const b = buckets.get(key) ?? { n: 0, h: 0, s: 0, l: 0 };
    b.n++;
    b.h += h;
    b.s += s;
    b.l += l;
    buckets.set(key, b);
  }
  const ranked = [...buckets.values()]
    .map((b) => ({ n: b.n, h: b.h / b.n, s: b.s / b.n, l: b.l / b.n }))
    .sort((a, b) => b.n * (0.4 + b.s) - a.n * (0.4 + a.s));
  const deep = darkN
    ? (() => {
        const [h, s] = rgbToHsl(dr / darkN, dg / darkN, db / darkN);
        return hsl(h, Math.min(s, 0.35), 0.07);
      })()
    : FALLBACK.deep;
  const first = ranked[0];
  if (!first) {
    // a monochrome cover: warm it slightly rather than inventing colour
    return { accent: "hsl(36 30% 78%)", second: "hsl(210 12% 62%)", deep };
  }
  const hueGap = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
  const other = ranked.find((b) => hueGap(b.h, first.h) > 40) ?? { h: (first.h + 150) % 360, s: first.s * 0.5, l: 0.6 };
  return {
    accent: hsl(first.h, Math.max(0.45, first.s), Math.min(0.72, Math.max(0.55, first.l))),
    second: hsl(other.h, Math.max(0.3, other.s), Math.min(0.7, Math.max(0.5, other.l))),
    deep,
  };
}

export function loadPalette(src: string): Promise<Palette> {
  const hit = cache.get(src);
  if (hit) return Promise.resolve(hit);
  const inflight = pending.get(src);
  if (inflight) return inflight;
  const p = new Promise<Palette>((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      const pal = extractPalette(img);
      cache.set(src, pal);
      resolve(pal);
    };
    img.onerror = () => resolve(FALLBACK);
    img.src = src;
  });
  pending.set(src, p);
  return p;
}

export function usePalette(src: string | undefined): Palette {
  const [state, setState] = useState<{ src?: string; pal: Palette }>({ pal: FALLBACK });
  useEffect(() => {
    if (!src) return;
    let live = true;
    void loadPalette(src).then((pal) => live && setState({ src, pal }));
    return () => {
      live = false;
    };
  }, [src]);
  return src && state.src === src ? state.pal : src && cache.get(src) ? cache.get(src)! : state.pal;
}
