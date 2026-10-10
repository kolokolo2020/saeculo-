import { getAudioContext } from "@/lib/audioContext";

// The intro's sounds, all synthesized: a lighter, the crackle of a
// cigarette smoked down in one long drag, and the breath let out after it.
// Everything goes through one bus so the intro can hush it all at once
// (Skip, Esc, the end), and nothing is left playing after it.

let bus: GainNode | null = null;
let room: ConvolverNode | null = null;
const live = new Set<AudioScheduledSourceNode>();
let noiseBuf: AudioBuffer | null = null;

function noise(ctx: BaseAudioContext) {
  if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
  const n = Math.floor(ctx.sampleRate * 3);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  noiseBuf = buf;
  return buf;
}

/** A small dark room: a short, dull tail. */
function makeRoom(ctx: BaseAudioContext) {
  const len = Math.floor(ctx.sampleRate * 1.4);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      // low-passed noise, so the walls sound soft
      lp += 0.18 * (Math.random() * 2 - 1 - lp);
      d[i] = lp * 2.2 * Math.pow(1 - i / len, 3);
    }
  }
  const c = ctx.createConvolver();
  c.buffer = ir;
  return c;
}

interface Out {
  ctx: BaseAudioContext;
  dry: AudioNode;
  wet: AudioNode;
}

function out(): Out | null {
  try {
    const ctx = getAudioContext();
    if (!bus || !room || bus.context !== ctx) {
      bus = ctx.createGain();
      bus.connect(ctx.destination);
      room = makeRoom(ctx);
      const wet = ctx.createGain();
      wet.gain.value = 0.5;
      room.connect(wet).connect(bus);
    }
    return { ctx, dry: bus, wet: room };
  } catch {
    return null; // no sound, no matter
  }
}

function keep<N extends AudioScheduledSourceNode>(n: N): N {
  live.add(n);
  n.addEventListener("ended", () => live.delete(n));
  return n;
}

/** Fade everything the intro is playing out, then stop and drop it. */
export function hush(seconds = 0.12) {
  const b = bus;
  bus = null;
  room = null;
  if (!b) return;
  const t = b.context.currentTime;
  b.gain.cancelScheduledValues(t);
  b.gain.setValueAtTime(b.gain.value, t);
  b.gain.linearRampToValueAtTime(0, t + seconds);
  for (const n of live) {
    try {
      n.stop(t + seconds + 0.02);
    } catch {
      // already stopped
    }
  }
  live.clear();
  setTimeout(() => b.disconnect(), (seconds + 0.2) * 1000);
}

function src(ctx: BaseAudioContext, buffer: AudioBuffer, at: number, offset = Math.random() * 1.5) {
  const s = keep(ctx.createBufferSource());
  s.buffer = buffer;
  s.loop = true;
  s.start(at, offset);
  return s;
}

function filter(ctx: BaseAudioContext, type: BiquadFilterType, freq: number, q = 0.7) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

// ------------------------------------------------------------ the lighter

/** A flint wheel and the flame catching. */
export function lighter(at = 0) {
  const o = out();
  if (!o) return;
  const { ctx, dry, wet } = o;
  const t = ctx.currentTime + 0.01 + at;
  const buf = noise(ctx);
  // the wheel: a quick run of gritty clicks
  for (let i = 0; i < 6; i++) {
    const tt = t + i * 0.011 + Math.random() * 0.004;
    const s = src(ctx, buf, tt);
    s.stop(tt + 0.008);
    const bp = filter(ctx, "bandpass", 3200 + Math.random() * 3800, 1.6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, tt);
    g.gain.exponentialRampToValueAtTime(0.32 * (1 - i / 7), tt + 0.0008);
    g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.007);
    s.connect(bp).connect(g).connect(dry);
  }
  // the flame: a soft breathy whoomp
  const f0 = t + 0.06;
  const s = src(ctx, buf, f0);
  s.stop(f0 + 0.7);
  const bp = filter(ctx, "bandpass", 700, 0.6);
  bp.frequency.setValueAtTime(500, f0);
  bp.frequency.exponentialRampToValueAtTime(1500, f0 + 0.12);
  bp.frequency.exponentialRampToValueAtTime(800, f0 + 0.6);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, f0);
  g.gain.exponentialRampToValueAtTime(0.16, f0 + 0.05);
  g.gain.exponentialRampToValueAtTime(0.03, f0 + 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, f0 + 0.65);
  s.connect(bp).connect(g);
  g.connect(dry);
  g.connect(wet);
}

