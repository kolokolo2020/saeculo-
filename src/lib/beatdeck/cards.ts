// Sound cards. A card is a one-bar pattern (16 steps) for one or more
// roles in the beat; played together in a take, they layer into a loop.

export type Role = "kick" | "snare" | "hats" | "bass" | "melody" | "fx";
export const CORE_ROLES: Role[] = ["kick", "snare", "hats", "bass", "melody"];
export type Genre = "trap" | "boombap" | "lofi" | "club";
export type Rarity = "common" | "uncommon" | "rare";

export type Voice =
  | "kick"
  | "snare"
  | "clap"
  | "rim"
  | "hat"
  | "openhat"
  | "808"
  | "sub"
  | "pluck"
  | "keys"
  | "bell"
  | "chop"
  | "riser"
  | "impact"
  | "crackle"
  | "tapestop"
  | "tag";

export interface Hit {
  step: number;
  role: Role;
  voice: Voice;
  /** Semitones above the run's root, for pitched voices. */
  note?: number;
  /** 808: slide to this note over the step. */
  glide?: number;
  /** Hats: a roll of this many quick hits in the step. */
  roll?: number;
  /** Chops: which track, and which beat of it (0-based, from its first beat). */
  chop?: { track: string; beat: number };
}

export type CardEffect =
  | "wild" // counts as whichever core role the take is missing
  | "lofiHype" // +1 hype per lo-fi card in the take
  | "hype2" // flat +2 hype
  | "echo"; // repeats the take's melody hits one step later (+groove)

export interface CardDef {
  id: string;
  name: string;
  genre: Genre;
  rarity: Rarity;
  /** Groove per hit. */
  groove: number;
  hits: Hit[];
  effect?: CardEffect;
  /** One line shown on the card, for anything beyond "plays a pattern". */
  text?: string;
}

const at = (role: Role, voice: Voice, steps: number[], extra: Partial<Hit> = {}): Hit[] =>
  steps.map((step) => ({ step, role, voice, ...extra }));

const notes = (role: Role, voice: Voice, seq: [step: number, note: number][]): Hit[] =>
  seq.map(([step, note]) => ({ step, role, voice, note }));

