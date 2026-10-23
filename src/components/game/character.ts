import type { Body, ExtraStyle, Hair, HatStyle, Look, NeckStyle, PantsStyle, TopStyle } from "./people";

// Who you are in the game: a name, a face, and what you wear. The basics
// are yours from the start; the rest of the wardrobe is bought at the thrift
// shop on the avenue or earned (fights won, goals reached), and the designer
// pieces at Maison, the boutique at the end of the avenue (some only for
// people with a following). Style is what the club's door looks at; what
// your outfit cost is what the wrong people look at.

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

export type Slot = "top" | "pants" | "shoes" | "hat" | "neck" | "extra";
export const SLOTS: { id: Slot; name: string; optional: boolean }[] = [
  { id: "top", name: "top", optional: false },
  { id: "pants", name: "pants", optional: false },
  { id: "shoes", name: "shoes", optional: false },
  { id: "hat", name: "on your head", optional: true },
  { id: "neck", name: "round your neck", optional: true },
  { id: "extra", name: "extra", optional: true },
];

export type Unlock =
  | { kind: "start" }
  | { kind: "buy"; price: number }
  | { kind: "wins"; n: number }
  | { kind: "goal"; goal: string; label: string }
  /** Maison: designer, and some of it only sold to people with this many followers. */
  | { kind: "designer"; price: number; fans: number };

export interface Item {
  id: string;
  slot: Slot;
  name: string;
  /** The sprite piece. */
  style: TopStyle | PantsStyle | HatStyle | ExtraStyle | NeckStyle | "shoes";
  /** Colour choices: [main, trim]. */
  colors: [string, string][];
  /** How fresh it is (the club's door adds these up). */
  styleScore: number;
  unlock: Unlock;
}

const i = (id: string, slot: Slot, name: string, style: Item["style"], colors: [string, string][], styleScore: number, unlock: Unlock = { kind: "start" }): Item => ({ id, slot, name, style, colors, styleScore, unlock });
const d = (price: number, fans = 0): Unlock => ({ kind: "designer", price, fans });

