import { TRACKS } from "@/data/tracks";
import { SAMPLES } from "@/data/samples";
import analysis from "@/data/trackAnalysis.json";
import { getAudioContext } from "@/lib/audioContext";
import { hz } from "./scales";

// The studio's sound library. Everything except the chops and your own
// samples is synthesized here, from oscillators, filtered noise and
// envelopes, so every sound is ours to use and nothing has to download.
// Each voice plays one hit or note: (ctx, out, time, { vel, midi, dur }).
// Drums are tuned by `midi` around 60; melodic voices play `midi` for `dur`.

export type Kind = "drum" | "melodic";
export type Category = "Kicks" | "Snares & claps" | "Hats" | "Percussion" | "808 & bass" | "Keys" | "Synths" | "Found" | "Chops" | "Your samples";
export const CATEGORIES: Category[] = ["Kicks", "Snares & claps", "Hats", "Percussion", "808 & bass", "Keys", "Synths", "Chops", "Found", "Your samples"];

export interface PlayOpts {
  vel: number;
  midi: number;
  dur: number;
}
type Play = (ctx: BaseAudioContext, out: AudioNode, t: number, o: PlayOpts) => void;

export interface Voice {
  id: string;
  name: string;
  cat: Category;
  kind: Kind;
  play: Play;
  /** Found around the neighbourhood; locked until then. */
  foundAt?: string;
  /** For voices backed by a file: fetch and decode it. */
  load?: () => Promise<void>;
}

// ------------------------------------------------------------ building blocks

let noise: AudioBuffer | null = null;
function noiseBuf(ctx: BaseAudioContext) {
  if (noise && noise.sampleRate === ctx.sampleRate) return noise;
  noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noise;
}

/** A percussive envelope: silent until `t`, up in `a`, down over `d`. */
function perc(ctx: BaseAudioContext, out: AudioNode, t: number, peak: number, a: number, d: number) {
  const g = ctx.createGain();
  g.gain.value = 0.0001;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  g.connect(out);
  return g;
}

/** A held envelope for notes: attack, decay to sustain, hold for `dur`, release. */
function held(ctx: BaseAudioContext, out: AudioNode, t: number, peak: number, a: number, d: number, s: number, dur: number, r: number) {
  const g = ctx.createGain();
  g.gain.value = 0;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.setTargetAtTime(peak * s, t + a, Math.max(0.01, d / 3));
  const end = t + Math.max(dur, a);
  g.gain.setTargetAtTime(0, end, Math.max(0.01, r / 3));
  g.connect(out);
  return { g, stopAt: end + r * 1.6 + 0.05 };
}

function osc(ctx: BaseAudioContext, type: OscillatorType, freq: number, t: number, stop: number, into: AudioNode, detune = 0) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.detune.value = detune;
  o.connect(into);
  o.start(t);
  o.stop(stop);
  return o;
}

function noiseSrc(ctx: BaseAudioContext, t: number, stop: number, into: AudioNode) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf(ctx);
  src.loop = true;
  src.connect(into);
  src.start(t, Math.random() * 1.5);
  src.stop(stop);
  return src;
}

function filter(ctx: BaseAudioContext, type: BiquadFilterType, freq: number, q = 0.7, into?: AudioNode) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  if (into) f.connect(into);
  return f;
}

const curves = new Map<number, Float32Array<ArrayBuffer>>();
function drive(ctx: BaseAudioContext, amount: number, into: AudioNode) {
  let c = curves.get(amount);
  if (!c) {
    c = new Float32Array(512);
    for (let i = 0; i < 512; i++) {
      const x = (i / 511) * 2 - 1;
      c[i] = Math.tanh(x * amount) / Math.tanh(amount);
    }
    curves.set(amount, c);
  }
  const w = ctx.createWaveShaper();
  w.curve = c;
  // the curve normalises to full scale: bring it back to the voice's level
  const trim = ctx.createGain();
  trim.gain.value = 0.72;
  w.connect(trim).connect(into);
  return w;
}

const tune = (midi: number) => Math.pow(2, (midi - 60) / 12);

// ------------------------------------------------------------ drums

