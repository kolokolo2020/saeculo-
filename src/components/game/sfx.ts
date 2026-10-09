import { getAudioContext } from "@/lib/audioContext";
import { ensureLoaded, playVoice, trackTiming } from "./studio/voices";

// The neighbourhood's sound: a room tone per place (rain, a fridge hum, a
// quiet studio), footsteps, and small cues. One bus, torn down on exit.

export const PLACES = ["bedroom", "street", "store", "studio", "park", "rooftop", "avenue", "alley", "records", "thrift", "club", "subway", "underpass"] as const;
export type Place = (typeof PLACES)[number];
/** What your feet are on: each has its own step. */
export type Surface = "wood" | "stone" | "tile" | "carpet" | "wet" | "grit" | "metal" | "floor" | "concrete";

let bus: GainNode | null = null;
let rainGain: GainNode | null = null;
let rainSrc: AudioBufferSourceNode | null = null;
let humGain: GainNode | null = null;
let humOscs: OscillatorNode[] = [];
let ringGain: GainNode | null = null;
let ringOscs: OscillatorNode[] = [];
let rainBuf: AudioBuffer | null = null;
let level: GainNode | null = null;
let sfxVolume = 0.8;
let rumbleGain: GainNode | null = null;
let crowdGain: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

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
  level = c.createGain();
  level.gain.value = sfxVolume;
  bus.connect(level).connect(c.destination);

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

  // trains: brown noise, low, swelling as one comes in or goes over
  rumbleGain = c.createGain();
  rumbleGain.gain.value = 0;
  const rlp = c.createBiquadFilter();
  rlp.type = "lowpass";
  rlp.frequency.value = 220;
  const rsrc = c.createBufferSource();
  rsrc.buffer = rainBuf;
  rsrc.loop = true;
  rsrc.playbackRate.value = 0.35;
  rsrc.connect(rlp).connect(rumbleGain).connect(bus);
  rsrc.start();
  ringOscs.push(rsrc as unknown as OscillatorNode);

  // a crowd talking: a few "voices", each noise through a vowel-ish band,
  // opening and closing at syllable speed, never quite in step
  noiseBuf ??= whiteNoise(c, 2);
  crowdGain = c.createGain();
  crowdGain.gain.value = 0;
  const crowdTone = c.createBiquadFilter();
  crowdTone.type = "lowpass";
  crowdTone.frequency.value = 2200;
  crowdGain.connect(crowdTone).connect(bus);
  for (let k = 0; k < 6; k++) {
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    src.loopStart = Math.random();
    const vowel = c.createBiquadFilter();
    vowel.type = "bandpass";
    vowel.frequency.value = 350 + Math.random() * 700;
    vowel.Q.value = 3;
    const env = c.createGain();
    env.gain.value = 0.12;
    const syl = c.createOscillator();
    syl.frequency.value = 2.5 + Math.random() * 3;
    const depth = c.createGain();
    depth.gain.value = 0.12;
    syl.connect(depth).connect(env.gain);
    // and the pitch of each voice wanders a little
    const drift = c.createOscillator();
    drift.frequency.value = 0.3 + Math.random() * 0.5;
    const driftDepth = c.createGain();
    driftDepth.gain.value = 120;
    drift.connect(driftDepth).connect(vowel.frequency);
    src.connect(vowel).connect(env).connect(crowdGain);
    src.start(c.currentTime, Math.random());
    syl.start();
    drift.start();
    ringOscs.push(src as unknown as OscillatorNode, syl, drift);
  }
}

function whiteNoise(c: BaseAudioContext, secs: number) {
  const n = Math.floor(c.sampleRate * secs);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

/** People talking around you (0 = nobody): the club, the cypher, the queue. */
export function setCrowd(v: number) {
  if (crowdGain) crowdGain.gain.setTargetAtTime(v, ctx().currentTime, 0.4);
}

/** How loud the game's own sounds are (the settings). */
export function setSfxVolume(v: number) {
  sfxVolume = v;
  if (level) level.gain.setTargetAtTime(v, ctx().currentTime, 0.05);
}

/** A train's rumble (0 = none). */
export function setRumble(v: number) {
  if (rumbleGain) rumbleGain.gain.setTargetAtTime(v * 1.4, ctx().currentTime, 0.1);
}

export function stopGameAudio() {
  const c = ctx();
  const b = bus;
  if (!b) return;
  b.gain.setTargetAtTime(0, c.currentTime, 0.15);
  const lv = level;
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
    lv?.disconnect();
  }, 900);
  bus = rainGain = humGain = ringGain = rumbleGain = crowdGain = level = null;
  rainSrc = null;
  humOscs = [];
  ringOscs = [];
}