export const CARDS: CardDef[] = [
  // ---- kicks
  { id: "kick-four", name: "Four on the Floor", genre: "club", rarity: "common", groove: 3, hits: at("kick", "kick", [0, 4, 8, 12]) },
  { id: "kick-boombap", name: "Boom Bap Kick", genre: "boombap", rarity: "common", groove: 4, hits: at("kick", "kick", [0, 7, 10]) },
  { id: "kick-trap", name: "Trap Kick", genre: "trap", rarity: "common", groove: 3, hits: at("kick", "kick", [0, 3, 6, 11]) },
  { id: "kick-lazy", name: "Lazy Kick", genre: "lofi", rarity: "common", groove: 6, hits: at("kick", "kick", [0, 9]) },
  { id: "kick-double", name: "Double Tap", genre: "trap", rarity: "uncommon", groove: 3, hits: at("kick", "kick", [0, 2, 8, 10, 14]) },
  // ---- snares
  { id: "snare-back", name: "Backbeat Snare", genre: "boombap", rarity: "common", groove: 5, hits: at("snare", "snare", [4, 12]) },
  { id: "snare-clap", name: "Trap Clap", genre: "trap", rarity: "common", groove: 6, hits: at("snare", "clap", [8]) , text: "Half-time: one big clap." },
  { id: "snare-rim", name: "Rimshot", genre: "lofi", rarity: "common", groove: 3, hits: at("snare", "rim", [4, 12, 14]) },
  { id: "snare-roll", name: "Snare Roll", genre: "trap", rarity: "uncommon", groove: 3, hits: at("snare", "snare", [12, 13, 14, 15]) },
  { id: "snare-ghost", name: "Ghost Notes", genre: "boombap", rarity: "uncommon", groove: 2, hits: [...at("snare", "snare", [4, 12]), ...at("snare", "rim", [7, 10, 15])] },
  // ---- hats
  { id: "hats-8th", name: "8th Hats", genre: "boombap", rarity: "common", groove: 1, hits: at("hats", "hat", [0, 2, 4, 6, 8, 10, 12, 14]) },
  { id: "hats-trap", name: "Trap Hats", genre: "trap", rarity: "common", groove: 1, hits: [...at("hats", "hat", [0, 2, 4, 6, 8, 10, 12]), { step: 14, role: "hats", voice: "hat", roll: 4 }], text: "Ends on a roll." },
  { id: "hats-shuffle", name: "Shuffle Hats", genre: "lofi", rarity: "common", groove: 1, hits: at("hats", "hat", [0, 3, 4, 7, 8, 11, 12, 15]) },
  { id: "hats-open", name: "Open Hats", genre: "club", rarity: "common", groove: 2, hits: at("hats", "openhat", [2, 6, 10, 14]) },
  { id: "hats-16th", name: "16th Machine", genre: "trap", rarity: "uncommon", groove: 1, hits: at("hats", "hat", Array.from({ length: 16 }, (_, i) => i)) },
  // ---- bass
  { id: "bass-808", name: "808 Slide", genre: "trap", rarity: "common", groove: 5, hits: [{ step: 0, role: "bass", voice: "808", note: 0 }, { step: 6, role: "bass", voice: "808", note: 0, glide: 7 }, { step: 11, role: "bass", voice: "808", note: -2 }] },
  { id: "bass-sub", name: "Sub Bass", genre: "lofi", rarity: "common", groove: 6, hits: notes("bass", "sub", [[0, 0], [8, -4]]) },
  { id: "bass-walk", name: "Walking Bass", genre: "boombap", rarity: "common", groove: 3, hits: notes("bass", "sub", [[0, 0], [3, 3], [6, 5], [8, 7], [11, 5], [14, 3]]) },
  { id: "bass-drill", name: "Drill 808", genre: "trap", rarity: "uncommon", groove: 5, hits: [{ step: 0, role: "bass", voice: "808", note: 0 }, { step: 3, role: "bass", voice: "808", note: 0, glide: -2 }, { step: 10, role: "bass", voice: "808", note: 3 }, { step: 14, role: "bass", voice: "808", note: -2, glide: 0 }] },
  { id: "bass-house", name: "Offbeat Bass", genre: "club", rarity: "common", groove: 3, hits: notes("bass", "sub", [[2, 0], [6, 0], [10, 3], [14, 5]]) },
  // ---- melody
  { id: "mel-pluck", name: "Pluck Riff", genre: "trap", rarity: "common", groove: 3, hits: notes("melody", "pluck", [[0, 12], [3, 15], [6, 19], [10, 17], [12, 15]]) },
  { id: "mel-rhodes", name: "Rhodes Chords", genre: "lofi", rarity: "common", groove: 7, hits: notes("melody", "keys", [[0, 0], [8, -4]]) },
  { id: "mel-bell", name: "Bell Melody", genre: "trap", rarity: "common", groove: 2, hits: notes("melody", "bell", [[0, 24], [2, 27], [4, 31], [7, 29], [9, 27], [12, 22]]) },
  { id: "mel-stab", name: "Piano Stab", genre: "boombap", rarity: "common", groove: 4, hits: notes("melody", "keys", [[0, 0], [6, 0], [12, -2]]) },
  { id: "mel-arp", name: "Night Arp", genre: "club", rarity: "uncommon", groove: 2, hits: notes("melody", "pluck", [[0, 12], [2, 15], [4, 19], [6, 22], [8, 24], [10, 22], [12, 19], [14, 15]]) },
  // ---- chops from saeculo's own tracks
  { id: "chop-care4me", name: "care4me Chop", genre: "lofi", rarity: "uncommon", groove: 6, hits: [{ step: 0, role: "melody", voice: "chop", chop: { track: "care4me", beat: 32 } }, { step: 8, role: "melody", voice: "chop", chop: { track: "care4me", beat: 34 } }], text: "Sampled from care4me." },
  { id: "chop-elbtunnel", name: "elbtunnel Chop", genre: "trap", rarity: "uncommon", groove: 4, hits: [0, 4, 8, 12].map((step, i) => ({ step, role: "melody" as Role, voice: "chop" as Voice, chop: { track: "elbtunnel", beat: 48 + i } })), text: "Sampled from elbtunnel." },
  { id: "chop-dullknife", name: "dull knife Chop", genre: "boombap", rarity: "uncommon", groove: 5, hits: [0, 6, 10].map((step, i) => ({ step, role: "melody" as Role, voice: "chop" as Voice, chop: { track: "dull-knife", beat: 64 + i * 2 } })), text: "Sampled from dull knife." },
  // ---- fx
  { id: "fx-riser", name: "Riser", genre: "club", rarity: "common", groove: 12, hits: at("fx", "riser", [8]) },
  { id: "fx-impact", name: "Impact", genre: "trap", rarity: "common", groove: 10, hits: at("fx", "impact", [0]) },
  { id: "fx-crackle", name: "Vinyl Crackle", genre: "lofi", rarity: "uncommon", groove: 4, hits: at("fx", "crackle", [0]), effect: "lofiHype", text: "+1 hype per lo-fi card in the take." },
  { id: "fx-tapestop", name: "Tape Stop", genre: "lofi", rarity: "uncommon", groove: 6, hits: at("fx", "tapestop", [14]), effect: "hype2", text: "+2 hype." },
  { id: "fx-echo", name: "Dub Echo", genre: "club", rarity: "rare", groove: 0, hits: [], effect: "echo", text: "Melody hits echo a step later." },
  // ---- multi-role and wild cards
  { id: "loop-amen", name: "Amen Break", genre: "boombap", rarity: "rare", groove: 2, hits: [...at("kick", "kick", [0, 2, 10]), ...at("snare", "snare", [4, 7, 12, 15]), ...at("hats", "hat", [0, 2, 4, 6, 8, 10, 12, 14])], text: "Kick, snare and hats in one." },
  { id: "loop-trapkit", name: "Trap Kit", genre: "trap", rarity: "rare", groove: 2, hits: [...at("kick", "kick", [0, 6, 11]), ...at("snare", "clap", [8]), ...at("hats", "hat", [0, 2, 4, 6, 8, 10, 12, 14])], text: "Kick, clap and hats in one." },
  { id: "loop-flip", name: "Sample Flip", genre: "lofi", rarity: "rare", groove: 4, hits: [{ step: 0, role: "melody", voice: "chop", chop: { track: "care4me", beat: 40 } }, { step: 8, role: "melody", voice: "chop", chop: { track: "care4me", beat: 42 } }, ...notes("bass", "sub", [[0, 0], [8, -4]])], text: "A chop with its bassline." },
  { id: "fx-tag", name: "Producer Tag", genre: "trap", rarity: "rare", groove: 8, hits: at("fx", "tag", [0]), effect: "wild", text: "Counts as whatever role the take is missing." },
];

export const CARD_BY_ID: Record<string, CardDef> = Object.fromEntries(CARDS.map((c) => [c.id, c]));

export const STARTING_DECK: string[] = [
  "kick-boombap", "kick-boombap", "kick-trap", "kick-four",
  "snare-back", "snare-back", "snare-clap", "snare-rim",
  "hats-8th", "hats-8th", "hats-trap", "hats-open",
  "bass-808", "bass-sub", "bass-walk",
  "mel-pluck", "mel-rhodes", "mel-stab",
  "fx-riser", "fx-impact",
];

export const rolesOf = (card: CardDef): Role[] =>
  card.hits.length ? [...new Set(card.hits.map((h) => h.role))] : ["fx"];

export const RARITY_PRICE: Record<Rarity, number> = { common: 3, uncommon: 5, rare: 8 };
