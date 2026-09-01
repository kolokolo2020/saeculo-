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
        className="deck-button flex h-12 w-12 items-center justify-center text-2xl text-signal group-hover:brightness-125 group-focus-visible:ring-2 group-focus-visible:ring-signal"
      >
        {app.icon}
      </span>
      <span className="font-readout tape-label block w-full rotate-[-1deg] px-1 text-center text-sm leading-tight [overflow-wrap:anywhere] group-hover:rotate-0 group-focus-visible:rotate-0">
        {app.desktopLabel}
      </span>
    </button>
  );
}
