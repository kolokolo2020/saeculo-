"use client";

import { useState } from "react";
import { GEAR_BY_ID, MAX_GEAR, type GearId } from "@/lib/beatdeck/gear";
import { canUseSession, sellPrice } from "@/lib/beatdeck/run";
import { MAX_SESSIONS, SESSION_BY_ID } from "@/lib/beatdeck/sessions";
import { useDeckStore } from "./deckStore";
import { sfx } from "./sfx";

type Open = { kind: "gear"; id: GearId } | { kind: "session"; slot: number } | null;

/** A scaling gear's current value, shown on its chip. */
function gearValue(id: GearId, state: Partial<Record<GearId, number>>, runTakes: number): string | null {
  if (id === "digger") return `+${state.digger ?? 0}`;
  if (id === "nightowl") return `+${runTakes * 3}`;
  if (id === "streak") return `+${2 * (state.streak ?? 0)}`;
  return null;
}

// Your rack: up to five pieces of gear (passive) and two studio sessions
// (one-use). Tap anything for what it does; sessions can be used on the
// cards you've selected, and anything can be sold in the shop.
export default function Rack() {
  const run = useDeckStore((s) => s.run)!;
  const selected = useDeckStore((s) => s.selected);
  const scoring = useDeckStore((s) => s.scoring);
  const { applySession, sellSession, sellGear } = useDeckStore.getState();
  const [open, setOpen] = useState<Open>(null);
  const inShop = run.phase === "shop";

  const gearInfo = open?.kind === "gear" ? GEAR_BY_ID[open.id] : null;
  const sessionId = open?.kind === "session" ? run.sessions[open.slot] : undefined;
  const session = sessionId ? SESSION_BY_ID[sessionId] : null;
  const usable = open?.kind === "session" && !scoring && canUseSession(run, open.slot, selected);

  const chip = "h-7 max-w-[150px] truncate rounded-[4px] border px-2 text-[11.5px]";
  const idle = "border-black bg-gradient-to-b from-[#3b4452] to-[#1d232c] text-[#e6eef8]";
  const active = "border-[#9fe0ff] bg-[#1f6fd1] text-white";

  return (
    <div className="border-b border-black/60 px-3 py-1.5" data-tour="rack">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] tracking-wide text-[#9fb2c9] uppercase">
          Gear <span className="sm:hidden">{run.gear.length}/{MAX_GEAR}</span>
        </span>
        <span className="flex flex-wrap gap-1.5" aria-label="Gear">
          {Array.from({ length: MAX_GEAR }, (_, i) => {
            const id = run.gear[i];
            if (!id) return <span key={i} className="h-7 w-[84px] rounded-[4px] border border-dashed border-white/15 max-sm:hidden" aria-hidden />;
            const g = GEAR_BY_ID[id];
            const value = gearValue(id, run.gearState, run.runTakes);
            const isOpen = open?.kind === "gear" && open.id === id;
            return (
              <button key={id} onClick={() => setOpen(isOpen ? null : { kind: "gear", id })} title={g.text} aria-expanded={isOpen} className={`${chip} ${isOpen ? active : idle}`}>
                {g.name}
                {value && <span className="ml-1 font-mono text-[#9fffb0]">{value}</span>}
              </button>
            );
          })}
        </span>
        <span className="mr-1 ml-2 text-[10px] tracking-wide text-[#9fb2c9] uppercase">Studio</span>
        <span className="flex gap-1.5" aria-label="Studio sessions">
          {Array.from({ length: MAX_SESSIONS }, (_, i) => {
            const id = run.sessions[i];
            if (!id) return <span key={i} className="h-7 w-[84px] rounded-[4px] border border-dashed border-[#ffd27a]/25" aria-hidden />;
            const isOpen = open?.kind === "session" && open.slot === i;
            return (
              <button
                key={`${id}-${i}`}
                onClick={() => setOpen(isOpen ? null : { kind: "session", slot: i })}
                title={SESSION_BY_ID[id].text}
                aria-expanded={isOpen}
                className={`${chip} ${isOpen ? active : "border-[#8a6a1c] bg-gradient-to-b from-[#5a4a22] to-[#2a2210] text-[#ffe7a3]"}`}
              >
                ◆ {SESSION_BY_ID[id].name}
              </button>
            );
          })}
        </span>
      </div>

      {gearInfo && (
        <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[11.5px] text-[#c9d6e6]">
          <b className="text-white">{gearInfo.name}:</b> {gearInfo.text}
          {inShop && (
            <button
              onClick={() => {
                sellGear(gearInfo.id);
                sfx("cash");
                setOpen(null);
              }}
              className="aero-btn-dark px-2 py-0.5 text-[11px]"
            >
              Sell for ${sellPrice(gearInfo.id)}
            </button>
          )}
        </p>
      )}
      {session && open?.kind === "session" && (
        <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[11.5px] text-[#c9d6e6]">
          <b className="text-[#ffe7a3]">{session.name}:</b> {session.text}
          {!inShop && session.targets > 0 && !usable && (
            <span className="text-[#9fb2c9]">
              {session.id === "mastering" ? "Select the cards first." : session.targets === 1 ? "Select exactly one card first." : "Select one or two cards first."}
            </span>
          )}
          <button
            onClick={() => {
              applySession(open.slot);
              sfx("session");
              setOpen(null);
            }}
            disabled={!usable}
            className="aero-btn aero-btn-primary px-2.5 py-0.5 text-[11px] disabled:opacity-40"
          >
            Use
          </button>
          <button
            onClick={() => {
              sellSession(open.slot);
              sfx("cash");
              setOpen(null);
            }}
            className="aero-btn-dark px-2 py-0.5 text-[11px]"
          >
            Sell for $1
          </button>
        </p>
      )}
    </div>
  );
}
