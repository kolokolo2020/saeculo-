// The Beat Maker's model: eight lanes of sixteen steps, each step off, on
// or accented, played over a four-bar chord progression in a minor key.
// Everything here is plain data plus Web Audio scheduling, so the live
// sequencer and the offline WAV render share one code path.

import { playHat, playKick, playSnare } from "./synth";
import { hz, noiseBurst, play808, tone } from "./voices";

export const STEPS = 16;
export const BARS = 4;

export const LANES = ["kick", "snare", "clap", "hat", "openhat", "perc", "bass", "keys"] as const;
export type Lane = (typeof LANES)[number];
/** 0 = off, 1 = on, 2 = accent */
export type Cell = 0 | 1 | 2;
export type Pattern = Record<Lane, Cell[]>;

export const LANE_INFO: Record<Lane, { label: string; hi: string; lo: string }> = {
  kick: { label: "Kick", hi: "#ffc07a", lo: "#d9660f" },
  snare: { label: "Snare", hi: "#9fd3ff", lo: "#1f6fd1" },
  clap: { label: "Clap", hi: "#c9b8ff", lo: "#6a3fd8" },
  hat: { label: "Hat", hi: "#b8f0a7", lo: "#25a025" },
  openhat: { label: "Open hat", hi: "#f3f7a0", lo: "#a3a51c" },
  perc: { label: "Rim", hi: "#a6f3ea", lo: "#11968a" },
  bass: { label: "808", hi: "#ffb3d6", lo: "#c42a78" },
  keys: { label: "Keys", hi: "#ffd2a8", lo: "#c7533a" },
};

// ---- harmony

const NOTE_NAMES = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
export const KEYS = NOTE_NAMES.map((n, pc) => ({ pc, name: `${n} minor` }));

type Quality = "m7" | "maj7" | "add9";
const QUALITY: Record<Quality, { notes: number[]; suffix: string }> = {
  m7: { notes: [0, 3, 7, 10], suffix: "m7" },
  maj7: { notes: [0, 4, 7, 11], suffix: "maj7" },
  add9: { notes: [0, 4, 7, 14], suffix: "add9" },
};
/** Chord built on each degree of the natural minor scale (semitones above the tonic). */
const DEGREE: Record<number, { roman: string; quality: Quality }> = {
  0: { roman: "i", quality: "m7" },
  3: { roman: "III", quality: "maj7" },
  5: { roman: "iv", quality: "m7" },
  7: { roman: "v", quality: "m7" },
  8: { roman: "VI", quality: "maj7" },
  10: { roman: "VII", quality: "add9" },
};

/** One chord per bar. */
export const PROGRESSIONS: number[][] = [
  [0, 8, 3, 10],
  [0, 5, 8, 7],
  [0, 10, 8, 10],
  [0, 0, 5, 5],
  [0, 3, 10, 8],
  [0, 0, 0, 0],
];
export const progressionName = (i: number) =>
  PROGRESSIONS[i].every((d) => d === 0) ? "i (drone)" : PROGRESSIONS[i].map((d) => DEGREE[d].roman).join(" · ");

export function chordAt(key: number, prog: number, bar: number) {
  const degree = PROGRESSIONS[prog][bar % BARS];
  const pc = (key + degree) % 12;
  const q = QUALITY[DEGREE[degree].quality];
  return { pc, notes: q.notes, name: NOTE_NAMES[pc] + q.suffix };
}

/** The lowest MIDI note of pitch class `pc` at or above `low` Hz. */
function midiAbove(pc: number, low: number) {
  let midi = pc + 12;
  while (hz(midi) < low) midi += 12;
  return midi;
}

// ---- the groove

export interface Groove {
  bpm: number;
  /** 0–100: how late the off-sixteenths land (100 = half a step). */
  swing: number;
  /** tonic pitch class of the minor key */
  key: number;
  prog: number;
  /** 0–100: master low-pass, 100 = fully open */
  filter: number;
  pattern: Pattern;
  muted: Lane[];
}

export const emptyPattern = (): Pattern => Object.fromEntries(LANES.map((l) => [l, Array<Cell>(STEPS).fill(0)])) as Pattern;

/** Build a pattern from step lists; `accents` marks steps (already listed) as accented. */
export function patternFrom(on: Partial<Record<Lane, number[]>>, accents: Partial<Record<Lane, number[]>> = {}): Pattern {
  const p = emptyPattern();
  for (const lane of LANES) {
    for (const s of on[lane] ?? []) p[lane][s] = 1;
    for (const s of accents[lane] ?? []) p[lane][s] = 2;
  }
  return p;
}

export const swingDelay = (swing: number, stepDur: number) => (swing / 100) * 0.5 * stepDur;
export const stepDuration = (bpm: number) => 60 / bpm / 4;
export const filterHz = (filter: number) => 120 * Math.pow(20000 / 120, filter / 100);

