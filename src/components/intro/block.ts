// The intro's picture: the block at night, in the game's pixels. One tall
// strip (the sky, the skyline, your building and the street) is painted
// once at its own small size; each frame copies the part the camera sees,
// scaled up without smoothing, and adds the few things that move: windows
// across the way going on and off, one car, and the room behind the lit
// window, which is painted finer so the camera can go in through the glass
// and on into the laptop's screen. The screen is the site: at the end it
// opens up and the real desktop shows through it.
// Times are in ms from the click; before it (t < 0) the camera waits on the
// sky.

export const T = {
  /** The camera starts down the building. */
  descend: 1200,
  /** It settles by the lit window and starts to go in. */
  window: 3800,
  /** Through the glass, on into the screen. */
  screen: 5600,
  /** The screen opens onto the desktop. */
  open: 5900,
  end: 7000,
} as const;

/** The strip, in its own pixels. */
const SW = 560;
const SH = 430;
/** Your building and the lit window (strip px). */
const BX = 220;
const BW = 120;
const ROOF = 168;
const FLOOR = 44;
const WIN = { x: 271, y: 222, w: 18, h: 24 };
/** The room behind it is painted this many times finer. */
const FINE = 4;
const RW = WIN.w * FINE;
const RH = WIN.h * FINE;
/** The laptop's screen, in room px. */
const SCR = { x: 26, y: 55, w: 20, h: 12 };
const STREET = 360;
const ROAD = 372;
/** Where the camera stops on the way down, and the screen it goes into (strip px). */
const STOP_Y = 262;
const SCREEN_C = { x: WIN.x + (SCR.x + SCR.w / 2) / FINE, y: WIN.y + (SCR.y + SCR.h / 2) / FINE };

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
    for (let fy = top + 12; fy < STREET - 40; fy += FLOOR)
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
    const wy = ROOF + 10 + f * FLOOR;
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
    const py = ROOF + 36 + f * FLOOR;
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
  const gy = ROOF + 3 * FLOOR + 8;
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

// ------------------------------------------------------------ the room

/** The room behind the lit window, in room px: the game's bedroom, seen through the glass. */
function paintRoom(cover: HTMLImageElement | null) {
  const c = canvas(RW, RH);
  const g = c.getContext("2d")!;
  // the wall: the bedroom's faded stripes
  r(g, 0, 0, RW, RH, "#2b2a3a");
  for (let x = 3; x < RW; x += 8) r(g, x, 0, 1, RH, "#302f40");
  // the poster: the album cover
  r(g, 39, 11, 26, 26, "#16151c");
  if (cover) {
    g.imageSmoothingEnabled = true;
    g.drawImage(cover, 41, 13, 22, 22);
  } else r(g, 41, 13, 22, 22, "#3a3550");
  // a shelf of tapes
  r(g, 6, 32, 24, 2, "#4d3526");
  ["#a3321f", "#3d5a8a", "#e4b95a", "#cfc8b9", "#2f6b3a", "#6b6357"].forEach((col, i) => r(g, 7 + i * 4, 26, 3, 6, col));
  // the desk, under the window
  r(g, 0, 70, RW, 4, "#4d3526");
  r(g, 0, 74, RW, RH - 74, "#3a281d");
  r(g, 0, 74, RW, 1, "#2b1e17");
  for (let x = 4; x < RW; x += 17) r(g, x, 78, 1, RH - 80, "#33241b");
  // the lamp
  r(g, 8, 67, 9, 3, "#1c1a1e");
  r(g, 12, 52, 1, 15, "#1c1a1e");
  r(g, 12, 52, 7, 1, "#1c1a1e");
  r(g, 15, 49, 9, 5, "#c9a96a");
  r(g, 16, 54, 7, 1, "#fff2c9");
  // the laptop, open
  r(g, SCR.x - 2, SCR.y - 2, SCR.w + 4, SCR.h + 4, "#16171b");
  r(g, SCR.x - 4, SCR.y + SCR.h + 2, SCR.w + 8, 2, "#2a2c31");
  // a mug, headphones, a speaker
  r(g, 52, 65, 4, 5, "#8e3a2b");
  r(g, 56, 66, 1, 2, "#8e3a2b");
  r(g, 59, 56, 8, 14, "#141417");
  r(g, 61, 61, 4, 4, "#26262b");
  r(g, 61, 57, 4, 2, "#26262b");
  // warm light from the lamp, cooler from the screen
  const warm = g.createRadialGradient(19, 56, 1, 19, 56, 70);
  warm.addColorStop(0, "rgba(255, 214, 140, 0.42)");
  warm.addColorStop(0.5, "rgba(255, 190, 110, 0.12)");
  warm.addColorStop(1, "rgba(255, 190, 110, 0)");
  g.fillStyle = warm;
  g.fillRect(0, 0, RW, RH);
  return c;
}

/** The screen: the site, too far off to make out yet (the desk's stone, the
 * taskbar, the light of it), so it fades straight into the real one. */
function paintScreen(g: G, x: number, y: number, w: number, h: number) {
  r(g, x, y, w, h, "#cfc8b9");
  const light = g.createRadialGradient(x + w / 2, y + h * 0.4, 0, x + w / 2, y + h * 0.4, w * 0.6);
  light.addColorStop(0, "rgba(251, 248, 242, 0.55)");
  light.addColorStop(1, "rgba(251, 248, 242, 0)");
  g.fillStyle = light;
  g.fillRect(x, y, w, h);
  r(g, x, y + h - h / 14, w, h / 14, "#f3eee4");
}

