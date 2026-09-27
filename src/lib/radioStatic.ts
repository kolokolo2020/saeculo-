// The hiss between stations for Night Radio: band-limited noise with a slow
// wobble and the odd crackle, rendered once into a loop. Its level follows
// how far the dial is from a station.

import { getAudioContext } from "./audioContext";

const LOOP_S = 3;
let loop: AudioBuffer | null = null;

function render(ctx: BaseAudioContext) {
  if (loop && loop.sampleRate === ctx.sampleRate) return loop;
  const n = Math.floor(LOOP_S * ctx.sampleRate);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) {
    // AM "whistle" wobble on white noise
    const wobble = 0.75 + 0.25 * Math.sin((2 * Math.PI * i * 3) / n);
    d[i] = (Math.random() * 2 - 1) * wobble;
  }
  for (let k = 0; k < LOOP_S * 9; k++) {
    const at = Math.floor(Math.random() * (n - 80));
    for (let j = 0; j < 80; j++) d[at + j] += (j % 2 ? -1 : 1) * 0.8 * Math.exp(-j / 10);
  }
  loop = buf;
  return buf;
}

export interface RadioStatic {
  /** 0 = silent, 1 = nothing but hiss. */
  setLevel: (level: number) => void;
  stop: () => void;
}

/** Start the hiss (call from a click). */
export function startStatic(): RadioStatic {
  const ctx = getAudioContext();
  const src = ctx.createBufferSource();
  src.buffer = render(ctx);
  src.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 2200;
  band.Q.value = 0.6;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  src.connect(band).connect(gain).connect(ctx.destination);
  src.start();
  return {
    setLevel: (level) => {
      gain.gain.setTargetAtTime(Math.max(0, Math.min(1, level)) * 0.16, ctx.currentTime, 0.04);
      band.frequency.setTargetAtTime(1600 + level * 1400, ctx.currentTime, 0.08);
    },
    stop: () => {
      gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      src.stop(ctx.currentTime + 0.3);
    },
  };
}
