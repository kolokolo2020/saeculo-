// Scoring a take. Like a poker hand, the mix of roles you cover sets the
// beat type (its base groove and hype); then every hit adds groove as the
// loop plays, and bonuses from the client, the boss, the cards and your
// gear add hype. Score = groove × hype.
//
// Pure and deterministic (randomness comes in as `crashRoll`), so the UI can
// animate the exact events it returns and the balance sim can run it
// thousands of times.

import { CORE_ROLES, rolesOf, type CardDef, type Role } from "./cards";
import type { GearId } from "./gear";
import type { ModifierId } from "./rounds";

export type BeatTypeId = "sketch" | "layers" | "backbeat" | "vibe" | "break" | "pocket" | "full" | "banger";

export interface BeatTypeDef {
  id: BeatTypeId;
  name: string;
  needs: string;
  groove: number;
  hype: number;
  /** Added per level from the shop's Master upgrades. */
  grooveStep: number;
  hypeStep: number;
  /** The roles it takes (empty for the catch-alls). */
  roles: Role[];
  test: (roles: Set<Role>) => boolean;
}

const has = (roles: Set<Role>, ...need: Role[]) => need.every((r) => roles.has(r));

/** Best first: the first one a take qualifies for is its type. */
export const BEAT_TYPES: BeatTypeDef[] = [
  { id: "banger", name: "Banger", needs: "Kick, snare, hats, bass, melody and FX", groove: 120, hype: 8, grooveStep: 40, hypeStep: 3, roles: [...CORE_ROLES, "fx"], test: (r) => has(r, ...CORE_ROLES, "fx") },
  { id: "full", name: "Full Beat", needs: "Kick, snare, hats, bass and melody", groove: 90, hype: 6, grooveStep: 30, hypeStep: 2, roles: CORE_ROLES, test: (r) => has(r, ...CORE_ROLES) },
  { id: "pocket", name: "Pocket", needs: "Kick, snare, hats and bass", groove: 60, hype: 4, grooveStep: 25, hypeStep: 2, roles: ["kick", "snare", "hats", "bass"], test: (r) => has(r, "kick", "snare", "hats", "bass") },
  { id: "break", name: "Drum Break", needs: "Kick, snare and hats", groove: 40, hype: 3, grooveStep: 20, hypeStep: 2, roles: ["kick", "snare", "hats"], test: (r) => has(r, "kick", "snare", "hats") },
  { id: "vibe", name: "Vibe", needs: "Bass and melody", groove: 35, hype: 3, grooveStep: 20, hypeStep: 2, roles: ["bass", "melody"], test: (r) => has(r, "bass", "melody") },
  { id: "backbeat", name: "Backbeat", needs: "Kick and snare", groove: 25, hype: 2, grooveStep: 15, hypeStep: 1, roles: ["kick", "snare"], test: (r) => has(r, "kick", "snare") },
  { id: "layers", name: "Layers", needs: "Any two roles", groove: 15, hype: 2, grooveStep: 10, hypeStep: 1, roles: [], test: (r) => r.size >= 2 },
  { id: "sketch", name: "Sketch", needs: "Anything", groove: 5, hype: 1, grooveStep: 10, hypeStep: 1, roles: [], test: () => true },
];

/** The closest better beat type: which roles to add, and what it's worth. */
export function nextTypeHint(current: BeatTypeId, roles: Role[]): { type: BeatTypeDef; missing: Role[] } | null {
  const rank = BEAT_TYPES.findIndex((t) => t.id === current);
  let best: { type: BeatTypeDef; missing: Role[] } | null = null;
  for (const type of BEAT_TYPES.slice(0, rank)) {
    if (!type.roles.length) continue;
    const missing = type.roles.filter((r) => !roles.includes(r));
    if (!missing.length) continue;
    if (!best || missing.length < best.missing.length) best = { type, missing };
  }
  return best;
}

export const BEAT_TYPE_BY_ID = Object.fromEntries(BEAT_TYPES.map((t) => [t.id, t])) as Record<BeatTypeId, BeatTypeDef>;

export interface PlayedCard {
  uid: string;
  def: CardDef;
}

