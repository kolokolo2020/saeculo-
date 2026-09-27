// Beat Deck's sound: every card voice, synthesized, plus chops sliced from
// saeculo's own tracks. Voices take any BaseAudioContext, so a take plays
// live through the shared context or renders offline for the WAV export.

import type { CardDef, Hit } from "@/lib/beatdeck/cards";
import { TRACKS, gridTempo } from "@/data/tracks";
import { loadBuffer } from "@/lib/audioBuffers";
import { encodeWav } from "@/lib/beatCode";
import { playHat, playKick, playSnare } from "@/lib/synth";

// ---- keys: a run is in the key of one of saeculo's tracks, so that
// track's chops play untouched and the others are re-pitched to fit.

export interface RunKey {
  track: string;
  name: string;
  /** Pitch class (C = 0) of the track's major key; the cards play in its relative minor. */
  pc: number;
}

export const RUN_KEYS: RunKey[] = [
  { track: "care4me", name: "D minor", pc: 5 },
  { track: "elbtunnel", name: "F minor", pc: 8 },
  { track: "dull-knife", name: "B minor", pc: 2 },
];

export const runKeyFor = (seed: number) => RUN_KEYS[Math.abs(seed) % RUN_KEYS.length];

const TRACK_PC: Record<string, number> = { care4me: 5, elbtunnel: 8, "dull-knife": 2 };

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
/** The relative-minor tonic in the given octave range. */
function tonic(key: RunKey, low: number) {
  const minorPc = (key.pc + 9) % 12;
  let midi = minorPc + 12;
  while (hz(midi) < low) midi += 12;
  return midi;
}

// ---- chops

const chopBuffers = new Map<string, AudioBuffer>();

/** Start decoding the three tracks (a few MB); chops are silent until ready. */
export function preloadChops(ctx: AudioContext) {
  for (const t of TRACKS) {
    if (chopBuffers.has(t.id)) continue;
    loadBuffer(ctx, t.src)
      .then((b) => chopBuffers.set(t.id, b))
      .catch(() => {});
  }
}

function playChop(ctx: BaseAudioContext, dest: AudioNode, time: number, chop: NonNullable<Hit["chop"]>, key: RunKey, gain: number) {
  const buffer = chopBuffers.get(chop.track);
  const track = TRACKS.find((t) => t.id === chop.track);
  if (!buffer || !track) return;
  const beat = 60 / gridTempo(track);
  const offset = (track.beatOffset ?? 0) + chop.beat * beat;
  // re-pitch to the run's key by the smallest interval
  let shift = (key.pc - TRACK_PC[chop.track] + 12) % 12;
  if (shift > 6) shift -= 12;
  const rate = Math.pow(2, shift / 12);
  const length = (beat * 1.5) / rate;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = rate;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, time);
  g.gain.linearRampToValueAtTime(gain, time + 0.008);
  g.gain.setValueAtTime(gain, time + length - 0.04);
  g.gain.linearRampToValueAtTime(0.0001, time + length);
  src.connect(g).connect(dest);
  src.start(time, offset, beat * 1.5);
}

// ---- synthesized voices

let noise: AudioBuffer | null = null;
function noiseBuffer(ctx: BaseAudioContext) {
  if (noise && noise.sampleRate === ctx.sampleRate) return noise;
  noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noise;
}

function noiseBurst(
  ctx: BaseAudioContext,
  dest: AudioNode,
  time: number,
  opts: { type: BiquadFilterType; freq: number; q?: number; gain: number; decay: number },
) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const f = ctx.createBiquadFilter();
  f.type = opts.type;
  f.frequency.value = opts.freq;
  f.Q.value = opts.q ?? 0.7;
  const g = ctx.createGain();
  g.gain.setValueAtTime(opts.gain, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + opts.decay);
  src.connect(f).connect(g).connect(dest);
  src.start(time, Math.random() * 1.5);
  src.stop(time + opts.decay + 0.02);
}

function tone(
  ctx: BaseAudioContext,
  dest: AudioNode,
  time: number,
  opts: { type: OscillatorType; freq: number; gain: number; attack?: number; decay: number; toFreq?: number; glideTime?: number; lowpass?: number },
) {
  const osc = ctx.createOscillator();
  osc.type = opts.type;
  osc.frequency.setValueAtTime(opts.freq, time);
  if (opts.toFreq) osc.frequency.exponentialRampToValueAtTime(opts.toFreq, time + (opts.glideTime ?? 0.1));
  const g = ctx.createGain();
  const attack = opts.attack ?? 0.005;
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(opts.gain, time + attack);
  g.gain.exponentialRampToValueAtTime(0.001, time + attack + opts.decay);
  let node: AudioNode = osc;
  if (opts.lowpass) {
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(opts.lowpass, time);
    f.frequency.exponentialRampToValueAtTime(Math.max(200, opts.lowpass / 6), time + attack + opts.decay);
    node = osc.connect(f);
  }
  node.connect(g).connect(dest);
  osc.start(time);
  osc.stop(time + attack + opts.decay + 0.05);
}

