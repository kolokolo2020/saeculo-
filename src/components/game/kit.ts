// The studio's kit, synthesized (so every sound is ours to use), plus the
// three sounds you can find around the neighbourhood. Everything plays in
// F minor over a four-bar progression, so any pattern sounds like music.

export type Lane = 0 | 1 | 2 | 3;
export const LANE_NAMES = ["Kick", "Snare", "Hat", "Keys"] as const;

export interface SoundDef {
  id: string;
  lane: Lane;
  name: string;
  /** Where it's found; absent for the starting kit. */
  foundAt?: string;
}

export const SOUNDS: SoundDef[] = [
  { id: "kick", lane: 0, name: "dusty kick" },
  { id: "kick808", lane: 0, name: "long 808" },
  { id: "snare", lane: 1, name: "snare" },
  { id: "bottle", lane: 1, name: "bottle", foundAt: "the store" },
  { id: "hat", lane: 2, name: "hat" },
  { id: "rain", lane: 2, name: "rain", foundAt: "the bedroom window" },
  { id: "keys", lane: 3, name: "keys" },
  { id: "phone", lane: 3, name: "phone line", foundAt: "the payphone" },
];

/** The sounds that must be found before they show up in the sampler. */
export const FINDABLE = SOUNDS.filter((s) => s.foundAt).map((s) => s.id);
export const soundById = (id: string) => SOUNDS.find((s) => s.id === id);

// i – VI – iv – v in F minor, voiced close around middle C
export const PROGRESSION = [
  { name: "Fm9", root: 41, notes: [56, 60, 63, 67] },
  { name: "D♭maj7", root: 37, notes: [53, 56, 60, 65] },
  { name: "B♭m9", root: 34, notes: [56, 60, 61, 65] },
  { name: "Cm7", root: 36, notes: [55, 58, 63, 67] },
];

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

let noise: AudioBuffer | null = null;
function noiseBuf(ctx: BaseAudioContext) {
  if (noise && noise.sampleRate === ctx.sampleRate) return noise;
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noise;
}

function env(ctx: BaseAudioContext, out: AudioNode, t: number, peak: number, attack: number, decay: number) {
  const g = ctx.createGain();
  // silent until its moment: a gain node is 1 before its first event
  g.gain.value = 0.0001;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  g.connect(out);
  return g;
}

function osc(ctx: BaseAudioContext, type: OscillatorType, freq: number, t: number, dur: number, into: AudioNode) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.connect(into);
  o.start(t);
  o.stop(t + dur + 0.05);
  return o;
}

function noiseHit(ctx: BaseAudioContext, t: number, dur: number, into: AudioNode, filter: BiquadFilterType, freq: number, q = 0.7) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf(ctx);
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  f.Q.value = q;
  src.connect(f).connect(into);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.05);
  return f;
}

