import type { CardDef } from "@/lib/beatdeck/cards";
import { getAudioContext } from "@/lib/audioContext";
import { usePlayerStore } from "@/components/player/playerStore";
import { createBus, preloadChops, scheduleTake, type RunKey } from "./deckAudio";

// Live playback on the site's shared AudioContext, through one bus.
let bus: { ctx: AudioContext; input: AudioNode } | null = null;

export function liveOut() {
  const ctx = getAudioContext();
  if (!bus || bus.ctx !== ctx) bus = { ctx, input: createBus(ctx) };
  return bus;
}

/** Call from a click: wakes audio and starts decoding the chop sources. */
export function warmUp() {
  preloadChops(liveOut().ctx);
}

export function playTakeLive(cards: CardDef[], tempo: number, key: RunKey, bars: number, lead = 0.3) {
  usePlayerStore.getState().pause();
  const { ctx, input } = liveOut();
  const start = ctx.currentTime + lead;
  const { stepDur, end } = scheduleTake(ctx, input, cards, tempo, key, start, bars);
  return { ctx, start, stepDur, end };
}
