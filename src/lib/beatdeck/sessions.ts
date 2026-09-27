// Studio sessions: one-use items, held two at a time. Most work on cards
// you select in your hand, so they're used during a round.

import type { CardMod } from "./cards";
import type { Rarity } from "./cards";

export type SessionId =
  | "splice"
  | "saturate"
  | "goldleaf"
  | "doubletrack"
  | "press"
  | "mastering"
  | "retake"
  | "freshcrate"
  | "royalty";

export interface SessionDef {
  id: SessionId;
  name: string;
  text: string;
  price: number;
  rarity: Rarity;
  /** How many selected hand cards it needs: 0, exactly 1, or 1–2. */
  targets: 0 | 1 | 2;
  /** Card upgrade it applies, if any. */
  mod?: CardMod;
  /** Only usable during a round (not in the shop). */
  inRound: boolean;
}

export const SESSIONS: SessionDef[] = [
  { id: "splice", name: "Tape Splice", text: "Copy a selected card into your deck.", price: 4, rarity: "uncommon", targets: 1, inRound: true },
  { id: "saturate", name: "Saturator", text: "Tape-saturate up to 2 selected cards (+2 hype when played).", price: 4, rarity: "common", targets: 2, mod: "tape", inRound: true },
  { id: "goldleaf", name: "Gold Leaf", text: "Gild a selected card (+$1 every time it's played).", price: 3, rarity: "common", targets: 1, mod: "gold", inRound: true },
  { id: "doubletrack", name: "Double Tracking", text: "Double-track a selected card (every hit scores twice).", price: 5, rarity: "uncommon", targets: 1, mod: "double", inRound: true },
  { id: "press", name: "Pressing Plant", text: "Press a selected card to vinyl (×1.3 hype when played).", price: 5, rarity: "rare", targets: 1, mod: "vinyl", inRound: true },
  { id: "mastering", name: "Mastering", text: "Level up the beat type of the selected cards.", price: 3, rarity: "common", targets: 2, inRound: true },
  { id: "retake", name: "One More Take", text: "+1 take this round.", price: 4, rarity: "uncommon", targets: 0, inRound: true },
  { id: "freshcrate", name: "Fresh Crate", text: "+2 redraws this round.", price: 3, rarity: "common", targets: 0, inRound: true },
  { id: "royalty", name: "Royalty Check", text: "Gain $6.", price: 3, rarity: "common", targets: 0, inRound: false },
];

export const SESSION_BY_ID = Object.fromEntries(SESSIONS.map((s) => [s.id, s])) as Record<SessionId, SessionDef>;
export const MAX_SESSIONS = 2;
