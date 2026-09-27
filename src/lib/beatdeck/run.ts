// A run of Beat Deck as plain data plus pure transitions: every action takes
// a state and returns the next one, so the whole run serializes to
// localStorage (refresh-proof) and replays identically from its seed.

import { CARDS, CARD_BY_ID, RARITY_PRICE, STARTING_DECK, type CardDef, type Rarity } from "./cards";
import { GEAR, GEAR_BY_ID, MAX_GEAR, type GearId } from "./gear";
import { BOSSES, BOSS_ROUNDS, CLIENTS, FINAL_BOSS, ROUNDS, ROUND_BY_ID, TARGETS, type ModifierId, type RoundDef } from "./rounds";
import { Rng } from "./rng";
import { BEAT_TYPES, scoreTake, type BeatTypeId, type PlayedCard, type TakeResult } from "./scoring";

export const TAKES = 4;
export const REDRAWS = 3;
export const HAND_SIZE = 8;
export const MAX_PLAY = 5;
export const START_MONEY = 4;
export const REMOVE_PRICE = 3;
export const UPGRADE_PRICE = 4;

export interface CardInst {
  uid: string;
  id: string;
}

export type Phase = "play" | "won" | "shop" | "over" | "victory";

export interface ShopState {
  gear: (GearId | null)[];
  cards: (string | null)[];
  upgrade: BeatTypeId | null;
  rerollCost: number;
  removed: boolean;
}

export interface Reward {
  base: number;
  takes: number;
  interest: number;
  chain: number;
  total: number;
}

export interface BestTake {
  cards: string[];
  score: number;
  tempo: number;
  typeName: string;
  round: number;
}

export interface RunState {
  version: 1;
  seed: number;
  daily: boolean;
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
  levels: Partial<Record<BeatTypeId, number>>;
  takesPlayed: number;
  usedTypes: BeatTypeId[];
  totalScore: number;
  best: BestTake | null;
  shop: ShopState | null;
  reward: Reward | null;
  nextUid: number;
}

export const roundDef = (s: RunState): RoundDef => ROUND_BY_ID[s.plan[s.round - 1]];
export const handSize = (s: RunState) => (s.plan[s.round - 1] === "block" ? 6 : HAND_SIZE);
export const maxPlay = (s: RunState) => (s.plan[s.round - 1] === "noise" ? 3 : MAX_PLAY);
export const cardOf = (s: RunState, uid: string): CardDef => CARD_BY_ID[s.deck.find((c) => c.uid === uid)!.id];

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

function startRound(s: RunState) {
  const rng = new Rng(s.rng);
  s.draw = rng.shuffle(s.deck.map((c) => c.uid));
  s.rng = rng.state;
  s.hand = [];
  s.discard = [];
  draw(s, handSize(s));
  s.takesLeft = TAKES;
  s.redrawsLeft = REDRAWS;
  s.score = 0;
  s.target = Math.round((TARGETS[s.round] * (roundDef(s).targetScale ?? 1)) / 50) * 50;
  s.takesPlayed = 0;
  s.usedTypes = [];
  s.phase = "play";
  s.shop = null;
  s.reward = null;
}

export function newRun(seed: number, daily = false): RunState {
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
    version: 1,
    seed,
    daily,
    rng: rng.state,
    round: 1,
    plan,
    phase: "play",
    deck: STARTING_DECK.map((id, i) => ({ uid: `c${i}`, id })),
    draw: [],
    hand: [],
    discard: [],
    takesLeft: TAKES,
    redrawsLeft: REDRAWS,
    score: 0,
    target: TARGETS[1],
    money: START_MONEY,
    gear: [],
    levels: {},
    takesPlayed: 0,
    usedTypes: [],
    totalScore: 0,
    best: null,
    shop: null,
    reward: null,
    nextUid: STARTING_DECK.length,
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
  const cards: PlayedCard[] = uids.map((uid) => ({ uid, def: cardOf(s, uid) }));
  return {
    cards,
    gear: s.gear,
    levels: s.levels,
    modifier: s.plan[s.round - 1],
    takesPlayed: s.takesPlayed,
    usedTypes: s.usedTypes,
    crashRoll,
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
  s.takesLeft -= 1;
  s.takesPlayed += 1;
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
      base: boss ? 6 : s.round >= 4 ? 5 : 4,
      takes: s.takesLeft,
      interest: Math.min(4, Math.floor(s.money / 5)),
      chain: s.gear.includes("goldchain") ? 3 : 0,
      total: 0,
    };
    reward.total = reward.base + reward.takes + reward.interest + reward.chain;
    s.money += reward.total;
    s.reward = reward;
    s.phase = s.round === ROUNDS ? "victory" : "won";
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

function rollShop(s: RunState, rng: Rng): Pick<ShopState, "gear" | "cards" | "upgrade"> {
  const gearPool = GEAR.filter((g) => !s.gear.includes(g.id));
  const gear: GearId[] = [];
  while (gear.length < 2 && gearPool.length > gear.length) {
    const pick = weightedPick(rng, gearPool.filter((g) => !gear.includes(g.id)));
    gear.push(pick.id);
  }
  const cards = [0, 1, 2].map(() => weightedPick(rng, CARDS).id);
  const upgradable = BEAT_TYPES.filter((t) => t.id !== "sketch");
  return { gear, cards, upgrade: rng.pick(upgradable).id };
}

export function openShop(prev: RunState): RunState {
  const s = clone(prev);
  if (s.phase !== "won") return prev;
  const rng = new Rng(s.rng);
  s.shop = { ...rollShop(s, rng), rerollCost: 2, removed: false };
  s.rng = rng.state;
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
  s.shop = { ...shop, gear: fresh.gear, cards: fresh.cards, rerollCost: shop.rerollCost + 1 };
  return s;
}

export function buyGear(prev: RunState, slot: number): RunState {
  const id = prev.shop?.gear[slot];
  if (!id || prev.gear.length >= MAX_GEAR || prev.money < GEAR_BY_ID[id].price) return prev;
  const s = clone(prev);
  s.money -= GEAR_BY_ID[id].price;
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
  if (!id || prev.money < RARITY_PRICE[CARD_BY_ID[id].rarity]) return prev;
  const s = clone(prev);
  s.money -= RARITY_PRICE[CARD_BY_ID[id].rarity];
  s.deck.push({ uid: `c${s.nextUid++}`, id });
  s.shop!.cards[slot] = null;
  return s;
}

export function buyUpgrade(prev: RunState): RunState {
  const type = prev.shop?.upgrade;
  if (!type || prev.money < UPGRADE_PRICE) return prev;
  const s = clone(prev);
  s.money -= UPGRADE_PRICE;
  s.levels[type] = (s.levels[type] ?? 0) + 1;
  s.shop!.upgrade = null;
  return s;
}

export function removeCard(prev: RunState, uid: string): RunState {
  if (!prev.shop || prev.shop.removed || prev.money < REMOVE_PRICE || prev.deck.length <= 10) return prev;
  const s = clone(prev);
  s.money -= REMOVE_PRICE;
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

export function isRunState(v: unknown): v is RunState {
  return !!v && typeof v === "object" && (v as RunState).version === 1 && Array.isArray((v as RunState).deck);
}
