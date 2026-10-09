"use client";

import { useEffect, useRef, useState } from "react";
import { usePlayerStore, useCurrentTrack } from "@/components/player/playerStore";
import { NextGlyph, PauseGlyph, PlayGlyph } from "./Icons";
import { ALBUM } from "@/data/tracks";
import { activeWindow, useSiteStore, WINDOW_IDS, WINDOW_TITLES } from "./siteStore";
import { TASKBAR_H } from "./Window";

// The bottom bar: a button per open window, the compact player (always
// there, so the music is never more than one click away) and the clock,
// which opens the two settings the site has.

function MiniPlayer() {
  const track = useCurrentTrack();
  const playing = usePlayerStore((s) => s.playing);
  const status = usePlayerStore((s) => s.status);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const { toggle, next } = usePlayerStore.getState();
  const openWindow = useSiteStore((s) => s.openWindow);
  if (!track) return null;
  const pct = duration ? (currentTime / duration) * 100 : 0;
  return (
    <div className="bevel-in flex h-[34px] min-w-0 items-center gap-1 px-1" data-testid="mini-player">
      <button className="flex min-w-0 items-center gap-2 pr-1 text-left" onClick={() => openWindow("beats")} aria-label={`Open Beats: ${track.title}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ALBUM.cover} alt="" width={26} height={26} className="h-[26px] w-[26px] shrink-0 object-cover" />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="max-w-[20vw] truncate text-[12.5px] font-bold sm:max-w-[160px]">{track.title}</span>
          <span className="relative mt-0.5 hidden h-[3px] w-[110px] bg-face-lo sm:block" aria-hidden>
            <span className="absolute inset-y-0 left-0 bg-[linear-gradient(90deg,#2fb9ee,#8a6bff)]" style={{ width: `${pct}%` }} />
          </span>
          {status === "error" && <span className="text-[11px] text-alert">unavailable</span>}
        </span>
      </button>
      <button className="cap-btn h-[26px] w-[28px]" onClick={toggle} aria-label={playing ? "Pause" : "Play"} data-testid="mini-play">
        {playing ? <PauseGlyph size={12} /> : <PlayGlyph size={12} />}
      </button>
      <button className="cap-btn h-[26px] w-[28px]" onClick={next} aria-label="Next beat">
        <NextGlyph size={12} />
      </button>
    </div>
  );
}

function Clock({ onReplayIntro }: { onReplayIntro: () => void }) {
  const [now, setNow] = useState<Date | null>(null);
  const [open, setOpen] = useState(false);
  const calm = useSiteStore((s) => s.calm);
  const setCalm = useSiteStore((s) => s.setCalm);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  const time = now ? now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
  return (
    <div ref={box} className="relative">
      <button
        className="bevel-in flex h-[34px] items-center gap-1.5 px-2.5 font-mono text-[12px] tabular-nums"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${time ? `${time}, ` : ""}Clock and settings`}
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden className="text-[10px] text-mute">▲</span>
        <span suppressHydrationWarning>{time}</span>
      </button>
      {open && (
        <div role="menu" className="bevel-out absolute right-0 bottom-[40px] z-50 flex w-52 flex-col p-1 text-[13px]">
          <button
            role="menuitem"
            className="px-3 py-2 text-left hover:bg-brick hover:text-white focus-visible:bg-brick focus-visible:text-white focus-visible:outline-none"
            onClick={() => {
              setOpen(false);
              onReplayIntro();
            }}
          >
            Replay intro
          </button>
          <button
            role="menuitemcheckbox"
            aria-checked={calm}
            className="px-3 py-2 text-left hover:bg-brick hover:text-white focus-visible:bg-brick focus-visible:text-white focus-visible:outline-none"
            onClick={() => setCalm(!calm)}
          >
            <span className="inline-block w-4">{calm ? "✓" : ""}</span>Still visuals
          </button>
          <button
            role="menuitem"
            className="px-3 py-2 text-left hover:bg-brick hover:text-white focus-visible:bg-brick focus-visible:text-white focus-visible:outline-none"
            onClick={() => {
              setOpen(false);
              useSiteStore.getState().setShortcutsOpen(true);
            }}
          >
            Keyboard shortcuts
          </button>
        </div>
      )}
    </div>
  );
}

export default function Taskbar({ onReplayIntro }: { onReplayIntro: () => void }) {
  const windows = useSiteStore((s) => s.windows);
  const active = useSiteStore(activeWindow);
  const { focus, minimize } = useSiteStore.getState();
  return (
    <nav aria-label="Taskbar" className="taskbar fixed inset-x-0 bottom-0 z-[500] flex items-center gap-1.5 px-1.5" style={{ height: TASKBAR_H }}>
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
        {WINDOW_IDS.filter((id) => windows[id].open).map((id) => (
          <button
            key={id}
            className="task-btn max-w-[150px] shrink"
            aria-pressed={active === id}
            onClick={() => (active === id ? minimize(id) : focus(id))}
          >
            <span className="truncate">{WINDOW_TITLES[id]}</span>
          </button>
        ))}
      </div>
      <MiniPlayer />
      <Clock onReplayIntro={onReplayIntro} />
    </nav>
  );
}
