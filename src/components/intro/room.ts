// The room behind the lit window, in its own pixels, seen from the back of
// the room: the bedroom from the game at night, a bed, a rug, the tapes,
// the album cover on the wall, the lamp on, the laptop open on the desk.
// In the desk chair, side on to us, leaned right back with his feet up on
// the desk: curly brown hair under on-ear headphones, a white tee, jeans,
// white socks in slides, smoking. The still parts are painted once; each
// frame copies them and draws him, the coal, the smoke and the laptop's
// screen over them.
//
// What he does, in ms of the room's own clock (from when the camera gets
// in): a moment, then the joint lit (lighter up, a flicker, the coal
// catches), then over and over: hand up, a long pull (the coal brightens
// and warms his face), hand down, and the smoke let out slowly. When the
// visitor presses a key he stops, takes his feet down, sits up and leans
// over to press the laptop's space bar (PRESS times, from the key).

/** Everything below is drawn this far down the canvas, so a tall phone screen has wall above it. */
const OY = 70;
export const RW = 290;
export const RH = 180 + OY + 50;
const FLOOR_AT = 136;
/** The floor line, for filling past the edges. */
export const FLOOR_Y = FLOOR_AT + OY;
export const WALL = "#26252f";
export const FLOOR = "#2f241c";
/** The laptop's screen (as drawn, and on the canvas). */
const SCR = { x: 150, y: 78, w: 28, h: 18 };
export const SCREEN = { ...SCR, y: SCR.y + OY };
/** What the camera keeps in view: the whole room (a narrower slice of it on a phone held upright). */
export const FOCUS = { x: 142, y: 94 + OY, w: 250, h: 150 };
export const FOCUS_TALL = { x: 145, y: 100 + OY, w: 150, h: 120 };
/** The part of the room seen through the glass from outside (canvas px, the window's shape). */
export const PEEK = { x: 82, y: 22 + OY, w: 120, h: 160 };

