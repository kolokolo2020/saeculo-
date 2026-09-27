// Interface sounds for Beat Deck: small, synthesized, all on the shared
// context. Everything checks the player's SFX setting first.

import { liveOut } from "./sound";
import { useDeckStore } from "./deckStore";

type Sfx = "select" | "deselect" | "deal" | "play" | "cash" | "win" | "lose" | "big" | "session";

function beep(ctx: AudioContext, dest: AudioNode, t: number, freq: number, dur: number, type: OscillatorType, gain: number, toFreq?: number) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (toFreq) o.frequency.exponentialRampToValueAtTime(toFreq, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export function sfx(kind: Sfx) {
  if (!useDeckStore.getState().progress.sfx) return;
  const { ctx, input } = liveOut();
  const t = ctx.currentTime + 0.005;
  switch (kind) {
    case "select":
      beep(ctx, input, t, 1320, 0.05, "triangle", 0.12);
      break;
    case "deselect":
      beep(ctx, input, t, 880, 0.05, "triangle", 0.08);
      break;
    case "deal":
      beep(ctx, input, t, 2400, 0.025, "square", 0.025, 1200);
      break;
    case "play":
      beep(ctx, input, t, 300, 0.18, "sawtooth", 0.05, 1200);
      break;
    case "cash":
      beep(ctx, input, t, 1568, 0.08, "square", 0.05);
      beep(ctx, input, t + 0.07, 2093, 0.16, "square", 0.05);
      break;
    case "session":
      [880, 1175, 1568].forEach((f, i) => beep(ctx, input, t + i * 0.05, f, 0.14, "sine", 0.08));
      break;
    case "big":
      [523, 659, 784, 1047].forEach((f, i) => beep(ctx, input, t + i * 0.045, f, 0.22, "triangle", 0.09));
      break;
    case "win":
      [523, 659, 784, 1047, 1319].forEach((f, i) => beep(ctx, input, t + i * 0.09, f, 0.3, "triangle", 0.1));
      break;
    case "lose":
      [392, 330, 262, 196].forEach((f, i) => beep(ctx, input, t + i * 0.16, f, 0.35, "triangle", 0.09));
      break;
  }
}
