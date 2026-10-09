import { actorLights, drawActor, drawBoombox, drawChimes, drawMe, drawSmoke } from "./actors";
import type { Me } from "./combat";
import type { Actor } from "./life";
import type { Look } from "./people";
import { sign, type Fx } from "./places/kit";
import type { Weapon } from "./weapons";
import { paintForeground, paintPlace, sceneSize, SCENES, skylineWindows, TILE, type Dir, type Scene } from "./world";
import type { Place } from "./sfx";

// Per-frame drawing: the pre-painted place, the people and small moving
// things, then the night on top (a darkness layer with the lights cut out
// of it, and a little colour added back where they fall).

export const VIEW_W = 320;
export const VIEW_H = 176;

type G = CanvasRenderingContext2D;

// ------------------------------------------------------------ sprites

function sprite(rows: string[], pal: Record<string, string>): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = rows[0].length;
  c.height = rows.length;
  const g = c.getContext("2d")!;
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (pal[ch]) {
        g.fillStyle = pal[ch];
        g.fillRect(x, y, 1, 1);
      }
    }),
  );
  return c;
}

let clerk: HTMLCanvasElement | null = null;
let cat: HTMLCanvasElement[] | null = null;
let figure: HTMLCanvasElement | null = null;
function buildSprites() {
  if (clerk) return;
  clerk = sprite(
    ["....gggg....", "...gggggg...", "...gssssg...", "...sesses...", "...ssssss...", "....ssss....", "..vvvvvvvv..", ".vvvvvvvvvv.", ".svvvvvvvvs."],
    { g: "#8a8a86", s: "#b98f72", e: "#1b1512", v: "#3c5a4a" },
  );
  const catPal = { k: "#0b0b0f", w: "#e8e4da", g: "#8cff6e" };
  cat = [
    sprite(["k.....k.", "kk...kk.", "kkkkkkk.", "kgkkkgk.", "kkkwkkk.", ".kwwwkk.", ".kwwwkkk", ".kkkkkk.k"].map((r) => r.slice(0, 8)), catPal),
    sprite(["k.....k.", "kk...kk.", "kkkkkkk.", "kkkkkkk.", "kkkwkkk.", ".kwwwkk.", ".kwwwkk.", ".kkkkkkk"].map((r) => r.slice(0, 8)), catPal),
  ];
  figure = sprite(
    ["..kk..", ".kkkk.", ".kddk.", ".kkkk.", "..kk..", ".kkkk.", "kkkkkk", "kkkkkk", "kkkkkk", "kkkkkk", ".kkkk.", ".kkkk.", ".kkkk.", ".k..k.", ".k..k.", ".k..k.", ".k..k."],
    { k: "#050507", d: "#2a2a33" },
  );
}

// ------------------------------------------------------------ state the renderer reads

export interface View {
  place: Place;
  x: number;
  y: number;
  dir: Dir;
  walk: number; // 0 = still, else a running phase
  sitting: boolean;
  t: number;
  windowOpen: boolean;
  ringing: boolean;
  figure: number; // 0..1
  haze: number; // 0..1
  catLooking: boolean;
  tapes: boolean[];
  hints: string[]; // thing ids with a sound still to find
  reduced: boolean;
  /** Everyone else in the neighbourhood. */
  actors: Actor[];
  /** On the beat of whatever music is playing here. */
  beat: boolean;
  /** Is the corner-store boombox playing? */
  boombox: boolean;
  /** A tape on the shelf you didn't make. */
  strangeTape: boolean;
  /** Someone was sitting on the roof's ledge: what's left of her cigarette. */
  ember: boolean;
  /** Your tape playing on the roof: the city's windows answer it. */
  roofMusic: boolean;
  dt: number;
  /** You, dressed. */
  look: Look;
  weapon: Weapon;
  /** Your fight state, while there's a fight. */
  me: Me | null;
  /** Knocked out. */
  down: boolean;
  hp: number;
  maxHp: number;
  /** Where the visible picture starts (a phone held upright shows only part of it). */
  hudX?: number;
  /** Your name on the alley wall. */
  tag: { name: string; color: string } | null;
  /** Camera shake, in pixels. */
  shake: number;
  /** What the place's own animation keeps track of. */
  fx: Record<string, number>;
}

