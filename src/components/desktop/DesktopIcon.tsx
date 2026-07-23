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
        className="bevel-out bg-chrome flex h-12 w-12 items-center justify-center text-2xl text-black group-hover:brightness-110 group-focus-visible:ring-2 group-focus-visible:ring-white"
      >
        {app.icon}
      </span>
      <span className="font-pixel block w-full [overflow-wrap:anywhere] bg-[#008080] px-1 text-center text-[8px] leading-tight text-white group-hover:bg-[#000080] group-focus-visible:bg-[#000080]">
        {app.desktopLabel}
      </span>
    </button>
  );
}
