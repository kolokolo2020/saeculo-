"use client";

import { useEffect, useRef, useState } from "react";
import Frame, { miniBtn } from "./Frame";

// Your name on the alley wall. Pick a colour, then hold the button (or E,
// or Space) to spray; let go when the torch from the street swings this
// way, or you'll have to start again.

const COLORS = ["#4fe3ff", "#a98bff", "#ffd23a", "#7ddc3a", "#ff6a9a", "#e8e0cf"];
const NEED = 2.6;

export default function Tag({ name, onDone, onSpray, onClose }: { name: string; onDone: (color: string) => void; onSpray: () => void; onClose: () => void }) {
  const [color, setColor] = useState(COLORS[0]);
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const [torch, setTorch] = useState(false);
  const [line, setLine] = useState("Hold to spray. Watch the mouth of the alley.");
  const [done, setDone] = useState(false);
  const p = useRef(0);
  const hold = useRef(false);

  useEffect(() => {
    if (done) return;
    let raf = 0;
    let last = performance.now();
    let sprayAt = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // the torch comes past every few seconds, for a second
      const k = ((now - t0) / 1000) % 4.2;
      const lit = k > 2.8 && k < 3.9;
      setTorch(lit);
      if (hold.current) {
        if (lit) {
          hold.current = false;
          setHolding(false);
          p.current = 0;
          setLine("A torch from the street. You flatten against the wall till it's gone. Start again.");
        } else {
          p.current = Math.min(NEED, p.current + dt);
          if (now - sprayAt > 400) {
            sprayAt = now;
            onSpray();
          }
          if (p.current >= NEED) {
            setDone(true);
            setLine("Done. It drips a little. It's perfect.");
            onDone(color);
          }
        }
      }
      setProgress(p.current / NEED);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [done, color, onDone, onSpray]);

  const start = () => {
    if (done) return;
    hold.current = true;
    setHolding(true);
  };
  const stop = () => {
    hold.current = false;
    setHolding(false);
  };
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.code === "Space" || e.code === "KeyE") && !e.repeat) {
        e.preventDefault();
        start();
      }
    };
    const up = (e: KeyboardEvent) => (e.code === "Space" || e.code === "KeyE") && stop();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  });

  const letters = name.toUpperCase().slice(0, 10);
  const shown = Math.ceil(letters.length * progress);
  return (
    <Frame title="The wall" sub="get your name up" onClose={onClose} testid="tag">
      <div className="flex flex-col gap-3">
        <div className={`relative grid h-24 place-items-center overflow-hidden rounded-[2px] bg-[#4a2a24] ${torch ? "ring-2 ring-[#fff3c0]" : ""}`}>
          <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0_11px,#3a201c_11px_12px)] opacity-70" aria-hidden />
          <p className="relative text-[44px] tracking-[0.1em]" style={{ color, textShadow: "2px 2px 0 rgba(0,0,0,0.5)" }} aria-label={`${letters}, ${Math.round(progress * 100)}% sprayed`}>
            {letters.slice(0, shown)}
            <span className="opacity-15">{letters.slice(shown)}</span>
          </p>
          {torch && <div className="absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(ellipse_at_right,rgba(255,243,192,0.5),transparent_70%)]" aria-hidden />}
        </div>
        <p aria-live="polite">{torch ? "Torch!" : line}</p>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Colour">
          {COLORS.map((c) => (
            <button key={c} role="radio" aria-checked={color === c} aria-label={`colour ${c}`} disabled={progress > 0 && !done} onClick={() => setColor(c)} className="h-8 w-8 rounded-[2px] border-2 border-[#2a2724] aria-checked:border-amber" style={{ background: c }} />
          ))}
        </div>
        <button
          className={miniBtn}
          disabled={done}
          aria-pressed={holding}
          onPointerDown={start}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
          onContextMenu={(e) => e.preventDefault()}
          data-testid="tag-spray"
        >
          {done ? "Done" : <>Hold to spray<span className="hidden pointer-fine:inline"> (E)</span></>}
        </button>
      </div>
    </Frame>
  );
}
