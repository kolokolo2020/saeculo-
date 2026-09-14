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
      className={`deck-panel absolute flex flex-col overflow-hidden transition-shadow ${
        focused ? "shadow-[0_0_0_2px_rgba(47,140,235,0.45),0_24px_55px_rgba(3,12,24,0.55)]" : ""
      } ${isMobile ? "inset-x-0 top-0 bottom-10 rounded-none" : "top-0 left-0"} ${
        hidden ? "invisible pointer-events-none" : "visible"
      }`}
    >
      <header
        onPointerDown={drag.onPointerDown}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
        className={`font-chrome flex h-9 shrink-0 touch-none items-center gap-2 border-b px-3 text-[11px] font-medium tracking-wide select-none ${
          focused
            ? "border-black/10 bg-[linear-gradient(to_bottom,color-mix(in_srgb,white_55%,var(--color-signal)),color-mix(in_srgb,var(--color-panel-2)_55%,var(--color-signal)))] text-paper shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
            : "border-ink/10 bg-panel-2 text-mute"
        } ${isMobile ? "" : "cursor-move"}`}
      >
        <span aria-hidden className={`pulse-dot leading-none ${focused ? "text-signal" : "text-mute"}`}>
          {icon}
        </span>
        <h2 className="flex-1 truncate">{title}</h2>
        {isMobile ? (
          <button
            onClick={() => toggleMinimize(kind)}
            aria-label={`Minimize ${title}`}
            className="deck-button font-chrome h-6 px-2 text-[9px]"
          >
            ▾ desk
          </button>
        ) : (
          <button
            onClick={() => toggleMinimize(kind)}
            aria-label={`Minimize ${title}`}
            className="deck-button h-6 w-6 rounded-full text-xs leading-none font-bold"
          >
            _
          </button>
        )}
        <button
          onClick={() => closeWindow(kind)}
          aria-label={`Close ${title}`}
          className="deck-button h-6 w-6 rounded-full text-xs leading-none font-bold"
        >
          ✕
        </button>
      </header>
      <div className="min-h-0 flex-1 p-1.5">
        <div className="deck-panel-recessed h-full overflow-auto p-3">{children}</div>
      </div>
    </section>
  );
}
