// Procedurally synthesizes original placeholder instrumental loops as WAV
// files (no samples, no external deps). Run: npm run gen:audio
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 44100;
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "audio");

// ---------- synthesis primitives ----------

const TWO_PI = Math.PI * 2;

function kick(buf, t0, { pitch = 120, decay = 0.16, gain = 0.9 } = {}) {
  const n0 = Math.floor(t0 * SR);
  const len = Math.floor(decay * 2.2 * SR);
  for (let i = 0; i < len && n0 + i < buf.length; i++) {
    const t = i / SR;
    const env = Math.exp(-t / decay);
    const freq = pitch * Math.exp(-t * 22) + 42;
    buf[n0 + i] += Math.sin(TWO_PI * freq * t) * env * gain;
  }
}

function hat(buf, t0, { decay = 0.035, gain = 0.16 } = {}) {
  const n0 = Math.floor(t0 * SR);
  const len = Math.floor(decay * 4 * SR);
  let hp = 0;
  for (let i = 0; i < len && n0 + i < buf.length; i++) {
    const t = i / SR;
    const white = Math.random() * 2 - 1;
    hp = white - hp * 0.15; // crude high-pass flavor
    buf[n0 + i] += hp * Math.exp(-t / decay) * gain;
  }
}

function snare(buf, t0, { decay = 0.09, gain = 0.32 } = {}) {
  const n0 = Math.floor(t0 * SR);
  const len = Math.floor(decay * 4 * SR);
  for (let i = 0; i < len && n0 + i < buf.length; i++) {
    const t = i / SR;
    const noise = (Math.random() * 2 - 1) * 0.7;
    const tone = Math.sin(TWO_PI * 185 * t) * 0.4;
    buf[n0 + i] += (noise + tone) * Math.exp(-t / decay) * gain;
  }
}

function bassNote(buf, t0, dur, freq, { gain = 0.34, wave = "tri" } = {}) {
  const n0 = Math.floor(t0 * SR);
  const len = Math.floor(dur * SR);
  const atk = 0.008 * SR;
  const rel = 0.03 * SR;
  for (let i = 0; i < len && n0 + i < buf.length; i++) {
    const t = i / SR;
    const ph = (freq * t) % 1;
    let s;
    if (wave === "tri") s = 4 * Math.abs(ph - 0.5) - 1;
    else if (wave === "saw") s = 2 * ph - 1;
    else if (wave === "square") s = ph < 0.5 ? 1 : -1;
    else s = Math.sin(TWO_PI * ph);
    let env = 1;
    if (i < atk) env = i / atk;
    else if (i > len - rel) env = (len - i) / rel;
    buf[n0 + i] += s * env * gain;
  }
}

function lead(buf, t0, dur, freq, { gain = 0.12, detune = 1.004, wave = "square" } = {}) {
  const n0 = Math.floor(t0 * SR);
  const len = Math.floor(dur * SR);
  const atk = 0.01 * SR;
  const rel = 0.05 * SR;
  for (let i = 0; i < len && n0 + i < buf.length; i++) {
    const t = i / SR;
    const p1 = (freq * t) % 1;
    const p2 = (freq * detune * t) % 1;
    let s;
    if (wave === "square") s = (p1 < 0.5 ? 1 : -1) * 0.5 + (p2 < 0.5 ? 1 : -1) * 0.5;
    else s = Math.sin(TWO_PI * p1) + Math.sin(TWO_PI * p2);
    let env = 1;
    if (i < atk) env = i / atk;
    else if (i > len - rel) env = (len - i) / rel;
    buf[n0 + i] += s * env * gain * 0.5;
  }
}

function pad(buf, t0, dur, freqs, { gain = 0.07 } = {}) {
  const n0 = Math.floor(t0 * SR);
  const len = Math.floor(dur * SR);
  const fade = 0.4 * SR;
  for (let i = 0; i < len && n0 + i < buf.length; i++) {
    const t = i / SR;
    let s = 0;
    for (const f of freqs) {
      s += Math.sin(TWO_PI * f * t) + Math.sin(TWO_PI * f * 1.003 * t) * 0.5;
    }
    let env = 1;
    if (i < fade) env = i / fade;
    else if (i > len - fade) env = (len - i) / fade;
    buf[n0 + i] += (s / (freqs.length * 1.5)) * env * gain;
  }
}

// note name -> frequency (A4 = 440)
const NOTE_OFFSETS = { C: -9, "C#": -8, D: -7, "D#": -6, E: -5, F: -4, "F#": -3, G: -2, "G#": -1, A: 0, "A#": 1, B: 2 };
function note(name, octave) {
  return 440 * Math.pow(2, (NOTE_OFFSETS[name] + (octave - 4) * 12) / 12);
}

// ---------- track builders ----------

function buildTrack({ bpm, bars, build }) {
  const beat = 60 / bpm;
  const barLen = beat * 4;
  const total = Math.ceil(bars * barLen * SR);
  const buf = new Float32Array(total);
  build({ buf, beat, barLen, bars });

  // normalize to 0.8 peak
  let peak = 0;
  for (const s of buf) peak = Math.max(peak, Math.abs(s));
  const norm = peak > 0 ? 0.8 / peak : 1;
  // 8ms loop-boundary fades to avoid clicks
  const fade = Math.floor(0.008 * SR);
  for (let i = 0; i < buf.length; i++) {
    let g = norm;
    if (i < fade) g *= i / fade;
    else if (i > buf.length - fade) g *= (buf.length - i) / fade;
    buf[i] *= g;
  }
  return buf;
}

