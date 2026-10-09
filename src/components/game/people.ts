import type { Dir } from "./world";

// Pixel people and animals, built from small text grids and a palette, so
// the neighbourhood can have a crowd without a sprite sheet. A person is a
// head (a hair style, maybe a hat, glasses, headphones), a torso (body
// type and the cut of the top) and legs (the cut of the pants, shoes);
// poses are standing, walking (two frames), sitting and crouching.

export type Hair = "short" | "long" | "cap" | "hood" | "curly" | "bald" | "bun" | "mullet" | "afro" | "buzz" | "braids" | "ponytail";
export type Body = "slim" | "regular" | "broad";
export type TopStyle = "tee" | "hoodie" | "jacket" | "puffer" | "track" | "varsity" | "leather";
export type PantsStyle = "jeans" | "joggers" | "cargo" | "track";
export type HatStyle = "cap" | "beanie" | "bucket" | "durag";
export type ExtraStyle = "headphones" | "shades" | "chain" | "backpack";
export interface Look {
  skin: string;
  hair: string;
  top: string;
  pants: string;
  shoes?: string;
  style: Hair;
  accent?: string; // cap, headphones
  // the rest is for people dressed in detail (you, mostly)
  body?: Body;
  /** Second colour of the top: inner shirt, stripes, sleeves. */
  trim?: string;
  topStyle?: TopStyle;
  pantsTrim?: string;
  pantsStyle?: PantsStyle;
  hat?: HatStyle;
  hatColor?: string;
  hatShade?: string;
  extra?: ExtraStyle;
  extraColor?: string;
  extraShade?: string;
}
export type Pose = "stand" | "walk" | "sit" | "crouch";

const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
};
const mix = (a: string, b: string, t: number) => {
  const x = parseInt(a.slice(1), 16);
  const y = parseInt(b.slice(1), 16);
  const ch = (sh: number) => Math.round(((x >> sh) & 255) * (1 - t) + ((y >> sh) & 255) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
};

// Palette letters: h hair, b hair stubble, s skin, e eyes, c top, C top
// shade, i top trim, L top shine, k hat/accent, K hat shade, p pants,
// P pants shade, q pants trim, o shoes, g glasses, y chain, z headphones,
// B bag, n bag shade.
const HEADS: Record<Hair, string[]> = {
  short: ["....hhhh....", "...hhhhhh...", "...hssssh...", "...sesses...", "...ssssss...", "....ssss...."],
  long: ["....hhhh....", "..hhhhhhhh..", "..hhsssshh..", "..hsesseshh.", "..hsssssshh.", "..hh.ssss.h."],
  cap: ["...kkkkkk...", "..kkkkkkkkk.", "...hssssh...", "...sesses...", "...ssssss...", "....ssss...."],
  hood: ["...cccccc...", "..cccccccc..", "..cssssssc..", "..csessesc..", "..cssssssc..", "...cssssc..."],
  curly: ["...h.hh.h...", "..hhhhhhhh..", "..hhsssshh..", "...sesses...", "...ssssss...", "....ssss...."],
  bald: ["............", "....ssss....", "...ssssss...", "...sesses...", "...ssssss...", "....ssss...."],
  bun: ["....hh......", "...hhhhh....", "..hhhhhhh...", "..hsessesh..", "..hssssssh..", "....ssss...."],
  mullet: ["....hhhh....", "...hhhhhh...", "...hssssh...", "...sesses...", "..hssssssh..", "..hhsssshh.."],
  afro: ["..hhhhhhhh..", ".hhhhhhhhhh.", ".hhsssssshh.", ".hhsesseshh.", "..hssssssh..", "....ssss...."],
  buzz: ["............", "....bbbb....", "...bbbbbb...", "...sesses...", "...ssssss...", "....ssss...."],
  braids: ["...h.hh.h...", "..hhhhhhhh..", "..hhsssshh..", "..hsessesh..", "..hssssssh..", "..h.ssss.h.."],
  ponytail: ["....hhhh....", "...hhhhhh...", "...hssssh...", "...sesses...", "...sssssshh.", "....ssss..h."],
};
const HATS: Record<HatStyle, string[]> = {
  cap: ["...kkkkkk...", "..kkkkkkkkK."],
  beanie: ["...kkkkkk...", "..kkkkkkkk..", "..KKKKKKKK.."],
  bucket: ["...kkkkkk...", "..kkkkkkkk..", ".KKKKKKKKKK."],
  durag: ["...kkkkkk...", "..kkkkkkkk..", "..kssssssk.."],
};
const TORSO: Record<Body, string[]> = {
  slim: ["....cccc....", "...cccccc...", "...sCccCs...", "...sccccs...", "....cccc...."],
  regular: ["...cccccc...", "..cccccccc..", "..scCccCcs..", "..sccccccs..", "...cccccc..."],
  broad: ["..cccccccc..", ".cccccccccc.", ".scCccccCcs.", ".sccccccccs.", "..cccccccc.."],
};
const TORSO_SIDE: Record<Body, string[]> = {
  slim: [".....cccc...", "....cccccc..", "....ccCccs..", "....cccccs..", ".....ccccc.."],
  regular: ["....ccccc...", "...ccccccc..", "...cccCccs..", "...ccccccs..", "....cccccc.."],
  broad: ["...cccccc...", "..cccccccc..", "..ccccCccs..", "..cccccccs..", "...ccccccc.."],
};
const LEGS = {
  still: ["...pp..pp...", "...pp..pp...", "...oo..oo..."],
  a: ["...pp..pp...", "..pp....pp..", "..oo....oo.."],
  b: ["...pp..pp...", "...pp..pp...", "...oo..oo..."],
  sideA: ["....pp.pp...", "...pp...pp..", "...oo...oo.."],
  sideB: ["....ppp.....", "....ppp.....", "....ooo....."],
  sit: ["..pppppppp..", "..oo....oo.."],
  crouch: ["..pppppppp..", "..pp....pp..", "..oo....oo.."],
};

const put = (row: string, col: number, ch: string) => (col < 0 || col >= row.length ? row : row.slice(0, col) + ch + row.slice(col + 1));
/** Replace the matching cells of a row (by a test on the old letter). */
const paint = (row: string, cols: number[], ch: string, when: (old: string) => boolean = (o) => o !== ".") =>
  cols.reduce((r, c) => (when(r[c] ?? ".") ? put(r, c, ch) : r), row);
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, k) => a + k);
const isTop = (o: string) => o === "c" || o === "C";

