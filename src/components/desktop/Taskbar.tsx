"use client";

import { useWindowStore } from "@/components/window-manager/windowStore";
import { APP_BY_KIND } from "@/components/window-manager/windowRegistry";
import { usePlayerStore, useCurrentTrack } from "@/components/player/playerStore";
import AppIcon from "@/components/ui/AppIcon";
import Glyph from "@/components/ui/Glyph";
import StartMark from "@/components/ui/StartMark";
import { useNow } from "@/hooks/useNow";
import type { WindowKind } from "@/lib/types";

const QUICK_LAUNCH: WindowKind[] = ["player", "beatmaker", "beatdeck"];

function TrayClock() {
  const now = useNow();
  if (!now) return <span className="w-14" />;
  const d = new Date(now);
  return (
    <span
      className="px-2 text-center text-[12px] leading-tight text-white"
      title={d.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
    >
      {d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
    </span>
  );
}

function TrayNowPlaying() {
  const playing = usePlayerStore((s) => s.playing);
  const track = useCurrentTrack();
  const openWindow = useWindowStore((s) => s.openWindow);
  if (!playing) return null;
  return (
    <button
      onClick={() => openWindow("player")}
      title={`Now playing: ${track.title}`}
      aria-label={`Now playing: ${track.title}`}
      className="flex h-6 items-end gap-[2px] rounded px-1.5 pb-1 hover:bg-white/10"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[3px] animate-pulse rounded-sm bg-[#7fe0ff]"
          style={{ height: `${6 + ((i * 5) % 9)}px`, animationDelay: `${i * 180}ms` }}
        />
      ))}
    </button>
  );
}

export default function Taskbar({
  onStartClick,
  startOpen,
}: {
  onStartClick: () => void;
  startOpen: boolean;
}) {
  const windows = useWindowStore((s) => s.windows);
  const focusedKind = useWindowStore((s) => s.focusedKind);
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const toggleMinimize = useWindowStore((s) => s.toggleMinimize);
  const openWindow = useWindowStore((s) => s.openWindow);
  const minimizeAll = useWindowStore((s) => s.minimizeAll);
  const muted = usePlayerStore((s) => s.muted);
  const toggleMute = usePlayerStore((s) => s.toggleMute);

  return (
    <footer
      aria-label="Taskbar"
      className="aero-taskbar absolute inset-x-0 bottom-0 z-[9000] flex h-10 items-center gap-1 pr-0 pl-[54px]"
    >
      <button
        onClick={onStartClick}
        aria-label="Start"
        aria-expanded={startOpen}
        className={`aero-orb absolute bottom-[1px] left-1.5 grid h-[44px] w-[44px] place-items-center ${
          startOpen ? "brightness-125" : ""
        }`}
      >
        <StartMark size={22} className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]" />
      </button>

      {/* quick launch */}
      <div className="flex items-center gap-0.5 border-r border-white/15 pr-1.5 max-md:hidden">
        {QUICK_LAUNCH.map((kind) => (
          <button
            key={kind}
            onClick={() => openWindow(kind)}
            title={APP_BY_KIND[kind].title}
            aria-label={`Quick launch ${APP_BY_KIND[kind].label}`}
            className="grid h-7 w-7 place-items-center rounded hover:bg-white/15"
          >
            <AppIcon kind={kind} size={20} />
          </button>
        ))}
      </div>

      {/* open windows */}
      <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto px-1">
        {Object.values(windows)
          .sort((a, b) => a.kind.localeCompare(b.kind))
          .map((win) => {
            const app = APP_BY_KIND[win.kind];
            const active = focusedKind === win.kind && !win.minimized;
            return (
              <button
                key={win.kind}
                onClick={() => (active ? toggleMinimize(win.kind) : focusWindow(win.kind))}
                aria-label={`Taskbar ${app.title}`}
                aria-pressed={active}
                className={`aero-task-btn flex h-[30px] w-40 min-w-0 shrink items-center gap-1.5 px-2 text-[12px] ${
                  active ? "aero-task-btn-active" : ""
                }`}
              >
                <AppIcon kind={win.kind} size={16} />
                <span className="truncate">{app.title}</span>
              </button>
            );
          })}
      </div>

      {/* notification area */}
      <div className="flex h-full items-center gap-1 border-l border-white/15 pl-1.5 [background:linear-gradient(to_bottom,rgba(255,255,255,0.06),rgba(0,0,0,0.25))]">
        <TrayNowPlaying />
        <button
          onClick={toggleMute}
          aria-label={muted ? "Tray unmute" : "Tray mute"}
          title={muted ? "Unmute" : "Mute"}
          className="grid h-6 w-6 place-items-center rounded text-white hover:bg-white/15"
        >
          <Glyph name={muted ? "mute" : "volume"} size={15} />
        </button>
        <TrayClock />
        <button
          onClick={minimizeAll}
          aria-label="Show desktop"
          title="Show desktop"
          className="h-full w-3 border-l border-white/20 hover:bg-white/20"
        />
      </div>
    </footer>
  );
}