function kick(p: { f0: number; f1: number; pd: number; dec: number; click: number; drv?: number; lvl?: number }): Play {
  return (ctx, out, t, { vel, midi }) => {
    const k = tune(midi);
    const dest = p.drv ? drive(ctx, p.drv, out) : out;
    const g = perc(ctx, dest, t, (p.lvl ?? 0.75) * vel, 0.002, p.dec);
    const o = osc(ctx, "sine", p.f0 * k, t, t + p.dec + 0.1, g);
    o.frequency.exponentialRampToValueAtTime(p.f1 * k, t + p.pd);
    if (p.click) {
      const cg = perc(ctx, out, t, p.click * vel, 0.001, 0.012);
      noiseSrc(ctx, t, t + 0.03, filter(ctx, "bandpass", 3500 * k, 1, cg));
    }
  };
}

function snare(p: { tone: number; bp: number; dec: number; body?: number; crack?: number; lp?: number; lvl?: number }): Play {
  return (ctx, out, t, { vel, midi }) => {
    const k = tune(midi);
    const dest = p.lp ? filter(ctx, "lowpass", p.lp, 0.7, out) : out;
    const lvl = (p.lvl ?? 0.5) * vel;
    noiseSrc(ctx, t, t + p.dec + 0.05, filter(ctx, "bandpass", p.bp * k, 0.6, perc(ctx, dest, t, lvl, 0.002, p.dec)));
    if (p.crack) noiseSrc(ctx, t, t + 0.08, filter(ctx, "highpass", 5000, 0.7, perc(ctx, dest, t, p.crack * vel, 0.001, 0.06)));
    if (p.body !== 0) {
      const o = osc(ctx, "triangle", p.tone * k, t, t + 0.15, perc(ctx, dest, t, (p.body ?? 0.5) * lvl, 0.001, 0.1));
      o.frequency.exponentialRampToValueAtTime(p.tone * 0.78 * k, t + 0.08);
    }
  };
}

function clap(p: { bursts: number; gap: number; tail: number; bp: number; lvl?: number }): Play {
  return (ctx, out, t, { vel, midi }) => {
    const k = tune(midi);
    const boost = ctx.createGain();
    boost.gain.value = 2.2;
    boost.connect(out);
    const bp = filter(ctx, "bandpass", p.bp * k, 1.1, boost);
    for (let i = 0; i < p.bursts; i++) {
      const at = t + i * p.gap;
      const last = i === p.bursts - 1;
      noiseSrc(ctx, at, at + (last ? p.tail : 0.02) + 0.05, perc(ctx, bp, at, (p.lvl ?? 0.6) * vel, 0.001, last ? p.tail : 0.012));
    }
  };
}

const METAL = [205.3, 304.4, 369.6, 522.7, 540, 800];
function hat(p: { dec: number; hp: number; metal?: boolean; lp?: number; attack?: number; lvl?: number }): Play {
  return (ctx, out, t, { vel, midi }) => {
    const k = tune(midi);
    const v = vel * (0.9 + Math.random() * 0.1);
    let dest: AudioNode = out;
    if (p.lp) dest = filter(ctx, "lowpass", p.lp, 0.7, dest);
    const g = perc(ctx, filter(ctx, "highpass", p.hp * k, 0.8, dest), t, (p.lvl ?? 0.22) * v, p.attack ?? 0.001, p.dec);
    if (p.metal) {
      const tame = ctx.createGain();
      tame.gain.value = 0.28;
      tame.connect(g);
      const bp = filter(ctx, "bandpass", 10000 * k, 0.8, tame);
      for (const f of METAL) osc(ctx, "square", f * 1.6 * k, t, t + p.dec + 0.05, bp);
    } else noiseSrc(ctx, t, t + p.dec + 0.05, g);
  };
}

function tom(p: { f0: number; f1: number; dec: number; noise?: number; lvl?: number }): Play {
  return (ctx, out, t, { vel, midi }) => {
    const k = tune(midi);
    const o = osc(ctx, "sine", p.f0 * k, t, t + p.dec + 0.1, perc(ctx, out, t, (p.lvl ?? 0.6) * vel, 0.002, p.dec));
    o.frequency.exponentialRampToValueAtTime(p.f1 * k, t + p.dec * 0.6);
    if (p.noise) noiseSrc(ctx, t, t + 0.04, filter(ctx, "bandpass", 2500 * k, 1, perc(ctx, out, t, p.noise * vel, 0.001, 0.02)));
  };
}

