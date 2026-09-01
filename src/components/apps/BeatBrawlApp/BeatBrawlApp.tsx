"use client";

import { TRACKS } from "@/data/tracks";
import { LANE_KEYS, useBeatBrawl } from "./useBeatBrawl";

const JUDGEMENT_STYLE: Record<string, string> = {
  perfect: "text-signal",
  good: "text-bleed",
  miss: "text-mute",
};

function HealthBar({
  value,
  max,
  align,
  hit,
}: {
  value: number;
  max: number;
  align: "left" | "right";
  hit: boolean;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="deck-panel-recessed h-3 flex-1 overflow-hidden">
      <div
        className={`h-full transition-[width] duration-150 ${hit ? "bg-ink" : "bg-signal"} ${
          align === "right" ? "ml-auto" : ""
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function BeatBrawlApp() {
  const {
    canvasRef,
    trackIndex,
    setTrackIndex,
    brawlState,
    bossName,
    playerHP,
    bossHP,
    playerMaxHP,
    bossMaxHP,
    combo,
    judgement,
    taunt,
    tempoMult,
    bossHit,
    playerHit,
    start,
    hitLane,
  } = useBeatBrawl();

  const tickDuration = 1 / tempoMult;

  return (
    <div className="flex flex-col gap-3">
      {/* health bars */}
      <div className="flex items-center gap-3">
        <span className="font-pixel text-[8px] text-ink">YOU</span>
        <HealthBar value={playerHP} max={playerMaxHP} align="left" hit={playerHit} />
        <HealthBar value={bossHP} max={bossMaxHP} align="right" hit={bossHit} />
        <span className="font-pixel text-[8px] text-signal">{bossName.toUpperCase()}</span>
      </div>

      <div className="font-mono flex flex-wrap items-center gap-4 text-xs text-mute">
        <span className="text-ink">combo {combo}x</span>
        <span className="ml-auto">tempo x{tempoMult.toFixed(2)}</span>
      </div>

      {/* boss + arena */}
      <div className="relative aspect-[4/3] w-full">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full rounded-md bg-panel" aria-hidden />

        {/* boss sprite: a metronome with a swinging pendulum tied to tempo */}
        <div
          className={`pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 transition-transform ${
            bossHit ? "scale-95" : "scale-100"
          }`}
          aria-hidden
        >
          <svg width="72" height="76" viewBox="0 0 72 76">
            <polygon points="16,70 56,70 44,14 28,14" fill="var(--color-panel-2)" stroke="var(--color-signal)" strokeWidth="2" />
            <g style={{ transformOrigin: "36px 18px", animation: `brawl-tick ${tickDuration}s ease-in-out infinite` }}>
              <line x1="36" y1="18" x2="36" y2="66" stroke="var(--color-bleed)" strokeWidth="3" strokeLinecap="round" />
              <circle cx="36" cy="60" r="5" fill="var(--color-bleed)" />
            </g>
            <circle cx="30" cy="34" r={bossHit ? 3 : 2} fill="var(--color-void)" />
            <circle cx="42" cy="34" r={bossHit ? 3 : 2} fill="var(--color-void)" />
          </svg>
        </div>

        {taunt && (
          <p className="font-pixel pointer-events-none absolute top-4 right-3 max-w-28 rounded-sm bg-ink px-2 py-1 text-right text-[8px] leading-relaxed text-void">
            {taunt}
          </p>
        )}

        {judgement && (
          <p
            className={`font-mono pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 text-xs tracking-widest uppercase ${JUDGEMENT_STYLE[judgement]}`}
          >
            {judgement}
          </p>
        )}

        {brawlState !== "running" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-md bg-void/85 p-4 text-center">
            {brawlState === "won" && (
              <p className="font-pixel text-[10px] text-signal">
                {bossName}&apos;s pendulum stops.
                <br />
                you keep the beat.
              </p>
            )}
            {brawlState === "lost" && (
              <p className="font-pixel text-[10px] text-mute">
                {bossName} wins.
                <br />
                the room falls silent.
              </p>
            )}
            <label className="font-mono text-[11px] text-mute" htmlFor="brawl-track">
              synced to
            </label>
            <select
              id="brawl-track"
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
              className="deck-button font-pixel px-5 py-2 text-[9px] tracking-widest uppercase"
            >
              {brawlState === "idle" ? "fight" : "rematch"}
            </button>
            <p className="font-mono max-w-[16rem] text-[11px] text-mute">
              hit {LANE_KEYS.map((k) => k.toUpperCase()).join(" / ")} on the beat to land hits — miss
              and {bossName} gets a free one. the pendulum speeds up over time.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {LANE_KEYS.map((key, i) => (
          <button
            key={key}
            onClick={() => hitLane(i)}
            disabled={brawlState !== "running"}
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
