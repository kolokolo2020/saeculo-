import type { Body, ExtraStyle, Hair, HatStyle, Look, PantsStyle, TopStyle } from "./people";

// Who you are in the game: a name, a face, and what you wear. The basics
// are yours from the start; the rest of the wardrobe is bought at the thrift
// shop on the avenue or earned (fights won, goals reached). Style is what
// the club's door looks at.

export const SKINS = ["#f1d2bd", "#e8c0a4", "#d2a58a", "#c99a7c", "#b07a58", "#8d5a3b", "#6b4431", "#4e3020"];
export const HAIR_COLORS = ["#151010", "#3a2416", "#6b3a1c", "#9a5a2a", "#d8b35a", "#e8e0cf", "#8a8a86", "#b33a3a", "#3a5ab3", "#d06aa8"];
export const HAIR_STYLES: { id: Hair; name: string }[] = [
  { id: "short", name: "short" },
  { id: "buzz", name: "buzz cut" },
  { id: "curly", name: "curly" },
  { id: "mullet", name: "mullet" },
  { id: "afro", name: "afro" },
  { id: "braids", name: "braids" },
  { id: "long", name: "long" },
  { id: "ponytail", name: "ponytail" },
  { id: "bun", name: "bun" },
  { id: "bald", name: "bald" },
];
export const BODIES: { id: Body; name: string }[] = [
  { id: "slim", name: "slim" },
  { id: "regular", name: "regular" },
  { id: "broad", name: "broad" },
];

export type Slot = "top" | "pants" | "shoes" | "hat" | "extra";
export const SLOTS: { id: Slot; name: string; optional: boolean }[] = [
  { id: "top", name: "top", optional: false },
  { id: "pants", name: "pants", optional: false },
  { id: "shoes", name: "shoes", optional: false },
  { id: "hat", name: "on your head", optional: true },
  { id: "extra", name: "extra", optional: true },
];

export type Unlock = { kind: "start" } | { kind: "buy"; price: number } | { kind: "wins"; n: number } | { kind: "goal"; goal: string; label: string };

export interface Item {
  id: string;
  slot: Slot;
  name: string;
  /** The sprite piece. */
  style: TopStyle | PantsStyle | HatStyle | ExtraStyle | "shoes";
  /** Colour choices: [main, trim]. */
  colors: [string, string][];
  /** How fresh it is (the club's door adds these up). */
  styleScore: number;
  unlock: Unlock;
}

const i = (id: string, slot: Slot, name: string, style: Item["style"], colors: [string, string][], styleScore: number, unlock: Unlock = { kind: "start" }): Item => ({ id, slot, name, style, colors, styleScore, unlock });