const rim: Play = (ctx, out, t, { vel, midi }) => {
  const k = tune(midi);
  osc(ctx, "triangle", 1700 * k, t, t + 0.05, perc(ctx, out, t, 0.35 * vel, 0.001, 0.035));
  noiseSrc(ctx, t, t + 0.03, filter(ctx, "bandpass", 3000 * k, 2, perc(ctx, out, t, 0.25 * vel, 0.001, 0.02)));
};

const cowbell: Play = (ctx, out, t, { vel, midi }) => {
  const k = tune(midi);
  const bp = filter(ctx, "bandpass", 900 * k, 2, perc(ctx, out, t, 0.3 * vel, 0.002, 0.28));
  osc(ctx, "square", 540 * k, t, t + 0.35, bp);
  osc(ctx, "square", 800 * k, t, t + 0.35, bp);
};

const woodblock: Play = (ctx, out, t, { vel, midi }) => {
  const k = tune(midi);
  osc(ctx, "sine", 1050 * k, t, t + 0.08, perc(ctx, out, t, 0.45 * vel, 0.001, 0.05));
  osc(ctx, "sine", 2400 * k, t, t + 0.04, perc(ctx, out, t, 0.12 * vel, 0.001, 0.02));
};

const tambourine: Play = (ctx, out, t, { vel, midi }) => {
  const k = tune(midi);
  for (let i = 0; i < 3; i++) {
    const at = t + i * 0.012;
    noiseSrc(ctx, at, at + 0.2, filter(ctx, "bandpass", 7500 * k, 3, perc(ctx, out, at, (0.22 - i * 0.05) * vel, 0.001, 0.14)));
  }
};

function cymbal(p: { dec: number; hp: number; bell?: number; lvl?: number }): Play {
  return (ctx, out, t, { vel, midi }) => {
    const k = tune(midi);
    const g = perc(ctx, filter(ctx, "highpass", p.hp * k, 0.7, out), t, (p.lvl ?? 0.16) * vel, 0.003, p.dec);
    const bp = filter(ctx, "bandpass", 8000 * k, 0.5, g);
    for (const f of METAL) osc(ctx, "square", f * 2.1 * k, t, t + p.dec + 0.05, bp);
    noiseSrc(ctx, t, t + p.dec + 0.05, g);
    if (p.bell) osc(ctx, "sine", 3100 * k, t, t + 0.8, perc(ctx, out, t, p.bell * vel, 0.002, 0.6));
  };
}

const vinylPop: Play = (ctx, out, t, { vel }) => {
  noiseSrc(ctx, t, t + 0.02, filter(ctx, "bandpass", 1800, 1.5, perc(ctx, out, t, 0.5 * vel, 0.0005, 0.008)));
  for (let i = 0; i < 6; i++) {
    const at = t + 0.02 + Math.random() * 0.3;
    noiseSrc(ctx, at, at + 0.01, filter(ctx, "highpass", 3000, 1, perc(ctx, out, at, 0.08 * vel, 0.0005, 0.004)));
  }
};

// ------------------------------------------------------------ 808s and bass

function eight08(p: { from: number; glide: number; drv?: number; lp?: number; lvl?: number }): Play {
  return (ctx, out, t, { vel, midi, dur }) => {
    let dest: AudioNode = out;
    if (p.lp) dest = filter(ctx, "lowpass", p.lp, 0.8, dest);
    if (p.drv) dest = drive(ctx, p.drv, dest);
    const len = Math.min(3, dur + 0.35);
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime((p.lvl ?? 0.62) * vel, t + 0.004);
    g.gain.setTargetAtTime(0.0001, t + Math.max(0.05, dur * 0.8), 0.18);
    g.connect(dest);
    const o = osc(ctx, "sine", hz(midi + p.from), t, t + len + 0.6, g);
    o.frequency.exponentialRampToValueAtTime(hz(midi), t + p.glide);
    // a touch of second harmonic so it reads on small speakers
    const h = ctx.createGain();
    h.gain.value = 0.18;
    h.connect(g);
    const o2 = osc(ctx, "sine", hz(midi + 12 + p.from), t, t + len + 0.6, h);
    o2.frequency.exponentialRampToValueAtTime(hz(midi + 12), t + p.glide);
  };
}

