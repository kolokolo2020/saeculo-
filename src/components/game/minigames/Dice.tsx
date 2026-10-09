"use client";

import { useEffect, useRef, useState } from "react";
import Frame, { miniBtn } from "./Frame";

// Street dice, on a square of cardboard in the alley: you and Jay each roll
// two. Doubles beat any other roll (higher doubles beat lower); otherwise
// the higher total takes it. Even money. A tie rolls again.

const FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const roll = () => 1 + Math.floor(Math.random() * 6);
/** Doubles rank above every total. */
const rank = ([a, b]: number[]) => (a === b ? 100 + a : a + b);

export default function Dice({ cash, onSettle, onRolling, onClose }: { cash: number; onSettle: (delta: number) => void; onRolling: (on: boolean) => void; onClose: () => void }) {
  const [bet, setBet] = useState(5);
  const [mine, setMine] = useState([1, 1]);
  const [theirs, setTheirs] = useState([1, 1]);
  const [rolling, setRolling] = useState(false);
  const [line, setLine] = useState("Jay shakes the dice at you. “You in?”");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    onRolling(false);
  }, [onRolling]);

  const go = () => {
    if (rolling || bet > cash) return;
    setRolling(true);
    onRolling(true);
    let n = 0;
    timer.current = setInterval(() => {
      setMine([roll(), roll()]);
      setTheirs([roll(), roll()]);
      if (++n < 9) return;
      clearInterval(timer.current!);
      let a = [roll(), roll()];
      let b = [roll(), roll()];
      while (rank(a) === rank(b)) {
        a = [roll(), roll()];
        b = [roll(), roll()];
      }
      setMine(a);
      setTheirs(b);
      setRolling(false);
      onRolling(false);
      const won = rank(a) > rank(b);
      const dbl = a[0] === a[1];
      setLine(won ? (dbl ? `Doubles. Jay swears and pays $${bet}.` : `${a[0] + a[1]} beats ${b[0] + b[1]}. $${bet} to you.`) : b[0] === b[1] ? `Jay rolls doubles. Your $${bet} is his.` : `${b[0] + b[1]} beats ${a[0] + a[1]}. Jay takes $${bet}.`);
      onSettle(won ? bet : -bet);
    }, 70);
  };

  return (
    <Frame title="Street dice" sub="doubles beat anything" onClose={onClose} testid="dice">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <p className="text-[17px] text-[#b9b09e]">you</p>
            <p className="text-[56px] leading-none" aria-label={`You: ${mine.join(" and ")}`}>
              {mine.map((d) => FACES[d - 1]).join(" ")}
            </p>
          </div>
          <div>
            <p className="text-[17px] text-[#b9b09e]">Jay</p>
            <p className="text-[56px] leading-none" aria-label={`Jay: ${theirs.join(" and ")}`}>
              {theirs.map((d) => FACES[d - 1]).join(" ")}
            </p>
          </div>
        </div>
        <p aria-live="polite" data-testid="dice-line">
          {line}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[#b9b09e]">bet</span>
          {[5, 10, 20].map((b) => (
            <button key={b} className={miniBtn} aria-pressed={bet === b} disabled={b > cash} onClick={() => setBet(b)}>
              ${b}
            </button>
          ))}
          <span className="ml-auto text-[#b9b09e]">you’ve got ${Math.floor(cash)}</span>
        </div>
        <button className={miniBtn} onClick={go} disabled={rolling || bet > cash} data-autofocus data-testid="dice-roll">
          {bet > cash ? "Not enough on you" : rolling ? "…" : `Roll for $${bet}`}
        </button>
      </div>
    </Frame>
  );
}
