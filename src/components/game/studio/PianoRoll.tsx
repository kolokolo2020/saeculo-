"use client";

import { useEffect, useRef, useState } from "react";
import { isMelodic, type Note, type Project } from "./project";
import { chordOn, degreeOf, inScale, noteName, snapToScale } from "./scales";
import { voiceById } from "./voices";
import { CAT_COLORS, chip } from "./ui";

// Two octaves of notes over the pattern. Click (and drag right) to draw a
// note, drag a note's right edge to stretch it, click a note to remove it.
// The chord tool stamps a chord from the scale on the clicked root. Out-of-
// key rows are shaded; with "in key" on, clicks snap to the scale.

const ROWS = 24;
const ROW_H = 16;

/** Where the two visible octaves start: around the notes, or a sensible register. */
function autoLowFor(notes: Note[], cat?: string) {
  if (notes.length) return Math.max(12, Math.floor((Math.min(...notes.map((n) => n.midi)) - 2) / 12) * 12);
  return cat === "808 & bass" ? 24 : 48;
}

export default function PianoRoll({
  project,
  pattern,
  channelId,
  now,
  onPick,
  onNotes,
  onAudition,
}: {
  project: Project;
  pattern: number;
  channelId: string | null;
  now: number;
  onPick: (id: string) => void;
  onNotes: (id: string, notes: Note[], coalesce?: string) => void;
  onAudition: (midi: number, dur: number) => void;
}) {
  const melodic = project.channels.filter(isMelodic);
  const ch = melodic.find((c) => c.id === channelId) ?? null;
  const notes = ch ? (project.patterns[pattern].notes[ch.id] ?? []) : [];
  const voice = ch ? voiceById(ch.voice) : null;
  const [lows, setLows] = useState<Record<string, number>>({});
  const [len, setLen] = useState(2);
  const [chord, setChord] = useState<0 | 3 | 4>(0);
  const [lock, setLock] = useState(true);
  const [cursor, setCursor] = useState({ step: 0, row: 12 });
  const [cellW, setCellW] = useState(26);
  const grid = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const drag = useRef<{ kind: "draw" | "resize"; idx: number[]; x0: number; len0: number } | null>(null);

  // bring the notes into view when switching channel or pattern
  const topNote = notes.length ? Math.max(...notes.map((n) => n.midi)) : null;
  const chId = ch?.id;
  useEffect(() => {
    const el = scroller.current;
    if (!el || !chId) return;
    const lowNow = lows[chId] ?? autoLowFor(notes, voiceById(project.channels.find((c) => c.id === chId)?.voice ?? "")?.cat);
    const row = topNote === null ? ROWS / 2 : lowNow + ROWS - 1 - topNote;
    el.scrollTop = Math.max(0, row * ROW_H - ROW_H * 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chId, pattern]);

  useEffect(() => {
    const fit = () => setCellW(window.innerWidth < 640 ? 20 : 26);
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  if (!ch) {
    return (
      <div className="flex flex-col items-start gap-2 p-2 text-[13px] text-[#b9b09e]">
        <p>The piano roll writes notes for keys, synths and 808s. Pick one:</p>
        <div className="flex flex-wrap gap-1.5">
          {melodic.map((c) => (
            <button key={c.id} className={chip} onClick={() => onPick(c.id)}>
              {voiceById(c.voice)?.name}
            </button>
          ))}
          {!melodic.length && <span className="text-[#948b7a]">No melodic channels yet: add one from Keys, Synths or 808 &amp; bass.</span>}
        </div>
      </div>
    );
  }

  const low = lows[ch.id] ?? autoLowFor(notes, voice?.cat);
  const high = low + ROWS - 1;
  const width = project.length * cellW;
  const color = voice ? CAT_COLORS[voice.cat] : "#b59be0";

  const addAt = (step: number, midiRaw: number) => {
    const midi = lock ? snapToScale(midiRaw, project.key, project.scale) : midiRaw;
    const pitches = chord ? chordOn(project.key, project.scale, degreeOf(midi, project.key, project.scale, 0), chord, 0) : [midi];
    const l = Math.min(len, project.length - step);
    const fresh = pitches.filter((m) => !notes.some((n) => n.step === step && n.midi === m)).map((m) => ({ step, midi: m, len: l, vel: 0.85 }));
    if (!fresh.length) return null;
    onNotes(ch.id, [...notes, ...fresh]);
    onAudition(pitches[0], Math.min(0.8, l * (15 / project.tempo)));
    pitches.slice(1).forEach((m) => onAudition(m, Math.min(0.8, l * (15 / project.tempo))));
    return fresh.map((_, i) => notes.length + i);
  };

  const cellFrom = (e: React.PointerEvent) => {
    const r = grid.current!.getBoundingClientRect();
    const step = Math.max(0, Math.min(project.length - 1, Math.floor((e.clientX - r.left) / cellW)));
    const row = Math.max(0, Math.min(ROWS - 1, Math.floor((e.clientY - r.top) / ROW_H)));
    return { step, midi: high - row, x: e.clientX };
  };

  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const { step, midi, x } = cellFrom(e);
    const idx = addAt(step, midi);
    if (idx) {
      drag.current = { kind: "draw", idx, x0: x, len0: Math.min(len, project.length - step) };
      grid.current?.setPointerCapture(e.pointerId);
    }
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const extra = Math.round((e.clientX - d.x0) / cellW);
    const next = notes.map((n, i) => (d.idx.includes(i) ? { ...n, len: Math.max(1, Math.min(project.length - n.step, d.len0 + extra)) } : n));
    if (next.some((n, i) => n.len !== notes[i].len)) onNotes(ch.id, next, "drag");
  };
  const onUp = () => {
    drag.current = null;
  };

  const onNoteDown = (e: React.PointerEvent, i: number) => {
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    if (e.clientX > r.right - 7) {
      drag.current = { kind: "resize", idx: [i], x0: e.clientX, len0: notes[i].len };
      grid.current?.setPointerCapture(e.pointerId);
    } else onNotes(ch.id, notes.filter((_, j) => j !== i));
  };

  const onKey = (e: React.KeyboardEvent) => {
    const mv: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const m = mv[e.key];
    if (m) {
      e.preventDefault();
      setCursor((c) => ({ step: (c.step + m[0] + project.length) % project.length, row: Math.max(0, Math.min(ROWS - 1, c.row + m[1])) }));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const midi = high - cursor.row;
      const hit = notes.findIndex((n) => n.midi === midi && cursor.step >= n.step && cursor.step < n.step + n.len);
      if (hit >= 0) onNotes(ch.id, notes.filter((_, j) => j !== hit));
      else addAt(cursor.step, midi);
    }
  };

  return (
    <div className="flex min-h-0 flex-col gap-2" data-testid="piano-roll">
      <div className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
        <select
          className="rounded-[3px] border border-[#3a3733] bg-[#1d1b19] px-1.5 py-1 text-[#e8e0cf]"
          value={ch.id}
          onChange={(e) => onPick(e.target.value)}
          aria-label="Channel to edit"
          style={{ color }}
        >
          {melodic.map((c) => (
            <option key={c.id} value={c.id}>
              {voiceById(c.voice)?.name}
            </option>
          ))}
        </select>
        <button className={chip} onClick={() => setLows({ ...lows, [ch.id]: Math.max(12, low - 12) })} aria-label="Octave down">
          oct −
        </button>
        <button className={chip} onClick={() => setLows({ ...lows, [ch.id]: Math.min(96, low + 12) })} aria-label="Octave up">
          oct +
        </button>
        <label className="flex items-center gap-1 text-[#b9b09e]">
          length
          <select className="rounded-[3px] border border-[#3a3733] bg-[#1d1b19] px-1 py-1 text-[#e8e0cf]" value={len} onChange={(e) => setLen(Number(e.target.value))}>
            {[1, 2, 4, 8, 16].map((l) => (
              <option key={l} value={l}>
                {l === 1 ? "1/16" : l === 2 ? "1/8" : l === 4 ? "1/4" : l === 8 ? "1/2" : "1 bar"}
              </option>
            ))}
          </select>
        </label>
        <button className={chip} aria-pressed={chord === 3} onClick={() => setChord(chord === 3 ? 0 : 3)}>
          chord: triad
        </button>
        <button className={chip} aria-pressed={chord === 4} onClick={() => setChord(chord === 4 ? 0 : 4)}>
          chord: 7th
        </button>
        <button className={chip} aria-pressed={lock} onClick={() => setLock(!lock)} title="Snap clicks to the project's key and scale">
          in key
        </button>
        <button className={chip} onClick={() => onNotes(ch.id, [])} disabled={!notes.length}>
          clear notes
        </button>
      </div>

      <div ref={scroller} className="flex min-h-0 overflow-auto rounded-[3px] border border-[#2e2b28] bg-[#12110f]" style={{ maxHeight: ROWS * ROW_H + 18 }}>
        {/* note names */}
        <div className="sticky left-0 z-10 shrink-0 bg-[#171615]">
          {Array.from({ length: ROWS }, (_, row) => {
            const midi = high - row;
            const isC = midi % 12 === 0;
            return (
              <button
                key={row}
                tabIndex={-1}
                className={`block w-10 border-b border-[#23211f] pr-1 text-right font-mono text-[9.5px] leading-none ${inScale(midi, project.key, project.scale) ? "text-[#cfc6b3]" : "text-[#6b6356]"} ${isC ? "font-bold" : ""}`}
                style={{ height: ROW_H }}
                onClick={() => onAudition(midi, 0.4)}
                aria-hidden
              >
                {noteName(midi)}
              </button>
            );
          })}
        </div>
        <div
          ref={grid}
          tabIndex={0}
          role="application"
          aria-label={`Piano roll for ${voice?.name}. Arrow keys move, Enter adds or removes a note. ${notes.length} notes.`}
          data-notes={notes.length}
          className="relative shrink-0 touch-none outline-none focus-visible:ring-2 focus-visible:ring-amber"
          style={{ width, height: ROWS * ROW_H }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onKeyDown={onKey}
        >
          {Array.from({ length: ROWS }, (_, row) => {
            const midi = high - row;
            return (
              <div
                key={row}
                className="absolute inset-x-0"
                style={{
                  top: row * ROW_H,
                  height: ROW_H,
                  background: inScale(midi, project.key, project.scale) ? "#1c1a18" : "#141311",
                  borderBottom: midi % 12 === 0 ? "1px solid #3a3632" : "1px solid #201e1c",
                }}
              />
            );
          })}
          {Array.from({ length: project.length }, (_, s) => (
            <div key={s} className="pointer-events-none absolute inset-y-0" style={{ left: s * cellW, width: 1, background: s % 4 === 0 ? "#3a3632" : "#24221f" }} />
          ))}
          {now >= 0 && <div className="pointer-events-none absolute inset-y-0 bg-[#f4efe4]/10" style={{ left: now * cellW, width: cellW }} />}
          <div
            className="pointer-events-none absolute border border-amber/70"
            style={{ left: cursor.step * cellW, top: cursor.row * ROW_H, width: cellW, height: ROW_H }}
          />
          {notes.map((n, i) => {
            if (n.midi < low || n.midi > high) return null;
            return (
              <div
                key={i}
                className="absolute cursor-pointer rounded-[2px] border border-black/40"
                style={{ left: n.step * cellW + 1, top: (high - n.midi) * ROW_H + 1, width: n.len * cellW - 2, height: ROW_H - 2, background: color, opacity: 0.55 + n.vel * 0.45 }}
                onPointerDown={(e) => onNoteDown(e, i)}
                title={`${noteName(n.midi)} · click to remove, drag the right edge to stretch`}
              >
                <span className="pointer-events-none absolute inset-y-0 right-0 w-[5px] bg-black/25" />
              </div>
            );
          })}
        </div>
      </div>
      {notes.some((n) => n.midi < low || n.midi > high) && <p className="text-[12px] text-[#948b7a]">Some notes are outside these two octaves: use oct − / oct +.</p>}
    </div>
  );
}
