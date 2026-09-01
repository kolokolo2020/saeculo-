"use client";

import { useEffect } from "react";
import { useWindowStore } from "@/components/window-manager/windowStore";
import { APPS } from "@/components/window-manager/windowRegistry";
import { PROFILE } from "@/data/profile";

export default function StartMenu({ onClose }: { onClose: () => void }) {
  const openWindow = useWindowStore((s) => s.openWindow);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-[9100]" onClick={onClose} aria-hidden />
      <nav
        aria-label="Start menu"
        className="deck-panel absolute bottom-10 left-0 z-[9200] flex w-56 max-md:left-2 max-md:w-[calc(100vw-2rem)]"
      >
        <div className="font-pixel flex w-8 items-end justify-center bg-[linear-gradient(to_top,color-mix(in_srgb,var(--color-signal)_30%,var(--color-void)),var(--color-panel))] pb-2 text-[9px] text-ink [writing-mode:vertical-rl]">
          {PROFILE.artistName} OS
        </div>
        <ul className="flex-1 py-1">
          {APPS.map((app) => (
            <li key={app.kind}>
              <button
                onClick={() => {
                  openWindow(app.kind);
                  onClose();
                }}
                className="font-pixel flex w-full items-center gap-3 px-3 py-3 text-left text-[10px] text-ink hover:bg-signal/15 hover:text-signal focus-visible:bg-signal/15 focus-visible:text-signal focus:outline-none"
              >
                <span aria-hidden className="w-5 text-center">
                  {app.icon}
                </span>
                {app.desktopLabel}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
