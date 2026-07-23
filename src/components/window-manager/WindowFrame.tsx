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
      className={`bevel-out bg-chrome absolute flex flex-col p-1 shadow-[4px_4px_0_rgba(0,0,0,0.35)] ${
        isMobile ? "inset-x-0 top-0 bottom-10" : "top-0 left-0"
      } ${hidden ? "invisible pointer-events-none" : "visible"}`}
    >
      <header
        onPointerDown={drag.onPointerDown}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
        className={`flex h-8 shrink-0 touch-none items-center gap-2 px-2 select-none ${
          focused
            ? "bg-gradient-to-r from-[#000080] to-[#1084d0] text-white"
            : "bg-[#808080] text-[#c8c8c8]"
        } ${isMobile ? "" : "cursor-move"}`}
      >
        <span aria-hidden className="text-sm leading-none">{icon}</span>
        <h2 className="font-pixel flex-1 truncate text-[10px] tracking-wide">{title}</h2>
        {isMobile ? (
          <button
            onClick={() => toggleMinimize(kind)}
            aria-label={`Minimize ${title}`}
            className="bevel-out bg-chrome font-pixel h-6 px-2 text-[9px] text-black active:translate-y-px"
          >
            ▾ desk
          </button>
        ) : (
          <button
            onClick={() => toggleMinimize(kind)}
            aria-label={`Minimize ${title}`}
            className="bevel-out bg-chrome h-5 w-5 text-[10px] leading-none font-bold text-black active:translate-y-px"
          >
            _
          </button>
        )}
        <button
          onClick={() => closeWindow(kind)}
          aria-label={`Close ${title}`}
          className="bevel-out bg-chrome h-5 w-5 text-[10px] leading-none font-bold text-black active:translate-y-px"
        >
          ✕
        </button>
      </header>
      <div className="bevel-in min-h-0 flex-1 overflow-auto bg-[#f4f1e8]">
        {children}
      </div>
    </section>
  );
}
