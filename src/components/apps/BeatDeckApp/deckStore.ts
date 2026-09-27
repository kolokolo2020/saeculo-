import { create } from "zustand";
import * as R from "@/lib/beatdeck/run";
import { CARD_BY_ID, type CardDef } from "@/lib/beatdeck/cards";
import type { GearId } from "@/lib/beatdeck/gear";
import { dailySeed } from "@/lib/beatdeck/rng";
import type { TakeResult } from "@/lib/beatdeck/scoring";
import { readBest, submitBest } from "@/lib/bestScores";

const SAVE_KEY = "saeculo-beatdeck-run";

export interface Scoring {
  /** Unique per take, to remount the playback. */
  id: number;
  result: TakeResult;
  cards: CardDef[];
  tempo: number;
  /** The run after this take, committed when the animation finishes. */
  next: R.RunState;
}

export interface Bests {
  score: number;
  round: number;
  wins: number;
}

interface DeckState {
  run: R.RunState | null;
  screen: "title" | "table";
  selected: string[];
  scoring: Scoring | null;
  bests: Bests;
  hydrated: boolean;
  hydrate: () => void;
  start: (daily: boolean) => void;
  resume: () => void;
  toTitle: () => void;
  toggle: (uid: string) => void;
  play: () => void;
  finishScoring: () => void;
  redraw: () => void;
  openShop: () => void;
  buyGear: (slot: number) => void;
  buyCard: (slot: number) => void;
  buyUpgrade: () => void;
  removeCard: (uid: string) => void;
  sellGear: (id: GearId) => void;
  reroll: () => void;
  nextRound: () => void;
}

function save(run: R.RunState | null) {
  try {
    if (run && run.phase !== "over" && run.phase !== "victory") localStorage.setItem(SAVE_KEY, JSON.stringify(run));
    else localStorage.removeItem(SAVE_KEY);
  } catch {
    // storage unavailable — the run lasts for this visit only
  }
}

const readBests = (): Bests => ({ score: readBest("deck"), round: readBest("deckRound"), wins: readBest("deckWins") });

export const useDeckStore = create<DeckState>((set, get) => {
  /** Commit a new run state: persist it and keep the selection valid. */
  const commit = (run: R.RunState) => {
    save(run);
    set((s) => ({ run, selected: s.selected.filter((u) => run.hand.includes(u)) }));
  };

  return {
    run: null,
    screen: "title",
    selected: [],
    scoring: null,
    bests: { score: 0, round: 0, wins: 0 },
    hydrated: false,

    hydrate: () => {
      let run: R.RunState | null = null;
      try {
        const saved = JSON.parse(localStorage.getItem(SAVE_KEY) ?? "null");
        if (R.isRunState(saved)) run = saved;
      } catch {
        // corrupted save — start fresh
      }
      set({ run, bests: readBests(), hydrated: true });
    },

    start: (daily) => {
      const seed = daily ? dailySeed() : Math.floor(Math.random() * 2 ** 31);
      const run = R.newRun(seed, daily);
      save(run);
      set({ run, screen: "table", selected: [], scoring: null });
    },
    resume: () => set({ screen: "table" }),
    toTitle: () => set({ screen: "title", scoring: null, selected: [], bests: readBests() }),

    toggle: (uid) => {
      const { run, selected, scoring } = get();
      if (!run || scoring || run.phase !== "play") return;
      if (selected.includes(uid)) set({ selected: selected.filter((u) => u !== uid) });
      else if (selected.length < R.MAX_PLAY) set({ selected: [...selected, uid] });
    },

    play: () => {
      const { run, selected, scoring } = get();
      if (!run || scoring || !selected.length || selected.length > R.maxPlay(run)) return;
      const tempo = R.roundDef(run).tempo;
      const cards = selected.map((u) => R.cardOf(run, u));
      const { state, result } = R.playTake(run, selected);
      set({ scoring: { id: Date.now(), result, cards, tempo, next: state } });
    },

    finishScoring: () => {
      const { scoring } = get();
      if (!scoring) return;
      const next = scoring.next;
      if (next.phase === "over" || next.phase === "victory") {
        submitBest("deck", next.totalScore);
        submitBest("deckRound", next.phase === "victory" ? 9 : next.round);
        if (next.phase === "victory") submitBest("deckWins", readBest("deckWins") + 1);
      }
      save(next);
      set({ run: next, scoring: null, selected: [], bests: readBests() });
    },

    redraw: () => {
      const { run, selected, scoring } = get();
      if (!run || scoring || !selected.length) return;
      const next = R.redraw(run, selected);
      if (next !== run) {
        save(next);
        set({ run: next, selected: [] });
      }
    },

    openShop: () => {
      const { run } = get();
      if (run) commit(R.openShop(run));
    },
    buyGear: (slot) => {
      const { run } = get();
      if (run) commit(R.buyGear(run, slot));
    },
    buyCard: (slot) => {
      const { run } = get();
      if (run) commit(R.buyCard(run, slot));
    },
    buyUpgrade: () => {
      const { run } = get();
      if (run) commit(R.buyUpgrade(run));
    },
    removeCard: (uid) => {
      const { run } = get();
      if (run) commit(R.removeCard(run, uid));
    },
    sellGear: (id) => {
      const { run } = get();
      if (run) commit(R.sellGear(run, id));
    },
    reroll: () => {
      const { run } = get();
      if (run) commit(R.rerollShop(run));
    },
    nextRound: () => {
      const { run } = get();
      if (run) commit(R.nextRound(run));
    },
  };
});

export const cardDef = (id: string) => CARD_BY_ID[id];
