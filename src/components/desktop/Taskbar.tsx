"use client";

import { useEffect, useState } from "react";
import { useWindowStore } from "@/components/window-manager/windowStore";
import { APP_BY_KIND } from "@/components/window-manager/windowRegistry";

export default function Taskbar({ onStartClick, startOpen }: { onStartClick: () => void; startOpen: boolean }) {
  const windows = useWindowStore((s) => s.windows);
  const focusedKind = useWindowStore((s) => s.focusedKind);
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const toggleMinimize = useWindowStore((s) => s.toggleMinimize);
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, []);

  return (
    <footer className="bevel-out bg-chrome absolute inset-x-0 bottom-0 z-[9000] flex h-10 items-center gap-1 px-1">
      <button
        onClick={onStartClick}
        aria-expanded={startOpen}
        className={`${startOpen ? "bevel-in" : "bevel-out"} bg-chrome font-pixel flex h-7 shrink-0 items-center gap-1.5 px-2 text-[10px] font-bold text-black active:translate-y-px`}
      >
        <span aria-hidden className="text-sm leading-none">▞</span> start
      </button>
      <div className="mx-1 h-6 w-px bg-[#808080] shadow-[1px_0_0_#fff]" />
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
                className={`${active ? "bevel-in bg-[#d8d4cc]" : "bevel-out bg-chrome"} font-pixel flex h-7 min-w-0 max-w-40 items-center gap-1.5 px-2 text-[9px] text-black`}
              >
                <span aria-hidden>{app.icon}</span>
                <span className="truncate">{app.title}</span>
              </button>
            );
          })}
      </div>
      <div className="bevel-in font-pixel flex h-7 shrink-0 items-center px-2 text-[9px] text-black">
        {time}
      </div>
    </footer>
  );
}
