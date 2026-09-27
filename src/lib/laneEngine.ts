// The shared core of the lane-based rhythm games (Rhythm Rush, Beat Brawl):
// beat-quantized note charts, an audio-clock game timer, hit judging, and
// the canvas renderer with lane receptors and hit sparks.
//
// It's a plain class on purpose: it owns a lot of per-frame mutable state
// (notes being judged, particles decaying) that has no business living in
// React state, and keeping it out of hooks keeps the render path clean.
import { readLatencyOffsetMs } from "./latency";

export const LANE_KEYS = ["d", "f", "j", "k"] as const;
export const LANE_COUNT = LANE_KEYS.length;
export const LANE_COLORS = ["#ff9a3c", "#39a6ff", "#5fd35f", "#ff5fa2"];

export type Judgement = "perfect" | "good" | "miss";

export interface LaneNote {
  time: number;
  lane: number;
  judged: boolean;
  hit: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

/** Above this, a beat is felt half-time (trap at 140 grooves like 70), so
 *  charts follow the half-time grid instead of piling up notes. */
const HALF_TIME_ABOVE_BPM = 125;

/** Chart notes on the 8th-note grid of the track, starting after a one-bar
 *  count-in. On-beat slots are likelier than off-beats so the pattern
 *  follows the groove instead of reading as random noise. */
export function generateLaneNotes(bpm: number, lengthS: number, density: number): LaneNote[] {
  const beat = (60 / bpm) * (bpm > HALF_TIME_ABOVE_BPM ? 2 : 1);
  const eighth = beat / 2;
  const notes: LaneNote[] = [];
  let lastLane = -1;
  for (let i = 0; ; i++) {
    const time = beat * 4 + i * eighth;
    if (time > lengthS) break;
    const onBeat = i % 2 === 0;
    const p = density * (onBeat ? 1.2 : 0.65);
    if (Math.random() > p) continue;
    let lane = Math.floor(Math.random() * LANE_COUNT);
    if (lane === lastLane && Math.random() < 0.6) lane = (lane + 1) % LANE_COUNT;
    lastLane = lane;
    notes.push({ time, lane, judged: false, hit: false });
  }
  return notes;
}

export class LaneEngine {
  notes: LaneNote[] = [];
  beatDur = 0.6;
  endTime = 30;
  private particles: Particle[] = [];
  private laneFlash = new Array<number>(LANE_COUNT).fill(-1e9);
  private ctx: AudioContext | null = null;
  private clockStart = 0;
  private perfStart = 0;
  private latency = 0;
  private userOffset = 0;
  private useAudioClock = false;

  constructor(
    public perfectWindow = 0.07,
    public goodWindow = 0.16,
  ) {}

  /** Arm the engine. `startAt` is the AudioContext time the backing track
   *  starts; game time 0 is that moment. */
  begin(ctx: AudioContext, startAt: number, bpm: number, notes: LaneNote[], endTime: number) {
    this.ctx = ctx;
    this.clockStart = startAt;
    this.beatDur = 60 / bpm;
    this.notes = notes;
    this.endTime = endTime;
    this.particles = [];
    this.laneFlash.fill(-1e9);
    // The audio clock is the only one that can't drift from what you hear —
    // but a suspended context never advances, so fall back to wall time.
    this.useAudioClock = ctx.state === "running";
    this.latency = ctx.outputLatency || ctx.baseLatency || 0;
    this.userOffset = readLatencyOffsetMs() / 1000;
    this.perfStart = performance.now() + (startAt - ctx.currentTime) * 1000;
  }

  now(): number {
    if (this.useAudioClock && this.ctx) {
      return this.ctx.currentTime - this.clockStart - this.latency - this.userOffset;
    }
    return (performance.now() - this.perfStart) / 1000 - this.userOffset;
  }

  /** Mark notes that scrolled past the window as missed; returns them. */
  sweepMisses(): LaneNote[] {
    const now = this.now();
    const missed: LaneNote[] = [];
    for (const note of this.notes) {
      if (!note.judged && now - note.time > this.goodWindow) {
        note.judged = true;
        missed.push(note);
      }
    }
    return missed;
  }

  /** A key/button press on a lane. Returns null when nothing was in range. */
  press(lane: number): { judgement: "perfect" | "good"; delta: number } | null {
    this.laneFlash[lane] = performance.now();
    const now = this.now();
    let best: LaneNote | null = null;
    let bestDelta = Infinity;
    for (const note of this.notes) {
      if (note.judged || note.lane !== lane) continue;
      const delta = Math.abs(note.time - now);
      if (delta < bestDelta) {
        bestDelta = delta;
        best = note;
      }
    }
    if (!best || bestDelta > this.goodWindow) return null;
    best.judged = true;
    best.hit = true;
    this.spark(lane);
    return { judgement: bestDelta <= this.perfectWindow ? "perfect" : "good", delta: bestDelta };
  }

