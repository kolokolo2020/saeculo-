"use client";

import { useEffect, useRef, useState } from "react";
import type { Scoring } from "./deckStore";
import type { RunKey } from "./deckAudio";
import { playTakeLive } from "./sound";
import LoopGrid from "./LoopGrid";
import { fmt } from "./look";

const OUTRO_S = 1.1;

// Plays a scored take: two bars of the actual loop. Bar one sweeps the
// playhead and pops each step's groove; bar two reveals the bonuses; then
// the total lands. Everything is clocked off the AudioContext so the pops
// hit with the sound. Mounted fresh (keyed) for every take.
export default function TakeStage({
  scoring,
  runKey,
  reducedMotion,
  onDone,
  dimSteps,
}: {
  scoring: Scoring;
  runKey: RunKey;
  reducedMotion: boolean;
  onDone: () => void;
  dimSteps?: (step: number) => boolean;
}) {
  const { result } = scoring;
  const [step, setStep] = useState(-1);
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const { ctx, start, stepDur, end } = playTakeLive(scoring.cards, scoring.tempo, runKey, 2);
    if (reducedMotion) {
      const t = setTimeout(() => setStep(40), 400);
      const d = setTimeout(() => doneRef.current(), 1600);
      return () => {
        clearTimeout(t);
        clearTimeout(d);
      };
    }
    let raf = 0;
    let last = -2;
    const tick = () => {
      const now = ctx.currentTime;
      if (now > end + OUTRO_S) {
        doneRef.current();
        return;
      }
      const s = now < start ? -1 : Math.min(40, Math.floor((now - start) / stepDur));
      if (s !== last) {
        last = s;
        setStep(s);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scoring, runKey, reducedMotion]);

  // ---- what's revealed at this step
  const events = step < 0 ? [] : result.steps.filter((e) => e.step <= Math.min(step, 15));
  const n = result.bonuses.length;
  const shownBonuses = step < 16 ? 0 : step >= 32 ? n : Math.min(n, Math.floor(((step - 16) / 16) * (n + 1)));
  let groove = result.baseGroove + events.reduce((s, e) => s + e.groove, 0);
  let hype = result.baseHype;
  for (const b of result.bonuses.slice(0, shownBonuses)) {
    groove += b.groove ?? 0;
    hype += b.hype ?? 0;
  }
  for (const b of result.bonuses.slice(0, shownBonuses)) if (b.mult) hype *= b.mult;
  const final = step >= 32;
  if (final) {
    groove = result.groove;
    hype = result.hype;
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      <div className="min-w-0 flex-1">
        <LoopGrid cards={scoring.cards} playStep={step >= 0 && step < 32 ? step % 16 : -1} events={step < 16 ? events : []} dimSteps={dimSteps} />
      </div>
      <div className="flex w-full shrink-0 flex-col gap-1.5 rounded-[6px] border border-black/70 bg-black/35 p-3 lg:w-[250px]" aria-live="polite">
        <p className="font-pixel text-[10px] text-[#ffd27a]">
          {result.type.name.toUpperCase()}
          {result.level > 0 && <span className="text-[#9fb2c9]"> LV{result.level + 1}</span>}
        </p>
        <p className="flex items-center gap-2 font-mono">
          <span className="rounded-[4px] bg-[#1f6fd1] px-2 py-1 text-[18px] text-white" aria-label="Groove">
            {fmt(groove)}
          </span>
          <span className="text-[#9fb2c9]">×</span>
          <span className="rounded-[4px] bg-[#c42a78] px-2 py-1 text-[18px] text-white" aria-label="Hype">
            {Number.isInteger(hype) ? hype : hype.toFixed(1)}
          </span>
        </p>
        <ul className="flex min-h-[3.5rem] flex-col gap-0.5 text-[11.5px]">
          {result.bonuses.slice(0, shownBonuses).map((b, i) => (
            <li key={i} className="flex justify-between gap-2 text-[#c9d6e6] animate-[deck-pop_0.35s_ease-out]">
              <span className="truncate">{b.label}</span>
              <span className={b.mult && b.mult < 1 ? "text-[#ff9a8a]" : "text-[#9fffb0]"}>
                {b.mult ? `×${b.mult}` : [b.groove ? `+${b.groove} groove` : "", b.hype ? `+${b.hype} hype` : ""].filter(Boolean).join(" ")}
              </span>
            </li>
          ))}
        </ul>
        {final && (
          <p className="animate-[deck-slam_0.35s_ease-out] text-center">
            {result.voided ? (
              <span className="text-[12px] text-[#ff9a8a]">{result.voided}</span>
            ) : (
              <span className="font-mono text-[26px] font-bold text-white [text-shadow:0_0_14px_rgba(80,170,255,0.9)]" aria-label="Take score">
                {fmt(result.score)}
              </span>
            )}
          </p>
        )}
        <button onClick={() => doneRef.current()} className="aero-btn-dark mt-auto self-end px-2.5 py-1 text-[11px]">
          Skip ›
        </button>
      </div>
    </div>
  );
}
