"use client";

import { useSyncExternalStore } from "react";

// True between midnight and 4 am, local time. Checked once a minute.
const isLate = () => new Date().getHours() < 4;

function subscribe(callback: () => void) {
  const id = setInterval(callback, 60_000);
  return () => clearInterval(id);
}

export function useLateNight(): boolean {
  return useSyncExternalStore(subscribe, isLate, () => false);
}
