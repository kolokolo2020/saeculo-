"use client";

import { useEffect, useRef } from "react";

// The box every mini-game sits in: over the picture, a title, a way out.

export const miniBtn = "rounded-[2px] border border-[#4a4540] bg-[#1d1b19] px-3 py-1 text-[20px] hover:border-amber focus-visible:border-amber disabled:opacity-40 aria-pressed:border-amber";

export default function Frame({ title, sub, onClose, children, testid, wide = false }: { title: string; sub?: string; onClose: () => void; children: React.ReactNode; testid: string; wide?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    root.current?.querySelector<HTMLElement>("[data-autofocus], button:not([data-close])")?.focus();
  }, []);
  return (
    <div
      ref={root}
      role="dialog"
      aria-label={title}
      data-testid={testid}
      className="game-fade absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-3 font-lcd text-[20px] text-[#e8e0cf]"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className={`flex max-h-full w-full ${wide ? "max-w-[620px]" : "max-w-[480px]"} flex-col overflow-hidden rounded-[3px] border-2 border-[#3a3733] bg-[#0f0e0d]/95`}>
        <div className="flex shrink-0 items-center gap-3 border-b border-[#2a2724] px-3 py-2">
          <span className="text-amber">{title}</span>
          {sub && <span className="truncate text-[17px] text-[#8a8170]">{sub}</span>}
          <button className={`${miniBtn} ml-auto font-sans text-[13px]`} onClick={onClose} data-close aria-label={`Leave (Esc): ${title}`}>
            Leave (Esc)
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
      </div>
    </div>
  );
}
