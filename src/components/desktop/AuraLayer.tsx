"use client";

import { useEffect, useState } from "react";
import type { Atmosphere } from "./personalizeStore";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

// The late-night layer over everything: film grain, faint scanlines, a
// vignette, and now and then a signal dropout rolling down the screen, as
// if the whole desktop were a worn tape. Pointer-transparent and hidden
// from assistive tech; Clean turns it off.

let tile: string | null = null;
/** A small tile of monochrome noise, drawn once and reused as a background. */
function grainTile() {
  if (tile) return tile;
  const c = document.createElement("canvas");
  c.width = c.height = 160;
  const g = c.getContext("2d");
  if (!g) return "";
  const img = g.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  tile = c.toDataURL("image/png");
  return tile;
}

/** Fire a dropout now (tests, and the haunted events). */
export const triggerSignalDrop = () => window.dispatchEvent(new Event("aura:drop"));

export default function AuraLayer({ atmosphere }: { atmosphere: Atmosphere }) {
  const reduced = usePrefersReducedMotion();
  const [noise, setNoise] = useState("");
  const [drop, setDrop] = useState(0);

  useEffect(() => {
    if (atmosphere === "clean") return;
    const id = requestAnimationFrame(() => setNoise(grainTile()));
    return () => cancelAnimationFrame(id);
  }, [atmosphere]);

  // dropouts: rare in Tape, more often after midnight
  useEffect(() => {
    if (atmosphere === "clean" || reduced) return;
    let timer: ReturnType<typeof setTimeout>;
    const [lo, hi] = atmosphere === "midnight" ? [35, 90] : [80, 220];
    const schedule = () => {
      timer = setTimeout(() => {
        if (!document.hidden) setDrop((n) => n + 1);
        schedule();
      }, (lo + Math.random() * (hi - lo)) * 1000);
    };
    schedule();
    const now = () => setDrop((n) => n + 1);
    window.addEventListener("aura:drop", now);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("aura:drop", now);
    };
  }, [atmosphere, reduced]);

  if (atmosphere === "clean") return null;
  return (
    <div className="aura" data-atmo={atmosphere} aria-hidden data-testid="aura">
      <div className="aura-grain" style={noise ? { backgroundImage: `url(${noise})` } : undefined} />
      <div className="aura-scan" />
      <div className="aura-vignette" />
      {drop > 0 && (
        <div key={drop} className="aura-drop" style={noise ? { backgroundImage: `url(${noise})` } : undefined} onAnimationEnd={() => setDrop(0)} />
      )}
    </div>
  );
}
