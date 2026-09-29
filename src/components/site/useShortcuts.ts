"use client";

import { useEffect } from "react";
import { usePlayerStore } from "@/components/player/playerStore";
import { TRACKS } from "@/data/tracks";
import { useSiteStore, type WindowId } from "./siteStore";

// Keyboard shortcuts for the desktop. They stay out of the way: nothing
// fires while typing, while a control that uses the key has focus, or
// while the intro or the game is open.
export const SHORTCUTS: [string, string][] = [
  ["Space", "play / pause"],
  ["← →", "back / forward 5 seconds"],
  ["Shift + ← →", "previous / next beat"],
  ["M", "mute"],
  ["1 2 3 4", "Beats, Socials, Contact, Game"],
  ["?", "these shortcuts"],
];

const PLACES: (WindowId | "game")[] = ["beats", "socials", "contact", "game"];

export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const site = useSiteStore.getState();
      if (site.gameOpen || site.introOpen) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, select, [contenteditable=true], [role=slider], [role=menu]")) return;
      const player = usePlayerStore.getState();
      const onButton = !!el?.closest("button, a");
      if (e.key === " " && !onButton) {
        e.preventDefault();
        player.toggle();
      } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        if (el?.closest("[role=group], ol")) return;
        e.preventDefault();
        const dir = e.key === "ArrowRight" ? 1 : -1;
        if (e.shiftKey) (dir > 0 ? player.next : player.prev)();
        else player.seek(player.currentTime + dir * 5);
      } else if (e.key === "m" || e.key === "M") {
        player.toggleMute();
      } else if (["1", "2", "3", "4"].includes(e.key)) {
        const id = PLACES[Number(e.key) - 1];
        if (id === "game") site.setGameOpen(true);
        else site.openWindow(id);
      } else if (e.key === "?") {
        site.setShortcutsOpen(!site.shortcutsOpen);
      } else if (e.key === "Escape" && site.shortcutsOpen) {
        site.setShortcutsOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // the tab says what's playing
  useEffect(() => {
    const base = "saeculo — instrumentals & beats";
    const set = () => {
      const { playing, trackIndex } = usePlayerStore.getState();
      const t = TRACKS[trackIndex];
      document.title = playing && t ? `▶ ${t.title} — saeculo` : base;
    };
    set();
    return usePlayerStore.subscribe((s, prev) => {
      if (s.playing !== prev.playing || s.trackIndex !== prev.trackIndex) set();
    });
  }, []);
}
