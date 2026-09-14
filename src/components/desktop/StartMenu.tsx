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
        className="deck-panel absolute bottom-12 left-2 z-[9200] flex w-56 overflow-hidden rounded-b-none max-md:w-[calc(100vw-1rem)]"
      >
        <div className="font-chrome flex w-8 items-end justify-center bg-[linear-gradient(to_top,color-mix(in_srgb,white_55%,var(--color-signal)),color-mix(in_srgb,var(--color-panel-2)_55%,var(--color-signal)))] pb-2 text-[9px] font-medium text-paper [writing-mode:vertical-rl]">
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
                className="font-chrome flex w-full items-center gap-3 px-3 py-2.5 text-left text-[13px] text-ink hover:bg-signal/15 hover:text-signal focus-visible:bg-signal/15 focus-visible:text-signal focus:outline-none"
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