function headFront(look: Look): string[] {
  let rows = [...HEADS[look.style]];
  if (look.hat) {
    const hat = HATS[look.hat];
    rows = rows.map((r, y) => hat[y] ?? r);
  }
  if (look.extra === "shades") rows[3] = paint(rows[3], range(4, 7), "g");
  if (look.extra === "headphones") {
    rows[0] = paint(rows[0], range(3, 8), "z", () => true);
    rows[2] = paint(rows[2], [2, 9], "z", () => true);
    rows[3] = paint(rows[3], [2, 9], "z", () => true);
  }
  if (look.topStyle === "hoodie") rows[5] = paint(rows[5], [3, 8], "c", (o) => o === ".");
  return rows;
}

/** Back of the head: hair (or hood, cap) where the face was. */
function headBack(rows: string[], style: Hair) {
  const fill = style === "hood" ? "c" : style === "bald" ? "s" : style === "buzz" ? "b" : "h";
  return rows.map((r, y) => (y < 5 ? r.replace(/[seg]/g, fill) : r.replace(/[eg]/g, fill)));
}
/** Side view: one eye, towards the front. */
const headSide = (rows: string[]) => rows.map((r) => r.replace(/e(?=[^e]*e)/, "s").replace(/g{4}/, "ssgg").replace(/^(.)/, ".$1").slice(0, 12));

