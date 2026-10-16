// The room behind the lit window, in its own pixels: the bedroom from the
// game at night, the lamp on, the album cover on the wall, the laptop open
// on the desk, and someone in the desk chair beside it, hood up, smoking.
// The still parts are painted once; each frame copies them and draws the
// person, the coal, the smoke and the laptop's screen over them.
//
// What they do, in ms of the room's own clock (from when the camera gets
// in): a moment, then the joint lit (lighter up, a flicker, the coal
// catches), then over and over: hand up, a long pull (the coal brightens
// and lights the chin), hand down, and the smoke let out slowly. When the
// visitor presses a key they stop, lean over and press the laptop's space
// bar (PRESS times, from the key).

/** Everything below is drawn this far down the canvas, so a tall phone screen has wall above it. */
const OY = 50;
export const RW = 240;
export const RH = 180 + OY + 40;
const FLOOR_AT = 136;
/** The floor line, for filling past the edges. */
export const FLOOR_Y = FLOOR_AT + OY;
export const WALL = "#26252f";
export const FLOOR = "#2f241c";
/** The laptop's screen (as drawn, and on the canvas). */
const SCR = { x: 142, y: 72, w: 30, h: 20 };
export const SCREEN = { ...SCR, y: SCR.y + OY };
/** What the camera keeps in view: the person and the desk (narrower on a phone held upright). */
export const FOCUS = { x: 134, y: 88 + OY, w: 150, h: 104 };
export const FOCUS_TALL = { x: 132, y: 92 + OY, w: 104, h: 104 };
/** The part of the room seen through the glass from outside (canvas px, the window's shape). */
export const PEEK = { x: 78, y: 26 + OY, w: 120, h: 160 };

/** The joint lit (from the room's clock). */
const LIGHT = { start: 300, flame: [600, 1450] as const, end: 1750 };
/** One draw on it, then the smoke let out. */
const CYCLE = 6200;
const C = { up: [1300, 1800], pull: [1800, 2900], down: [2900, 3400], exhale: [3600, 4700] } as const;
/** The key press: they stop (the joint down), a beat, reach over, the space bar, back. */
export const PRESS = { settle: 450, reach: [750, 1150], hit: 1200, back: [1350, 1750] } as const;
/** When the lit-up is done and the visitor can be asked for a key. */
export const READY_AT = LIGHT.end + 300;

type G = CanvasRenderingContext2D;
type Pt = [number, number];
const r = (g: G, x: number, y: number, w: number, h: number, c: string) => {
  g.fillStyle = c;
  g.fillRect(x, y, w, h);
};
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (a: number, b: number, v: number) => {
  const k = clamp((v - a) / (b - a));
  return k * k * (3 - 2 * k);
};
const mix = (a: Pt, b: Pt, k: number): Pt => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** A thick pixel line (an arm, a joint). */
function limb(g: G, a: Pt, b: Pt, w: number, c: string) {
  g.fillStyle = c;
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])));
  for (let i = 0; i <= n; i++) {
    const x = Math.round(a[0] + ((b[0] - a[0]) * i) / n - w / 2);
    const y = Math.round(a[1] + ((b[1] - a[1]) * i) / n - w / 2);
    g.fillRect(x, y, w, w);
  }
}

/** A soft pixel disc (a puff of smoke, a glow). */
function disc(g: G, cx: number, cy: number, rad: number, c: string) {
  g.fillStyle = c;
  const R = Math.max(1, Math.round(rad));
  for (let dy = -R; dy <= R; dy++) {
    const w = Math.round(Math.sqrt(R * R - dy * dy));
    g.fillRect(Math.round(cx) - w, Math.round(cy) + dy, w * 2 + 1, 1);
  }
}

// ------------------------------------------------------------ the still parts