// ------------------------------------------------------------ the drag

export interface Handle {
  stop: (seconds?: number) => void;
}

const nothing: Handle = { stop: () => {} };

/**
 * The cigarette burning down: tobacco and paper crackling (a fine crisp
 * texture with louder pops at `pops`, seconds from the start), the hiss of
 * the coal, and the air drawn through the filter. Starts `at` seconds from
 * now and lasts `dur`.
 */
export function burn(at: number, dur: number, pops: number[]): Handle {
  const o = out();
  if (!o) return nothing;
  const { ctx, dry, wet } = o;
  const t0 = ctx.currentTime + at;
  const sr = ctx.sampleRate;
  const total = dur + 0.25;

  // the crackle, written sample by sample: many tiny ticks, denser as the
  // drag gets going, and the pops on top
  const buf = ctx.createBuffer(1, Math.ceil(sr * total), sr);
  const d = buf.getChannelData(0);
  const burst = (time: number, amp: number, tau: number) => {
    const start = Math.floor(time * sr);
    const k = tau * sr;
    const len = Math.min(d.length - start, Math.ceil(k * 6));
    for (let i = 0; i < len; i++) d[start + i] += amp * (Math.random() * 2 - 1) * Math.exp(-i / k);
  };
  const env = (x: number) => Math.min(1, x / 0.25) * Math.min(1, (dur - x) / 0.2 + 0.15);
  for (let x = 0; x < dur; ) {
    const e = Math.max(0.05, env(x));
    x += -Math.log(1 - Math.random()) / (35 + 110 * e);
    if (x >= dur) break;
    burst(x, (0.04 + Math.random() * 0.16) * e, 0.00012 + Math.random() * 0.0005);
  }
  for (const p of pops) {
    if (p < 0 || p > dur) continue;
    burst(p, 0.45 + Math.random() * 0.45, 0.0004 + Math.random() * 0.0012);
    if (Math.random() < 0.4) burst(p + 0.012 + Math.random() * 0.02, 0.25 + Math.random() * 0.3, 0.0003 + Math.random() * 0.0006);
  }
  const crackle = keep(ctx.createBufferSource());
  crackle.buffer = buf;
  const hp = filter(ctx, "highpass", 900, 0.5);
  const cg = ctx.createGain();
  cg.gain.value = 0.55;
  crackle.connect(hp).connect(cg);
  cg.connect(dry);
  const cw = ctx.createGain();
  cw.gain.value = 0.35;
  cg.connect(cw).connect(wet);
  crackle.start(t0);

  // the coal: a thin bright hiss that follows the drag
  const hiss = src(ctx, noise(ctx), t0);
  hiss.stop(t0 + total);
  const hbp = filter(ctx, "bandpass", 5200, 0.6);
  const hg = ctx.createGain();
  hg.gain.setValueAtTime(0.0001, t0);
  hg.gain.exponentialRampToValueAtTime(0.05, t0 + 0.3);
  hg.gain.setValueAtTime(0.05, t0 + dur - 0.35);
  hg.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.1);
  hiss.connect(hbp).connect(hg).connect(dry);

  // the draw: air pulled through the filter, rising with the breath in
  const air = src(ctx, noise(ctx), t0);
  air.stop(t0 + total);
  const abp = filter(ctx, "bandpass", 900, 0.45);
  abp.frequency.setValueAtTime(700, t0);
  abp.frequency.linearRampToValueAtTime(1300, t0 + dur);
  const alp = filter(ctx, "lowpass", 2600, 0.5);
  const ag = ctx.createGain();
  ag.gain.setValueAtTime(0.0001, t0);
  ag.gain.exponentialRampToValueAtTime(0.035, t0 + dur * 0.6);
  ag.gain.exponentialRampToValueAtTime(0.06, t0 + dur - 0.1);
  ag.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.15);
  air.connect(abp).connect(alp).connect(ag).connect(dry);

  const parts = [crackle, hiss, air];
  const gains = [cg, hg, ag];
  return {
    stop: (seconds = 0.15) => {
      const t = ctx.currentTime;
      for (const g of gains) {
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(g.gain.value, t);
        g.gain.linearRampToValueAtTime(0, t + seconds);
      }
      for (const p of parts) {
        try {
          p.stop(t + seconds + 0.02);
        } catch {
          // already stopped
        }
      }
    },
  };
}