const sub: Play = (ctx, out, t, { vel, midi, dur }) => {
  const { g, stopAt } = held(ctx, out, t, 0.55 * vel, 0.01, 0.1, 0.9, dur, 0.08);
  osc(ctx, "sine", hz(midi), t, stopAt, g);
};

const synthBass: Play = (ctx, out, t, { vel, midi, dur }) => {
  const { g, stopAt } = held(ctx, out, t, 0.3 * vel, 0.005, 0.2, 0.6, dur, 0.08);
  const lp = filter(ctx, "lowpass", 1800, 4, g);
  lp.frequency.setValueAtTime(1800, t);
  lp.frequency.exponentialRampToValueAtTime(320, t + 0.25);
  osc(ctx, "sawtooth", hz(midi), t, stopAt, lp);
  osc(ctx, "square", hz(midi - 12), t, stopAt, lp);
};

// ------------------------------------------------------------ keys

const rhodes: Play = (ctx, out, t, { vel, midi, dur }) => {
  const lp = filter(ctx, "lowpass", 3200, 0.7, out);
  lp.frequency.setValueAtTime(3200, t);
  lp.frequency.setTargetAtTime(900, t, 0.4);
  const { g, stopAt } = held(ctx, lp, t, 0.2 * vel, 0.006, 1.4, 0.35, dur, 0.35);
  osc(ctx, "sine", hz(midi), t, stopAt, g);
  const warm = ctx.createGain();
  warm.gain.value = 0.3;
  warm.connect(g);
  osc(ctx, "triangle", hz(midi - 12), t, stopAt, warm);
  osc(ctx, "sine", hz(midi) * 4.01, t, t + 0.4, perc(ctx, lp, t, 0.06 * vel, 0.002, 0.3));
};

const PIANO_PARTIALS = [1, 0.45, 0.25, 0.12, 0.06];
const piano: Play = (ctx, out, t, { vel, midi, dur }) => {
  const decay = Math.max(0.6, 2.4 - (midi - 48) * 0.03);
  const { g, stopAt } = held(ctx, out, t, 0.2 * vel, 0.003, decay, 0.05, Math.min(dur, decay), 0.25);
  PIANO_PARTIALS.forEach((a, i) => {
    const n = i + 1;
    const pg = ctx.createGain();
    pg.gain.value = a;
    pg.connect(g);
    osc(ctx, "sine", hz(midi) * n * (1 + 0.0004 * n * n), t, stopAt, pg);
  });
  noiseSrc(ctx, t, t + 0.03, filter(ctx, "bandpass", 2400, 1, perc(ctx, out, t, 0.04 * vel, 0.001, 0.02)));
};

const ORGAN = [
  [0.5, 0.3],
  [1, 0.6],
  [2, 0.45],
  [3, 0.22],
  [4, 0.18],
];
const organ: Play = (ctx, out, t, { vel, midi, dur }) => {
  const { g, stopAt } = held(ctx, out, t, 0.13 * vel, 0.01, 0.1, 1, dur, 0.08);
  // a slow tremolo, like a rotating speaker
  const trem = ctx.createGain();
  trem.gain.value = 1;
  trem.connect(g);
  const depth = ctx.createGain();
  depth.gain.value = 0.12;
  depth.connect(trem.gain);
  osc(ctx, "sine", 6, t, stopAt, depth);
  for (const [r, a] of ORGAN) {
    const pg = ctx.createGain();
    pg.gain.value = a;
    pg.connect(trem);
    osc(ctx, "sine", hz(midi) * r, t, stopAt, pg);
  }
};

const musicBox: Play = (ctx, out, t, { vel, midi }) => {
  const f = hz(midi + 12);
  osc(ctx, "sine", f, t, t + 1.3, perc(ctx, out, t, 0.2 * vel, 0.002, 1.1));
  osc(ctx, "sine", f * 3, t, t + 0.5, perc(ctx, out, t, 0.05 * vel, 0.001, 0.35));
};

const bell: Play = (ctx, out, t, { vel, midi }) => {
  const f = hz(midi);
  const g = perc(ctx, out, t, 0.2 * vel, 0.002, 1.8);
  const car = osc(ctx, "sine", f, t, t + 2, g);
  const mod = ctx.createOscillator();
  mod.frequency.value = f * 3.5;
  const idx = ctx.createGain();
  idx.gain.setValueAtTime(f * 2.2, t);
  idx.gain.exponentialRampToValueAtTime(1, t + 1.2);
  mod.connect(idx).connect(car.frequency);
  mod.start(t);
  mod.stop(t + 2);
};