function paintBack(cover: HTMLImageElement | null) {
  const c = canvas(RW, RH);
  const g = c.getContext("2d")!;
  // the wall: the bedroom's faded stripes, a skirting board, the boards
  r(g, 0, 0, RW, FLOOR_Y, WALL);
  for (let x = 3; x < RW; x += 9) r(g, x, 0, 1, FLOOR_Y, "#2c2b37");
  r(g, 0, FLOOR_Y - 3, RW, 3, "#1c1b26");
  r(g, 0, FLOOR_Y, RW, RH - FLOOR_Y, FLOOR);
  for (let y = FLOOR_Y + 6; y < RH; y += 7) r(g, 0, y, RW, 1, "#271d16");
  for (let y = FLOOR_Y; y < RH; y += 7) for (let x = (((y - FLOOR_Y) / 7) % 2) * 23; x < RW; x += 46) r(g, x, y, 1, 6, "#271d16");
  g.translate(0, OY);

  // the poster: the album cover
  r(g, 148, 36, 28, 28, "#16151c");
  if (cover) {
    g.imageSmoothingEnabled = true;
    g.drawImage(cover, 150, 38, 24, 24);
  } else r(g, 150, 38, 24, 24, "#3a3550");
  // a shelf of tapes
  r(g, 34, 58, 40, 2, "#4d3526");
  ["#a3321f", "#3d5a8a", "#e4b95a", "#cfc8b9", "#2f6b3a", "#6b6357", "#8e3a2b", "#3d5a8a"].forEach((col, i) => r(g, 36 + i * 4, 50, 3, 8, col));

  // the desk
  r(g, 122, 100, 88, 4, "#4d3526");
  r(g, 122, 104, 88, 5, "#2f2017");
  r(g, 124, 109, 3, FLOOR_Y - 109, "#2f2017");
  r(g, 180, 109, 28, FLOOR_Y - 109, "#3a281d");
  r(g, 180, 109, 28, 1, "#2b1e17");
  r(g, 182, 120, 24, 1, "#2b1e17");
  r(g, 192, 114, 4, 1, "#7a5a3a");
  r(g, 192, 126, 4, 1, "#7a5a3a");
  // the laptop: lid, keyboard, the space bar
  r(g, SCR.x - 2, SCR.y - 2, SCR.w + 4, SCR.h + 5, "#16171b");
  r(g, SCR.x - 4, 95, SCR.w + 8, 2, "#2a2c31");
  r(g, SCR.x - 5, 97, SCR.w + 10, 3, "#22242a");
  for (let x = SCR.x - 3; x < SCR.x + SCR.w + 3; x += 3) r(g, x, 97, 2, 1, "#3a3d45");
  // a mug, the lamp
  r(g, 125, 94, 5, 6, "#8e3a2b");
  r(g, 130, 96, 1, 2, "#8e3a2b");
  r(g, 190, 97, 10, 3, "#1c1a1e");
  r(g, 194, 80, 1, 17, "#1c1a1e");
  r(g, 186, 80, 9, 1, "#1c1a1e");
  r(g, 182, 76, 10, 5, "#c9a96a");
  r(g, 183, 81, 8, 1, "#fff2c9");

  // the chair's back, behind whoever's in it
  r(g, 86, 60, 30, 48, "#18171c");
  r(g, 88, 58, 26, 2, "#18171c");
  r(g, 87, 62, 1, 44, "#232229");
  // its stem and feet
  r(g, 99, 114, 4, 15, "#141317");
  r(g, 84, 129, 34, 3, "#141317");
  for (const x of [84, 99, 115]) r(g, x, 132, 3, 3, "#0d0c10");
  return c;
}

