"use client";

import { useEffect } from "react";
import { useDeckStore } from "./deckStore";

const TIPS: { anchor: string; title: string; text: string }[] = [
  { anchor: "hand", title: "Your hand", text: "Every card is a one-bar pattern: a kick, hats, an 808, chords… Tap up to 5 to build a take. The ▶ on a card plays it." },
  { anchor: "loop", title: "The loop", text: "What you picked shows up here, with its beat type. Cover more roles (kick, snare, hats, bass, melody) for a better type." },
  { anchor: "actions", title: "Play it", text: "Play take and the loop plays while it scores: groove × hype. Hit the client's target before your takes run out. Redraw swaps cards you don't want." },
  { anchor: "rack", title: "Your rack", text: "Gear and studio sessions from the shop land here. Tap one to see what it does." },
];

// First-run coach marks: one tip at a time, with its part of the table
// outlined. Skippable; never shown again once finished.
export default function Tutorial({ step }: { step: number }) {
  const { nextTip, endTutorial } = useDeckStore.getState();
  const tip = TIPS[step];

  useEffect(() => {
    if (!tip) return;
    const el = document.querySelector(`[data-tour="${tip.anchor}"]`);
    el?.classList.add("deck-tour-focus");
    return () => el?.classList.remove("deck-tour-focus");
  }, [tip]);

  useEffect(() => {
    if (!tip) endTutorial();
  }, [tip, endTutorial]);

  if (!tip) return null;
  const last = step === TIPS.length - 1;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[38%] z-30 flex justify-center px-3" role="dialog" aria-label="Tutorial">
      <div className="pointer-events-auto w-full max-w-[380px] rounded-[8px] border border-[#ffd27a]/60 bg-gradient-to-b from-[#2a2410] to-[#120f06] p-3 text-[#f6ecd0] shadow-[0_8px_30px_rgba(0,0,0,0.7)]">
        <p className="flex items-baseline justify-between">
          <span className="font-pixel text-[10px] text-[#ffd27a]">{tip.title.toUpperCase()}</span>
          <span className="text-[10.5px] text-[#b9a878]">
            {step + 1}/{TIPS.length}
          </span>
        </p>
        <p className="mt-1.5 text-[12.5px] leading-snug">{tip.text}</p>
        <div className="mt-2.5 flex justify-end gap-2">
          <button onClick={endTutorial} className="aero-btn-dark px-2.5 py-1 text-[11.5px]">
            Skip
          </button>
          <button onClick={last ? endTutorial : nextTip} className="aero-btn aero-btn-primary px-3 py-1 text-[11.5px]">
            {last ? "Let's go" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
