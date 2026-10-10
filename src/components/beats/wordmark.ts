// "saeculo" spelled on a spectrum analyser: a 5 × 7 pixel face where every
// pixel is two stacked LED segments. It was the old album cover (drawn by
// scripts/make-cover.mjs) and the old visualizer (Visualizer.tsx); the site
// now shows the owner's artwork and no visualizer, so nothing on the site
// uses it any more (kept, not deleted). No imports, so the cover script can
// load it.

const GLYPHS: Record<string, string[]> = {
  s: [".....", ".....", ".####", "#....", ".###.", "....#", "####."],
  a: [".....", ".....", ".###.", "....#", ".####", "#...#", ".####"],
  e: [".....", ".....", ".###.", "#...#", "#####", "#....", ".###."],
  c: [".....", ".....", ".####", "#....", "#....", "#....", ".####"],
  u: [".....", ".....", "#...#", "#...#", "#...#", "#..##", ".##.#"],
  l: [".##..", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  o: [".....", ".....", ".###.", "#...#", "#...#", "#...#", ".###."],
};

export const WORD = "saeculo";
/** Pixel rows in a letter (two LED segments each). */
export const GLYPH_ROWS = 7;
/** Empty columns either side of the word, where only the spectrum plays. */
export const MARGIN = 2;

export interface WordGrid {
  /** Columns, margins included. */
  cols: number;
  /** LED segments per column that belong to the letters (two per pixel row). */
  segs: number;
  /** lit[col][seg]: seg 0 is the bottom segment. */
  lit: boolean[][];
  /** The highest lit segment in each column, or -1. */
  top: number[];
}

export function wordGrid(word = WORD): WordGrid {
  const columns: boolean[][] = [];
  const pushBlank = () => columns.push(Array(GLYPH_ROWS * 2).fill(false));
  for (let m = 0; m < MARGIN; m++) pushBlank();
  [...word].forEach((ch, i) => {
    const g = GLYPHS[ch];
    if (!g) return;
    if (i > 0) pushBlank();
    for (let x = 0; x < 5; x++) {
      const col: boolean[] = [];
      for (let row = GLYPH_ROWS - 1; row >= 0; row--) {
        const on = g[row][x] === "#";
        col.push(on, on);
      }
      columns.push(col);
    }
  });
  for (let m = 0; m < MARGIN; m++) pushBlank();
  return {
    cols: columns.length,
    segs: GLYPH_ROWS * 2,
    lit: columns,
    top: columns.map((c) => c.lastIndexOf(true)),
  };
}

/** A resting spectrum shape for column i of n: strong lows, a few bumps, falling off. */
export function restLevel(i: number, n: number): number {
  const x = i / Math.max(1, n - 1);
  const n1 = Math.sin(i * 12.9898) * 43758.5453;
  const jitter = n1 - Math.floor(n1);
  return Math.max(0.12, Math.min(1, 0.92 - x * 0.62 + Math.sin(x * 9) * 0.1 + (jitter - 0.5) * 0.22));
}

/** Segment colour from the bottom (0) to the top (1): cyan, periwinkle, violet. */
export function segColor(f: number, alpha = 1): string {
  const stops: [number, number, number][] = [
    [47, 230, 255],
    [127, 150, 255],
    [199, 125, 255],
  ];
  const k = Math.min(1, Math.max(0, f)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(k));
  const t = k - i;
  const c = stops[i].map((v, j) => Math.round(v + (stops[i + 1][j] - v) * t));
  return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
}
