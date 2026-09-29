"use client";

import { PATTERN_NAMES, type Project } from "./project";
import { chip } from "./ui";

// The arrangement: sixteen slots, each playing one of the four patterns
// (or nothing). Click a slot to cycle it; song mode plays them in order
// and loops.

export default function Song({ project, slot, onSong, onMode }: { project: Project; slot: number; onSong: (song: number[]) => void; onMode: (mode: "pattern" | "song") => void }) {
  const cycle = (i: number) => {
    const next = [...project.song];
    next[i] = next[i] >= 3 ? -1 : next[i] + 1;
    onSong(next);
  };
  const bars = (project.length / 16) * project.song.filter((s) => s >= 0).length;
  return (
    <div className="flex flex-col gap-2.5" data-testid="studio-song">
      <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-[#b9b09e]">
        <button className={chip} aria-pressed={project.mode === "song"} onClick={() => onMode(project.mode === "song" ? "pattern" : "song")}>
          {project.mode === "song" ? "playing the song" : "play the song"}
        </button>
        <span>
          {bars} {bars === 1 ? "bar" : "bars"} · click a slot to change its pattern
        </span>
        <button className={chip} onClick={() => onSong(project.song.map(() => -1))}>
          clear song
        </button>
      </div>
      <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-16" role="group" aria-label="Song slots">
        {project.song.map((p, i) => (
          <button
            key={i}
            className={`flex h-12 flex-col items-center justify-center rounded-[3px] border font-lcd text-[22px] leading-none ${
              p < 0 ? "border-dashed border-[#3a3733] text-[#5d574c]" : "border-[#4a4540] bg-[#24211e] text-[#e8e0cf]"
            } ${slot === i ? "outline-2 outline-amber" : ""}`}
            onClick={() => cycle(i)}
            aria-label={`Slot ${i + 1}: ${p < 0 ? "empty" : `pattern ${PATTERN_NAMES[p]}`}`}
            data-now={slot === i}
          >
            {p < 0 ? "·" : PATTERN_NAMES[p]}
            <span className="font-mono text-[9px] text-[#948b7a]">{i + 1}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
