"use client";

import LaneStage from "@/components/games/LaneStage";
import TrackPicker from "@/components/games/TrackPicker";
import { LANE_KEYS } from "@/lib/laneEngine";
import { DIFFICULTIES, rankFor, useRhythmGame, type Difficulty } from "./useRhythmGame";

export default function RhythmRushApp() {
  const game = useRhythmGame();
  const { phase, score, combo, timeLeft, best, result } = game;

  const hud = (
    <div className="font-pixel pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2.5 text-[9px] text-white [text-shadow:0_0_8px_rgba(80,170,255,0.9)]">
      <span>SCORE {score}</span>
      <span className={combo >= 10 ? "text-[#9fffb0]" : ""}>{combo > 1 ? `${combo}x COMBO` : ""}</span>
      <span>{phase === "running" ? `${timeLeft}s` : `BEST ${best}`}</span>
    </div>
  );

  return (
    <div className="flex h-full flex-col p-3">
      <LaneStage
        canvasRef={game.canvasRef}
        phase={phase}
        countdown={game.countdown}
        judgement={game.judgement}
        onLane={game.hitLane}
        top={hud}
      >
        <p className="font-pixel text-[13px] text-white [text-shadow:0_0_12px_rgba(80,170,255,0.9)]">RHYTHM RUSH</p>
        {phase === "done" && result && (
          <div className="rounded-[6px] border border-white/15 bg-white/5 px-4 py-2 text-[12px] text-[#d7e4f3]">
            <p className="text-[15px] text-white">
              Score <span className="font-semibold">{score}</span> · Rank{" "}
              <span className="font-pixel text-[14px] text-[#ffd27a]">{rankFor(result.stats)}</span>
            </p>
            <p className="mt-1 text-[#9fb2c9]">
              {result.stats.perfect} perfect · {result.stats.good} good · {result.stats.miss} miss · best combo{" "}
              {result.maxCombo}
            </p>
            {result.newBest && <p className="mt-1 font-semibold text-[#9fffb0]">New personal best!</p>}
          </div>
        )}
        <div className="flex overflow-hidden rounded-[4px] border border-black" role="group" aria-label="Difficulty">
          {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => game.chooseDifficulty(d)}
              aria-pressed={game.difficulty === d}
              className={`rounded-none! border-0! px-3.5 py-1 text-[12px] ${
                game.difficulty === d
                  ? "bg-gradient-to-b from-[#3d8ee8] to-[#0f3f86] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]"
                  : "aero-btn-dark text-[#b7c7dc]"
              }`}
            >
              {DIFFICULTIES[d].label}
            </button>
          ))}
        </div>
        <TrackPicker id="rr-track" value={game.trackIndex} onChange={game.setTrackIndex} />
        <button onClick={game.start} className="aero-btn aero-btn-primary px-6 py-1.5 text-[13px]">
          {phase === "done" ? "Play again" : "Start"}
        </button>
        <p className="max-w-[18rem] text-[11.5px] text-[#9fb2c9]">
          The beat plays, notes fall on its grid. Hit {LANE_KEYS.map((k) => k.toUpperCase()).join(" / ")} (or tap
          the pads) as they cross the line.
        </p>
      </LaneStage>
    </div>
  );
}
