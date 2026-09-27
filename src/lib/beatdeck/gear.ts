// Gear: passive upgrades bought in the shop, up to five at once. Each one
// bends the scoring rules (see scoring.ts, where every effect lives).

import type { Rarity } from "./cards";

export type GearId =
  | "mpc"
  | "tr808"
  | "tapedeck"
  | "sidechain"
  | "metronome"
  | "crate"
  | "reverb"
  | "hypeman"
  | "fills"
  | "hatroller"
  | "monitors"
  | "goldchain"
  | "minimal"
  | "purist"
  | "ghost"
  | "laptop";

export interface GearDef {
  id: GearId;
  name: string;
  text: string;
  price: number;
  rarity: Rarity;
}

export const GEAR: GearDef[] = [
  { id: "mpc", name: "MPC 60", text: "+1 groove for every hit on an off-beat step.", price: 6, rarity: "uncommon" },
  { id: "tr808", name: "TR-808", text: "Bass hits give +3 groove.", price: 5, rarity: "common" },
  { id: "tapedeck", name: "Tape Deck", text: "+4 hype if the take has 3 cards or fewer.", price: 5, rarity: "common" },
  { id: "sidechain", name: "Sidechain Comp", text: "Knock (kick + bass on the same step) gives +6 groove instead of +2.", price: 6, rarity: "uncommon" },
  { id: "metronome", name: "Metronome", text: "+3 hype if a kick lands on all four downbeats.", price: 4, rarity: "common" },
  { id: "crate", name: "Record Crate", text: "+2 hype per chop card in the take.", price: 5, rarity: "uncommon" },
  { id: "reverb", name: "Spring Reverb", text: "×1.5 hype if the take has an FX card.", price: 6, rarity: "uncommon" },
  { id: "hypeman", name: "Hype Man", text: "+1 hype for every take already played this round.", price: 6, rarity: "uncommon" },
  { id: "fills", name: "Fill Master", text: "Hits on the last four steps give +3 groove.", price: 4, rarity: "common" },
  { id: "hatroller", name: "Hat Roller", text: "Hat hits give +2 groove.", price: 4, rarity: "common" },
  { id: "monitors", name: "Studio Monitors", text: "×1.3 hype on every take.", price: 8, rarity: "rare" },
  { id: "goldchain", name: "Gold Chain", text: "+$3 after every client.", price: 5, rarity: "common" },
  { id: "minimal", name: "Minimalist", text: "+1 hype for every silent step.", price: 5, rarity: "uncommon" },
  { id: "purist", name: "Genre Purist", text: "The one-genre bonus is +6 hype instead of +2.", price: 6, rarity: "uncommon" },
  { id: "ghost", name: "Ghost Producer", text: "The first take of every round scores double.", price: 8, rarity: "rare" },
  { id: "laptop", name: "Old Laptop", text: "+25 groove. 1 in 6 takes crashes and scores nothing.", price: 3, rarity: "common" },
];

export const GEAR_BY_ID = Object.fromEntries(GEAR.map((g) => [g.id, g])) as Record<GearId, GearDef>;
export const MAX_GEAR = 5;
