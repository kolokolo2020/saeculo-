"use client";

import { useEffect, useState } from "react";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "wheel", "scroll"] as const;

export function useIdleTimer(timeoutMs: number): boolean {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const reset = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), timeoutMs);
    };

    reset();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, reset, { passive: true }));

    return () => {
      clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [timeoutMs]);

  return idle;
}