let drive: Float32Array<ArrayBuffer> | null = null;
function driveCurve() {
  if (drive) return drive;
  drive = new Float32Array(1024);
  for (let i = 0; i < drive.length; i++) {
    const x = (i / (drive.length - 1)) * 2 - 1;
    drive[i] = Math.tanh(x * 2.5);
  }
  return drive;
}

function play808(ctx: BaseAudioContext, dest: AudioNode, time: number, freq: number, glideTo: number | undefined, stepDur: number, gain: number) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq * 2.2, time);
  osc.frequency.exponentialRampToValueAtTime(freq, time + 0.03);
  if (glideTo) {
    osc.frequency.setValueAtTime(freq, time + stepDur * 1.5);
    osc.frequency.exponentialRampToValueAtTime(glideTo, time + stepDur * 3);
  }
  const shaper = ctx.createWaveShaper();
  shaper.curve = driveCurve();
  const g = ctx.createGain();
  const len = Math.max(0.5, stepDur * 5);
  g.gain.setValueAtTime(gain, time);
  g.gain.setValueAtTime(gain, time + len * 0.5);
  g.gain.exponentialRampToValueAtTime(0.001, time + len);
  osc.connect(shaper).connect(g).connect(dest);
  osc.start(time);
  osc.stop(time + len + 0.02);
}

function playRiser(ctx: BaseAudioContext, dest: AudioNode, time: number, length: number) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = 3;
  f.frequency.setValueAtTime(300, time);
  f.frequency.exponentialRampToValueAtTime(7000, time + length);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(0.35, time + length * 0.95);
  g.gain.linearRampToValueAtTime(0.0001, time + length);
  src.connect(f).connect(g).connect(dest);
  src.start(time);
  src.stop(time + length);
}

function playCrackle(ctx: BaseAudioContext, dest: AudioNode, time: number, length: number) {
  for (let i = 0; i < 40; i++) {
    noiseBurst(ctx, dest, time + Math.random() * length, { type: "highpass", freq: 2500 + Math.random() * 4000, gain: 0.05 + Math.random() * 0.12, decay: 0.006 });
  }
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 3000;
  const g = ctx.createGain();
  g.gain.value = 0.025;
  src.connect(f).connect(g).connect(dest);
  src.start(time);
  src.stop(time + length);
}

