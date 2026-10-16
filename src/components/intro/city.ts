import { getAudioContext } from "@/lib/audioContext";

// The intro's sounds, all synthesized: the low hum of the city at night,
// far-off traffic washing about in it, one car going past on a wet road,
// and a laptop's space bar. One bus, so the intro can hush it all at once
// (Skip, Esc, the end).

let bus: GainNode | null = null;
const live = new Set<AudioScheduledSourceNode>();
let noiseBuf: AudioBuffer | null = null;

function noise(ctx: BaseAudioContext) {
  if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
  const n = Math.floor(ctx.sampleRate * 4);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  // brown-ish: city noise is mostly low
  let lp = 0;
  for (let i = 0; i < n; i++) {
    lp += 0.06 * (Math.random() * 2 - 1 - lp);
    d[i] = lp * 3.2 + (Math.random() * 2 - 1) * 0.08;
  }
  noiseBuf = buf;
  return buf;
}

function out() {
  try {
    const ctx = getAudioContext();
    if (!bus || bus.context !== ctx) {
      bus = ctx.createGain();
      bus.connect(ctx.destination);
    }
    bus.gain.cancelScheduledValues(ctx.currentTime);
    bus.gain.setValueAtTime(1, ctx.currentTime);
    return { ctx, bus };
  } catch {
    return null; // no sound, no matter
  }
}

function source(ctx: BaseAudioContext, at: number) {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  src.loop = true;
  src.loopStart = Math.random() * 2;
  live.add(src);
  src.onended = () => live.delete(src);
  src.start(at, Math.random() * 3);
  return src;
}

/** The city at night, fading in: a low hum with traffic far off in it. Runs until hush(). */
export function night(fadeIn = 1.6) {
  const o = out();
  if (!o) return;
  const { ctx, bus: dest } = o;
  const at = ctx.currentTime;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0, at);
  amp.gain.linearRampToValueAtTime(0.16, at + fadeIn);
  amp.connect(dest);
  // the hum
  const low = ctx.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = 220;
  source(ctx, at).connect(low).connect(amp);
  // the wash, swelling and falling away slowly
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 700;
  band.Q.value = 0.6;
  const swell = ctx.createGain();
  swell.gain.value = 0.25;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.13;
  const depth = ctx.createGain();
  depth.gain.value = 0.18;
  lfo.connect(depth).connect(swell.gain);
  lfo.start(at);
  live.add(lfo);
  source(ctx, at).connect(band).connect(swell).connect(amp);
}

/** A car going past, left to right, tyres on a wet road; `at` seconds from now. */
export function carBy(at: number, dur = 2.3) {
  const o = out();
  if (!o) return;
  const { ctx, bus: dest } = o;
  const t0 = ctx.currentTime + at;
  const mid = t0 + dur * 0.5;
  const end = t0 + dur;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(0.22, mid);
  amp.gain.exponentialRampToValueAtTime(0.0001, end);
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.setValueAtTime(500, t0);
  tone.frequency.exponentialRampToValueAtTime(2600, mid);
  tone.frequency.exponentialRampToValueAtTime(420, end);
  // the hiss of the wet road on top
  const hiss = ctx.createBiquadFilter();
  hiss.type = "highpass";
  hiss.frequency.value = 2400;
  const hissAmp = ctx.createGain();
  hissAmp.gain.value = 0.5;
  const pan = ctx.createStereoPanner();
  pan.pan.setValueAtTime(-0.8, t0);
  pan.pan.linearRampToValueAtTime(0.8, end);
  const src = source(ctx, t0);
  src.connect(tone).connect(amp);
  src.connect(hiss).connect(hissAmp).connect(amp);
  amp.connect(pan).connect(dest);
  src.stop(end + 0.1);
}

/** A laptop's space bar, pressed and let go; `at` seconds from now. */
export function keyClick(at = 0) {
  const o = out();
  if (!o) return;
  const { ctx, bus: dest } = o;
  const hit = (t0: number, level: number, freq: number) => {
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(level, t0);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.045);
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = freq;
    band.Q.value = 1.4;
    const src = source(ctx, t0);
    src.connect(band).connect(amp).connect(dest);
    src.stop(t0 + 0.06);
  };
  const t0 = ctx.currentTime + at;
  hit(t0, 0.9, 2400);
  hit(t0 + 0.11, 0.45, 3200);
}

/** Everything off, over `seconds`. */
export function hush(seconds = 0.4) {
  if (!bus) return;
  const ctx = bus.context;
  const at = ctx.currentTime;
  bus.gain.cancelScheduledValues(at);
  bus.gain.setValueAtTime(bus.gain.value, at);
  bus.gain.linearRampToValueAtTime(0, at + seconds);
  const stopping = [...live];
  live.clear();
  for (const n of stopping) {
    try {
      n.stop(at + seconds + 0.05);
    } catch {
      // already stopped
    }
  }
}