/** The joint lit (from the room's clock). */
const LIGHT = { start: 300, flame: [600, 1450] as const, end: 1750 };
/** One draw on it, then the smoke let out. */
const CYCLE = 6200;
const C = { up: [1300, 1800], pull: [1800, 2900], down: [2900, 3400], exhale: [3600, 4700] } as const;
/** The key press: he stops (the joint down), feet off the desk and sits up, the space bar, back. */
export const PRESS = { settle: 450, reach: [600, 1150], hit: 1200, back: [1350, 1750] } as const;
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
const hash = (a: number, b: number) => {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** A thick pixel line (a limb, a joint). */
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

  // the bed, along the left wall
  r(g, 6, 110, 74, 4, "#3a281d");
  r(g, 8, 114, 3, 22, "#2f2017");
  r(g, 75, 114, 3, 22, "#2f2017");
  r(g, 6, 92, 5, 22, "#3a281d");
  r(g, 11, 101, 66, 9, "#c9c4ba");
  r(g, 13, 98, 16, 6, "#e3ded4");
  r(g, 26, 99, 52, 11, "#3e4a3c");
  r(g, 26, 99, 52, 1, "#4d5c4a");
  for (let x = 30; x < 76; x += 7) r(g, x, 103, 3, 1, "#35402f");
  // the tapes on a shelf over it
  r(g, 20, 60, 44, 2, "#4d3526");
  ["#a3321f", "#3d5a8a", "#e4b95a", "#cfc8b9", "#2f6b3a", "#6b6357", "#8e3a2b", "#3d5a8a", "#cfc8b9"].forEach((col, i) => r(g, 22 + i * 4, 52, 3, 8, col));
  // a rug under the chair
  r(g, 84, 140, 74, 6, "#4a2a2c");
  r(g, 86, 141, 70, 1, "#5a3436");
  r(g, 86, 144, 70, 1, "#3a2022");

  // the poster: the album cover
  r(g, 156, 30, 28, 28, "#16151c");
  if (cover) {
    g.imageSmoothingEnabled = true;
    g.drawImage(cover, 158, 32, 24, 24);
  } else r(g, 158, 32, 24, 24, "#3a3550");

  // the desk, against the far wall
  r(g, 124, 100, 112, 4, "#4d3526");
  r(g, 124, 104, 112, 5, "#2f2017");
  r(g, 126, 109, 3, FLOOR_AT - 109, "#2f2017");
  r(g, 206, 109, 28, FLOOR_AT - 109, "#3a281d");
  r(g, 206, 109, 28, 1, "#2b1e17");
  r(g, 208, 120, 24, 1, "#2b1e17");
  r(g, 218, 114, 4, 1, "#7a5a3a");
  r(g, 218, 126, 4, 1, "#7a5a3a");
  // the laptop, turned to the room: lid, keyboard, the space bar
  r(g, SCR.x - 2, SCR.y - 2, SCR.w + 4, SCR.h + 4, "#16171b");
  r(g, SCR.x - 4, 96, SCR.w + 8, 1, "#2a2c31");
  r(g, SCR.x - 5, 97, SCR.w + 10, 3, "#22242a");
  for (let x = SCR.x - 3; x < SCR.x + SCR.w + 3; x += 3) r(g, x, 97, 2, 1, "#3a3d45");
  r(g, 157, 99, 14, 1, "#4a4d56");
  // a mug, a speaker, the lamp
  r(g, 190, 94, 5, 6, "#8e3a2b");
  r(g, 195, 96, 1, 2, "#8e3a2b");
  r(g, 198, 86, 8, 14, "#141417");
  r(g, 200, 91, 4, 4, "#26262b");
  r(g, 216, 97, 10, 3, "#1c1a1e");
  r(g, 220, 80, 1, 17, "#1c1a1e");
  r(g, 212, 80, 9, 1, "#1c1a1e");
  r(g, 208, 76, 10, 5, "#c9a96a");
  r(g, 209, 81, 8, 1, "#fff2c9");
  return c;
}

/** The lamp's warmth, and the dark gathering in the corners. */
function paintLight() {
  const c = canvas(RW, RH);
  const g = c.getContext("2d")!;
  g.translate(0, OY);
  const warm = g.createRadialGradient(212, 84, 2, 212, 84, 150);
  warm.addColorStop(0, "rgba(255, 210, 140, 0.30)");
  warm.addColorStop(0.4, "rgba(255, 190, 110, 0.10)");
  warm.addColorStop(1, "rgba(255, 190, 110, 0)");
  g.fillStyle = warm;
  g.fillRect(0, -OY, RW, RH);
  const dark = g.createRadialGradient(150, 96, 50, 150, 96, 200);
  dark.addColorStop(0, "rgba(8, 8, 14, 0)");
  dark.addColorStop(1, "rgba(8, 8, 14, 0.6)");
  g.fillStyle = dark;
  g.fillRect(0, -OY, RW, RH);
  return c;
}

// ------------------------------------------------------------ him

const SKIN = "#d8a47c";
const SKIN_LO = "#b98661";
const HAIR = "#5a3a22";
const HAIR_HI = "#7a5233";
const HAIR_LO = "#3e2716";
const TEE = "#e9e6df";
const TEE_LO = "#c4bfb4";
const JEANS = "#3b5f94";
const JEANS_LO = "#2c4a76";
const SOCK = "#f1eee8";
const SLIDE = "#141418";
const PHONES = "#1c1c22";
const PAPER = "#e8e2d6";

