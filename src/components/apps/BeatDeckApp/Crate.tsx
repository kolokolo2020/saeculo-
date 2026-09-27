"use client";

import { useState } from "react";
import { CARDS } from "@/lib/beatdeck/cards";
import { GEAR } from "@/lib/beatdeck/gear";
import { SESSIONS } from "@/lib/beatdeck/sessions";
import { useDeckStore } from "./deckStore";
import { runKeyFor } from "./deckAudio";
import { playTakeLive, warmUp } from "./sound";
import DeckCard from "./DeckCard";

type Tab = "cards" | "gear" | "sessions";

// The Crate: every card and piece of gear in the game. The ones you haven't
// come across in a run yet stay hidden until you do.
export default function Crate() {
  const progress = useDeckStore((s) => s.progress);
  const { go } = useDeckStore.getState();
  const [tab, setTab] = useState<Tab>("cards");
  const seenCards = new Set(progress.seenCards);
  const seenGear = new Set(progress.seenGear);
  const key = runKeyFor(0);

  return (
    <div className="flex h-full flex-col text-[#e6eef8]">
      <div className="flex flex-wrap items-center gap-2 border-b border-black/60 px-3 py-2">
        <h2 className="font-pixel text-[12px] text-white">THE CRATE</h2>
        <div className="ml-2 flex gap-1" role="tablist">
          {(
            [
              ["cards", `Cards ${CARDS.filter((c) => seenCards.has(c.id)).length}/${CARDS.length}`],
              ["gear", `Gear ${GEAR.filter((g) => seenGear.has(g.id)).length}/${GEAR.length}`],
              ["sessions", `Studio ${SESSIONS.length}`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`rounded-[4px] px-2.5 py-1 text-[12px] ${tab === id ? "bg-gradient-to-b from-[#3d8ee8] to-[#0f3f86] text-white" : "text-[#b7c7dc] hover:text-white"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => go("title")} className="aero-btn-dark ml-auto px-3 py-1 text-[12px]">
          Back
        </button>
      </div>

      <div className="dark-scroll min-h-0 flex-1 overflow-y-auto p-3">
        {tab === "cards" && (
          <div className="flex flex-wrap gap-2.5">
            {CARDS.map((c) =>
              seenCards.has(c.id) ? (
                <DeckCard
                  key={c.id}
                  def={c}
                  onAudition={() => {
                    warmUp();
                    playTakeLive([c], 96, key, 1, 0.05);
                  }}
                />
              ) : (
                <div key={c.id} className="grid h-[150px] w-[104px] place-items-center rounded-[7px] border border-dashed border-white/15 bg-black/25 font-pixel text-[12px] text-white/20">
                  ???
                </div>
              ),
            )}
          </div>
        )}
        {tab === "gear" && (
          <ul className="grid gap-2 sm:grid-cols-2">
            {GEAR.map((g) => (
              <li key={g.id} className="rounded-[5px] border border-white/10 bg-black/25 p-2">
                {seenGear.has(g.id) ? (
                  <>
                    <p className="text-[12.5px] font-semibold text-white">
                      {g.name} <span className="text-[11px] font-normal text-[#9fb2c9]">${g.price}</span>
                    </p>
                    <p className="text-[11.5px] text-[#c9d6e6]">{g.text}</p>
                  </>
                ) : (
                  <p className="font-pixel text-[10px] text-white/25">??? · not found yet</p>
                )}
              </li>
            ))}
          </ul>
        )}
        {tab === "sessions" && (
          <ul className="grid gap-2 sm:grid-cols-2">
            {SESSIONS.map((s) => (
              <li key={s.id} className="rounded-[5px] border border-[#ffd27a]/25 bg-[#ffd27a]/5 p-2">
                <p className="text-[12.5px] font-semibold text-[#ffe7a3]">
                  ◆ {s.name} <span className="text-[11px] font-normal text-[#9fb2c9]">${s.price}</span>
                </p>
                <p className="text-[11.5px] text-[#c9d6e6]">{s.text}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
