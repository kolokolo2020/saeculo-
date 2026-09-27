"use client";

import type { CardDef, Role } from "@/lib/beatdeck/cards";
import type { StepEvent } from "@/lib/beatdeck/scoring";
import { ROLES, ROLE_COLOR, ROLE_LABEL } from "./look";

// The take as a step sequencer: every role gets a lane, the selected cards'
// hits light it up, and during scoring a playhead sweeps across while each
// step's groove pops above the grid.
export default function LoopGrid({
  cards,
  playStep,
  events,
  dimSteps,
}: {
  cards: CardDef[];
  playStep: number;
  /** Scoring events that have fired so far (bar 1). */
  events: StepEvent[];
  /** Steps that score nothing this round (A&R boss). */
  dimSteps?: (step: number) => boolean;
}) {
  const lit = new Map<string, Role>();
  for (const card of cards) for (const h of card.hits) lit.set(`${h.role}:${h.step}`, h.role);
  const stepGroove = new Map<number, number>();
  for (const e of events) stepGroove.set(e.step, (stepGroove.get(e.step) ?? 0) + e.groove);

  return (
    <div className="flex flex-col gap-[3px]" role="img" aria-label="The loop">
      <div className="ml-[46px] grid h-5 grid-cols-16 gap-[3px]">
        {Array.from({ length: 16 }, (_, s) =>
          playStep === s && stepGroove.has(s) ? (
            <span key={`${s}-${playStep}`} className="animate-[deck-pop_0.5s_ease-out_forwards] text-center font-mono text-[11px] font-bold text-[#7fe0ff]">
              +{stepGroove.get(s)}
            </span>
          ) : (
            <span key={s} />
          ),
        )}
      </div>
      {ROLES.map((role) => (
        <div key={role} className="flex items-center gap-1.5">
          <span className="w-10 shrink-0 text-right text-[10.5px] text-[#9fb2c9]">{ROLE_LABEL[role]}</span>
          <div className="grid flex-1 grid-cols-16 gap-[3px]">
            {Array.from({ length: 16 }, (_, step) => {
              const on = lit.has(`${role}:${step}`);
              const [hi, lo] = ROLE_COLOR[role];
              const head = playStep === step;
              const dim = dimSteps?.(step);
              return (
                <span
                  key={step}
                  className={`aspect-[6/5] rounded-[3px] border border-black/70 transition-[filter] duration-75 ${head ? "brightness-[1.8]" : ""} ${
                    dim ? "opacity-35" : ""
                  }`}
                  style={{
                    background: on
                      ? `linear-gradient(to bottom, #fff 0%, ${hi} 35%, ${lo} 100%)`
                      : step % 4 === 0
                        ? "linear-gradient(to bottom, #333c49, #1b212a)"
                        : "linear-gradient(to bottom, #262d38, #12171e)",
                    boxShadow: on && head ? `0 0 12px ${hi}` : undefined,
                  }}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
