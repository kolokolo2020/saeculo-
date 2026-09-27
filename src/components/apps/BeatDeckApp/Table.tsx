"use client";

import { useMemo, useState } from "react";
import * as R from "@/lib/beatdeck/run";
import { rolesOf, type Role } from "@/lib/beatdeck/cards";
import { nextTypeHint } from "@/lib/beatdeck/scoring";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useDeckStore } from "./deckStore";
import { runKeyFor } from "./deckAudio";
import { playTakeLive } from "./sound";
import DeckCard from "./DeckCard";
import GearRail from "./GearRail";
import Hud from "./Hud";
import LoopGrid from "./LoopGrid";
import TakeStage from "./TakeStage";
import Shop from "./Shop";
import { DeckViewer, RoundWon, Summary } from "./Overlays";
import { ROLES, ROLE_LABEL, fmt } from "./look";

const ROLE_ORDER = Object.fromEntries(ROLES.map((r, i) => [r, i])) as Record<Role, number>;

// The main play screen: status, gear, the loop being built, and your hand.
export default function Table() {
  const run = useDeckStore((s) => s.run)!;
  const selected = useDeckStore((s) => s.selected);
  const scoring = useDeckStore((s) => s.scoring);
  const { toggle, play, redraw, finishScoring, toTitle } = useDeckStore.getState();
  const reducedMotion = usePrefersReducedMotion();
  const [sorted, setSorted] = useState(true);
  const [showDeck, setShowDeck] = useState(false);
  const runKey = runKeyFor(run.seed);
  const round = R.roundDef(run);
  const max = R.maxPlay(run);

  const hand = useMemo(() => {
    const cards = run.hand.map((uid) => ({ uid, def: R.cardOf(run, uid) }));
    if (sorted) cards.sort((a, b) => ROLE_ORDER[rolesOf(a.def)[0]] - ROLE_ORDER[rolesOf(b.def)[0]] || a.def.name.localeCompare(b.def.name));
    return cards;
  }, [run, sorted]);

  const selectedDefs = selected.map((u) => R.cardOf(run, u));
  const preview = selected.length ? R.previewTake(run, selected) : null;
  const dimSteps = round.id === "ar" ? (s: number) => s >= 8 : undefined;
  const busy = !!scoring;

  // keyboard play: 1–8 pick cards, P plays the take, R redraws
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (busy || run.phase !== "play" || e.metaKey || e.ctrlKey || e.altKey) return;
    const n = Number(e.key);
    if (n >= 1 && n <= hand.length) {
      e.preventDefault();
      toggle(hand[n - 1].uid);
    } else if (e.key === "p" || e.key === "P") {
      e.preventDefault();
      play();
    } else if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      redraw();
    }
  };

  const audition = (uid: string) => {
    if (busy) return;
    playTakeLive([R.cardOf(run, uid)], round.tempo, runKey, 1, 0.05);
  };

  return (
    <div className="relative flex h-full flex-col text-[#e6eef8]" onKeyDown={onKeyDown}>
      <Hud run={run} shownScore={run.score} runKey={runKey} />
      <GearRail gear={run.gear} onSell={run.phase === "shop" ? useDeckStore.getState().sellGear : undefined} />

      {run.phase === "shop" ? (
        <Shop onShowDeck={() => setShowDeck(true)} />
      ) : (
        <div className="dark-scroll flex min-h-0 flex-1 flex-col overflow-y-auto">
          {/* the loop */}
          <div className="flex flex-1 flex-col justify-center p-3">
            {scoring ? (
              <TakeStage key={scoring.id} scoring={scoring} runKey={runKey} reducedMotion={reducedMotion} onDone={finishScoring} dimSteps={dimSteps} />
            ) : (
              <div className="flex flex-col gap-3 lg:flex-row">
                <div className="min-w-0 flex-1">
                  <LoopGrid cards={selectedDefs} playStep={-1} events={[]} dimSteps={dimSteps} />
                </div>
                <div className="flex w-full shrink-0 flex-col gap-1 rounded-[6px] border border-black/70 bg-black/35 p-3 lg:w-[250px]">
                  {preview ? (
                    <>
                      <p className="font-pixel text-[10px] text-[#ffd27a]">
                        {preview.type.name.toUpperCase()}
                        {preview.level > 0 && <span className="text-[#9fb2c9]"> LV{preview.level + 1}</span>}
                      </p>
                      <p className="font-mono text-[13px]">
                        <span className="text-[#6fb4ff]">{preview.baseGroove} groove</span> <span className="text-[#9fb2c9]">×</span>{" "}
                        <span className="text-[#ff8fc6]">{preview.baseHype} hype</span>
                        <span className="text-[#9fb2c9]"> base</span>
                      </p>
                      <p className="text-[11px] text-[#9fb2c9]">Covers: {preview.roles.map((r) => ROLE_LABEL[r]).join(", ")}</p>
                      {(() => {
                        const hint = nextTypeHint(preview.type.id, preview.roles);
                        return hint ? (
                          <p className="text-[11px] text-[#9fffb0]">
                            Add {hint.missing.map((r) => ROLE_LABEL[r]).join(" + ")} for {hint.type.name} ({hint.type.groove} × {hint.type.hype})
                          </p>
                        ) : null;
                      })()}
                      <p className="text-[11px] text-[#7f93ad]">Hits and bonuses add up when you play it.</p>
                    </>
                  ) : (
                    <p className="text-[12px] leading-snug text-[#9fb2c9]">
                      Pick up to {max} cards to build a loop, then <b className="text-white">Play take</b>. Cover more roles for a better beat type.
                      {run.score >= run.target ? (
                        <b className="text-[#9fffb0]">Target reached!</b>
                      ) : (
                        <>
                          You need <b className="text-white">{fmt(run.target - run.score)}</b> more this round.
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* the hand */}
          <div className="border-t border-black/60 bg-black/25 px-3 pt-4 pb-2">
            <div className="dark-scroll flex gap-2 overflow-x-auto pt-3 pb-2" aria-label="Your hand">
              {hand.map(({ uid, def }) => (
                <DeckCard
                  key={uid}
                  def={def}
                  selected={selected.includes(uid)}
                  dimmed={busy || (!selected.includes(uid) && selected.length >= max)}
                  onClick={() => toggle(uid)}
                  onAudition={busy ? undefined : () => audition(uid)}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={play}
                disabled={busy || !selected.length || selected.length > max}
                className="aero-btn aero-btn-primary px-5 py-1.5 text-[13px] disabled:opacity-50"
              >
                Play take ({selected.length}/{max})
              </button>
              <button
                onClick={redraw}
                disabled={busy || !selected.length || run.redrawsLeft === 0}
                className="aero-btn-dark px-3 py-1.5 text-[12px] disabled:opacity-40"
              >
                Redraw selected ({run.redrawsLeft})
              </button>
              <button onClick={() => setSorted((v) => !v)} className="aero-btn-dark px-2.5 py-1.5 text-[12px]">
                Sort: {sorted ? "role" : "drawn"}
              </button>
              <button onClick={() => setShowDeck(true)} className="aero-btn-dark px-2.5 py-1.5 text-[12px]">
                Deck ({run.draw.length} left)
              </button>
              <span className="ml-auto text-[10.5px] text-[#7f93ad] max-md:hidden">Keys: 1–8 pick · P play · R redraw</span>
              <button onClick={toTitle} disabled={busy} className="aero-btn-dark px-2.5 py-1.5 text-[12px] disabled:opacity-40">
                Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {!scoring && run.phase === "won" && <RoundWon />}
      {!scoring && (run.phase === "over" || run.phase === "victory") && <Summary />}
      {showDeck && <DeckViewer onClose={() => setShowDeck(false)} />}
    </div>
  );
}
