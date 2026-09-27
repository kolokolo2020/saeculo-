// Room tone for the late-night desktop: rain on the glass, vinyl crackle
// and a low mains hum, synthesized once into a loop and played quietly
// under everything. Never starts on its own: browsers only allow sound
// after a click, so it waits for one (see ambienceStore).

import { getAudioContext } from "./audioContext";

const LOOP_S = 7;

function renderLoop(ctx: BaseAudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const n = Math.floor(LOOP_S * sr);
  const buf = ctx.createBuffer(2, n, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    // rain: brown-ish noise (a leaky integrator over white noise) …
    let b = 0;
    for (let i = 0; i < n; i++) {
      b = b * 0.97 + (Math.random() * 2 - 1) * 0.12;
      d[i] = b * 0.55;
    }
    // … with drops: short bright ticks, a few hundred a second, each decaying fast
    const drops = LOOP_S * 220;
    for (let k = 0; k < drops; k++) {
      const at = Math.floor(Math.random() * (n - 400));
      const amp = 0.04 + Math.random() * 0.12;
      for (let j = 0; j < 300; j++) d[at + j] += (Math.random() * 2 - 1) * amp * Math.exp(-j / 40);
    }
    // vinyl: sparse crackles and a couple of pops
    const crackles = LOOP_S * 14;
    for (let k = 0; k < crackles; k++) {
      const at = Math.floor(Math.random() * (n - 60));
      const amp = 0.15 + Math.random() * 0.35 * (Math.random() < 0.1 ? 2 : 1);
      for (let j = 0; j < 40; j++) d[at + j] += (j % 2 ? -1 : 1) * amp * Math.exp(-j / 6);
    }
    // hum: 50 Hz and its second harmonic, very low
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      d[i] += Math.sin(2 * Math.PI * 50 * t) * 0.02 + Math.sin(2 * Math.PI * 100 * t) * 0.008;
    }
    // fade the seam so the loop never clicks
    const fade = Math.floor(sr * 0.05);
    for (let i = 0; i < fade; i++) {
      d[i] *= i / fade;
      d[n - 1 - i] *= i / fade;
    }
  }
  return buf;
}

let loop: AudioBuffer | null = null;
let source: AudioBufferSourceNode | null = null;
let gain: GainNode | null = null;

export const AMBIENCE_LEVEL = 0.22;

/** Fade the room in (after a user gesture). */
export function startAmbience(level = AMBIENCE_LEVEL, fadeS = 1.5) {
  const ctx = getAudioContext();
  void ctx.resume();
  if (!loop || loop.sampleRate !== ctx.sampleRate) loop = renderLoop(ctx);
  if (!gain) {
    gain = ctx.createGain();
    gain.gain.value = 0;
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 5200;
    gain.connect(tone).connect(ctx.destination);
  }
  if (!source) {
    source = ctx.createBufferSource();
    source.buffer = loop;
    source.loop = true;
    source.connect(gain);
    source.start();
  }
  gain.gain.cancelScheduledValues(ctx.currentTime);
  gain.gain.setTargetAtTime(level, ctx.currentTime, fadeS / 3);
}

export function stopAmbience(fadeS = 0.8) {
  if (!gain || !source) return;
  const ctx = getAudioContext();
  const s = source;
  gain.gain.cancelScheduledValues(ctx.currentTime);
  gain.gain.setTargetAtTime(0, ctx.currentTime, fadeS / 3);
  source = null;
  setTimeout(() => s.stop(), fadeS * 1000 + 200);
}