export const ITEMS: Item[] = [
  i("tee", "top", "plain tee", "tee", [["#c9c2b3", "#c9c2b3"], ["#26262b", "#26262b"], ["#35384a", "#35384a"], ["#2f4a3a", "#2f4a3a"]], 0),
  i("hoodie", "top", "hoodie", "hoodie", [["#35384a", "#e8e0cf"], ["#1d1e24", "#c9c2b3"], ["#5a5d66", "#e8e0cf"], ["#2a4a7a", "#e8e0cf"]], 1),
  i("tee-808", "top", "808 tee", "tee", [["#111216", "#f2b45a"], ["#e8e0cf", "#111216"]], 1, { kind: "buy", price: 25 }),
  i("track-top", "top", "track jacket", "track", [["#1f2a5a", "#e8e0cf"], ["#111216", "#4fe3ff"], ["#2f6b3a", "#e8e0cf"]], 2, { kind: "buy", price: 40 }),
  i("denim", "top", "denim jacket", "jacket", [["#3c5a86", "#e8e0cf"], ["#22324d", "#26262b"]], 2, { kind: "buy", price: 60 }),
  i("puffer", "top", "puffer", "puffer", [["#111216", "#2a2c33"], ["#c9c2b3", "#8d9188"], ["#5a3a8a", "#3c2a66"], ["#d0a020", "#8a6a10"]], 3, { kind: "buy", price: 90 }),
  i("varsity", "top", "varsity jacket", "varsity", [["#1f2a5a", "#e8e0cf"], ["#111216", "#d8b35a"]], 4, { kind: "goal", goal: "cypher", label: "rock the cypher" }),
  i("leather", "top", "leather jacket", "leather", [["#141418", "#e8e0cf"], ["#3a1f1c", "#c9c2b3"]], 4, { kind: "wins", n: 5 }),
  i("logo-tee", "top", "designer tee", "logo", [["#e8e0cf", "#b33a3a"], ["#111216", "#e8e0cf"]], 3, d(150)),
  i("jersey", "top", "basketball jersey", "jersey", [["#5a2a8a", "#d0a020"], ["#b33a3a", "#e8e0cf"], ["#1f2a5a", "#e8e0cf"]], 3, d(180)),
  i("fleece", "top", "tech fleece", "fleece", [["#5a5d66", "#111216"], ["#111216", "#5a5d66"], ["#2a4a7a", "#c9c2b3"]], 4, d(220)),
  i("shark", "top", "shark hoodie", "shark", [["#2a2c33", "#e8e0cf"], ["#4a5a3a", "#e8e0cf"], ["#3a5ab3", "#e8e0cf"]], 5, d(350)),
  i("mono", "top", "monogram jacket", "mono", [["#5a3a22", "#c9a050"], ["#111216", "#5a5d66"]], 6, d(900, 2000)),
  i("fur", "top", "fur coat", "fur", [["#3a2a1e", "#e8e0cf"], ["#111216", "#c9c2b3"], ["#e8e0cf", "#ffffff"]], 7, d(1500, 10000)),
  i("bandana-top", "top", "Kings hoodie", "hoodie", [["#7a2020", "#111216"]], 3, { kind: "goal", goal: "kings", label: "deal with the Block Kings" }),

  i("jeans", "pants", "jeans", "jeans", [["#2c3e5a", "#22324d"], ["#1c1f26", "#14161b"], ["#6a7a8a", "#55626f"]], 0),
  i("joggers", "pants", "joggers", "joggers", [["#26262b", "#1b1b1f"], ["#5a5d66", "#45474e"]], 0),
  i("cargo", "pants", "cargos", "cargo", [["#4a4a32", "#383826"], ["#2a2a30", "#1f1f24"]], 1, { kind: "buy", price: 35 }),
  i("track-pants", "pants", "track pants", "track", [["#111216", "#e8e0cf"], ["#1f2a5a", "#e8e0cf"]], 1, { kind: "buy", price: 30 }),
  i("camo", "pants", "camo cargos", "camo", [["#4a4a32", "#2f3a22"], ["#5a5d66", "#2a2a30"]], 3, d(200)),
  i("stacked", "pants", "stacked jeans", "stacked", [["#2c3e5a", "#55626f"], ["#111216", "#3a3a40"]], 3, d(260)),
  i("leather-pants", "pants", "leather pants", "leatherp", [["#141418", "#3a3a40"]], 5, d(700, 2000)),

  i("sneakers", "shoes", "sneakers", "shoes", [["#e8e0cf", "#e8e0cf"], ["#111216", "#111216"]], 0),
  i("boots", "shoes", "boots", "shoes", [["#3a2a1e", "#3a2a1e"], ["#141418", "#141418"]], 1, { kind: "buy", price: 45 }),
  i("highs", "shoes", "high-tops", "shoes", [["#4fe3ff", "#4fe3ff"], ["#a98bff", "#a98bff"]], 2, { kind: "buy", price: 55 }),
  i("gold-kicks", "shoes", "gold kicks", "shoes", [["#d8b35a", "#d8b35a"]], 4, { kind: "goal", goal: "club", label: "get into the club" }),
  i("wheat-boots", "shoes", "wheat boots", "shoes", [["#c9a050", "#8a6a30"]], 3, d(240)),
  i("retros", "shoes", "retro high-tops", "shoes", [["#b33a3a", "#e8e0cf"], ["#111216", "#e8e0cf"], ["#3a5ab3", "#e8e0cf"]], 4, d(320)),
  i("runners", "shoes", "chunky runners", "shoes", [["#c9c2b3", "#5a5d66"], ["#111216", "#b33a3a"]], 5, d(650)),
  i("red-soles", "shoes", "red-sole sneakers", "shoes", [["#111216", "#d02a2a"], ["#e8e0cf", "#d02a2a"]], 6, d(850, 2000)),

  i("cap", "hat", "cap", "cap", [["#26262b", "#111216"], ["#2a4a7a", "#1f2a5a"], ["#e8e0cf", "#c9c2b3"]], 1),
  i("beanie", "hat", "beanie", "beanie", [["#2a2c33", "#1b1b1f"], ["#d0a020", "#8a6a10"], ["#4a6a4a", "#2f4a3a"]], 1, { kind: "buy", price: 15 }),
  i("bucket", "hat", "bucket hat", "bucket", [["#c9c2b3", "#8d9188"], ["#26262b", "#141418"]], 2, { kind: "buy", price: 20 }),
  i("durag", "hat", "durag", "durag", [["#111216", "#26262b"], ["#3a5ab3", "#2a4080"]], 2, { kind: "buy", price: 12 }),
  i("bandana", "hat", "bandana", "bandana", [["#b33a3a", "#7a2020"], ["#2a4a7a", "#1f2a5a"], ["#111216", "#3a3a40"]], 2, d(60)),
  i("ski-mask", "hat", "ski mask", "ski", [["#111216", "#26262b"], ["#b33a3a", "#7a2020"], ["#e8e0cf", "#c9c2b3"]], 3, d(90)),
  i("trucker", "hat", "trucker hat", "cap", [["#e8e0cf", "#111216"], ["#111216", "#b33a3a"]], 2, d(120)),
  i("designer-beanie", "hat", "designer beanie", "beanie", [["#b33a3a", "#e8e0cf"], ["#e8e0cf", "#111216"]], 3, d(280)),

  i("headphones", "extra", "headphones", "headphones", [["#1b1b1f", "#5a5d66"], ["#e8e0cf", "#8d9188"]], 1),
  i("shades", "extra", "shades", "shades", [["#0b0b0d", "#5a5d66"]], 1, { kind: "buy", price: 25 }),
  i("backpack", "extra", "backpack", "backpack", [["#2a2c33", "#1b1b1f"], ["#2f4a3a", "#203328"]], 1, { kind: "buy", price: 30 }),
  i("designer-shades", "extra", "designer shades", "shades", [["#3a1f1c", "#d8b35a"], ["#e8e0cf", "#111216"]], 3, d(300)),
  i("grillz", "extra", "grillz", "grillz", [["#f0c850", "#a07a20"], ["#e8f4ff", "#9ad0ff"]], 4, d(600)),
  i("bag", "extra", "crossbody bag", "bag", [["#5a3a22", "#c9a050"], ["#111216", "#d8b35a"]], 4, d(750, 2000)),
  i("watch", "extra", "iced watch", "watch", [["#e8f4ff", "#9ad0ff"], ["#f0c850", "#a07a20"]], 4, d(900)),

  i("chain", "neck", "chain", "chain", [["#d8b35a", "#a07a20"], ["#d9d9d9", "#9a9a9a"]], 3, { kind: "buy", price: 120 }),
  i("cuban", "neck", "cuban link", "cuban", [["#f0c850", "#a07a20"], ["#e0e0e0", "#9a9a9a"]], 5, d(1200, 2000)),
  i("iced", "neck", "iced-out chain", "iced", [["#e8f4ff", "#9ad0ff"]], 8, d(2500, 10000)),
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
  neck: Worn | null;
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
  neck: null,
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
  const neck = itemById(p.neck?.id);
  const shoes = color(p.shoes);
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
    shoes: shoes?.[0] ?? "#0e0e10",
    shoeTrim: shoes && shoes[1] !== shoes[0] ? shoes[1] : undefined,
    hat: hat ? (hat.style as HatStyle) : undefined,
    hatColor: color(p.hat)?.[0],
    hatShade: color(p.hat)?.[1],
    extra: extra ? (extra.style as ExtraStyle) : undefined,
    extraColor: color(p.extra)?.[0],
    extraShade: color(p.extra)?.[1],
    neck: neck ? (neck.style as NeckStyle) : undefined,
    neckColor: color(p.neck)?.[0],
  };
}

