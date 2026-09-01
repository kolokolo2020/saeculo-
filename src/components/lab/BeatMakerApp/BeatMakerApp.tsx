"use client";

import { LANES, STEP_COUNT, useStepSequencer, type Lane } from "./useStepSequencer";

const LANE_LABEL: Record<Lane, string> = {
  kick: "kick",
  snare: "snare",
  hat: "hat",
  bass: "bass",
};

const LANE_COLOR: Record<Lane, string> = {
  kick: "bg-signal",
  snare: "bg-bleed",
  hat: "bg-ink",
  bass: "bg-mute",
};

export default function BeatMakerApp() {
  const { pattern, toggleStep, bpm, setBpm, playing, play, stop, clear, displayStep } =
    useStepSequencer();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={playing ? stop : play}
          aria-label={playing ? "Stop sequencer" : "Play sequencer"}
          className="font-mono h-9 w-20 rounded-full border border-mute/30 text-xs tracking-widest text-ink uppercase hover:border-signal hover:text-signal"
        >
          {playing ? "■ stop" : "▶ play"}
        </button>
        <button
          onClick={clear}
          aria-label="Clear pattern"
          className="font-mono h-9 rounded-full border border-mute/30 px-4 text-xs tracking-widest text-mute uppercase hover:border-signal hover:text-signal"
        >
          clear
        </button>
        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="bm-bpm" className="font-mono text-xs text-mute">
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
            className="signal-range w-28"
          />
        </div>
      </div>

      <div className="space-y-2">
        {LANES.map((lane) => (
          <div key={lane} className="flex items-center gap-2">
            <span className="font-mono w-10 shrink-0 text-[11px] text-mute">
              {LANE_LABEL[lane]}
            </span>
            <div
              className="grid flex-1 grid-cols-[repeat(16,minmax(0,1fr))] gap-1"
              role="group"
              aria-label={`${lane} steps`}
            >
              {pattern[lane].map((active, step) => (
                <button
                  key={step}
                  onClick={() => toggleStep(lane, step)}
                  aria-pressed={active}
                  aria-label={`${lane} step ${step + 1}`}
                  className={`aspect-square rounded-sm border transition-colors ${
                    active
                      ? `${LANE_COLOR[lane]} border-transparent`
                      : step % 4 === 0
                        ? "border-mute/25 bg-panel-2"
                        : "border-mute/10 bg-panel"
                  } ${displayStep === step ? "ring-1 ring-ink" : ""}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-1 pl-12">
        {Array.from({ length: STEP_COUNT }, (_, i) => (
          <div
            key={i}
            aria-hidden
            className={`h-0.5 rounded-full ${displayStep === i ? "bg-ink" : "bg-mute/20"}`}
          />
        ))}
      </div>

      <p className="font-mono text-center text-[11px] text-mute">
        click cells to build a beat — synced live, no samples
      </p>
    </div>
  );
}
