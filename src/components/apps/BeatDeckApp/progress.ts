// Everything Beat Deck remembers between runs, in localStorage: unlocked
// decks, lifetime stats, the cards and gear you've come across (for the
// Crate), the tutorial flag and settings. Storage may be unavailable —
// every read falls back to defaults and writes fail silently.

import type { DeckKind } from "@/lib/beatdeck/cards";
import type { RunState } from "@/lib/beatdeck/run";

const KEY = "saeculo-deck-progress";

export type Speed = "normal" | "fast" | "instant";

export interface Progress {
  unlocked: DeckKind[];
  runs: number;
  wins: number;
  bestTotal: number;
  bestTake: number;
  furthest: number;
  seenCards: string[];
  seenGear: string[];
  tutorialDone: boolean;
  speed: Speed;
  sfx: boolean;
}

export const DEFAULT_PROGRESS: Progress = {
  unlocked: ["classic"],
  runs: 0,
  wins: 0,
  bestTotal: 0,
  bestTake: 0,
  furthest: 0,
  seenCards: [],
  seenGear: [],
  tutorialDone: false,
  speed: "normal",
  sfx: true,
};

export function loadProgress(): Progress {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (saved && typeof saved === "object") return { ...DEFAULT_PROGRESS, ...saved };
  } catch {
    // unreadable — start fresh
  }
  return { ...DEFAULT_PROGRESS };
}

export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // storage unavailable
  }
}

const addAll = (list: string[], items: Iterable<string>) => {
  const set = new Set(list);
  for (const i of items) set.add(i);
  return set.size === list.length ? list : [...set];
};

/** Note every card and gear piece this state shows the player. */
export function noteSeen(p: Progress, run: RunState): Progress {
  const cards = [
    ...run.hand.map((u) => run.deck.find((c) => c.uid === u)?.id).filter((x): x is string => !!x),
    ...(run.shop?.cards.filter((x): x is string => !!x) ?? []),
  ];
  const gear = [...run.gear, ...(run.shop?.gear.filter((x): x is NonNullable<typeof x> => !!x) ?? [])];
  const seenCards = addAll(p.seenCards, cards);
  const seenGear = addAll(p.seenGear, gear);
  return seenCards === p.seenCards && seenGear === p.seenGear ? p : { ...p, seenCards, seenGear };
}

/** Unlocks earned by how far a run got. Returns the decks newly unlocked. */
export function unlocksFor(p: Progress, run: RunState): DeckKind[] {
  const reached = run.phase === "victory" || run.endless ? Math.max(9, run.round) : run.round;
  const earned: DeckKind[] = [];
  if (reached >= 4) earned.push("trap");
  if (reached >= 7) earned.push("lofi");
  if (run.phase === "victory" || run.endless) earned.push("digger");
  return earned.filter((d) => !p.unlocked.includes(d));
}
