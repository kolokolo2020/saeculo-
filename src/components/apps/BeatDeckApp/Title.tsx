"use client";

import { useState } from "react";
import { CARD_BY_ID, DECKS, type DeckKind } from "@/lib/beatdeck/cards";
import { ROUNDS } from "@/lib/beatdeck/rounds";
import { BEAT_TYPES } from "@/lib/beatdeck/scoring";
import { CERTS } from "@/lib/beatdeck/run";
import RecordDisc from "./RecordDisc";
import { useDeckStore } from "./deckStore";
import { warmUp } from "./sound";
import DeckCard from "./DeckCard";
import { CERT_COLOR, fmt } from "./look";

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
      <p>
        <b className="text-white">Certifications:</b> win a run to unlock the next level, from Demo up to Platinum. Each level adds a rule on top of the ones before it.
      </p>
    </div>
  );
}

// The game's front door: continue a saved run, pick a starting deck, start
// a new or daily run, read the rules, open the Crate, see your stats.
export default function Title() {
  const run = useDeckStore((s) => s.run);
  const progress = useDeckStore((s) => s.progress);
  const { start, resume, go } = useDeckStore.getState();
  const [rules, setRules] = useState(false);
  const [deck, setDeck] = useState<DeckKind>("classic");
  // start at the highest level unlocked; the state initializer runs after hydration
  const [cert, setCert] = useState(() => progress.cert);
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

      <div className="grid w-full max-w-[560px] grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Starting deck">
        {DECKS.map((d) => {
          const locked = !progress.unlocked.includes(d.id);
          const on = deck === d.id;
          return (
            <button
              key={d.id}
              role="radio"
              aria-checked={on}
              aria-label={`${d.name} deck${locked ? " (locked)" : ""}`}
              disabled={locked}
              onClick={() => setDeck(d.id)}
              className={`flex flex-col gap-0.5 rounded-[6px] border p-2 text-left ${
                on ? "border-[#6fb4ff] bg-[#1f6fd1]/30 shadow-[0_0_12px_rgba(80,170,255,0.4)]" : "border-white/10 bg-black/30"
              } disabled:opacity-60`}
            >
              <span className="text-[12.5px] font-semibold text-white">
                {locked ? "🔒 " : ""}
                {d.name}
              </span>
              <span className="text-[10.5px] leading-snug text-[#9fb2c9]">{locked ? d.unlock : d.text}</span>
            </button>
          );
        })}
      </div>

      <div className="flex w-full max-w-[560px] flex-col items-center gap-2">
        <div className="flex flex-wrap justify-center gap-1" role="radiogroup" aria-label="Certification">
          {CERTS.map((c, i) => {
            const locked = i > progress.cert;
            const on = cert === i;
            return (
              <button
                key={c.name}
                role="radio"
                aria-checked={on}
                aria-label={`${c.name} certification${locked ? " (locked)" : ""}`}
                disabled={locked}
                title={locked ? "Win a run at the level before to unlock" : c.rule}
                onClick={() => setCert(i)}
                className={`flex flex-col items-center gap-1 rounded-[6px] border px-2 py-1.5 ${
                  on ? "bg-white/10" : "border-transparent hover:bg-white/5"
                } disabled:hover:bg-transparent`}
                style={on ? { borderColor: CERT_COLOR[i], boxShadow: `0 0 10px ${CERT_COLOR[i]}55` } : undefined}
              >
                <span className="relative">
                  <RecordDisc level={i} dim={locked} />
                  {progress.certBest >= i && (
                    <span className="absolute -right-1 -bottom-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-[#25b025] text-[9px] text-white" title="Won">
                      ✓
                    </span>
                  )}
                </span>
                <span className={`text-[10.5px] ${locked ? "text-[#5d6b80]" : on ? "text-white" : "text-[#9fb2c9]"}`}>{locked ? "🔒" : c.name}</span>
              </button>
            );
          })}
        </div>
        <p className="min-h-[2.4em] max-w-[420px] text-center text-[11.5px] leading-snug text-[#9fb2c9]" aria-live="polite">
          {cert === 0
            ? progress.cert === 0
              ? "Demo: the standard game. Win a run to unlock the Mixtape certification."
              : "Demo: the standard game."
            : CERTS.slice(1, cert + 1)
                .map((c) => c.rule.replace(/\.$/, ""))
                .join(" · ")}
        </p>
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
            start(false, deck, cert);
          }}
          className={`${canContinue ? "aero-btn-dark" : "aero-btn aero-btn-primary"} py-2 text-[14px]`}
        >
          New run{cert > 0 ? ` · ${CERTS[cert].name}` : ""}
        </button>
        <button
          onClick={() => {
            warmUp();
            start(true, "classic");
          }}
          className="aero-btn-dark py-2 text-[13px]"
        >
          Daily run <span className="text-[#9fb2c9]">· same shuffle for everyone today</span>
        </button>
        <div className="flex gap-2">
          <button onClick={() => setRules((v) => !v)} aria-expanded={rules} className="aero-btn-dark flex-1 py-1.5 text-[12.5px]">
            How to play
          </button>
          <button onClick={() => go("crate")} className="aero-btn-dark flex-1 py-1.5 text-[12.5px]">
            The Crate
          </button>
        </div>
      </div>

      {rules && (
        <div className="w-full max-w-[560px] rounded-[6px] border border-white/10 bg-black/35 p-4">
          <HowTo />
        </div>
      )}

      <dl className="grid grid-cols-5 gap-x-4 gap-y-0.5 text-center font-mono text-[11px] text-[#7f93ad] max-sm:grid-cols-3" aria-label="Your stats">
        {(
          [
            ["Runs", progress.runs],
            ["Wins", progress.wins],
            ["Best run", fmt(progress.bestTotal)],
            ["Best take", fmt(progress.bestTake)],
            ["Furthest", progress.furthest >= 9 ? (progress.furthest > 9 ? `R${progress.furthest}` : "album") : progress.furthest ? `R${progress.furthest}` : "—"],
          ] as const
        ).map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd className="text-[13px] text-white">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
