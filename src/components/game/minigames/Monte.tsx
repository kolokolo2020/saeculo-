"use client";

import { useEffect, useRef, useState } from "react";
import Frame, { miniBtn } from "./Frame";

// Cups on a crate outside the laundromat: Slick shows you the ball, then
// shuffles. Find it and he pays even money. The more you bet, the faster
// his hands. It's honest, as far as anyone can tell.

const BETS = [5, 20, 50];
const SWAPS: Record<number, { n: number; ms: number }> = { 5: { n: 5, ms: 420 }, 20: { n: 8, ms: 300 }, 50: { n: 12, ms: 200 } };

export default function Monte({ cash, reduced, onSettle, onClose }: { cash: number; reduced: boolean; onSettle: (delta: number) => void; onClose: () => void }) {
  const [bet, setBet] = useState(5);
  // where each cup sits (slot 0..2), and which cup has the ball
  const [slots, setSlots] = useState([0, 1, 2]);
  const [ball, setBall] = useState(1);
  const [phase, setPhase] = useState<"show" | "peek" | "shuffle" | "pick" | "reveal">("show");
  const [picked, setPicked] = useState<number | null>(null);
  const [line, setLine] = useState("“Keep your eye on the ball. Easy money. Easy.”");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const go = () => {
    if (bet > cash || phase === "shuffle" || phase === "peek") return;
    setPicked(null);
    setBall(Math.floor(Math.random() * 3));
    setSlots([0, 1, 2]);
    setPhase("peek");
    setLine("He lifts the cup, shows you the ball, and his hands start moving.");
    const { n, ms } = SWAPS[bet];
    let k = 0;
    const step = () => {
      setSlots((s) => {
        const a = Math.floor(Math.random() * 3);
        const b = (a + 1 + Math.floor(Math.random() * 2)) % 3;
        return s.map((v) => (v === a ? b : v === b ? a : v));
      });
      if (++k < n) timer.current = setTimeout(step, reduced ? Math.max(ms, 380) : ms);
      else
        timer.current = setTimeout(() => {
          setPhase("pick");
          setLine("He takes his hands away. “Go on then. Which one?”");
        }, ms);
    };
    timer.current = setTimeout(() => {
      setPhase("shuffle");
      step();
    }, 900);
  };

  const pick = (cup: number) => {
    if (phase !== "pick") return;
    setPicked(cup);
    setPhase("reveal");
    const won = cup === ball;
    setLine(won ? `There it is. Slick sighs and counts out $${bet}.` : `Empty. He lifts the other one: there it was. “Unlucky.” $${bet} to him.`);
    onSettle(won ? bet : -bet);
  };

  return (
    <Frame title="The cups" sub="find the ball, double your money" onClose={onClose} testid="monte">
      <div className="flex flex-col gap-3">
        <div className="relative mx-auto h-[86px] w-full max-w-[300px]" aria-hidden={phase !== "pick"}>
          {[0, 1, 2].map((cup) => {
            const lifted = phase === "show" || phase === "peek" ? cup === ball : phase === "reveal" && (cup === picked || cup === ball);
            return (
              <button
                key={cup}
                className="absolute bottom-0 flex w-[30%] flex-col items-center transition-[left] disabled:cursor-default"
                style={{ left: `${slots[cup] * 35}%`, transitionDuration: reduced ? "0ms" : `${Math.round(SWAPS[bet].ms * 0.8)}ms` }}
                disabled={phase !== "pick"}
                onClick={() => pick(cup)}
                aria-label={`Cup ${slots[cup] + 1}`}
                data-testid={`monte-cup-${slots[cup]}`}
              >
                <span className={`block h-12 w-16 rounded-t-[14px] border-2 border-[#5a1a1a] bg-[#b33a3a] transition-transform ${lifted ? "-translate-y-5" : ""} ${phase === "pick" ? "hover:border-amber" : ""}`} />
                <span className={`mt-1 h-4 w-4 rounded-full ${lifted && cup === ball ? "bg-[#e8e0cf]" : "bg-transparent"}`} />
              </button>
            );
          })}
        </div>
        <p aria-live="polite" data-testid="monte-line">
          {line}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[#b9b09e]">bet</span>
          {BETS.map((b) => (
            <button key={b} className={miniBtn} aria-pressed={bet === b} disabled={b > cash || phase === "shuffle" || phase === "peek"} onClick={() => setBet(b)}>
              ${b}
            </button>
          ))}
          <button className={miniBtn} onClick={go} disabled={bet > cash || phase === "shuffle" || phase === "peek" || phase === "pick"} data-testid="monte-go">
            {phase === "show" ? "Play" : "Again"}
          </button>
        </div>
        <p className="text-[16px] text-[#8a8170]">you’ve got ${Math.floor(cash)} · bigger bets, faster hands</p>
      </div>
    </Frame>
  );
}
