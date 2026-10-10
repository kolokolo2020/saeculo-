"use client";

import { useEffect, useRef, useState } from "react";
import { usePlayerStore, useCurrentTrack } from "@/components/player/playerStore";
import { BeatsIcon, ChevronUpGlyph, ContactIcon, NextGlyph, PauseGlyph, PlayGlyph, SocialsIcon } from "./Icons";
import { ALBUM } from "@/data/tracks";
import { activeWindow, useSiteStore, WINDOW_IDS, WINDOW_TITLES, type WindowId } from "./siteStore";
import { TASKBAR_H } from "./Window";

// The bottom bar: a button per open window, the compact player (always
// there, so the music is never more than one click away) and the clock,
// which opens the few settings the site has.

const TASK_ICONS: Record<WindowId, typeof BeatsIcon> = { beats: BeatsIcon, socials: SocialsIcon, contact: ContactIcon };

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
    <div className="tray min-w-0 gap-0.5 pr-0.5 pl-[3px]" data-testid="mini-player">
      <button className="tray-link flex h-[28px] min-w-0 items-center gap-2 pr-1.5 pl-[1px] text-left" onClick={() => openWindow("beats")} aria-label={`Open Beats: ${track.title}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ALBUM.cover} alt="" width={26} height={26} className="h-[26px] w-[26px] shrink-0 rounded-[5px] border border-edge object-cover" />
        <span className="flex min-w-0 flex-col justify-center leading-tight">
          <span className="max-w-[22vw] truncate text-[12.5px] font-medium sm:max-w-[150px]">{track.title}</span>
          <span className="relative mt-[3px] hidden h-[2px] w-[104px] overflow-hidden rounded-full bg-rule sm:block" aria-hidden>
            <span className="absolute inset-y-0 left-0 bg-dusk" style={{ width: `${pct}%` }} />
          </span>
          {status === "error" && <span className="text-[11px] text-rust">unavailable</span>}
        </span>
      </button>
      <button className="tray-btn" onClick={toggle} aria-label={playing ? "Pause" : "Play"} data-testid="mini-play">
        {playing ? <PauseGlyph size={12} /> : <PlayGlyph size={12} />}
      </button>
      <button className="tray-btn" onClick={next} aria-label="Next beat">
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
        className="tray clock-btn gap-1 pr-2.5 pl-1.5 tabular-nums"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${time ? `${time}, ` : ""}Clock and settings`}
        onClick={() => setOpen((o) => !o)}
      >
        <ChevronUpGlyph size={13} className={`text-ink-2 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
        <span className="font-lcd text-[19px] leading-none" suppressHydrationWarning>
          {time}
        </span>
      </button>
      {open && (
        <div role="menu" className="panel absolute right-0 bottom-[42px] z-50 flex w-56 flex-col p-1">
          <button
            role="menuitem"
            className="menu-item"
            onClick={() => {
              setOpen(false);
              onReplayIntro();
            }}
          >
            <span className="menu-check" aria-hidden />
            Replay intro
          </button>
          <button role="menuitemcheckbox" aria-checked={calm} className="menu-item" onClick={() => setCalm(!calm)}>
            <span className="menu-check" aria-hidden>
              {calm ? "✓" : ""}
            </span>
            Still visuals
          </button>
          <div className="mx-2 my-1 h-px bg-rule" role="separator" />
          <button
            role="menuitem"
            className="menu-item"
            onClick={() => {
              setOpen(false);
              useSiteStore.getState().setShortcutsOpen(true);
            }}
          >
            <span className="menu-check" aria-hidden />
            Keyboard shortcuts
            <span className="menu-hint" aria-hidden>
              ?
            </span>
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
        {WINDOW_IDS.filter((id) => windows[id].open).map((id) => {
          const Icon = TASK_ICONS[id];
          return (
            <button key={id} className="task-btn max-w-[150px] shrink" aria-pressed={active === id} onClick={() => (active === id ? minimize(id) : focus(id))}>
              <span className="hidden shrink-0 sm:block">
                <Icon size={16} />
              </span>
              <span className="truncate">{WINDOW_TITLES[id]}</span>
            </button>
          );
        })}
      </div>
      <MiniPlayer />
      <Clock onReplayIntro={onReplayIntro} />
    </nav>
  );
}