// ------------------------------------------------------------ synths

function stack(p: { waves: [OscillatorType, number, number][]; lp: number; q?: number; a: number; d: number; s: number; r: number; lvl: number; vib?: number; formants?: number[] }): Play {
  return (ctx, out, t, { vel, midi, dur }) => {
    const { g, stopAt } = held(ctx, out, t, p.lvl * vel, p.a, p.d, p.s, dur, p.r);
    let into: AudioNode;
    if (p.formants) {
      const sum = ctx.createGain();
      sum.gain.value = 1;
      for (const f of p.formants) sum.connect(filter(ctx, "bandpass", f, 7, g));
      into = sum;
    } else into = filter(ctx, "lowpass", p.lp, p.q ?? 0.7, g);
    const oscs = p.waves.map(([type, detune, level]) => {
      const lg = ctx.createGain();
      lg.gain.value = level;
      lg.connect(into);
      return osc(ctx, type, hz(midi), t, stopAt, lg, detune);
    });
    if (p.vib) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 5.2;
      const depth = ctx.createGain();
      depth.gain.value = 0;
      depth.gain.setValueAtTime(0, t);
      depth.gain.linearRampToValueAtTime(p.vib, t + 0.35);
      lfo.connect(depth);
      for (const o of oscs) depth.connect(o.detune);
      lfo.start(t);
      lfo.stop(stopAt);
    }
  };
}

const pluck: Play = (ctx, out, t, { vel, midi, dur }) => {
  const g = perc(ctx, out, t, 0.24 * vel, 0.002, Math.min(0.9, 0.35 + dur));
  const lp = filter(ctx, "lowpass", 4000, 2, g);
  lp.frequency.setValueAtTime(4200, t);
  lp.frequency.exponentialRampToValueAtTime(280, t + 0.28);
  osc(ctx, "sawtooth", hz(midi), t, t + 1.2, lp);
  osc(ctx, "square", hz(midi), t, t + 1.2, lp, 7);
};

const flute: Play = (ctx, out, t, { vel, midi, dur }) => {
  const { g, stopAt } = held(ctx, out, t, 0.2 * vel, 0.07, 0.2, 0.85, dur, 0.12);
  osc(ctx, "sine", hz(midi), t, stopAt, g);
  const t2 = ctx.createGain();
  t2.gain.value = 0.12;
  t2.connect(g);
  osc(ctx, "triangle", hz(midi) * 2, t, stopAt, t2);
  const breath = ctx.createGain();
  breath.gain.value = 0.25;
  breath.connect(g);
  noiseSrc(ctx, t, stopAt, filter(ctx, "bandpass", hz(midi), 6, breath));
};

// ------------------------------------------------------------ found sounds

const rain: Play = (ctx, out, t, { vel }) => {
  for (let i = 0; i < 3; i++) {
    const at = t + i * 0.011 + Math.random() * 0.008;
    noiseSrc(ctx, at, at + 0.06, filter(ctx, "bandpass", 2600 + Math.random() * 3000, 3, perc(ctx, out, at, (0.3 - i * 0.07) * vel, 0.001, 0.04)));
  }
  noiseSrc(ctx, t, t + 0.2, filter(ctx, "highpass", 5000, 0.7, perc(ctx, out, t, 0.1 * vel, 0.01, 0.14)));
};

const bottle: Play = (ctx, out, t, { vel, midi }) => {
  const base = hz(midi + 24);
  [1, 2.32, 4.25, 6.8].forEach((r, i) => osc(ctx, "sine", base * r, t, t + 0.4, perc(ctx, out, t, (0.2 / (i + 1)) * vel, 0.001, 0.35 - i * 0.06)));
  noiseSrc(ctx, t, t + 0.04, filter(ctx, "highpass", 6000, 0.7, perc(ctx, out, t, 0.18 * vel, 0.001, 0.02)));
  osc(ctx, "sine", 180, t, t + 0.1, perc(ctx, out, t, 0.2 * vel, 0.001, 0.06));
};

