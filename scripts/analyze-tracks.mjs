// Analyses every track in src/data/tracks.ts and writes
// src/data/trackAnalysis.json, which the site reads for:
//   - the waveform (peaks + loudness, 600 columns) in the media player
//   - the exact tempo and first-beat offset (the Beat Deck chops and the
//     visualizers' beat pulse follow these)
//   - a colour palette from the cover art, which themes the player
//
// Run it after adding or replacing a track:
//   node scripts/analyze-tracks.mjs
//
// Audio is decoded by the Chromium that Playwright drives (Web Audio's
// decoder handles MP3/WAV/AAC), colours come from sharp.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");
const sharp = require("sharp");

const root = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const tracksSrc = fs.readFileSync(path.join(root, "src/data/tracks.ts"), "utf8");
// id, bpm, src and cover for each track entry
const tracks = [...tracksSrc.matchAll(/\{\s*id: "([^"]+)",[\s\S]*?bpm: (\d+(?:\.\d+)?),[\s\S]*?(?:cover: "([^"]+)",[\s\S]*?)?src: "([^"]+)"/g)].map(
  ([, id, bpm, cover, src]) => ({ id, bpm: Number(bpm), cover, src }),
);
if (!tracks.length) throw new Error("no tracks found in src/data/tracks.ts");

const COLUMNS = 600;
const executablePath = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage();
await page.goto("about:blank");

// ---- audio: waveform, tempo, first beat
async function analyseAudio(file, nominal) {
  const b64 = fs.readFileSync(file).toString("base64");
  return page.evaluate(
    async ({ b64, nominal, COLUMNS }) => {
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const buf = await new OfflineAudioContext(1, 44100, 44100).decodeAudioData(bin.buffer);
      const sr = buf.sampleRate;
      const L = buf.getChannelData(0);
      const Rr = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;

      // waveform: per column, the peak and the RMS
      const per = Math.floor(buf.length / COLUMNS);
      const peaks = [];
      const rms = [];
      for (let c = 0; c < COLUMNS; c++) {
        let pk = 0;
        let sq = 0;
        for (let i = c * per; i < (c + 1) * per; i++) {
          const v = (L[i] + Rr[i]) / 2;
          const a = Math.abs(v);
          if (a > pk) pk = a;
          sq += v * v;
        }
        peaks.push(pk);
        rms.push(Math.sqrt(sq / per));
      }
      const maxPk = Math.max(...peaks) || 1;
      const maxRms = Math.max(...rms) || 1;

      // tempo + phase from the hi-hat grid: high-passed onsets, scanned
      // around the nominal tempo for the 16th-note period that lines up best
      const oc = new OfflineAudioContext(1, buf.length, sr);
      const s = oc.createBufferSource();
      s.buffer = buf;
      const f1 = oc.createBiquadFilter();
      f1.type = "highpass";
      f1.frequency.value = 6000;
      const f2 = oc.createBiquadFilter();
      f2.type = "highpass";
      f2.frequency.value = 6000;
      s.connect(f1).connect(f2).connect(oc.destination);
      s.start();
      const hat = (await oc.startRendering()).getChannelData(0);
      const F = 0.001;
      const hop = Math.round(sr * F);
      const n = Math.floor(hat.length / hop);
      const env = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let j = i * hop; j < (i + 1) * hop; j++) sum += hat[j] * hat[j];
        env[i] = Math.sqrt(sum / hop);
      }
      const onset = new Float32Array(n);
      for (let i = 8; i < n; i++) onset[i] = Math.max(0, Math.log(env[i] + 1e-5) - Math.log(env[i - 8] + 1e-5));
      const score = (period, ph) => {
        let sum = 0;
        let k = 0;
        for (let t = ph; t < buf.duration; t += period) {
          const i = Math.round(t / F);
          sum += (onset[i] || 0) + 0.7 * ((onset[i - 1] || 0) + (onset[i + 1] || 0)) + 0.4 * ((onset[i - 2] || 0) + (onset[i + 2] || 0));
          k++;
        }
        return sum / Math.max(1, k);
      };
      const search = (lo, hi, stepBpm) => {
        let best = { s: -1, bpm: nominal, ph: 0 };
        for (let b = lo; b <= hi + 1e-9; b += stepBpm) {
          const p = 60 / b / 4;
          for (let ph = 0; ph < p; ph += F) {
            const v = score(p, ph);
            if (v > best.s) best = { s: v, bpm: b, ph };
          }
        }
        return best;
      };
      const coarse = search(nominal * 0.97, nominal * 1.03, 0.05);
      const fine = search(coarse.bpm - 0.06, coarse.bpm + 0.06, 0.01);

      return {
        duration: Math.round(buf.duration * 100) / 100,
        tempo: Math.round(fine.bpm * 100) / 100,
        beatOffset: Math.round(fine.ph * 1000) / 1000,
        peaks: peaks.map((v) => Math.round((v / maxPk) * 100) / 100),
        rms: rms.map((v) => Math.round((v / maxRms) * 100) / 100),
      };
    },
    { b64, nominal, COLUMNS },
  );
}

