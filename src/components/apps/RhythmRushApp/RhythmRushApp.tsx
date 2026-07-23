"use client";

import { TRACKS } from "@/data/tracks";
import { LANE_KEYS, useRhythmGame } from "./useRhythmGame";

const JUDGEMENT_STYLE: Record<string, string> = {
  perfect: "text-[#00e5a0]",
  good: "text-[#ffe600]",
  miss: "text-[#ff2d78]",
};

export default function RhythmRushApp() {
  const {
    canvasRef,
    trackIndex,
    setTrackIndex,
    gameState,
    score,
    combo,
    timeLeft,
    judgement,
    highScore,
    start,
    hitLane,
  } = useRhythmGame();

  return (
    <div className="flex h-full flex-col gap-2 bg-[#1a1a24] p-3">
      <div className="bevel-in flex flex-wrap items-center gap-3 bg-[#0a0a14] px-3 py-2">
        <span className="font-pixel text-[9px] text-[#00e5a0]">score {score}</span>
        <span className="font-pixel text-[9px] text-[#ffe600]">combo {combo}x</span>
        <span className="font-pixel text-[9px] text-[#9aa0b0]">best {highScore}</span>
        <span className="font-pixel ml-auto text-[9px] text-[#9aa0b0]">
          {gameState === "running" ? `${timeLeft}s` : "—"}
        </span>
      </div>

      <div className="relative min-h-0 flex-1">
        <canvas ref={canvasRef} className="bevel-in h-full w-full bg-[#0a0a14]" aria-hidden />
        {judgement && (
          <p
            className={`font-pixel pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 text-xs ${JUDGEMENT_STYLE[judgement]}`}
          >
            {judgement}
          </p>
        )}

        {gameState !== "running" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 p-4 text-center">
            {gameState === "ended" && (
              <p className="font-pixel text-xs text-[#00e5a0]">
                run over — score {score}
                {score >= highScore && score > 0 ? " — new best!" : ""}
              </p>
            )}
            <label className="font-pixel text-[9px] text-white" htmlFor="rr-track">
              synced to
            </label>
            <select
              id="rr-track"
              value={trackIndex}
              onChange={(e) => setTrackIndex(Number(e.target.value))}
              className="bevel-in font-body bg-white px-2 py-1 text-base text-black"
            >
              {TRACKS.map((t, i) => (
                <option key={t.id} value={i}>
                  {t.title} — {t.bpm}bpm
                </option>
              ))}
            </select>
            <button
              onClick={start}
              className="bevel-out bg-chrome font-pixel px-4 py-2 text-[10px] text-black active:translate-y-px"
            >
              ▶ {gameState === "ended" ? "play again" : "start"}
            </button>
            <p className="font-pixel max-w-[16rem] text-[8px] text-[#9aa0b0]">
              hit {LANE_KEYS.map((k) => k.toUpperCase()).join(" / ")} as the bars cross the line
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {LANE_KEYS.map((key, i) => (
          <button
            key={key}
            onClick={() => hitLane(i)}
            disabled={gameState !== "running"}
            aria-label={`Hit lane ${key.toUpperCase()}`}
            className="bevel-out bg-chrome font-pixel h-9 text-[10px] text-black active:translate-y-px disabled:opacity-40"
          >
            {key.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
