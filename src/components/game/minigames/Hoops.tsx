"use client";

import { useEffect, useRef, useState } from "react";
import Frame, { miniBtn } from "./Frame";

// Shooting hoops: the bar swings, you let go in the green. Three shots.
// Play for five dollars against the two on the court and make two of three
// to double it.

export default function Hoops({ cash, reduced, onShot, onSettle, onClose }: { cash: number; reduced: boolean; onShot: (made: boolean) => void; onSettle: (delta: number) => void; onClose: () => void }) {
  const [stake, setStake] = useState(0);
  const [shots, setShots] = useState<boolean[]>([]);
  const [pos, setPos] = useState(0);
  const [line, setLine] = useState("“Three shots. Make two and you're not embarrassing.”");
  const t0 = useRef(0);
  const done = shots.length >= 3;
  // the sweet spot moves a little every shot
  const spot = 0.58 + ((shots.length * 0.17) % 0.3) - 0.15;
  const speed = 1.15 + shots.length * 0.2;

  useEffect(() => {
    if (done) return;
    let raf = 0;
    if (!t0.current) t0.current = performance.now();
    const tick = (now: number) => {
      const x = ((now - t0.current) / 1000) * speed;
      setPos(reduced ? (x % 2 < 1 ? x % 1 : 1 - (x % 1)) : 0.5 - Math.cos(x * Math.PI) * 0.5);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [done, speed, reduced]);

  const shoot = () => {
    if (done) return;
    const made = Math.abs(pos - spot) < 0.075;
    const next = [...shots, made];
    setShots(next);
    onShot(made);
    setLine(made ? (Math.abs(pos - spot) < 0.03 ? "Swish. Nothing but net." : "Off the glass and in.") : pos < spot ? "Short. The rim rattles." : "Long. Off the back of the rim.");
    if (next.length === 3) {
      const makes = next.filter(Boolean).length;
      if (stake) {
        onSettle(makes >= 2 ? stake : -stake);
        setLine(makes >= 2 ? `${makes} of 3. They pay up: $${stake}.` : `${makes} of 3. “Thanks for the fiver.”`);
      } else setLine(`${makes} of 3. ${makes === 3 ? "“Okay. Okay.”" : makes === 2 ? "“Not bad.”" : "“Next.”"}`);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.code === "Space" || e.code === "KeyE" || e.code === "Enter") && !(e.target as HTMLElement).closest("button")) {
        e.preventDefault();
        shoot();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <Frame title="Hoops" sub={stake ? `for $${stake}` : "for nothing"} onClose={onClose} testid="hoops">
      <div className="flex flex-col gap-3">
        <div className="relative h-8 w-full rounded-[2px] bg-[#1d1b19]" aria-hidden>
          <div className="absolute inset-y-0 rounded-[2px] bg-[#2f6b3a]" style={{ left: `${(spot - 0.075) * 100}%`, width: "15%" }} />
          <div className="absolute inset-y-0 bg-[#7ddc3a]" style={{ left: `${(spot - 0.03) * 100}%`, width: "6%" }} />
          <div className="absolute -inset-y-1 w-1.5 bg-[#e8e0cf]" style={{ left: `calc(${pos * 100}% - 3px)` }} />
        </div>
        <p aria-live="polite" data-testid="hoops-line">
          {line}
        </p>
        <p className="text-[18px]">{[0, 1, 2].map((i) => (shots[i] === undefined ? "○" : shots[i] ? "●" : "×")).join(" ")}</p>
        {!done ? (
          <button
            className={miniBtn}
            // on a touch screen the shot goes the moment your finger lands, not when it lifts
            onPointerDown={(e) => {
              if (e.pointerType === "mouse") return;
              e.preventDefault();
              shoot();
            }}
            onClick={(e) => {
              const kind = (e.nativeEvent as PointerEvent).pointerType;
              if (kind !== "touch" && kind !== "pen") shoot();
            }}
            data-autofocus
            data-testid="hoops-shoot"
          >
            Shoot<span className="hidden pointer-fine:inline"> (Space)</span>
          </button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              className={miniBtn}
              onClick={() => {
                setShots([]);
                setStake(0);
                t0.current = performance.now();
              }}
            >
              Again
            </button>
            <button
              className={miniBtn}
              disabled={cash < 5}
              onClick={() => {
                setShots([]);
                setStake(5);
                setLine("“Five says you miss two.”");
                t0.current = performance.now();
              }}
            >
              Play them for $5
            </button>
          </div>
        )}
      </div>
    </Frame>
  );
}