// ---- cover: a small k-means palette, then accent / second / deep picks
async function palette(file) {
  const { data } = await sharp(file).resize(40, 40, { fit: "cover" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = [];
  for (let i = 0; i < data.length; i += 3) px.push([data[i], data[i + 1], data[i + 2]]);
  const K = 8;
  let centers = Array.from({ length: K }, (_, q) => px[Math.floor((q / K) * (px.length - 1))]);
  for (let iter = 0; iter < 15; iter++) {
    const sums = centers.map(() => [0, 0, 0, 0]);
    for (const p of px) {
      let bi = 0;
      let bd = Infinity;
      centers.forEach((c, i) => {
        const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
        if (d < bd) [bd, bi] = [d, i];
      });
      sums[bi][0] += p[0];
      sums[bi][1] += p[1];
      sums[bi][2] += p[2];
      sums[bi][3] += 1;
    }
    centers = sums.map((s, i) => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3], s[3]] : centers[i]));
  }
  const hsl = ([r, g, b]) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    let h = 0;
    if (d) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
    }
    return [Math.round(((h * 60) + 360) % 360), s, l];
  };
  const clusters = centers.map((c) => ({ rgb: c.slice(0, 3), weight: c[3] ?? 1, hsl: hsl(c) }));
  // accent: the most saturated colour with some presence (lightness barely
  // matters: the picks are re-lit for a dark UI below); second: the same, of
  // a clearly different hue; deep: the darkest
  const vividness = (c) => c.hsl[1] * Math.sqrt(c.weight) * (c.hsl[2] > 0.04 ? 1 : 0.2);
  const vivid = [...clusters].sort((a, b) => vividness(b) - vividness(a));
  const accent = vivid[0];
  const hueGap = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
  const second = vivid.find((c) => hueGap(c.hsl[0], accent.hsl[0]) >= 40) ?? vivid[1];
  const deep = [...clusters].sort((a, b) => a.hsl[2] - b.hsl[2])[0];
  // keep the accents readable on a dark UI
  const tone = ([h, s], l) => `hsl(${h} ${Math.round(Math.max(0.45, s) * 100)}% ${Math.round(l * 100)}%)`;
  return {
    accent: tone(accent.hsl, Math.min(0.72, Math.max(0.55, accent.hsl[2]))),
    second: tone(second.hsl, Math.min(0.7, Math.max(0.5, second.hsl[2]))),
    deep: `hsl(${deep.hsl[0]} ${Math.round(Math.min(0.6, deep.hsl[1]) * 100)}% ${Math.round(Math.min(0.12, deep.hsl[2]) * 100)}%)`,
  };
}

const out = {};
for (const t of tracks) {
  const audio = await analyseAudio(path.join(root, "public", t.src), t.bpm);
  const colors = t.cover ? await palette(path.join(root, "public", t.cover)) : null;
  out[t.id] = { ...audio, palette: colors };
  console.log(`${t.id}: ${audio.duration}s, ${audio.tempo} bpm (listed ${t.bpm}), first beat ${audio.beatOffset}s, accent ${colors?.accent}`);
}
await browser.close();
fs.writeFileSync(path.join(root, "src/data/trackAnalysis.json"), JSON.stringify(out) + "\n");
console.log("wrote src/data/trackAnalysis.json");
