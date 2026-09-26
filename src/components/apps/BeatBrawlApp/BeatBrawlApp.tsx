"use client";

import LaneStage from "@/components/games/LaneStage";
import TrackPicker from "@/components/games/TrackPicker";
import { LANE_KEYS } from "@/lib/laneEngine";
import { BOSS_MAX_HP, BOSS_NAME, PLAYER_MAX_HP, useBeatBrawl } from "./useBeatBrawl";
import { SECRET_WORDS } from "@/data/secrets";

const BRAWL_WORD = SECRET_WORDS.find((s) => s.id === "brawl")!.word;

function HealthBar({
  label,
  value,
  max,
  side,
  hit,
}: {
  label: string;
  value: number;
  max: number;
  side: "left" | "right";
  hit: boolean;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`flex flex-1 flex-col gap-1 ${side === "right" ? "items-end" : ""}`}>
      <span className="font-pixel text-[8px] text-white [text-shadow:0_0_6px_rgba(80,170,255,0.9)]">{label}</span>
      <div className={`aero-progress h-3.5 w-full ${hit ? "brightness-150" : ""}`}>
        <div
          className={`aero-progress-fill h-full transition-[width] duration-200 ${side === "right" ? "aero-progress-fill-red ml-auto" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function BeatBrawlApp() {
  const game = useBeatBrawl();
  const { phase, playerHP, bossHP, combo, taunt, speed, bossHit, playerHit, outcome, best, bpm } = game;
  // one full pendulum swing (there and back) every two beats, faster as the fight heats up
  const swingS = ((60 / bpm) * 2) / speed;

  const arenaTop = (
    <>
      {/* the boss: a metronome whose pendulum keeps the track's tempo */}
      <div
        className={`pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 transition-transform duration-100 ${
          bossHit ? "translate-y-1 scale-95" : ""
        }`}
        aria-hidden
      >
        <svg width="78" height="84" viewBox="0 0 72 78">
          <defs>
            <linearGradient id="brawl-wood" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#f0b35e" />
              <stop offset="0.5" stopColor="#c46f1c" />
              <stop offset="1" stopColor="#7a3d0c" />
            </linearGradient>
          </defs>
          <polygon points="14,74 58,74 45,10 27,10" fill="url(#brawl-wood)" stroke="#2a1507" strokeWidth="1.5" />
          <polygon points="29,18 43,18 50,66 22,66" fill="#1c0e04" opacity="0.8" />
          <g
            style={
              phase === "running"
                ? { transformOrigin: "36px 64px", animation: `brawl-tick ${swingS}s ease-in-out infinite` }
                : { transformOrigin: "36px 64px" }
            }
          >
            <line x1="36" y1="64" x2="36" y2="16" stroke="#e6ecf2" strokeWidth="2.5" strokeLinecap="round" />
            <rect x="32" y="26" width="8" height="6" rx="1.5" fill="#39a6ff" />
          </g>
          <circle cx="30" cy="44" r={bossHit ? 3.2 : 2.2} fill="#fff" />
          <circle cx="42" cy="44" r={bossHit ? 3.2 : 2.2} fill="#fff" />
          <path d={bossHit ? "M29 54q7-5 14 0" : "M29 52q7 4 14 0"} stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </svg>
      </div>

      {taunt && phase === "running" && (
        <p className="pointer-events-none absolute top-6 right-3 max-w-32 rounded-[10px] border border-[#8fa4bd] bg-white px-2.5 py-1 text-right text-[11.5px] text-[#1b2533] shadow-lg">
          {taunt}
        </p>
      )}

      {phase === "running" && (
        <p className="pointer-events-none absolute top-2 left-2.5 text-[11px] text-[#9fc3ea]">
          {combo > 1 ? `${combo}x combo` : ""}
          <br />
          <span className="text-[#7f93ad]">speed ×{speed.toFixed(2)}</span>
        </p>
      )}

      {playerHit && (
        <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_60px_rgba(217,65,47,0.75)]" aria-hidden />
      )}
    </>
  );

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <div className="flex items-end gap-4 px-0.5">
        <HealthBar label="YOU" value={playerHP} max={PLAYER_MAX_HP} side="left" hit={playerHit} />
        <span className="font-pixel pb-0.5 text-[10px] text-[#ffd27a]">VS</span>
        <HealthBar label={BOSS_NAME.toUpperCase()} value={bossHP} max={BOSS_MAX_HP} side="right" hit={bossHit} />
      </div>

      <LaneStage
        canvasRef={game.canvasRef}
        phase={phase}
        countdown={game.countdown}
        judgement={game.judgement}
        onLane={game.hitLane}
        top={arenaTop}
      >
        <p className="font-pixel text-[13px] text-white [text-shadow:0_0_12px_rgba(255,154,60,0.9)]">BEAT BRAWL</p>
        {outcome === "won" && (
          <p className="text-[14px] text-[#9fffb0]">
            {BOSS_NAME}&apos;s pendulum stops. You keep the beat — {playerHP} HP left.
          </p>
        )}
        {outcome === "won" && (
          <p className="font-pixel text-[9px] leading-relaxed text-[#ffd27a]">
            IT DROPPED A SCRAP OF PAPER: &quot;{BRAWL_WORD.toUpperCase()}&quot;
          </p>
        )}
        {outcome === "lost" && <p className="text-[14px] text-[#ff9a8a]">{BOSS_NAME} wins. The room falls silent.</p>}
        {best > 0 && <p className="text-[11.5px] text-[#9fb2c9]">Best win: {best} HP left</p>}
        <TrackPicker id="brawl-track" value={game.trackIndex} onChange={game.setTrackIndex} />
        <button onClick={game.start} className="aero-btn aero-btn-primary px-6 py-1.5 text-[13px]">
          {outcome ? "Rematch" : "Fight"}
        </button>
        <p className="max-w-[19rem] text-[11.5px] text-[#9fb2c9]">
          Land {LANE_KEYS.map((k) => k.toUpperCase()).join(" / ")} on the beat to hit {BOSS_NAME}. Every note you let
          through hits you instead — and the pendulum keeps speeding up.
        </p>
      </LaneStage>
    </div>
  );
}