  private lastW = 0;
  private lastH = 0;

  private spark(lane: number) {
    const w = this.lastW;
    const h = this.lastH;
    if (!w) return;
    const laneW = w / LANE_COUNT;
    const x = lane * laneW + laneW / 2;
    const y = h - 44;
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI - Math.PI;
      const speed = 1.5 + Math.random() * 3.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 1,
        color: LANE_COLORS[lane],
      });
    }
  }

  draw(canvas: HTMLCanvasElement | null, travelS: number) {
    const ctx2d = canvas?.getContext("2d");
    if (!canvas || !ctx2d) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.lastW = w;
    this.lastH = h;

    const now = this.now();
    const laneW = w / LANE_COUNT;
    const hitY = h - 44;
    const beatPhase = ((now % this.beatDur) + this.beatDur) % this.beatDur;
    const pulse = now > 0 ? Math.max(0, 1 - beatPhase / (this.beatDur * 0.5)) : 0;

    // background: deep blue with a soft pulse on every beat
    const bg = ctx2d.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#050c1a");
    bg.addColorStop(1, `rgba(${14 + pulse * 20}, ${34 + pulse * 30}, ${70 + pulse * 50}, 1)`);
    ctx2d.fillStyle = bg;
    ctx2d.fillRect(0, 0, w, h);

    // lanes
    for (let i = 0; i < LANE_COUNT; i++) {
      const flashAge = (performance.now() - this.laneFlash[i]) / 1000;
      const flash = Math.max(0, 1 - flashAge / 0.15);
      if (flash > 0) {
        const g = ctx2d.createLinearGradient(0, hitY, 0, 0);
        g.addColorStop(0, hexA(LANE_COLORS[i], 0.35 * flash));
        g.addColorStop(1, hexA(LANE_COLORS[i], 0));
        ctx2d.fillStyle = g;
        ctx2d.fillRect(i * laneW, 0, laneW, hitY);
      }
      if (i > 0) {
        ctx2d.fillStyle = "rgba(120,180,255,0.12)";
        ctx2d.fillRect(i * laneW, 0, 1, h);
      }
    }

    // beat grid lines scrolling toward the hit line
    ctx2d.fillStyle = "rgba(160,200,255,0.10)";
    const firstBeat = Math.ceil((now - 0.2) / this.beatDur);
    for (let b = firstBeat; b * this.beatDur < now + travelS; b++) {
      const progress = 1 - (b * this.beatDur - now) / travelS;
      const y = progress * hitY;
      ctx2d.fillRect(0, y, w, b % 4 === 0 ? 2 : 1);
    }

    // receptors on the hit line
    for (let i = 0; i < LANE_COUNT; i++) {
      const flashAge = (performance.now() - this.laneFlash[i]) / 1000;
      const lit = flashAge < 0.12;
      const x = i * laneW + laneW * 0.14;
      roundRect(ctx2d, x, hitY - 9, laneW * 0.72, 18, 6);
      ctx2d.fillStyle = lit ? hexA(LANE_COLORS[i], 0.85) : "rgba(255,255,255,0.06)";
      ctx2d.fill();
      ctx2d.lineWidth = 2;
      ctx2d.strokeStyle = hexA(LANE_COLORS[i], lit ? 1 : 0.55);
      ctx2d.stroke();
    }

    // notes
    for (const note of this.notes) {
      if (note.hit) continue;
      const progress = 1 - (note.time - now) / travelS;
      if (progress < -0.05 || progress > 1.2) continue;
      const y = progress * hitY;
      const x = note.lane * laneW + laneW * 0.14;
      const nw = laneW * 0.72;
      const color = LANE_COLORS[note.lane];
      const faded = note.judged ? 0.3 : 1;
      ctx2d.globalAlpha = faded;
      ctx2d.shadowColor = color;
      ctx2d.shadowBlur = progress > 0.8 ? 14 : 6;
      roundRect(ctx2d, x, y - 8, nw, 16, 6);
      const g = ctx2d.createLinearGradient(0, y - 8, 0, y + 8);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.25, color);
      g.addColorStop(1, shade(color, -0.35));
      ctx2d.fillStyle = g;
      ctx2d.fill();
      ctx2d.shadowBlur = 0;
      ctx2d.globalAlpha = 1;
    }

    // sparks
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.life -= 0.035;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const p of this.particles) {
      ctx2d.fillStyle = hexA(p.color, p.life);
      ctx2d.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }

    // key hints under the receptors
    ctx2d.font = "600 11px sans-serif";
    ctx2d.textAlign = "center";
    for (let i = 0; i < LANE_COUNT; i++) {
      ctx2d.fillStyle = "rgba(220,235,255,0.55)";
      ctx2d.fillText(LANE_KEYS[i].toUpperCase(), i * laneW + laneW / 2, hitY + 28);
    }
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hexA(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, alpha))})`;
}

function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.round(Math.max(0, Math.min(255, c + c * amount)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