const phone: Play = (ctx, out, t, { vel, midi, dur }) => {
  const post = ctx.createGain();
  post.gain.value = 0.55;
  post.connect(out);
  const bp = filter(ctx, "bandpass", 1100, 0.9, post);
  const d = drive(ctx, 3, bp);
  const { g, stopAt } = held(ctx, d, t, 0.3 * vel, 0.004, 0.3, 0.5, dur, 0.1);
  osc(ctx, "triangle", hz(midi + 12), t, stopAt, g, -6);
  osc(ctx, "triangle", hz(midi + 12), t, stopAt, g, 6);
  noiseSrc(ctx, t, stopAt, filter(ctx, "bandpass", 1500, 1, perc(ctx, post, t, 0.03 * vel, 0.01, Math.max(0.2, dur))));
};

const lighter: Play = (ctx, out, t, { vel }) => {
  noiseSrc(ctx, t, t + 0.02, filter(ctx, "bandpass", 5200, 3, perc(ctx, out, t, 0.7 * vel, 0.0005, 0.012)));
  noiseSrc(ctx, t + 0.035, t + 0.06, filter(ctx, "bandpass", 4200, 3, perc(ctx, out, t + 0.035, 0.25 * vel, 0.0005, 0.01)));
  noiseSrc(ctx, t + 0.05, t + 0.35, filter(ctx, "bandpass", 900, 0.8, perc(ctx, out, t + 0.05, 0.07 * vel, 0.03, 0.25)));
};

// ------------------------------------------------------------ files: chops and your samples

const buffers = new Map<string, AudioBuffer>();
const loading = new Map<string, Promise<AudioBuffer | null>>();

function loadFile(url: string): Promise<AudioBuffer | null> {
  const hit = buffers.get(url);
  if (hit) return Promise.resolve(hit);
  let p = loading.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((b) => getAudioContext().decodeAudioData(b))
      .then((buf) => {
        buffers.set(url, buf);
        return buf;
      })
      .catch(() => {
        loading.delete(url);
        return null;
      });
    loading.set(url, p);
  }
  return p;
}

function playBuffer(ctx: BaseAudioContext, out: AudioNode, t: number, buf: AudioBuffer, start: number, len: number, rate: number, lvl: number) {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  const g = ctx.createGain();
  const real = len / rate;
  g.gain.value = 0;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(lvl, t + 0.004);
  g.gain.setValueAtTime(lvl, t + Math.max(0.005, real - 0.02));
  g.gain.linearRampToValueAtTime(0, t + real);
  src.connect(g).connect(out);
  src.start(t, Math.max(0, start), len + 0.01);
}

const SLICES = 8;
const chopVoices: Voice[] = TRACKS.flatMap((track) => {
  const a = (analysis as Record<string, { tempo?: number; beatOffset?: number } | undefined>)[track.id];
  const tempo = a?.tempo ?? track.bpm ?? 120;
  const beat = 60 / tempo;
  // half-bar slices from bar 16 on: past the intro, into the body of the track
  const first = (a?.beatOffset ?? 0) + 16 * 4 * beat;
  const len = 2 * beat;
  const load = async () => {
    await loadFile(track.src);
  };
  return Array.from({ length: SLICES }, (_, i) => ({
    id: `chop:${track.id}:${i + 1}`,
    name: `${track.title} ${i + 1}`,
    cat: "Chops" as Category,
    kind: "drum" as Kind,
    load,
    play: ((ctx, out, t, { vel, midi }) => {
      const buf = buffers.get(track.src);
      if (buf) playBuffer(ctx, out, t, buf, first + i * len, len, tune(midi), 0.8 * vel);
    }) as Play,
  }));
});

const sampleVoices: Voice[] = SAMPLES.map((s) => ({
  id: `sample:${s.id}`,
  name: s.name,
  cat: "Your samples" as Category,
  kind: "drum" as Kind,
  load: async () => {
    await loadFile(s.file);
  },
  play: ((ctx, out, t, { vel, midi }) => {
    const buf = buffers.get(s.file);
    if (buf) playBuffer(ctx, out, t, buf, 0, buf.duration, tune(midi), 0.8 * vel);
  }) as Play,
}));

// ------------------------------------------------------------ the library

const d = (id: string, name: string, cat: Category, play: Play, foundAt?: string): Voice => ({ id, name, cat, kind: "drum", play, foundAt });
const m = (id: string, name: string, cat: Category, play: Play, foundAt?: string): Voice => ({ id, name, cat, kind: "melodic", play, foundAt });

