// A run of Beat Deck as plain data plus pure transitions: every action takes
// a state and returns the next one, so the whole run serializes to
// localStorage (refresh-proof) and replays identically from its seed.

import { CARDS, CARD_BY_ID, DECK_BY_ID, RARITY_PRICE, type CardDef, type CardMod, type DeckKind, type Rarity } from "./cards";
import { GEAR, GEAR_BY_ID, MAX_GEAR, type GearId } from "./gear";
import { BOSSES, BOSS_ROUNDS, CLIENTS, FINAL_BOSS, ROUNDS, ROUND_BY_ID, TARGETS, type ModifierId, type RoundDef } from "./rounds";
import { Rng } from "./rng";
import { BEAT_TYPES, scoreTake, type BeatTypeId, type PlayedCard, type TakeResult } from "./scoring";
import { MAX_SESSIONS, SESSIONS, SESSION_BY_ID, type SessionId } from "./sessions";

export const TAKES = 4;
export const REDRAWS = 3;
export const HAND_SIZE = 8;
export const MAX_PLAY = 5;
export const START_MONEY = 4;
export const REMOVE_PRICE = 3;
export const UPGRADE_PRICE = 4;

// ---- certifications: the difficulty ladder. Winning a run at one level
// unlocks the next; each level keeps every rule of the ones before it.
export const CERTS = [
  { name: "Demo", rule: "The standard game." },
  { name: "Mixtape", rule: "Targets are 10% higher." },
  { name: "EP", rule: "One fewer redraw each round." },
  { name: "Album", rule: "Rounds pay $1 less, and no interest on savings." },
  { name: "Gold", rule: "Everything in the shop costs $1 more." },
  { name: "Platinum", rule: "You hold 7 cards instead of 8." },
] as const;
export const MAX_CERT = CERTS.length - 1;

export interface CardInst {
  uid: string;
  id: string;
  mod?: CardMod;
}

export type Phase = "play" | "won" | "shop" | "over" | "victory";

export interface ShopState {
  gear: (GearId | null)[];
  cards: (string | null)[];
  sessions: (SessionId | null)[];
  upgrade: BeatTypeId | null;
  rerollCost: number;
  removed: boolean;
}

export interface Reward {
  base: number;
  takes: number;
  interest: number;
  chain: number;
  register: number;
  total: number;
  /** A studio session the boss left behind. */
  session: SessionId | null;
}

export interface BestTake {
  cards: string[];
  score: number;
  tempo: number;
  typeName: string;
  round: number;
}

export interface RunState {
  version: 2;
  seed: number;
  daily: boolean;
  /** Certification level (0 = Demo). Missing in saves from before the ladder. */
  cert?: number;
  deckKind: DeckKind;
  /** Past round 8: the run continues with ever higher targets. */
  endless: boolean;
  rng: number;
  round: number;
  plan: ModifierId[];
  phase: Phase;
  deck: CardInst[];
  draw: string[];
  hand: string[];
  discard: string[];
  takesLeft: number;
  redrawsLeft: number;
  score: number;
  target: number;
  money: number;
  gear: GearId[];
  gearState: Partial<Record<GearId, number>>;
  sessions: SessionId[];
  levels: Partial<Record<BeatTypeId, number>>;
  takesPlayed: number;
  runTakes: number;
  lastTakeScore: number;
  usedTypes: BeatTypeId[];
  totalScore: number;
  best: BestTake | null;
  shop: ShopState | null;
  reward: Reward | null;
  nextUid: number;
}

export const roundDef = (s: RunState): RoundDef => ROUND_BY_ID[s.plan[s.round - 1]];
export const handSize = (s: RunState) => (s.plan[s.round - 1] === "block" ? 6 : HAND_SIZE - ((s.cert ?? 0) >= 5 ? 1 : 0));
export const maxPlay = (s: RunState) => (s.plan[s.round - 1] === "noise" ? 3 : MAX_PLAY);
export const instOf = (s: RunState, uid: string): CardInst => s.deck.find((c) => c.uid === uid)!;
export const cardOf = (s: RunState, uid: string): CardDef => CARD_BY_ID[instOf(s, uid).id];
export const certOf = (s: RunState) => s.cert ?? 0;
export const redrawsFor = (s: RunState) => REDRAWS - (certOf(s) >= 2 ? 1 : 0);
/** A shop price at this run's certification. */
export const priceFor = (s: RunState, base: number) => base + (certOf(s) >= 4 ? 1 : 0);

/** The target for a round, including endless rounds past the eighth. */
export function targetFor(round: number, def: RoundDef, cert = 0): number {
  const base = round <= ROUNDS ? TARGETS[round] : TARGETS[ROUNDS] * Math.pow(1.6, round - ROUNDS);
  return Math.round((base * (def.targetScale ?? 1) * (cert >= 1 ? 1.1 : 1)) / 50) * 50;
}

