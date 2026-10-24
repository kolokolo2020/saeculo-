"use client";

import { useEffect, useRef, useState } from "react";
import Frame, { miniBtn } from "./Frame";

// A freestyle battle in the cypher: four rounds. They spit a bar at you,
// you pick your comeback before the beat comes round (the bar under the
// choices runs out). The one that rhymes and flips what they said takes the
// crowd; a clever line that doesn't rhyme gets something; a weak one gets
// groans. Answer quick for a bit extra. Beat their score to win.

interface Round {
  them: string;
  bars: { text: string; pts: number }[];
}
const ROUNDS: Round[] = [
  { them: "“You make beats in your bedroom, that's cute, that's a hobby.”", bars: [{ text: "“My bedroom's a label, your crib's just a lobby.”", pts: 3 }, { text: "“At least I make something. You just talk.”", pts: 1 }, { text: "“Yeah well. Your trainers are dirty.”", pts: 0 }] },
  { them: "“Your sound's so quiet, nobody's heard it.”", bars: [{ text: "“Ask your girl who's on repeat, she'll confirm it.”", pts: 3 }, { text: "“The charts say different. Check the charts.”", pts: 1 }, { text: "“I've got followers. Loads.”", pts: 0 }] },
  { them: "“I've been under this bridge since you were in nappies.”", bars: [{ text: "“And you're still under it, so who's really happy?”", pts: 3 }, { text: "“Time served doesn't mean you're good at it.”", pts: 1 }, { text: "“That's quite a long time actually.”", pts: 0 }] },
  { them: "“Your flow's so stiff, it's practically a statue.”", bars: [{ text: "“They build statues for legends: that's why they never made you.”", pts: 3 }, { text: "“Stiff? I'm the one they're nodding to.”", pts: 1 }, { text: "“No it isn't.”", pts: 0 }] },
  { them: "“You rap like you're reading it off of your phone.”", bars: [{ text: "“My phone's full of features, your feature's alone.”", pts: 3 }, { text: "“At least my phone rings. Yours never does.”", pts: 1 }, { text: "“I've memorised all of it, I'll have you know.”", pts: 0 }] },
  { them: "“You're a producer, stay behind the desk.”", bars: [{ text: "“I built the desk, the booth, and the stage you got left.”", pts: 3 }, { text: "“The beat you're on right now? I made that.”", pts: 1 }, { text: "“The desk's comfy, to be fair.”", pts: 0 }] },
  { them: "“Your chain's so fake it turned your neck green.”", bars: [{ text: "“Green's the colour of money, I'm the one getting seen.”", pts: 3 }, { text: "“It's real. I've got the receipt somewhere.”", pts: 1 }, { text: "“My neck's always been that colour.”", pts: 0 }] },
  { them: "“Nobody here even knows your name.”", bars: [{ text: "“They chant it at the club: you just came for the fame.”", pts: 3 }, { text: "“Check the flyer. Top line.”", pts: 1 }, { text: "“It's on my phone if you want it.”", pts: 0 }] },
];
const TIME = 6;

const shuffle = <T,>(xs: T[]) => xs.map((x) => [Math.random(), x] as const).sort((a, b) => a[0] - b[0]).map(([, x]) => x);

