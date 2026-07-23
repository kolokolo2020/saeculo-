"use client";

import { LANES, STEP_COUNT, useStepSequencer, type Lane } from "./useStepSequencer";

const LANE_LABEL: Record<Lane, string> = {
  kick: "kick",
  snare: "snare",
  hat: "hat",
  bass: "bass",
};

const LANE_COLOR: Record<Lane, string> = {
  kick: "bg-[#ff2d78]",
  snare: "bg-[#ffe600]",
  hat: "bg-[#00e5a0]",
  bass: "bg-[#00b4ff]",
};

export default function BeatMakerApp() {
  const { pattern, toggleStep, bpm, setBpm, playing, play, stop, clear, displayStep } =
    useStepSequencer();

  return (
    <div className="flex h-full flex-col gap-3 bg-[#1a1a24] p-3">
      <div className="bevel-in flex items-center gap-3 bg-[#0a0a14] px-3 py-2">
        <button
          onClick={playing ? stop : play}
          aria-label={playing ? "Stop sequencer" : "Play sequencer"}
          className="bevel-out bg-chrome font-pixel h-8 w-16 text-[9px] text-black active:translate-y-px"
        >
          {playing ? "■ stop" : "▶ play"}
        </button>
        <button
          onClick={clear}
          aria-label="Clear pattern"
          className="bevel-out bg-chrome font-pixel h-8 px-2 text-[9px] text-black active:translate-y-px"
        >
          clear
        </button>
        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="bm-bpm" className="font-pixel text-[9px] text-[#00e5a0]">
            {bpm} bpm
          </label>
          <input
            id="bm-bpm"
            type="range"
            min={60}
            max={160}
            step={1}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            aria-label="Tempo"
            className="retro-range w-28"
          />
        </div>
      </div>

      <div className="font-body min-h-0 flex-1 space-y-2 overflow-auto">
        {LANES.map((lane) => (
          <div key={lane} className="flex items-center gap-2">
            <span className="font-pixel w-11 shrink-0 text-[8px] text-[#9aa0b0]">
              {LANE_LABEL[lane]}
            </span>
            <div className="grid flex-1 grid-cols-[repeat(16,minmax(0,1fr))] gap-1" role="group" aria-label={`${lane} steps`}>
              {pattern[lane].map((active, step) => (
                <button
                  key={step}
                  onClick={() => toggleStep(lane, step)}
                  aria-pressed={active}
                  aria-label={`${lane} step ${step + 1}`}
                  className={`aspect-square rounded-[2px] border transition-colors ${
                    active
                      ? `${LANE_COLOR[lane]} border-black/30`
                      : step % 4 === 0
                        ? "border-[#333] bg-[#14141c]"
                        : "border-[#242430] bg-[#0e0e16]"
                  } ${displayStep === step ? "ring-2 ring-white" : ""}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-1 pl-[3.25rem]">
        {Array.from({ length: STEP_COUNT }, (_, i) => (
          <div
            key={i}
            aria-hidden
            className={`h-1 rounded-full ${displayStep === i ? "bg-white" : "bg-[#2a2a36]"}`}
          />
        ))}
      </div>

      <p className="font-pixel text-center text-[8px] text-[#555]">
        click cells to build a beat — synced live, no samples
      </p>
    </div>
  );
}