/** Schedules one hit. `root808` / `rootMel` are the run's tonic frequencies. */
function playHit(
  ctx: BaseAudioContext,
  dest: AudioNode,
  hit: Hit,
  time: number,
  stepDur: number,
  key: RunKey,
  gainScale = 1,
) {
  const bassRoot = hz(tonic(key, 40));
  const melRoot = hz(tonic(key, 260));
  const semi = (root: number, n = 0) => root * Math.pow(2, n / 12);
  switch (hit.voice) {
    case "kick":
      playKick(ctx, dest, time, 0.95 * gainScale);
      break;
    case "snare":
      playSnare(ctx, dest, time, 0.5 * gainScale);
      break;
    case "clap":
      for (const d of [0, 0.012, 0.024]) noiseBurst(ctx, dest, time + d, { type: "bandpass", freq: 1400, q: 1.2, gain: 0.55 * gainScale, decay: d === 0.024 ? 0.18 : 0.02 });
      break;
    case "rim":
      tone(ctx, dest, time, { type: "triangle", freq: 1750, gain: 0.3 * gainScale, decay: 0.03 });
      noiseBurst(ctx, dest, time, { type: "highpass", freq: 3000, gain: 0.2 * gainScale, decay: 0.02 });
      break;
    case "hat": {
      const n = hit.roll ?? 1;
      for (let i = 0; i < n; i++) playHat(ctx, dest, time + (i * stepDur) / n, (n > 1 ? 0.16 : 0.22) * gainScale);
      break;
    }
    case "openhat":
      noiseBurst(ctx, dest, time, { type: "highpass", freq: 6500, gain: 0.2 * gainScale, decay: 0.28 });
      break;
    case "808":
      play808(ctx, dest, time, semi(bassRoot, hit.note), hit.glide !== undefined ? semi(bassRoot, hit.glide) : undefined, stepDur, 0.55 * gainScale);
      break;
    case "sub":
      tone(ctx, dest, time, { type: "triangle", freq: semi(bassRoot * 2, hit.note), gain: 0.5 * gainScale, attack: 0.01, decay: stepDur * 2.5, lowpass: 900 });
      break;
    case "pluck":
      tone(ctx, dest, time, { type: "sawtooth", freq: semi(melRoot, hit.note), gain: 0.16 * gainScale, decay: 0.28, lowpass: 3200 });
      break;
    case "keys":
      for (const n of [0, 3, 7, 10]) {
        tone(ctx, dest, time, { type: "triangle", freq: semi(melRoot, (hit.note ?? 0) + n), gain: 0.1 * gainScale, attack: 0.012, decay: 0.9, lowpass: 2400 });
      }
      break;
    case "bell":
      tone(ctx, dest, time, { type: "sine", freq: semi(melRoot, hit.note), gain: 0.16 * gainScale, decay: 0.6 });
      tone(ctx, dest, time, { type: "sine", freq: semi(melRoot, hit.note) * 3.5, gain: 0.04 * gainScale, decay: 0.2 });
      break;
    case "chop":
      if (hit.chop) playChop(ctx, dest, time, hit.chop, key, 0.8 * gainScale);
      break;
    case "riser":
      playRiser(ctx, dest, time, stepDur * (16 - hit.step));
      break;
    case "impact":
      tone(ctx, dest, time, { type: "sine", freq: 90, toFreq: 32, glideTime: 0.6, gain: 0.7 * gainScale, decay: 1.1 });
      noiseBurst(ctx, dest, time, { type: "lowpass", freq: 1800, gain: 0.35 * gainScale, decay: 0.5 });
      break;
    case "crackle":
      playCrackle(ctx, dest, time, stepDur * 16);
      break;
    case "tapestop":
      tone(ctx, dest, time, { type: "sawtooth", freq: semi(melRoot, 0), toFreq: 45, glideTime: stepDur * 2, gain: 0.14 * gainScale, decay: stepDur * 2, lowpass: 2000 });
      break;
    case "tag":
      [0, 7, 12].forEach((n, i) =>
        tone(ctx, dest, time + i * 0.07, { type: "sine", freq: semi(melRoot * 2, n), gain: 0.12 * gainScale, decay: 0.35 }),
      );
      break;
  }
}

/** A limiter-ish bus so five layered cards don't clip. */
export function createBus(ctx: BaseAudioContext, dest: AudioNode = ctx.destination) {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 6;
  comp.attack.value = 0.003;
  comp.release.value = 0.15;
  const input = ctx.createGain();
  input.gain.value = 0.8;
  input.connect(comp).connect(dest);
  return input;
}

export const stepDuration = (tempo: number) => 60 / tempo / 4;

/** Schedule `bars` bars of the cards starting at `start`. */
export function scheduleTake(
  ctx: BaseAudioContext,
  dest: AudioNode,
  cards: CardDef[],
  tempo: number,
  key: RunKey,
  start: number,
  bars = 1,
  gainScale = 1,
) {
  const stepDur = stepDuration(tempo);
  const echo = cards.some((c) => c.effect === "echo");
  for (let bar = 0; bar < bars; bar++) {
    for (const card of cards) {
      for (const hit of card.hits) {
        const t = start + (bar * 16 + hit.step) * stepDur;
        // a little humanising swing on the off-16ths
        const swing = hit.step % 2 === 1 ? stepDur * 0.08 : 0;
        playHit(ctx, dest, hit, t + swing, stepDur, key, gainScale);
        if (echo && hit.role === "melody" && hit.step < 15) playHit(ctx, dest, hit, t + stepDur, stepDur, key, gainScale * 0.45);
      }
    }
  }
  return { stepDur, end: start + bars * 16 * stepDur };
}

/** Render the cards as a 4-bar loop and return a WAV. */
export async function renderTakeWav(cards: CardDef[], tempo: number, key: RunKey, bars = 4): Promise<Blob> {
  const sampleRate = 44100;
  const seconds = bars * 16 * stepDuration(tempo) + 1.2;
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  scheduleTake(ctx, createBus(ctx), cards, tempo, key, 0.02, bars);
  return encodeWav(await ctx.startRendering());
}
