"use client";

import { useState } from "react";
import { GEAR_BY_ID, MAX_GEAR, type GearId } from "@/lib/beatdeck/gear";
import { sellPrice } from "@/lib/beatdeck/run";

// Your gear: up to five passive upgrades. Tap one for what it does; in the
// shop it can be sold for half its price.
export default function GearRail({ gear, onSell }: { gear: GearId[]; onSell?: (id: GearId) => void }) {
  const [open, setOpen] = useState<GearId | null>(null);
  const info = open ? GEAR_BY_ID[open] : null;
  return (
    <div className="border-b border-black/60 px-3 py-1.5">
      <div className="flex flex-wrap items-center gap-1.5" aria-label="Gear">
        <span className="mr-1 text-[10px] tracking-wide text-[#9fb2c9] uppercase">
          Gear <span className="sm:hidden">{gear.length}/{MAX_GEAR}</span>
        </span>
        {Array.from({ length: MAX_GEAR }, (_, i) => {
          const id = gear[i];
          if (!id)
            return <span key={i} className="h-7 w-[92px] rounded-[4px] border border-dashed border-white/15 max-sm:hidden" aria-hidden />;
          const g = GEAR_BY_ID[id];
          return (
            <button
              key={id}
              onClick={() => setOpen(open === id ? null : id)}
              title={g.text}
              aria-expanded={open === id}
              className={`h-7 max-w-[140px] truncate rounded-[4px] border px-2 text-[11.5px] ${
                open === id ? "border-[#9fe0ff] bg-[#1f6fd1] text-white" : "border-black bg-gradient-to-b from-[#3b4452] to-[#1d232c] text-[#e6eef8]"
              }`}
            >
              {g.name}
            </button>
          );
        })}
      </div>
      {info && (
        <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[11.5px] text-[#c9d6e6]">
          <b className="text-white">{info.name}:</b> {info.text}
          {onSell && (
            <button
              onClick={() => {
                onSell(info.id);
                setOpen(null);
              }}
              className="aero-btn-dark px-2 py-0.5 text-[11px]"
            >
              Sell for ${sellPrice(info.id)}
            </button>
          )}
        </p>
      )}
    </div>
  );
}
