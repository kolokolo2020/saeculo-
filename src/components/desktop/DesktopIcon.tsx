"use client";

import type { AppMeta } from "@/components/window-manager/windowRegistry";
import { useWindowStore } from "@/components/window-manager/windowStore";

export default function DesktopIcon({ app }: { app: AppMeta }) {
  const openWindow = useWindowStore((s) => s.openWindow);

  return (
    <button
      onClick={() => openWindow(app.kind)}
      className="group flex w-24 flex-col items-center gap-1.5 p-2 focus:outline-none"
    >
      <span
        aria-hidden
        className="deck-button flex h-12 w-12 items-center justify-center rounded-2xl text-2xl text-signal group-hover:brightness-125 group-focus-visible:ring-2 group-focus-visible:ring-signal"
      >
        {app.icon}
      </span>
      <span className="font-chrome chip-label block w-full rounded-full px-2 py-1 text-center text-[10px] leading-relaxed [overflow-wrap:anywhere]">
        {app.desktopLabel}
      </span>
    </button>
  );
}
