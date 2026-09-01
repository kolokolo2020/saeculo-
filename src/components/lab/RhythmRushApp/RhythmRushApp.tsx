"use client";

import { TRACKS } from "@/data/tracks";
import { LANE_KEYS, useRhythmGame } from "./useRhythmGame";

const JUDGEMENT_STYLE: Record<string, string> = {
  perfect: "text-signal",
  good: "text-bleed",
  miss: "text-mute",
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
    <div className="flex flex-col gap-3">
      <div className="font-mono flex flex-wrap items-center gap-4 text-xs text-mute">
        <span className="text-ink">score {score}</span>
        <span>combo {combo}x</span>
        <span>best {highScore}</span>
        <span className="ml-auto">{gameState === "running" ? `${timeLeft}s` : "—"}</span>
      </div>

      <div className="relative aspect-[4/3] w-full">
        <canvas ref={canvasRef} className="h-full w-full rounded-md bg-panel" aria-hidden />
        {judgement && (
          <p
            className={`font-mono pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 text-xs tracking-widest uppercase ${JUDGEMENT_STYLE[judgement]}`}
          >
            {judgement}
          </p>
        )}

        {gameState !== "running" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-md bg-void/85 p-4 text-center">
            {gameState === "ended" && (
              <p className="font-mono text-xs text-signal">
                run over — score {score}
                {score >= highScore && score > 0 ? " — new best!" : ""}
              </p>
            )}
            <label className="font-mono text-[11px] text-mute" htmlFor="rr-track">
              synced to
            </label>
            <select
              id="rr-track"
              value={trackIndex}
              onChange={(e) => setTrackIndex(Number(e.target.value))}
              className="font-mono rounded-md border border-mute/30 bg-panel px-2 py-1 text-xs text-ink"
            >
              {TRACKS.map((t, i) => (
                <option key={t.id} value={i}>
                  {t.title} — {t.bpm}bpm
                </option>
              ))}
            </select>
            <button
              onClick={start}
              className="font-mono rounded-full border border-mute/30 px-5 py-2 text-xs tracking-widest text-ink uppercase hover:border-signal hover:text-signal"
            >
              ▶ {gameState === "ended" ? "play again" : "start"}
            </button>
            <p className="font-mono max-w-[16rem] text-[11px] text-mute">
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
            className="font-mono h-10 rounded-md border border-mute/30 text-xs tracking-widest text-ink uppercase hover:border-signal hover:text-signal disabled:opacity-30"
          >
            {key.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
