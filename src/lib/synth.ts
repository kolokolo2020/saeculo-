// Tiny real-time drum synthesizer shared by BeatMaker and RhythmRush.
// Same synthesis approach as scripts/generate-audio.mjs (sine sweeps +
// filtered noise bursts) but driven live through Web Audio nodes instead of
// rendered to a buffer offline.

let noiseBuffer: AudioBuffer | null = null;

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}

export function playKick(ctx: AudioContext, dest: AudioNode, time: number, gain = 0.9) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(42, time + 0.15);
  g.gain.setValueAtTime(gain, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
  osc.connect(g).connect(dest);
  osc.start(time);
  osc.stop(time + 0.3);
}

export function playSnare(ctx: AudioContext, dest: AudioNode, time: number, gain = 0.5) {
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 1000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
  noise.connect(filter).connect(g).connect(dest);
  noise.start(time);
  noise.stop(time + 0.16);

  const osc = ctx.createOscillator();
  const og = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.value = 185;
  og.gain.setValueAtTime(gain * 0.5, time);
  og.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
  osc.connect(og).connect(dest);
  osc.start(time);
  osc.stop(time + 0.11);
}

export function playHat(ctx: AudioContext, dest: AudioNode, time: number, gain = 0.25) {
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 7000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.045);
  noise.connect(filter).connect(g).connect(dest);
  noise.start(time);
  noise.stop(time + 0.05);
}

export function playBass(ctx: AudioContext, dest: AudioNode, time: number, freq = 55, gain = 0.4) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(gain, time + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
  osc.connect(g).connect(dest);
  osc.start(time);
  osc.stop(time + 0.36);
}

export function playBlip(ctx: AudioContext, dest: AudioNode, time: number, freq = 880, gain = 0.3) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
  osc.connect(g).connect(dest);
  osc.start(time);
  osc.stop(time + 0.09);
}
