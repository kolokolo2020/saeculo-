"use client";

import { isMelodic, stepsOf, type Channel, type Project } from "./project";
import { voiceById } from "./voices";
import { CAT_COLORS, Slider } from "./ui";

// The channel rack: one row per sound. Drum rows have a step grid; melodic
// rows show their notes and open the piano roll.

function MiniNotes({ project, pattern, ch, now }: { project: Project; pattern: number; ch: Channel; now: number }) {
  const notes = project.patterns[pattern].notes[ch.id] ?? [];
  const lo = Math.min(...notes.map((n) => n.midi), 60);
  const hi = Math.max(...notes.map((n) => n.midi), lo + 12);
  const span = hi - lo + 1;
  return (
    <div className="relative h-9 w-full rounded-[2px] bg-[#1a1816]" aria-hidden>
      {Array.from({ length: project.length / 4 }, (_, i) => (
        <span key={i} className="absolute inset-y-0 w-px bg-[#2c2926]" style={{ left: `${(i * 4 * 100) / project.length}%` }} />
      ))}
      {notes.map((n, i) => (
        <span
          key={i}
          className="absolute h-[3px] rounded-[1px]"
          style={{
            left: `${(n.step * 100) / project.length}%`,
            width: `${(Math.max(0.6, n.len) * 100) / project.length}%`,
            top: `${((hi - n.midi) / span) * 30 + 2}px`,
            background: "var(--lane)",
          }}
        />
      ))}
      {now >= 0 && <span className="absolute inset-y-0 w-[2px] bg-[#f4efe4]/70" style={{ left: `${(now * 100) / project.length}%` }} />}
    </div>
  );
}