// ------------------------------------------------------------ the camera

export interface Camera {
  x: number;
  y: number;
  /** Screen px per strip px. */
  z: number;
}

export interface Scene {
  /** Draw the moment `t` (ms since the click; < 0 before it). */
  frame: (t: number, now: number) => void;
  /** The still picture (reduced motion): the lit window, nothing moving. */
  still: () => void;
  resize: () => void;
  destroy: () => void;
}

/** `onChange`: something drawn once has changed (the cover came in), for a still picture to redraw. */
export function createScene(el: HTMLCanvasElement, onChange?: () => void): Scene {
  const g = el.getContext("2d")!;
  const spots: Spot[] = [];
  const strip = paintStrip(spots);
  let room = paintRoom(null);
  let alive = true;
  const cover = new Image();
  cover.decoding = "async";
  cover.onload = () => {
    if (!alive) return;
    room = paintRoom(cover);
    onChange?.();
  };
  cover.src = "/covers/saeculo.jpg";

  let W = 1;
  let H = 1;
  let dpr = 1;
  /** The camera's resting zoom: whole screen px per strip px. */
  let z0 = 4;

  const resize = () => {
    const box = el.getBoundingClientRect();
    W = Math.max(1, box.width || window.innerWidth);
    H = Math.max(1, box.height || window.innerHeight);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    el.width = Math.round(W * dpr);
    el.height = Math.round(H * dpr);
    // the sky to the street on a phone, a floor or two less on a wide screen
    z0 = Math.max(2, Math.round(Math.min(H / 190, W / 136)));
  };
  resize();

  /** Where the camera is at `t`. */
  function camera(t: number): Camera {
    const vh = H / z0;
    const top = Math.min(vh / 2, SH - vh / 2);
    const stop = Math.min(STOP_Y, SH - vh / 2);
    if (t < T.window) {
      const k = easeInOut(clamp((t - T.descend) / (T.window - T.descend)));
      return { x: SW / 2, y: top + (stop - top) * k, z: z0 };
    }
    // in through the window to the screen: the zoom eases in log space, and
    // the centre moves so the push looks straight on
    const scrW = SCR.w / FINE;
    const scrH = SCR.h / FINE;
    const z1 = Math.max(W / scrW, H / scrH) * 1.04;
    const k = easeInOut(clamp((t - T.window) / (T.end - T.window)));
    const z = z0 * Math.pow(z1 / z0, k);
    const w = (1 / z0 - 1 / z) / (1 / z0 - 1 / z1);
    return { x: SW / 2 + (SCREEN_C.x - SW / 2) * w, y: stop + (SCREEN_C.y - stop) * w, z };
  }

  function draw(t: number, now: number, moving: boolean) {
    const cam = camera(t);
    g.setTransform(1, 0, 0, 1, 0, 0);
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

    // the lit window: the room, then the glass and the sash over it
    g.imageSmoothingEnabled = cam.z < FINE;
    g.drawImage(room, WIN.x, WIN.y, WIN.w, WIN.h);
    g.imageSmoothingEnabled = false;
    const sg = g.createLinearGradient(WIN.x, WIN.y, WIN.x + WIN.w, WIN.y + WIN.h);
    sg.addColorStop(0, "rgba(255, 236, 200, 0.07)");
    sg.addColorStop(1, "rgba(255, 236, 200, 0)");
    g.fillStyle = sg;
    g.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
    r(g, WIN.x, WIN.y, WIN.w, 1.5, "#d9c49a"); // the blind, pulled up
    r(g, WIN.x, WIN.y + 8.5, WIN.w, 1, "#2a2026"); // the sash
    // the screen, the site on it
    const sx = WIN.x + SCR.x / FINE;
    const sy = WIN.y + SCR.y / FINE;
    const sw = SCR.w / FINE;
    const sh = SCR.h / FINE;
    paintScreen(g, sx, sy, sw, sh);

    // the glow the window throws out onto the bricks
    const glow = g.createRadialGradient(WIN.x + WIN.w / 2, WIN.y + WIN.h / 2, 4, WIN.x + WIN.w / 2, WIN.y + WIN.h / 2, 34);
    glow.addColorStop(0, "rgba(255, 196, 120, 0.16)");
    glow.addColorStop(1, "rgba(255, 196, 120, 0)");
    g.fillStyle = glow;
    g.fillRect(WIN.x - 34, WIN.y - 34, WIN.w + 68, WIN.h + 68);

    if (moving) drawCar(t);

    // the screen opens onto the desktop underneath
    const open = smooth(T.open, T.end - 120, t);
    if (open > 0) {
      g.globalCompositeOperation = "destination-out";
      g.globalAlpha = open;
      g.fillRect(sx, sy, sw, sh);
      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
    }
  }

  /** One car, left to right, its headlights across the ground floor. */
  function drawCar(t: number) {
    const k = (t - 2300) / 2300;
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

  return {
    frame: (t, now) => draw(t < 0 ? -1 : t, now, true),
    still: () => draw(T.window, 0, false),
    resize,
    destroy: () => {
      alive = false;
      cover.onload = null;
    },
  };
}
