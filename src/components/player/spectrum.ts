import { TRACKS, gridTempo } from "@/data/tracks";
import { usePlayerStore } from "./playerStore";

// What the visualizers and the level meter read each frame. Normally it's
// the real analyser. On iOS the player skips the Web Audio graph (Safari
// suspends Web Audio when the screen locks, which would stop the music),
// so there's no analyser — instead a spectrum is synthesized from the
// playback position and the track's measured tempo: kick on every beat,
// snare on the backbeat, hats on the 8ths. It moves on the beat, not on
// the actual sound, which is plenty for a visualizer.

function beatClock() {
  const { audio, trackIndex } = usePlayerStore.getState();
  if (!audio) return null;
  const track = TRACKS[trackIndex];
  const beat = 60 / gridTempo(track);
  const t = audio.currentTime - (track.beatOffset ?? 0);
  const frac = (x: number) => ((x % 1) + 1) % 1;
  const ph = frac(t / beat);
  return {
    t,
    kick: Math.exp(-ph * 6),
    snare: Math.floor(t / beat) % 2 === 1 ? Math.exp(-ph * 5) : 0,
    hat: Math.exp(-frac(t / (beat / 2)) * 9),
  };
}

/** Fills `out` like AnalyserNode.getByteFrequencyData; false when silent. */
export function readFrequencies(out: Uint8Array<ArrayBuffer>): boolean {
  const { analyser, playing } = usePlayerStore.getState();
  if (!playing) return false;
  if (analyser) {
    analyser.getByteFrequencyData(out);
    return true;
  }
  const c = beatClock();
  if (!c) return false;
  const n = out.length;
  for (let i = 0; i < n; i++) {
    const x = i / n;
    const body = (0.5 * Math.exp(-x * 6) + 0.1) * (0.6 + c.kick * 0.4);
    const low = x < 0.05 ? c.kick * 0.85 : 0;
    const mid = x > 0.05 && x < 0.3 ? c.snare * 0.5 * (1 - Math.abs(x - 0.15) * 3) : 0;
    const high = x > 0.3 ? c.hat * 0.35 * (1 - x) : 0;
    const shimmer = (Math.sin(i * 12.9898 + c.t * 37) * 0.5 + 0.5) * 0.07;
    out[i] = Math.min(255, 255 * (body + low + mid + high + shimmer));
  }
  return true;
}

/** Fills `out` like AnalyserNode.getByteTimeDomainData; false when silent. */
export function readWaveform(out: Uint8Array<ArrayBuffer>): boolean {
  const { analyser, playing } = usePlayerStore.getState();
  if (!playing) return false;
  if (analyser) {
    analyser.getByteTimeDomainData(out);
    return true;
  }
  const c = beatClock();
  if (!c) return false;
  const amp = 0.18 + c.kick * 0.45 + c.snare * 0.2;
  const n = out.length;
  for (let i = 0; i < n; i++) {
    const x = i / n;
    const v =
      Math.sin(x * Math.PI * 4 + c.t * 9) * 0.6 +
      Math.sin(x * Math.PI * 11 - c.t * 23) * 0.25 +
      Math.sin(x * Math.PI * 37 + c.t * 61) * 0.15 * (0.4 + c.hat);
    out[i] = Math.max(0, Math.min(255, 128 + v * amp * 127));
  }
  return true;
}
