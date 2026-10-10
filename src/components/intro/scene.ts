// The intro, drawn on three canvases:
//   back:  the dark room (and, at the end, the dark coming apart like smoke)
//   fg:    the cigarette, its coal and ash, the ash falling, the thin smoke
//          rising off it, and the dust and scratches of old film
//   smoke: the breath blown in from the side (drawn at a lower resolution:
//          smoke is soft, and it keeps phones cool)
// Times are in ms from the click that starts it; before that (t < 0) only
// the dark room and its dust are drawn.

export const T = {
  /** The cigarette fades up; the lighter catches it. */
  light: 0,
  /** The long drag starts and the coal starts to creep. */
  drag: 450,
  /** Smoked down to the filter. */
  burnt: 3000,
  /** The breath out (and the cigarette fades). */
  exhale: 3200,
  /** The smoke reaches the screen. */
  smoke: 3380,
  /** The name starts to show through it. */
  reveal: 4600,
  /** The name goes; the smoke blows on; then the dark lifts. */
  out: 7400,
  end: 8900,
} as const;

/** The dark starts lifting this long into the way out, once the name has mostly gone. */
const LIFT_DELAY = 450;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, v: number) => {
  const k = clamp((v - a) / (b - a));
  return k * k * (3 - 2 * k);
};
const easeOut = (k: number) => 1 - Math.pow(1 - clamp(k), 3);

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth value noise in 0..1. */
function makeNoise(rand: () => number) {
  const perm = new Uint16Array(512);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const vals = Float32Array.from({ length: 256 }, () => rand());
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const X = xi & 255;
    const Y = yi & 255;
    const a = vals[perm[X + perm[Y]] & 255];
    const b = vals[perm[X + 1 + perm[Y]] & 255];
    const c = vals[perm[X + perm[Y + 1]] & 255];
    const d = vals[perm[X + 1 + perm[Y + 1]] & 255];
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
type Noise = ReturnType<typeof makeNoise>;

function fbm(n: Noise, x: number, y: number, oct: number) {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  for (let o = 0; o < oct; o++) {
    sum += amp * n(x, y);
    norm += amp;
    x *= 2.03;
    y *= 2.03;
    amp *= 0.5;
  }
  return sum / norm;
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

// ------------------------------------------------------------ textures

/** A wisp of smoke: warped noise inside a soft round falloff. */
function puffSprite(n: Noise, size: number, seed: number, tint: [number, number, number]) {
  const c = canvas(size, size);
  const g = c.getContext("2d")!;
  const img = g.createImageData(size, size);
  const d = img.data;
  const ox = seed * 17.31;
  const oy = seed * 9.17;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x / size) * 2 - 1;
      const ny = (y / size) * 2 - 1;
      const r = Math.hypot(nx, ny);
      if (r >= 1) continue;
      const fall = Math.pow(smooth(1, 0.15, r), 1.3);
      const qx = fbm(n, nx * 1.5 + ox, ny * 1.5 + oy, 3);
      const qy = fbm(n, nx * 1.5 + ox + 5.2, ny * 1.5 + oy + 1.3, 3);
      const v = fbm(n, nx * 2.3 + 2.6 * qx + ox, ny * 2.3 + 2.6 * qy + oy, 4);
      const a = fall * smooth(0.36, 0.78, v);
      const i = (y * size + x) * 4;
      d[i] = tint[0];
      d[i + 1] = tint[1];
      d[i + 2] = tint[2];
      d[i + 3] = a * 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** A soft round blob, for holes and haze. */
function blobSprite(size: number, rgb: string) {
  const c = canvas(size, size);
  const g = c.getContext("2d")!;
  const r = size / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, `rgba(${rgb},1)`);
  grad.addColorStop(0.45, `rgba(${rgb},0.55)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

/** Cork tipping paper: tan, with darker flecks. */
function corkTexture(rand: () => number) {
  const c = canvas(96, 48);
  const g = c.getContext("2d")!;
  g.fillStyle = "#b07a45";
  g.fillRect(0, 0, 96, 48);
  for (let i = 0; i < 420; i++) {
    const x = rand() * 96;
    const y = rand() * 48;
    const r = 0.4 + rand() * 1.4;
    g.fillStyle = rand() < 0.75 ? `rgba(92,50,20,${0.25 + rand() * 0.45})` : `rgba(232,196,140,${0.2 + rand() * 0.3})`;
    g.beginPath();
    g.ellipse(x, y, r * 1.4, r, rand() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

/** Cigarette paper: matte, with faint fibres running along it. */
function paperTexture(n: Noise, rand: () => number) {
  const w = 128;
  const h = 48;
  const c = canvas(w, h);
  const g = c.getContext("2d")!;
  const img = g.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = fbm(n, x * 0.05 + 200, y * 0.6 + 11, 3);
      const i = (y * w + x) * 4;
      const k = v - 0.5 + (rand() - 0.5) * 0.25;
      d[i] = d[i + 1] = d[i + 2] = k > 0 ? 255 : 60;
      d[i + 3] = Math.min(255, Math.abs(k) * 46);
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Ash: mottled grey with dark pits and pale flecks. */
function ashTexture(n: Noise, rand: () => number) {
  const w = 160;
  const h = 48;
  const c = canvas(w, h);
  const g = c.getContext("2d")!;
  const img = g.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // streaky along the cigarette, pitted across it
      const v = fbm(n, x * 0.07 + 40, y * 0.3 + 7, 4) * 0.75 + fbm(n, x * 0.4 + 9, y * 0.4 + 70, 2) * 0.25;
      const i = (y * w + x) * 4;
      const dark = v < 0.5;
      d[i] = d[i + 1] = d[i + 2] = dark ? 28 : 232;
      d[i + 3] = Math.min(255, Math.abs(v - 0.5) * 2 * 210 + rand() * 40);
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** The coal: dark, with spots of red, orange and near-white heat. */
function emberTexture(n: Noise) {
  const w = 96;
  const h = 64;
  const c = canvas(w, h);
  const g = c.getContext("2d")!;
  const img = g.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = fbm(n, x * 0.11 + 100, y * 0.11 + 30, 4);
      const i = (y * w + x) * 4;
      if (v < 0.4) continue;
      const k = (v - 0.4) / 0.6;
      // deep red → orange → pale yellow
      d[i] = 150 + 105 * Math.min(1, k * 1.6);
      d[i + 1] = 25 + 200 * Math.pow(k, 1.6);
      d[i + 2] = 10 + 150 * Math.pow(k, 3);
      d[i + 3] = 255 * Math.min(1, k * 2.2);
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

// ------------------------------------------------------------ the scene

interface Chunk {
  img: HTMLCanvasElement;
  /** Sprite size, CSS px. */
  w: number;
  h: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
}
interface Fleck {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  seed: number;
  /** A spark from the coal rather than a flake of ash. */
  hot: boolean;
}
interface Wisp {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  seed: number;
}
interface Puff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  grow: number;
  a: number;
  age: number;
  life: number;
  rot: number;
  vr: number;
  sprite: number;
}

export interface Scene {
  /** Draw the moment `t` (ms since the click; < 0 before it). Returns how far right the smoke has reached, in CSS px. */
  frame: (t: number, now: number) => number;
  /** The pops in the crackle (ms), so a spark flies with each. */
  setPops: (pops: number[]) => void;
  /** Where the bright name sits, so the smoke over it catches its light. */
  setName: (rect: { x: number; y: number; w: number; h: number } | null) => void;
  resize: () => void;
  destroy: () => void;
}

export function createScene(els: { back: HTMLCanvasElement; fg: HTMLCanvasElement; smoke: HTMLCanvasElement }): Scene {
  const rand = rng(808);
  const noise = makeNoise(rand);
  const bg = els.back.getContext("2d")!;
  const g = els.fg.getContext("2d")!;
  const sg = els.smoke.getContext("2d")!;

  let W = 0;
  let H = 0;
  let dpr = 1;
  let sScale = 1;
  const BACK_SCALE = 0.5;

  // the cigarette's shape, in its own coordinates: x along it from the
  // mouth end (0) to the lit end (L), y across it (radius R)
  let L = 400;
  let R = 18;
  let F = 108;
  let ox = 0;
  let oy = 0;
  const ANGLE = -0.045;
  const cos = Math.cos(ANGLE);
  const sin = Math.sin(ANGLE);
  const toWorld = (x: number, y: number): [number, number] => [ox + x * cos - y * sin, oy + x * sin + y * cos];

  const resize = () => {
    const box = els.fg.getBoundingClientRect();
    W = Math.max(1, box.width || window.innerWidth);
    H = Math.max(1, box.height || window.innerHeight);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    sScale = clamp(dpr * 0.4, 0.4, 0.6);
    els.fg.width = Math.round(W * dpr);
    els.fg.height = Math.round(H * dpr);
    els.smoke.width = Math.round(W * sScale);
    els.smoke.height = Math.round(H * sScale);
    els.back.width = Math.round(W * BACK_SCALE);
    els.back.height = Math.round(H * BACK_SCALE);
    L = Math.min(W * 0.74, 470, H * 0.8);
    R = L * 0.047;
    F = L * 0.27;
    ox = W / 2 - (L / 2) * cos;
    oy = H * 0.5 + R - (L / 2) * sin;
    drawBack(-1);
  };

  // textures, made once (the smoke ones while the visitor reads the screen)
  const cork = corkTexture(rand);
  const ashTex = ashTexture(noise, rand);
  const paperTex = paperTexture(noise, rand);
  const emberTex = emberTexture(noise);
  const blob = blobSprite(64, "214,218,224");
  const hole = blobSprite(128, "0,0,0");
  let puffs: HTMLCanvasElement[] = [];
  let corkPat: CanvasPattern | null = null;
  let paperPat: CanvasPattern | null = null;
  const makeSmoke = () => {
    if (!puffs.length) puffs = [0, 1, 2, 3].map((i) => puffSprite(noise, 150, i + 1, [222, 225, 230]));
  };
  const idle = window.setTimeout(makeSmoke, 60);

  // ---------------------------------------------------------- the room

  /** How far the dark has lifted (0 → 1), once the name has gone. */
  const lift = (t: number) => (t < T.out ? 0 : smooth(T.out + LIFT_DELAY, T.end, t));

  function drawBack(t: number) {
    const w = els.back.width;
    const h = els.back.height;
    bg.setTransform(1, 0, 0, 1, 0, 0);
    bg.globalCompositeOperation = "source-over";
    bg.globalAlpha = 1;
    bg.clearRect(0, 0, w, h);
    const q = lift(t);
    bg.globalAlpha = 1 - smooth(0.75, 1, q);
    bg.fillStyle = "#0b0a09";
    bg.fillRect(0, 0, w, h);
    // one weak light somewhere above
    const glow = bg.createRadialGradient(w / 2, h * 0.38, 0, w / 2, h * 0.38, Math.max(w, h) * 0.65);
    glow.addColorStop(0, "rgba(34,30,26,1)");
    glow.addColorStop(0.55, "rgba(18,16,14,0.6)");
    glow.addColorStop(1, "rgba(11,10,9,0)");
    bg.fillStyle = glow;
    bg.fillRect(0, 0, w, h);
    if (q > 0) {
      // the dark goes the way the smoke went: blown off from the left,
      // with a soft, billowing edge
      bg.globalCompositeOperation = "destination-out";
      bg.globalAlpha = 1;
      const front = -0.5 * w + q * 2 * w;
      const soft = 0.5 * w;
      const wipe = bg.createLinearGradient(front - soft, 0, front, 0);
      wipe.addColorStop(0, "rgba(0,0,0,1)");
      wipe.addColorStop(1, "rgba(0,0,0,0)");
      bg.fillStyle = wipe;
      bg.fillRect(0, 0, Math.max(0, front), h);
      // billows along the edge, and thinner ones out ahead of it
      for (let i = 0; i < 22; i++) {
        const lead = i % 2;
        const y = (((i >> 1) + 0.5) / 11) * h + (lead ? h * 0.045 : 0);
        const j = noise(i * 0.83 + 4.1, q * 1.4 + lead * 3);
        const r = Math.min(w, h) * (lead ? 0.09 + 0.1 * j : 0.15 + 0.14 * j);
        const x = front - soft * (lead ? 0.05 : 0.4) + (j - 0.5) * 0.34 * w;
        bg.globalAlpha = lead ? 0.45 : 0.85;
        bg.drawImage(hole, x - r * 1.5, y - r, r * 3, r * 2);
      }
      bg.globalCompositeOperation = "source-over";
    }
  }

  // ---------------------------------------------------------- film dirt

  const dirt: { x: number; y: number; r: number; until: number; hair: boolean; a: number; rot: number }[] = [];
  const scratches: { x: number; until: number; a: number }[] = [];
  function drawDirt(now: number, dt: number, fade: number) {
    if (rand() < dt * 2.2) {
      dirt.push({ x: rand() * W, y: rand() * H, r: 0.6 + rand() * 1.8, until: now + 40 + rand() * 80, hair: rand() < 0.25, a: 0.2 + rand() * 0.3, rot: rand() * Math.PI });
    }
    if (rand() < dt * 0.45) scratches.push({ x: rand() * W, until: now + 90 + rand() * 260, a: 0.05 + rand() * 0.07 });
    for (let i = dirt.length - 1; i >= 0; i--) if (dirt[i].until < now) dirt.splice(i, 1);
    for (let i = scratches.length - 1; i >= 0; i--) if (scratches[i].until < now) scratches.splice(i, 1);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const d of dirt) {
      g.globalAlpha = d.a * fade;
      if (d.hair) {
        g.strokeStyle = "#d8d2c6";
        g.lineWidth = 0.8;
        g.beginPath();
        g.moveTo(d.x, d.y);
        g.quadraticCurveTo(d.x + Math.cos(d.rot) * 9, d.y + Math.sin(d.rot) * 9 + 5, d.x + Math.cos(d.rot) * 16, d.y + Math.sin(d.rot) * 16);
        g.stroke();
      } else {
        g.fillStyle = "#d8d2c6";
        g.beginPath();
        g.ellipse(d.x, d.y, d.r * 1.3, d.r, d.rot, 0, Math.PI * 2);
        g.fill();
      }
    }
    for (const s of scratches) {
      g.globalAlpha = s.a * fade;
      g.fillStyle = "#e8e2d6";
      g.fillRect(s.x + (rand() - 0.5) * 2, 0, 1, H);
    }
    g.globalAlpha = 1;
  }

  // ---------------------------------------------------------- the cigarette

  let pops: number[] = [];
  let popIndex = 0;
  let ashEnd = 0;
  let nextBreak = 0;
  let lastT = -1;
  const chunks: Chunk[] = [];
  const flecks: Fleck[] = [];
  const wisps: Wisp[][] = [[], []];
  // fixed places along the cigarette where the ash rings sit (where the
  // paper burnt between breaths), each a little different
  const ridges: { x: number; a: number; y0: number; y1: number; bend: number }[] = [];
  // and the cracks that run along it
  const streaks: { y: number; x0: number; len: number; a: number }[] = [];

  const resetBurn = () => {
    ashEnd = 1; // as a fraction of L, so a resize keeps it
    nextBreak = 0.13 + rand() * 0.06;
    popIndex = 0;
    ridges.length = 0;
    for (let x = 0.3; x < 1; x += 0.016 + rand() * 0.022) {
      const full = rand() < 0.55;
      ridges.push({ x, a: 0.18 + rand() * 0.34, y0: full ? -1 : -1 + rand() * 0.7, y1: full ? 1 : 0.2 + rand() * 0.8, bend: (rand() - 0.5) * 0.7 });
    }
    streaks.length = 0;
    for (let i = 0; i < 26; i++) streaks.push({ y: -0.85 + rand() * 1.7, x0: 0.3 + rand() * 0.7, len: 0.01 + rand() * 0.05, a: 0.1 + rand() * 0.25 });
  };
  resetBurn();

  /** Where the coal is (fraction of L). */
  const front = (t: number) => {
    const k = clamp((t - T.drag) / (T.burnt - T.drag));
    const e = 0.3 * k + 0.7 * smooth(0, 1, k);
    return 0.988 + (0.292 - 0.988) * e;
  };
  /** How hot the coal is. */
  const heat = (t: number, now: number) => {
    if (t < 0) return 0;
    const flick = 0.85 + 0.1 * Math.sin(now * 0.031) + 0.05 * Math.sin(now * 0.077 + 1.3);
    if (t < T.drag) return 0.5 * smooth(0, T.drag, t) * flick;
    if (t < T.burnt) return (0.5 + 0.5 * smooth(T.drag, T.drag + 400, t)) * flick;
    return (1 - smooth(T.burnt, T.burnt + 380, t)) * flick;
  };

  /** The burnt edge of the paper, top to bottom: ragged, and alive. */
  const edge = (b: number, t: number) => {
    const pts: [number, number][] = [];
    const n = 16;
    for (let i = 0; i <= n; i++) {
      const y = -R + (2 * R * i) / n;
      const slow = (noise(i * 0.22 + 3.1, b * 0.04) - 0.5) * 0.016 * L;
      const fine = (noise(i * 1.3 + 40, b * 0.2 + t * 0.002) - 0.5) * 0.005 * L;
      pts.push([b + slow + fine, y]);
    }
    return pts;
  };

  /** Vertical light across a round thing lit from above. */
  let shade: CanvasGradient | null = null;
  let shadeR = 0;
  const shadeGrad = () => {
    if (shade && shadeR === R) return shade;
    shade = g.createLinearGradient(0, -R, 0, R);
    shade.addColorStop(0, "rgba(0,0,0,0.5)");
    shade.addColorStop(0.12, "rgba(0,0,0,0.12)");
    shade.addColorStop(0.3, "rgba(255,250,240,0.07)");
    shade.addColorStop(0.46, "rgba(255,250,240,0)");
    shade.addColorStop(0.72, "rgba(0,0,0,0.26)");
    shade.addColorStop(1, "rgba(0,0,0,0.68)");
    shadeR = R;
    return shade;
  };

  /** A ragged end across the ash at x (for breaks). */
  const ragged = (c: CanvasRenderingContext2D, x: number, seed: number, down: boolean) => {
    for (let i = 0; i <= 7; i++) {
      const k = down ? i / 7 : 1 - i / 7;
      const y = -R * 0.92 + 1.84 * R * k;
      c.lineTo(x + (noise(i * 0.9 + seed, seed * 0.37) - 0.5) * R * 0.7, y);
    }
  };

  /** Ash from x0 to x1 (cigarette coordinates), onto `c`. */
  function drawAsh(c: CanvasRenderingContext2D, x0: number, x1: number, hot: number, roughStart: boolean, roughEnd = false) {
    if (x1 - x0 < 0.5) return;
    const top: [number, number][] = [];
    const bottom: [number, number][] = [];
    const step = Math.max(2, R * 0.25);
    // ash swells a touch past the paper, unevenly
    for (let x = x0; x <= x1 - R * 0.3; x += step) {
      const sw = 1 + 0.05 * smooth(x0, x0 + R, x);
      top.push([x, -R * (sw + 0.09 * (noise(x * 0.09, 1.7) - 0.5))]);
      bottom.push([x, R * (sw + 0.09 * (noise(x * 0.09, 8.3) - 0.5))]);
    }
    c.beginPath();
    if (roughStart) {
      c.moveTo(x0, R * 0.92);
      ragged(c, x0, x0 * 0.013 + 5, false);
    } else {
      c.moveTo(x0, R * 0.96);
      c.lineTo(x0, -R * 0.96);
    }
    for (const p of top) c.lineTo(p[0], p[1]);
    if (roughEnd) ragged(c, x1, x1 * 0.013 + 5, true);
    else {
      // the far end, rounded and crumbly
      const cx = Math.max(x0 + R * 0.2, x1 - R * 0.5);
      for (let i = 0; i <= 14; i++) {
        const a = -Math.PI / 2 + (Math.PI * i) / 14;
        const rr = R * (0.94 + 0.3 * (noise(i * 0.8 + 20, x1 * 0.03) - 0.5));
        c.lineTo(cx + Math.cos(a) * rr * 0.55, Math.sin(a) * rr);
      }
    }
    for (let i = bottom.length - 1; i >= 0; i--) c.lineTo(bottom[i][0], bottom[i][1]);
    c.closePath();
    c.save();
    c.clip();
    const len = Math.max(1, x1 - x0);
    const grad = c.createLinearGradient(x0, 0, x0 + len, 0);
    const near = roughStart ? 0 : 1;
    grad.addColorStop(0, near ? "#2a221d" : "#8b8680");
    grad.addColorStop(clamp((0.025 * L) / len), near ? "#615a53" : "#99948d");
    grad.addColorStop(clamp((0.06 * L) / len), "#a29d95");
    grad.addColorStop(1, "#b4afa7");
    c.fillStyle = grad;
    c.fillRect(x0 - R, -R * 1.3, len + 2 * R, R * 2.6);
    // the mottling, then the rings and cracks
    c.globalAlpha = 0.7;
    c.drawImage(ashTex, (x0 * 0.7) % 60, 0, 90, 48, x0, -R * 1.1, len, 2.2 * R);
    c.globalAlpha = 1;
    c.lineWidth = Math.max(0.6, R * 0.045);
    for (const r of ridges) {
      const x = r.x * L;
      if (x < x0 + R * 0.2 || x > x1 - R * 0.35) continue;
      const bend = r.bend * R;
      c.strokeStyle = `rgba(40,35,31,${r.a})`;
      c.beginPath();
      c.moveTo(x, R * r.y0);
      c.quadraticCurveTo(x + bend + R * 0.1, R * ((r.y0 + r.y1) / 2), x + bend * 0.3, R * r.y1);
      c.stroke();
      c.strokeStyle = `rgba(222,218,210,${r.a * 0.35})`;
      c.beginPath();
      c.moveTo(x + 1.1, R * r.y0);
      c.quadraticCurveTo(x + bend + R * 0.1 + 1.1, R * ((r.y0 + r.y1) / 2), x + bend * 0.3 + 1.1, R * r.y1);
      c.stroke();
    }
    c.lineWidth = Math.max(0.5, R * 0.035);
    for (const st of streaks) {
      const x = st.x0 * L;
      if (x < x0 || x > x1) continue;
      c.strokeStyle = `rgba(38,33,29,${st.a})`;
      c.beginPath();
      c.moveTo(x, st.y * R);
      c.lineTo(Math.min(x1, x + st.len * L), st.y * R + R * 0.04);
      c.stroke();
    }
    c.fillStyle = shadeGrad();
    c.fillRect(x0 - R, -R * 1.2, len + 2 * R, 2.4 * R);
    if (hot > 0) {
      // the coal still glowing through the newest ash
      c.globalCompositeOperation = "lighter";
      const hg = c.createLinearGradient(x0, 0, x0 + 0.05 * L, 0);
      hg.addColorStop(0, `rgba(255,90,28,${0.6 * hot})`);
      hg.addColorStop(0.35, `rgba(220,60,20,${0.22 * hot})`);
      hg.addColorStop(1, "rgba(200,50,20,0)");
      c.fillStyle = hg;
      c.fillRect(x0 - 2, -R * 1.2, 0.05 * L + 2, 2.4 * R);
      c.globalCompositeOperation = "source-over";
    }
    c.restore();
  }

  /** Break the ash from x0 to x1 off and let it fall, in a piece or two. */
  function dropAsh(x0: number, x1: number, b: number, droop: number) {
    const cut = x1 - x0 > R * 3 ? [x0, x0 + (x1 - x0) * (0.35 + rand() * 0.3), x1] : [x0, x1];
    for (let i = 0; i < cut.length - 1; i++) {
      const a = cut[i];
      const z = cut[i + 1];
      const pad = R * 0.7;
      const w = z - a + pad * 2;
      const h = R * 2 + pad * 2;
      const img = canvas(w * dpr, h * dpr);
      const c = img.getContext("2d")!;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.translate(pad - a, pad + R);
      drawAsh(c, a, z, 0, true, i < cut.length - 2);
      // where its middle is on screen
      const mx = (a + z) / 2 - b;
      const [wx, wy] = toWorld(b + mx * Math.cos(droop), mx * Math.sin(droop));
      chunks.push({ img, w, h, x: wx, y: wy, vx: 4 + rand() * 14 + i * 12, vy: rand() * 10, rot: ANGLE + droop, vr: (0.5 + rand() * 1.4) * (rand() < 0.75 ? 1 : -1) * (1 + i * 0.5) });
      // a little dust as it goes
      for (let k = 0; k < 14; k++) flecks.push({ x: wx + (rand() - 0.5) * (z - a), y: wy + (rand() - 0.5) * R * 1.6, vx: (rand() - 0.5) * 34, vy: rand() * 24, age: 0, life: 0.8 + rand() * 1.1, size: (0.5 + rand() * 1.5) * Math.max(0.7, R / 20), seed: rand() * 9, hot: false });
    }
  }

  function updateFalling(dt: number) {
    for (let i = chunks.length - 1; i >= 0; i--) {
      const c = chunks[i];
      c.vy += 1250 * dt;
      c.vx *= 1 - 0.4 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rot += c.vr * dt;
      // crumbling as it goes
      if (rand() < dt * 22) flecks.push({ x: c.x + (rand() - 0.5) * c.w * 0.6, y: c.y + (rand() - 0.5) * R, vx: c.vx * 0.3 + (rand() - 0.5) * 30, vy: c.vy * 0.2, age: 0, life: 0.7 + rand() * 0.9, size: (0.5 + rand() * 1.3) * Math.max(0.7, R / 20), seed: rand() * 9, hot: false });
      if (c.y > H + c.w) chunks.splice(i, 1);
    }
    for (let i = flecks.length - 1; i >= 0; i--) {
      const f = flecks[i];
      f.age += dt;
      if (f.age > f.life) {
        flecks.splice(i, 1);
        continue;
      }
      if (f.hot) {
        f.vy += 260 * dt;
        f.vx *= 1 - 1.2 * dt;
      } else {
        // flakes: they flutter down rather than drop
        f.vy += 300 * dt;
        f.vy *= 1 - 2.6 * dt;
        f.vx += Math.sin(f.age * 9 + f.seed) * 46 * dt;
      }
      f.x += f.vx * dt;
      f.y += f.vy * dt;
    }
  }

  function drawFalling() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const c of chunks) {
      g.save();
      g.translate(c.x, c.y);
      g.rotate(c.rot);
      g.drawImage(c.img, -c.w / 2, -c.h / 2, c.w, c.h);
      g.restore();
    }
    for (const f of flecks) {
      const k = f.age / f.life;
      if (f.hot) {
        g.globalCompositeOperation = "lighter";
        g.globalAlpha = (1 - k) * 0.95;
        g.fillStyle = k < 0.4 ? "#ffd59a" : k < 0.7 ? "#ff8a3a" : "#a8361a";
        g.fillRect(f.x - f.size / 2, f.y - f.size / 2, f.size, f.size);
        g.globalCompositeOperation = "source-over";
      } else {
        g.globalAlpha = (1 - k) * 0.8;
        g.fillStyle = f.seed > 6 ? "#5f5a54" : "#aaa49c";
        // a flake turning over as it falls
        const turn = 0.35 + 0.65 * Math.abs(Math.sin(f.age * 7 + f.seed));
        g.fillRect(f.x, f.y, f.size * 1.3, f.size * turn);
      }
    }
    g.globalAlpha = 1;
  }

  function drawCigarette(t: number, now: number, alpha: number) {
    const b = front(t) * L;
    const hot = heat(t, now);
    const pts = edge(b, t);
    const coal = 0.03 * L;
    let ashX1 = ashEnd * L;
    const ashLen = ashX1 - b;
    const droop = Math.min(0.08, 0.05 * Math.pow(Math.max(0, ashLen) / (0.18 * L), 1.6));

    // the ash gets too long and goes
    if (ashLen > nextBreak * L) {
      const stub = coal + (0.004 + rand() * 0.018) * L;
      dropAsh(b + stub, ashX1, b, droop);
      ashEnd = (b + stub) / L;
      ashX1 = ashEnd * L;
      nextBreak = 0.12 + rand() * 0.09;
    }
    // smoked to the end: the last of it falls too
    if (t > T.burnt + 60 && ashX1 - b > coal) {
      dropAsh(b + coal * 0.7, ashX1, b, droop);
      ashEnd = (b + coal * 0.7) / L;
      ashX1 = ashEnd * L;
    }

    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalAlpha = alpha;
    g.translate(ox, oy);
    g.rotate(ANGLE);

    // the mouth end: the filter's white fibre, just showing
    g.fillStyle = "#bdb5a6";
    g.beginPath();
    g.ellipse(0, 0, R * 0.3, R, 0, 0, Math.PI * 2);
    g.fill();

    // filter and paper, up to the burnt edge
    g.save();
    g.beginPath();
    g.moveTo(0, -R);
    for (const p of pts) g.lineTo(p[0], p[1]);
    g.lineTo(0, R);
    g.closePath();
    g.clip();
    if (!corkPat) corkPat = g.createPattern(cork, "repeat");
    if (!paperPat) paperPat = g.createPattern(paperTex, "repeat");
    g.fillStyle = corkPat ?? "#b07a45";
    g.fillRect(0, -R, F, 2 * R);
    g.fillStyle = "#e3ddd2";
    g.fillRect(F, -R, L - F, 2 * R);
    if (paperPat) {
      g.fillStyle = paperPat;
      g.fillRect(F, -R, L - F, 2 * R);
    }
    // where the tipping paper meets the cigarette paper
    g.fillStyle = "rgba(240,214,160,0.45)";
    g.fillRect(F - 1.5, -R, 1.5, 2 * R);
    g.fillStyle = "rgba(0,0,0,0.2)";
    g.fillRect(F, -R, 1, 2 * R);
    // the paper's seam
    g.fillStyle = "rgba(0,0,0,0.05)";
    g.fillRect(F, -R * 0.42, L - F, Math.max(0.8, R * 0.05));
    // the coal's light on the paper beside it
    if (hot > 0) {
      g.globalCompositeOperation = "lighter";
      const wl = g.createLinearGradient(b - 0.09 * L, 0, b, 0);
      wl.addColorStop(0, "rgba(255,110,40,0)");
      wl.addColorStop(1, `rgba(255,100,36,${0.16 * hot})`);
      g.fillStyle = wl;
      g.fillRect(b - 0.09 * L, -R, 0.09 * L, 2 * R);
      g.globalCompositeOperation = "source-over";
    }
    // the paper scorching towards the edge: tan, brown, black
    const char = g.createLinearGradient(b - 0.06 * L, 0, b + 0.012 * L, 0);
    char.addColorStop(0, "rgba(150,110,62,0)");
    char.addColorStop(0.45, "rgba(132,92,50,0.45)");
    char.addColorStop(0.72, "rgba(70,42,22,0.9)");
    char.addColorStop(0.86, "rgba(22,13,9,1)");
    char.addColorStop(1, "rgba(14,9,7,1)");
    g.fillStyle = char;
    g.fillRect(b - 0.06 * L, -R, 0.075 * L, 2 * R);
    g.fillStyle = shadeGrad();
    g.fillRect(-R, -R, L + R, 2 * R);
    g.restore();

    // the ash, drooping a little as it grows
    if (ashX1 - b > coal * 0.5) {
      g.save();
      g.translate(b, 0);
      g.rotate(droop);
      g.translate(-b, 0);
      drawAsh(g, b + coal * 0.45, ashX1, hot, false);
      g.restore();
    }

    // the coal: a ring of glowing tobacco between the paper and the ash
    const tip = b + coal;
    g.save();
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    g.bezierCurveTo(tip - coal * 0.3, -R * 1.02, tip, -R * 0.6, tip, 0);
    g.bezierCurveTo(tip, R * 0.6, tip - coal * 0.3, R * 1.02, pts[pts.length - 1][0], pts[pts.length - 1][1]);
    for (let i = pts.length - 1; i >= 0; i--) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
    const cg = g.createLinearGradient(b - 0.01 * L, 0, tip, 0);
    cg.addColorStop(0, "#1c0e08");
    cg.addColorStop(0.6, "#2c1d16");
    cg.addColorStop(1, "rgba(60,52,46,0)");
    g.fillStyle = cg;
    g.fill();
    if (hot > 0.02) {
      g.clip();
      g.globalCompositeOperation = "lighter";
      const sx = (now * 0.012) % 40;
      g.globalAlpha = alpha * Math.min(1, hot * 1.25);
      g.drawImage(emberTex, sx, 0, 50, 64, b - 0.015 * L, -R * 1.05, coal + 0.012 * L, 2.1 * R);
      g.globalAlpha = alpha * hot * 0.75;
      g.drawImage(emberTex, 40 - sx, 6, 46, 52, b - 0.01 * L, -R, coal * 0.8, 2 * R);
      // hottest just under the paper's edge
      const core = g.createLinearGradient(b - 0.01 * L, 0, b + coal * 0.6, 0);
      core.addColorStop(0, `rgba(255,120,40,${0.5 * hot * hot})`);
      core.addColorStop(1, "rgba(255,80,20,0)");
      g.globalAlpha = alpha;
      g.fillStyle = core;
      g.fillRect(b - 0.02 * L, -R * 1.1, coal + 0.02 * L, 2.2 * R);
      g.globalCompositeOperation = "source-over";
    }
    g.restore();

    // the paper's burning rim: a thin bright line with a soft one under it
    if (hot > 0.02) {
      g.globalCompositeOperation = "lighter";
      g.lineJoin = "round";
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (const p of pts) g.lineTo(p[0], p[1]);
      g.strokeStyle = `rgba(255,74,20,${0.3 * hot * alpha})`;
      g.lineWidth = Math.max(2, R * 0.24);
      g.stroke();
      g.strokeStyle = `rgba(255,168,92,${0.75 * hot * alpha})`;
      g.lineWidth = Math.max(0.7, R * 0.06);
      g.stroke();
      g.globalCompositeOperation = "source-over";
    }

    // the glow it throws
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const [gx, gy] = toWorld(b + coal * 0.4, 0);
    if (hot > 0.01) {
      g.globalCompositeOperation = "lighter";
      g.globalAlpha = alpha;
      const glow = g.createRadialGradient(gx, gy, 0, gx, gy, R * 6.5);
      glow.addColorStop(0, `rgba(255,120,50,${0.3 * hot})`);
      glow.addColorStop(0.22, `rgba(255,80,30,${0.1 * hot})`);
      glow.addColorStop(1, "rgba(255,60,20,0)");
      g.fillStyle = glow;
      g.fillRect(gx - R * 6.5, gy - R * 6.5, R * 13, R * 13);
      g.globalCompositeOperation = "source-over";
    }
    // the lighter's flame, just off the end, a moment
    if (t < 800) {
      const k = t < 110 ? t / 110 : 1 - smooth(110, 800, t);
      const [fx, fy] = toWorld(L + R * 0.8, R * 0.4);
      g.globalCompositeOperation = "lighter";
      g.globalAlpha = 1;
      const fl = g.createRadialGradient(fx, fy, 0, fx, fy, R * 11);
      fl.addColorStop(0, `rgba(255,190,110,${0.36 * k})`);
      fl.addColorStop(0.3, `rgba(255,140,60,${0.12 * k})`);
      fl.addColorStop(1, "rgba(255,120,40,0)");
      g.fillStyle = fl;
      g.fillRect(fx - R * 11, fy - R * 11, R * 22, R * 22);
      g.globalCompositeOperation = "source-over";
    }
    g.globalAlpha = 1;

    // sparks with the pops
    while (popIndex < pops.length && pops[popIndex] <= t) {
      if (pops[popIndex] > t - 120 && hot > 0.3) {
        const n = rand() < 0.5 ? 1 : 2;
        for (let i = 0; i < n; i++) flecks.push({ x: gx + R * 0.3, y: gy - R * 0.4, vx: (rand() - 0.25) * 110, vy: -(50 + rand() * 120), age: 0, life: 0.25 + rand() * 0.4, size: 1 + rand() * 1.2, seed: 0, hot: true });
      }
      popIndex++;
    }
    const [sx, sy] = toWorld(b + coal * 0.6, -R * 0.7);
    return { gx: sx, gy: sy, b, hot };
  }

  // ---------------------------------------------------------- thin smoke

  const wind = (t: number) => 7 + (t > T.smoke - 150 ? 320 * smooth(T.smoke - 150, T.smoke + 500, t) * (1 - 0.6 * smooth(T.smoke + 900, T.smoke + 2600, t)) : 0);

  function updateWisps(t: number, dt: number, at: { gx: number; gy: number; hot: number } | null) {
    const w = wind(t);
    wisps.forEach((list, k) => {
      if (at && at.hot > 0.05) {
        list.push({ x: at.gx + (k ? R * 0.35 : 0), y: at.gy - (k ? R * 0.2 : 0), vx: (rand() - 0.5) * 3, vy: -(34 + rand() * 8) * (k ? 0.85 : 1), age: 0, seed: k * 2.1 });
      }
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.age += dt;
        if (p.age > 3) {
          list.splice(i, 1);
          continue;
        }
        p.vy -= 16 * dt;
        p.vy *= 1 - 0.2 * dt;
        const sway = Math.sin(p.age * 1.9 + p.seed + p.y * 0.018) * 34 * smooth(0.35, 1.3, p.age);
        p.vx += ((w - p.vx) * 0.9 + sway) * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    });
  }

  function drawWisps(fade: number) {
    if (fade <= 0) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.lineCap = "round";
    const k0 = Math.max(0.6, R / 22);
    for (const list of wisps) {
      for (let i = 1; i < list.length; i++) {
        const a = list[i - 1];
        const p = list[i];
        const k = p.age / 3;
        const al = 0.2 * Math.pow(1 - k, 1.6) * Math.min(1, p.age * 5) * fade;
        if (al < 0.004) continue;
        g.strokeStyle = `rgba(196,198,202,${al * 0.3})`;
        g.lineWidth = (2 + p.age * 8) * k0;
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.lineTo(p.x, p.y);
        g.stroke();
        g.strokeStyle = `rgba(206,207,210,${al})`;
        g.lineWidth = (0.6 + p.age * 1.6) * k0;
        g.stroke();
        // haze where it breaks up
        if (i % 9 === 0 && p.age > 0.9) {
          const r = (6 + p.age * 14) * k0;
          g.globalAlpha = al * 0.3;
          g.drawImage(blob, p.x - r, p.y - r, r * 2, r * 2);
          g.globalAlpha = 1;
        }
      }
    }
  }

  // ---------------------------------------------------------- the breath out

  /** How many puffs the breath is made of (each is a big soft sprite: few, so phones keep up). */
  const PUFFS = 60;
  const cloud: Puff[] = [];
  let emitted = 0;
  let reach = -1e9;
  let nameRect: { x: number; y: number; w: number; h: number } | null = null;

  function updateCloud(t: number, dt: number) {
    const m = Math.min(W, H);
    // the breath: strong at first, trailing off
    const span = 1500;
    const k = clamp((t - T.smoke) / span);
    const want = t < T.smoke ? 0 : Math.round(PUFFS * (1 - Math.pow(1 - k, 1.7)));
    while (emitted < want) {
      const at = emitted / PUFFS;
      const strength = 1 - at * 0.55;
      const ang = -0.06 + (rand() - 0.5) * (0.22 + at * 0.4);
      const v = W * (0.85 + rand() * 0.55) * strength;
      cloud.push({
        x: -m * 0.12,
        y: H * 0.5 + (rand() - 0.5) * H * (0.08 + at * 0.14) + Math.sin(emitted * 0.7) * H * 0.025,
        vx: Math.cos(ang) * v,
        vy: Math.sin(ang) * v,
        r: m * (0.06 + rand() * 0.06),
        grow: m * (0.13 + rand() * 0.15),
        a: 0.13 + rand() * 0.12,
        age: 0,
        life: 3.4 + rand() * 1.8,
        rot: rand() * Math.PI * 2,
        vr: (rand() - 0.5) * 0.7,
        sprite: emitted % 4,
      });
      emitted++;
    }
    const tt = t / 1000;
    const out = t > T.out ? smooth(T.out, T.end, t) : 0;
    let edgeNow = -1e9;
    for (let i = cloud.length - 1; i >= 0; i--) {
      const p = cloud[i];
      p.age += dt;
      if (p.age > p.life) {
        cloud.splice(i, 1);
        continue;
      }
      const drag = Math.exp(-1.15 * dt);
      p.vx *= drag;
      p.vy *= drag;
      // curl and lift
      const ang = 2.4 * (noise(p.x * 0.004 + tt * 0.3, p.y * 0.004) - 0.5) * Math.PI;
      p.vx += Math.cos(ang) * 26 * dt + 18 * dt + out * W * 1.5 * dt;
      p.vy += Math.sin(ang) * 26 * dt - 9 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.r += p.grow * dt * Math.exp(-p.age * 0.45);
      p.rot += p.vr * dt;
      if (p.age > 0.2 && p.age < p.life * 0.7) edgeNow = Math.max(edgeNow, p.x + p.r * 0.2);
    }
    reach = Math.max(reach, edgeNow);
    // never later than this, however slow the frames come
    const floor = -0.1 * W + 1.3 * W * easeOut((t - T.smoke - 150) / 2700);
    reach = Math.max(reach, t > T.smoke ? floor : -1e9);
  }

  function drawCloud(t: number) {
    const s = sScale;
    sg.setTransform(1, 0, 0, 1, 0, 0);
    sg.globalCompositeOperation = "source-over";
    sg.globalAlpha = 1;
    sg.clearRect(0, 0, els.smoke.width, els.smoke.height);
    if (!cloud.length || !puffs.length) return;
    const fade = 1 - smooth(T.out + 200, T.end, t);
    for (const p of cloud) {
      const k = p.age / p.life;
      const a = p.a * Math.min(1, p.age / 0.14) * Math.pow(1 - k, 1.25) * fade;
      if (a < 0.003) continue;
      const speed = Math.hypot(p.vx, p.vy);
      const stretch = 1 + Math.min(0.9, speed / (W * 0.9));
      sg.globalAlpha = a;
      sg.setTransform(s, 0, 0, s, p.x * s, p.y * s);
      sg.rotate(Math.atan2(p.vy, p.vx));
      sg.scale(stretch, 1 / Math.sqrt(stretch));
      sg.rotate(p.rot);
      sg.drawImage(puffs[p.sprite], -p.r, -p.r, p.r * 2, p.r * 2);
    }
    sg.setTransform(1, 0, 0, 1, 0, 0);
    sg.globalAlpha = 1;
    // lit from above, darker underneath
    sg.globalCompositeOperation = "source-atop";
    const v = sg.createLinearGradient(0, 0, 0, els.smoke.height);
    v.addColorStop(0, "rgba(255,252,246,0.12)");
    v.addColorStop(0.5, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.4)");
    sg.fillStyle = v;
    sg.fillRect(0, 0, els.smoke.width, els.smoke.height);
    // the smoke over the name catches its light
    if (nameRect && t > T.reveal - 300) {
      const lit = smooth(T.reveal - 300, T.reveal + 900, t) * fade;
      const cx = (nameRect.x + nameRect.w / 2) * s;
      const cy = (nameRect.y + nameRect.h / 2) * s;
      const rx = nameRect.w * 0.75 * s;
      sg.save();
      sg.translate(cx, cy);
      sg.scale(1, Math.max(0.35, (nameRect.h * 1.6) / (nameRect.w * 1.5)));
      const lg = sg.createRadialGradient(0, 0, 0, 0, 0, rx);
      lg.addColorStop(0, `rgba(255,244,236,${0.55 * lit})`);
      lg.addColorStop(0.5, `rgba(238,226,255,${0.22 * lit})`);
      lg.addColorStop(1, "rgba(220,240,255,0)");
      sg.fillStyle = lg;
      sg.fillRect(-rx, -rx, rx * 2, rx * 2);
      sg.restore();
    }
    sg.globalCompositeOperation = "source-over";
  }

  // ---------------------------------------------------------- per frame

  let lastNow = 0;
  let backDirty = true;
  resize();

  function frame(t: number, now: number) {
    const dt = lastNow ? clamp((now - lastNow) / 1000, 0, 0.05) : 0.016;
    lastNow = now;
    if (t < lastT - 1) {
      // started again (replay): a fresh cigarette
      resetBurn();
      chunks.length = 0;
      flecks.length = 0;
      wisps[0].length = wisps[1].length = 0;
      cloud.length = 0;
      emitted = 0;
      reach = -1e9;
    }
    lastT = t;

    if (t >= T.out) {
      drawBack(t);
      backDirty = true;
    } else if (backDirty) {
      drawBack(-1);
      backDirty = false;
    }

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    g.clearRect(0, 0, els.fg.width, els.fg.height);
    const outFade = 1 - smooth(T.out, T.out + 700, t);
    drawDirt(now, dt, outFade);
    if (t < 0) return -1e9;

    let at: { gx: number; gy: number; hot: number } | null = null;
    if (t < T.exhale + 700) {
      const alpha = smooth(0, 420, t) * (1 - smooth(T.exhale, T.exhale + 650, t));
      at = drawCigarette(t, now, alpha);
    }
    updateFalling(dt);
    drawFalling();
    updateWisps(t, dt, at);
    drawWisps(1 - smooth(T.exhale + 100, T.smoke + 900, t));

    if (t >= T.smoke - 50) {
      makeSmoke();
      updateCloud(t, dt);
    }
    drawCloud(t);
    return reach;
  }

  return {
    frame,
    setPops: (p) => {
      pops = [...p].sort((a, b) => a - b);
      popIndex = 0;
    },
    setName: (r) => {
      nameRect = r;
    },
    resize: () => {
      resize();
      backDirty = true;
    },
    destroy: () => {
      window.clearTimeout(idle);
      chunks.length = 0;
      flecks.length = 0;
      cloud.length = 0;
    },
  };
}