export const VOICES: Voice[] = [
  d("kick-dusty", "dusty kick", "Kicks", kick({ f0: 120, f1: 48, pd: 0.09, dec: 0.3, click: 0.12 })),
  d("kick-boom", "boom kick", "Kicks", kick({ f0: 95, f1: 42, pd: 0.12, dec: 0.55, click: 0.05, lvl: 0.8 })),
  d("kick-punch", "punch kick", "Kicks", kick({ f0: 160, f1: 55, pd: 0.05, dec: 0.22, click: 0.25, drv: 2, lvl: 0.7 })),
  d("kick-soft", "soft kick", "Kicks", kick({ f0: 90, f1: 50, pd: 0.08, dec: 0.25, click: 0, lvl: 0.72 })),
  d("kick-thud", "lofi thud", "Kicks", kick({ f0: 75, f1: 40, pd: 0.06, dec: 0.2, click: 0.08, drv: 3, lvl: 0.7 })),
  d("kick-trap", "trap kick", "Kicks", kick({ f0: 180, f1: 50, pd: 0.04, dec: 0.4, click: 0.3, drv: 1.5, lvl: 0.7 })),
  d("kick-tight", "tight kick", "Kicks", kick({ f0: 140, f1: 60, pd: 0.03, dec: 0.12, click: 0.2, lvl: 0.75 })),
  d("kick-long", "long kick", "Kicks", kick({ f0: 110, f1: 38, pd: 0.15, dec: 0.9, click: 0.08, drv: 1.2, lvl: 0.7 })),

  d("snare-classic", "classic snare", "Snares & claps", snare({ tone: 190, bp: 1900, dec: 0.2, crack: 0.15, lvl: 0.55 })),
  d("snare-crack", "crack snare", "Snares & claps", snare({ tone: 230, bp: 3000, dec: 0.15, crack: 0.3, lvl: 0.5 })),
  d("snare-lofi", "lofi snare", "Snares & claps", snare({ tone: 170, bp: 1400, dec: 0.25, lp: 3000, lvl: 0.6 })),
  d("snare-trap", "trap snare", "Snares & claps", snare({ tone: 200, bp: 2500, dec: 0.12, crack: 0.25, body: 0.35, lvl: 0.55 })),
  d("snare-brush", "brush", "Snares & claps", snare({ tone: 200, bp: 4000, dec: 0.35, body: 0, lvl: 0.3 })),
  d("snare-rim", "rimshot", "Snares & claps", snare({ tone: 330, bp: 2200, dec: 0.08, crack: 0.2, body: 0.8, lvl: 0.5 })),
  d("clap", "clap", "Snares & claps", clap({ bursts: 3, gap: 0.011, tail: 0.14, bp: 1200 })),
  d("clap-big", "big clap", "Snares & claps", clap({ bursts: 4, gap: 0.014, tail: 0.3, bp: 1000, lvl: 0.55 })),
  d("snap", "finger snap", "Snares & claps", clap({ bursts: 1, gap: 0, tail: 0.05, bp: 2400, lvl: 0.7 })),

  d("hat-tight", "tight hat", "Hats", hat({ dec: 0.04, hp: 8200 })),
  d("hat-dusty", "dusty hat", "Hats", hat({ dec: 0.06, hp: 6000, lp: 9000, lvl: 0.26 })),
  d("hat-808", "808 hat", "Hats", hat({ dec: 0.05, hp: 7000, metal: true, lvl: 0.3 })),
  d("hat-pedal", "pedal hat", "Hats", hat({ dec: 0.08, hp: 5500, metal: true, lvl: 0.22 })),
  d("shaker", "shaker", "Hats", hat({ dec: 0.07, hp: 5000, attack: 0.015, lvl: 0.2 })),
  d("ohat", "open hat", "Hats", hat({ dec: 0.35, hp: 7000, lvl: 0.18 })),
  d("ohat-808", "808 open hat", "Hats", hat({ dec: 0.4, hp: 6500, metal: true, lvl: 0.22 })),
  d("ohat-sizzle", "sizzle", "Hats", hat({ dec: 0.6, hp: 9000, lvl: 0.12 })),

  d("rim", "rim", "Percussion", rim),
  d("cowbell", "cowbell", "Percussion", cowbell),
  d("woodblock", "woodblock", "Percussion", woodblock),
  d("tom-low", "low tom", "Percussion", tom({ f0: 120, f1: 80, dec: 0.4 })),
  d("tom-high", "high tom", "Percussion", tom({ f0: 180, f1: 125, dec: 0.32 })),
  d("conga", "conga", "Percussion", tom({ f0: 360, f1: 300, dec: 0.18, noise: 0.15, lvl: 0.5 })),
  d("tambourine", "tambourine", "Percussion", tambourine),
  d("crash", "crash", "Percussion", cymbal({ dec: 1.6, hp: 4000 })),
  d("ride", "ride", "Percussion", cymbal({ dec: 1.1, hp: 6000, bell: 0.08, lvl: 0.12 })),
  d("vinyl-pop", "vinyl pop", "Percussion", vinylPop),

  m("808-clean", "808 clean", "808 & bass", eight08({ from: 12, glide: 0.03 })),
  m("808-dirty", "808 dirty", "808 & bass", eight08({ from: 12, glide: 0.03, drv: 4, lp: 1400, lvl: 0.5 })),
  m("808-glide", "808 glide", "808 & bass", eight08({ from: 5, glide: 0.12 })),
  m("sub", "sub bass", "808 & bass", sub),
  m("synth-bass", "synth bass", "808 & bass", synthBass),

  m("rhodes", "rhodes", "Keys", rhodes),
  m("piano", "piano", "Keys", piano),
  m("organ", "organ", "Keys", organ),
  m("music-box", "music box", "Keys", musicBox),
  m("bell", "bell", "Keys", bell),

  m("pad", "warm pad", "Synths", stack({ waves: [["sawtooth", -8, 0.4], ["sawtooth", 8, 0.4], ["sawtooth", 0, 0.3]], lp: 1300, a: 0.35, d: 0.4, s: 0.8, r: 0.9, lvl: 0.17 })),
  m("strings", "strings", "Synths", stack({ waves: [["sawtooth", -12, 0.3], ["sawtooth", 12, 0.3], ["sawtooth", -4, 0.3], ["sawtooth", 5, 0.3]], lp: 2600, a: 0.18, d: 0.3, s: 0.85, r: 0.5, lvl: 0.16, vib: 8 })),
  m("choir", "choir", "Synths", stack({ waves: [["sawtooth", -6, 0.5], ["sawtooth", 6, 0.5]], lp: 0, a: 0.25, d: 0.3, s: 0.9, r: 0.6, lvl: 0.55, vib: 10, formants: [730, 1090, 2440] })),
  m("pluck", "pluck", "Synths", pluck),
  m("lead", "lead", "Synths", stack({ waves: [["square", 0, 0.4], ["sawtooth", 5, 0.3]], lp: 3000, a: 0.01, d: 0.2, s: 0.7, r: 0.12, lvl: 0.2, vib: 14 })),
  m("flute", "flute", "Synths", flute),

  d("rain", "rain on the sill", "Found", rain, "the bedroom window"),
  d("bottle", "bottle", "Found", bottle, "the store"),
  m("phone", "phone line", "Found", phone, "the payphone"),
  d("lighter", "lighter", "Found", lighter, "the bench"),

  ...chopVoices,
  ...sampleVoices,
];

const byId = new Map(VOICES.map((v) => [v.id, v]));
export const voiceById = (id: string) => byId.get(id);

/** Load whatever file-backed voices these ids need (chops, your samples). */
export async function ensureLoaded(ids: Iterable<string>) {
  const jobs = new Set<Promise<void>>();
  for (const id of ids) {
    const v = byId.get(id);
    if (v?.load) jobs.add(v.load());
  }
  await Promise.all(jobs);
}

/** Play a voice by id; unknown ids are silent. */
export function playVoice(ctx: BaseAudioContext, out: AudioNode, id: string, t: number, o: Partial<PlayOpts> = {}) {
  const v = byId.get(id);
  if (!v) return;
  v.play(ctx, out, t, { vel: o.vel ?? 1, midi: o.midi ?? 60, dur: o.dur ?? 0.4 });
}

/** Findable sounds, for the game. */
export const FINDABLE = VOICES.filter((v) => v.foundAt).map((v) => v.id);
