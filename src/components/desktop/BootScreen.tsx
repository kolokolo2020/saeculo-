"use client";

import { useEffect, useState } from "react";
import { PROFILE } from "@/data/profile";

const BOOT_LINES = [
  "SAECULO BIOS v2.4 — (C) saeculo sound systems",
  "Memory check .......... 640K OK (plenty)",
  "Detecting audio device .......... FOUND: imagination.dll",
  "Loading beats.sys ..........",
  "Loading nostalgia.drv ..........",
  "Mounting C:\\INSTRUMENTALS ..........",
  "",
  `Starting ${PROFILE.artistName} OS...`,
];

const SESSION_KEY = "saeculo-booted";

export default function BootScreen({ onDone }: { onDone: () => void }) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion || sessionStorage.getItem(SESSION_KEY)) {
      sessionStorage.setItem(SESSION_KEY, "1");
      onDone();
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    BOOT_LINES.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleLines(i + 1), 280 * (i + 1)));
    });
    timers.push(
      setTimeout(() => {
        sessionStorage.setItem(SESSION_KEY, "1");
        onDone();
      }, 280 * BOOT_LINES.length + 900),
    );
    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  const skip = () => {
    if (skipped) return;
    setSkipped(true);
    sessionStorage.setItem(SESSION_KEY, "1");
    onDone();
  };

  return (
    <button
      onClick={skip}
      aria-label="Skip boot sequence"
      className="fixed inset-0 z-[9999] block w-full cursor-pointer bg-black p-6 text-left font-mono"
    >
      <div className="font-body text-lg leading-relaxed text-[#33ff33] sm:text-xl">
        {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
          <p key={i}>{line || " "}</p>
        ))}
        <span className="inline-block h-5 w-2.5 animate-pulse bg-[#33ff33]" aria-hidden />
      </div>
      <p className="font-pixel absolute bottom-6 left-6 text-[9px] text-[#33ff33]/60">
        click anywhere to skip
      </p>
    </button>
  );
}