const painted = new Map<Place, HTMLCanvasElement>();
let dark: HTMLCanvasElement | null = null;
const drops = Array.from({ length: 110 }, (_, i) => ({ x: (i * 97) % VIEW_W, y: (i * 53) % VIEW_H, v: 170 + ((i * 31) % 70) }));

export function camera(s: Scene, x: number, y: number) {
  const { w, h } = sceneSize(s);
  const cx = w <= VIEW_W ? (w - VIEW_W) / 2 : Math.min(Math.max(x - VIEW_W / 2, 0), w - VIEW_W);
  const cy = h <= VIEW_H ? (h - VIEW_H) / 2 : Math.min(Math.max(y - VIEW_H / 2, 0), h - VIEW_H);
  return { cx: Math.round(cx), cy: Math.round(cy) };
}

/** The lamp outside flickers on a fixed, uneven rhythm. */
function lampLevel(kind: string | undefined, t: number, reduced: boolean) {
  if (reduced || !kind || kind === "screen") return kind === "screen" && !reduced ? 0.93 + Math.sin(t * 7) * 0.03 : 1;
  if (kind === "dead") {
    const k = t % 9;
    return k < 0.12 || (k > 0.3 && k < 0.38) ? 0.8 : 0.12;
  }
  const k = t % 7.3;
  return (k > 2 && k < 2.08) || (k > 2.2 && k < 2.25) || (k > 5.1 && k < 5.4) ? 0.25 : 1;
}