/** Draw n cards; an empty draw pile reshuffles the played cards back in. */
function draw(s: RunState, n: number) {
  for (let i = 0; i < n; i++) {
    if (!s.draw.length) {
      if (!s.discard.length) return;
      const rng = new Rng(s.rng);
      s.draw = rng.shuffle(s.discard);
      s.rng = rng.state;
      s.discard = [];
    }
    s.hand.push(s.draw.pop()!);
  }
}

/** Endless rounds are planned as they come: a boss every third round. */
function ensurePlan(s: RunState, round: number) {
  const rng = new Rng(s.rng);
  while (s.plan.length < round) {
    const r = s.plan.length + 1;
    const pool = r % 3 === 0 ? [...BOSSES, FINAL_BOSS] : CLIENTS;
    s.plan.push(rng.pick(pool).id);
  }
  s.rng = rng.state;
}

function startRound(s: RunState) {
  ensurePlan(s, s.round);
  const rng = new Rng(s.rng);
  s.draw = rng.shuffle(s.deck.map((c) => c.uid));
  s.rng = rng.state;
  s.hand = [];
  s.discard = [];
  draw(s, handSize(s));
  s.takesLeft = TAKES;
  s.redrawsLeft = redrawsFor(s);
  s.score = 0;
  s.target = targetFor(s.round, roundDef(s), certOf(s));
  s.lastTakeScore = 0;
  s.takesPlayed = 0;
  s.usedTypes = [];
  s.phase = "play";
  s.shop = null;
  s.reward = null;
}

export function newRun(seed: number, daily = false, deckKind: DeckKind = "classic", cert = 0): RunState {
  const starter = DECK_BY_ID[deckKind];
  const rng = new Rng(seed);
  const clients = rng.shuffle(CLIENTS);
  const bosses = rng.shuffle(BOSSES);
  const plan: ModifierId[] = [];
  let c = 0;
  let b = 0;
  for (let r = 1; r <= ROUNDS; r++) {
    if (r === ROUNDS) plan.push(FINAL_BOSS.id);
    else if (BOSS_ROUNDS.includes(r)) plan.push(bosses[b++].id);
    else plan.push(clients[c++].id);
  }
  const s: RunState = {
    version: 2,
    seed,
    daily,
    cert,
    deckKind,
    endless: false,
    rng: rng.state,
    round: 1,
    plan,
    phase: "play",
    deck: starter.cards.map((id, i) => ({ uid: `c${i}`, id })),
    draw: [],
    hand: [],
    discard: [],
    takesLeft: TAKES,
    redrawsLeft: REDRAWS,
    score: 0,
    target: TARGETS[1],
    money: START_MONEY + (starter.money ?? 0),
    gear: [],
    gearState: {},
    sessions: [],
    levels: {},
    takesPlayed: 0,
    runTakes: 0,
    lastTakeScore: 0,
    usedTypes: [],
    totalScore: 0,
    best: null,
    shop: null,
    reward: null,
    nextUid: starter.cards.length,
  };
  startRound(s);
  return s;
}

const clone = (s: RunState): RunState => structuredClone(s);

/** Score a would-be take without committing it (the live preview). */
export function previewTake(s: RunState, uids: string[]): TakeResult {
  return scoreTake(takeInput(s, uids, 1));
}

function takeInput(s: RunState, uids: string[], crashRoll: number) {
  const cards: PlayedCard[] = uids.map((uid) => {
    const inst = instOf(s, uid);
    return { uid, def: CARD_BY_ID[inst.id], mod: inst.mod };
  });
  return {
    cards,
    gear: s.gear,
    levels: s.levels,
    modifier: s.plan[s.round - 1],
    takesPlayed: s.takesPlayed,
    usedTypes: s.usedTypes,
    crashRoll,
    deckSize: s.deck.length,
    runTakes: s.runTakes,
    gearState: s.gearState,
    lastTake: s.takesLeft === 1,
  };
}