/** The lamp's warmth and the screen's cooler light, over everything. */
function paintLight() {
  const c = canvas(RW, RH);
  const g = c.getContext("2d")!;
  g.translate(0, OY);
  const warm = g.createRadialGradient(187, 84, 2, 187, 84, 120);
  warm.addColorStop(0, "rgba(255, 210, 140, 0.30)");
  warm.addColorStop(0.45, "rgba(255, 190, 110, 0.10)");
  warm.addColorStop(1, "rgba(255, 190, 110, 0)");
  g.fillStyle = warm;
  g.fillRect(0, -OY, RW, RH);
  // the corners of the room fall away into the dark
  const dark = g.createRadialGradient(134, 90, 40, 134, 90, 170);
  dark.addColorStop(0, "rgba(8, 8, 14, 0)");
  dark.addColorStop(1, "rgba(8, 8, 14, 0.6)");
  g.fillStyle = dark;
  g.fillRect(0, -OY, RW, RH);
  return c;
}

// ------------------------------------------------------------ the person

const HOOD = "#2c2c35";
const HOOD_HI = "#3d3d4a";
const HOOD_LO = "#222229";
const SKIN = "#7a5642";
const JEANS = "#2a3550";
const SHOE = "#d9d3c9";
const PAPER = "#e8e2d6";

/** Shoulders, and where the arms go in each pose. */
const SH_J: Pt = [90, 79];
const SH_O: Pt = [112, 79];
const MOUTH: Pt = [101, 72];
const J_REST = { elbow: [84, 92] as Pt, hand: [87, 99] as Pt };
const J_UP = { elbow: [88, 88] as Pt, hand: [98, 73] as Pt };
const O_REST = { elbow: [118, 92] as Pt, hand: [111, 101] as Pt };
const O_LIGHT = { elbow: [113, 86] as Pt, hand: [97, 76] as Pt };
const O_REACH = { elbow: [132, 89] as Pt, hand: [156, 98] as Pt };

interface Pose {
  /** 0 = joint hand on the armrest, 1 = at the mouth. */
  up: number;
  /** The other hand: 0 on the lap, 1 holding the lighter up, -1 reaching to the space bar. */
  other: number;
  /** How hot the coal is (0 = not lit). */
  coal: number;
  flame: boolean;
  /** Breathing smoke out. */
  exhale: boolean;
}

/** What they're doing at room time `rt`. */
function poseAt(rt: number): Pose {
  if (rt < LIGHT.end) {
    const up = ease(LIGHT.start, LIGHT.start + 350, rt) * (1 - ease(LIGHT.end - 350, LIGHT.end, rt));
    const lit = rt > 1150;
    return {
      up,
      other: up,
      coal: lit ? 0.9 : 0,
      flame: rt > LIGHT.flame[0] && rt < LIGHT.flame[1],
      exhale: false,
    };
  }
  const u = (rt - LIGHT.end) % CYCLE;
  const up = ease(C.up[0], C.up[1], u) * (1 - ease(C.down[0], C.down[1], u));
  const pull = u > C.pull[0] && u < C.pull[1] ? 0.5 + 0.5 * ease(C.pull[0], C.pull[0] + 500, u) : 0;
  return { up, other: 0, coal: Math.max(0.45, pull), flame: false, exhale: (u > C.exhale[0] && u < C.exhale[1]) || (rt > LIGHT.end && rt < LIGHT.end + 900) };
}

interface Puff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  age: number;
  life: number;
}

export interface Room {
  canvas: HTMLCanvasElement;
  /** Draw room time `rt` (< 0: before anyone's lit up); `press`: ms since the key, or null. */
  update: (rt: number, dt: number, press: number | null) => void;
  /** Whether the screen has woken (the space bar's been pressed). */
  screenOn: () => boolean;
  setCover: (img: HTMLImageElement) => void;
}

