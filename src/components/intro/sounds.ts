import { getAudioContext } from "@/lib/audioContext";

// The boot's sounds, synthesized: a tape going into the deck, the drive
// seeking while the bar runs, and a startup chord in the key of whatever
// beat is about to play (a swell, a soft thump, a pad that opens up, a few
// bell notes on top), so the beat underneath doesn't clash with it.

const NOTES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "A♭ major" → MIDI note of its root around middle C (falls back to F). */
export function rootOf(key: string | undefined): { midi: number; minor: boolean } {
  const m = key?.match(/^([A-G])\s*([♭b♯#]?)/);
  if (!m) return { midi: 65, minor: false };
  const acc = m[2] === "♭" || m[2] === "b" ? -1 : m[2] === "♯" || m[2] === "#" ? 1 : 0;
  const pc = (NOTES[m[1]] + acc + 12) % 12;
  return { midi: 60 + (pc < 5 ? pc + 12 : pc), minor: /minor|\bm\b/i.test(key ?? "") };
}

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

function noise(ctx: BaseAudioContext, seconds: number) {
  const n = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

let space: ConvolverNode | null = null;
function reverb(ctx: AudioContext) {
  if (space?.context === ctx) return space;
  const len = Math.floor(ctx.sampleRate * 2.8);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
  }
  space = ctx.createConvolver();
  space.buffer = ir;
  space.connect(ctx.destination);
  return space;
}

function safely(fn: (ctx: AudioContext) => void) {
  try {
    fn(getAudioContext());
  } catch {
    // no sound, no matter
  }
}

/** A cassette going in: a clunk and a breath of hiss. */
export function tapeIn() {
  safely((ctx) => {
    const t = ctx.currentTime + 0.01;
    const hiss = ctx.createBufferSource();
    hiss.buffer = noise(ctx, 0.8);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 3200;
    const hg = ctx.createGain();
    hg.gain.setValueAtTime(0.04, t);
    hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    hiss.connect(hp).connect(hg).connect(ctx.destination);
    hiss.start(t);
    for (const [at, f] of [
      [0, 120],
      [0.09, 70],
    ] as const) {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(f, t + at);
      o.frequency.exponentialRampToValueAtTime(40, t + at + 0.08);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.22, t + at);
      g.gain.exponentialRampToValueAtTime(0.001, t + at + 0.11);
      o.connect(g).connect(ctx.destination);
      o.start(t + at);
      o.stop(t + at + 0.13);
    }
  });
}

/** The drive seeking: a run of small dry ticks. */
export function seekTicks(seconds = 2.2) {
  safely((ctx) => {
    const t0 = ctx.currentTime + 0.05;
    const click = noise(ctx, 0.01);
    let t = t0;
    while (t < t0 + seconds) {
      const src = ctx.createBufferSource();
      src.buffer = click;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 2600 + Math.random() * 1800;
      const g = ctx.createGain();
      g.gain.value = 0.05 + Math.random() * 0.05;
      src.connect(bp).connect(g).connect(ctx.destination);
      src.start(t);
      t += Math.random() < 0.3 ? 0.18 + Math.random() * 0.3 : 0.03 + Math.random() * 0.05;
    }
  });
}

/**
 * The startup chord. `hitIn` is how long until the chord lands (the swell
 * leads into it); everything is scheduled now on the audio clock.
 */
export function startupChime(key: string | undefined, hitIn = 0.9) {
  safely((ctx) => {
    const { midi, minor } = rootOf(key);
    const out = ctx.createGain();
    out.gain.value = 0.22;
    out.connect(ctx.destination);
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    out.connect(wet).connect(reverb(ctx));
    const now = ctx.currentTime + 0.02;
    const hit = now + hitIn;

    // the swell: noise rising into the hit
    const swell = ctx.createBufferSource();
    swell.buffer = noise(ctx, hitIn + 0.1);
    const sf = ctx.createBiquadFilter();
    sf.type = "bandpass";
    sf.Q.value = 0.8;
    sf.frequency.setValueAtTime(400, now);
    sf.frequency.exponentialRampToValueAtTime(5200, hit);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.0001, now);
    sg.gain.exponentialRampToValueAtTime(0.35, hit - 0.02);
    sg.gain.exponentialRampToValueAtTime(0.0001, hit + 0.05);
    swell.connect(sf).connect(sg).connect(out);
    swell.start(now);

    // a soft thump under the hit
    const kick = ctx.createOscillator();
    kick.frequency.setValueAtTime(110, hit);
    kick.frequency.exponentialRampToValueAtTime(hz(midi - 36), hit + 0.25);
    const kg = ctx.createGain();
    kg.gain.setValueAtTime(0.9, hit);
    kg.gain.exponentialRampToValueAtTime(0.001, hit + 0.9);
    kick.connect(kg).connect(out);
    kick.start(hit);
    kick.stop(hit + 1);

    // the pad: root, fifth, ninth, third and fifth above, two detuned saws each
    const third = minor ? 3 : 4;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 2;
    filter.frequency.setValueAtTime(500, hit);
    filter.frequency.exponentialRampToValueAtTime(4200, hit + 1.1);
    filter.frequency.exponentialRampToValueAtTime(900, hit + 4.5);
    const pad = ctx.createGain();
    pad.gain.setValueAtTime(0.0001, hit);
    pad.gain.exponentialRampToValueAtTime(0.16, hit + 0.06);
    pad.gain.exponentialRampToValueAtTime(0.09, hit + 1.2);
    pad.gain.exponentialRampToValueAtTime(0.0001, hit + 5);
    filter.connect(pad).connect(out);
    for (const n of [-12, -5, 2, 12 + third, 19]) {
      for (const det of [-7, 7]) {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = hz(midi + n);
        o.detune.value = det;
        o.connect(filter);
        o.start(hit);
        o.stop(hit + 5.1);
      }
    }

    // bells on top, rising, with an echo
    const echo = ctx.createDelay(1);
    echo.delayTime.value = 0.32;
    const fb = ctx.createGain();
    fb.gain.value = 0.38;
    echo.connect(fb).connect(echo);
    const bells = ctx.createGain();
    bells.gain.value = 0.5;
    bells.connect(out);
    bells.connect(echo);
    echo.connect(out);
    [12, 19, 24, 24 + third, 31].forEach((n, i) => {
      const t = hit + 0.12 + i * 0.13;
      for (const [mult, lvl] of [
        [1, 0.12],
        [2.76, 0.03],
      ] as const) {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = hz(midi + n) * mult;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(lvl, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
        o.connect(g).connect(bells);
        o.start(t);
        o.stop(t + 1.7);
      }
    });
    setTimeout(() => out.disconnect(), (hitIn + 8) * 1000);
  });
}
