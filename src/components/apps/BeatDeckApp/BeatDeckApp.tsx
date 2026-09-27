"use client";

import { useEffect } from "react";
import { useDeckStore } from "./deckStore";
import Crate from "./Crate";
import Table from "./Table";
import Title from "./Title";

// Beat Deck: a roguelike deckbuilder where every hand is a beat. Loaded on
// demand (next/dynamic) when its window first opens.
export default function BeatDeckApp() {
  const hydrated = useDeckStore((s) => s.hydrated);
  const screen = useDeckStore((s) => s.screen);
  const run = useDeckStore((s) => s.run);

  // the saved run and bests live in localStorage, read after mount
  useEffect(() => {
    if (!useDeckStore.getState().hydrated) useDeckStore.getState().hydrate();
  }, []);

  if (!hydrated) return null;
  if (screen === "crate") return <Crate />;
  return screen === "table" && run ? <Table /> : <Title />;
}
