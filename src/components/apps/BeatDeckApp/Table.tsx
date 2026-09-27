"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as R from "@/lib/beatdeck/run";
import { rolesOf, type Role } from "@/lib/beatdeck/cards";
import { nextTypeHint } from "@/lib/beatdeck/scoring";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useWindowStore } from "@/components/window-manager/windowStore";
import { useDeckStore } from "./deckStore";
import { runKeyFor } from "./deckAudio";
import { playTakeLive } from "./sound";
import { sfx } from "./sfx";
import DeckCard from "./DeckCard";
import Rack from "./Rack";
import Hud from "./Hud";
import LoopGrid from "./LoopGrid";
import TakeStage from "./TakeStage";
import Shop from "./Shop";
import Tutorial from "./Tutorial";
import { DeckViewer, RoundWon, Summary } from "./Overlays";
import { ROLES, ROLE_LABEL, fmt } from "./look";
import type { Speed } from "./progress";

const ROLE_ORDER = Object.fromEntries(ROLES.map((r, i) => [r, i])) as Record<Role, number>;
const SPEEDS: Speed[] = ["normal", "fast", "instant"];
const SPEED_LABEL: Record<Speed, string> = { normal: "Normal", fast: "Fast", instant: "Instant" };

// The main play screen: status, rack, the loop being built, and your hand.
export default function Table() {
  const run = useDeckStore((s) => s.run)!;
  const selected = useDeckStore((s) => s.selected);
  const scoring = useDeckStore((s) => s.scoring);
  const progress = useDeckStore((s) => s.progress);
  const tutorial = useDeckStore((s) => s.tutorial);
  const { toggle, play, redraw, finishScoring, go, setSpeed, toggleSfx } = useDeckStore.getState();
  const reducedMotion = usePrefersReducedMotion();
  const [sorted, setSorted] = useState(true);
  const [showDeck, setShowDeck] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  const runKey = runKeyFor(run.seed);
  const round = R.roundDef(run);
  const max = R.maxPlay(run);
  const speed: Speed = reducedMotion && progress.speed === "normal" ? "fast" : progress.speed;

  const hand = useMemo(() => {
    const cards = run.hand.map((uid) => ({ uid, inst: R.instOf(run, uid), def: R.cardOf(run, uid) }));
    if (sorted) cards.sort((a, b) => ROLE_ORDER[rolesOf(a.def)[0]] - ROLE_ORDER[rolesOf(b.def)[0]] || a.def.name.localeCompare(b.def.name));
    return cards;
  }, [run, sorted]);

  // instant speed: hear one bar, skip the show
  useEffect(() => {
    if (!scoring || speed !== "instant") return;
    playTakeLive(scoring.cards, scoring.tempo, runKey, 1, 0.02);
    finishScoring();
  }, [scoring, speed, runKey, finishScoring]);

  // round-end stings
  useEffect(() => {
    if (run.phase === "won" || run.phase === "victory") sfx("win");
    else if (run.phase === "over") sfx("lose");
  }, [run.phase]);

  const selectedDefs = selected.map((u) => R.cardOf(run, u));
  const preview = selected.length ? R.previewTake(run, selected) : null;
  const hint = preview ? nextTypeHint(preview.type.id, preview.roles) : null;
  const dimSteps = round.id === "ar" ? (s: number) => s >= 8 : undefined;
  const busy = !!scoring;

  const pick = (uid: string) => {
    if (busy) return;
    sfx(selected.includes(uid) ? "deselect" : "select");
    toggle(uid);
  };
  const audition = (uid: string) => {
    if (busy) return;
    playTakeLive([R.cardOf(run, uid)], round.tempo, runKey, 1, 0.05);
  };

  // keyboard play: 1–8 pick cards, P plays the take, R redraws
  const onKeyDown = (e: KeyboardEvent) => {
    if (busy || run.phase !== "play" || e.metaKey || e.ctrlKey || e.altKey) return;
    const n = Number(e.key);
    if (n >= 1 && n <= hand.length) {
      e.preventDefault();
      pick(hand[n - 1].uid);
    } else if (e.key === "p" || e.key === "P") {
      e.preventDefault();
      play();
    } else if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      redraw();
    }
  };
  useEffect(() => {
    keyRef.current = onKeyDown;
  });
  // The keys work whenever Beat Deck is the active window, not only when
  // something inside it has focus (the button that started a round
  // unmounts, and focus falls back to the page). Typing into a field, or
  // keys aimed at another window, are left alone.
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (useWindowStore.getState().focusedKind !== "beatdeck") return;
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable=true]")) return;
      const inside = rootRef.current?.contains(t);
      if (!inside && t !== document.body) return;
      keyRef.current(e);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  return (
    <div ref={rootRef} className="@container relative flex h-full flex-col text-[#e6eef8]">
      <Hud run={run} runKey={runKey} />
      <Rack />

      {run.phase === "shop" ? (
        <Shop onShowDeck={() => setShowDeck(true)} />
      ) : (
        <div className="dark-scroll flex min-h-0 flex-1 flex-col overflow-y-auto">
          {/* the loop */}
          <div className="flex flex-1 flex-col justify-center p-3" data-tour="loop">
            {scoring && speed !== "instant" ? (
              <TakeStage key={scoring.id} scoring={scoring} runKey={runKey} speed={speed} target={run.target} onDone={finishScoring} dimSteps={dimSteps} />
            ) : (
              <div className="flex flex-col gap-3 lg:flex-row">
                <div className="min-w-0 flex-1">
                  <LoopGrid cards={selectedDefs} playStep={-1} events={[]} dimSteps={dimSteps} />
                </div>
                <div className="flex w-full shrink-0 flex-col gap-1 rounded-[6px] border border-black/70 bg-black/35 p-3 lg:w-[260px]">
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
                      {hint && (
                        <p className="text-[11px] text-[#9fffb0]">
                          Add {hint.missing.map((r) => ROLE_LABEL[r]).join(" + ")} for {hint.type.name} ({hint.type.groove} × {hint.type.hype})
                        </p>
                      )}
                      <p className="text-[11px] text-[#7f93ad]">Hits and bonuses add up when you play it.</p>
                    </>
                  ) : (
                    <p className="text-[12px] leading-snug text-[#9fb2c9]">
                      Pick up to {max} cards to build a loop, then <b className="text-white">Play take</b>. Cover more roles for a better beat type.{" "}
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
            {/* a row that scrolls on wide screens; on phones, the whole hand at once in two rows of four */}
            <div
              className="dark-scroll flex gap-2 overflow-x-auto pt-3 pb-2 @max-md:grid @max-md:grid-cols-4 @max-md:gap-1.5 @max-md:overflow-visible"
              role="group"
              aria-label="Your hand"
              data-tour="hand"
            >
              {hand.map(({ uid, inst, def }, i) => (
                <DeckCard
                  key={uid}
                  def={def}
                  mod={inst.mod}
                  deal={i}
                  selected={selected.includes(uid)}
                  dimmed={busy || (!selected.includes(uid) && selected.length >= max)}
                  onClick={() => pick(uid)}
                  onAudition={busy ? undefined : () => audition(uid)}
                  fit
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1" data-tour="actions">
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
              <span className="ml-auto flex items-center gap-2">
                <span className="text-[10.5px] text-[#7f93ad] max-lg:hidden">Keys: 1–8 · P · R</span>
                <button
                  onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(progress.speed) + 1) % SPEEDS.length])}
                  aria-label={`Scoring speed: ${SPEED_LABEL[progress.speed]}`}
                  className="aero-btn-dark px-2.5 py-1.5 text-[12px]"
                >
                  ⏩ {SPEED_LABEL[progress.speed]}
                </button>
                <button onClick={toggleSfx} aria-pressed={progress.sfx} aria-label="Sound effects" className="aero-btn-dark px-2.5 py-1.5 text-[12px]">
                  FX {progress.sfx ? "on" : "off"}
                </button>
                <button onClick={() => go("title")} disabled={busy} className="aero-btn-dark px-2.5 py-1.5 text-[12px] disabled:opacity-40">
                  Menu
                </button>
              </span>
            </div>
          </div>
        </div>
      )}

      {!scoring && run.phase === "won" && <RoundWon />}
      {!scoring && (run.phase === "over" || run.phase === "victory") && <Summary />}
      {showDeck && <DeckViewer onClose={() => setShowDeck(false)} />}
      {tutorial !== null && run.phase === "play" && !scoring && <Tutorial step={tutorial} />}
    </div>
  );
}
