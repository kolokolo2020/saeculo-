"use client";

import { useEffect, useRef, useState } from "react";
import { BARS, BPM_MAX, BPM_MIN, KEYS, LANES, LANE_INFO, PROGRESSIONS, chordAt, filterHz, progressionName, type Cell, type Lane } from "@/lib/groove";
import Glyph from "@/components/ui/Glyph";
import { PRESETS } from "./presets";
import { useGroove } from "./useGroove";
import Knob from "./Knob";
import GrooveScope from "./GrooveScope";

const SELECT = "rounded-[3px] border border-black bg-[linear-gradient(to_bottom,#1a212b,#0b1017)] px-1.5 py-1 text-[12px] text-[#dbeaff] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]";
const LONG_PRESS_MS = 420;
const BEATS = [0, 1, 2, 3];

export default function BeatMakerApp() {
  const bm = useGroove();
  const { groove, position, playing } = bm;
  const [preset, setPreset] = useState("");
  const paint = useRef<Cell | null>(null);
  const press = useRef<{ timer: ReturnType<typeof setTimeout>; fired: boolean } | null>(null);

  // a mouse drag paints until the button comes up anywhere
  useEffect(() => {
    const up = () => (paint.current = null);
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);

  const soloed = bm.solo.length > 0;
  const audible = (lane: Lane) => (soloed ? bm.solo.includes(lane) : !groove.muted.includes(lane));
  const chord = chordAt(groove.key, groove.prog, playing ? position.bar : 0);

  const cellDown = (e: React.PointerEvent, lane: Lane, step: number, cell: Cell) => {
    if (e.pointerType === "mouse") {
      if (e.button === 2) {
        bm.setCell(lane, step, cell === 2 ? 1 : 2);
        return;
      }
      if (e.button !== 0) return;
      const v: Cell = cell ? 0 : e.shiftKey ? 2 : 1;
      paint.current = v;
      bm.setCell(lane, step, v);
      return;
    }
    // touch: tap toggles, a long press accents
    const p = {
      fired: false,
      timer: setTimeout(() => {
        p.fired = true;
        bm.setCell(lane, step, cell === 2 ? 1 : 2);
        navigator.vibrate?.(12);
      }, LONG_PRESS_MS),
    };
    press.current = p;
  };
  const cellUp = (e: React.PointerEvent, lane: Lane, step: number, cell: Cell) => {
    if (e.pointerType === "mouse" || !press.current) return;
    clearTimeout(press.current.timer);
    if (!press.current.fired) bm.setCell(lane, step, cell ? 0 : 1);
    press.current = null;
  };
  const cancelPress = () => {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
  };

  return (
    <div
      className="flex h-full flex-col bg-[#0b0f15]"
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !(e.target as HTMLElement).closest("input, select, textarea")) {
          e.preventDefault();
          bm.undo();
        }
      }}
    >
      {/* transport and file actions */}
      <div className="aero-toolbar-dark flex shrink-0 flex-wrap items-center gap-2 px-3 py-2">
        <button
          onClick={playing ? bm.stop : bm.play}
          aria-label={playing ? "Stop sequencer" : "Play sequencer"}
          className="aero-orb grid h-10 w-10 place-items-center text-white"
        >
          <Glyph name={playing ? "stop" : "play"} size={16} />
        </button>
        <button onClick={bm.undo} disabled={!bm.canUndo} aria-label="Undo" title="Undo (Ctrl+Z)" className="aero-btn-dark px-2.5 py-1.5 text-[12px]">
          ↶ Undo
        </button>
        <button onClick={bm.clear} aria-label="Clear pattern" className="aero-btn-dark px-2.5 py-1.5 text-[12px]">
          Clear
        </button>
        <button onClick={bm.randomize} aria-label="Randomize pattern" className="aero-btn-dark flex items-center gap-1.5 px-2.5 py-1.5 text-[12px]">
          <Glyph name="shuffle" size={13} />
          Randomize
        </button>
        <select
          value={preset}
          onChange={(e) => {
            setPreset(e.target.value);
            bm.loadPreset(e.target.value);
          }}
          aria-label="Load preset"
          className={SELECT}
        >
          <option value="" disabled>
            Presets…
          </option>
          {Object.keys(PRESETS).map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
        <div className="ml-auto flex gap-2">
          <button onClick={bm.share} aria-label="Copy share link" className="aero-btn-dark px-2.5 py-1.5 text-[12px]">
            Share link
          </button>
          <button
            onClick={() => void bm.exportWav()}
            disabled={bm.exporting}
            aria-label="Export loop as WAV"
            className="aero-btn-dark px-2.5 py-1.5 text-[12px]"
          >
            {bm.exporting ? "Rendering…" : bm.exportFailed ? "Export failed — retry" : "Export .wav"}
          </button>
        </div>
      </div>

      {bm.shareStatus && (
        <div
          role="status"
          className="flex shrink-0 items-center gap-2 border-b border-black/60 bg-[linear-gradient(to_bottom,rgba(90,170,255,0.25),rgba(30,90,190,0.15))] px-3 py-1.5 text-[12px] text-[#dbeaff]"
        >
          <span className="shrink-0">
            {bm.shareStatus.state === "copied" ? "Link copied — anyone who opens it gets this beat." : "Copy this link:"}
          </span>
          <input
            readOnly
            value={bm.shareStatus.url}
            aria-label="Share link"
            onFocus={(e) => e.currentTarget.select()}
            className="aero-input min-w-0 flex-1 px-1.5 py-0.5 text-[11px]"
          />
          <button onClick={bm.dismissShare} aria-label="Dismiss" className="aero-btn-dark grid h-6 w-6 place-items-center">
            <Glyph name="close" size={10} />
          </button>
        </div>
      )}

      <div className="dark-scroll @container min-h-0 flex-1 overflow-y-auto">
        {/* the console: display, scope, knobs */}
        <div className="flex flex-wrap items-stretch gap-3 border-b border-black bg-[linear-gradient(to_bottom,#1b222c,#10151c)] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="flex min-w-[230px] flex-[1.3] flex-col gap-1.5 rounded-[5px] border border-black bg-[#03070f] px-2.5 py-2 font-mono text-[#7fe0ff] shadow-[inset_0_1px_4px_rgba(0,0,0,0.95),0_1px_0_rgba(255,255,255,0.08)] [text-shadow:0_0_6px_rgba(127,224,255,0.55)]">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[22px] leading-none tabular-nums">{groove.bpm} bpm</span>
              <span className="text-[11px] text-[#7fe0ff]/80 tabular-nums" role="timer" aria-label="Position">
                {playing && position.step >= 0 ? `${position.bar + 1}.${Math.floor(position.step / 4) + 1}.${(position.step % 4) + 1}` : "-.-.-"}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2 text-[11px] text-[#7fe0ff]/80">
              <span>{KEYS[groove.key].name}</span>
              <span>{groove.swing ? `swing ${groove.swing}%` : "straight"}</span>
            </div>
            {/* the four bars of the progression; the one playing is lit */}
            <ol className="grid grid-cols-4 gap-1" aria-label="Chord progression">
              {Array.from({ length: BARS }, (_, b) => {
                const lit = playing && position.bar === b;
                return (
                  <li
                    key={b}
                    aria-current={lit ? "true" : undefined}
                    className={`truncate rounded-[3px] border px-0.5 py-0.5 text-center text-[10.5px] transition-colors ${
                      lit ? "border-[#7fe0ff]/80 bg-[#7fe0ff]/20 text-white" : "border-[#7fe0ff]/15 text-[#7fe0ff]/70"
                    }`}
                  >
                    {chordAt(groove.key, groove.prog, b).name}
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="relative h-[92px] min-w-[130px] flex-1 @max-md:h-[64px] overflow-hidden rounded-[5px] border border-black bg-[#03070f] shadow-[inset_0_1px_4px_rgba(0,0,0,0.95),0_1px_0_rgba(255,255,255,0.08)]">
            <GrooveScope analyser={bm.analyser} playing={playing} />
            <span className="pointer-events-none absolute top-1 left-1.5 font-mono text-[10px] text-[#7fe0ff]/60">OUT</span>
          </div>

          <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
            <div className="flex flex-col items-center gap-1">
              <Knob label="Tempo" value={groove.bpm} min={BPM_MIN} max={BPM_MAX} onChange={(bpm) => bm.set({ bpm })} />
              <button onClick={bm.tapTempo} aria-label="Tap tempo" className="aero-btn-dark px-2 py-0.5 text-[10px]">
                TAP
              </button>
            </div>
            <Knob label="Swing" value={groove.swing} min={0} max={100} onChange={(swing) => bm.set({ swing })} format={(v) => `${v}%`} />
            <Knob
              label="Filter"
              value={groove.filter}
              min={0}
              max={100}
              onChange={(filter) => bm.set({ filter })}
              format={(v) => (v >= 100 ? "open" : filterHz(v) >= 1000 ? `${(filterHz(v) / 1000).toFixed(1)}k` : `${Math.round(filterHz(v))}`)}
            />
            <div className="flex flex-col gap-1.5 self-center">
              <label className="flex items-center justify-between gap-2 text-[10px] tracking-wide text-[#8fa3bd] uppercase">
                Key
                <select value={groove.key} onChange={(e) => bm.set({ key: Number(e.target.value) })} aria-label="Key" className={SELECT}>
                  {KEYS.map((k) => (
                    <option key={k.pc} value={k.pc}>
                      {k.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center justify-between gap-2 text-[10px] tracking-wide text-[#8fa3bd] uppercase">
                Chords
                <select value={groove.prog} onChange={(e) => bm.set({ prog: Number(e.target.value) })} aria-label="Chords" className={SELECT}>
                  {PROGRESSIONS.map((_, i) => (
                    <option key={i} value={i}>
                      {progressionName(i)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>

        {/* the grid. In a narrow window (phones) each lane wraps into two
            rows of 8 so the cells stay big enough to tap. */}
        <div className="flex flex-col gap-1.5 p-3" onContextMenu={(e) => e.preventDefault()}>
          {LANES.map((lane) => {
            const { label, hi, lo } = LANE_INFO[lane];
            return (
              <div key={lane} className={`flex items-center gap-2 transition-opacity ${audible(lane) ? "" : "opacity-40"}`}>
                <div className="flex w-[124px] shrink-0 items-center gap-1 @max-md:w-[58px] @max-md:flex-col @max-md:items-stretch">
                  <button
                    onClick={() => bm.preview(lane)}
                    aria-label={`Preview ${label}`}
                    title={`Preview ${label}`}
                    className="flex min-w-0 flex-1 items-center gap-1.5 rounded-[3px] px-1 py-0.5 text-left text-[12px] text-[#cfdcec] hover:bg-white/10"
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: hi, boxShadow: `0 0 5px ${hi}` }} />
                    <span className="truncate">{label}</span>
                  </button>
                  <div className="flex gap-0.5">
                    <button
                      onClick={() => bm.toggleMute(lane)}
                      aria-pressed={groove.muted.includes(lane)}
                      aria-label={`Mute ${label}`}
                      title="Mute"
                      className="aero-btn-dark grid h-5 w-5 place-items-center text-[9px] font-semibold aria-pressed:text-[#ff9b7a] @max-md:flex-1"
                    >
                      M
                    </button>
                    <button
                      onClick={() => bm.toggleSolo(lane)}
                      aria-pressed={bm.solo.includes(lane)}
                      aria-label={`Solo ${label}`}
                      title="Solo"
                      className="aero-btn-dark grid h-5 w-5 place-items-center text-[9px] font-semibold aria-pressed:text-[#ffe27a] @max-md:flex-1"
                    >
                      S
                    </button>
                  </div>
                </div>
                <div className="grid flex-1 grid-cols-4 gap-2 @max-md:grid-cols-2" role="group" aria-label={`${lane} steps`}>
                  {BEATS.map((beat) => (
                  <div key={beat} className="grid grid-cols-4 gap-1">
                  {groove.pattern[lane].slice(beat * 4, beat * 4 + 4).map((cell, i) => {
                    const step = beat * 4 + i;
                    const current = position.step === step;
                    return (
                      <button
                        key={step}
                        aria-pressed={cell > 0}
                        aria-label={`${lane} step ${step + 1}`}
                        data-accent={cell === 2 || undefined}
                        title={cell === 2 ? "Accent" : undefined}
                        onPointerDown={(e) => cellDown(e, lane, step, cell)}
                        onPointerUp={(e) => cellUp(e, lane, step, cell)}
                        onPointerCancel={cancelPress}
                        onPointerEnter={(e) => {
                          if (e.pointerType === "mouse" && paint.current !== null && e.buttons & 1) bm.setCell(lane, step, paint.current, true);
                        }}
                        onClick={(e) => {
                          // keyboard activation (pointer input is handled above)
                          if (e.detail === 0) bm.setCell(lane, step, cell ? 0 : 1);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "a" || e.key === "A") bm.setCell(lane, step, cell === 2 ? 1 : 2);
                        }}
                        className={`relative aspect-square touch-manipulation rounded-[4px] border border-black ${current && cell ? "bm-hit" : ""}`}
                        style={{
                          background: cell
                            ? cell === 2
                              ? `linear-gradient(to bottom, #fff 0%, ${hi} 28%, ${lo} 100%)`
                              : `linear-gradient(to bottom, ${hi} 0%, ${lo} 100%)`
                            : current
                              ? "linear-gradient(to bottom, #56647a, #2c3544)"
                              : step % 4 === 0
                                ? "linear-gradient(to bottom, #3b4452, #1d232c)"
                                : "linear-gradient(to bottom, #2b323d, #151a21)",
                          opacity: cell === 1 ? 0.82 : 1,
                          boxShadow: cell
                            ? `0 0 ${cell === 2 ? 10 : 4}px ${hi}, inset 0 1px 0 rgba(255,255,255,${cell === 2 ? 0.7 : 0.35})`
                            : "inset 0 1px 0 rgba(255,255,255,0.12)",
                        }}
                      >
                        {cell === 2 && <span className="absolute inset-x-[22%] top-[14%] h-[3px] rounded-full bg-white/90 shadow-[0_0_4px_#fff]" />}
                      </button>
                    );
                  })}
                  </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* beat ruler */}
          <div className="flex items-center gap-2" aria-hidden>
            <span className="w-[124px] shrink-0 @max-md:w-[58px]" />
            <div className="grid flex-1 grid-cols-4 gap-2 @max-md:grid-cols-2">
              {BEATS.map((beat) => (
                <div key={beat} className="grid grid-cols-4 gap-1">
                  {[0, 1, 2, 3].map((i) => {
                    const step = beat * 4 + i;
                    return (
                      <span key={i} className="flex justify-center">
                        {i === 0 ? (
                          <span className={`font-mono text-[10px] ${Math.floor(position.step / 4) === beat ? "text-[#ff8a6a]" : "text-[#5d6b80]"}`}>{beat + 1}</span>
                        ) : (
                          <span className={`mt-1 h-1 w-1 rounded-full ${position.step === step ? "bg-[#ff5c3c] shadow-[0_0_6px_#ff5c3c]" : "bg-[#2b323d]"}`} />
                        )}
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="flex shrink-0 flex-wrap justify-between gap-x-3 border-t border-black/60 px-3 py-1.5 text-[11px] text-[#7f93ad]">
        <span>
          <span className="max-md:hidden">Drag to paint · right-click or Shift-click for an accent · Ctrl+Z undo</span>
          <span className="md:hidden">Tap to add · hold for an accent</span>
        </span>
        <span className="font-mono text-[#9fd3ff]">
          {progressionName(groove.prog)} → {chord.name}
        </span>
      </p>
    </div>
  );
}
