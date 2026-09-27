"use client";

import { useState } from "react";
import { CARD_BY_ID } from "@/lib/beatdeck/cards";
import { ROUNDS } from "@/lib/beatdeck/rounds";
import { BEAT_TYPES } from "@/lib/beatdeck/scoring";
import { useDeckStore } from "./deckStore";
import { warmUp } from "./sound";
import DeckCard from "./DeckCard";
import { fmt } from "./look";

const FAN = ["kick-trap", "mel-rhodes", "bass-808"];

function HowTo() {
  return (
    <div className="flex flex-col gap-2 text-[12.5px] leading-snug text-[#c9d6e6]">
      <p>
        <b className="text-white">Each round, a client wants a beat.</b> Hit their target score within 4 takes. Beat all {ROUNDS} rounds to release the album.
      </p>
      <p>
        <b className="text-white">Build a take:</b> pick up to 5 cards from your hand. Every card is a one-bar pattern (a kick, a hi-hat groove, an 808 line, a chop from a saeculo track…). Press <b className="text-white">Play take</b> and the loop plays and scores.
      </p>
      <p>
        <b className="text-white">Score = groove × hype.</b> The roles you cover decide the beat type and its base. Every hit adds groove. Bonuses add hype: one genre across 3+ cards (+2), the client&apos;s request, your gear. Kick and bass on the same step is a <i>knock</i> (+2 groove).
      </p>
      <table className="w-full font-mono text-[11.5px]">
        <tbody>
          {BEAT_TYPES.map((t) => (
            <tr key={t.id} className="border-b border-white/5">
              <td className="py-0.5 text-white">{t.name}</td>
              <td className="py-0.5 text-[#9fb2c9]">{t.needs}</td>
              <td className="py-0.5 text-right whitespace-nowrap">
                <span className="text-[#6fb4ff]">{t.groove}</span> × <span className="text-[#ff8fc6]">{t.hype}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        <b className="text-white">Redraw</b> swaps the selected cards (3 per round). Between rounds, the <b className="text-white">shop</b> sells gear (rule-bending upgrades, up to 5), new sounds, studio time that levels up a beat type, and a card removal.
      </p>
      <p>
        <b className="text-white">Bosses</b> in rounds 3, 6 and 8 each bring a rule. Some say the first one drops something worth keeping.
      </p>
    </div>
  );
}

// The game's front door: continue a saved run, start a new or daily one,
// read the rules, see your bests.
export default function Title() {
  const run = useDeckStore((s) => s.run);
  const bests = useDeckStore((s) => s.bests);
  const { start, resume } = useDeckStore.getState();
  const [rules, setRules] = useState(false);
  const canContinue = run && run.phase !== "over" && run.phase !== "victory";

  return (
    <div className="dark-scroll flex h-full flex-col items-center gap-5 overflow-y-auto bg-[radial-gradient(ellipse_at_50%_0%,rgba(57,166,255,0.25),transparent_60%)] px-4 py-6 text-[#e6eef8]">
      <div className="flex flex-col items-center gap-1 text-center">
        <h2 className="font-pixel text-[26px] text-white [text-shadow:0_0_18px_rgba(80,170,255,0.9)] max-sm:text-[20px]">BEAT DECK</h2>
        <p className="text-[12.5px] text-[#9fb2c9]">a beatmaking card game by saeculo</p>
      </div>

      <div className="flex -space-x-6 py-2" aria-hidden>
        {FAN.map((id, i) => (
          <div key={id} style={{ transform: `rotate(${(i - 1) * 9}deg) translateY(${i === 1 ? -8 : 0}px)` }}>
            <DeckCard def={CARD_BY_ID[id]} compact />
          </div>
        ))}
      </div>

      <div className="flex w-full max-w-[300px] flex-col gap-2">
        {canContinue && (
          <button
            onClick={() => {
              warmUp();
              resume();
            }}
            className="aero-btn aero-btn-primary py-2 text-[14px]"
          >
            Continue — round {run.round}/{ROUNDS}
            {run.daily ? " (daily)" : ""}
          </button>
        )}
        <button
          onClick={() => {
            warmUp();
            start(false);
          }}
          className={`${canContinue ? "aero-btn-dark" : "aero-btn aero-btn-primary"} py-2 text-[14px]`}
        >
          New run
        </button>
        <button
          onClick={() => {
            warmUp();
            start(true);
          }}
          className="aero-btn-dark py-2 text-[13px]"
        >
          Daily run <span className="text-[#9fb2c9]">· same shuffle for everyone today</span>
        </button>
        <button onClick={() => setRules((v) => !v)} aria-expanded={rules} className="aero-btn-dark py-1.5 text-[12.5px]">
          How to play
        </button>
      </div>

      {rules && (
        <div className="w-full max-w-[560px] rounded-[6px] border border-white/10 bg-black/35 p-4">
          <HowTo />
        </div>
      )}

      <p className="text-center font-mono text-[11.5px] text-[#7f93ad]">
        Best score {fmt(bests.score)} · Furthest {bests.round >= 9 ? "album out" : bests.round ? `round ${bests.round}` : "—"} · Wins {bests.wins}
      </p>
    </div>
  );
}
