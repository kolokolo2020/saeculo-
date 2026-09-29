"use client";

import { useEffect, useRef } from "react";
import { CloseGlyph } from "./Icons";
import { useSiteStore } from "./siteStore";
import { SHORTCUTS } from "./useShortcuts";

export default function ShortcutsCard() {
  const open = useSiteStore((s) => s.shortcutsOpen);
  const setOpen = useSiteStore((s) => s.setShortcutsOpen);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) box.current?.focus();
  }, [open]);
  if (!open) return null;
  return (
    <div
      ref={box}
      tabIndex={-1}
      role="dialog"
      aria-labelledby="shortcuts-title"
      className="bevel-out fixed top-1/2 left-1/2 z-[600] w-[min(340px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 p-[3px] outline-none"
      onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
      data-testid="shortcuts"
    >
      <div className="win-title" style={{ background: "linear-gradient(90deg, #4a120d, #6e1f18 45%, #a4452f)" }}>
        <h2 id="shortcuts-title">Keyboard shortcuts</h2>
        <button className="cap-btn" aria-label="Close shortcuts" onClick={() => setOpen(false)}>
          <CloseGlyph size={11} />
        </button>
      </div>
      <dl className="bevel-field mt-[3px] grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 p-3 text-[13px]">
        {SHORTCUTS.map(([k, what]) => (
          <div key={k} className="contents">
            <dt className="font-mono text-[12px] font-bold">{k}</dt>
            <dd className="text-mute">{what}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
