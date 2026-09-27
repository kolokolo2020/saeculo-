// The eight rounds of a run: clients with a request that rewards a style,
// and bosses whose rule makes you rethink your deck.

import type { Genre } from "./cards";

export type ModifierId =
  // client requests
  | "hard808"
  | "lofiOnly"
  | "short"
  | "drill"
  | "film"
  | "singer"
  | "club"
  | "digger"
  // boss rules
  | "ar"
  | "label"
  | "algorithm"
  | "noise"
  | "block"
  | "metronome";

export interface RoundDef {
  id: ModifierId;
  who: string;
  /** The request, or the boss's rule. */
  rule: string;
  boss: boolean;
  tempo: number;
  genre?: Genre;
  /** Bosses: the round's target is scaled by this to price in the rule. */
  targetScale?: number;
}

export const CLIENTS: RoundDef[] = [
  { id: "hard808", who: "A rapper from the block", rule: "Wants hard 808s: +2 hype per bass card.", boss: false, tempo: 140, genre: "trap" },
  { id: "lofiOnly", who: "A lo-fi study channel", rule: "Lo-fi cards score double groove.", boss: false, tempo: 80, genre: "lofi" },
  { id: "short", who: "An ad agency", rule: "Short and catchy: +4 hype if the take has 3 cards or fewer.", boss: false, tempo: 100 },
  { id: "drill", who: "A drill crew", rule: "Snare hits give +3 groove.", boss: false, tempo: 142, genre: "trap" },
  { id: "film", who: "An indie filmmaker", rule: "+3 hype per FX card.", boss: false, tempo: 90 },
  { id: "singer", who: "A singer", rule: "+2 hype per melody card.", boss: false, tempo: 92, genre: "boombap" },
  { id: "club", who: "A club DJ", rule: "+5 hype if a kick lands on all four downbeats.", boss: false, tempo: 124, genre: "club" },
  { id: "digger", who: "A crate digger", rule: "+3 hype per chop card.", boss: false, tempo: 88, genre: "boombap" },
];

export const BOSSES: RoundDef[] = [
  { id: "ar", who: "The A&R", rule: "Only the first 8 steps count.", boss: true, tempo: 96, targetScale: 0.75 },
  { id: "label", who: "The Label", rule: "Hi-hats are banned: they score nothing and don't count.", boss: true, tempo: 132, targetScale: 0.65 },
  { id: "algorithm", who: "The Algorithm", rule: "Takes without a melody score half.", boss: true, tempo: 120, targetScale: 0.9 },
  { id: "noise", who: "The Neighbour", rule: "Noise complaint: 3 cards per take at most.", boss: true, tempo: 86, targetScale: 0.65 },
  { id: "block", who: "Writer's Block", rule: "You only hold 6 cards.", boss: true, tempo: 90, targetScale: 0.85 },
];

export const FINAL_BOSS: RoundDef = {
  id: "metronome",
  who: "Metro Nome",
  rule: "Never repeat yourself: a beat type you already played this round scores nothing.",
  boss: true,
  tempo: 128,
  targetScale: 0.75,
};

export const ROUNDS = 8;
export const BOSS_ROUNDS = [3, 6, 8];

/** Score needed to finish each round (1-based). */
export const TARGETS = [0, 600, 1200, 1900, 2800, 3800, 4800, 6400, 8400];

export const ROUND_BY_ID = Object.fromEntries([...CLIENTS, ...BOSSES, FINAL_BOSS].map((r) => [r.id, r])) as Record<
  ModifierId,
  RoundDef
>;
