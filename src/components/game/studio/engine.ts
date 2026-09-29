import { getAudioContext } from "@/lib/audioContext";
import { isMelodic, stepsOf, type Channel, type Project } from "./project";
import { ensureLoaded, playVoice, voiceById } from "./voices";

// The studio's audio: a small mixer (a strip per channel with low-pass,
// pan and reverb/delay sends; a master with filter, drive, glue and level)
// and a step sequencer that schedules a little ahead on the audio clock,
// so timing holds while the page is busy. The same graph and scheduling
// run in an OfflineAudioContext for WAV export.

const cutoffHz = (c: number) => 180 * Math.pow(20000 / 180, Math.min(1, Math.max(0, c)));

let impulse: AudioBuffer | null = null;
function reverbImpulse(ctx: BaseAudioContext) {
  if (impulse && impulse.sampleRate === ctx.sampleRate) return impulse;
  const len = Math.floor(ctx.sampleRate * 2.6);
  impulse = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = impulse.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      // darker as it decays, like a room
      const k = 0.2 + 0.7 * t;
      lp = lp * k + (Math.random() * 2 - 1) * (1 - k);
      d[i] = lp * Math.pow(1 - t, 3) * (i < ctx.sampleRate * 0.01 ? i / (ctx.sampleRate * 0.01) : 1) * 2.2;
    }
  }
  return impulse;
}

