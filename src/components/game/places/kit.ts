import type { Place } from "../sfx";

// What every place is made of: 16-px tiles, things you bump into or use,
// doors, lights, and a few painting helpers. Kept apart from world.ts so
// the places in this folder can use it without importing each other.

export const TILE = 16;
export type Dir = "up" | "down" | "left" | "right";
export type G = CanvasRenderingContext2D;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
/** A rect in tile units, converted to pixels. */
export const T = (x: number, y: number, w = 1, h = 1): Rect => ({ x: x * TILE, y: y * TILE, w: w * TILE, h: h * TILE });

export interface Thing {
  id: string;
  /** Blocks walking, if set. */
  body?: Rect;
  /** Standing in (or facing into) this lets you use it. */
  zone?: Rect;
}

export interface Door {
  zone: Rect;
  /** Shown when you're next to it. */
  label: string;
  to: Place;
  spawn: { x: number; y: number; dir: Dir };
  /** Someone decides whether you get through (the game checks). */
  lock?: "club";
}

export interface Light {
  x: number;
  y: number;
  r: number;
  color: string;
  /** "lamp" flickers now and then; "dead" is mostly off. */
  kind?: "lamp" | "dead" | "screen";
}

/** What the per-frame drawing of a place gets to know. */
export interface Fx {
  t: number;
  reduced: boolean;
  beat: boolean;
  /** Anything the place keeps track of (a train's position, say). */
  state: Record<string, number>;
}

export interface Scene {
  id: Place;
  name: string;
  tiles: string[];
  solid: string;
  surface: (ch: string) => "wood" | "stone" | "tile" | "carpet";
  things: Thing[];
  doors: Door[];
  lights: Light[];
  darkness: number;
  /** Rain falls here. */
  outdoors?: boolean;
  /** Paint the still parts once. */
  paint?: (g: G, s: Scene) => void;
  /** Draw what moves, every frame, under the people. */
  fx?: (g: G, f: Fx) => void;
  /** Draw what stands in front of the people. */
  front?: (g: G, f: Fx) => void;
  /** Lights that move or change. */
  liveLights?: (f: Fx) => Light[];
}

export const r = (g: G, x: number, y: number, w: number, h: number, c: string) => {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), w, h);
};
/** Deterministic noise so the paint is the same every visit. */
export const hash = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
/** Small caps for signs, in the canvas's own pixels. */
export function sign(g: G, text: string, x: number, y: number, color: string, glow?: string, size = 8) {
  g.font = `${size}px monospace`;
  g.textBaseline = "top";
  if (glow) {
    g.fillStyle = glow;
    g.fillText(text, x - 1, y);
    g.fillText(text, x + 1, y);
    g.fillText(text, x, y - 1);
    g.fillText(text, x, y + 1);
  }
  g.fillStyle = color;
  g.fillText(text, x, y);
}
/** A brick wall over a rect. */
export function bricks(g: G, x0: number, y0: number, w: number, h: number, base: string, mortar: string) {
  r(g, x0, y0, w, h, base);
  for (let y = 0; y < h; y += 4) {
    r(g, x0, y0 + y + 3, w, 1, mortar);
    const off = (y / 4) % 2 ? 4 : 0;
    for (let x = off; x < w; x += 8) r(g, x0 + x, y0 + y, 1, 3, mortar);
  }
}
export function lampPole(g: G, x: number, baseY: number) {
  r(g, x + 6, baseY - 44, 4, 56, "#2a2b30");
  r(g, x + 2, baseY - 48, 16, 5, "#3a3b40");
  r(g, x + 5, baseY - 43, 10, 2, "#77705e");
}

/**
 * The outdoor ground the street and the avenue share: sidewalk (s), curb
 * (c), asphalt (a), the centre line (l), a fence at the bottom (f).
 * Building rows (B, b, D) are left for the place to paint.
 */
export function paintGround(g: G, s: Scene) {
  s.tiles.forEach((row, ty) =>
    [...row].forEach((ch, tx) => {
      const x = tx * TILE;
      const y = ty * TILE;
      const n = hash(tx, ty);
      switch (ch) {
        case "s":
          r(g, x, y, TILE, TILE, "#34353c");
          r(g, x, y, 1, TILE, "#2b2c32");
          r(g, x, y + 15, TILE, 1, "#2b2c32");
          if (n > 0.8) r(g, x + 5, y + 7, 3, 1, "#2a2b30");
          break;
        case "c":
          r(g, x, y, TILE, TILE, "#1d1e24");
          r(g, x, y + (ty === 5 ? 0 : 12), TILE, 4, "#4a4b52");
          break;
        case "a":
          r(g, x, y, TILE, TILE, "#18191e");
          if (n > 0.6) r(g, x + Math.floor(n * 12), y + Math.floor(n * 9), 2, 1, "#202128");
          break;
        case "l":
          r(g, x, y, TILE, TILE, "#18191e");
          if (tx % 3 !== 2) r(g, x + 2, y + 7, 12, 2, "#8a7a4a");
          break;
        case "f":
          r(g, x, y, TILE, TILE, "#101014");
          r(g, x, y, TILE, 3, "#2a2a30");
          r(g, x + 7, y + 3, 2, 13, "#1c1c22");
          break;
      }
    }),
  );
}
