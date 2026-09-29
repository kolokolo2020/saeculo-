import { getAudioContext } from "@/lib/audioContext";
import { playVoice } from "./studio/voices";

// The neighbourhood's sound: a room tone per place (rain, a fridge hum, a
// quiet studio), footsteps, and small cues. One bus, torn down on exit.

export type Place = "bedroom" | "street" | "store" | "studio";

let bus: GainNode | null = null;
let rainGain: GainNode | null = null;
let rainSrc: AudioBufferSourceNode | null = null;
let humGain: GainNode | null = null;
let humOscs: OscillatorNode[] = [];
let ringGain: GainNode | null = null;
let ringOscs: OscillatorNode[] = [];
let rainBuf: AudioBuffer | null = null;

function ctx() {
  return getAudioContext();
}

function renderRain(c: BaseAudioContext) {
  const sr = c.sampleRate;
  const n = sr * 4;
  const buf = c.createBuffer(2, n, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let b = 0;
    for (let i = 0; i < n; i++) {
      b = b * 0.96 + (Math.random() * 2 - 1) * 0.15;
      d[i] = b * 0.6;
    }
    for (let k = 0; k < 4 * 180; k++) {
      const at = Math.floor(Math.random() * (n - 300));
      const amp = 0.03 + Math.random() * 0.1;
      for (let j = 0; j < 240; j++) d[at + j] += (Math.random() * 2 - 1) * amp * Math.exp(-j / 30);
    }
    const fade = Math.floor(sr * 0.05);
    for (let i = 0; i < fade; i++) {
      d[i] *= i / fade;
      d[n - 1 - i] *= i / fade;
    }
  }
  return buf;
}

export function startGameAudio() {
  const c = ctx();
  if (bus) return;
  bus = c.createGain();
  bus.gain.value = 0;
  bus.gain.setTargetAtTime(1, c.currentTime, 0.4);
  bus.connect(c.destination);

  rainBuf ??= renderRain(c);
  rainGain = c.createGain();
  rainGain.gain.value = 0;
  const rainTone = c.createBiquadFilter();
  rainTone.type = "lowpass";
  rainTone.frequency.value = 4000;
  rainGain.connect(rainTone).connect(bus);
  rainSrc = c.createBufferSource();
  rainSrc.buffer = rainBuf;
  rainSrc.loop = true;
  rainSrc.connect(rainGain);
  rainSrc.start();

  humGain = c.createGain();
  humGain.gain.value = 0;
  humGain.connect(bus);
  humOscs = [60, 120, 180].map((f, i) => {
    const o = c.createOscillator();
    o.frequency.value = f;
    const g = c.createGain();
    g.gain.value = [0.5, 0.3, 0.12][i];
    o.connect(g).connect(humGain!);
    o.start();
    return o;
  });

  // the payphone: 440 + 480 Hz, the old North American ring, pulsed
  ringGain = c.createGain();
  ringGain.gain.value = 0;
  const ringLevel = c.createGain();
  ringLevel.gain.value = 0.5;
  const pulse = c.createOscillator();
  pulse.type = "square";
  pulse.frequency.value = 20;
  const pulseDepth = c.createGain();
  pulseDepth.gain.value = 0.5;
  pulse.connect(pulseDepth).connect(ringLevel.gain);
  ringLevel.connect(ringGain).connect(bus);
  ringOscs = [440, 480].map((f) => {
    const o = c.createOscillator();
    o.frequency.value = f;
    const g = c.createGain();
    g.gain.value = 0.5;
    o.connect(g).connect(ringLevel);
    o.start();
    return o;
  });
  pulse.start();
  ringOscs.push(pulse);
}

export function stopGameAudio() {
  const c = ctx();
  const b = bus;
  if (!b) return;
  b.gain.setTargetAtTime(0, c.currentTime, 0.15);
  const stop = [rainSrc, ...humOscs, ...ringOscs];
  setTimeout(() => {
    stop.forEach((n) => {
      try {
        n?.stop();
      } catch {
        // already stopped
      }
    });
    b.disconnect();
  }, 900);
  bus = rainGain = humGain = ringGain = null;
  rainSrc = null;
  humOscs = [];
  ringOscs = [];
}

/** Crossfade the room tone for a place. `windowOpen` lets the rain in. */
export function setPlace(place: Place, windowOpen = false) {
  const c = ctx();
  const at = c.currentTime;
  const rain = { bedroom: windowOpen ? 0.3 : 0.1, street: 0.34, store: 0.03, studio: 0 }[place];
  const hum = { bedroom: 0.004, street: 0, store: 0.02, studio: 0.006 }[place];
  rainGain?.gain.setTargetAtTime(rain, at, 0.3);
  humGain?.gain.setTargetAtTime(hum, at, 0.3);
}

/** Duck the room tone under the sampler. */
export function duck(on: boolean) {
  if (!bus) return;
  bus.gain.setTargetAtTime(on ? 0.35 : 1, ctx().currentTime, 0.2);
}

/** The payphone's ring, louder the closer you are (0 = silent). */
export function setRing(level: number) {
  const c = ctx();
  if (!ringGain) return;
  // two seconds on, four off
  const on = c.currentTime % 6 < 2 ? 1 : 0;
  ringGain.gain.setTargetAtTime(level * on * 0.06, c.currentTime, 0.02);
}

function blip(freq: number, dur: number, type: OscillatorType = "square", level = 0.05) {
  if (!bus) return;
  const c = ctx();
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(level, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 2400;
  o.connect(lp).connect(g).connect(bus);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  step(surface: "wood" | "stone" | "tile" | "carpet") {
    if (!bus) return;
    const c = ctx();
    const t = c.currentTime;
    const src = c.createBufferSource();
    const len = Math.floor(c.sampleRate * 0.05);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len / 5));
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = { wood: 500, stone: 1400, tile: 2200, carpet: 300 }[surface] * (0.9 + Math.random() * 0.2);
    const g = c.createGain();
    g.gain.value = { wood: 0.12, stone: 0.07, tile: 0.08, carpet: 0.05 }[surface];
    src.connect(f).connect(g).connect(bus);
    src.start(t);
  },
  talk() {
    blip(180 + Math.random() * 60, 0.05, "triangle", 0.05);
  },
  select() {
    blip(660, 0.06, "square", 0.03);
  },
  door() {
    blip(90, 0.25, "sine", 0.18);
    blip(140, 0.12, "triangle", 0.05);
  },
  flick() {
    // a lighter
    if (!bus) return;
    const c = ctx();
    playVoice(c, bus, "lighter", c.currentTime, { vel: 0.9 });
  },
  /** A new sound: play it, then a small rising figure. */
  found(id: string) {
    if (!bus) return;
    const c = ctx();
    playVoice(c, bus, id, c.currentTime + 0.02, { midi: 60, dur: 0.5 });
    [0, 1, 2].forEach((i) => {
      const t = c.currentTime + 0.5 + i * 0.12;
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = [698, 880, 1047][i];
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.06, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g).connect(bus!);
      o.start(t);
      o.stop(t + 0.55);
    });
  },
};
