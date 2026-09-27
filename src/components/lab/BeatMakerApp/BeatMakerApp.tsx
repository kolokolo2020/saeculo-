"use client";

import { useState } from "react";
import { LANES, PRESETS, STEP_COUNT, useStepSequencer, type Lane } from "./useStepSequencer";
import Glyph from "@/components/ui/Glyph";

const LANE_LABEL: Record<Lane, string> = { kick: "Kick", snare: "Snare", hat: "Hat", bass: "Bass" };
const LANE_COLOR: Record<Lane, [string, string]> = {
  kick: ["#ffc07a", "#d9660f"],
  snare: ["#9fd3ff", "#1f6fd1"],
  hat: ["#b8f0a7", "#25a025"],
  bass: ["#ffb3d6", "#c42a78"],
};

export default function BeatMakerApp() {
  const {
    pattern,
    toggleStep,
    bpm,
    setBpm,
    playing,
    play,
    stop,
    clear,
    loadPreset,
    randomize,
    displayStep,
    exportWav,
    exporting,
    exportFailed,
    share,
    shareStatus,
    dismissShare,
  } = useStepSequencer();
  const [preset, setPreset] = useState("");

  return (
    <div className="flex h-full flex-col">
      <div className="aero-toolbar-dark flex shrink-0 flex-wrap items-center gap-2 px-3 py-2">
        <button
          onClick={playing ? stop : play}
          aria-label={playing ? "Stop sequencer" : "Play sequencer"}
          className="aero-orb grid h-10 w-10 place-items-center text-white"
        >
          <Glyph name={playing ? "stop" : "play"} size={16} />
        </button>
        <button onClick={clear} aria-label="Clear pattern" className="aero-btn-dark px-3 py-1.5 text-[12px]">
          Clear
        </button>
        <button onClick={randomize} aria-label="Randomize pattern" className="aero-btn-dark flex items-center gap-1.5 px-3 py-1.5 text-[12px]">
          <Glyph name="shuffle" size={13} />
          Randomize
        </button>
        <label className="flex items-center gap-1.5 text-[12px] text-[#b7c7dc]">
          Preset
          <select
            value={preset}
            onChange={(e) => {
              setPreset(e.target.value);
              loadPreset(e.target.value);
            }}
            aria-label="Load preset"
            className="aero-input px-1.5 py-1 text-[12px]"
          >
            <option value="" disabled>
              Choose…
            </option>
            {Object.keys(PRESETS).map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <button onClick={share} aria-label="Copy share link" className="aero-btn-dark px-3 py-1.5 text-[12px]">
          Share link
        </button>
        <button
          onClick={() => void exportWav()}
          disabled={exporting}
          aria-label="Export loop as WAV"
          className="aero-btn-dark px-3 py-1.5 text-[12px]"
        >
          {exporting ? "Rendering…" : exportFailed ? "Export failed — retry" : "Export .wav"}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="w-16 rounded-[3px] border border-black bg-[#03070f] px-1.5 py-0.5 text-right font-mono text-[13px] text-[#7fe0ff] shadow-[inset_0_1px_3px_rgba(0,0,0,0.9)]">
            {bpm} bpm
          </span>
          <input
            type="range"
            min={60}
            max={160}
            step={1}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            aria-label="Tempo"
            className="aero-range w-28"
          />
        </div>
      </div>

      {shareStatus && (
        <div
          role="status"
          className="flex shrink-0 items-center gap-2 border-b border-black/60 bg-[linear-gradient(to_bottom,rgba(90,170,255,0.25),rgba(30,90,190,0.15))] px-3 py-1.5 text-[12px] text-[#dbeaff]"
        >
          <span className="shrink-0">
            {shareStatus.state === "copied" ? "Link copied — anyone who opens it gets this beat." : "Copy this link:"}
          </span>
          <input
            readOnly
            value={shareStatus.url}
            aria-label="Share link"
            onFocus={(e) => e.currentTarget.select()}
            className="aero-input min-w-0 flex-1 px-1.5 py-0.5 text-[11px]"
          />
          <button onClick={dismissShare} aria-label="Dismiss" className="aero-btn-dark grid h-6 w-6 place-items-center">
            <Glyph name="close" size={10} />
          </button>
        </div>
      )}

      {/* in a narrow window (phones) each lane wraps into two rows of 8 so
          the cells stay big enough to tap */}
      <div className="@container flex min-h-0 flex-1 flex-col justify-center gap-2 overflow-auto p-3">
        {LANES.map((lane) => {
          const [hi, lo] = LANE_COLOR[lane];
          return (
            <div key={lane} className="flex items-center gap-2">
              <span className="w-11 shrink-0 text-[12px] text-[#b7c7dc]">{LANE_LABEL[lane]}</span>
              <div
                className="grid flex-1 grid-cols-[repeat(16,minmax(0,1fr))] gap-1 @max-md:grid-cols-[repeat(8,minmax(0,1fr))]"
                role="group"
                aria-label={`${lane} steps`}
              >
                {pattern[lane].map((active, step) => {
                  const current = displayStep === step;
                  return (
                    <button
                      key={step}
                      onClick={() => toggleStep(lane, step)}
                      aria-pressed={active}
                      aria-label={`${lane} step ${step + 1}`}
                      className={`aspect-square rounded-[4px] border border-black transition-[filter] ${
                        step % 4 === 0 ? "" : "opacity-95"
                      } ${current ? "brightness-150" : ""}`}
                      style={{
                        background: active
                          ? `linear-gradient(to bottom, #fff 0%, ${hi} 30%, ${lo} 100%)`
                          : step % 4 === 0
                            ? "linear-gradient(to bottom, #3b4452, #1d232c)"
                            : "linear-gradient(to bottom, #2b323d, #151a21)",
                        boxShadow: active
                          ? `0 0 ${current ? 12 : 6}px ${hi}, inset 0 1px 0 rgba(255,255,255,0.5)`
                          : "inset 0 1px 0 rgba(255,255,255,0.12)",
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="flex gap-2">
          <span className="w-11 shrink-0" />
          <div className="grid flex-1 grid-cols-[repeat(16,minmax(0,1fr))] gap-1 @max-md:grid-cols-[repeat(8,minmax(0,1fr))]" aria-hidden>
            {Array.from({ length: STEP_COUNT }, (_, i) => (
              <span
                key={i}
                className={`mx-auto h-1.5 w-1.5 rounded-full ${
                  displayStep === i ? "bg-[#ff5c3c] shadow-[0_0_6px_#ff5c3c]" : i % 4 === 0 ? "bg-[#4a5566]" : "bg-[#2b323d]"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="shrink-0 border-t border-black/60 px-3 py-1.5 text-[11px] text-[#7f93ad]">
        Tap cells to build a loop — every sound is synthesized live, no samples.
      </p>
    </div>
  );
}