/** Where his joints are, side on, facing the desk (right). */
interface Body {
  hip: Pt;
  shoulder: Pt;
  head: Pt;
  knee: Pt;
  ankle: Pt;
  /** Which way the foot points from the ankle (toes). */
  toe: Pt;
}
/** Leaned right back, feet up on the desk. */
const BACK: Body = { hip: [104, 116], shoulder: [94, 95], head: [89, 83], knee: [117, 106], ankle: [130, 99], toe: [133, 91] };
/** Sat up, leaning over to the laptop, feet on the floor. */
const UP: Body = { hip: [107, 117], shoulder: [118, 95], head: [124, 83], knee: [123, 113], ankle: [121, 134], toe: [128, 135] };
const mixBody = (a: Body, b: Body, k: number): Body => ({
  hip: mix(a.hip, b.hip, k),
  shoulder: mix(a.shoulder, b.shoulder, k),
  head: mix(a.head, b.head, k),
  knee: mix(a.knee, b.knee, k),
  ankle: mix(a.ankle, b.ankle, k),
  toe: mix(a.toe, b.toe, k),
});

interface Pose {
  /** 0 = joint hand on his thigh, 1 = at his mouth. */
  up: number;
  /** The lighter held up to it. */
  lighter: boolean;
  /** How hot the coal is (0 = not lit). */
  coal: number;
  flame: boolean;
  /** Breathing smoke out. */
  exhale: boolean;
}