function torsoFront(look: Look, back = false): string[] {
  const body = look.body ?? "regular";
  let rows = [...TORSO[body]];
  const st = look.topStyle;
  const mid = [5, 6];
  const outer = (r: string) => {
    const a = r.search(/[cC]/);
    const b = r.length - 1 - [...r].reverse().join("").search(/[cC]/);
    return a < 0 ? [] : [a, b];
  };
  if (back) rows = rows.map((r) => r.replace(/C/g, "c"));
  switch (st) {
    case "tee":
      rows = rows.map((r) => r.replace(/C/g, "c"));
      if (!back) rows[0] = paint(rows[0], mid, "s");
      break;
    case "hoodie":
      if (back) rows[0] = paint(rows[0], range(4, 7), "C");
      else {
        rows[0] = paint(rows[0], [5, 6], "i");
        rows[3] = paint(rows[3], [5, 6], "C");
      }
      break;
    case "jacket":
      if (!back) {
        rows = rows.map((r, y) => paint(r, mid, y === 4 ? "c" : "i"));
        rows[0] = paint(rows[0], [4, 7], "C");
      }
      break;
    case "puffer":
      rows[1] = rows[1].replace(/c/g, "C");
      rows[3] = rows[3].replace(/c/g, "C");
      break;
    case "track":
      rows[1] = paint(rows[1], outer(rows[1]), "i");
      rows[2] = paint(rows[2], outer(rows[2].replace(/s/g, ".")), "i");
      if (!back) rows = rows.map((r) => paint(r, [6], "i", isTop));
      break;
    case "varsity":
      for (const y of [1, 2, 3]) rows[y] = paint(rows[y], outer(rows[y].replace(/s/g, ".")), "i");
      if (!back) rows[0] = paint(rows[0], mid, "i");
      break;
    case "leather":
      if (!back) {
        rows[0] = paint(rows[0], mid, "i");
        rows[1] = paint(rows[1], [5], "i");
        rows[1] = paint(rows[1], [4], "L", isTop);
      }
      break;
  }
  if (look.extra === "chain" && !back) rows[1] = paint(rows[1], mid, "y");
  if (look.extra === "backpack") {
    if (back) for (const y of [0, 1, 2, 3]) rows[y] = paint(rows[y], range(4, 7), y === 3 ? "n" : "B");
    else for (const y of [0, 1, 2]) rows[y] = paint(rows[y], [4, 7], "B", isTop);
  }
  return rows;
}

function torsoSide(look: Look): string[] {
  let rows = [...TORSO_SIDE[look.body ?? "regular"]];
  if (look.topStyle === "track" || look.topStyle === "varsity") rows = rows.map((r, y) => (y >= 1 && y <= 3 ? paint(r, [r.lastIndexOf("c")], "i", isTop) : r));
  if (look.topStyle === "puffer") rows[2] = rows[2].replace(/c/g, "C");
  if (look.extra === "backpack") rows = rows.map((r, y) => (y <= 3 ? paint(r, [r.search(/[cC]/) - 1, r.search(/[cC]/)], y === 3 ? "n" : "B", () => true) : r));
  return rows;
}

function legs(look: Look, rows: string[]): string[] {
  switch (look.pantsStyle) {
    case "jeans":
      return rows.map((r) => r.replace(/pp/g, "pP"));
    case "joggers":
      return rows.map((r, y) => (y === rows.length - 2 ? r.replace(/p/g, "P") : r));
    case "cargo":
      return rows.map((r, y) => (y === 0 ? r.replace(/pp/g, "Pp") : r));
    case "track":
      return rows.map((r, y) => (y < rows.length - 1 ? r.replace(/pp/g, "qp") : r));
    default:
      return rows;
  }
}

function grid(rows: string[], pal: Record<string, string>): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 12;
  c.height = rows.length;
  const g = c.getContext("2d")!;
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const col = pal[ch];
      if (col) {
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      }
    }),
  );
  return c;
}

function flip(c: HTMLCanvasElement) {
  const o = document.createElement("canvas");
  o.width = c.width;
  o.height = c.height;
  const g = o.getContext("2d")!;
  g.scale(-1, 1);
  g.drawImage(c, -c.width, 0);
  return o;
}

export interface PersonSprites {
  walk: Record<Dir, HTMLCanvasElement[]>; // [still, a, b]
  sit: HTMLCanvasElement;
  sitBack: HTMLCanvasElement;
  crouch: HTMLCanvasElement;
}

const cache = new Map<string, PersonSprites>();

