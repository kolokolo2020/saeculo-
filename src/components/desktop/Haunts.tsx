"use client";

import { useEffect, useState } from "react";
import type { Atmosphere } from "./personalizeStore";
import { GHOST_FILES, HAUNTS, HAUNT_TITLES, useHauntStore, type Haunt } from "./hauntStore";
import { useWindowStore } from "@/components/window-manager/windowStore";

// Once a visit, maybe, something small goes wrong on the desktop: a window
// title says something it shouldn't, the clocks run backwards, the cat
// from the Room walks across the taskbar, or a file flickers into the
// Recycle Bin and is gone. Tape rolls the dice once a visit; Midnight
// always gets one, sooner. Clean never does. Nothing here takes the pointer
// or focus, and nothing is announced to screen readers.

const SEEN_KEY = "saeculo-haunted";
const LENGTH: Record<Haunt, number> = { title: 2600, clock: 4200, cat: 12000, bin: 2800 };
const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

function visibleWindow() {
  const { windows, focusedKind } = useWindowStore.getState();
  const open = Object.values(windows).filter((w) => !w.minimized);
  if (!open.length) return null;
  return open.find((w) => w.kind === focusedKind) ?? open.sort((a, b) => b.zIndex - a.zIndex)[0];
}

function canRun(haunt: Haunt, reducedMotion: boolean) {
  if (haunt === "title") return visibleWindow() !== null;
  if (haunt === "cat") return !reducedMotion;
  return true;
}

let clearTimer: ReturnType<typeof setTimeout> | undefined;

/** Start a haunt now. Returns false if it can't run (or one is running). */
function runHaunt(haunt: Haunt, reducedMotion: boolean): boolean {
  const store = useHauntStore.getState();
  if (store.title || store.clockBack || store.cat || store.ghostFile) return false;
  if (!canRun(haunt, reducedMotion)) return false;
  if (haunt === "title") store.set({ title: { kind: visibleWindow()!.kind, text: pick(HAUNT_TITLES) } });
  if (haunt === "clock") store.set({ clockBack: Date.now() });
  if (haunt === "cat") store.set({ cat: true });
  if (haunt === "bin") store.set({ ghostFile: pick(GHOST_FILES) });
  clearTimeout(clearTimer);
  clearTimer = setTimeout(() => store.set({ title: null, clockBack: null, cat: false, ghostFile: null }), LENGTH[haunt]);
  return true;
}

/** The tuxedo cat from the Room, in profile, walking along the taskbar. */
function Cat() {
  const leg = (x: number, cls: string) => (
    <g className={cls} style={{ transformOrigin: `${x}px 40px` }}>
      <path d={`M${x} 40 L${x - 1} 60`} stroke="#0b0b0f" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx={x - 1} cy="61" rx="4.2" ry="2.4" fill="#e8e4da" stroke="#05060a" strokeWidth="1" />
    </g>
  );
  return (
    <div className="haunt-cat" aria-hidden data-testid="haunt-cat">
      <svg viewBox="0 0 124 66" width="93" height="50" className="overflow-visible">
        <path className="haunt-cat-tail" d="M26 34 C12 30 6 18 12 4" stroke="#0b0b0f" strokeWidth="6" fill="none" strokeLinecap="round" />
        {leg(34, "haunt-leg-b")}
        {leg(80, "haunt-leg-a")}
        <ellipse cx="56" cy="36" rx="32" ry="12" fill="#0b0b0f" stroke="#05060a" strokeWidth="2" />
        {leg(40, "haunt-leg-a")}
        {leg(86, "haunt-leg-b")}
        <ellipse cx="86" cy="41" rx="7" ry="8" fill="#e8e4da" />
        <path d="M88 20 L90 6 L98 16 Z M100 16 L108 6 L108 20 Z" fill="#0b0b0f" stroke="#05060a" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="99" cy="25" r="11" fill="#0b0b0f" stroke="#05060a" strokeWidth="1.5" />
        <path d="M100 30 C104 36 110 34 111 28 C108 30 104 30 100 30 Z" fill="#e8e4da" />
        <ellipse cx="104" cy="23" rx="2.4" ry="2" fill="#8cff6e" />
        <ellipse cx="104.4" cy="23" rx="0.6" ry="1.8" fill="#05060a" />
        <circle cx="110" cy="27.5" r="1.2" fill="#d98a9a" />
      </svg>
    </div>
  );
}

/** A file that drifts into the Recycle Bin icon, flickering, and is gone. */
function GhostFile({ name }: { name: string }) {
  const [at] = useState(() => {
    const bin = document.querySelector('nav[aria-label="Desktop"] button[aria-label="Recycle Bin"]');
    const r = bin?.getBoundingClientRect();
    if (!r || r.width === 0) return null;
    return { x: r.left + r.width / 2, y: r.top + 26 };
  });
  if (!at) return null;
  const startX = Math.min(at.x + 120, window.innerWidth - 60);
  return (
    <div
      className="haunt-ghost"
      aria-hidden
      data-testid="haunt-ghost"
      style={{ left: startX - 42, top: at.y - 24, "--dx": `${at.x - startX}px` } as React.CSSProperties}
    >
      <svg viewBox="0 0 48 48" width="38" height="38">
        <path d="M11 5h18l8 8v30H11z" fill="#f3ead2" stroke="#7a6a48" strokeWidth="1.2" strokeLinejoin="round" />
        <rect x="15" y="20" width="18" height="12" fill="#141414" />
        <path d="M22 23v6l5-3z" fill="#e0402e" />
      </svg>
      <span className="icon-label block w-[84px] truncate text-center text-[11px]">{name}</span>
    </div>
  );
}

export default function Haunts({
  atmosphere,
  reducedMotion,
  active,
}: {
  atmosphere: Atmosphere;
  reducedMotion: boolean;
  /** False while the boot screen, the Room or the screensaver is up. */
  active: boolean;
}) {
  const cat = useHauntStore((s) => s.cat);
  const ghostFile = useHauntStore((s) => s.ghostFile);

  // a debug hook for the browser tests: window.__saeculoHaunt("cat")
  useEffect(() => {
    const w = window as Window & { __saeculoHaunt?: (h: Haunt) => boolean };
    w.__saeculoHaunt = (h) => runHaunt(h, reducedMotion);
    return () => {
      delete w.__saeculoHaunt;
    };
  }, [reducedMotion]);

  useEffect(() => {
    if (atmosphere === "clean" || !active) return;
    try {
      if (sessionStorage.getItem(SEEN_KEY)) return;
    } catch {
      return;
    }
    const midnight = atmosphere === "midnight";
    if (!midnight && Math.random() > 0.5) return;
    const [lo, hi] = midnight ? [45, 150] : [150, 420];
    let timer: ReturnType<typeof setTimeout>;
    const attempt = () => {
      if (document.hidden) {
        timer = setTimeout(attempt, 15_000);
        return;
      }
      const options = HAUNTS.filter((h) => canRun(h, reducedMotion));
      if (!runHaunt(pick(options), reducedMotion)) return;
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        // storage blocked
      }
    };
    timer = setTimeout(attempt, (lo + Math.random() * (hi - lo)) * 1000);
    return () => clearTimeout(timer);
  }, [atmosphere, active, reducedMotion]);

  return (
    <>
      {cat && <Cat />}
      {ghostFile && <GhostFile name={ghostFile} />}
    </>
  );
}
