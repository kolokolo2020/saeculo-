"use client";

import { useEffect, useRef } from "react";
import { beatInfo } from "./spectrum";

// A small LED that blinks on every beat of the playing track (brighter on
// the one). Animated through its own rAF, not React state.
export default function BeatLed({ color, reducedMotion }: { color: string; reducedMotion: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (reducedMotion) return;
    let raf = 0;
    const tick = () => {
      const b = beatInfo();
      const el = ref.current;
      if (el) {
        const p = b ? b.pulse * (b.beat % 4 === 0 ? 1 : 0.6) : 0;
        el.style.opacity = String(0.25 + p * 0.75);
        el.style.boxShadow = `0 0 ${2 + p * 10}px ${color}`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [color, reducedMotion]);
  return <span ref={ref} className="inline-block h-2 w-2 rounded-full opacity-25" style={{ background: color }} aria-hidden />;
}