export default function Freestyle({ opponent, reduced, onFinish, onClose }: { opponent: string; reduced: boolean; onFinish: (won: boolean, score: number, theirs: number) => void; onClose: () => void }) {
  // four rounds, the comebacks in a different order each time
  const [rounds] = useState(() => shuffle(ROUNDS).slice(0, 4).map((r) => ({ ...r, bars: shuffle(r.bars) })));
  // what they score per round, out of 4 (a strong MC, but not perfect)
  const [theirs] = useState(() => rounds.map(() => 2 + Math.floor(Math.random() * 2.4)));
  const [i, setI] = useState(-1);
  const [mine, setMine] = useState<number[]>([]);
  const [left, setLeft] = useState(TIME);
  const [line, setLine] = useState(`${opponent} steps into the middle. The circle closes up. “Four rounds. Go on then.”`);
  const t0 = useRef(0);
  const done = mine.length >= rounds.length;
  const total = mine.reduce((a, b) => a + b, 0);
  const them = theirs.reduce((a, b) => a + b, 0);

  const answer = (k: number) => {
    if (i < 0 || mine.length > i) return;
    const bar = rounds[i].bars[k];
    // quick answers get the crowd going: up to one extra point
    const pts = bar ? bar.pts + (bar.pts === 3 && left > TIME / 2 ? 1 : 0) : 0;
    const next = [...mine, pts];
    setMine(next);
    setLine(!bar ? "You freeze. The beat comes round without you. Somebody laughs." : bar.pts === 3 ? "The circle goes up. Someone grabs the person next to them." : bar.pts === 1 ? "A few nods. It landed, sort of." : "Groans. Someone covers their face for you.");
    if (next.length >= rounds.length) {
      const sum = next.reduce((a, b) => a + b, 0);
      const won = sum > them;
      window.setTimeout(() => setLine(won ? `${sum} to ${them}. The circle picks you. ${opponent} nods, once.` : `${sum} to ${them}. ${opponent} takes it. “Come back when you mean it.”`), 900);
      onFinish(won, sum, them);
    }
  };

  // the beat coming round: the time you've got to answer
  useEffect(() => {
    if (i < 0 || done || mine.length > i) return;
    let raf = 0;
    t0.current = performance.now();
    const tick = (now: number) => {
      const l = Math.max(0, TIME - (now - t0.current) / 1000);
      setLeft(l);
      if (l <= 0) answer(-1);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // answer reads the latest state through closures set per round
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, done]);

  // 1, 2, 3 pick a bar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = ["Digit1", "Digit2", "Digit3"].indexOf(e.code);
      if (k >= 0) answer(k);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const r = i >= 0 && i < rounds.length ? rounds[i] : null;
  const waiting = r && mine.length > i;
  return (
    <Frame title="Freestyle battle" sub={`you vs ${opponent}`} onClose={onClose} testid="freestyle" wide>
      <div className="flex flex-col gap-3">
        <p className="text-[17px] text-[#b9b09e]">
          you {total} · {opponent} {theirs.slice(0, mine.length).reduce((a, b) => a + b, 0)}
          {r && ` · round ${i + 1}/${rounds.length}`}
        </p>
        {r && <p className="text-[#ffcf7a]">{r.them}</p>}
        <p aria-live="polite" data-testid="freestyle-line">
          {line}
        </p>
        {i < 0 && (
          <button className={miniBtn} onClick={() => setI(0)} data-testid="freestyle-start" data-autofocus>
            Step in
          </button>
        )}
        {r && !waiting && (
          <>
            <div className="flex flex-col gap-1.5">
              {r.bars.map((b, k) => (
                <button key={b.text} className={`${miniBtn} text-left`} onClick={() => answer(k)} data-testid={`freestyle-bar-${k}`}>
                  <span className="mr-2 text-amber">{k + 1}</span>
                  {b.text}
                </button>
              ))}
            </div>
            <div className="h-2 w-full rounded-full bg-[#2a2724]" aria-hidden>
              <div className={`h-2 rounded-full ${left < 2 ? "bg-[#ff7a6a]" : "bg-amber"}`} style={{ width: `${(left / TIME) * 100}%`, transition: reduced ? "none" : undefined }} />
            </div>
          </>
        )}
        {waiting && !done && (
          <button className={miniBtn} onClick={() => setI(i + 1)} data-testid="freestyle-next" data-autofocus>
            Next round
          </button>
        )}
        {done && <p className="text-amber" data-testid="freestyle-result">{total > them ? "You won the cypher." : "They took it this time."}</p>}
      </div>
    </Frame>
  );
}
