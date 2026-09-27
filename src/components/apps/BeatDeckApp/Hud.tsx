"use client";

import { DECK_BY_ID } from "@/lib/beatdeck/cards";
import type { RunState } from "@/lib/beatdeck/run";
import { REDRAWS, TAKES, roundDef } from "@/lib/beatdeck/run";
import { ROUNDS } from "@/lib/beatdeck/rounds";
import type { RunKey } from "./deckAudio";
import { fmt } from "./look";
import { useCountUp } from "./useCountUp";

function Pips({ label, left, total }: { label: string; left: number; total: number }) {
  return (
    <span className="flex items-center gap-1.5" aria-label={`${label}: ${left} of ${total} left`}>
      <span className="text-[10px] tracking-wide text-[#9fb2c9] uppercase">{label}</span>
      <span className="flex gap-[3px]" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`h-2.5 w-2.5 rounded-full border border-black/60 ${i < left ? "bg-[#39a6ff] shadow-[0_0_6px_#39a6ff]" : "bg-[#1b212a]"}`} />
        ))}
      </span>
    </span>
  );
}

// Round, client or boss and their rule, score vs target, takes, redraws, cash.
export default function Hud({ run, runKey }: { run: RunState; runKey: RunKey }) {
  const round = roundDef(run);
  const shownScore = useCountUp(run.score);
  const money = useCountUp(run.money, 400);
  const pct = Math.min(100, (shownScore / run.target) * 100);
  return (
    <div className="flex flex-wrap items-stretch gap-x-4 gap-y-2 border-b border-black/60 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] px-3 py-2">
      <div className="min-w-[180px] flex-1">
        <p className="flex items-center gap-2 text-[11px] text-[#9fb2c9]">
          <span className="font-pixel text-[9px] text-white">
            ROUND {run.round}
            {run.round <= ROUNDS && !run.endless ? `/${ROUNDS}` : ""}
          </span>
          {run.endless && <span className="rounded-[3px] bg-[#7a4fd6] px-1.5 py-[1px] text-[9.5px] font-bold text-white uppercase">Endless</span>}
          {round.boss && <span className="rounded-[3px] bg-[#c42b1c] px-1.5 py-[1px] text-[9.5px] font-bold text-white uppercase">Boss</span>}
          <span>
            {round.tempo} bpm · {runKey.name} · {DECK_BY_ID[run.deckKind].name} deck
          </span>
        </p>
        <p className="mt-0.5 text-[13px] font-semibold text-white">{round.who}</p>
        <p className="text-[11.5px] leading-snug text-[#ffd27a]">{round.rule}</p>
      </div>
      <div className="min-w-[170px] flex-1 self-center">
        <p className="flex items-baseline justify-between text-[11px] text-[#9fb2c9]">
          <span>Score</span>
          <span>
            <span className="font-mono text-[15px] text-white" aria-label="Round score">
              {fmt(shownScore)}
            </span>{" "}
            / {fmt(run.target)}
          </span>
        </p>
        <div className="aero-progress mt-1 h-3" role="progressbar" aria-label="Round progress" aria-valuemin={0} aria-valuemax={run.target} aria-valuenow={Math.round(shownScore)}>
          <div className="aero-progress-fill transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="flex flex-col justify-center gap-1" data-tour="takes">
        <Pips label="Takes" left={run.takesLeft} total={Math.max(TAKES, run.takesLeft)} />
        <Pips label="Redraws" left={run.redrawsLeft} total={Math.max(REDRAWS, run.redrawsLeft)} />
      </div>
      <div className="flex items-center">
        <span className="rounded-[4px] border border-black bg-[#03070f] px-2 py-1 font-mono text-[15px] text-[#9fffb0] shadow-[inset_0_1px_3px_rgba(0,0,0,0.9)]" aria-label="Money">
          ${Math.round(money)}
        </span>
      </div>
    </div>
  );
}
