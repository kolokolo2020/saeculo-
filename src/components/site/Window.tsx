"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { CloseGlyph, MinGlyph } from "./Icons";
import { activeWindow, useSiteStore, WINDOW_TITLES, type WindowId } from "./siteStore";

export const TASKBAR_H = 44;

// Where each window opens on a wide screen, as a fraction of the free space.
const HOME: Record<WindowId, [number, number]> = {
  beats: [0.5, 0.32],
  socials: [0.72, 0.2],
  contact: [0.62, 0.45],
};

export default function Window({
  id,
  width,
  height,
  icon,
  children,
}: {
  id: WindowId;
  width: number;
  height: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const state = useSiteStore((s) => s.windows[id]);
  const z = useSiteStore((s) => s.order.indexOf(id));
  const active = useSiteStore((s) => activeWindow(s) === id);
  const { focus, closeWindow, minimize, moveWindow } = useSiteStore.getState();
  const mobile = useIsMobile();
  const ref = useRef<HTMLElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  // first open: place it; afterwards keep it on screen if the viewport shrinks
  useLayoutEffect(() => {
    if (mobile) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight - TASKBAR_H;
    const w = Math.min(width, vw - 16);
    const h = Math.min(height, vh - 16);
    if (state.x < 0) {
      const [fx, fy] = HOME[id];
      moveWindow(id, Math.round((vw - w) * fx), Math.round(Math.max(8, (vh - h) * fy)));
    } else {
      const x = Math.min(Math.max(state.x, 8 - w + 120), vw - 120);
      const y = Math.min(Math.max(state.y, 0), vh - 30);
      if (x !== state.x || y !== state.y) moveWindow(id, x, y);
    }
  }, [mobile, id, width, height, state.x, state.y, moveWindow]);

  // opening a window hands it the keyboard
  useEffect(() => {
    if (state.open && !state.minimized) ref.current?.focus({ preventScroll: true });
  }, [state.open, state.minimized]);

  if (!state.open) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    if (mobile || e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
    drag.current = { dx: e.clientX - state.x, dy: e.clientY - state.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight - TASKBAR_H;
    const x = Math.min(Math.max(e.clientX - drag.current.dx, 120 - width), vw - 120);
    const y = Math.min(Math.max(e.clientY - drag.current.dy, 0), vh - 30);
    moveWindow(id, x, y);
  };
  const endDrag = () => {
    drag.current = null;
  };

  const style: React.CSSProperties = mobile
    ? { inset: `0 0 ${TASKBAR_H}px 0`, zIndex: 10 + z }
    : {
        left: state.x,
        top: state.y,
        width: `min(${width}px, calc(100vw - 16px))`,
        height: `min(${height}px, calc(100dvh - ${TASKBAR_H + 16}px))`,
        zIndex: 10 + z,
        visibility: state.x < 0 ? "hidden" : undefined,
      };

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-labelledby={`win-${id}-title`}
      data-testid={`window-${id}`}
      data-active={active}
      className="win outline-none"
      hidden={state.minimized}
      style={style}
      onPointerDownCapture={() => focus(id)}
      onFocusCapture={() => focus(id)}
    >
      <div
        className="win-title"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={() => !mobile && moveWindow(id, -1, -1)}
      >
        <span className="grid h-4 w-4 place-items-center">{icon}</span>
        <h2 id={`win-${id}-title`}>{WINDOW_TITLES[id]}</h2>
        <button className="cap-btn" aria-label={`Minimize ${WINDOW_TITLES[id]}`} onClick={() => minimize(id)}>
          <MinGlyph size={12} />
        </button>
        <button className="cap-btn ml-0.5" aria-label={`Close ${WINDOW_TITLES[id]}`} onClick={() => closeWindow(id)}>
          <CloseGlyph size={11} />
        </button>
      </div>
      <div className="mt-[3px] flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}
