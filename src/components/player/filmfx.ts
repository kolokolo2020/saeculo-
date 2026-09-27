// Old-film and tape effects for the visualizers, drawn on a 2D canvas.
//
// drawProjector() throws an image (a cover, or a video frame) onto the
// screen like a worn 16 mm print: the frame weaves in the gate, dust and
// hairs flash past, scratches run down the print for a second or two, the
// edges burn in, and the exposure flickers, jumping on the beat.
//
// drawTape() goes over any visualizer, as if it were playing off a VHS:
// the colour channels slip apart (more on the bass), a tracking band rolls
// down the picture and tears it on bass hits, the head-switching noise
// frays the bottom edge, and the deck's on-screen display reads PLAY and
// the tape counter.

let grain: HTMLCanvasElement | null = null;
/** A tile of monochrome noise, made once and shared. */
function grainTile() {
  if (grain) return grain;
  grain = document.createElement("canvas");
  grain.width = grain.height = 128;
  const g = grain.getContext("2d")!;
  const img = g.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return grain;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

// ---- projector ----------------------------------------------------------

interface Scratch {
  x: number;
  life: number;
  alpha: number;
  drift: number;
  light: boolean;
}

export interface ProjectorState {
  /** Gate weave: where the frame sits, and how fast it's moving. */
  wx: number;
  wy: number;
  vx: number;
  vy: number;
  scratches: Scratch[];
  grain: CanvasPattern | null;
}

export const createProjector = (): ProjectorState => ({ wx: 0, wy: 0, vx: 0, vy: 0, scratches: [], grain: null });

function gatePath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

/**
 * One frame of the projected print. `fit` is "contain" for covers (a
 * square thrown onto a dark wall, light spilling round it) and "cover" for
 * video (fills the screen, overscanned so the weave never shows an edge).
 */
export function drawProjector(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  src: CanvasImageSource | null,
  srcW: number,
  srcH: number,
  fit: "contain" | "cover",
  s: ProjectorState,
  opts: { pulse: number; barHit: number; still: boolean },
) {
  const { pulse, barHit, still } = opts;
  if (!still) {
    // a damped random walk, with the odd frame slip
    s.vx += rand(-0.3, 0.3) - s.wx * 0.08;
    s.vy += rand(-0.45, 0.45) - s.wy * 0.08;
    s.vx *= 0.7;
    s.vy *= 0.7;
    s.wx += s.vx;
    s.wy += s.vy;
    if (Math.random() < 0.002) s.wy += rand(4, 9);
  }

  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#060403";
  ctx.fillRect(0, 0, w, h);

  const aw = srcW || 1;
  const ah = srcH || 1;
  const scale = fit === "contain" ? Math.min((w * 0.88) / aw, (h * 0.84) / ah) : Math.max(w / aw, h / ah) * 1.04;
  const iw = aw * scale;
  const ih = ah * scale;
  const x = (w - iw) / 2 + s.wx;
  const y = (h - ih) / 2 + s.wy;
  const cx = x + iw / 2;
  const cy = y + ih / 2;
  const flicker = still ? 0 : rand(-0.045, 0.035);
  const exposure = flicker + pulse * 0.2 * barHit;

  // the beam's light spilling onto the wall round the picture
  if (fit === "contain") {
    const spill = ctx.createRadialGradient(cx, cy, Math.min(iw, ih) * 0.3, cx, cy, Math.max(iw, ih) * 0.95);
    spill.addColorStop(0, `rgba(255, 214, 160, ${0.13 + exposure * 0.4})`);
    spill.addColorStop(1, "rgba(255, 214, 160, 0)");
    ctx.fillStyle = spill;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.save();
  gatePath(ctx, x, y, iw, ih, Math.min(iw, ih) * 0.035);
  ctx.clip();
  if (src) ctx.drawImage(src, x, y, iw, ih);
  else {
    ctx.fillStyle = "#1c140e";
    ctx.fillRect(x, y, iw, ih);
  }
  // an aged print: warm, a little faded
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = "rgb(255, 232, 196)";
  ctx.fillRect(x, y, iw, ih);
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgba(60, 40, 20, 0.08)";
  ctx.fillRect(x, y, iw, ih);

  // exposure: the lamp flickers, and flares on the beat
  if (exposure > 0) {
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = `rgba(255, 236, 205, ${exposure})`;
  } else {
    ctx.fillStyle = `rgba(0, 0, 0, ${-exposure})`;
  }
  ctx.fillRect(x, y, iw, ih);
  ctx.globalCompositeOperation = "source-over";

  // burnt-in edges and a hot spot in the middle
  const burn = ctx.createRadialGradient(cx, cy, Math.min(iw, ih) * 0.28, cx, cy, Math.hypot(iw, ih) * 0.55);
  burn.addColorStop(0, "rgba(255, 244, 220, 0.07)");
  burn.addColorStop(0.55, "rgba(0, 0, 0, 0)");
  burn.addColorStop(1, "rgba(28, 12, 2, 0.85)");
  ctx.fillStyle = burn;
  ctx.fillRect(x, y, iw, ih);

  // grain
  s.grain ??= ctx.createPattern(grainTile(), "repeat");
  if (s.grain) {
    // shift the pattern, not the rect: a new grain every frame
    const gx = rand(0, 128);
    const gy = rand(0, 128);
    ctx.save();
    ctx.translate(gx, gy);
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = s.grain;
    ctx.fillRect(x - gx, y - gy, iw, ih);
    ctx.restore();
  }

  if (!still) {
    // scratches run down the print for a while, drifting
    if (Math.random() < 0.018 && s.scratches.length < 4) {
      s.scratches.push({ x: rand(0.05, 0.95), life: rand(25, 110), alpha: rand(0.12, 0.35), drift: rand(-0.0008, 0.0008), light: Math.random() < 0.7 });
    }
    ctx.lineWidth = 1;
    for (const sc of s.scratches) {
      sc.life--;
      sc.x += sc.drift;
      const sx = x + sc.x * iw + rand(-0.6, 0.6);
      ctx.strokeStyle = sc.light ? `rgba(255, 250, 235, ${sc.alpha})` : `rgba(0, 0, 0, ${sc.alpha * 1.4})`;
      ctx.beginPath();
      ctx.moveTo(sx, y);
      ctx.lineTo(sx + rand(-1, 1), y + ih);
      ctx.stroke();
    }
    s.scratches = s.scratches.filter((sc) => sc.life > 0);

    // dust and hairs, one frame each
    const specks = Math.random() < 0.55 ? Math.floor(rand(0, 5)) : 0;
    for (let i = 0; i < specks; i++) {
      const dark = Math.random() < 0.75;
      ctx.fillStyle = dark ? `rgba(0, 0, 0, ${rand(0.4, 0.8)})` : `rgba(255, 250, 235, ${rand(0.3, 0.6)})`;
      ctx.beginPath();
      ctx.ellipse(x + rand(0, iw), y + rand(0, ih), rand(0.6, 2.4), rand(0.6, 2.4), rand(0, Math.PI), 0, Math.PI * 2);
      ctx.fill();
    }
    if (Math.random() < 0.03) {
      const hx = x + rand(0.1, 0.9) * iw;
      const hy = y + rand(0.1, 0.9) * ih;
      const len = rand(12, 34);
      ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.bezierCurveTo(hx + len * 0.4, hy - len * 0.5, hx + len * 0.7, hy + len * 0.4, hx + len, hy + rand(-8, 8));
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ---- tape ---------------------------------------------------------------

export interface TapeState {
  /** Half-resolution copy of the frame (the colour slip is soft, like VHS chroma). */
  buf: HTMLCanvasElement;
  tint: HTMLCanvasElement;
  /** How torn the tracking band is (0..1), and where it is (0 top … 1 bottom). */
  tear: number;
  tearY: number;
  /** When PLAY was last pressed (ms); the OSD shows PLAY for a few seconds after. */
  playSince: number;
  wasPlaying: boolean;
  noise: CanvasPattern | null;
  scan: CanvasPattern | null;
}

export const createTape = (): TapeState => ({
  buf: document.createElement("canvas"),
  tint: document.createElement("canvas"),
  tear: 0,
  tearY: Math.random(),
  playSince: 0,
  wasPlaying: false,
  noise: null,
  scan: null,
});

let scanTile: HTMLCanvasElement | null = null;
function scanlineTile() {
  if (scanTile) return scanTile;
  scanTile = document.createElement("canvas");
  scanTile.width = 1;
  scanTile.height = 3;
  const g = scanTile.getContext("2d")!;
  g.fillStyle = "rgba(0, 0, 0, 0.3)";
  g.fillRect(0, 0, 1, 1);
  return scanTile;
}

/** The deck's counter: H:MM:SS. */
function counter(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function drawTape(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  w: number,
  h: number,
  s: TapeState,
  opts: { bass: number; pulse: number; playing: boolean; time: number; still: boolean },
) {
  const { bass, pulse, playing, time, still } = opts;
  const W = canvas.width;
  const H = canvas.height;
  const dpr = W / Math.max(1, w);
  const now = performance.now();
  if (playing && !s.wasPlaying) s.playSince = now;
  s.wasPlaying = playing;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  // chroma slip: red one way, cyan the other
  const bw = Math.max(1, W >> 1);
  const bh = Math.max(1, H >> 1);
  if (s.buf.width !== bw || s.buf.height !== bh) {
    s.buf.width = s.tint.width = bw;
    s.buf.height = s.tint.height = bh;
  }
  const b = s.buf.getContext("2d");
  const t = s.tint.getContext("2d");
  if (b && t) {
    b.clearRect(0, 0, bw, bh);
    b.drawImage(canvas, 0, 0, bw, bh);
    const shift = (1.5 + bass * 3 + pulse * 1.5) * dpr;
    for (const [color, dx, alpha] of [
      ["#ff2020", shift, 0.3],
      ["#10d8ff", -shift, 0.22],
    ] as const) {
      t.globalCompositeOperation = "copy";
      t.drawImage(s.buf, 0, 0);
      t.globalCompositeOperation = "multiply";
      t.fillStyle = color;
      t.fillRect(0, 0, bw, bh);
      t.globalCompositeOperation = "destination-in";
      t.drawImage(s.buf, 0, 0);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = alpha;
      ctx.drawImage(s.tint, dx, 0, W, H);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }

  s.noise ??= ctx.createPattern(grainTile(), "repeat");
  const noiseBand = (y: number, bandH: number, alpha: number) => {
    if (!s.noise) return;
    const nx = still ? 0 : rand(0, 128);
    const ny = still ? 0 : rand(0, 128);
    ctx.save();
    ctx.translate(nx, ny);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = s.noise;
    ctx.fillRect(-nx, y - ny, W, bandH);
    ctx.restore();
  };
  /** Shift a horizontal band sideways in a few ragged slices. */
  const tearBand = (y: number, bandH: number, amount: number) => {
    const slices = 5;
    const sh = bandH / slices;
    for (let k = 0; k < slices; k++) {
      const sy = Math.round(y + k * sh);
      const hgt = Math.max(1, Math.round(sh));
      if (sy < 0 || sy + hgt > H) continue;
      ctx.drawImage(canvas, 0, sy, W, hgt, rand(-0.3, 1) * amount, sy, W, hgt);
    }
  };

  // the tracking band rolls down, and tears on a hard bass hit
  if (!still) {
    s.tearY += 0.0022;
    if (s.tearY > 1.15) s.tearY = -0.15;
    if (bass > 0.55 && pulse > 0.8) s.tear = Math.min(1, s.tear + 0.35);
    s.tear *= 0.9;
  }
  const bandH = H * 0.07;
  const bandY = s.tearY * H;
  if (s.tear > 0.04) tearBand(bandY, bandH, s.tear * 26 * dpr);
  noiseBand(bandY, bandH * 0.35, 0.08 + s.tear * 0.45);

  // head-switching noise along the bottom
  const headH = Math.max(4, H * 0.022);
  tearBand(H - headH, headH, 9 * dpr);
  noiseBand(H - headH * 0.6, headH * 0.6, 0.35);

  // scanlines
  s.scan ??= ctx.createPattern(scanlineTile(), "repeat");
  if (s.scan) {
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = s.scan;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  ctx.restore();

  // the on-screen display
  const fs = Math.round(Math.max(12, Math.min(26, h * 0.05)));
  const ox = Math.round(fs * 0.9);
  const oy = Math.round(fs * 0.8);
  const showPlay = !playing || still || now - s.playSince < 4000;
  ctx.save();
  ctx.font = `700 ${fs}px ui-monospace, "Cascadia Mono", Menlo, Consolas, "Courier New", monospace`;
  ctx.textBaseline = "top";
  const osd = (dx: number, color: string) => {
    ctx.fillStyle = color;
    if (showPlay) {
      const gx = ox + dx;
      const gs = fs * 0.78;
      const gy = oy + (fs - gs) / 2;
      ctx.beginPath();
      if (playing) {
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx + gs * 0.85, gy + gs / 2);
        ctx.lineTo(gx, gy + gs);
        ctx.closePath();
      } else {
        ctx.rect(gx, gy, gs * 0.3, gs);
        ctx.rect(gx + gs * 0.52, gy, gs * 0.3, gs);
      }
      ctx.fill();
      ctx.fillText(playing ? "PLAY" : "PAUSE", ox + dx + fs * 1.1, oy);
    }
    ctx.fillText(`SP ${counter(time)}`, ox + dx, oy + fs * 1.35);
  };
  ctx.globalAlpha = 0.6;
  osd(-1.5, "#ff3030");
  osd(1.5, "#20e0ff");
  ctx.globalAlpha = 0.95;
  osd(0, "#f4f6ff");
  ctx.restore();
}