export interface ScoreInput {
  cards: PlayedCard[];
  gear: GearId[];
  levels: Partial<Record<BeatTypeId, number>>;
  modifier: ModifierId;
  /** Takes already played this round (before this one). */
  takesPlayed: number;
  usedTypes: BeatTypeId[];
  /** 0..1 from the run's RNG — only the Old Laptop reads it. */
  crashRoll: number;
}

export interface StepEvent {
  step: number;
  /** Index into the played cards, or -1 for combo events like a knock. */
  card: number;
  groove: number;
  tag?: "knock" | "echo" | "cut" | "banned";
}

export interface BonusEvent {
  label: string;
  source: "type" | "genre" | "card" | "client" | "boss" | "gear";
  groove?: number;
  hype?: number;
  mult?: number;
}

export interface TakeResult {
  type: BeatTypeDef;
  level: number;
  roles: Role[];
  baseGroove: number;
  baseHype: number;
  steps: StepEvent[];
  bonuses: BonusEvent[];
  groove: number;
  hype: number;
  score: number;
  /** Why the take scored nothing, if it did. */
  voided?: string;
}

export const typeLevelStats = (type: BeatTypeDef, level: number) => ({
  groove: type.groove + type.grooveStep * level,
  hype: type.hype + type.hypeStep * level,
});

function bestType(roles: Set<Role>, wild: boolean): { type: BeatTypeDef; roles: Set<Role> } {
  const rank = (r: Set<Role>) => BEAT_TYPES.findIndex((t) => t.test(r));
  if (!wild) return { type: BEAT_TYPES[rank(roles)], roles };
  // a wild card stands in for whichever missing role gives the best type
  let best = roles;
  for (const role of [...CORE_ROLES, "fx" as Role]) {
    if (roles.has(role)) continue;
    const trial = new Set(roles).add(role);
    if (rank(trial) < rank(best)) best = trial;
  }
  return { type: BEAT_TYPES[rank(best)], roles: best };
}