/** Master bus: level → low-pass → glue compressor → analyser → out. */
export interface GrooveBus {
  input: GainNode;
  filter: BiquadFilterNode;
  analyser: AnalyserNode | null;
}
export function createGrooveBus(ctx: BaseAudioContext, filter: number, withAnalyser: boolean): GrooveBus {
  const input = ctx.createGain();
  input.gain.value = 0.8;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  setFilter(lp, filter, 0);
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12;
  comp.ratio.value = 4;
  comp.attack.value = 0.004;
  comp.release.value = 0.12;
  input.connect(lp).connect(comp);
  let analyser: AnalyserNode | null = null;
  if (withAnalyser) {
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.6;
    comp.connect(analyser).connect(ctx.destination);
  } else {
    comp.connect(ctx.destination);
  }
  return { input, filter: lp, analyser };
}

/** Sweep the low-pass; resonance rises as it closes, like a DJ filter. */
export function setFilter(lp: BiquadFilterNode, filter: number, at: number, glide = 0) {
  const f = filterHz(filter);
  const q = 0.7 + (1 - filter / 100) * 7;
  if (glide) {
    lp.frequency.setTargetAtTime(f, at, glide);
    lp.Q.setTargetAtTime(q, at, glide);
  } else {
    lp.frequency.setValueAtTime(f, at);
    lp.Q.setValueAtTime(q, at);
  }
}

/** One lane's sound. `accent` is louder, and the 808 jumps an octave, the keys ring longer. */
export function playLane(
  ctx: BaseAudioContext,
  dest: AudioNode,
  lane: Lane,
  time: number,
  opts: { accent: boolean; key: number; prog: number; bar: number; stepDur: number; length?: number },
) {
  const v = opts.accent ? 1.35 : 1;
  switch (lane) {
    case "kick":
      playKick(ctx, dest, time, 0.85 * v);
      break;
    case "snare":
      playSnare(ctx, dest, time, 0.45 * v);
      break;
    case "clap":
      for (const d of [0, 0.011, 0.023]) {
        noiseBurst(ctx, dest, time + d, { type: "bandpass", freq: 1350, q: 1.1, gain: 0.5 * v, decay: d > 0.02 ? 0.2 : 0.018 });
      }
      break;
    case "hat":
      playHat(ctx, dest, time, 0.2 * v);
      break;
    case "openhat":
      noiseBurst(ctx, dest, time, { type: "highpass", freq: 6800, gain: 0.17 * v, decay: 0.32 });
      noiseBurst(ctx, dest, time, { type: "bandpass", freq: 9500, q: 3, gain: 0.06 * v, decay: 0.25 });
      break;
    case "perc":
      tone(ctx, dest, time, { type: "triangle", freq: 1720, gain: 0.26 * v, decay: 0.035 });
      tone(ctx, dest, time, { type: "sine", freq: 520, gain: 0.18 * v, decay: 0.06 });
      noiseBurst(ctx, dest, time, { type: "highpass", freq: 3200, gain: 0.14 * v, decay: 0.02 });
      break;
    case "bass": {
      const chord = chordAt(opts.key, opts.prog, opts.bar);
      const root = hz(midiAbove(chord.pc, 36)) * (opts.accent ? 2 : 1);
      play808(ctx, dest, time, { freq: root, length: opts.length ?? opts.stepDur * 4, gain: 0.5 });
      break;
    }
    case "keys": {
      // a soft electric-piano stab: sine body, a bell-ish partial, felt attack
      const chord = chordAt(opts.key, opts.prog, opts.bar);
      const base = midiAbove(chord.pc, 210);
      const decay = opts.accent ? 1.4 : 0.55;
      for (const n of chord.notes) {
        const f = hz(base + n);
        tone(ctx, dest, time, { type: "triangle", freq: f, gain: 0.075 * v, attack: 0.008, decay, lowpass: 2600 });
        tone(ctx, dest, time, { type: "sine", freq: f * 4, gain: 0.012 * v, decay: 0.12 });
      }
      break;
    }
  }
}

/** Length of an 808 note: until the next 808 hit (it's monophonic), at most a bar. */
function bassLength(pattern: Pattern, step: number, stepDur: number) {
  for (let d = 1; d <= STEPS; d++) {
    if (pattern.bass[(step + d) % STEPS]) return Math.max(0.12, d * stepDur);
  }
  return STEPS * stepDur;
}

