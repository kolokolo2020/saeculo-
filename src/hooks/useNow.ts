"use client";

import { useSyncExternalStore } from "react";

// One shared 1-second ticker for every clock on screen (taskbar tray and
// the sidebar clock gadget). The snapshot is cached in module scope so
// repeated getSnapshot() calls within a render always agree.
let now = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/** Epoch milliseconds, updated every second; 0 during SSR and first paint. */
export function useNow(): number {
  return useSyncExternalStore(
    subscribe,
    () => now,
    () => 0,
  );
}
