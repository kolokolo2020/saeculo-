"use client";

import { useEffect, useState } from "react";
import { GAMES } from "@/components/window-manager/windowRegistry";
import { useWindowStore } from "@/components/window-manager/windowStore";
import AppIcon from "@/components/ui/AppIcon";
import { readBest } from "@/lib/bestScores";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { WindowKind } from "@/lib/types";
import LatencyCalibrator from "@/components/games/LatencyCalibrator";
import { readLatencyOffsetMs, saveLatencyOffsetMs } from "@/lib/latency";

function bestLine(kind: WindowKind): string {
  if (kind === "rhythm") {
    const b = readBest("rhythm");
    const hard = readBest("rhythmHard");
    if (!b && !hard) return "No runs yet";
    return [b && `Best (Normal): ${b.toLocaleString()}`, hard && `Hard: ${hard.toLocaleString()}`]
      .filter(Boolean)
      .join(" · ");
  }
  if (kind === "brawl") {
    const b = readBest("brawl");
    return b ? `Best win: ${b} HP left` : "Metro Nome is undefeated";
  }
  if (kind === "pads") {
    const b = readBest("pads");
    return b ? `Longest pattern: ${b}` : "No games yet";
  }
  return "";
}

const HOW_TO: Partial<Record<WindowKind, string>> = {
  rhythm: "34-second runs. Notes fall on the beat grid of the track you pick — hit D F J K as they cross the line.",
  brawl: "A boss fight against a metronome. Land notes to damage it; misses damage you. It speeds up.",
  pads: "The pads play a pattern; play it back. Every round adds one hit. Keys Q W E R / A S D F.",
};

// The "Games" folder: every game as a big tile, with a details pane for the
// selected one — personal bests, how to play, and a Play button.
export default function GamesExplorerApp() {
  const openWindow = useWindowStore((s) => s.openWindow);
  const isMobile = useIsMobile();
  const [selected, setSelected] = useState<WindowKind>(GAMES[0].kind);
  const game = GAMES.find((g) => g.kind === selected) ?? GAMES[0];
  const [calibrating, setCalibrating] = useState(false);
  const [offsetMs, setOffsetMs] = useState(0);

  // the saved correction lives in localStorage, read after mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of browser storage
    setOffsetMs(readLatencyOffsetMs());
  }, []);

  const timing = (
    <p className="flex flex-wrap items-center gap-x-2 text-[11.5px] text-mute">
      <span>Audio timing: {offsetMs ? `${offsetMs > 0 ? "+" : ""}${offsetMs} ms` : "default"}</span>
      <button onClick={() => setCalibrating(true)} className="text-[#0645ad] hover:underline">
        Calibrate…
      </button>
      {offsetMs !== 0 && (
        <button
          onClick={() => {
            saveLatencyOffsetMs(0);
            setOffsetMs(0);
          }}
          className="text-[#0645ad] hover:underline"
        >
          Reset
        </button>
      )}
    </p>
  );

  return (
    <div className="relative flex h-full flex-col text-ink">
      <div className="aero-toolbar flex h-8 shrink-0 items-center gap-1 px-2 text-[12px]">
        <span className="text-mute">Games</span>
        <span className="text-mute">›</span>
        <span>All games</span>
        <span className="ml-auto text-mute">{GAMES.length} games</span>
      </div>
      <div className="flex min-h-0 flex-1">
        <ul className="grid flex-1 content-start gap-1.5 overflow-y-auto p-3 [grid-template-columns:repeat(auto-fill,minmax(112px,1fr))]" aria-label="Games">
          {GAMES.map((g) => (
            <li key={g.kind}>
              <button
                onClick={() => (isMobile ? openWindow(g.kind) : setSelected(g.kind))}
                onDoubleClick={() => openWindow(g.kind)}
                aria-label={g.title}
                aria-pressed={selected === g.kind}
                className={`flex w-full flex-col items-center gap-1.5 px-2 py-2.5 text-center ${
                  selected === g.kind ? "aero-row aero-row-selected" : "aero-row"
                }`}
              >
                <AppIcon kind={g.kind} size={56} />
                <span className="text-[12.5px]">{g.title}</span>
              </button>
            </li>
          ))}
        </ul>
        <aside className="flex w-[190px] shrink-0 flex-col gap-2 border-l border-[#c9d3df] bg-gradient-to-b from-[#f4f8fc] to-[#e4ecf5] p-3 max-md:hidden">
          <AppIcon kind={game.kind} size={64} />
          <p className="text-[15px] font-semibold">{game.title}</p>
          <p className="text-[12px] text-mute">{game.description}</p>
          <p className="text-[12px] text-[#2a6e2a]">{bestLine(game.kind)}</p>
          <p className="text-[11.5px] leading-snug text-[#3b4a5c]">{HOW_TO[game.kind]}</p>
          {timing}
          <button
            onClick={() => openWindow(game.kind)}
            className="aero-btn aero-btn-primary mt-auto py-1.5 text-[13px]"
            aria-label={`Play ${game.title}`}
          >
            Play
          </button>
        </aside>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 border-t border-[#c9d3df] bg-[#f1f5fa] px-3 py-1 text-[11px] text-mute md:hidden">
        <span>Tap a game to play.</span>
        {timing}
      </div>
      {calibrating && <LatencyCalibrator onClose={() => setCalibrating(false)} onSaved={setOffsetMs} />}
    </div>
  );
}
