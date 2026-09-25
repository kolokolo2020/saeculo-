"use client";

import type { AppMeta } from "@/components/window-manager/windowRegistry";
import { useWindowStore } from "@/components/window-manager/windowStore";
import AppIcon from "@/components/ui/AppIcon";

// Single click opens (not double-click) so touch users and keyboard users
// get the same one-step path — a deliberate usability-over-nostalgia call.
export default function DesktopIcon({ app }: { app: AppMeta }) {
  const openWindow = useWindowStore((s) => s.openWindow);

  return (
    <button
      onClick={() => openWindow(app.kind)}
      aria-label={app.label}
      className="group flex w-[84px] flex-col items-center gap-1 rounded-[3px] border border-transparent px-1 pt-1.5 pb-1 hover:border-white/35 hover:bg-[rgba(170,210,255,0.22)] focus-visible:border-white/60 focus-visible:bg-[rgba(120,180,255,0.35)] focus-visible:outline-none"
    >
      <AppIcon kind={app.kind} size={44} />
      <span className="icon-label w-full text-center text-[12px] leading-tight [overflow-wrap:anywhere]">
        {app.label}
      </span>
    </button>
  );
}