// ------------------------------------------------------------ the exhale

/**
 * The breath let out, long and slow: noise through the shape of an open
 * mouth, moving left to right with the smoke.
 */
export function exhale(dur = 1.9): Handle {
  const o = out();
  if (!o) return nothing;
  const { ctx, dry, wet } = o;
  const t0 = ctx.currentTime + 0.02;
  const buf = noise(ctx);
  const s = src(ctx, buf, t0);
  s.stop(t0 + dur + 0.1);

  const mix = ctx.createGain();
  for (const [f, q, lvl] of [
    [480, 1.1, 1],
    [1250, 1.4, 0.75],
    [2600, 2.2, 0.38],
  ] as const) {
    const bp = filter(ctx, "bandpass", f, q);
    bp.frequency.setValueAtTime(f * 1.12, t0);
    bp.frequency.exponentialRampToValueAtTime(f * 0.9, t0 + dur);
    const g = ctx.createGain();
    g.gain.value = lvl;
    s.connect(bp).connect(g).connect(mix);
  }
  const lp = filter(ctx, "lowpass", 4200, 0.4);
  lp.frequency.setValueAtTime(4800, t0);
  lp.frequency.exponentialRampToValueAtTime(1400, t0 + dur);

  // the breath's shape, with a little unsteadiness in it
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(0.9, t0 + 0.14);
  amp.gain.exponentialRampToValueAtTime(0.62, t0 + 0.6);
  amp.gain.exponentialRampToValueAtTime(0.3, t0 + dur * 0.75);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  const wobble = keep(ctx.createOscillator());
  wobble.frequency.value = 5.5;
  const wd = ctx.createGain();
  wd.gain.value = 0.06;
  wobble.connect(wd).connect(amp.gain);
  wobble.start(t0);
  wobble.stop(t0 + dur + 0.1);

  // it travels with the smoke, from the left
  const pan = ctx.createStereoPanner();
  pan.pan.setValueAtTime(-0.65, t0);
  pan.pan.linearRampToValueAtTime(0.45, t0 + dur);

  const level = ctx.createGain();
  level.gain.value = 0.5;
  mix.connect(lp).connect(amp).connect(pan).connect(level);
  level.connect(dry);
  const w = ctx.createGain();
  w.gain.value = 0.4;
  level.connect(w).connect(wet);

  // the push at the start of the breath, low and soft
  const puff = src(ctx, buf, t0);
  puff.stop(t0 + 0.3);
  const plp = filter(ctx, "lowpass", 260, 0.7);
  const pg = ctx.createGain();
  pg.gain.setValueAtTime(0.0001, t0);
  pg.gain.exponentialRampToValueAtTime(0.5, t0 + 0.04);
  pg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
  puff.connect(plp).connect(pg).connect(dry);

  return {
    stop: (seconds = 0.15) => {
      const t = ctx.currentTime;
      level.gain.cancelScheduledValues(t);
      level.gain.setValueAtTime(level.gain.value, t);
      level.gain.linearRampToValueAtTime(0, t + seconds);
    },
  };
}