export function personSprites(look: Look): PersonSprites {
  const key = JSON.stringify(look);
  const hit = cache.get(key);
  if (hit) return hit;
  const accent = look.accent ?? "#6e1f18";
  const pal: Record<string, string> = {
    h: look.hair,
    b: mix(look.hair, look.skin, 0.45),
    s: look.skin,
    e: "#15100c",
    c: look.top,
    C: shade(look.top, 0.72),
    i: look.trim ?? shade(look.top, 1.35),
    L: shade(look.top, 2.2),
    p: look.pants,
    P: look.pantsTrim ?? shade(look.pants, 0.75),
    q: look.pantsTrim ?? "#e8e0cf",
    o: look.shoes ?? "#0e0e10",
    k: look.hatColor ?? accent,
    K: look.hatShade ?? shade(look.hatColor ?? accent, 0.7),
    g: look.extraColor ?? "#0b0b0d",
    y: look.extraColor ?? "#d8b35a",
    z: look.extraColor ?? "#1b1b1f",
    B: look.extraColor ?? "#2a2c33",
    n: look.extraShade ?? "#1b1b1f",
  };
  const head = headFront(look);
  const torso = torsoFront(look);
  const back = torsoFront(look, true);
  const side = torsoSide(look);
  const down = (l: string[]) => grid([...head, ...torso, ...legs(look, l)], pal);
  const up = (l: string[]) => grid([...headBack(head, look.style), ...back, ...legs(look, l)], pal);
  const sideOf = (l: string[]) => grid([...headSide(head), ...side, ...legs(look, l)], pal);
  const right = [sideOf(LEGS.still), sideOf(LEGS.sideA), sideOf(LEGS.sideB)];
  const sprites: PersonSprites = {
    walk: {
      down: [down(LEGS.still), down(LEGS.a), down(LEGS.b)],
      up: [up(LEGS.still), up(LEGS.a), up(LEGS.b)],
      right,
      left: right.map(flip),
    },
    sit: down(LEGS.sit),
    sitBack: up(LEGS.sit),
    crouch: grid([...head, ...torso.slice(0, 4), ...legs(look, LEGS.crouch)], pal),
  };
  cache.set(key, sprites);
  return sprites;
}

/** A sprite flashed white (taking a hit). */
const flashCache = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
export function flashed(img: HTMLCanvasElement): HTMLCanvasElement {
  let f = flashCache.get(img);
  if (!f) {
    f = document.createElement("canvas");
    f.width = img.width;
    f.height = img.height;
    const g = f.getContext("2d")!;
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = "source-in";
    g.fillStyle = "#fff";
    g.fillRect(0, 0, f.width, f.height);
    flashCache.set(img, f);
  }
  return f;
}

// ------------------------------------------------------------ animals

const DOG = {
  a: ["..........kk", ".........kkkk", "kbbbbbbbbbkn.", ".bbbbbbbbbb..", ".bb.....bb...", ".b.......b..."],
  b: ["..........kk", ".........kkkk", "kbbbbbbbbbkn.", ".bbbbbbbbbb..", "..bb...bb....", "..b.....b...."],
};
const dogCache = new Map<string, HTMLCanvasElement[]>();
/** A dog, facing right: two walking frames. */
export function dogSprites(body: string, ears: string): HTMLCanvasElement[] {
  const key = body + ears;
  let d = dogCache.get(key);
  if (!d) {
    const pal = { b: body, k: ears, n: "#0a0a0a" };
    d = [grid(DOG.a.map((r) => r.padEnd(12, ".").slice(0, 12)), pal), grid(DOG.b.map((r) => r.padEnd(12, ".").slice(0, 12)), pal)];
    dogCache.set(key, d);
  }
  return d;
}

let pigeon: HTMLCanvasElement[] | null = null;
/** A pigeon: standing, pecking, flying. */
export function pigeonSprites(): HTMLCanvasElement[] {
  if (pigeon) return pigeon;
  const pal = { g: "#8b8f99", d: "#5d616b", n: "#5f8f7a", o: "#e08040" };
  pigeon = [
    grid(["...gg.......", "..gng.......", "ogggggg.....", "..dgggg.....", "...o.o......"], pal),
    grid(["............", "...gggg.....", "ogggggg.....", "..dgggg.....", "...o.o......"], pal),
    grid(["d.......d...", "dd.gg..dd...", ".dggnggd....", "..gggggg....", "............"], pal),
  ];
  return pigeon;
}