function toWav(buf) {
  const dataLen = buf.length * 2;
  const out = Buffer.alloc(44 + dataLen);
  out.write("RIFF", 0);
  out.writeUInt32LE(36 + dataLen, 4);
  out.write("WAVE", 8);
  out.write("fmt ", 12);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20); // PCM
  out.writeUInt16LE(1, 22); // mono
  out.writeUInt32LE(SR, 24);
  out.writeUInt32LE(SR * 2, 28);
  out.writeUInt16LE(2, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36);
  out.writeUInt32LE(dataLen, 40);
  for (let i = 0; i < buf.length; i++) {
    out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2);
  }
  return out;
}

const TRACKS = {
  // dark, halftime, moody bass
  "midnight-drive": {
    bpm: 92,
    bars: 8,
    build({ buf, beat, barLen, bars }) {
      const roots = ["A", "A", "F", "G"];
      for (let bar = 0; bar < bars; bar++) {
        const t = bar * barLen;
        const root = roots[bar % 4];
        kick(buf, t, { pitch: 110 });
        kick(buf, t + beat * 2.5, { pitch: 110, gain: 0.7 });
        snare(buf, t + beat * 2, { decay: 0.12 });
        for (let e = 0; e < 8; e++) hat(buf, t + e * beat * 0.5, { gain: e % 2 ? 0.1 : 0.16 });
        hat(buf, t + beat * 3.75, { gain: 0.12 });
        bassNote(buf, t, beat * 1.5, note(root, 1), { wave: "tri", gain: 0.4 });
        bassNote(buf, t + beat * 2.5, beat * 1.2, note(root, 1), { wave: "tri", gain: 0.34 });
        pad(buf, t, barLen, [note(root, 3), note(root, 3) * 1.19, note(root, 3) * 1.5]);
      }
    },
  },
  // upbeat chiptune arps
  "arcade-dust": {
    bpm: 100,
    bars: 8,
    build({ buf, beat, barLen, bars }) {
      const chords = [
        ["C", "E", "G"],
        ["A", "C", "E"],
        ["F", "A", "C"],
        ["G", "B", "D"],
      ];
      for (let bar = 0; bar < bars; bar++) {
        const t = bar * barLen;
        const chord = chords[bar % 4];
        for (let b = 0; b < 4; b++) kick(buf, t + b * beat, { pitch: 130, decay: 0.12, gain: 0.8 });
        snare(buf, t + beat, { decay: 0.07 });
        snare(buf, t + beat * 3, { decay: 0.07 });
        for (let e = 0; e < 8; e++) hat(buf, t + (e + 0.5) * beat * 0.5, { gain: 0.09 });
        bassNote(buf, t, beat * 0.9, note(chord[0], 2), { wave: "square", gain: 0.22 });
        bassNote(buf, t + beat * 2, beat * 0.9, note(chord[0], 2), { wave: "square", gain: 0.22 });
        for (let e = 0; e < 16; e++) {
          const n = chord[e % 3];
          const oct = e % 6 < 3 ? 4 : 5;
          lead(buf, t + e * beat * 0.25, beat * 0.22, note(n, oct), { gain: 0.09 });
        }
      }
    },
  },
  // slow hazy lo-fi
  "velvet-static": {
    bpm: 84,
    bars: 8,
    build({ buf, beat, barLen, bars }) {
      const chords = [
        ["D", "F", "A", "C"],
        ["B", "D", "F", "A"],
      ];
      for (let bar = 0; bar < bars; bar++) {
        const t = bar * barLen;
        const chord = chords[bar % 2];
        kick(buf, t, { pitch: 95, decay: 0.2, gain: 0.85 });
        kick(buf, t + beat * 1.75, { pitch: 95, decay: 0.16, gain: 0.6 });
        snare(buf, t + beat * 2, { decay: 0.14, gain: 0.24 });
        for (let e = 0; e < 4; e++) hat(buf, t + e * beat, { gain: 0.07, decay: 0.05 });
        bassNote(buf, t, beat * 3.5, note(chord[0], 1), { wave: "sine", gain: 0.4 });
        pad(buf, t, barLen, chord.map((n, i) => note(n, i === 3 ? 4 : 3)), { gain: 0.09 });
      }
    },
  },
  // driving melodic
  "neon-rain": {
    bpm: 96,
    bars: 8,
    build({ buf, beat, barLen, bars }) {
      const roots = ["E", "C", "G", "D"];
      const melody = ["E", "G", "B", "E", "D", "B", "G", "E"];
      for (let bar = 0; bar < bars; bar++) {
        const t = bar * barLen;
        const root = roots[bar % 4];
        kick(buf, t, { pitch: 115 });
        kick(buf, t + beat * 1.5, { pitch: 115, gain: 0.55 });
        kick(buf, t + beat * 2.5, { pitch: 115, gain: 0.7 });
        snare(buf, t + beat, { decay: 0.08 });
        snare(buf, t + beat * 3, { decay: 0.1 });
        for (let e = 0; e < 16; e++) hat(buf, t + e * beat * 0.25, { gain: e % 4 === 2 ? 0.13 : 0.06, decay: 0.025 });
        for (let e = 0; e < 8; e++) {
          bassNote(buf, t + e * beat * 0.5, beat * 0.45, note(root, e % 4 === 3 ? 2 : 1), { wave: "saw", gain: 0.17 });
        }
        for (let e = 0; e < 8; e++) {
          lead(buf, t + e * beat * 0.5, beat * 0.4, note(melody[e], 4), { gain: 0.07, wave: "sine" });
        }
      }
    },
  },
};

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, cfg] of Object.entries(TRACKS)) {
  const buf = buildTrack(cfg);
  const wav = toWav(buf);
  writeFileSync(join(OUT_DIR, `${name}.wav`), wav);
  console.log(`${name}.wav — ${(wav.length / 1024 / 1024).toFixed(2)} MB, ${(buf.length / SR).toFixed(1)}s`);
}
