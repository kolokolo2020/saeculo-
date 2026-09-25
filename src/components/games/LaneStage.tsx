"use client";

import { LANE_COLORS, LANE_KEYS, type Judgement } from "@/lib/laneEngine";
import type { LanePhase } from "./useLaneGame";

const JUDGEMENT_STYLE: Record<Judgement, string> = {
  perfect: "text-[#9fffb0] [text-shadow:0_0_12px_rgba(95,211,95,0.9)]",
  good: "text-[#9fe0ff] [text-shadow:0_0_12px_rgba(57,166,255,0.9)]",
  miss: "text-[#ff9a8a] [text-shadow:0_0_10px_rgba(217,65,47,0.8)]",
};

// Canvas playfield + count-in + judgement callout + tappable lane pads,
// shared by every lane game. `children` is the menu/result overlay shown
// whenever a run isn't in progress.
export default function LaneStage({
  canvasRef,
  phase,
  countdown,
  judgement,
  onLane,
  children,
  top,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  phase: LanePhase;
  countdown: string | null;
  judgement: Judgement | null;
  onLane: (lane: number) => void;
  children: React.ReactNode;
  top?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="relative min-h-[220px] flex-1 overflow-hidden rounded-[4px] border border-black shadow-[0_0_0_1px_rgba(255,255,255,0.12)]">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full bg-[#050c1a]" aria-hidden />
        {top}

        {phase === "running" && countdown && (
          <p
            key={countdown}
            className="aero-open font-pixel pointer-events-none absolute inset-x-0 top-1/3 text-center text-3xl text-white [text-shadow:0_0_18px_rgba(120,200,255,0.95)]"
          >
            {countdown}
          </p>
        )}
        {phase === "running" && judgement && (
          <p
            className={`font-pixel pointer-events-none absolute inset-x-0 bottom-16 text-center text-[11px] tracking-widest uppercase ${JUDGEMENT_STYLE[judgement]}`}
          >
            {judgement}
          </p>
        )}

        {phase === "loading" && (
          <div className="absolute inset-0 grid place-items-center bg-black/60">
            <span className="flex items-center gap-2 text-[13px] text-white">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-[#9fe0ff]" aria-hidden />
              Loading track…
            </span>
          </div>
        )}
        {(phase === "idle" || phase === "done") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[rgba(3,8,18,0.82)] p-4 text-center">
            {children}
          </div>
        )}
      </div>

      <div className="grid shrink-0 grid-cols-4 gap-2">
        {LANE_KEYS.map((key, i) => (
          <button
            key={key}
            onPointerDown={(e) => {
              e.preventDefault();
              onLane(i);
            }}
            disabled={phase !== "running"}
            aria-label={`Hit lane ${key.toUpperCase()}`}
            className="aero-btn-dark h-11 text-[13px] font-semibold tracking-widest uppercase"
            style={{ borderBottom: `3px solid ${LANE_COLORS[i]}` }}
          >
            {key.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
