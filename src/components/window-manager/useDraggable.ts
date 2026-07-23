"use client";

import { useCallback, useRef } from "react";
import { clamp } from "@/lib/audio";
import type { WindowKind } from "@/lib/types";
import { useWindowStore } from "./windowStore";

const TASKBAR_HEIGHT = 40;

export function useDraggable(kind: WindowKind, disabled: boolean) {
  const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const { focusWindow, windows } = useWindowStore.getState();
      focusWindow(kind);
      if (disabled) return;
      if ((e.target as HTMLElement).closest("button")) return;
      const win = windows[kind];
      if (!win) return;
      dragRef.current = { offsetX: e.clientX - win.x, offsetY: e.clientY - win.y };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [kind, disabled],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      const { windows, setPosition } = useWindowStore.getState();
      const win = windows[kind];
      if (!win) return;
      const x = clamp(e.clientX - drag.offsetX, -win.width + 120, window.innerWidth - 60);
      const y = clamp(
        e.clientY - drag.offsetY,
        0,
        window.innerHeight - TASKBAR_HEIGHT - 32,
      );
      setPosition(kind, x, y);
    },
    [kind],
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLElement>) => {
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp };
}