export const ITEMS: Item[] = [
  i("tee", "top", "plain tee", "tee", [["#c9c2b3", "#c9c2b3"], ["#26262b", "#26262b"], ["#35384a", "#35384a"], ["#2f4a3a", "#2f4a3a"]], 0),
  i("hoodie", "top", "hoodie", "hoodie", [["#35384a", "#e8e0cf"], ["#1d1e24", "#c9c2b3"], ["#5a5d66", "#e8e0cf"], ["#2a4a7a", "#e8e0cf"]], 1),
  i("tee-808", "top", "808 tee", "tee", [["#111216", "#f2b45a"], ["#e8e0cf", "#111216"]], 1, { kind: "buy", price: 25 }),
  i("track-top", "top", "track jacket", "track", [["#1f2a5a", "#e8e0cf"], ["#111216", "#4fe3ff"], ["#2f6b3a", "#e8e0cf"]], 2, { kind: "buy", price: 40 }),
  i("denim", "top", "denim jacket", "jacket", [["#3c5a86", "#e8e0cf"], ["#22324d", "#26262b"]], 2, { kind: "buy", price: 60 }),
  i("puffer", "top", "puffer", "puffer", [["#111216", "#2a2c33"], ["#c9c2b3", "#8d9188"], ["#5a3a8a", "#3c2a66"], ["#d0a020", "#8a6a10"]], 3, { kind: "buy", price: 90 }),
  i("varsity", "top", "varsity jacket", "varsity", [["#1f2a5a", "#e8e0cf"], ["#111216", "#d8b35a"]], 4, { kind: "goal", goal: "cypher", label: "rock the cypher" }),
  i("leather", "top", "leather jacket", "leather", [["#141418", "#e8e0cf"], ["#3a1f1c", "#c9c2b3"]], 4, { kind: "wins", n: 5 }),

  i("jeans", "pants", "jeans", "jeans", [["#2c3e5a", "#22324d"], ["#1c1f26", "#14161b"], ["#6a7a8a", "#55626f"]], 0),
  i("joggers", "pants", "joggers", "joggers", [["#26262b", "#1b1b1f"], ["#5a5d66", "#45474e"]], 0),
  i("cargo", "pants", "cargos", "cargo", [["#4a4a32", "#383826"], ["#2a2a30", "#1f1f24"]], 1, { kind: "buy", price: 35 }),
  i("track-pants", "pants", "track pants", "track", [["#111216", "#e8e0cf"], ["#1f2a5a", "#e8e0cf"]], 1, { kind: "buy", price: 30 }),

  i("sneakers", "shoes", "sneakers", "shoes", [["#e8e0cf", "#e8e0cf"], ["#111216", "#111216"]], 0),
  i("boots", "shoes", "boots", "shoes", [["#3a2a1e", "#3a2a1e"], ["#141418", "#141418"]], 1, { kind: "buy", price: 45 }),
  i("highs", "shoes", "high-tops", "shoes", [["#4fe3ff", "#4fe3ff"], ["#a98bff", "#a98bff"]], 2, { kind: "buy", price: 55 }),
  i("gold-kicks", "shoes", "gold kicks", "shoes", [["#d8b35a", "#d8b35a"]], 4, { kind: "goal", goal: "club", label: "get into the club" }),

  i("cap", "hat", "cap", "cap", [["#26262b", "#111216"], ["#2a4a7a", "#1f2a5a"], ["#e8e0cf", "#c9c2b3"]], 1),
  i("beanie", "hat", "beanie", "beanie", [["#2a2c33", "#1b1b1f"], ["#d0a020", "#8a6a10"], ["#4a6a4a", "#2f4a3a"]], 1, { kind: "buy", price: 15 }),
  i("bucket", "hat", "bucket hat", "bucket", [["#c9c2b3", "#8d9188"], ["#26262b", "#141418"]], 2, { kind: "buy", price: 20 }),
  i("durag", "hat", "durag", "durag", [["#111216", "#26262b"], ["#3a5ab3", "#2a4080"]], 2, { kind: "buy", price: 12 }),

  i("headphones", "extra", "headphones", "headphones", [["#1b1b1f", "#5a5d66"], ["#e8e0cf", "#8d9188"]], 1),
  i("shades", "extra", "shades", "shades", [["#0b0b0d", "#5a5d66"]], 1, { kind: "buy", price: 25 }),
  i("chain", "extra", "chain", "chain", [["#d8b35a", "#a07a20"], ["#d9d9d9", "#9a9a9a"]], 3, { kind: "buy", price: 120 }),
  i("backpack", "extra", "backpack", "backpack", [["#2a2c33", "#1b1b1f"], ["#2f4a3a", "#203328"]], 1, { kind: "buy", price: 30 }),
];

export const itemById = (id: string | null | undefined) => ITEMS.find((x) => x.id === id);
export const STARTERS = ITEMS.filter((x) => x.unlock.kind === "start").map((x) => x.id);

export interface Worn {
  id: string;
  color: number;
}
export interface Profile {
  name: string;
  skin: number;
  hair: Hair;
  hairColor: number;
  body: Body;
  top: Worn;
  pants: Worn;
  shoes: Worn;
  hat: Worn | null;
  extra: Worn | null;
}

