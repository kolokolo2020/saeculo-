"use client";

import { useEffect, useRef, useState } from "react";
import { CloseGlyph, PlayGlyph, StopGlyph } from "@/components/site/Icons";
import { LANE_NAMES, PROGRESSION, SOUNDS, soundById } from "./kit";
import { clonePattern, STARTER, STEPS, type Pattern, type Sequencer } from "./sequencer";
import { TAPE_SLOTS, type Tape } from "./save";

const LANE_COLORS = ["#e4b95a", "#d0694f", "#9ab8c9", "#b59be0"];
const TAPE_NAMES = ["A", "B", "C", "D"];

export default function Studio({
  seq,
  found,
  unseen,
  tapes,
  onSeen,
  onSave,
  onClose,
}: {
  seq: Sequencer;
  found: string[];
  unseen: string[];
  tapes: (Tape | null)[];
  onSeen: () => void;
  onSave: (slot: number, pattern: Pattern) => void;
  onClose: () => void;
}) {
  const [pattern, setPattern] = useState<Pattern>(() => clonePattern(seq.pattern));
  const [playing, setPlaying] = useState(seq.playing);
  const [heard, setPos] = useState({ step: -1, bar: 0 });
  const [note, setNote] = useState("");
  const grid = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [newOnOpen] = useState(unseen);

  // the sequencer plays whatever is on screen
  useEffect(() => {
    seq.setPattern(pattern);
  }, [seq, pattern]);

  useEffect(() => seq.listen(() => setPlaying(seq.playing)), [seq]);

  // playhead
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = -2;
    const loop = () => {
      const p = seq.position();
      if (p.step !== last) {
        last = p.step;
        setPos(p);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, seq]);

  // new finds get marked once, then they're just part of the kit
  useEffect(() => {
    if (unseen.length) onSeen();
  }, [unseen, onSeen]);

  useEffect(() => {
    root.current?.focus();
  }, []);

  const pos = playing ? heard : { step: -1, bar: 0 };

  const flash = (msg: string) => {
    setNote(msg);
    window.setTimeout(() => setNote((n) => (n === msg ? "" : n)), 2200);
  };

  const toggleStep = (lane: number, step: number) =>
    setPattern((p) => {
      const next = clonePattern(p);
      next.steps[lane][step] = !next.steps[lane][step];
      if (next.steps[lane][step] && !seq.playing) seq.preview(next.sounds[lane], 0);
      return next;
    });

  const setSound = (lane: number, id: string) => {
    setPattern((p) => {
      const next = clonePattern(p);
      next.sounds[lane] = id;
      return next;
    });
    seq.preview(id, pos.bar);
  };

  const play = () => (seq.playing ? seq.stop() : seq.start());

  const onKeyDown = (e: React.KeyboardEvent) => {
    const el = e.target as HTMLElement;
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key === " " && !el.closest("button, select, input")) {
      e.preventDefault();
      play();
      return;
    }
    // arrow keys walk the grid
    const lane = Number(el.dataset.lane);
    const step = Number(el.dataset.step);
    if (!Number.isFinite(lane) || !Number.isFinite(step)) return;
    const moves: Record<string, [number, number]> = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    const nl = (lane + m[0] + 4) % 4;
    const ns = (step + m[1] + STEPS) % STEPS;
    grid.current?.querySelector<HTMLButtonElement>(`[data-lane="${nl}"][data-step="${ns}"]`)?.focus();
  };

  const chord = PROGRESSION[pos.step >= 0 ? pos.bar % 4 : 0];

  return (
    <div
      ref={root}
      tabIndex={-1}
      role="dialog"
      aria-label="Sampler"
      onKeyDown={onKeyDown}
      className="deck game-fade absolute inset-0 z-30 flex flex-col overflow-y-auto outline-none"
      data-testid="studio"
    >
      <div className="mx-auto flex w-full max-w-[860px] flex-col gap-3 p-3 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-lcd text-[28px] leading-none text-[#e8e0cf]">sampler</h2>
          <div className="lcd flex items-baseline gap-3 rounded-[3px] px-3 py-1 text-[20px] leading-none" aria-live="off">
            <span>bar {pos.step >= 0 ? (pos.bar % 4) + 1 : "-"}/4</span>
            <span>{chord.name}</span>
          </div>
          <button className="ml-auto flex items-center gap-1.5 rounded-[3px] border border-[#3a3733] px-2.5 py-1.5 text-[13px] text-[#cfc6b3] hover:text-white" onClick={onClose}>
            <CloseGlyph size={11} /> Back to the room <span className="text-[#948b7a]">(Esc)</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <button className="deck-btn deck-btn-main w-[92px] gap-2" onClick={play} data-testid="studio-play" aria-label={playing ? "Stop" : "Play"}>
            <span className="flex items-center gap-2 font-lcd text-[20px]">
              {playing ? <StopGlyph size={14} /> : <PlayGlyph size={14} />}
              {playing ? "stop" : "play"}
            </span>
          </button>
          <label className="flex items-center gap-2 text-[13px] text-[#cfc6b3]">
            Tempo
            <input
              type="range"
              className="deck-range w-28"
              min={60}
              max={140}
              value={pattern.tempo}
              onChange={(e) => setPattern((p) => ({ ...clonePattern(p), tempo: Number(e.target.value) }))}
              style={{ ["--fill" as string]: `${((pattern.tempo - 60) / 80) * 100}%` }}
            />
            <span className="w-14 font-lcd text-[20px] text-amber tabular-nums">{pattern.tempo} bpm</span>
          </label>
          <label className="flex items-center gap-2 text-[13px] text-[#cfc6b3]">
            Swing
            <input
              type="range"
              className="deck-range w-20"
              min={0}
              max={0.45}
              step={0.05}
              value={pattern.swing}
              onChange={(e) => setPattern((p) => ({ ...clonePattern(p), swing: Number(e.target.value) }))}
              style={{ ["--fill" as string]: `${(pattern.swing / 0.45) * 100}%` }}
            />
          </label>
          <div className="flex gap-2 text-[12.5px]">
            <button className="rounded-[3px] border border-[#3a3733] px-2 py-1 text-[#cfc6b3] hover:text-white" onClick={() => setPattern(clonePattern({ ...STARTER, sounds: pattern.sounds }))}>
              Starter groove
            </button>
            <button
              className="rounded-[3px] border border-[#3a3733] px-2 py-1 text-[#cfc6b3] hover:text-white"
              onClick={() => setPattern((p) => ({ ...clonePattern(p), steps: p.steps.map((r) => r.map(() => false)) }))}
            >
              Clear
            </button>
          </div>
        </div>

        <div ref={grid} className="flex flex-col gap-2.5" role="group" aria-label="Pattern: four lanes of sixteen steps">
          {LANE_NAMES.map((name, lane) => {
            const options = SOUNDS.filter((s) => s.lane === lane && (!s.foundAt || found.includes(s.id)));
            const isNew = options.some((o) => newOnOpen.includes(o.id));
            return (
              <div key={name} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3" style={{ ["--lane" as string]: LANE_COLORS[lane] }}>
                <div className="flex w-full items-center gap-2 sm:w-[150px] sm:shrink-0">
                  <button
                    className="w-12 text-left font-lcd text-[20px] leading-none"
                    style={{ color: LANE_COLORS[lane] }}
                    onClick={() => seq.preview(pattern.sounds[lane], pos.bar)}
                    aria-label={`${name}: play ${soundById(pattern.sounds[lane])?.name}`}
                  >
                    {name.toLowerCase()}
                  </button>
                  <select
                    className="min-w-0 flex-1 rounded-[3px] border border-[#3a3733] bg-[#1f1d1b] px-1.5 py-1 text-[12.5px] text-[#e8e0cf]"
                    value={pattern.sounds[lane]}
                    onChange={(e) => setSound(lane, e.target.value)}
                    aria-label={`${name} sound`}
                  >
                    {options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                        {newOnOpen.includes(o.id) ? " (new)" : ""}
                      </option>
                    ))}
                  </select>
                  {isNew && <span className="h-2 w-2 shrink-0 rounded-full bg-amber" title="new sound" />}
                </div>
                <div className="grid flex-1 grid-cols-8 gap-1 sm:grid-cols-16">
                  {pattern.steps[lane].map((on, step) => (
                    <button
                      key={step}
                      className="step h-8 sm:h-9"
                      data-lane={lane}
                      data-step={step}
                      data-beat={step % 4 === 0}
                      data-now={pos.step === step}
                      aria-pressed={on}
                      aria-label={`${name} step ${step + 1}`}
                      tabIndex={lane === 0 && step === 0 ? 0 : -1}
                      onClick={() => toggleStep(lane, step)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[12.5px] text-[#9d9483]">
          Click squares to add hits. Space plays and stops; arrow keys move around the grid. Sounds you find around the neighbourhood show up in the lists.
        </p>

        <div className="mt-1 flex flex-col gap-2 border-t border-[#2e2b28] pt-3">
          <p className="text-[13px] text-[#cfc6b3]">
            Tapes <span className="text-[#948b7a]">— saved in this browser; they end up on the shelf in your room</span>
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: TAPE_SLOTS }, (_, i) => {
              const t = tapes[i];
              return (
                <div key={i} className="flex flex-col gap-1.5 rounded-[3px] border border-[#2e2b28] bg-[#1b1a18] p-2">
                  <span className="font-lcd text-[18px] leading-none text-[#e8e0cf]">
                    tape {TAPE_NAMES[i]} <span className="text-[#948b7a]">{t ? `· ${t.pattern.tempo} bpm` : "· empty"}</span>
                  </span>
                  <div className="flex gap-1.5 text-[12px]">
                    <button
                      className="flex-1 rounded-[2px] bg-[#2d2a27] px-2 py-1 text-[#e8e0cf] hover:bg-[#3a3632]"
                      onClick={() => {
                        onSave(i, clonePattern(pattern));
                        flash(`Saved to tape ${TAPE_NAMES[i]}.`);
                      }}
                    >
                      Save
                    </button>
                    <button
                      className="flex-1 rounded-[2px] bg-[#2d2a27] px-2 py-1 text-[#e8e0cf] hover:bg-[#3a3632] disabled:opacity-40"
                      disabled={!t}
                      onClick={() => {
                        if (!t) return;
                        // a tape may use a sound found in another browser session; fall back to the kit
                        const p = clonePattern(t.pattern);
                        p.sounds = p.sounds.map((id, lane) => (soundById(id)?.foundAt && !found.includes(id) ? SOUNDS.find((s) => s.lane === lane)!.id : id)) as Pattern["sounds"];
                        setPattern(p);
                        flash(`Loaded tape ${TAPE_NAMES[i]}.`);
                      }}
                    >
                      Load
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="min-h-[1.2em] text-[12.5px] text-amber" role="status">
            {note}
          </p>
        </div>
      </div>
    </div>
  );
}

