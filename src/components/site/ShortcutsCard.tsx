"use client";

import { useEffect, useRef } from "react";
import { XGlyph } from "./Icons";
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
      className="panel fixed top-1/2 left-1/2 z-[600] w-[min(360px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden font-sans outline-none"
      onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
      data-testid="shortcuts"
    >
      <div className="win-title">
        <h2 id="shortcuts-title">Keyboard shortcuts</h2>
        <span className="win-stripes" aria-hidden />
        <button className="cap-btn" aria-label="Close shortcuts" onClick={() => setOpen(false)}>
          <XGlyph size={13} />
        </button>
      </div>
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-5 gap-y-2.5 p-4 text-[13.5px]">
        {SHORTCUTS.map(([k, what]) => (
          <div key={k} className="contents">
            <dt className="flex items-center gap-1 text-ink-2">
              {k.split(" ").map((part, i) =>
                part === "+" ? (
                  <span key={i} aria-hidden>
                    +
                  </span>
                ) : (
                  <kbd key={i} className="kbd">
                    {part}
                  </kbd>
                ),
              )}
            </dt>
            <dd>{what}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
