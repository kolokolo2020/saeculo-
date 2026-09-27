// Synth building blocks shared by Beat Deck and the Beat Maker: filtered
// noise bursts, enveloped oscillators and a driven 808. Everything takes a
// BaseAudioContext so the same voices play live or render offline.

export const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

let noise: AudioBuffer | null = null;
export function noiseBuffer(ctx: BaseAudioContext) {
  if (noise && noise.sampleRate === ctx.sampleRate) return noise;
  noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noise;
}

export function noiseBurst(
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

export function tone(
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
export function driveCurve() {
  if (drive) return drive;
  drive = new Float32Array(1024);
  for (let i = 0; i < drive.length; i++) {
    const x = (i / (drive.length - 1)) * 2 - 1;
    drive[i] = Math.tanh(x * 2.5);
  }
  return drive;
}

/** A driven sine 808: a quick pitch drop into `freq`, held for `length` seconds, optionally gliding to `glideTo`. */
export function play808(
  ctx: BaseAudioContext,
  dest: AudioNode,
  time: number,
  opts: { freq: number; length: number; gain: number; glideTo?: number; glideAt?: number; glideTime?: number },
) {
  const { freq, length, gain } = opts;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq * 2.2, time);
  osc.frequency.exponentialRampToValueAtTime(freq, time + 0.03);
  if (opts.glideTo) {
    const at = opts.glideAt ?? length * 0.3;
    osc.frequency.setValueAtTime(freq, time + at);
    osc.frequency.exponentialRampToValueAtTime(opts.glideTo, time + at + (opts.glideTime ?? length * 0.3));
  }
  const shaper = ctx.createWaveShaper();
  shaper.curve = driveCurve();
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, time);
  g.gain.setValueAtTime(gain, time + length * 0.5);
  g.gain.exponentialRampToValueAtTime(0.001, time + length);
  osc.connect(shaper).connect(g).connect(dest);
  osc.start(time);
  osc.stop(time + length + 0.02);
}
