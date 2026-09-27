"use client";

import { useSyncExternalStore } from "react";

// Narrow screens, and phones held sideways (short and touch-first): both
// get one full-screen window at a time.
const QUERY = "(max-width: 768px), (max-height: 500px) and (pointer: coarse)";

function subscribe(callback: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
