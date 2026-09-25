"use client";

import { useCallback, useRef } from "react";
import type { WindowKind } from "@/lib/types";
import { MIN_WINDOW, TASKBAR_HEIGHT, useWindowStore } from "./windowStore";

// Bottom-right size grip. Same pointer-capture approach as useDraggable so
// mouse, pen, and touch all behave the same.
export function useResizable(kind: WindowKind) {
  const startRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const win = useWindowStore.getState().windows[kind];
      if (!win || win.maximized) return;
      e.stopPropagation();
      useWindowStore.getState().focusWindow(kind);
      startRef.current = { x: e.clientX, y: e.clientY, w: win.width, h: win.height };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [kind],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const start = startRef.current;
      if (!start) return;
      const { windows, setSize } = useWindowStore.getState();
      const win = windows[kind];
      if (!win) return;
      const maxW = window.innerWidth - win.x - 4;
      const maxH = window.innerHeight - TASKBAR_HEIGHT - win.y - 4;
      const w = Math.max(MIN_WINDOW.width, Math.min(maxW, start.w + e.clientX - start.x));
      const h = Math.max(MIN_WINDOW.height, Math.min(maxH, start.h + e.clientY - start.y));
      setSize(kind, w, h);
    },
    [kind],
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLElement>) => {
    startRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp };
}