export function scoreTake(input: ScoreInput): TakeResult {
  const { cards, gear, modifier } = input;
  const g = new Set(gear);
  const banHats = modifier === "label";

  // roles covered (banned hats don't count)
  const covered = new Set<Role>();
  for (const { def } of cards) for (const r of rolesOf(def)) if (!(banHats && r === "hats")) covered.add(r);
  const wild = cards.some((c) => c.def.effect === "wild");
  const { type, roles } = bestType(covered, wild);
  const level = input.levels[type.id] ?? 0;
  const base = typeLevelStats(type, level);

  // ---- per-hit groove, in step order
  const steps: StepEvent[] = [];
  const kickSteps = new Set<number>();
  const bassSteps = new Set<number>();
  const soundingSteps = new Set<number>();
  const echo = cards.some((c) => c.def.effect === "echo");

  cards.forEach(({ def }, index) => {
    for (const hit of def.hits) {
      soundingSteps.add(hit.step);
      if (hit.role === "kick") kickSteps.add(hit.step);
      if (hit.role === "bass") bassSteps.add(hit.step);
      const count = hit.roll ?? 1;
      let groove = def.groove * count;
      let tag: StepEvent["tag"];
      if (modifier === "lofiOnly" && def.genre === "lofi") groove *= 2;
      if (modifier === "drill" && hit.role === "snare") groove += 3;
      if (g.has("tr808") && hit.role === "bass") groove += 3;
      if (g.has("hatroller") && hit.role === "hats") groove += 2 * count;
      if (g.has("mpc") && hit.step % 2 === 1) groove += 1;
      if (g.has("fills") && hit.step >= 12) groove += 3;
      if (banHats && hit.role === "hats") {
        groove = 0;
        tag = "banned";
      } else if (modifier === "ar" && hit.step >= 8) {
        groove = 0;
        tag = "cut";
      }
      steps.push({ step: hit.step, card: index, groove, tag });
      if (echo && hit.role === "melody" && hit.step < 15 && groove > 0) {
        steps.push({ step: hit.step + 1, card: index, groove: Math.ceil(groove / 2), tag: "echo" });
        soundingSteps.add(hit.step + 1);
      }
    }
  });
  const knock = g.has("sidechain") ? 6 : 2;
  for (const s of kickSteps) {
    if (bassSteps.has(s) && !(modifier === "ar" && s >= 8)) steps.push({ step: s, card: -1, groove: knock, tag: "knock" });
  }
  steps.sort((a, b) => a.step - b.step || a.card - b.card);

  // ---- bonuses, applied after the loop plays
  const bonuses: BonusEvent[] = [];
  const count = (pred: (d: CardDef) => boolean) => cards.filter((c) => pred(c.def)).length;
  const withRole = (role: Role) => count((d) => rolesOf(d).includes(role));
  const chopCards = count((d) => d.hits.some((h) => h.voice === "chop"));
  const fxCards = withRole("fx");
  const downbeats = [0, 4, 8, 12].every((s) => kickSteps.has(s));

  const genres = new Set(cards.map((c) => c.def.genre));
  if (cards.length >= 3 && genres.size === 1) {
    bonuses.push({ label: `One genre (${[...genres][0]})`, source: "genre", hype: g.has("purist") ? 6 : 2 });
  }
  for (const { def } of cards) {
    if (def.effect === "lofiHype") bonuses.push({ label: def.name, source: "card", hype: count((d) => d.genre === "lofi") });
    if (def.effect === "hype2") bonuses.push({ label: def.name, source: "card", hype: 2 });
  }
  switch (modifier) {
    case "hard808":
      if (withRole("bass")) bonuses.push({ label: "Hard 808s", source: "client", hype: 2 * withRole("bass") });
      break;
    case "short":
      if (cards.length <= 3) bonuses.push({ label: "Short and catchy", source: "client", hype: 4 });
      break;
    case "film":
      if (fxCards) bonuses.push({ label: "Cinematic", source: "client", hype: 3 * fxCards });
      break;
    case "singer":
      if (withRole("melody")) bonuses.push({ label: "Something to sing over", source: "client", hype: 2 * withRole("melody") });
      break;
    case "club":
      if (downbeats) bonuses.push({ label: "Four to the floor", source: "client", hype: 5 });
      break;
    case "digger":
      if (chopCards) bonuses.push({ label: "Crate digging", source: "client", hype: 3 * chopCards });
      break;
  }
  if (g.has("laptop")) bonuses.push({ label: "Old Laptop", source: "gear", groove: 25 });
  if (g.has("tapedeck") && cards.length <= 3) bonuses.push({ label: "Tape Deck", source: "gear", hype: 4 });
  if (g.has("metronome") && downbeats) bonuses.push({ label: "Metronome", source: "gear", hype: 3 });
  if (g.has("crate") && chopCards) bonuses.push({ label: "Record Crate", source: "gear", hype: 2 * chopCards });
  if (g.has("hypeman") && input.takesPlayed) bonuses.push({ label: "Hype Man", source: "gear", hype: input.takesPlayed });
  if (g.has("minimal")) {
    const silent = 16 - soundingSteps.size;
    if (silent) bonuses.push({ label: "Minimalist", source: "gear", hype: silent });
  }
  if (g.has("reverb") && fxCards) bonuses.push({ label: "Spring Reverb", source: "gear", mult: 1.5 });
  if (g.has("monitors")) bonuses.push({ label: "Studio Monitors", source: "gear", mult: 1.3 });
  if (g.has("ghost") && input.takesPlayed === 0) bonuses.push({ label: "Ghost Producer", source: "gear", mult: 2 });
  if (modifier === "algorithm" && !roles.has("melody")) bonuses.push({ label: "No melody", source: "boss", mult: 0.5 });

  // ---- totals
  let groove = base.groove + steps.reduce((sum, e) => sum + e.groove, 0);
  let hype = base.hype;
  for (const b of bonuses) {
    groove += b.groove ?? 0;
    hype += b.hype ?? 0;
  }
  for (const b of bonuses) if (b.mult) hype *= b.mult;
  hype = Math.round(hype * 10) / 10;
  let score = Math.floor(groove * hype);

  let voided: string | undefined;
  if (modifier === "metronome" && input.usedTypes.includes(type.id)) voided = `Metro Nome: you already played a ${type.name}.`;
  else if (g.has("laptop") && input.crashRoll < 1 / 6) voided = "The Old Laptop crashed. Nothing saved.";
  if (voided) score = 0;

  return { type, level, roles: [...roles], baseGroove: base.groove, baseHype: base.hype, steps, bonuses, groove, hype, score, voided };
}