/** Crossfade the room tone for a place. `windowOpen` lets the rain in. */
export function setPlace(place: Place, windowOpen = false) {
  const c = ctx();
  const at = c.currentTime;
  const rain: Record<Place, number> = { bedroom: windowOpen ? 0.3 : 0.1, street: 0.34, store: 0.03, studio: 0, park: 0.26, rooftop: 0.4, avenue: 0.32, alley: 0.3, records: 0.02, thrift: 0.02, club: 0, subway: 0, underpass: 0.12 };
  const hum: Record<Place, number> = { bedroom: 0.004, street: 0, store: 0.02, studio: 0.006, park: 0, rooftop: 0, avenue: 0, alley: 0.003, records: 0.006, thrift: 0.008, club: 0.004, subway: 0.016, underpass: 0 };
  rainGain?.gain.setTargetAtTime(rain[place], at, 0.3);
  humGain?.gain.setTargetAtTime(hum[place], at, 0.3);
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

/** A burst of filtered noise on the bus; `sweep` glides the filter there. */
function noise(c: AudioContext, t: number, dur: number, freq: number, lvl: number, sweep?: number) {
  if (!bus) return;
  const n = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.setValueAtTime(freq, t);
  if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
  const g = c.createGain();
  g.gain.value = lvl;
  src.connect(f).connect(g).connect(bus);
  src.start(t);
}

export const sfx = {
  step(surface: Surface) {
    if (!bus) return;
    const c = ctx();
    const t = c.currentTime;
    const one = (at: number, freq: number, lvl: number, ms = 50, q = 1) => {
      const src = c.createBufferSource();
      const len = Math.floor(c.sampleRate * (ms / 1000));
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len / 5));
      src.buffer = buf;
      const f = c.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = freq * (0.9 + Math.random() * 0.2);
      f.Q.value = q;
      const g = c.createGain();
      g.gain.value = lvl;
      src.connect(f).connect(g).connect(bus!);
      src.start(at);
    };
    switch (surface) {
      case "wet":
        // the heel, then a little splash off the wet tarmac
        one(t, 1100, 0.06);
        one(t + 0.02, 3800, 0.035, 70, 0.7);
        break;
      case "grit":
        // grit and broken glass: a few tiny crunches
        one(t, 1300, 0.05);
        for (let k = 0; k < 3; k++) one(t + 0.008 + Math.random() * 0.03, 3000 + Math.random() * 2500, 0.02, 12, 3);
        break;
      case "metal":
        // the ridged strip at the platform edge: a clink
        one(t, 1800, 0.05);
        one(t + 0.004, 4200, 0.03, 40, 8);
        break;
      case "floor":
        // a sticky club floor, mostly felt under the bass
        one(t, 260, 0.06, 60, 0.8);
        break;
      case "concrete":
        // under the bridge every step comes back
        one(t, 900, 0.08);
        one(t + 0.11, 900, 0.025, 60);
        one(t + 0.22, 900, 0.01, 60);
        break;
      default:
        one(t, { wood: 500, stone: 1400, tile: 2200, carpet: 300 }[surface], { wood: 0.12, stone: 0.07, tile: 0.08, carpet: 0.05 }[surface]);
    }
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
  /** A car horn, two notes, a bit tired. */
  honk() {
    if (!bus) return;
    const c = ctx();
    const t = c.currentTime;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.02);
    g.gain.setValueAtTime(0.05, t + 0.32);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1800;
    lp.connect(g).connect(bus);
    for (const f of [392, 494]) {
      const o = c.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      o.connect(lp);
      o.start(t);
      o.stop(t + 0.42);
    }
  },
  /** Thunder, somewhere over the river: a crack (if it's close), then a long low roll. */
  thunder(near = 0.5) {
    if (!bus) return;
    const c = ctx();
    const t = c.currentTime;
    const dur = 3.2 + Math.random() * 1.5;
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) {
      // brown-ish noise with a few swells in it
      last = (last + (Math.random() * 2 - 1) * 0.06) * 0.995;
      const x = i / n;
      const swell = Math.min(1, x * 12) * Math.exp(-x * 2.6) * (0.75 + 0.25 * Math.sin(x * 23));
      d[i] = last * swell * 6;
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(260 + near * 500, t);
    lp.frequency.exponentialRampToValueAtTime(90, t + dur);
    const g = c.createGain();
    g.gain.value = 0.35 + near * 0.35;
    src.connect(lp).connect(g).connect(bus);
    src.start(t);
    if (near > 0.6) noise(c, t, 0.25, 1800, 0.12, 400);
  },
  /** The station announcement: three notes up, then a voice through a bad speaker (words you can't quite make out). */
  announce(syllables = 14) {
    if (!bus) return;
    const c = ctx();
    const t = c.currentTime;
    [523, 659, 784].forEach((f, i) => setTimeout(() => blip(f, 0.45, "sine", 0.05), i * 220));
    noiseBuf ??= whiteNoise(c, 2);
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    // the tannoy: narrow, a bit crunchy
    const speaker = c.createBiquadFilter();
    speaker.type = "bandpass";
    speaker.frequency.value = 1400;
    speaker.Q.value = 1.2;
    const vowel = c.createBiquadFilter();
    vowel.type = "bandpass";
    vowel.Q.value = 6;
    const env = c.createGain();
    env.gain.value = 0;
    const start = t + 0.85;
    let at = start;
    for (let k = 0; k < syllables; k++) {
      const len = 0.09 + Math.random() * 0.12;
      vowel.frequency.setValueAtTime(500 + Math.random() * 900, at);
      env.gain.setValueAtTime(0.0001, at);
      env.gain.linearRampToValueAtTime(0.5, at + 0.02);
      env.gain.linearRampToValueAtTime(0.0001, at + len);
      at += len + (k % 5 === 4 ? 0.22 : 0.03);
    }
    const out = c.createGain();
    out.gain.value = 0.5;
    src.connect(vowel).connect(speaker).connect(env).connect(out).connect(bus);
    src.start(start);
    src.stop(at + 0.1);
    return at - t;
  },
  /** The doors-closing chime on the train: two notes, down. */
  chime() {
    blip(784, 0.5, "sine", 0.06);
    setTimeout(() => blip(622, 0.7, "sine", 0.06), 260);
  },
  /** A police car's two notes, short, as it rolls past. */
  siren() {
    if (!bus) return;
    const c = ctx();
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = "triangle";
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.035, t + 0.05);
    g.gain.setValueAtTime(0.035, t + 0.9);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    o.frequency.setValueAtTime(620, t);
    o.frequency.linearRampToValueAtTime(980, t + 0.3);
    o.frequency.linearRampToValueAtTime(620, t + 0.55);
    o.frequency.linearRampToValueAtTime(980, t + 0.85);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1600;
    o.connect(lp).connect(g).connect(bus);
    o.start(t);
    o.stop(t + 1.15);
  },
  bell() {
    blip(2100, 0.35, "sine", 0.04);
    setTimeout(() => blip(2100, 0.3, "sine", 0.03), 140);
  },
  flap() {
    if (!bus) return;
    const c = ctx();
    for (let i = 0; i < 5; i++) {
      const t = c.currentTime + i * 0.06;
      const src = c.createBufferSource();
      const len = Math.floor(c.sampleRate * 0.04);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let k = 0; k < len; k++) d[k] = (Math.random() * 2 - 1) * (1 - k / len);
      src.buffer = buf;
      const f = c.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 900;
      const g = c.createGain();
      g.gain.value = 0.05;
      src.connect(f).connect(g).connect(bus);
      src.start(t);
    }
  },
  creak() {
    blip(310, 0.35, "sawtooth", 0.02);
    setTimeout(() => blip(260, 0.3, "sawtooth", 0.015), 380);
  },
  /**
   * The clerk's radio: static, then for a moment one of the real tracks
   * comes through between stations, then static again.
   */
  async radio(voiceIds: string[]) {
    if (!bus) return;
    const c = ctx();
    const out = bus;
    const hiss = (at: number, len: number, lvl: number) => {
      const src = c.createBufferSource();
      const n = Math.floor(c.sampleRate * len);
      const buf = c.createBuffer(1, n, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.min(1, i / 800, (n - i) / 800);
      src.buffer = buf;
      const f = c.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 2200;
      f.Q.value = 0.5;
      const g = c.createGain();
      g.gain.value = lvl;
      src.connect(f).connect(g).connect(out);
      src.start(at);
    };
    hiss(c.currentTime, 0.7, 0.06);
    await ensureLoaded(voiceIds);
    if (bus !== out) return;
    const t = c.currentTime + 0.05;
    // a small speaker in a shop: no lows, no highs
    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 450;
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2600;
    const lvl = c.createGain();
    lvl.gain.value = 0.55;
    hp.connect(lp).connect(lvl).connect(out);
    let at = t;
    for (const id of voiceIds) {
      playVoice(c, hp, id, at, { vel: 0.9 });
      // each chop is two beats of its track
      at += 2 * (trackTiming(id.split(":")[1])?.beat ?? 0.42);
    }
    hiss(at - 0.1, 0.9, 0.05);
    setTimeout(() => hp.disconnect(), (at - c.currentTime + 2) * 1000);
  },
  /** A fist (or worse) landing. */
  hit(heavy = false) {
    if (!bus) return;
    const c = ctx();
    const t = c.currentTime;
    const o = c.createOscillator();
    o.frequency.setValueAtTime(heavy ? 150 : 190, t);
    o.frequency.exponentialRampToValueAtTime(50, t + 0.09);
    const g = c.createGain();
    g.gain.setValueAtTime(heavy ? 0.5 : 0.35, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + 0.16);
    noise(c, t, 0.05, heavy ? 900 : 1500, heavy ? 0.35 : 0.25);
  },
  /** A swing that finds nothing. */
  whoosh() {
    if (!bus) return;
    const c = ctx();
    noise(c, c.currentTime, 0.12, 2400, 0.08, 600);
  },
  /** Taking one. */
  hurt() {
    blip(140, 0.12, "sawtooth", 0.06);
    setTimeout(() => blip(95, 0.14, "sawtooth", 0.05), 50);
  },
  /** Someone going down. */
  down() {
    if (!bus) return;
    const c = ctx();
    noise(c, c.currentTime, 0.25, 300, 0.4);
    blip(70, 0.3, "sine", 0.2);
  },
  dodge() {
    if (!bus) return;
    const c = ctx();
    noise(c, c.currentTime, 0.08, 3600, 0.05, 1500);
  },
  coins() {
    [1318, 1760, 2093].forEach((f, i) => setTimeout(() => blip(f, 0.12, "square", 0.025), i * 60));
  },
  /** Something to eat or drink. */
  gulp() {
    blip(220, 0.08, "sine", 0.08);
    setTimeout(() => blip(260, 0.08, "sine", 0.06), 110);
  },
  /** A short, rising "yes": a goal, an unlock. */
  unlock() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.22, "triangle", 0.05), i * 90));
  },
  /** A crowd, briefly. */
  cheer() {
    if (!bus) return;
    const c = ctx();
    for (let i = 0; i < 6; i++) noise(c, c.currentTime + i * 0.07, 0.6, 900 + i * 220, 0.05);
  },
  /** A spray can: the rattle, then the hiss. */
  spray(ms = 500) {
    if (!bus) return;
    const c = ctx();
    noise(c, c.currentTime, ms / 1000, 5200, 0.06);
  },
  splash() {
    blip(1800, 0.05, "sine", 0.04);
    setTimeout(() => blip(700, 0.25, "triangle", 0.03), 60);
  },
  /** One of the studio's sounds, on the game's bus. */
  voice(id: string) {
    if (!bus) return;
    const c = ctx();
    playVoice(c, bus, id, c.currentTime + 0.02, { vel: 0.8 });
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
