"use client";

import { useState } from "react";
import Frame, { miniBtn } from "./Frame";

// Digging the crates: five dollars buys a flick through a bin. Most of it
// is nothing; some of it is a break worth knowing; now and then a pressing
// worth more than the shop thinks.

export type DigResult = "nothing" | "break" | "rare" | "first";
const SLEEVES = ["#d0a020", "#4f7d99", "#a4452f", "#e8e0cf", "#5a3a8a", "#2f6b3a", "#c9c2b3", "#1b1b1b"];
const NOTHING = ["Easy listening, warped.", "A cookery record. Somehow scratched.", "Somebody's holiday slides, on vinyl.", "Panpipes. Twelve tracks of panpipes.", "A sleeve with the wrong record in it."];
const BREAK = ["A funk 45 with four bars of drums alone at the start.", "A library record: 'Tension 3'. The bass line is unreal.", "Gospel, live. The claps on track two.", "A soundtrack nobody remembers, with a drum break that goes on and on."];

export default function Crates({ cash, first, onDig, onClose }: { cash: number; first: boolean; onDig: (r: DigResult) => void; onClose: () => void }) {
  const [seen, setSeen] = useState<{ text: string; kind: DigResult; color: string } | null>(null);
  const [n, setN] = useState(0);
  const dig = () => {
    if (cash < 5) return;
    const roll = Math.random();
    const kind: DigResult = first && n === 0 ? "first" : roll < 0.15 ? "rare" : roll < 0.5 ? "break" : "nothing";
    const text =
      kind === "first"
        ? "A battle record, the sleeve half gone. Scratch sounds, side after side. You hear it in your head already."
        : kind === "rare"
          ? "An original pressing, mispriced. The owner winces and buys it back off you."
          : kind === "break"
            ? BREAK[Math.floor(Math.random() * BREAK.length)]
            : NOTHING[Math.floor(Math.random() * NOTHING.length)];
    setSeen({ text, kind, color: SLEEVES[Math.floor(Math.random() * SLEEVES.length)] });
    setN((x) => x + 1);
    onDig(kind);
  };
  return (
    <Frame title="The crates" sub="$5 a dig" onClose={onClose} testid="crates">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="relative h-24 w-24 shrink-0 rounded-[2px] shadow-[0_0_0_1px_#000]" style={{ background: seen?.color ?? "#2a2420" }} aria-hidden>
            <div className="absolute top-1/2 left-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#111216]" />
            <div className="absolute top-1/2 left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: seen?.color ?? "#555" }} />
          </div>
          <p aria-live="polite" data-testid="crates-line">
            {seen ? seen.text : "Bins of records, A to Z, then just everything. Five dollars and you can dig."}
            {seen?.kind === "rare" && <span className="block text-amber">+$15</span>}
            {seen?.kind === "break" && <span className="block text-amber">+1 respect, for knowing</span>}
          </p>
        </div>
        <button className={miniBtn} onClick={dig} disabled={cash < 5} data-autofocus data-testid="crates-dig">
          {cash < 5 ? "Not enough on you" : n ? "Dig again ($5)" : "Dig ($5)"}
        </button>
      </div>
    </Frame>
  );
}