export function createRoom(): Room {
  let back = paintBack(null);
  const light = paintLight();
  const out = canvas(RW, RH);
  const g = out.getContext("2d")!;
  const puffs: Puff[] = [];
  let frozen: Pose | null = null;
  let on = false;
  let wisp = 0;

  function update(rt: number, dt: number, press: number | null) {
    let pose = rt < 0 ? { up: 0, other: 0, coal: 0, flame: false, exhale: false } : poseAt(rt);
    let reach = 0;
    if (press !== null) {
      // they stop what they're doing, lean over and press space
      frozen ??= pose;
      const settle = ease(0, PRESS.settle, press);
      pose = { ...frozen, up: frozen.up * (1 - settle), other: frozen.other * (1 - settle), flame: false, exhale: false, coal: 0.45 };
      reach = ease(PRESS.reach[0], PRESS.reach[1], press) * (1 - ease(PRESS.back[0], PRESS.back[1], press));
      on = press >= PRESS.hit;
    } else {
      frozen = null;
      on = false;
    }

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.drawImage(back, 0, 0);
    g.translate(0, OY);
    drawScreen(rt);
    const lean = Math.round(reach * 3);
    drawBody(lean, pose.coal);

    // the joint hand, the joint, the coal
    const jElbow = mix(J_REST.elbow, J_UP.elbow, pose.up);
    const jHand = mix(J_REST.hand, J_UP.hand, pose.up);
    const sj: Pt = [SH_J[0] + lean, SH_J[1]];
    limb(g, sj, jElbow, 4, HOOD);
    limb(g, jElbow, jHand, 3, HOOD);
    r(g, Math.round(jHand[0]) - 1, Math.round(jHand[1]) - 1, 3, 3, SKIN);
    const jA = mix([jHand[0] + 2, jHand[1] - 2], MOUTH, pose.up);
    const jB = mix([jHand[0] - 2, jHand[1] - 6], [MOUTH[0] - 6, MOUTH[1] + 1], pose.up);
    if (rt >= LIGHT.start || press !== null) limb(g, jA, jB, 1, PAPER);
    if (pose.coal > 0) {
      const hot = pose.coal;
      disc(g, jB[0], jB[1], 1 + hot * 2, `rgba(255, 140, 60, ${(0.04 + hot * 0.16).toFixed(3)})`);
      r(g, Math.round(jB[0]), Math.round(jB[1]), 1, 1, hot > 0.7 ? "#ffd27a" : "#ff7a2a");
    }

    // the other hand: on the lap, the lighter, or over to the space bar
    const other = reach > 0 ? O_REACH : O_LIGHT;
    const k = reach > 0 ? reach : pose.other;
    const oElbow = mix(O_REST.elbow, other.elbow, k);
    const oHand = mix(O_REST.hand, other.hand, k);
    const so: Pt = [SH_O[0] + lean, SH_O[1]];
    limb(g, so, oElbow, 4, HOOD);
    limb(g, oElbow, oHand, 3, HOOD);
    r(g, Math.round(oHand[0]) - 1, Math.round(oHand[1]) - 1, 3, 3, SKIN);
    if (pose.flame) {
      const f = Math.sin(rt * 0.05) > 0 ? 1 : 0;
      r(g, Math.round(oHand[0]) - 1, Math.round(oHand[1]) - 2, 2, 2, "#8a8f99");
      r(g, Math.round(oHand[0]), Math.round(oHand[1]) - 4 - f, 1, 2 + f, "#ffd27a");
      disc(g, oHand[0], oHand[1] - 4, 5, "rgba(255, 190, 90, 0.18)");
    }
    // the space bar goes down
    if (press !== null && press > PRESS.hit - 60 && press < PRESS.hit + 140) r(g, 149, 99, 16, 1, "#0d0d10");

    // smoke: a thin thread off the coal, and the breath let out
    wisp += dt;
    if (pose.coal > 0 && wisp > 160) {
      wisp = 0;
      puffs.push({ x: jB[0], y: jB[1] - 1, vx: (Math.random() - 0.3) * 0.004, vy: -0.012, r: 0.6, age: 0, life: 1800 });
    }
    if (pose.exhale && Math.random() < dt / 70) puffs.push({ x: MOUTH[0] + 1, y: MOUTH[1], vx: 0.01 + Math.random() * 0.012, vy: -0.004 - Math.random() * 0.008, r: 1.2, age: 0, life: 2600 + Math.random() * 1200 });
    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i];
      p.age += dt;
      if (p.age > p.life) {
        puffs.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt + Math.sin((p.age + i * 97) * 0.003) * 0.02;
      p.y += p.vy * dt;
      p.vy -= 0.000004 * dt;
      p.r += dt * 0.0016;
      const a = 0.32 * (1 - p.age / p.life);
      disc(g, p.x, p.y, p.r, `rgba(214, 212, 222, ${a.toFixed(3)})`);
    }

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(light, 0, 0);
  }

  function drawScreen(rt: number) {
    const { x, y, w, h } = SCR;
    if (on) {
      r(g, x, y, w, h, "#0d0c10");
      return;
    }
    // asleep: dark, a cursor blinking
    r(g, x, y, w, h, "#0c1120");
    r(g, x, y, w, 1, "#121a2e");
    if (Math.floor(Math.max(0, rt) / 530) % 2 === 0) r(g, x + 3, y + 3, 2, 1, "#9fb0d6");
  }

  /** Legs, body, hood: everything but the arms. `glow` lights the chin when the coal's hot. */
  function drawBody(lean: number, glow: number) {
    // legs, knees towards us, and the shoes
    r(g, 89, 106, 24, 8, JEANS);
    r(g, 89, 106, 24, 1, "#33405f");
    r(g, 91, 114, 8, 17, JEANS);
    r(g, 104, 114, 8, 17, JEANS);
    r(g, 97, 114, 1, 17, "#222b42");
    r(g, 110, 114, 1, 17, "#222b42");
    r(g, 89, 131, 11, 4, SHOE);
    r(g, 103, 131, 11, 4, SHOE);
    r(g, 89, 135, 11, 1, "#8c8375");
    r(g, 103, 135, 11, 1, "#8c8375");
    // the seat and the armrests
    r(g, 85, 104, 32, 3, "#1e1d22");
    r(g, 82, 96, 5, 3, "#1e1d22");
    r(g, 84, 99, 2, 6, "#1e1d22");
    r(g, 116, 96, 5, 3, "#1e1d22");
    r(g, 117, 99, 2, 6, "#1e1d22");
    // the hoodie, slouched
    const x = 89 + lean;
    r(g, x + 1, 77, 22, 2, HOOD);
    r(g, x, 79, 24, 28, HOOD);
    r(g, x + 22, 79, 2, 28, HOOD_HI);
    r(g, x + 4, 96, 16, 1, HOOD_LO);
    r(g, x + 4, 96, 1, 8, HOOD_LO);
    r(g, x + 19, 96, 1, 8, HOOD_LO);
    r(g, x, 105, 24, 2, HOOD_LO);
    // the drawstrings
    r(g, x + 9, 79, 1, 8, "#b9b2a6");
    r(g, x + 14, 79, 1, 7, "#b9b2a6");
    // the hood, up
    const hx = 91 + lean;
    r(g, hx + 4, 52, 13, 2, HOOD);
    r(g, hx + 1, 54, 19, 3, HOOD);
    r(g, hx, 57, 21, 21, HOOD);
    r(g, hx + 19, 56, 2, 21, HOOD_HI);
    r(g, hx + 1, 76, 19, 2, HOOD_LO);
    // the face, in the dark of it
    r(g, hx + 5, 59, 11, 16, "#0c0b10");
    r(g, hx + 4, 61, 13, 12, "#0c0b10");
    // the chin, when the coal lights it
    const chin = glow > 0.6 ? "#7a5040" : glow > 0.3 ? "#3a2a26" : "#1c1517";
    r(g, hx + 7, 72, 7, 2, chin);
    r(g, hx + 8, 74, 5, 1, chin);
  }

  return {
    canvas: out,
    update,
    screenOn: () => on,
    setCover: (img) => {
      back = paintBack(img);
    },
  };
}
