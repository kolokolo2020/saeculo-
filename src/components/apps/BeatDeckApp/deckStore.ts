import { create } from "zustand";
import * as R from "@/lib/beatdeck/run";
import { CARD_BY_ID, type CardDef, type DeckKind } from "@/lib/beatdeck/cards";
import type { GearId } from "@/lib/beatdeck/gear";
import { dailySeed } from "@/lib/beatdeck/rng";
import type { TakeResult } from "@/lib/beatdeck/scoring";
import { DEFAULT_PROGRESS, loadProgress, noteSeen, saveProgress, unlocksFor, type Progress, type Speed } from "./progress";

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

export type Screen = "title" | "table" | "crate";

interface DeckState {
  run: R.RunState | null;
  screen: Screen;
  selected: string[];
  scoring: Scoring | null;
  progress: Progress;
  /** Decks this run just unlocked (shown on the summary). */
  newUnlocks: DeckKind[];
  /** First-run coach marks: the step showing, or null. */
  tutorial: number | null;
  hydrated: boolean;
  hydrate: () => void;
  start: (daily: boolean, deck: DeckKind) => void;
  resume: () => void;
  go: (screen: Screen) => void;
  toggle: (uid: string) => void;
  play: () => void;
  finishScoring: () => void;
  redraw: () => void;
  applySession: (slot: number) => void;
  sellSession: (slot: number) => void;
  openShop: () => void;
  buyGear: (slot: number) => void;
  buyCard: (slot: number) => void;
  buySession: (slot: number) => void;
  buyUpgrade: () => void;
  removeCard: (uid: string) => void;
  sellGear: (id: GearId) => void;
  reroll: () => void;
  nextRound: () => void;
  goEndless: () => void;
  setSpeed: (speed: Speed) => void;
  toggleSfx: () => void;
  nextTip: () => void;
  endTutorial: () => void;
}

function saveRun(run: R.RunState | null) {
  try {
    if (run && run.phase !== "over") localStorage.setItem(SAVE_KEY, JSON.stringify(run));
    else localStorage.removeItem(SAVE_KEY);
  } catch {
    // storage unavailable — the run lasts for this visit only
  }
}

export const useDeckStore = create<DeckState>((set, get) => {
  const setProgress = (p: Progress) => {
    if (p !== get().progress) {
      saveProgress(p);
      set({ progress: p });
    }
  };

  /** Commit a new run state: persist it, keep the selection valid, log discoveries. */
  const commit = (run: R.RunState) => {
    saveRun(run);
    set((s) => ({ run, selected: s.selected.filter((u) => run.hand.includes(u)) }));
    setProgress(noteSeen(get().progress, run));
  };

  const act = (fn: (run: R.RunState) => R.RunState) => () => {
    const { run } = get();
    if (run) commit(fn(run));
  };

  return {
    run: null,
    screen: "title",
    selected: [],
    scoring: null,
    progress: DEFAULT_PROGRESS,
    newUnlocks: [],
    tutorial: null,
    hydrated: false,

    hydrate: () => {
      let run: R.RunState | null = null;
      try {
        const saved = JSON.parse(localStorage.getItem(SAVE_KEY) ?? "null");
        if (R.isRunState(saved)) run = saved;
      } catch {
        // corrupted save — start fresh
      }
      set({ run, progress: loadProgress(), hydrated: true });
    },

    start: (daily, deck) => {
      const seed = daily ? dailySeed() : Math.floor(Math.random() * 2 ** 31);
      const run = R.newRun(seed, daily, deck);
      const progress = get().progress;
      set({ screen: "table", selected: [], scoring: null, newUnlocks: [], tutorial: progress.tutorialDone ? null : 0 });
      setProgress({ ...progress, runs: progress.runs + 1 });
      commit(run);
    },
    resume: () => set({ screen: "table" }),
    go: (screen) => set({ screen, scoring: null, selected: [] }),

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
      const { scoring, progress } = get();
      if (!scoring) return;
      const next = scoring.next;
      let p: Progress = { ...progress, bestTake: Math.max(progress.bestTake, scoring.result.score) };
      let newUnlocks: DeckKind[] = [];
      if (next.phase === "over" || next.phase === "victory") {
        newUnlocks = unlocksFor(p, next);
        p = {
          ...p,
          bestTotal: Math.max(p.bestTotal, next.totalScore),
          furthest: Math.max(p.furthest, next.phase === "victory" ? 9 : next.endless ? next.round : next.round),
          wins: p.wins + (next.phase === "victory" ? 1 : 0),
          unlocked: [...p.unlocked, ...newUnlocks],
        };
      }
      set({ scoring: null, selected: [], newUnlocks });
      setProgress(p);
      commit(next);
    },

    redraw: () => {
      const { run, selected, scoring } = get();
      if (!run || scoring || !selected.length) return;
      const next = R.redraw(run, selected);
      if (next !== run) {
        set({ selected: [] });
        commit(next);
      }
    },

    applySession: (slot) => {
      const { run, selected, scoring } = get();
      if (!run || scoring) return;
      const next = R.applySession(run, slot, selected);
      if (next !== run) {
        set({ selected: [] });
        commit(next);
      }
    },
    sellSession: (slot) => get().run && commit(R.sellSession(get().run!, slot)),

    openShop: act(R.openShop),
    buyGear: (slot) => get().run && commit(R.buyGear(get().run!, slot)),
    buyCard: (slot) => get().run && commit(R.buyCard(get().run!, slot)),
    buySession: (slot) => get().run && commit(R.buySession(get().run!, slot)),
    buyUpgrade: act(R.buyUpgrade),
    removeCard: (uid) => get().run && commit(R.removeCard(get().run!, uid)),
    sellGear: (id) => get().run && commit(R.sellGear(get().run!, id)),
    reroll: act(R.rerollShop),
    nextRound: act(R.nextRound),
    goEndless: () => {
      const { run } = get();
      if (!run) return;
      set({ newUnlocks: [] });
      commit(R.openShop(R.goEndless(run)));
    },

    setSpeed: (speed) => setProgress({ ...get().progress, speed }),
    toggleSfx: () => setProgress({ ...get().progress, sfx: !get().progress.sfx }),
    nextTip: () => set((s) => ({ tutorial: s.tutorial === null ? null : s.tutorial + 1 })),
    endTutorial: () => {
      set({ tutorial: null });
      setProgress({ ...get().progress, tutorialDone: true });
    },
  };
});

export const cardDef = (id: string) => CARD_BY_ID[id];