function driveCurve(amount: number) {
  const k = 1 + amount * 7;
  const c = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) {
    const x = (i / 1023) * 2 - 1;
    c[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return c;
}

interface Strip {
  input: GainNode;
  lp: BiquadFilterNode;
  pan: StereoPannerNode;
  rev: GainNode;
  dly: GainNode;
}

class Graph {
  readonly ctx: BaseAudioContext;
  readonly input: GainNode;
  readonly analyser: AnalyserNode;
  private filter: BiquadFilterNode;
  private shaper: WaveShaperNode;
  private out: GainNode;
  private revIn: ConvolverNode;
  private revOut: GainNode;
  private dlyIn: DelayNode;
  private dlyFb: GainNode;
  private dlyOut: GainNode;
  private strips = new Map<string, Strip>();
  private lastDrive = -1;

  constructor(ctx: BaseAudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.filter = ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.shaper = ctx.createWaveShaper();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 3;
    comp.attack.value = 0.008;
    comp.release.value = 0.18;
    this.out = ctx.createGain();
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.input.connect(this.filter).connect(this.shaper).connect(comp).connect(this.out).connect(this.analyser).connect(destination);

    this.revIn = ctx.createConvolver();
    this.revIn.buffer = reverbImpulse(ctx);
    this.revOut = ctx.createGain();
    this.revIn.connect(this.revOut).connect(this.input);

    this.dlyIn = ctx.createDelay(2);
    this.dlyFb = ctx.createGain();
    this.dlyFb.gain.value = 0.38;
    const dlyTone = ctx.createBiquadFilter();
    dlyTone.type = "lowpass";
    dlyTone.frequency.value = 2800;
    this.dlyOut = ctx.createGain();
    this.dlyIn.connect(dlyTone).connect(this.dlyFb).connect(this.dlyIn);
    dlyTone.connect(this.dlyOut).connect(this.input);
  }

  strip(id: string): Strip {
    let s = this.strips.get(id);
    if (!s) {
      const ctx = this.ctx;
      s = { input: ctx.createGain(), lp: ctx.createBiquadFilter(), pan: ctx.createStereoPanner(), rev: ctx.createGain(), dly: ctx.createGain() };
      s.lp.type = "lowpass";
      s.input.connect(s.lp).connect(s.pan).connect(this.input);
      s.pan.connect(s.rev).connect(this.revIn);
      s.pan.connect(s.dly).connect(this.dlyIn);
      this.strips.set(id, s);
    }
    return s;
  }

  /** Bring every level and setting in line with the project. */
  sync(p: Project, smooth = 0.03) {
    const at = this.ctx.currentTime;
    const set = (param: AudioParam, v: number) => (smooth ? param.setTargetAtTime(v, at, smooth) : (param.value = v));
    const soloing = p.channels.some((c) => c.solo);
    const live = new Set<string>();
    for (const c of p.channels) {
      live.add(c.id);
      const s = this.strip(c.id);
      set(s.input.gain, audible(c, soloing) ? c.vol * c.vol : 0);
      set(s.lp.frequency, cutoffHz(c.cutoff));
      set(s.pan.pan, c.pan);
      set(s.rev.gain, c.rev);
      set(s.dly.gain, c.dly * 0.8);
    }
    for (const [id, s] of this.strips) {
      if (live.has(id)) continue;
      s.input.gain.setTargetAtTime(0, at, 0.05);
      setTimeout(() => s.pan.disconnect(), 800);
      this.strips.delete(id);
    }
    const m = p.master;
    set(this.filter.frequency, cutoffHz(m.cutoff));
    set(this.out.gain, m.vol);
    set(this.revOut.gain, m.reverb * 0.7);
    set(this.dlyOut.gain, m.delay * 0.7);
    // a dotted eighth, the classic
    set(this.dlyIn.delayTime, Math.min(1.9, (60 / p.tempo) * 0.75));
    if (Math.abs(m.drive - this.lastDrive) > 0.01) {
      this.shaper.curve = driveCurve(m.drive);
      this.lastDrive = m.drive;
    }
  }

  disconnect() {
    this.analyser.disconnect();
  }
}

const audible = (c: Channel, soloing: boolean) => !c.mute && (!soloing || c.solo);

/** Everything that starts on one step of one pattern. */
function scheduleStep(g: Graph, p: Project, patIndex: number, step: number, time: number) {
  const pat = p.patterns[patIndex];
  if (!pat) return;
  const stepDur = 60 / p.tempo / 4;
  const soloing = p.channels.some((c) => c.solo);
  for (const c of p.channels) {
    if (!audible(c, soloing)) continue;
    const out = g.strip(c.id).input;
    if (isMelodic(c)) {
      for (const n of pat.notes[c.id] ?? []) {
        if (n.step === step) playVoice(g.ctx, out, c.voice, time, { midi: n.midi + c.pitch, dur: n.len * stepDur, vel: n.vel });
      }
    } else {
      const v = stepsOf(pat, c.id, p.length)[step];
      if (v > 0) playVoice(g.ctx, out, c.voice, time, { midi: 60 + c.pitch, vel: v, dur: stepDur });
    }
  }
}

/** The song's slots with a pattern in them, in order. */
export const songSlots = (p: Project) => p.song.map((pat, slot) => ({ pat, slot })).filter((s) => s.pat >= 0);

const voicesIn = (p: Project) => p.channels.map((c) => c.voice).filter((id) => voiceById(id)?.load);

export interface Position {
  step: number;
  pattern: number;
  slot: number;
}

export class Engine {
  project: Project;
  /** The pattern that loops in pattern mode (the one being edited). */
  pattern = 0;
  playing = false;
  loading = false;
  private ctx: AudioContext | null = null;
  private graph: Graph | null = null;
  private timer = 0;
  private nextTime = 0;
  private step = 0;
  private slotIdx = 0;
  private queue: (Position & { time: number })[] = [];
  private last: Position = { step: -1, pattern: 0, slot: -1 };
  private lastTime = 0;
  private listeners = new Set<() => void>();
  private meter = new Float32Array(1024);

  constructor(project: Project) {
    this.project = project;
  }

  listen(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  private emit() {
    this.listeners.forEach((f) => f());
  }

  private ensure() {
    if (!this.ctx || !this.graph) {
      this.ctx = getAudioContext();
      this.graph = new Graph(this.ctx, this.ctx.destination);
      this.graph.sync(this.project, 0);
    }
    return { ctx: this.ctx, graph: this.graph };
  }

  selectPattern(i: number) {
    this.pattern = i;
  }

  setProject(p: Project) {
    this.project = p;
    this.graph?.sync(p);
  }

  /** Hear one sound now: through a channel's strip if given. */
  async preview(voice: string, opts: { midi?: number; dur?: number; channel?: string } = {}) {
    const { ctx, graph } = this.ensure();
    void ctx.resume();
    await ensureLoaded([voice]);
    const out = opts.channel && this.project.channels.some((c) => c.id === opts.channel) ? graph.strip(opts.channel).input : graph.input;
    playVoice(ctx, out, voice, ctx.currentTime + 0.01, { midi: opts.midi ?? 60, dur: opts.dur ?? 0.4, vel: 0.9 });
  }

  async start() {
    if (this.playing || this.loading) return;
    const { ctx, graph } = this.ensure();
    void ctx.resume();
    const need = voicesIn(this.project);
    if (need.length) {
      this.loading = true;
      this.emit();
      await ensureLoaded(need);
      this.loading = false;
    }
    graph.sync(this.project, 0);
    this.playing = true;
    this.step = 0;
    this.slotIdx = 0;
    this.queue = [];
    this.nextTime = ctx.currentTime + 0.08;
    this.tick();
    this.timer = window.setInterval(() => this.tick(), 25);
    this.emit();
  }

  stop() {
    if (!this.playing) return;
    this.playing = false;
    clearInterval(this.timer);
    this.queue = [];
    this.last = { step: -1, pattern: this.pattern, slot: -1 };
    this.emit();
  }

  dispose() {
    this.stop();
    const g = this.graph;
    if (g) setTimeout(() => g.disconnect(), 2500);
    this.graph = null;
    this.ctx = null;
  }

  private current(): { pat: number; slot: number } {
    const p = this.project;
    if (p.mode === "song") {
      const slots = songSlots(p);
      if (slots.length) {
        const s = slots[this.slotIdx % slots.length];
        return { pat: s.pat, slot: s.slot };
      }
    }
    return { pat: this.pattern, slot: -1 };
  }

  private tick() {
    const ctx = this.ctx;
    const g = this.graph;
    if (!ctx || !g) return;
    const p = this.project;
    const stepDur = 60 / p.tempo / 4;
    while (this.nextTime < ctx.currentTime + 0.12) {
      if (this.step >= p.length) this.step = 0;
      const { pat, slot } = this.current();
      const swing = this.step % 2 === 1 ? p.swing * stepDur : 0;
      const t = this.nextTime + swing;
      scheduleStep(g, p, pat, this.step, t);
      this.queue.push({ time: t, step: this.step, pattern: pat, slot });
      this.nextTime += stepDur;
      this.step++;
      if (this.step >= p.length) {
        this.step = 0;
        this.slotIdx++;
      }
    }
  }

  /** What's sounding now, for the playheads. */
  position(): Position {
    const ctx = this.ctx;
    if (!ctx || !this.playing) return { step: -1, pattern: this.pattern, slot: -1 };
    while (this.queue.length && this.queue[0].time <= ctx.currentTime) {
      const q = this.queue.shift()!;
      this.last = { step: q.step, pattern: q.pattern, slot: q.slot };
      this.lastTime = q.time;
    }
    return this.last;
  }

  /** The playhead right now, to the nearest step: where a note played live lands when recording. */
  nearestStep(): { step: number; pattern: number } | null {
    const ctx = this.ctx;
    if (!ctx || !this.playing) return null;
    const pos = this.position();
    if (pos.step < 0) return null;
    const stepDur = 60 / this.project.tempo / 4;
    const ahead = Math.round((ctx.currentTime - this.lastTime) / stepDur);
    return { step: (pos.step + Math.max(0, ahead)) % this.project.length, pattern: pos.pattern };
  }

  /**
   * Play a note now, held until the returned function is called (keys held
   * down, a finger on the on-screen keyboard). Drums just hit.
   */
  noteOn(voice: string, midi: number, channel?: string, vel = 0.9): () => void {
    const { ctx, graph } = this.ensure();
    void ctx.resume();
    const def = voiceById(voice);
    if (!def) return () => {};
    const gate = ctx.createGain();
    gate.connect(channel && this.project.channels.some((c) => c.id === channel) ? graph.strip(channel).input : graph.input);
    const melodic = def.kind === "melodic";
    const go = () => playVoice(ctx, gate, voice, ctx.currentTime + 0.005, { midi, dur: melodic ? 4 : 0.4, vel });
    if (def.load) void ensureLoaded([voice]).then(go);
    else go();
    let done = false;
    return () => {
      if (done) return;
      done = true;
      if (melodic) gate.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      setTimeout(() => gate.disconnect(), melodic ? 1500 : 3000);
    };
  }

  /** The master's current loudness, 0..1. */
  level(): number {
    const g = this.graph;
    if (!g || !this.playing) return 0;
    g.analyser.getFloatTimeDomainData(this.meter);
    let sum = 0;
    for (let i = 0; i < this.meter.length; i++) sum += this.meter[i] * this.meter[i];
    return Math.min(1, Math.sqrt(sum / this.meter.length) * 3);
  }
}

/** Render the pattern (twice round) or the whole song to a buffer. */
export async function render(p: Project, what: "pattern" | "song", pattern: number): Promise<AudioBuffer> {
  await ensureLoaded(voicesIn(p));
  const stepDur = 60 / p.tempo / 4;
  const slots = what === "song" ? songSlots(p).map((s) => s.pat) : [];
  const order = slots.length ? slots : [pattern, pattern];
  const total = order.length * p.length;
  const sr = 44100;
  const ctx = new OfflineAudioContext(2, Math.ceil(sr * (total * stepDur + 3)), sr);
  const g = new Graph(ctx, ctx.destination);
  g.sync(p, 0);
  let i = 0;
  for (const pat of order) {
    for (let step = 0; step < p.length; step++, i++) {
      const swing = step % 2 === 1 ? p.swing * stepDur : 0;
      scheduleStep(g, p, pat, step, 0.05 + i * stepDur + swing);
    }
  }
  return ctx.startRendering();
}