export default function Rack({
  project,
  pattern,
  selected,
  now,
  onSelect,
  onStep,
  onChannel,
  onRemove,
  onMove,
  onOpenRoll,
}: {
  project: Project;
  pattern: number;
  selected: string | null;
  now: number;
  onSelect: (id: string) => void;
  onStep: (id: string, step: number, soft: boolean) => void;
  onChannel: (id: string, partial: Partial<Channel>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onOpenRoll: (id: string) => void;
}) {
  const pat = project.patterns[pattern];

  // arrow keys walk the step grid
  const onKeyDown = (e: React.KeyboardEvent) => {
    const el = e.target as HTMLElement;
    const row = Number(el.dataset.row);
    const step = Number(el.dataset.step);
    if (!Number.isFinite(row) || !Number.isFinite(step)) return;
    const mv: Record<string, [number, number]> = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
    const m = mv[e.key];
    if (!m) return;
    e.preventDefault();
    const rows = [...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>("[data-row][data-step]")];
    const nr = row + m[0];
    const ns = (step + m[1] + project.length) % project.length;
    rows.find((b) => Number(b.dataset.row) === nr && Number(b.dataset.step) === ns)?.focus();
  };

  if (!project.channels.length) {
    return <p className="rounded-[3px] border border-dashed border-[#3a3733] p-4 text-center text-[13px] text-[#b9b09e]">No channels yet. Add sounds from the browser with “+”.</p>;
  }

  return (
    <div className="flex flex-col gap-1.5" onKeyDown={onKeyDown} role="group" aria-label="Channel rack" data-testid="studio-rack">
      {project.channels.map((ch, row) => {
        const v = voiceById(ch.voice);
        const color = v ? CAT_COLORS[v.cat] : "#cfc6b3";
        const melodic = isMelodic(ch);
        const steps = stepsOf(pat, ch.id, project.length);
        const isSel = selected === ch.id;
        const moveButtons = (where: string) => (
            <div className={`shrink-0 items-center gap-0.5 ${where}`}>
              <button className="h-6 w-6 rounded-[2px] text-[12px] text-[#b9b09e] hover:bg-[#2a2724] disabled:opacity-30" disabled={row === 0} onClick={() => onMove(ch.id, -1)} aria-label={`Move ${v?.name} up`}>
                ↑
              </button>
              <button
                className="h-6 w-6 rounded-[2px] text-[12px] text-[#b9b09e] hover:bg-[#2a2724] disabled:opacity-30"
                disabled={row === project.channels.length - 1}
                onClick={() => onMove(ch.id, 1)}
                aria-label={`Move ${v?.name} down`}
              >
                ↓
              </button>
              <button className="h-6 w-6 rounded-[2px] text-[13px] text-[#b9b09e] hover:bg-[#6e1f18] hover:text-white" onClick={() => onRemove(ch.id)} aria-label={`Remove ${v?.name}`}>
                ×
              </button>
            </div>
        );
        return (
          <div
            key={ch.id}
            className={`flex flex-col gap-1.5 rounded-[3px] border px-1.5 py-1.5 md:flex-row md:items-center ${isSel ? "border-[#6d6558] bg-[#1f1d1b]" : "border-transparent"}`}
            style={{ ["--lane" as string]: color }}
            data-testid={`channel-${row}`}
          >
            <div className="flex shrink-0 items-center gap-1 md:w-[250px]">
              <button
                className="h-6 w-6 rounded-[2px] text-[11px] font-bold text-[#b9b09e] aria-pressed:bg-[#b3261e] aria-pressed:text-white"
                aria-pressed={ch.mute}
                aria-label={`Mute ${v?.name}`}
                onClick={() => onChannel(ch.id, { mute: !ch.mute })}
              >
                M
              </button>
              <button
                className="h-6 w-6 rounded-[2px] text-[11px] font-bold text-[#b9b09e] aria-pressed:bg-amber aria-pressed:text-ink"
                aria-pressed={ch.solo}
                aria-label={`Solo ${v?.name}`}
                onClick={() => onChannel(ch.id, { solo: !ch.solo })}
              >
                S
              </button>
              <button
                className="min-w-0 flex-1 truncate rounded-[2px] px-1.5 py-1 text-left text-[13px] hover:bg-[#2a2724]"
                style={{ color }}
                aria-pressed={isSel}
                onClick={() => (melodic ? onOpenRoll(ch.id) : onSelect(ch.id))}
                title={melodic ? "Edit notes in the piano roll" : "Select"}
              >
                {v?.name ?? ch.voice}
                {melodic && <span className="ml-1 text-[10px] text-[#948b7a]">notes</span>}
              </button>
              <Slider label={`${v?.name} volume`} hideLabel value={ch.vol} onChange={(vol) => onChannel(ch.id, { vol })} className="w-16" />
              {moveButtons("flex md:hidden")}
            </div>

            <div className="min-w-0 flex-1 overflow-x-auto">
              {melodic ? (
                <button className="block w-full min-w-[280px]" onClick={() => onOpenRoll(ch.id)} aria-label={`${v?.name}: open the piano roll`}>
                  <MiniNotes project={project} pattern={pattern} ch={ch} now={now} />
                </button>
              ) : (
                <div className="grid min-w-[440px] gap-[3px]" style={{ gridTemplateColumns: `repeat(${project.length}, minmax(0, 1fr))` }}>
                  {steps.map((vel, step) => (
                    <button
                      key={step}
                      className="step h-8"
                      data-row={row}
                      data-step={step}
                      data-beat={step % 4 === 0}
                      data-now={now === step}
                      aria-pressed={vel > 0}
                      aria-label={`${v?.name} step ${step + 1}${vel > 0 && vel < 1 ? ", soft" : ""}`}
                      tabIndex={row === 0 && step === 0 ? 0 : -1}
                      style={vel > 0 && vel < 1 ? { opacity: 0.55 } : undefined}
                      onClick={(e) => onStep(ch.id, step, e.shiftKey || e.altKey)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        onStep(ch.id, step, true);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {moveButtons("hidden md:flex")}
          </div>
        );
      })}
    </div>
  );
}