export const DEFAULT_PROFILE: Profile = {
  name: "",
  skin: 3,
  hair: "short",
  hairColor: 0,
  body: "regular",
  top: { id: "hoodie", color: 0 },
  pants: { id: "jeans", color: 0 },
  shoes: { id: "sneakers", color: 0 },
  hat: null,
  extra: { id: "headphones", color: 0 },
};

const color = (w: Worn | null | undefined): [string, string] | undefined => {
  const it = itemById(w?.id);
  return it ? it.colors[Math.min(it.colors.length - 1, w!.color)] : undefined;
};

/** The pixel look for a profile (what people.ts draws). */
export function lookOf(p: Profile): Look {
  const top = itemById(p.top.id);
  const pants = itemById(p.pants.id);
  const hat = itemById(p.hat?.id);
  const extra = itemById(p.extra?.id);
  const [topC, topTrim] = color(p.top) ?? ["#35384a", "#e8e0cf"];
  const [pantsC, pantsTrim] = color(p.pants) ?? ["#23252e", "#1b1b1f"];
  return {
    skin: SKINS[p.skin] ?? SKINS[3],
    hair: HAIR_COLORS[p.hairColor] ?? HAIR_COLORS[0],
    style: p.hair,
    body: p.body,
    top: topC,
    trim: topTrim,
    topStyle: (top?.style as TopStyle) ?? "tee",
    pants: pantsC,
    pantsTrim,
    pantsStyle: (pants?.style as PantsStyle) ?? "jeans",
    shoes: color(p.shoes)?.[0] ?? "#0e0e10",
    hat: hat ? (hat.style as HatStyle) : undefined,
    hatColor: color(p.hat)?.[0],
    hatShade: color(p.hat)?.[1],
    extra: extra ? (extra.style as ExtraStyle) : undefined,
    extraColor: color(p.extra)?.[0],
    extraShade: color(p.extra)?.[1],
  };
}

/** How fresh the outfit is. */
export function styleOf(p: Profile): number {
  return [p.top, p.pants, p.shoes, p.hat, p.extra].reduce((sum, w) => sum + (itemById(w?.id)?.styleScore ?? 0), 0);
}

/** A starting profile with a bit of variety, for people who skip the mirror. */
export function randomProfile(): Profile {
  const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
  return {
    ...DEFAULT_PROFILE,
    skin: Math.floor(Math.random() * SKINS.length),
    hair: pick(HAIR_STYLES).id,
    hairColor: Math.floor(Math.random() * 5),
    body: pick(BODIES).id,
    top: { id: pick(["tee", "hoodie"]), color: Math.floor(Math.random() * 3) },
    pants: { id: pick(["jeans", "joggers"]), color: Math.floor(Math.random() * 2) },
  };
}

export function sanitizeProfile(raw: unknown): Profile | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<Profile>;
  const worn = (w: unknown, slot: Slot, fallback: Worn | null): Worn | null => {
    const x = w as Worn | null;
    const it = itemById(x?.id);
    if (!x || !it || it.slot !== slot) return fallback;
    return { id: it.id, color: Math.max(0, Math.min(it.colors.length - 1, Number(x.color) || 0)) };
  };
  return {
    name: typeof r.name === "string" ? r.name.slice(0, 16) : "",
    skin: Number.isInteger(r.skin) && r.skin! >= 0 && r.skin! < SKINS.length ? r.skin! : DEFAULT_PROFILE.skin,
    hair: HAIR_STYLES.some((h) => h.id === r.hair) ? r.hair! : DEFAULT_PROFILE.hair,
    hairColor: Number.isInteger(r.hairColor) && r.hairColor! >= 0 && r.hairColor! < HAIR_COLORS.length ? r.hairColor! : 0,
    body: BODIES.some((b) => b.id === r.body) ? r.body! : "regular",
    top: worn(r.top, "top", DEFAULT_PROFILE.top)!,
    pants: worn(r.pants, "pants", DEFAULT_PROFILE.pants)!,
    shoes: worn(r.shoes, "shoes", DEFAULT_PROFILE.shoes)!,
    hat: worn(r.hat, "hat", null),
    extra: worn(r.extra, "extra", null),
  };
}
