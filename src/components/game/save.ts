import { fromOldTape, loadStore, saveStore } from "./studio/project";
import { ITEMS, sanitizeProfile, STARTERS, type Profile } from "./character";
import { FINDABLE } from "./studio/voices";
import { WEAPONS } from "./weapons";

// What the game remembers between visits, in this browser only: who you
// are and what you wear, your cash and respect, your health, what you've
// unlocked, the sounds you've found, who you've played your beats for, the
// goals you've reached, the small things that only happen once, and the
// settings. Beats you make live in the studio's own store (studio/project.ts).

export const MAX_HP = 100;
export type Difficulty = "chill" | "normal" | "hard";

export interface Settings {
  /** Footsteps, doors, punches. 0..1 */
  sfx: number;
  /** Boomboxes, monitors, the club. 0..1 */
  music: number;
  shake: boolean;
  /** The glints over things still to find. */
  hints: boolean;
  difficulty: Difficulty;
}

export interface Stats {
  wins: number;
  losses: number;
  fled: number;
  beatsSold: number;
  earned: number;
  cypherBest: number;
  djBest: number;
  diceWon: number;
  digs: number;
  tags: number;
  swishes: number;
}

export interface SaveData {
  found: string[];
  seenHelp: boolean;
  /** Findable sounds found but not yet looked at in the studio. */
  unseen: string[];
  /** Who you've played a tape for, and which (they remember). */
  heard: Record<string, string>;
  /** Small one-time things that have already happened. */
  seen: string[];
  /** null until you've been to the mirror. */
  profile: Profile | null;
  cash: number;
  /** Respect: fights won, crowds moved, walls tagged. */
  rep: number;
  hp: number;
  /** Clothes you own (the starters always count). */
  owned: string[];
  weapons: string[];
  weapon: string;
  /** Things to eat and drink, by id. */
  items: Record<string, number>;
  stats: Stats;
  /** Goals reached. */
  goals: string[];
  /** Tapes sold, by name (each sells once). */
  sold: string[];
  /** Places you've been. */
  places: string[];
  /** Your tag on the alley wall, if you've sprayed it. */
  tag: { color: string } | null;
  settings: Settings;
}

const KEY = "saeculo-game";

export const DEFAULT_SETTINGS: Settings = { sfx: 0.8, music: 0.8, shake: true, hints: true, difficulty: "normal" };
const ZERO: Stats = { wins: 0, losses: 0, fled: 0, beatsSold: 0, earned: 0, cypherBest: 0, djBest: 0, diceWon: 0, digs: 0, tags: 0, swishes: 0 };

export function freshSave(): SaveData {
  return {
    found: [],
    seenHelp: false,
    unseen: [],
    heard: {},
    seen: [],
    profile: null,
    cash: 20,
    rep: 0,
    hp: MAX_HP,
    owned: [...STARTERS],
    weapons: ["fists"],
    weapon: "fists",
    items: { noodles: 1 },
    stats: { ...ZERO },
    goals: [],
    sold: [],
    places: ["bedroom"],
    tag: null,
    settings: { ...DEFAULT_SETTINGS },
  };
}

const strings = (x: unknown): string[] => (Array.isArray(x) ? x.filter((v): v is string => typeof v === "string") : []);
const num = (x: unknown, lo: number, hi: number, fallback: number) => (typeof x === "number" && Number.isFinite(x) ? Math.max(lo, Math.min(hi, x)) : fallback);

export function loadSave(): SaveData {
  const base = freshSave();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (!raw || typeof raw !== "object") return base;
    const found = strings(raw.found).filter((s) => FINDABLE.includes(s));
    const unseen = strings(raw.unseen).filter((s) => found.includes(s));
    const heard: Record<string, string> = {};
    if (raw.heard && typeof raw.heard === "object") for (const [k, v] of Object.entries(raw.heard)) if (typeof v === "string") heard[k] = v;
    const items: Record<string, number> = {};
    if (raw.items && typeof raw.items === "object") for (const [k, v] of Object.entries(raw.items)) if (typeof v === "number" && v > 0) items[k] = Math.min(99, Math.floor(v));
    const stats = { ...ZERO };
    if (raw.stats && typeof raw.stats === "object") for (const k of Object.keys(ZERO) as (keyof Stats)[]) stats[k] = num(raw.stats[k], 0, 1e7, 0);
    const st = raw.settings ?? {};
    const weapons = strings(raw.weapons).filter((w) => WEAPONS.some((x) => x.id === w));
    if (!weapons.includes("fists")) weapons.unshift("fists");
    return {
      found,
      seenHelp: raw.seenHelp === true,
      unseen,
      heard,
      seen: strings(raw.seen),
      profile: sanitizeProfile(raw.profile),
      cash: num(raw.cash, 0, 1e7, base.cash),
      rep: num(raw.rep, 0, 1e7, 0),
      hp: num(raw.hp, 1, MAX_HP, MAX_HP),
      owned: [...new Set([...STARTERS, ...strings(raw.owned).filter((id) => ITEMS.some((x) => x.id === id))])],
      weapons,
      weapon: weapons.includes(raw.weapon) ? raw.weapon : "fists",
      items: "items" in raw ? items : base.items,
      stats,
      goals: strings(raw.goals),
      sold: strings(raw.sold),
      places: [...new Set(["bedroom", ...strings(raw.places)])],
      tag: raw.tag && typeof raw.tag.color === "string" ? { color: raw.tag.color } : null,
      settings: {
        sfx: num(st.sfx, 0, 1, DEFAULT_SETTINGS.sfx),
        music: num(st.music, 0, 1, DEFAULT_SETTINGS.music),
        shake: st.shake !== false,
        hints: st.hints !== false,
        difficulty: st.difficulty === "chill" || st.difficulty === "hard" ? st.difficulty : "normal",
      },
    };
  } catch {
    return base;
  }
}

export function writeSave(data: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // storage full or blocked: progress lasts for this visit
  }
}

/** Start over: everything in the game except the beats you've made. */
export function resetSave(): SaveData {
  const fresh = freshSave();
  writeSave(fresh);
  return fresh;
}

/** Beats saved to tape by the first version of the sampler move into the studio's project slots, once. */
export function migrateOldTapes() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    const tapes: unknown[] = Array.isArray(raw?.tapes) ? raw.tapes : [];
    const old = tapes.filter((t): t is { pattern: { steps: boolean[][]; tempo: number; swing: number; sounds: string[] } } => {
      const p = (t as { pattern?: { steps?: unknown; sounds?: unknown } } | null)?.pattern;
      return !!p && Array.isArray(p.steps) && Array.isArray(p.sounds) && p.steps.length === 4;
    });
    if (!old.length) return;
    const store = loadStore();
    old.forEach((t, i) => {
      const slot = store.slots.findIndex((s) => s === null);
      if (slot >= 0) store.slots[slot] = fromOldTape(t.pattern, `old tape ${"ABCD"[i] ?? i + 1}`);
    });
    saveStore(store);
    delete raw.tapes;
    localStorage.setItem(KEY, JSON.stringify(raw));
  } catch {
    // leave them be
  }
}
