// Optional. Analyses every track in src/data/tracks.ts that lists a `bpm`
// and writes src/data/trackAnalysis.json, which the site reads for:
//   - the length shown in the Beats folder before a file is opened
//   - the exact tempo and first-beat offset (the visualizer's fallback
//     beat pulse on iPhones follows these)
//   - the loudness (integrated, ITU-R BS.1770 / EBU R128, in LUFS; within
//     0.1 LU of ffmpeg's ebur128), so the player can turn loud beats down
// and src/data/trackWaveforms.json, the waveform the seek bar draws (kept
// apart so it loads after the page, not with it).
//
// Run it after adding or replacing a track:
//   node scripts/analyze-tracks.mjs
//
// Audio is decoded by the Chromium that Playwright drives (Web Audio's
// decoder handles MP3/WAV/AAC).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");

const root = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const tracksSrc = fs.readFileSync(path.join(root, "src/data/tracks.ts"), "utf8");
// id, bpm, cover and the audio file for each track entry (`src` is either
// audioFile("name.mp3"), a file in public/audio/, or a URL-encoded path)
const tracks = [...tracksSrc.matchAll(/\{\s*id: "([^"]+)",[^{}]*?(?:bpm: (\d+(?:\.\d+)?),[^{}]*?)?(?:cover: "([^"]+)",[^{}]*?)?src: (?:audioFile\("([^"]+)"\)|"([^"]+)")/g)].map(
  ([, id, bpm, cover, name, src]) => ({ id, bpm: Number(bpm), cover, file: name ? path.join("audio", name) : decodeURIComponent(src) }),
);
if (!tracks.length) throw new Error("no tracks found in src/data/tracks.ts");

const COLUMNS = 600;
const executablePath = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage();
await page.goto("about:blank");

// ---- audio: waveform, tempo, first beat, loudness
async function analyseAudio(file, nominal) {
  const b64 = fs.readFileSync(file).toString("base64");
  return page.evaluate(
    async ({ b64, nominal, COLUMNS }) => {
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const buf = await new OfflineAudioContext(1, 44100, 44100).decodeAudioData(bin.buffer);
      const sr = buf.sampleRate;
      const L = buf.getChannelData(0);
      const Rr = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;

      // waveform: per column, the peak
      const per = Math.floor(buf.length / COLUMNS);
      const peaks = [];
      for (let c = 0; c < COLUMNS; c++) {
        let pk = 0;
        for (let i = c * per; i < (c + 1) * per; i++) {
          const v = (L[i] + Rr[i]) / 2;
          const a = Math.abs(v);
          if (a > pk) pk = a;
        }
        peaks.push(pk);
      }
      const maxPk = Math.max(...peaks) || 1;

      // integrated loudness: K-weighting (a high shelf, then a high-pass, with
      // the coefficients for this sample rate), mean square per channel over
      // 400 ms blocks every 100 ms, gated at -70 LUFS and then 10 LU under
      // the mean of what's left
      const loudness = (() => {
        const biquad = (b0, b1, b2, a1, a2) => ({ b0, b1, b2, a1, a2 });
        const shelf = (() => {
          const f0 = 1681.974450955533, G = 3.999843853973347, Q = 0.7071752369554196;
          const K = Math.tan((Math.PI * f0) / sr), Vh = Math.pow(10, G / 20), Vb = Math.pow(Vh, 0.4996667741545416);
          const a0 = 1 + K / Q + K * K;
          return biquad((Vh + (Vb * K) / Q + K * K) / a0, (2 * (K * K - Vh)) / a0, (Vh - (Vb * K) / Q + K * K) / a0, (2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0);
        })();
        const hp = (() => {
          const f0 = 38.13547087602444, Q = 0.5003270373238773;
          const K = Math.tan((Math.PI * f0) / sr);
          const a0 = 1 + K / Q + K * K;
          return biquad(1, -2, 1, (2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0);
        })();
        const hop = Math.round(sr * 0.1);
        const hops = Math.floor(buf.length / hop);
        const energy = new Float64Array(hops);
        for (let ch = 0; ch < buf.numberOfChannels; ch++) {
          const x = buf.getChannelData(ch);
          let x1 = 0, x2 = 0, y1 = 0, y2 = 0, z1 = 0, z2 = 0;
          for (let h = 0; h < hops; h++) {
            let sum = 0;
            for (let i = h * hop, end = i + hop; i < end; i++) {
              const v = x[i];
              const y = shelf.b0 * v + shelf.b1 * x1 + shelf.b2 * x2 - shelf.a1 * y1 - shelf.a2 * y2;
              x2 = x1;
              x1 = v;
              const z = hp.b0 * y + hp.b1 * y1 + hp.b2 * y2 - hp.a1 * z1 - hp.a2 * z2;
              y2 = y1;
              y1 = y;
              z2 = z1;
              z1 = z;
              sum += z * z;
            }
            energy[h] += sum;
          }
        }
        const blocks = [];
        for (let h = 0; h + 4 <= hops; h++) blocks.push((energy[h] + energy[h + 1] + energy[h + 2] + energy[h + 3]) / (hop * 4));
        const lufs = (ms) => -0.691 + 10 * Math.log10(ms);
        const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
        const loud = blocks.filter((ms) => lufs(ms) > -70);
        if (!loud.length) return undefined;
        const gate = lufs(mean(loud)) - 10;
        return Math.round(lufs(mean(loud.filter((ms) => lufs(ms) > gate))) * 10) / 10;
      })();

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
        loudness,
        peaks: peaks.map((v) => Math.round((v / maxPk) * 100) / 100),
      };
    },
    { b64, nominal, COLUMNS },
  );
}

const out = {};
const waves = {};
for (const t of tracks) {
  if (!t.bpm) {
    console.log(`${t.id}: no bpm listed, skipped (it plays fine; add a bpm to measure the exact tempo)`);
    continue;
  }
  const audio = await analyseAudio(path.join(root, "public", t.file), t.bpm);
  const { peaks, ...numbers } = audio;
  out[t.id] = numbers;
  waves[t.id] = peaks;
  console.log(`${t.id}: ${audio.duration}s, ${audio.tempo} bpm (listed ${t.bpm}), first beat ${audio.beatOffset}s, ${audio.loudness} LUFS`);
}
await browser.close();
fs.writeFileSync(path.join(root, "src/data/trackAnalysis.json"), JSON.stringify(out) + "\n");
fs.writeFileSync(path.join(root, "src/data/trackWaveforms.json"), JSON.stringify(waves) + "\n");
console.log("wrote src/data/trackAnalysis.json");