export function playTake(prev: RunState, uids: string[]): { state: RunState; result: TakeResult } {
  const s = clone(prev);
  if (s.phase !== "play" || !uids.length || uids.length > maxPlay(s)) throw new Error("invalid take");
  if (!uids.every((u) => s.hand.includes(u))) throw new Error("card not in hand");
  const rng = new Rng(s.rng);
  const crashRoll = rng.next();
  s.rng = rng.state;
  const result = scoreTake(takeInput(s, uids, crashRoll));

  s.score += result.score;
  s.totalScore += result.score;
  s.money += result.money;
  s.takesLeft -= 1;
  s.takesPlayed += 1;
  s.runTakes += 1;
  const chops = uids.filter((u) => cardOf(s, u).hits.some((h) => h.voice === "chop")).length;
  s.gearState.digger = (s.gearState.digger ?? 0) + chops;
  s.gearState.streak = result.score > s.lastTakeScore ? (s.gearState.streak ?? 0) + 1 : 0;
  s.lastTakeScore = result.score;
  s.usedTypes.push(result.type.id);
  s.hand = s.hand.filter((u) => !uids.includes(u));
  s.discard.push(...uids);
  draw(s, handSize(s) - s.hand.length);

  if (!s.best || result.score > s.best.score) {
    s.best = {
      cards: uids.map((u) => s.deck.find((c) => c.uid === u)!.id),
      score: result.score,
      tempo: roundDef(s).tempo,
      typeName: result.type.name,
      round: s.round,
    };
  }

  if (s.score >= s.target) {
    const boss = roundDef(s).boss;
    const reward: Reward = {
      base: (boss ? 6 : s.round >= 4 ? 5 : 4) - (certOf(s) >= 3 ? 1 : 0),
      takes: s.takesLeft,
      interest: certOf(s) >= 3 ? 0 : Math.min(4, Math.floor(s.money / 5)),
      chain: s.gear.includes("goldchain") ? 3 : 0,
      register: s.gear.includes("register") ? s.redrawsLeft : 0,
      total: 0,
      session: null,
    };
    reward.total = reward.base + reward.takes + reward.interest + reward.chain + reward.register;
    s.money += reward.total;
    if (boss && s.sessions.length < MAX_SESSIONS) {
      const rng2 = new Rng(s.rng);
      reward.session = rng2.pick(SESSIONS).id;
      s.rng = rng2.state;
      s.sessions.push(reward.session);
    }
    s.reward = reward;
    s.phase = s.round === ROUNDS && !s.endless ? "victory" : "won";
  } else if (s.takesLeft === 0 || s.hand.length === 0) {
    s.phase = "over";
  }
  return { state: s, result };
}

export function redraw(prev: RunState, uids: string[]): RunState {
  const s = clone(prev);
  if (s.phase !== "play" || s.redrawsLeft <= 0 || !uids.length || uids.length > MAX_PLAY) return prev;
  if (!uids.every((u) => s.hand.includes(u))) return prev;
  s.redrawsLeft -= 1;
  s.hand = s.hand.filter((u) => !uids.includes(u));
  s.discard.push(...uids);
  draw(s, handSize(s) - s.hand.length);
  return s;
}

// ---- shop

const RARITY_WEIGHT: Record<Rarity, number> = { common: 60, uncommon: 30, rare: 10 };