/** Play one hit. `bar` picks the chord; `vel` is 0..1. */
export function playSound(ctx: BaseAudioContext, out: AudioNode, id: string, t: number, bar: number, vel = 1) {
  const chord = PROGRESSION[((bar % 4) + 4) % 4];
  switch (id) {
    case "kick":
    case "kick808": {
      const long = id === "kick808";
      // the punch
      const g = env(ctx, out, t, 0.72 * vel, 0.002, long ? 0.18 : 0.26);
      const o = osc(ctx, "sine", 120, t, 0.35, g);
      o.frequency.exponentialRampToValueAtTime(48, t + 0.09);
      // a sub under it on the chord's root, so the low end follows the changes
      const sub = env(ctx, out, t + 0.01, (long ? 0.55 : 0.3) * vel, 0.02, long ? 1.1 : 0.32);
      const s = osc(ctx, "sine", hz(chord.root + 12) * (long ? 1.02 : 1), t, long ? 1.3 : 0.4, sub);
      if (long) s.frequency.exponentialRampToValueAtTime(hz(chord.root + 12), t + 0.08);
      // a dusty click on top
      noiseHit(ctx, t, 0.02, env(ctx, out, t, 0.12 * vel, 0.001, 0.015), "bandpass", 3000, 1);
      break;
    }
    case "snare": {
      noiseHit(ctx, t, 0.25, env(ctx, out, t, 0.55 * vel, 0.002, 0.2), "bandpass", 1900, 0.6);
      noiseHit(ctx, t, 0.1, env(ctx, out, t, 0.16 * vel, 0.001, 0.07), "highpass", 5000);
      const body = env(ctx, out, t, 0.26 * vel, 0.001, 0.09);
      const o = osc(ctx, "triangle", 210, t, 0.12, body);
      o.frequency.exponentialRampToValueAtTime(160, t + 0.08);
      break;
    }
    case "bottle": {
      // a bottle set down on a counter: glassy partials, tuned to the chord
      const base = hz(chord.notes[2] + 24);
      [1, 2.32, 4.25, 6.8].forEach((r, i) => {
        const g = env(ctx, out, t, (0.2 / (i + 1)) * vel, 0.001, 0.35 - i * 0.06);
        osc(ctx, "sine", base * r, t, 0.4, g);
      });
      noiseHit(ctx, t, 0.03, env(ctx, out, t, 0.18 * vel, 0.001, 0.02), "highpass", 6000);
      const thud = env(ctx, out, t, 0.2 * vel, 0.001, 0.06);
      osc(ctx, "sine", 180, t, 0.08, thud);
      break;
    }
    case "hat": {
      const v = vel * (0.85 + Math.random() * 0.15);
      noiseHit(ctx, t, 0.06, env(ctx, out, t, 0.16 * v, 0.001, 0.045), "highpass", 8200);
      break;
    }
    case "rain": {
      // a few drops on a sill instead of a hat
      for (let i = 0; i < 3; i++) {
        const dt = t + i * 0.011 + Math.random() * 0.008;
        noiseHit(ctx, dt, 0.05, env(ctx, out, dt, (0.3 - i * 0.07) * vel, 0.001, 0.04), "bandpass", 2600 + Math.random() * 3000, 3);
      }
      noiseHit(ctx, t, 0.16, env(ctx, out, t, 0.1 * vel, 0.01, 0.14), "highpass", 5000);
      break;
    }
    case "keys": {
      // electric-piano-ish: sine + a bell partial that fades fast
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(3200, t);
      lp.frequency.exponentialRampToValueAtTime(900, t + 1.2);
      lp.connect(out);
      chord.notes.forEach((n, i) => {
        const at = t + i * 0.009;
        const g = env(ctx, lp, at, 0.085 * vel, 0.006, 1.5);
        osc(ctx, "sine", hz(n), at, 1.6, g);
        const bell = env(ctx, lp, at, 0.03 * vel, 0.002, 0.3);
        osc(ctx, "sine", hz(n) * 4.01, at, 0.35, bell);
        const warm = env(ctx, lp, at, 0.025 * vel, 0.01, 1.2);
        osc(ctx, "triangle", hz(n) / 2, at, 1.3, warm);
      });
      break;
    }
    case "phone": {
      // the same chord, heard down a phone line
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1100;
      bp.Q.value = 0.9;
      const drive = ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = (i / 255) * 2 - 1;
        curve[i] = Math.tanh(x * 3);
      }
      drive.curve = curve;
      const post = ctx.createGain();
      post.gain.value = 0.5;
      drive.connect(bp).connect(post).connect(out);
      chord.notes.forEach((n, i) => {
        const g = env(ctx, drive, t + i * 0.004, 0.12 * vel, 0.004, 0.55);
        osc(ctx, "triangle", hz(n + 12) * (1 + (i % 2 ? 0.004 : -0.004)), t, 0.65, g);
      });
      noiseHit(ctx, t, 0.5, env(ctx, post, t, 0.03 * vel, 0.01, 0.45), "bandpass", 1500);
      break;
    }
  }
}

/** The sampler's output: gentle tape warmth, glue, and a level. */
export function createMaster(ctx: AudioContext): { input: GainNode; output: GainNode } {
  const input = ctx.createGain();
  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) {
    const x = (i / 1023) * 2 - 1;
    curve[i] = Math.tanh(x * 1.4) / Math.tanh(1.4);
  }
  shaper.curve = curve;
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 11000;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.ratio.value = 3;
  comp.attack.value = 0.01;
  comp.release.value = 0.2;
  const output = ctx.createGain();
  output.gain.value = 0.85;
  input.connect(shaper).connect(tone).connect(comp).connect(output);
  return { input, output };
}
