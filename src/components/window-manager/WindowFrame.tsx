"use client";

import { useEffect, useState } from "react";
import { TASKBAR_HEIGHT, useWindowStore } from "./windowStore";
import { useDraggable } from "./useDraggable";
import { useResizable } from "./useResizable";
import { APP_BY_KIND } from "./windowRegistry";
import AppIcon from "@/components/ui/AppIcon";
import Glyph from "@/components/ui/Glyph";
import type { WindowKind } from "@/lib/types";
import { useHauntStore } from "@/components/desktop/hauntStore";
import { usePersonalizeStore } from "@/components/desktop/personalizeStore";
import { usePlayerStore } from "@/components/player/playerStore";
import { playRelayClick } from "@/lib/synth";
import { peekAudioContext } from "@/lib/audioContext";

/** A soft relay click as a tube window switches on or off (Tape and
 *  Midnight only, and only once something else has woken the audio). */
function relayClick(closing: boolean) {
  if (usePersonalizeStore.getState().atmosphere === "clean" || usePlayerStore.getState().muted) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ctx = peekAudioContext();
  if (ctx) playRelayClick(ctx, ctx.destination, ctx.currentTime, closing);
}

interface WindowFrameProps {
  kind: WindowKind;
  isMobile: boolean;
  children: React.ReactNode;
}

// A frosted Aero window: glass frame, glowing title text, fused caption
// buttons with the red close, and a white or glossy-dark client area.
export default function WindowFrame({ kind, isMobile, children }: WindowFrameProps) {
  const win = useWindowStore((s) => s.windows[kind]);
  const focusedKind = useWindowStore((s) => s.focusedKind);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const toggleMinimize = useWindowStore((s) => s.toggleMinimize);
  const toggleMaximize = useWindowStore((s) => s.toggleMaximize);
  const drag = useDraggable(kind, isMobile);
  const resize = useResizable(kind);
  // closing plays a short shrink-and-fade first, like Vista did
  const [closing, setClosing] = useState(false);
  const spoof = useHauntStore((s) => (s.title?.kind === kind ? s.title.text : null));
  const exists = !!win;
  useEffect(() => {
    if (exists) relayClick(false);
  }, [exists]);

  if (!win) return null;

  const app = APP_BY_KIND[kind];
  const title = app.title;
  const focused = focusedKind === kind;
  const hidden = win.minimized || (isMobile && !focused);
  const fill = isMobile || win.maximized;

  const style: React.CSSProperties = fill
    ? { zIndex: win.zIndex, left: 0, top: 0, right: 0, bottom: TASKBAR_HEIGHT }
    : {
        transform: `translate3d(${win.x}px, ${win.y}px, 0)`,
        width: win.width,
        height: win.height,
        zIndex: win.zIndex,
        left: 0,
        top: 0,
      };

  return (
    <section
      aria-label={title}
      style={style}
      onPointerDown={() => useWindowStore.getState().focusWindow(kind)}
      onAnimationEnd={(e) => {
        if (closing && (e.animationName === "aero-close" || e.animationName === "crt-off")) closeWindow(kind);
      }}
      className={`aero-glass aero-window absolute flex flex-col transition-[opacity,scale,translate,visibility] duration-200 ease-out motion-reduce:transition-none ${
        closing ? "aero-closing pointer-events-none" : "aero-open"
      } ${focused ? "" : "aero-glass-inactive"} ${fill ? "rounded-none!" : ""} ${
        hidden ? "pointer-events-none invisible translate-y-10 scale-90 opacity-0" : "visible"
      }`}
    >
      <div className={`aero-sheen absolute inset-x-0 top-0 h-9 ${fill ? "" : "rounded-t-[8px]"}`} aria-hidden />

      <header
        onPointerDown={drag.onPointerDown}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
        onDoubleClick={() => !isMobile && toggleMaximize(kind)}
        className="relative flex h-[30px] shrink-0 touch-none items-start gap-2 pr-1.5 pl-2 select-none"
      >
        <span className="mt-[7px]">
          <AppIcon kind={kind} size={16} />
        </span>
        <h2 className={`aero-title-text mt-[6px] flex-1 truncate text-[13px] ${focused ? "" : "opacity-70"}`}>
          {spoof ? (
            <>
              <span className="haunt-title" aria-hidden>
                {spoof}
              </span>
              <span className="sr-only">{title}</span>
            </>
          ) : (
            title
          )}
        </h2>
        <div className={`aero-caption ${focused ? "" : "aero-caption-inactive"}`}>
          <button
            onClick={() => toggleMinimize(kind)}
            aria-label={`Minimize ${title}`}
            className="aero-caption-btn"
          >
            <Glyph name="minimize" size={12} />
          </button>
          {!isMobile && (
            <button
              onClick={() => toggleMaximize(kind)}
              aria-label={`${win.maximized ? "Restore" : "Maximize"} ${title}`}
              className="aero-caption-btn"
            >
              <Glyph name={win.maximized ? "restore" : "maximize"} size={12} />
            </button>
          )}
          <button
            onClick={() => {
              if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) closeWindow(kind);
              else {
                setClosing(true);
                relayClick(true);
              }
            }}
            aria-label={`Close ${title}`}
            className="aero-caption-btn aero-caption-close"
          >
            <Glyph name="close" size={12} />
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 px-[6px] pb-[6px]">
        <div
          className={`${app.surface === "dark" ? "aero-dark" : "aero-client"} h-full overflow-hidden rounded-[2px]`}
        >
          {children}
        </div>
      </div>

      {!fill && (
        <div
          onPointerDown={resize.onPointerDown}
          onPointerMove={resize.onPointerMove}
          onPointerUp={resize.onPointerUp}
          aria-hidden
          className="absolute right-0 bottom-0 h-4 w-4 cursor-nwse-resize touch-none"
        />
      )}
    </section>
  );
}