/** Everything that sounds on one step. Muted lanes stay silent. */
export function scheduleStep(ctx: BaseAudioContext, dest: AudioNode, g: Groove, bar: number, step: number, gridTime: number, silent: ReadonlySet<Lane>) {
  const stepDur = stepDuration(g.bpm);
  const time = gridTime + (step % 2 === 1 ? swingDelay(g.swing, stepDur) : 0);
  for (const lane of LANES) {
    const cell = g.pattern[lane][step];
    if (!cell || silent.has(lane)) continue;
    playLane(ctx, dest, lane, time, {
      accent: cell === 2,
      key: g.key,
      prog: g.prog,
      bar,
      stepDur,
      length: lane === "bass" ? bassLength(g.pattern, step, stepDur) : undefined,
    });
  }
}

/** Render the whole four-bar progression offline. */
export async function renderGroove(g: Groove): Promise<AudioBuffer> {
  const sampleRate = 44100;
  const stepDur = stepDuration(g.bpm);
  const seconds = BARS * STEPS * stepDur + 1.2; // tail for the last hits to ring out
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  const bus = createGrooveBus(ctx, g.filter, false);
  const silent = new Set(g.muted);
  for (let bar = 0; bar < BARS; bar++) {
    for (let step = 0; step < STEPS; step++) {
      scheduleStep(ctx, bus.input, g, bar, step, (bar * STEPS + step) * stepDur + 0.02, silent);
    }
  }
  return ctx.startRendering();
}

// ---- share codes
//
// v2: #beat=2.<bpm>.<swing>.<key>.<prog>.<filter>.<data>, where data is
// base64url of 8 lanes × 16 steps × 2 bits (32 bytes) plus one byte of
// mute flags. v1 links (#beat=<bpm>-<16 hex>, four on/off lanes) still load.

const V1 = /^#?beat=(\d{2,3})-([0-9a-f]{16})$/i;
const V2 = /^#?beat=2\.(\d{2,3})\.(\d{1,3})\.(\d{1,2})\.(\d)\.(\d{1,3})\.([A-Za-z0-9_-]{44})$/;
const V1_LANES: Lane[] = ["kick", "snare", "hat", "bass"];

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
export const BPM_MIN = 60;
export const BPM_MAX = 180;

const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64 = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

export function encodeGroove(g: Groove): string {
  const bytes = new Uint8Array(33);
  LANES.forEach((lane, li) => {
    g.pattern[lane].forEach((cell, s) => {
      const bit = (li * STEPS + s) * 2;
      bytes[bit >> 3] |= cell << (bit & 7);
    });
    if (g.muted.includes(lane)) bytes[32] |= 1 << li;
  });
  return `beat=2.${Math.round(g.bpm)}.${Math.round(g.swing)}.${g.key}.${g.prog}.${Math.round(g.filter)}.${toB64(bytes)}`;
}

export function decodeGroove(hash: string): Groove | null {
  const s = hash.trim();
  const v2 = V2.exec(s);
  if (v2) {
    let bytes: Uint8Array;
    try {
      bytes = fromB64(v2[6]);
    } catch {
      return null;
    }
    if (bytes.length < 33) return null;
    const pattern = emptyPattern();
    LANES.forEach((lane, li) => {
      for (let st = 0; st < STEPS; st++) {
        const bit = (li * STEPS + st) * 2;
        pattern[lane][st] = Math.min(2, (bytes[bit >> 3] >> (bit & 7)) & 3) as Cell;
      }
    });
    return {
      bpm: clamp(Number(v2[1]), BPM_MIN, BPM_MAX),
      swing: clamp(Number(v2[2]), 0, 100),
      key: clamp(Number(v2[3]), 0, 11),
      prog: clamp(Number(v2[4]), 0, PROGRESSIONS.length - 1),
      filter: clamp(Number(v2[5]), 0, 100),
      pattern,
      muted: LANES.filter((_, li) => bytes[32] & (1 << li)),
    };
  }
  const v1 = V1.exec(s);
  if (v1) {
    const pattern = emptyPattern();
    V1_LANES.forEach((lane, li) => {
      const word = parseInt(v1[2].slice(li * 4, li * 4 + 4), 16);
      for (let st = 0; st < STEPS; st++) pattern[lane][st] = word & (1 << st) ? 1 : 0;
    });
    return { bpm: clamp(Number(v1[1]), BPM_MIN, BPM_MAX), swing: 0, key: 2, prog: 0, filter: 100, pattern, muted: [] };
  }
  return null;
}

export const grooveUrl = (g: Groove) => `${window.location.origin}${window.location.pathname}#${encodeGroove(g)}`;

// A groove that arrived via a share link, waiting for the Beat Maker to pick
// it up. A Beat Maker that mounts later reads it with peek (safe to call more
// than once — Strict Mode double-invokes state initializers); one that is
// already open subscribes and is told when a new link lands.
let pending: Groove | null = null;
const listeners = new Set<() => void>();
export const setPendingGroove = (g: Groove | null) => {
  pending = g;
  if (g) listeners.forEach((fn) => fn());
};
export const peekPendingGroove = () => pending;
export const subscribePendingGroove = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