/** How fresh the outfit is. */
export function styleOf(p: Profile): number {
  return worn(p).reduce((sum, it) => sum + it.styleScore, 0);
}

const worn = (p: Profile) => [p.top, p.pants, p.shoes, p.hat, p.neck, p.extra].map((w) => itemById(w?.id)).filter((x): x is Item => !!x);
/** What the outfit you've got on cost, roughly: the shiny stuff gets you noticed. */
export function blingOf(p: Profile): number {
  return worn(p).reduce((sum, it) => sum + (it.unlock.kind === "designer" || it.unlock.kind === "buy" ? it.unlock.price : 0), 0);
}
/** The priciest thing you've got on that someone could take off you (a chain first). */
export function takeable(p: Profile): Item | null {
  const xs = [p.neck, p.extra, p.shoes, p.top].map((w) => itemById(w?.id)).filter((x): x is Item & { unlock: { kind: "designer" | "buy"; price: number } } => !!x && (x.unlock.kind === "designer" || x.unlock.kind === "buy") && x.unlock.price >= 100);
  return xs.sort((a, b) => b.unlock.price - a.unlock.price)[0] ?? null;
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
    // the chain used to be an extra: it moves round your neck
    neck: worn(r.neck, "neck", null) ?? worn(r.extra, "neck", null),
    extra: worn(r.extra, "extra", null),
  };
}
