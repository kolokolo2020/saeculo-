// Share links and WAV export for Beat Maker loops.
//
// A loop is 4 lanes × 16 steps = 64 on/off bits plus a tempo. Each lane
// packs into one 16-bit word (bit i = step i), written as 4 hex digits, so
// a whole beat fits in a short URL hash: #beat=<bpm>-<16 hex digits>.
import { playBass, playHat, playKick, playSnare } from "./synth";

export const BEAT_LANES = ["kick", "snare", "hat", "bass"] as const;
export type BeatLane = (typeof BEAT_LANES)[number];
export type BeatPattern = Record<BeatLane, boolean[]>;
export interface SharedBeat {
  bpm: number;
  pattern: BeatPattern;
}

const STEPS = 16;
const HASH_RE = /^#?beat=(\d{2,3})-([0-9a-f]{16})$/i;

export function encodeBeat({ bpm, pattern }: SharedBeat): string {
  const words = BEAT_LANES.map((lane) => {
    let word = 0;
    pattern[lane].forEach((on, i) => {
      if (on) word |= 1 << i;
    });
    return word.toString(16).padStart(4, "0");
  });
  return `beat=${Math.round(bpm)}-${words.join("")}`;
}

export function decodeBeat(hash: string): SharedBeat | null {
  const m = HASH_RE.exec(hash.trim());
  if (!m) return null;
  const bpm = Math.min(160, Math.max(60, Number(m[1])));
  const hex = m[2];
  const pattern = Object.fromEntries(
    BEAT_LANES.map((lane, li) => {
      const word = parseInt(hex.slice(li * 4, li * 4 + 4), 16);
      return [lane, Array.from({ length: STEPS }, (_, i) => (word & (1 << i)) !== 0)];
    }),
  ) as BeatPattern;
  return { bpm, pattern };
}

export function shareUrl(beat: SharedBeat): string {
  return `${window.location.origin}${window.location.pathname}#${encodeBeat(beat)}`;
}

// A beat that arrived via a share link, waiting for the Beat Maker to pick
// it up. A Beat Maker that mounts later reads it with peek (safe to call more
// than once — Strict Mode double-invokes state initializers); one that is
// already open subscribes and is told when a new link lands.
let pending: SharedBeat | null = null;
const listeners = new Set<() => void>();
export const setPendingBeat = (beat: SharedBeat | null) => {
  pending = beat;
  if (beat) listeners.forEach((fn) => fn());
};
export const peekPendingBeat = () => pending;
export const subscribePendingBeat = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

/** Bass pitch per step — the same line the live sequencer plays. */
export const bassFreqForStep = (step: number) => (step % 8 < 4 ? 55 : 73.4);

/** Render `bars` repeats of the loop offline and encode it as a WAV blob. */
export async function renderBeatWav(beat: SharedBeat, bars = 4): Promise<Blob> {
  const sampleRate = 44100;
  const stepDur = 60 / beat.bpm / 4;
  const seconds = bars * STEPS * stepDur + 0.6; // tail for the last hits to ring out
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  const out = ctx.destination;
  for (let bar = 0; bar < bars; bar++) {
    for (let step = 0; step < STEPS; step++) {
      const t = (bar * STEPS + step) * stepDur + 0.02;
      if (beat.pattern.kick[step]) playKick(ctx, out, t);
      if (beat.pattern.snare[step]) playSnare(ctx, out, t);
      if (beat.pattern.hat[step]) playHat(ctx, out, t);
      if (beat.pattern.bass[step]) playBass(ctx, out, t, bassFreqForStep(step));
    }
  }
  return encodeWav(await ctx.startRendering());
}

export function encodeWav(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels;
  const frames = buffer.length;
  const bytesPerSample = 2;
  const dataLen = frames * channels * bytesPerSample;
  const view = new DataView(new ArrayBuffer(44 + dataLen));
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataLen, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataLen, true);

  const data = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c));
  // normalize so a busy pattern doesn't clip, leaving a little headroom
  let peak = 0;
  for (const ch of data) for (let i = 0; i < ch.length; i++) peak = Math.max(peak, Math.abs(ch[i]));
  const gain = peak > 0 ? 0.9 / peak : 1;
  let offset = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels; c++) {
      const s = Math.max(-1, Math.min(1, data[c][i] * gain));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([view], { type: "audio/wav" });
}
