"use client";

import { useWindowStore } from "./windowStore";
import { useDraggable } from "./useDraggable";
import type { WindowKind } from "@/lib/types";

interface WindowFrameProps {
  kind: WindowKind;
  title: string;
  icon: string;
  isMobile: boolean;
  children: React.ReactNode;
}

export default function WindowFrame({ kind, title, icon, isMobile, children }: WindowFrameProps) {
  const win = useWindowStore((s) => s.windows[kind]);
  const focusedKind = useWindowStore((s) => s.focusedKind);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const toggleMinimize = useWindowStore((s) => s.toggleMinimize);
  const drag = useDraggable(kind, isMobile);

  if (!win) return null;

  const focused = focusedKind === kind;
  const hidden = win.minimized || (isMobile && !focused);

  const style: React.CSSProperties = isMobile
    ? { zIndex: win.zIndex }
    : {
        transform: `translate3d(${win.x}px, ${win.y}px, 0)`,
        width: win.width,
        height: win.height,
        zIndex: win.zIndex,
      };

  return (
    <section
      aria-label={title}
      style={style}
      className={`deck-panel absolute flex flex-col p-1 shadow-[4px_4px_0_rgba(0,0,0,0.5)] ${
        isMobile ? "inset-x-0 top-0 bottom-10" : "top-0 left-0"
      } ${hidden ? "invisible pointer-events-none" : "visible"}`}
    >
      <header
        onPointerDown={drag.onPointerDown}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
        className={`font-readout flex h-8 shrink-0 touch-none items-center gap-2 border-b px-2 text-base tracking-wide select-none ${
          focused
            ? "border-signal/40 bg-[linear-gradient(to_right,color-mix(in_srgb,var(--color-signal)_28%,var(--color-void)),var(--color-panel))] text-ink"
            : "border-ink/10 bg-panel-2 text-mute"
        } ${isMobile ? "" : "cursor-move"}`}
      >
        <span aria-hidden className={`rec-dot leading-none ${focused ? "text-signal" : "text-mute"}`}>
          {icon}
        </span>
        <h2 className="flex-1 truncate">{title}</h2>
        {isMobile ? (
          <button
            onClick={() => toggleMinimize(kind)}
            aria-label={`Minimize ${title}`}
            className="deck-button font-readout h-6 px-2 text-sm"
          >
            ▾ desk
          </button>
        ) : (
          <button
            onClick={() => toggleMinimize(kind)}
            aria-label={`Minimize ${title}`}
            className="deck-button h-5 w-5 text-xs leading-none font-bold"
          >
            _
          </button>
        )}
        <button
          onClick={() => closeWindow(kind)}
          aria-label={`Close ${title}`}
          className="deck-button h-5 w-5 text-xs leading-none font-bold"
        >
          ✕
        </button>
      </header>
      <div className="deck-panel-recessed min-h-0 flex-1 overflow-auto p-3">{children}</div>
    </section>
  );
}
