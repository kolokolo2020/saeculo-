import { getAudioContext } from "@/lib/audioContext";
import { createMaster, playSound, type Lane } from "./kit";

// Four lanes, sixteen steps, scheduled ahead on the audio clock (a short
// timer tops up the next ~120 ms of hits), so timing holds even when the
// page is busy drawing. The UI asks `position()` each frame for the step
// that's sounding right now.

export const STEPS = 16;

export interface Pattern {
  steps: boolean[][]; // [lane][step]
  tempo: number;
  swing: number; // 0..0.5 of a 16th
  sounds: [string, string, string, string];
}

export const STARTER: Pattern = {
  tempo: 84,
  swing: 0.2,
  sounds: ["kick", "snare", "hat", "keys"],
  steps: [
    "x.....x...x.....",
    "....x.......x...",
    "x.x.x.x.x.x.x.xx",
    "x..........x....",
  ].map((row) => [...row].map((c) => c === "x")),
};

export const clonePattern = (p: Pattern): Pattern => ({ ...p, sounds: [...p.sounds], steps: p.steps.map((r) => [...r]) });

export class Sequencer {
  pattern: Pattern;
  playing = false;
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private timer = 0;
  private nextTime = 0;
  private step = 0;
  private bar = 0;
  private queue: { time: number; step: number; bar: number }[] = [];
  private last = { step: -1, bar: 0 };
  private onChange?: () => void;

  setPattern(p: Pattern) {
    this.pattern = p;
  }

  /** One listener for start/stop; returns an unsubscribe. */
  listen(fn: () => void) {
    this.onChange = fn;
    return () => {
      if (this.onChange === fn) this.onChange = undefined;
    };
  }

  constructor(pattern: Pattern) {
    this.pattern = clonePattern(pattern);
  }

  private ensure() {
    if (this.ctx && this.out) return { ctx: this.ctx, out: this.out };
    const ctx = getAudioContext();
    const master = createMaster(ctx);
    master.output.connect(ctx.destination);
    this.ctx = ctx;
    this.out = master.input;
    return { ctx, out: master.input };
  }

  /** Audition one sound now (tapping a lane name, a new find). */
  preview(id: string, bar = 0) {
    const { ctx, out } = this.ensure();
    playSound(ctx, out, id, ctx.currentTime + 0.01, bar);
  }

  start() {
    if (this.playing) return;
    const { ctx } = this.ensure();
    void ctx.resume();
    this.playing = true;
    this.step = 0;
    this.bar = 0;
    this.queue = [];
    this.nextTime = ctx.currentTime + 0.06;
    this.tick();
    this.timer = window.setInterval(() => this.tick(), 25);
    this.onChange?.();
  }

  stop() {
    if (!this.playing) return;
    this.playing = false;
    clearInterval(this.timer);
    this.queue = [];
    this.last = { step: -1, bar: 0 };
    this.onChange?.();
  }

  dispose() {
    this.stop();
    if (this.out) {
      const out = this.out;
      // let the tails ring out, then unhook
      setTimeout(() => out.disconnect(), 1500);
    }
    this.out = null;
    this.ctx = null;
  }

  private tick() {
    const ctx = this.ctx;
    const out = this.out;
    if (!ctx || !out) return;
    const p = this.pattern;
    const stepDur = 60 / p.tempo / 4;
    while (this.nextTime < ctx.currentTime + 0.12) {
      const swingDelay = this.step % 2 === 1 ? p.swing * stepDur : 0;
      const t = this.nextTime + swingDelay;
      for (let lane = 0 as Lane; lane < 4; lane = (lane + 1) as Lane) {
        if (p.steps[lane][this.step]) {
          // accents on the beat, a touch softer in between
          const vel = lane === 2 ? (this.step % 4 === 0 ? 1 : this.step % 2 === 0 ? 0.8 : 0.6) : 1;
          playSound(ctx, out, p.sounds[lane], t, this.bar, vel);
        }
      }
      this.queue.push({ time: t, step: this.step, bar: this.bar });
      this.nextTime += stepDur;
      this.step++;
      if (this.step >= STEPS) {
        this.step = 0;
        this.bar++;
      }
    }
  }

  /** The step sounding now, for the playhead. */
  position(): { step: number; bar: number } {
    const ctx = this.ctx;
    if (!ctx || !this.playing) return { step: -1, bar: 0 };
    while (this.queue.length && this.queue[0].time <= ctx.currentTime) {
      const q = this.queue.shift()!;
      this.last = { step: q.step, bar: q.bar };
    }
    return this.last;
  }
}
