"use client";

import { analysisFor } from "./analysis";

// A tiny static waveform of a whole track, for the library list.
export default function MiniWave({ id, color, cols = 48 }: { id: string; color: string; cols?: number }) {
  const data = analysisFor(id);
  if (!data) return null;
  const src = data.rms.length;
  const bars = Array.from({ length: cols }, (_, c) => {
    const a = Math.floor((c / cols) * src);
    const b = Math.max(a + 1, Math.floor(((c + 1) / cols) * src));
    let m = 0;
    for (let i = a; i < b; i++) m = Math.max(m, data.rms[i]);
    return m;
  });
  return (
    <svg viewBox={`0 0 ${cols * 2} 20`} preserveAspectRatio="none" className="h-4 w-full" aria-hidden>
      {bars.map((v, i) => (
        <rect key={i} x={i * 2} y={10 - v * 9} width="1.3" height={Math.max(0.6, v * 18)} fill={color} rx="0.4" />
      ))}
    </svg>
  );
}
