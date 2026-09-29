import type { Dir } from "./world";

// Pixel people and animals, built from small text grids and a palette, so
// the neighbourhood can have a crowd without a sprite sheet. A person is a
// head (one of a few hair styles), a torso and legs; poses are standing,
// walking (two frames), sitting and crouching.

export type Hair = "short" | "long" | "cap" | "hood" | "curly" | "bald" | "bun";
export interface Look {
  skin: string;
  hair: string;
  top: string;
  pants: string;
  shoes?: string;
  style: Hair;
  accent?: string; // cap, headphones
}
export type Pose = "stand" | "walk" | "sit" | "crouch";

const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
};

const HEADS: Record<Hair, string[]> = {
  short: ["....hhhh....", "...hhhhhh...", "...hssssh...", "...sesses...", "...ssssss...", "....ssss...."],
  long: ["....hhhh....", "..hhhhhhhh..", "..hhsssshh..", "..hsesseshh.", "..hsssssshh.", "..hh.ssss.h."],
  cap: ["...kkkkkk...", "..kkkkkkkkk.", "...hssssh...", "...sesses...", "...ssssss...", "....ssss...."],
  hood: ["...cccccc...", "..cccccccc..", "..cssssssc..", "..csessesc..", "..cssssssc..", "...cssssc..."],
  curly: ["...h.hh.h...", "..hhhhhhhh..", "..hhsssshh..", "...sesses...", "...ssssss...", "....ssss...."],
  bald: ["............", "....ssss....", "...ssssss...", "...sesses...", "...ssssss...", "....ssss...."],
  bun: ["....hh......", "...hhhhh....", "..hhhhhhh...", "..hsessesh..", "..hssssssh..", "....ssss...."],
};
const TORSO_DOWN = ["...cccccc...", "..cccccccc..", "..scCccCcs..", "..sccccccs..", "...cccccc..."];
const TORSO_SIDE = ["....ccccc...", "...ccccccc..", "...cccCccs..", "...ccccccs..", "....cccccc.."];
const LEGS = {
  still: ["...pp..pp...", "...pp..pp...", "...oo..oo..."],
  a: ["...pp..pp...", "..pp....pp..", "..oo....oo.."],
  b: ["...pp..pp...", "...pp..pp...", "...oo..oo..."],
  sideA: ["....pp.pp...", "...pp...pp..", "...oo...oo.."],
  sideB: ["....ppp.....", "....ppp.....", "....ooo....."],
  sit: ["..pppppppp..", "..oo....oo.."],
  crouch: ["..pppppppp..", "..pp....pp..", "..oo....oo.."],
};

/** Back of the head: hair (or hood, cap) where the face was. */
function headUp(rows: string[], style: Hair) {
  const fill = style === "hood" ? "c" : style === "bald" ? "s" : "h";
  return rows.map((r) => r.replace(/[se]/g, fill));
}
/** Side view: one eye, towards the front. */
const headSide = (rows: string[]) => rows.map((r) => r.replace("e", "s").replace(/^(.)/, ".$1").slice(0, 12));

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
  const pal: Record<string, string> = {
    h: look.hair,
    s: look.skin,
    e: "#15100c",
    c: look.top,
    C: shade(look.top, 0.72),
    p: look.pants,
    o: look.shoes ?? "#0e0e10",
    k: look.accent ?? "#6e1f18",
  };
  const head = HEADS[look.style];
  const down = (legs: string[]) => grid([...head, ...TORSO_DOWN, ...legs], pal);
  const up = (legs: string[]) => grid([...headUp(head, look.style), ...TORSO_DOWN.map((r) => r.replace(/C/g, "c")), ...legs], pal);
  const side = (legs: string[]) => grid([...headSide(head), ...TORSO_SIDE, ...legs], pal);
  const right = [side(LEGS.still), side(LEGS.sideA), side(LEGS.sideB)];
  const sprites: PersonSprites = {
    walk: {
      down: [down(LEGS.still), down(LEGS.a), down(LEGS.b)],
      up: [up(LEGS.still), up(LEGS.a), up(LEGS.b)],
      right,
      left: right.map(flip),
    },
    sit: down(LEGS.sit),
    sitBack: up(LEGS.sit),
    crouch: grid([...head, ...TORSO_DOWN.slice(0, 4), ...LEGS.crouch], pal),
  };
  cache.set(key, sprites);
  return sprites;
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
