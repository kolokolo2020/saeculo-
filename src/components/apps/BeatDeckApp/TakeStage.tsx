"use client";

import { useEffect, useRef, useState } from "react";
import type { Scoring } from "./deckStore";
import type { RunKey } from "./deckAudio";
import type { Speed } from "./progress";
import { playTakeLive } from "./sound";
import { sfx } from "./sfx";
import LoopGrid from "./LoopGrid";
import { fmt } from "./look";

/** A take worth this share of the round's target gets the big treatment. */
const BIG_SHARE = 0.5;

const SPARKS = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2;
  const r = 70 + (i % 3) * 28;
  return { dx: Math.round(Math.cos(a) * r), dy: Math.round(Math.sin(a) * r), hue: [195, 45, 320][i % 3] };
});

// Plays a scored take and reveals its score in time with the music: the
// beat type flashes up, bar one sweeps the playhead and pops each step's
// groove, then the bonuses land (on bar two at normal speed, quickly at
// fast), then the total. Clocked off the AudioContext, so pops hit with the
// sound. Mounted fresh (keyed) for every take.
export default function TakeStage({
  scoring,
  runKey,
  speed,
  target,
  onDone,
  dimSteps,
}: {
  scoring: Scoring;
  runKey: RunKey;
  speed: Exclude<Speed, "instant">;
  target: number;
  onDone: () => void;
  dimSteps?: (step: number) => boolean;
}) {
  const { result } = scoring;
  const bars = speed === "normal" ? 2 : 1;
  // time since the loop started, in 1/40 s ticks (-1 = before)
  const [t, setT] = useState(-1);
  const [timing, setTiming] = useState<{ stepDur: number } | null>(null);
  const doneRef = useRef(onDone);
  const big = !result.voided && result.score >= target * BIG_SHARE;

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    sfx("play");
    const { ctx, start, stepDur, end } = playTakeLive(scoring.cards, scoring.tempo, runKey, bars);
    const bonusEnd = bars === 2 ? end : end + 0.7;
    const finish = bonusEnd + (big ? 1.5 : 1.0);
    let raf = 0;
    let last = -2;
    let landed = false;
    const tick = () => {
      const now = ctx.currentTime;
      if (now > finish) {
        doneRef.current();
        return;
      }
      const q = now < start ? -1 : Math.floor((now - start) * 40) / 40;
      if (q !== last) {
        last = q;
        setTiming((prev) => prev ?? { stepDur });
        setT(q);
      }
      if (!landed && now >= bonusEnd) {
        landed = true;
        if (big) sfx("big");
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scoring, runKey, bars, big]);

  // ---- what's revealed by now
  const stepDur = timing?.stepDur ?? 1;
  const barLen = stepDur * 16;
  const bonusStart = barLen;
  const bonusLen = bars === 2 ? barLen : 0.7;
  const step = t < 0 ? -1 : Math.floor(t / stepDur);
  const events = step < 0 ? [] : result.steps.filter((e) => e.step <= Math.min(step, 15));
  const n = result.bonuses.length;
  const shownBonuses = t < bonusStart ? 0 : t >= bonusStart + bonusLen ? n : Math.min(n, Math.floor(((t - bonusStart) / bonusLen) * (n + 1)));
  let groove = result.baseGroove + events.reduce((s, e) => s + e.groove, 0);
  let hype = result.baseHype;
  for (const b of result.bonuses.slice(0, shownBonuses)) {
    groove += b.groove ?? 0;
    hype += b.hype ?? 0;
  }
  for (const b of result.bonuses.slice(0, shownBonuses)) if (b.mult) hype *= b.mult;
  const final = t >= bonusStart + bonusLen;
  if (final) {
    groove = result.groove;
    hype = result.hype;
  }
  const playStep = step >= 0 && t < bars * barLen ? step % 16 : -1;

  return (
    <div className={`relative flex flex-col gap-3 lg:flex-row ${final && big ? "animate-[deck-shake_0.45s_ease-out] motion-reduce:animate-none" : ""}`}>
      {/* the beat type, flashed up as the take starts */}
      <p
        key={result.type.id}
        className="pointer-events-none absolute top-1/3 left-1/2 z-10 -translate-x-1/2 animate-[deck-banner_1.3s_ease-out_forwards] font-pixel text-[26px] whitespace-nowrap text-white opacity-0 [text-shadow:0_0_18px_rgba(80,170,255,1),0_3px_0_#0b2a5b] motion-reduce:hidden max-sm:text-[18px]"
        aria-hidden
      >
        {result.type.name.toUpperCase()}
      </p>
      {final && big && (
        <>
          <span className="pointer-events-none absolute inset-0 z-10 animate-[deck-flash_0.6s_ease-out_forwards] rounded-[6px] bg-white motion-reduce:hidden" aria-hidden />
          <span className="pointer-events-none absolute top-1/2 left-1/2 z-10 motion-reduce:hidden" aria-hidden>
            {SPARKS.map((p, i) => (
              <span
                key={i}
                className="absolute h-2 w-2 animate-[deck-spark_0.9s_ease-out_forwards] rounded-full"
                style={{ background: `hsl(${p.hue} 100% 70%)`, boxShadow: `0 0 8px hsl(${p.hue} 100% 60%)`, ["--dx" as string]: `${p.dx}px`, ["--dy" as string]: `${p.dy}px` }}
              />
            ))}
          </span>
        </>
      )}

      <div className="min-w-0 flex-1">
        <LoopGrid cards={scoring.cards} playStep={playStep} events={step < 16 ? events : []} dimSteps={dimSteps} />
      </div>
      <div className="flex w-full shrink-0 flex-col gap-1.5 rounded-[6px] border border-black/70 bg-black/35 p-3 lg:w-[260px]" aria-live="polite">
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
            <li key={i} className="flex animate-[deck-pop_0.35s_ease-out] justify-between gap-2 text-[#c9d6e6]">
              <span className="truncate">{b.label}</span>
              <span className={b.mult && b.mult < 1 ? "text-[#ff9a8a]" : b.money ? "text-[#ffd27a]" : "text-[#9fffb0]"}>
                {b.mult
                  ? `×${b.mult}`
                  : [b.groove ? `+${b.groove} groove` : "", b.hype ? `+${b.hype} hype` : "", b.money ? `+$${b.money}` : ""].filter(Boolean).join(" ")}
              </span>
            </li>
          ))}
        </ul>
        {final && (
          <p className="animate-[deck-slam_0.35s_ease-out] text-center">
            {result.voided ? (
              <span className="text-[12px] text-[#ff9a8a]">{result.voided}</span>
            ) : (
              <>
                <span
                  className={`font-mono font-bold text-white ${big ? "text-[32px] [text-shadow:0_0_20px_rgba(255,210,122,1)]" : "text-[26px] [text-shadow:0_0_14px_rgba(80,170,255,0.9)]"}`}
                  aria-label="Take score"
                >
                  {fmt(result.score)}
                </span>
                {big && <span className="block font-pixel text-[10px] text-[#ffd27a]">HUGE TAKE!</span>}
              </>
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
