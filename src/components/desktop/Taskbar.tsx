"use client";

import { useEffect, useState } from "react";
import { useWindowStore } from "@/components/window-manager/windowStore";
import { APP_BY_KIND } from "@/components/window-manager/windowRegistry";

function formatTape(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((n) => n.toString().padStart(2, "0")).join(":");
}

function TapeCounter() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="deck-panel-recessed font-readout flex h-7 shrink-0 items-center gap-1.5 px-2 text-sm text-signal">
      <span className="rec-dot h-1.5 w-1.5 rounded-full bg-signal" aria-hidden />
      <span suppressHydrationWarning>{formatTape(elapsed)}</span>
    </div>
  );
}

export default function Taskbar({
  onStartClick,
  startOpen,
}: {
  onStartClick: () => void;
  startOpen: boolean;
}) {
  const windows = useWindowStore((s) => s.windows);
  const focusedKind = useWindowStore((s) => s.focusedKind);
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const toggleMinimize = useWindowStore((s) => s.toggleMinimize);

  return (
    <footer className="deck-panel absolute inset-x-0 bottom-0 z-[9000] flex h-10 items-center gap-1 px-1">
      <button
        onClick={onStartClick}
        aria-expanded={startOpen}
        className={`deck-button font-pixel flex h-7 shrink-0 items-center gap-1.5 px-2 text-[9px] ${
          startOpen ? "text-signal" : "text-ink"
        }`}
      >
        <span aria-hidden className="font-readout text-sm leading-none">
          ▞
        </span>
        menu
      </button>
      <div className="mx-1 h-6 w-px bg-ink/10" />
      <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
        {Object.values(windows)
          .sort((a, b) => a.kind.localeCompare(b.kind))
          .map((win) => {
            const app = APP_BY_KIND[win.kind];
            const active = focusedKind === win.kind && !win.minimized;
            return (
              <button
                key={win.kind}
                onClick={() => (active ? toggleMinimize(win.kind) : focusWindow(win.kind))}
                className={`font-pixel flex h-7 min-w-0 max-w-40 items-center gap-1.5 px-2 text-[9px] ${
                  active ? "deck-panel-recessed text-signal" : "deck-button text-ink"
                }`}
              >
                <span aria-hidden>{app.icon}</span>
                <span className="truncate">{app.title}</span>
              </button>
            );
          })}
      </div>
      <TapeCounter />
    </footer>
  );
}
