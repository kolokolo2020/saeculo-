"use client";

import { useRef, useState } from "react";
import { useWindowStore } from "@/components/window-manager/windowStore";
import { APP_BY_KIND } from "@/components/window-manager/windowRegistry";
import { usePlayerStore, useCurrentTrack } from "@/components/player/playerStore";
import AppIcon from "@/components/ui/AppIcon";
import Glyph from "@/components/ui/Glyph";
import StartMark from "@/components/ui/StartMark";
import { useNow } from "@/hooks/useNow";
import type { WindowKind } from "@/lib/types";
import { paletteFor } from "@/components/player/analysis";

// Hovering a taskbar button floats a glass preview above it, the way Vista
// showed live thumbnails: the window's icon and what it's up to — for the
// media player, the cover and track.
function TaskPreview({ kind, x }: { kind: WindowKind; x: number }) {
  const app = APP_BY_KIND[kind];
  const track = useCurrentTrack();
  const playing = usePlayerStore((s) => s.playing);
  const isPlayer = kind === "player";
  return (
    <div
      className="aero-glass aero-open pointer-events-none fixed bottom-[46px] z-[9400] w-[210px] p-2 max-md:hidden"
      style={{ left: Math.max(6, x - 105) }}
      aria-hidden
    >
      <p className="aero-title-text truncate px-0.5 text-[12px]">{app.title}</p>
      <div className="mt-1.5 flex h-[104px] items-center justify-center gap-3 overflow-hidden rounded-[3px] border border-black/40 bg-[linear-gradient(to_bottom,#1b2533,#03070f)]">
        {isPlayer && track.cover ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- local cover */}
            <img src={track.cover} alt="" className="h-[76px] w-[76px] rounded-[2px] border border-white/25 shadow-[0_3px_10px_rgba(0,0,0,0.7)]" />
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-white">{track.title}</span>
              <span className="block text-[11px]" style={{ color: paletteFor(track.id).accent }}>
                {playing ? "▶ Playing" : "❚❚ Paused"}
              </span>
            </span>
          </>
        ) : (
          <>
            <AppIcon kind={kind} size={48} />
            <span className="max-w-[110px] text-[11px] leading-snug text-[#c9d6e6]">{app.description}</span>
          </>
        )}
      </div>
    </div>
  );
}

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
  const [preview, setPreview] = useState<{ kind: WindowKind; x: number } | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showPreview = (kind: WindowKind, el: HTMLElement) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    const r = el.getBoundingClientRect();
    hoverTimer.current = setTimeout(() => setPreview({ kind, x: r.left + r.width / 2 }), 350);
  };
  const hidePreview = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setPreview(null);
  };

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
                onClick={() => {
                  hidePreview();
                  if (active) toggleMinimize(win.kind);
                  else focusWindow(win.kind);
                }}
                onMouseEnter={(e) => showPreview(win.kind, e.currentTarget)}
                onMouseLeave={hidePreview}
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

      {preview && windows[preview.kind] && <TaskPreview kind={preview.kind} x={preview.x} />}

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
