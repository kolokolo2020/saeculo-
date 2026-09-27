// Personal bests in localStorage. Storage can be missing (private mode,
// blocked cookies) — reads fall back to 0 and writes fail silently.
export const BEST_KEYS = {
  /** Beat Deck: the highest total score of a run. */
  deck: "saeculo-deck-best",
  /** Beat Deck: the furthest round reached (9 = won). */
  deckRound: "saeculo-deck-round",
  /** Beat Deck: runs won. */
  deckWins: "saeculo-deck-wins",
} as const;

export type BestKey = keyof typeof BEST_KEYS;

export function readBest(game: BestKey): number {
  try {
    return Number(localStorage.getItem(BEST_KEYS[game])) || 0;
  } catch {
    return 0;
  }
}

/** Saves `score` if it beats the stored best; returns the resulting best. */
export function submitBest(game: BestKey, score: number): number {
  const prev = readBest(game);
  if (score <= prev) return prev;
  try {
    localStorage.setItem(BEST_KEYS[game], String(score));
  } catch {
    // storage unavailable — the best still shows for this session
  }
  return score;
}
