// The intro's picture: the block at night, in the game's pixels. One tall
// strip (the sky, the skyline, your building and the street) is painted
// once at its own small size; each frame copies the part the camera sees,
// scaled up without smoothing, and adds the few things that move: windows
// across the way going on and off, one car, and the lit window. The camera
// goes down the building and in through that window, and then it's in the
// room (room.ts), where it stays until a key: then into the laptop's
// screen, which opens onto the real desktop underneath.
// Times are in ms from when the intro opens; the press, in ms from the key.

import { ALBUM } from "@/data/tracks";
import { createRoom, FLOOR, FLOOR_Y, FOCUS, FOCUS_TALL, PEEK, PRESS, RH, RW, SCREEN, WALL } from "./room";

export const T = {
  /** The camera starts down the building. */
  descend: 700,
  /** It settles by the lit window and goes in. */
  window: 2500,
  /** In the room. */
  room: 3700,
} as const;
/** After the key: the camera goes into the screen, which opens onto the desktop. */
export const ZOOM = { start: 1450, open: 2500, end: 3050 } as const;
export { PRESS, READY_AT } from "./room";

/** The dissolve from outside the glass to inside the room. */
const IN = 420;

/** The strip, in its own pixels. */
const SW = 560;
const SH = 430;
/** Your building and the lit window (strip px). */
const BX = 220;
const BW = 120;
const ROOF = 168;
const STOREY = 44;
const WIN = { x: 271, y: 222, w: 18, h: 24 };
const STREET = 360;
const ROAD = 372;
/** Where the camera stops on the way down (strip px). */
const STOP_Y = 262;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, v: number) => {
  const k = clamp((v - a) / (b - a));
  return k * k * (3 - 2 * k);
};
const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