/** What he's doing at room time `rt`. */
function poseAt(rt: number): Pose {
  if (rt < LIGHT.end) {
    const up = ease(LIGHT.start, LIGHT.start + 350, rt) * (1 - ease(LIGHT.end - 350, LIGHT.end, rt));
    return { up, lighter: up > 0.6, coal: rt > 1150 ? 0.9 : 0, flame: rt > LIGHT.flame[0] && rt < LIGHT.flame[1], exhale: false };
  }
  const u = (rt - LIGHT.end) % CYCLE;
  const up = ease(C.up[0], C.up[1], u) * (1 - ease(C.down[0], C.down[1], u));
  const pull = u > C.pull[0] && u < C.pull[1] ? 0.5 + 0.5 * ease(C.pull[0], C.pull[0] + 500, u) : 0;
  return {
    up,
    lighter: false,
    coal: Math.max(0.45, pull),
    flame: false,
    exhale: (u > C.exhale[0] && u < C.exhale[1]) || (rt > LIGHT.end && rt < LIGHT.end + 900),
  };
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
  /** Draw room time `rt` (< 0: before he's lit up); `press`: ms since the key, or null. */
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
    let pose: Pose = rt < 0 ? { up: 0, lighter: false, coal: 0, flame: false, exhale: false } : poseAt(rt);
    let sit = 0;
    let reach = 0;
    if (press !== null) {
      // he stops, takes his feet down, sits up and leans over to press space
      frozen ??= pose;
      const settle = ease(0, PRESS.settle, press);
      pose = { ...frozen, up: frozen.up * (1 - settle), lighter: false, flame: false, exhale: false, coal: Math.max(0.45, frozen.coal * (1 - settle)) };
      sit = ease(PRESS.settle - 150, PRESS.reach[1], press);
      reach = ease(PRESS.reach[0] + 200, PRESS.reach[1], press) * (1 - ease(PRESS.back[0], PRESS.back[1], press));
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

    const b = mixBody(BACK, UP, sit);
    drawChair(sit);
    drawLegs(b);
    drawTorso(b);
    drawHead(b, pose.coal);

    // his near arm: the joint, to his mouth and down again; or over to the space bar
    const mouth: Pt = [b.head[0] + 6, b.head[1] + 3];
    const restHand: Pt = [b.hip[0] + 9, b.hip[1] - 8];
    const restElbow: Pt = [b.hip[0] + 0, b.hip[1] - 9];
    const upHand: Pt = [mouth[0] + 1, mouth[1] + 2];
    const upElbow: Pt = [b.shoulder[0] + 7, b.shoulder[1] + 6];
    let hand = mix(restHand, upHand, pose.up);
    let elbow = mix(restElbow, upElbow, pose.up);
    if (reach > 0) {
      hand = mix(hand, [163, 98], reach);
      elbow = mix(elbow, [141, 99], reach);
    }
    const sleeve = mix(b.shoulder, elbow, 0.45);
    limb(g, b.shoulder, sleeve, 5, TEE);
    limb(g, sleeve, elbow, 3, SKIN);
    limb(g, elbow, hand, 3, SKIN);
    r(g, Math.round(hand[0]) - 1, Math.round(hand[1]) - 1, 3, 3, SKIN_LO);

    // the joint, between his fingers: the lit end out in front
    const jA = mix([hand[0] + 1, hand[1] - 1], mouth, pose.up);
    const jB = mix([hand[0] + 5, hand[1] - 3], [mouth[0] + 6, mouth[1] - 1], pose.up);
    if (reach < 0.5 && (rt >= LIGHT.start || press !== null)) {
      limb(g, jA, jB, 1, PAPER);
      if (pose.coal > 0) {
        const hot = pose.coal;
        disc(g, jB[0], jB[1], 1 + hot * 2, `rgba(255, 140, 60, ${(0.04 + hot * 0.16).toFixed(3)})`);
        r(g, Math.round(jB[0]), Math.round(jB[1]), 1, 1, hot > 0.7 ? "#ffd27a" : "#ff7a2a");
      }
    }
    // the lighter, in his other hand, held up under the end of it
    if (pose.lighter) {
      const lx = Math.round(jB[0]) - 1;
      const ly = Math.round(jB[1]) + 2;
      r(g, lx, ly, 3, 3, SKIN_LO);
      r(g, lx + 1, ly - 1, 2, 1, "#8a8f99");
      if (pose.flame) {
        const f = Math.sin(rt * 0.05) > 0 ? 1 : 0;
        r(g, lx + 1, ly - 3 - f, 1, 2 + f, "#ffd27a");
        disc(g, lx + 1, ly - 3, 5, "rgba(255, 190, 90, 0.18)");
      }
    }
    // the space bar goes down
    if (press !== null && press > PRESS.hit - 60 && press < PRESS.hit + 140) r(g, 157, 99, 14, 1, "#0d0d10");

    // smoke: a thin thread off the coal, and the breath let out
    wisp += dt;
    if (pose.coal > 0 && reach < 0.5 && wisp > 160) {
      wisp = 0;
      puffs.push({ x: jB[0], y: jB[1] - 1, vx: (Math.random() - 0.3) * 0.004, vy: -0.012, r: 0.6, age: 0, life: 1800 });
    }
    if (pose.exhale && Math.random() < dt / 70)
      puffs.push({ x: mouth[0] + 1, y: mouth[1], vx: 0.012 + Math.random() * 0.012, vy: -0.006 - Math.random() * 0.008, r: 1.2, age: 0, life: 2600 + Math.random() * 1200 });
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

  /** The desk chair, side on: tipped back under him, upright once he sits up. */
  function drawChair(sit: number) {
    const top = mix([86, 86], [98, 86], sit);
    limb(g, [100, 118], top, 4, "#18171c");
    r(g, 96, 117, 28, 4, "#1e1d22");
    r(g, 108, 121, 3, 16, "#141317");
    r(g, 96, 137, 28, 2, "#141317");
    for (const x of [96, 108, 121]) r(g, x, 139, 3, 2, "#0d0c10");
    // the armrest
    r(g, 104, 108, 12, 2, "#1e1d22");
    r(g, 112, 110, 2, 7, "#1e1d22");
  }

  function drawLegs(b: Body) {
    // the far leg a shade darker, just behind the near one
    limb(g, [b.hip[0] - 1, b.hip[1] - 1], [b.knee[0] - 1, b.knee[1] - 1], 6, JEANS_LO);
    limb(g, [b.knee[0] - 1, b.knee[1] - 1], [b.ankle[0] - 1, b.ankle[1] - 1], 5, JEANS_LO);
    limb(g, b.hip, b.knee, 7, JEANS);
    limb(g, b.knee, b.ankle, 5, JEANS);
    // white socks, slides: black, three white stripes across the strap
    const [ax, ay] = b.ankle;
    limb(g, [ax, ay], b.toe, 4, SOCK);
    const sx = (ax + b.toe[0]) / 2;
    const sy = (ay + b.toe[1]) / 2;
    limb(g, [sx - 1, sy], [sx + 2, sy], 3, SLIDE);
    for (let i = 0; i < 3; i++) r(g, Math.round(sx - 1 + i), Math.round(sy) - 1, 1, 1, "#f1eee8");
    // the sole, under the heel and along the foot
    const dx = b.toe[0] - ax;
    const dy = b.toe[1] - ay;
    const n = Math.hypot(dx, dy) || 1;
    const nx = dy / n;
    const ny = -dx / n;
    limb(g, [ax - nx * 2.5, ay - ny * 2.5], [b.toe[0] - nx * 2.5, b.toe[1] - ny * 2.5], 1, SLIDE);
  }

  function drawTorso(b: Body) {
    limb(g, b.hip, b.shoulder, 9, TEE);
    // the shadow down his back
    const off: Pt = [-3, 1];
    limb(g, [b.hip[0] + off[0], b.hip[1] + off[1]], [b.shoulder[0] + off[0], b.shoulder[1] + off[1]], 3, TEE_LO);
    // his neck
    limb(g, b.shoulder, [b.head[0] + 1, b.head[1] + 5], 3, SKIN_LO);
  }

  /** His head, side on, facing right: curls, the headphones, his face warmed by the coal. */
  function drawHead(b: Body, glow: number) {
    const cx = Math.round(b.head[0]);
    const cy = Math.round(b.head[1]);
    // the face
    r(g, cx - 1, cy - 2, 7, 9, SKIN);
    r(g, cx + 6, cy, 1, 2, SKIN); // nose
    r(g, cx + 3, cy - 1, 1, 1, "#2a1c16"); // eye, half shut
    r(g, cx + 4, cy + 4, 2, 1, "#9a6a4c"); // mouth
    r(g, cx - 1, cy + 4, 4, 3, SKIN_LO); // jaw in shadow
    // the curls: a rounded mop over the top and down the back, a fringe in front
    const rows: [number, number, number][] = [
      // [dy, from dx, to dx]
      [-8, -4, 2],
      [-7, -6, 4],
      [-6, -7, 5],
      [-5, -7, 5],
      [-4, -7, 5],
      [-3, -7, 4],
      [-2, -7, -1],
      [-1, -7, -1],
      [0, -7, -1],
      [1, -7, -1],
      [2, -7, -1],
      [3, -6, -1],
      [4, -5, -2],
    ];
    for (const [dy, a, z] of rows) r(g, cx + a, cy + dy, z - a + 1, 1, HAIR);
    for (let i = 0; i < 18; i++) {
      const [dy, a, z] = rows[Math.floor(hash(i, 3) * rows.length)];
      const x = cx + a + Math.floor(hash(i, 7) * (z - a + 1));
      r(g, x, cy + dy, 1, 1, hash(i, 9) > 0.45 ? HAIR_HI : HAIR_LO);
    }
    // curls sticking up off the top
    for (const dx of [-5, -2, 1, 4]) r(g, cx + dx, cy - 8 - (dx % 2 === 0 ? 1 : 0), 1, 1, HAIR);
    // the headphones: the band over the top, a cup on the ear
    r(g, cx - 3, cy - 9, 6, 1, PHONES);
    r(g, cx - 4, cy - 8, 1, 6, PHONES);
    r(g, cx - 4, cy - 2, 5, 6, PHONES);
    r(g, cx - 3, cy - 1, 3, 4, "#33333c");
    r(g, cx + 1, cy - 1, 1, 4, "#3a3a44");
    // the coal lights his face on the pull
    if (glow > 0.6) disc(g, cx + 5, cy + 3, 4, "rgba(255, 150, 80, 0.16)");
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