export function draw(g: G, v: View) {
  buildSprites();
  const s = SCENES[v.place];
  let bg = painted.get(v.place);
  if (!bg) {
    bg = paintPlace(s);
    painted.set(v.place, bg);
  }
  const cam = camera(s, v.x, v.y);
  const sh = v.shake > 0 && !v.reduced ? v.shake : 0;
  const cx = cam.cx + Math.round((Math.random() - 0.5) * 2 * sh);
  const cy = cam.cy + Math.round((Math.random() - 0.5) * 2 * sh);
  const fx: Fx = { t: v.t, reduced: v.reduced, beat: v.beat, state: v.fx };
  g.imageSmoothingEnabled = false;
  g.fillStyle = "#050507";
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  g.save();
  g.translate(-cx, -cy);
  g.drawImage(bg, 0, 0);
  s.fx?.(g, fx);
  if (v.place === "alley" && v.tag) {
    // your name, sprayed, with a drip or two
    const x = 14 * TILE + 6;
    sign(g, v.tag.name.toUpperCase().slice(0, 10), x, 10, v.tag.color, "rgba(0,0,0,0.6)", 9);
    g.fillStyle = v.tag.color;
    g.fillRect(x + 6, 19, 1, 4);
    g.fillRect(x + 22, 19, 1, 6);
  }

  // --- things that change
  if (v.place === "bedroom") {
    // your saved tapes, on the shelf
    v.tapes.forEach((on, i) => {
      if (!on) return;
      const x = 11 * TILE + 4 + (i % 2) * 13;
      const y = 3 * TILE - 11 + Math.floor(i / 2) * 13;
      g.fillStyle = ["#e4b95a", "#c9c2b3", "#a4452f", "#8fb37a"][i];
      g.fillRect(x, y, 11, 8);
      g.fillStyle = "#1c140f";
      g.fillRect(x + 2, y + 3, 7, 2);
    });
    if (v.strangeTape) {
      // black, no label, lying a little crooked at the end of the shelf
      const x = 11 * TILE + 30;
      const y = 3 * TILE - 11;
      g.fillStyle = "#3a383e";
      g.fillRect(x, y + 1, 11, 7);
      g.fillStyle = "#0b0b0d";
      g.fillRect(x + 1, y + 2, 9, 5);
      g.fillStyle = "#26252a";
      g.fillRect(x + 2, y + 3, 7, 2);
    }
    // rain on the glass; the window open lets a little in on the sill
    if (!v.reduced) {
      g.fillStyle = "rgba(170,190,235,0.35)";
      for (let i = 0; i < 9; i++) {
        const x = 7 * TILE + ((i * 5.3 + v.t * 3) % (3 * TILE));
        const y = TILE + 2 + ((i * 7 + v.t * 40 * (1 + (i % 3) * 0.3)) % 22);
        g.fillRect(Math.floor(x), Math.floor(y), 1, 3);
      }
    }
    if (v.windowOpen) {
      g.fillStyle = "#0f1830";
      g.fillRect(7 * TILE + 24, TILE + 2, 22, 2 * TILE - 7);
      g.fillStyle = "rgba(170,190,235,0.25)";
      g.fillRect(7 * TILE - 2, 2 * TILE + 10, 3 * TILE + 4, 2);
    }
  }
  if (v.place === "store" && clerk) g.drawImage(clerk, 10 * TILE + 2, 3 * TILE + 3);
  if (v.place === "street") {
    if (cat) g.drawImage(cat[v.catLooking ? 0 : 1], 15 * TILE + 4, 3 * TILE + 2);
    // the payphone shakes a hair while it rings
    if (v.ringing && Math.floor(v.t * 20) % 2 === 0 && v.t % 6 < 2) {
      g.fillStyle = "#6f8596";
      g.fillRect(26 * TILE + 2 + (v.reduced ? 0 : 1), 2 * TILE + 2, 10, 2);
    }
    if (v.figure > 0.01 && figure) {
      g.globalAlpha = v.figure;
      g.drawImage(figure, 38 * TILE + 5, 8 * TILE + 5);
      g.globalAlpha = 1;
    }
  }

  // hints: a faint glint over places with a sound still to find
  if (!v.reduced || Math.floor(v.t) % 2 === 0) {
    const glintAt: Record<string, [Place, number, number]> = {
      window: ["bedroom", 8.5, 1],
      phone: ["street", 26.5, 1.6],
      counter: ["store", 10.5, 2.6],
      sampler: ["studio", 8, 1],
      bench: ["street", 9, 2.2],
      hoop: ["park", 26, 0.3],
      chimes: ["rooftop", 9.4, 1],
      wall: ["alley", 16, 1.2],
      dice: ["alley", 19.6, 6.2],
      crates: ["records", 5, 4.2],
      edge: ["subway", 16, 5.4],
      booth: ["club", 12, 2.2],
      speaker: ["underpass", 17.5, 5],
    };
    for (const id of v.hints) {
      const at = glintAt[id];
      if (!at || at[0] !== v.place) continue;
      const p = [at[1], at[2]];
      const a = v.reduced ? 0.8 : 0.45 + Math.sin(v.t * 3) * 0.35;
      g.fillStyle = `rgba(242,180,90,${a.toFixed(2)})`;
      const x = Math.round(p[0] * TILE);
      const y = Math.round(p[1] * TILE);
      g.fillRect(x, y - 2, 1, 5);
      g.fillRect(x - 2, y, 5, 1);
    }
  }

  if (v.place === "street") drawBoombox(g, v.beat, v.boombox);
  if (v.place === "rooftop") {
    drawChimes(g, v.t, v.reduced);
    if (v.roofMusic) {
      // windows across the way come on with the beat, a different few each bar
      const wins = skylineWindows();
      const bar = Math.floor(v.t * 0.6);
      g.fillStyle = v.beat ? "#f0c070" : "#8a6a3a";
      for (let i = 0; i < wins.length; i++) if ((i * 7 + bar * 13) % 11 < (v.reduced ? 2 : v.beat ? 4 : 2)) g.fillRect(wins[i][0], wins[i][1], 1, 2);
    }
    if (v.ember) {
      const glow = v.reduced || Math.sin(v.t * 2.3) > -0.3 ? "#ff7a2e" : "#8a2e12";
      g.fillStyle = glow;
      g.fillRect(11 * TILE + 3, 3 * TILE + 13, 1, 1);
      g.fillStyle = "#ece8de";
      g.fillRect(11 * TILE + 1, 3 * TILE + 13, 2, 1);
    }
  }

  // --- everyone, back to front, you included
  const here = v.actors.filter((a) => a.place === v.place && !a.hidden);
  const order: (Actor | null)[] = [...here, null].sort((a, b) => (a ? a.y : v.y) - (b ? b.y : v.y));
  for (const a of order) {
    if (a) {
      drawActor(g, a, v.t, v.beat, v.reduced);
      continue;
    }
    drawMe(g, { x: v.x, y: v.y, dir: v.dir, walk: v.walk, sitting: v.sitting, look: v.look, weapon: v.weapon, me: v.me, down: v.down }, v.t, v.reduced);
  }
  drawSmoke(g, v.dt);

  paintForeground(g, s);
  s.front?.(g, fx);
  g.restore();

  // --- rain outside
  if (s.outdoors && !v.reduced) {
    g.strokeStyle = "rgba(160,180,220,0.28)";
    g.lineWidth = 1;
    g.beginPath();
    for (const d of drops) {
      const y = (d.y + v.t * d.v) % (VIEW_H + 20) - 10;
      const x = (d.x - v.t * 30 + VIEW_W * 4) % VIEW_W;
      g.moveTo(Math.round(x) + 0.5, Math.round(y));
      g.lineTo(Math.round(x - 1) + 0.5, Math.round(y + 5));
    }
    g.stroke();
  }

  // --- night
  if (!dark) {
    dark = document.createElement("canvas");
    dark.width = VIEW_W;
    dark.height = VIEW_H;
  }
  const d = dark.getContext("2d")!;
  d.globalCompositeOperation = "source-over";
  d.clearRect(0, 0, VIEW_W, VIEW_H);
  d.fillStyle = `rgba(6,7,16,${s.darkness})`;
  d.fillRect(0, 0, VIEW_W, VIEW_H);
  d.globalCompositeOperation = "destination-out";
  const lights = [...s.lights, ...actorLights(v.actors, v.place), ...(s.liveLights?.(fx) ?? [])];
  for (const L of lights) {
    const lv = lampLevel(L.kind, v.t, v.reduced);
    const x = L.x - cx;
    const y = L.y - cy;
    const grad = d.createRadialGradient(x, y, 0, x, y, L.r);
    grad.addColorStop(0, `rgba(0,0,0,${(0.95 * lv).toFixed(3)})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    d.fillStyle = grad;
    d.fillRect(x - L.r, y - L.r, L.r * 2, L.r * 2);
  }
  g.drawImage(dark, 0, 0);
  g.globalCompositeOperation = "lighter";
  for (const L of lights) {
    const lv = lampLevel(L.kind, v.t, v.reduced);
    const x = L.x - cx;
    const y = L.y - cy;
    const grad = g.createRadialGradient(x, y, 0, x, y, L.r * 0.8);
    grad.addColorStop(0, L.color);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.globalAlpha = 0.28 * lv;
    g.fillStyle = grad;
    g.fillRect(x - L.r, y - L.r, L.r * 2, L.r * 2);
  }
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";

  // a little haze after the bench
  if (v.haze > 0) {
    g.fillStyle = `rgba(190,200,210,${(v.haze * 0.12).toFixed(3)})`;
    g.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  // hurt: the edges go red, more as it gets worse
  const hurt = 1 - v.hp / v.maxHp;
  if (v.me && (v.me.flash > 0 || hurt > 0.6)) {
    const a = v.me.flash > 0 ? 0.35 : (hurt - 0.6) * 0.5 * (v.reduced ? 1 : 0.75 + Math.sin(v.t * 6) * 0.25);
    const grad = g.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.6);
    grad.addColorStop(0, "rgba(160,0,0,0)");
    grad.addColorStop(1, `rgba(160,0,0,${a.toFixed(3)})`);
    g.fillStyle = grad;
    g.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  // your health, top left, whenever it matters
  if (v.me || v.hp < v.maxHp) {
    const f = Math.max(0, v.hp / v.maxHp);
    g.save();
    g.translate(v.hudX ?? 0, 0);
    g.fillStyle = "rgba(0,0,0,0.6)";
    g.fillRect(4, 4, 66, 9);
    g.fillStyle = "#ff5a7a";
    g.fillRect(6, 6, 2, 1);
    g.fillRect(9, 6, 2, 1);
    g.fillRect(5, 7, 7, 2);
    g.fillRect(6, 9, 5, 1);
    g.fillRect(7, 10, 3, 1);
    g.fillStyle = "#2a2a30";
    g.fillRect(14, 6, 54, 5);
    g.fillStyle = f > 0.5 ? "#7ddc3a" : f > 0.25 ? "#ffd23a" : "#ff5a3a";
    g.fillRect(14, 6, Math.max(1, Math.round(54 * f)), 5);
    g.fillStyle = "rgba(255,255,255,0.3)";
    g.fillRect(14, 6, Math.round(54 * f), 1);
    g.restore();
  }
}