function hash(a: number, b: number) {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

type G = CanvasRenderingContext2D;
const r = (g: G, x: number, y: number, w: number, h: number, c: string) => {
  g.fillStyle = c;
  g.fillRect(x, y, w, h);
};

// ------------------------------------------------------------ the strip

/** Windows across the way that can go on and off: [x, y, w, h, colour]. */
type Spot = [number, number, number, number];

function paintBrick(g: G, x: number, y: number, w: number, h: number, base: string, line: string, seed: number) {
  r(g, x, y, w, h, base);
  for (let yy = y + 3; yy < y + h; yy += 4) r(g, x, yy, w, 1, line);
  for (let yy = y; yy < y + h; yy += 4) {
    const off = ((yy - y) / 4) % 2 ? 4 : 0;
    for (let xx = x + off; xx < x + w; xx += 8) if (hash(xx + seed, yy) > 0.35) r(g, xx, yy, 1, 3, line);
  }
}

function paintStrip(spots: Spot[]) {
  const c = canvas(SW, SH);
  const g = c.getContext("2d")!;

  // sky (the roof's colours, from the game)
  const sky = g.createLinearGradient(0, 0, 0, 230);
  sky.addColorStop(0, "#070b1c");
  sky.addColorStop(1, "#1c2442");
  g.fillStyle = sky;
  g.fillRect(0, 0, SW, SH);
  for (let i = 0; i < 70; i++) r(g, Math.floor(hash(i, 3) * SW), Math.floor(hash(i, 7) * 150), 1, 1, hash(i, 9) > 0.65 ? "#c9d2ef" : "#4d5884");
  // the moon
  r(g, 372, 34, 9, 9, "#dfe5f5");
  r(g, 371, 36, 11, 5, "#dfe5f5");
  r(g, 374, 33, 5, 11, "#dfe5f5");
  r(g, 376, 37, 2, 2, "#c3cbe2");

  // the skyline, far off
  let x = 0;
  let i = 0;
  while (x < SW) {
    const bw = 12 + Math.floor(hash(i, 1) * 26);
    const top = 120 + Math.floor(hash(i, 2) * 60);
    r(g, x, top, bw, SH - top, i % 2 ? "#0e1226" : "#11162c");
    for (let wy = top + 4; wy < 230; wy += 6)
      for (let wx = x + 3; wx < x + bw - 3; wx += 5) {
        const h = hash(wx, wy);
        if (h > 0.86) r(g, wx, wy, 2, 2, "#c9a35f");
        else if (h > 0.8) spots.push([wx, wy, 2, 2]);
      }
    x += bw + 1;
    i++;
  }

  // the neighbours: taller on the left, lower on the right
  const neighbour = (x0: number, w: number, top: number, base: string, line: string, seed: number) => {
    paintBrick(g, x0, top, w, STREET - top, base, line, seed);
    r(g, x0, top - 3, w, 3, "#1b1620");
    for (let fy = top + 12; fy < STREET - 40; fy += STOREY)
      for (let wx = x0 + 9; wx < x0 + w - 16; wx += 26) {
        r(g, wx - 1, fy - 1, 16, 22, "#1a1419");
        r(g, wx, fy, 14, 20, "#0c0f19");
        r(g, wx, fy, 14, 1, "#151b2c");
        const h = hash(wx + seed, fy);
        if (h > 0.84) {
          r(g, wx, fy, 14, 20, "#6b5232");
          r(g, wx + 1, fy + 1, 12, 18, "#8a6a3c");
        } else if (h > 0.62) spots.push([wx, fy, 14, 20]);
        r(g, wx - 2, fy + 20, 18, 2, "#3a3140");
      }
  };
  neighbour(96, BX - 96 - 1, 132, "#2c2129", "#251b23", 11);
  neighbour(BX + BW + 1, 120, 196, "#26242e", "#201e27", 29);
  neighbour(0, 95, 176, "#231d27", "#1d1820", 47);
  neighbour(BX + BW + 122, SW - (BX + BW + 122), 150, "#2a2129", "#231b22", 63);

  // your building
  paintBrick(g, BX, ROOF, BW, STREET - ROOF, "#3d2a2b", "#332325", 5);
  // cornice and a water tank on the roof
  r(g, BX - 3, ROOF - 5, BW + 6, 5, "#4a3a3e");
  r(g, BX - 3, ROOF - 1, BW + 6, 1, "#2a1f22");
  r(g, BX + 82, ROOF - 27, 20, 20, "#2a2224");
  r(g, BX + 80, ROOF - 30, 24, 4, "#3a3033");
  r(g, BX + 84, ROOF - 8, 2, 4, "#1d1719");
  r(g, BX + 98, ROOF - 8, 2, 4, "#1d1719");
  for (let k = 0; k < 4; k++) r(g, BX + 82, ROOF - 23 + k * 5, 20, 1, "#221b1d");

  // three floors of windows (the middle one, in the middle, is lit)
  const cols = [236, 271, 306];
  for (let f = 0; f < 3; f++) {
    const wy = ROOF + 10 + f * STOREY;
    for (const wx of cols) {
      r(g, wx - 2, wy - 3, 22, 3, "#4a3a3e"); // lintel
      r(g, wx - 1, wy - 1, 20, 26, "#1e1518");
      if (wx === WIN.x && wy === WIN.y) continue; // the lit one is drawn live
      r(g, wx, wy, 18, 24, "#0c0f1a");
      r(g, wx, wy, 18, 9, "#101528");
      r(g, wx + 2, wy + 2, 1, 5, "#1e2640");
      r(g, wx, wy + 9, 18, 1, "#2a2026");
      if (hash(wx, wy) > 0.55) spots.push([wx, wy + 10, 18, 14]);
      r(g, wx - 2, wy + 24, 22, 2, "#4a4150"); // sill
    }
  }
  r(g, WIN.x - 2, WIN.y + 24, 22, 2, "#4a4150");

  // the fire escape, in front of the right-hand windows
  const fx = 300;
  for (let f = 0; f < 3; f++) {
    const py = ROOF + 36 + f * STOREY;
    r(g, fx, py, 32, 2, "#17141a");
    r(g, fx, py - 9, 32, 1, "#17141a");
    for (let k = 0; k <= 32; k += 4) r(g, fx + k, py - 9, 1, 9, "#17141a");
    if (f < 2) for (let k = 0; k < 34; k++) r(g, fx + 4 + Math.floor((k * 22) / 34), py + 2 + k, 2, 1, "#17141a");
  }
  // up to the roof
  r(g, fx + 28, ROOF - 6, 1, 42, "#17141a");
  r(g, fx + 32, ROOF - 6, 1, 42, "#17141a");
  for (let k = ROOF - 4; k < ROOF + 36; k += 4) r(g, fx + 28, k, 5, 1, "#17141a");

  // the ground floor: the door, a light over it, shutters
  const gy = ROOF + 3 * STOREY + 8;
  r(g, BX, gy - 4, BW, 3, "#4a3a3e");
  r(g, 270, gy + 10, 20, STREET - gy - 10, "#1d140f");
  r(g, 272, gy + 12, 16, STREET - gy - 12, "#4a3325");
  r(g, 273, gy + 13, 6, 10, "#2c1f17");
  r(g, 281, gy + 13, 6, 10, "#2c1f17");
  r(g, 285, gy + 28, 2, 2, "#c9a96a");
  r(g, 277, gy + 4, 6, 3, "#c9a96a");
  for (const sx of [230, 300]) {
    r(g, sx, gy + 12, 30, 34, "#2a2a30");
    for (let k = gy + 14; k < gy + 46; k += 3) r(g, sx, k, 30, 1, "#222228");
  }
  r(g, BX + 2, STREET - 6, BW - 4, 6, "#2a2124");

  // pavement, kerb, road
  r(g, 0, STREET, SW, ROAD - STREET, "#2a2b33");
  for (let k = 8; k < SW; k += 24) r(g, k, STREET, 1, ROAD - STREET, "#23242b");
  r(g, 0, ROAD - 2, SW, 2, "#3a3b45");
  r(g, 0, ROAD, SW, SH - ROAD, "#16171f");
  for (let k = 10; k < SW; k += 40) r(g, k, ROAD + 22, 18, 2, "#4a4a3e");
  // puddles
  for (const [px, pw] of [[140, 26], [330, 18], [452, 30]]) {
    r(g, px, ROAD + 9, pw, 3, "#202538");
    r(g, px + 4, ROAD + 9, pw / 2, 1, "#2e3654");
  }

  // the streetlamp, on the pavement to the left
  const lx = 204;
  r(g, lx, 288, 2, STREET - 288 + 4, "#121216");
  r(g, lx - 2, STREET - 4, 6, 4, "#121216");
  r(g, lx, 288, 14, 2, "#121216");
  r(g, lx + 10, 290, 8, 3, "#121216");
  r(g, lx + 11, 293, 6, 1, "#f2d79a");
  // its pool of light on the pavement and the wall
  const pool = g.createRadialGradient(lx + 14, 296, 1, lx + 14, 330, 60);
  pool.addColorStop(0, "rgba(242, 200, 130, 0.28)");
  pool.addColorStop(1, "rgba(242, 200, 130, 0)");
  g.fillStyle = pool;
  g.fillRect(lx - 60, 290, 150, ROAD - 290 + 10);

  return c;
}

// ------------------------------------------------------------ the camera

export interface Scene {
  /** Draw intro time `t`; `press`: ms since the key, or null. */
  frame: (t: number, now: number, dt: number, press: number | null) => void;
  /** The still picture (reduced motion): the room, and the screen once a key's been pressed. */
  still: (pressed: boolean) => void;
  resize: () => void;
  destroy: () => void;
}

/** `onChange`: something drawn once has changed (the cover came in), for a still picture to redraw. */
export function createScene(el: HTMLCanvasElement, onChange?: () => void): Scene {
  const g = el.getContext("2d")!;
  const spots: Spot[] = [];
  const strip = paintStrip(spots);
  const room = createRoom();
  let alive = true;
  const cover = new Image();
  cover.decoding = "async";
  cover.onload = () => {
    if (!alive) return;
    room.setCover(cover);
    onChange?.();
  };
  // it hangs on the wall 24 room pixels square: a small copy from the image
  // optimiser (under 1 KB), not the 1200px original
  cover.src = `/_next/image?url=${encodeURIComponent(ALBUM.cover)}&w=64&q=90`;
  const face = getComputedStyle(document.documentElement).getPropertyValue("--nf-ui").trim() || "sans-serif";

  let W = 1;
  let H = 1;
  let dpr = 1;
  /** Outside: whole screen px per strip px. */
  let z0 = 4;
  /** Inside: whole device px per room px. */
  let zr = 4;
  let focus: typeof FOCUS = FOCUS;

  const resize = () => {
    const box = el.getBoundingClientRect();
    W = Math.max(1, box.width || window.innerWidth);
    H = Math.max(1, box.height || window.innerHeight);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    el.width = Math.round(W * dpr);
    el.height = Math.round(H * dpr);
    // the sky to the street on a phone, a floor or two less on a wide screen
    z0 = Math.max(2, Math.round(Math.min(H / 190, W / 136)));
    focus = H > W * 1.2 ? FOCUS_TALL : FOCUS;
    zr = Math.max(1, Math.floor(Math.min(el.width / focus.w, el.height / focus.h)));
  };
  resize();

  /** Outside: down the building, then in at the lit window (strip px, screen px per px). */
  function outside(t: number) {
    const vh = H / z0;
    const top = Math.min(vh / 2, SH - vh / 2);
    const stop = Math.min(STOP_Y, SH - vh / 2);
    if (t < T.window) {
      const k = easeInOut(clamp((t - T.descend) / (T.window - T.descend)));
      return { x: SW / 2, y: top + (stop - top) * k, z: z0 };
    }
    // the zoom eases in log space, and the centre moves so the push looks straight on
    const cx = WIN.x + WIN.w / 2;
    const cy = WIN.y + WIN.h / 2;
    const z1 = Math.max(W / WIN.w, H / WIN.h) * 1.3;
    const k = easeInOut(clamp((t - T.window) / (T.room - T.window)));
    const z = z0 * Math.pow(z1 / z0, k);
    const w = (1 / z0 - 1 / z) / (1 / z0 - 1 / z1);
    return { x: SW / 2 + (cx - SW / 2) * w, y: stop + (cy - stop) * w, z };
  }

  function drawOutside(t: number, now: number, moving: boolean) {
    const cam = outside(t);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.imageSmoothingEnabled = false;
    r(g, 0, 0, el.width, el.height, "#070b1c");
    const s = cam.z * dpr;
    const ox = (W / 2 - cam.x * cam.z) * dpr;
    const oy = (H / 2 - cam.y * cam.z) * dpr;
    // whole device pixels while it rests, so the pixels stay even
    const snap = t < T.window ? Math.round : (v: number) => v;
    g.setTransform(s, 0, 0, s, snap(ox), snap(oy));
    g.drawImage(strip, 0, 0);

    // windows across the way, going on and off now and then
    if (moving)
      for (let i = 0; i < spots.length; i++) {
        const [x, y, w, h] = spots[i];
        const period = 5000 + hash(i, 5) * 9000;
        const phase = (now + hash(i, 6) * period) % period;
        if (phase < period * 0.22) {
          r(g, x, y, w, h, w > 4 ? "#6b5232" : "#c9a35f");
          if (w > 4) r(g, x + 1, y + 1, w - 2, h - 2, "#8a6a3c");
        }
      }

    // the lit window: the room through it, then the glass and the sash
    g.imageSmoothingEnabled = cam.z < PEEK.w / WIN.w;
    g.drawImage(room.canvas, PEEK.x, PEEK.y, PEEK.w, PEEK.h, WIN.x, WIN.y, WIN.w, WIN.h);
    g.imageSmoothingEnabled = false;
    const sg = g.createLinearGradient(WIN.x, WIN.y, WIN.x + WIN.w, WIN.y + WIN.h);
    sg.addColorStop(0, "rgba(255, 236, 200, 0.07)");
    sg.addColorStop(1, "rgba(255, 236, 200, 0)");
    g.fillStyle = sg;
    g.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
    r(g, WIN.x, WIN.y, WIN.w, 1.5, "#d9c49a"); // the blind, pulled up
    r(g, WIN.x, WIN.y + 8.5, WIN.w, 1, "#2a2026"); // the sash

    // the glow the window throws out onto the bricks
    const glow = g.createRadialGradient(WIN.x + WIN.w / 2, WIN.y + WIN.h / 2, 4, WIN.x + WIN.w / 2, WIN.y + WIN.h / 2, 34);
    glow.addColorStop(0, "rgba(255, 196, 120, 0.16)");
    glow.addColorStop(1, "rgba(255, 196, 120, 0)");
    g.fillStyle = glow;
    g.fillRect(WIN.x - 34, WIN.y - 34, WIN.w + 68, WIN.h + 68);

    if (moving) drawCar(t);
  }

  /** Inside: the room, held still; after the key, on into the screen. `zoom`: ms since the key, or null. */
  function drawRoom(zoom: number | null, alpha: number) {
    const Wd = el.width;
    const Hd = el.height;
    let cx = focus.x;
    let cy = focus.y;
    let z = zr;
    let exact = true;
    if (zoom !== null && zoom > ZOOM.start) {
      const sx = SCREEN.x + SCREEN.w / 2;
      const sy = SCREEN.y + SCREEN.h / 2;
      const z1 = Math.max(Wd / SCREEN.w, Hd / SCREEN.h) * 1.04;
      const k = easeInOut(clamp((zoom - ZOOM.start) / (ZOOM.end - ZOOM.start)));
      z = zr * Math.pow(z1 / zr, k);
      const w = (1 / zr - 1 / z) / (1 / zr - 1 / z1);
      cx += (sx - cx) * w;
      cy += (sy - cy) * w;
      exact = false;
    }
    const round = exact ? Math.round : (v: number) => v;
    const ox = round(Wd / 2 - cx * z);
    const oy = round(Hd / 2 - cy * z);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = alpha;
    // past the room's edges: more wall, more floor, in the dark
    const floor = Math.max(0, Math.min(Hd, oy + FLOOR_Y * z));
    r(g, 0, 0, Wd, floor, WALL);
    r(g, 0, floor, Wd, Hd - floor, FLOOR);
    g.imageSmoothingEnabled = false;
    g.drawImage(room.canvas, ox, oy, RW * z, RH * z);
    const edge = g.createRadialGradient(Wd / 2, Hd / 2, Math.min(Wd, Hd) * 0.35, Wd / 2, Hd / 2, Math.max(Wd, Hd) * 0.75);
    edge.addColorStop(0, "rgba(8, 8, 14, 0)");
    edge.addColorStop(1, "rgba(8, 8, 14, 0.7)");
    g.fillStyle = edge;
    g.fillRect(0, 0, Wd, Hd);

    // the screen: "saeculo", once the space bar's down
    const sx = ox + SCREEN.x * z;
    const sy = oy + SCREEN.y * z;
    const sw = SCREEN.w * z;
    const sh = SCREEN.h * z;
    if (room.screenOn() && zoom !== null) {
      const shown = clamp((zoom - PRESS.hit) / 380);
      g.save();
      g.globalAlpha = alpha * shown;
      g.fillStyle = "#ece6dc";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = `300 ${Math.max(4, sw * 0.12)}px ${face}`;
      try {
        g.letterSpacing = `${(sw * 0.12 * 0.32).toFixed(1)}px`;
      } catch {
        // older browsers: no tracking
      }
      g.shadowColor = "rgba(236, 230, 220, 0.45)";
      g.shadowBlur = sw * 0.04;
      g.fillText("saeculo", sx + sw / 2 + sw * 0.02, sy + sh / 2);
      g.restore();
    }

    // and opens onto the desktop underneath
    if (zoom !== null) {
      const open = smooth(ZOOM.open, ZOOM.end - 80, zoom);
      if (open > 0) {
        g.globalCompositeOperation = "destination-out";
        g.globalAlpha = open;
        g.fillRect(sx, sy, sw, sh);
        g.globalCompositeOperation = "source-over";
      }
    }
    g.globalAlpha = 1;
  }

  /** One car, left to right, its headlights across the ground floor. */
  function drawCar(t: number) {
    const k = (t - 1000) / 1800;
    if (k < 0 || k > 1) return;
    const x = -60 + k * (SW + 120);
    const y = ROAD + 8;
    // the beam on the road, and its light swinging across the wall
    const beam = g.createLinearGradient(x + 36, 0, x + 110, 0);
    beam.addColorStop(0, "rgba(255, 244, 214, 0.32)");
    beam.addColorStop(1, "rgba(255, 244, 214, 0)");
    g.fillStyle = beam;
    g.beginPath();
    g.moveTo(x + 36, y + 4);
    g.lineTo(x + 110, y - 4);
    g.lineTo(x + 110, y + 16);
    g.closePath();
    g.fill();
    const wall = g.createRadialGradient(x + 80, STREET - 24, 2, x + 80, STREET - 24, 40);
    wall.addColorStop(0, "rgba(255, 244, 214, 0.14)");
    wall.addColorStop(1, "rgba(255, 244, 214, 0)");
    g.fillStyle = wall;
    g.fillRect(x + 40, STREET - 64, 80, 64);
    // the car
    r(g, x, y, 38, 8, "#1b2030");
    r(g, x + 8, y - 5, 20, 5, "#1b2030");
    r(g, x + 10, y - 4, 7, 4, "#3a4566");
    r(g, x + 19, y - 4, 7, 4, "#3a4566");
    r(g, x + 36, y + 2, 2, 2, "#fff4d6");
    r(g, x, y + 2, 1, 2, "#b3261e");
    r(g, x + 5, y + 7, 6, 3, "#0a0a0d");
    r(g, x + 27, y + 7, 6, 3, "#0a0a0d");
  }

  function frame(t: number, now: number, dt: number, press: number | null) {
    room.update(t - T.room, dt, press);
    if (t < T.room) {
      drawOutside(t, now, true);
      if (t > T.room - IN) drawRoom(null, smooth(T.room - IN, T.room, t));
    } else drawRoom(press, 1);
  }

  return {
    frame,
    still: (pressed) => {
      // lit, resting, the joint in hand; and once pressed, "saeculo" on the screen
      room.update(READY_AT_STILL, 0, pressed ? PRESS.back[1] + 50 : null);
      drawRoom(pressed ? PRESS.back[1] + 50 : null, 1);
    },
    resize,
    destroy: () => {
      alive = false;
      cover.onload = null;
    },
  };
}

/** The still picture's moment: lit, the hand down, the coal glowing. */
const READY_AT_STILL = 2000;