function weightedPick<T extends { rarity: Rarity }>(rng: Rng, items: T[]): T {
  const total = items.reduce((sum, i) => sum + RARITY_WEIGHT[i.rarity], 0);
  let roll = rng.next() * total;
  for (const item of items) {
    roll -= RARITY_WEIGHT[item.rarity];
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function rollShop(s: RunState, rng: Rng): Pick<ShopState, "gear" | "cards" | "sessions" | "upgrade"> {
  const gearPool = GEAR.filter((g) => !s.gear.includes(g.id));
  const gear: GearId[] = [];
  while (gear.length < 2 && gearPool.length > gear.length) {
    const pick = weightedPick(rng, gearPool.filter((g) => !gear.includes(g.id)));
    gear.push(pick.id);
  }
  const cards = [0, 1, 2].map(() => weightedPick(rng, CARDS).id);
  const sessions = [0, 1].map(() => weightedPick(rng, SESSIONS).id);
  const upgradable = BEAT_TYPES.filter((t) => t.id !== "sketch");
  return { gear, cards, sessions, upgrade: rng.pick(upgradable).id };
}

export function openShop(prev: RunState): RunState {
  const s = clone(prev);
  if (s.phase !== "won") return prev;
  const rng = new Rng(s.rng);
  s.shop = { ...rollShop(s, rng), rerollCost: priceFor(s, 2), removed: false };
  s.rng = rng.state;
  ensurePlan(s, s.round + 1);
  s.phase = "shop";
  return s;
}

export function rerollShop(prev: RunState): RunState {
  if (!prev.shop || prev.money < prev.shop.rerollCost) return prev;
  const s = clone(prev);
  const shop = s.shop!;
  s.money -= shop.rerollCost;
  const rng = new Rng(s.rng);
  const fresh = rollShop(s, rng);
  s.rng = rng.state;
  s.shop = { ...shop, gear: fresh.gear, cards: fresh.cards, sessions: fresh.sessions, rerollCost: shop.rerollCost + 1 };
  return s;
}

export function buyGear(prev: RunState, slot: number): RunState {
  const id = prev.shop?.gear[slot];
  const price = id ? priceFor(prev, GEAR_BY_ID[id].price) : 0;
  if (!id || prev.gear.length >= MAX_GEAR || prev.money < price) return prev;
  const s = clone(prev);
  s.money -= price;
  s.gear.push(id);
  s.shop!.gear[slot] = null;
  return s;
}

export const sellPrice = (id: GearId) => Math.floor(GEAR_BY_ID[id].price / 2);

export function sellGear(prev: RunState, id: GearId): RunState {
  if (!prev.gear.includes(id)) return prev;
  const s = clone(prev);
  s.gear = s.gear.filter((g) => g !== id);
  s.money += sellPrice(id);
  return s;
}

export function buyCard(prev: RunState, slot: number): RunState {
  const id = prev.shop?.cards[slot];
  const price = id ? priceFor(prev, RARITY_PRICE[CARD_BY_ID[id].rarity]) : 0;
  if (!id || prev.money < price) return prev;
  const s = clone(prev);
  s.money -= price;
  s.deck.push({ uid: `c${s.nextUid++}`, id });
  s.shop!.cards[slot] = null;
  return s;
}

export function buyUpgrade(prev: RunState): RunState {
  const type = prev.shop?.upgrade;
  if (!type || prev.money < priceFor(prev, UPGRADE_PRICE)) return prev;
  const s = clone(prev);
  s.money -= priceFor(prev, UPGRADE_PRICE);
  s.levels[type] = (s.levels[type] ?? 0) + 1;
  s.shop!.upgrade = null;
  return s;
}

export function removeCard(prev: RunState, uid: string): RunState {
  if (!prev.shop || prev.shop.removed || prev.money < priceFor(prev, REMOVE_PRICE) || prev.deck.length <= 10) return prev;
  const s = clone(prev);
  s.money -= priceFor(prev, REMOVE_PRICE);
  s.deck = s.deck.filter((c) => c.uid !== uid);
  s.shop!.removed = true;
  return s;
}

export function nextRound(prev: RunState): RunState {
  if (prev.phase !== "shop") return prev;
  const s = clone(prev);
  s.round += 1;
  startRound(s);
  return s;
}

export function buySession(prev: RunState, slot: number): RunState {
  const id = prev.shop?.sessions[slot];
  const price = id ? priceFor(prev, SESSION_BY_ID[id].price) : 0;
  if (!id || prev.sessions.length >= MAX_SESSIONS || prev.money < price) return prev;
  const s = clone(prev);
  s.money -= price;
  s.sessions.push(id);
  s.shop!.sessions[slot] = null;
  return s;
}

/** Can the session in `slot` be used right now with these selected cards? */
export function canUseSession(s: RunState, slot: number, uids: string[]): boolean {
  const def = SESSION_BY_ID[s.sessions[slot]];
  if (!def) return false;
  if (def.inRound && s.phase !== "play") return false;
  if (!uids.every((u) => s.hand.includes(u))) return false;
  if (def.id === "mastering") return uids.length >= 1;
  if (def.targets === 0) return true;
  if (def.targets === 1) return uids.length === 1;
  return uids.length >= 1 && uids.length <= 2;
}

export function applySession(prev: RunState, slot: number, uids: string[]): RunState {
  if (!canUseSession(prev, slot, uids)) return prev;
  const s = clone(prev);
  const def = SESSION_BY_ID[s.sessions[slot]];
  s.sessions.splice(slot, 1);
  if (def.mod) {
    for (const u of uids) instOf(s, u).mod = def.mod;
  }
  switch (def.id) {
    case "splice": {
      const src = instOf(s, uids[0]);
      const copy = { uid: `c${s.nextUid++}`, id: src.id, mod: src.mod };
      s.deck.push(copy);
      s.discard.push(copy.uid);
      break;
    }
    case "mastering": {
      const type = previewTake(prev, uids).type.id;
      s.levels[type] = (s.levels[type] ?? 0) + 1;
      break;
    }
    case "retake":
      s.takesLeft += 1;
      break;
    case "freshcrate":
      s.redrawsLeft += 2;
      break;
    case "royalty":
      s.money += 6;
      break;
  }
  return s;
}

export function sellSession(prev: RunState, slot: number): RunState {
  if (!prev.sessions[slot]) return prev;
  const s = clone(prev);
  s.sessions.splice(slot, 1);
  s.money += 1;
  return s;
}

/** After winning round 8: keep going with higher targets. */
export function goEndless(prev: RunState): RunState {
  if (prev.phase !== "victory") return prev;
  const s = clone(prev);
  s.endless = true;
  s.phase = "won";
  return s;
}

export function isRunState(v: unknown): v is RunState {
  return !!v && typeof v === "object" && (v as RunState).version === 2 && Array.isArray((v as RunState).deck);
}
