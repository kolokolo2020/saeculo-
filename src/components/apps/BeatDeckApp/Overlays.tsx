"use client";

import { useEffect, useState } from "react";
import { useSecretStore } from "@/components/secrets/secretStore";
import { CARD_BY_ID, DECK_BY_ID, rolesOf } from "@/lib/beatdeck/cards";
import { SESSION_BY_ID } from "@/lib/beatdeck/sessions";
import * as R from "@/lib/beatdeck/run";
import { SECRET_WORDS } from "@/data/secrets";
import { useDeckStore } from "./deckStore";
import { renderTakeWav, runKeyFor } from "./deckAudio";
import { playTakeLive } from "./sound";
import DeckCard from "./DeckCard";
import { ROLES, fmt } from "./look";

const NIGHT = SECRET_WORDS.find((s) => s.id === "brawl")!.word.toUpperCase();

function Panel({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-black/55 p-3" role="dialog" aria-label={label}>
      <div
        className={`dark-scroll max-h-full w-full overflow-y-auto rounded-[8px] border border-[#6fb4ff]/50 bg-gradient-to-b from-[#1b2940] to-[#0a1220] p-4 text-[#e6eef8] shadow-[0_10px_40px_rgba(0,0,0,0.7)] ${
          wide ? "max-w-[720px]" : "max-w-[380px]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function RoundWon() {
  const run = useDeckStore((s) => s.run)!;
  const round = R.roundDef(run);
  const r = run.reward!;
  const firstBoss = run.round === 3;

  // the first boss drops the vault's second word
  useEffect(() => {
    if (firstBoss) useSecretStore.getState().find("brawl");
  }, [firstBoss]);

  return (
    <Panel label="Round complete">
      <p className="font-pixel text-[11px] text-[#9fffb0]">{round.boss ? "BOSS BEATEN" : "CLIENT HAPPY"}</p>
      <p className="mt-1 text-[14px] font-semibold text-white">{round.boss ? `You got past ${round.who}.` : `${round.who} loved it.`}</p>
      <p className="text-[12px] text-[#9fb2c9]">
        {fmt(run.score)} / {fmt(run.target)}
      </p>
      <ul className="mt-3 flex flex-col gap-0.5 font-mono text-[12px]">
        <li className="flex justify-between">
          <span>Payment</span>
          <span>${r.base}</span>
        </li>
        {r.takes > 0 && (
          <li className="flex justify-between">
            <span>Unused takes</span>
            <span>${r.takes}</span>
          </li>
        )}
        {r.interest > 0 && (
          <li className="flex justify-between">
            <span>Interest</span>
            <span>${r.interest}</span>
          </li>
        )}
        {r.chain > 0 && (
          <li className="flex justify-between">
            <span>Gold Chain</span>
            <span>${r.chain}</span>
          </li>
        )}
        {r.register > 0 && (
          <li className="flex justify-between">
            <span>Cash Register</span>
            <span>${r.register}</span>
          </li>
        )}
        <li className="mt-1 flex justify-between border-t border-white/15 pt-1 font-bold text-[#9fffb0]">
          <span>Total</span>
          <span>+${r.total}</span>
        </li>
      </ul>
      {r.session && (
        <p className="mt-3 rounded-[4px] border border-[#ffd27a]/30 bg-[#ffd27a]/5 p-2 text-[12px] text-[#ffe7a3]">
          ◆ {round.who} left a studio session behind: <b>{SESSION_BY_ID[r.session].name}</b>. It&apos;s in your rack.
        </p>
      )}
      {firstBoss && (
        <p className="mt-3 rounded-[4px] border border-[#ffd27a]/40 bg-[#ffd27a]/10 p-2 font-pixel text-[8.5px] leading-relaxed text-[#ffd27a]">
          {round.who.toUpperCase()} DROPPED A SCRAP OF PAPER: &quot;{NIGHT}&quot;
        </p>
      )}
      <button onClick={useDeckStore.getState().openShop} className="aero-btn aero-btn-primary mt-4 w-full py-1.5 text-[13px]">
        Visit the shop ›
      </button>
    </Panel>
  );
}

export function Summary() {
  const run = useDeckStore((s) => s.run)!;
  const progress = useDeckStore((s) => s.progress);
  const newUnlocks = useDeckStore((s) => s.newUnlocks);
  const { start, go, goEndless } = useDeckStore.getState();
  const [status, setStatus] = useState<string | null>(null);
  const won = run.phase === "victory";
  const best = run.best;
  const key = runKeyFor(run.seed);
  const bestCards = best ? best.cards.map((id) => CARD_BY_ID[id]) : [];

  const exportBest = async () => {
    if (!best) return;
    setStatus("Rendering…");
    try {
      const blob = await renderTakeWav(bestCards, best.tempo, key);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `beat-deck-${best.typeName.toLowerCase().replace(/\s+/g, "-")}-${best.tempo}bpm.wav`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setStatus(null);
    } catch {
      setStatus("Export failed — try again.");
    }
  };

  const share = async () => {
    const text = won
      ? `I beat all 8 rounds of Beat Deck with ${fmt(run.totalScore)} points${run.daily ? " (daily run)" : ""}. ${window.location.origin}`
      : `I made it to round ${run.round} of 8 in Beat Deck (${fmt(run.totalScore)} points)${run.daily ? " on the daily run" : ""}. ${window.location.origin}`;
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied — paste it anywhere.");
    } catch {
      window.prompt("Copy this:", text);
    }
  };

  return (
    <Panel label={won ? "Run won" : "Run over"}>
      <p className={`font-pixel text-[12px] ${won ? "text-[#9fffb0]" : "text-[#ff9a8a]"}`}>
        {won ? "ALBUM OUT!" : run.endless ? "THE TOUR IS OVER" : "DROPPED BY THE LABEL"}
      </p>
      <p className="mt-1 text-[13px] text-[#c9d6e6]">
        {won
          ? "All eight clients signed off, Metro Nome included."
          : run.endless
            ? `You kept going to round ${run.round}. ${R.roundDef(run).who} finally said no.`
            : `${R.roundDef(run).who} wasn't convinced. You reached round ${run.round} of 8.`}
        {run.daily && " (Daily run)"}
      </p>
      {newUnlocks.length > 0 && (
        <p className="mt-2 rounded-[4px] border border-[#9fffb0]/40 bg-[#9fffb0]/10 p-2 text-[12px] text-[#c9ffd6]">
          Unlocked: {newUnlocks.map((d) => `${DECK_BY_ID[d].name} deck`).join(", ")}. Pick it on the title screen.
        </p>
      )}
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[12px]">
        <dt className="text-[#9fb2c9]">Total score</dt>
        <dd className="text-right text-white">{fmt(run.totalScore)}</dd>
        <dt className="text-[#9fb2c9]">Your best run</dt>
        <dd className="text-right text-white">{fmt(progress.bestTotal)}</dd>
        <dt className="text-[#9fb2c9]">Runs won</dt>
        <dd className="text-right text-white">
          {progress.wins} of {progress.runs}
        </dd>
      </dl>
      {best && (
        <div className="mt-3 rounded-[5px] border border-white/10 bg-white/5 p-2">
          <p className="text-[11px] text-[#9fb2c9]">Best take of the run</p>
          <p className="text-[13px] font-semibold text-white">
            {best.typeName} · {fmt(best.score)} pts
          </p>
          <p className="text-[11px] text-[#9fb2c9]">{bestCards.map((c) => c.name).join(" + ")}</p>
          <div className="mt-2 flex gap-2">
            <button onClick={() => playTakeLive(bestCards, best.tempo, key, 4, 0.05)} className="aero-btn-dark px-2.5 py-1 text-[11.5px]">
              ▶ Listen
            </button>
            <button onClick={() => void exportBest()} className="aero-btn-dark px-2.5 py-1 text-[11.5px]">
              Export .wav
            </button>
          </div>
        </div>
      )}
      {status && (
        <p className="mt-2 text-[11.5px] text-[#9fb2c9]" aria-live="polite">
          {status}
        </p>
      )}
      {won && (
        <button onClick={goEndless} className="aero-btn aero-btn-primary mt-4 w-full py-1.5 text-[13px]">
          Keep going: Endless mode ›
        </button>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <button onClick={() => start(false, run.deckKind)} className={`${won ? "aero-btn-dark" : "aero-btn aero-btn-primary"} flex-1 py-1.5 text-[13px]`}>
          New run
        </button>
        <button onClick={() => void share()} className="aero-btn-dark px-3 py-1.5 text-[12px]">
          Share result
        </button>
        <button onClick={() => go("title")} className="aero-btn-dark px-3 py-1.5 text-[12px]">
          Title
        </button>
      </div>
    </Panel>
  );
}

export function DeckViewer({ onClose }: { onClose: () => void }) {
  const run = useDeckStore((s) => s.run)!;
  const removeCard = useDeckStore.getState().removeCard;
  const [confirm, setConfirm] = useState<string | null>(null);
  const canRemove = run.phase === "shop" && !!run.shop && !run.shop.removed && run.money >= R.REMOVE_PRICE && run.deck.length > 10;
  const cards = [...run.deck].sort(
    (a, b) => ROLES.indexOf(rolesOf(CARD_BY_ID[a.id])[0]) - ROLES.indexOf(rolesOf(CARD_BY_ID[b.id])[0]) || a.id.localeCompare(b.id),
  );
  return (
    <Panel label="Your deck" wide>
      <div className="flex items-baseline justify-between">
        <p className="font-pixel text-[11px] text-white">YOUR DECK ({run.deck.length})</p>
        <button onClick={onClose} className="aero-btn-dark px-2.5 py-1 text-[12px]">
          Close
        </button>
      </div>
      <p className="mt-1 text-[11.5px] text-[#9fb2c9]">
        {canRemove ? `Tap a card to remove it from your deck for $${R.REMOVE_PRICE} (once per shop).` : `${run.draw.length} still to draw this round.`}
      </p>
      {confirm && (
        <div className="mt-2 flex items-center gap-2 rounded-[4px] border border-[#ff9a8a]/40 bg-[#ff9a8a]/10 p-2 text-[12px]">
          <span className="flex-1">Remove {CARD_BY_ID[run.deck.find((c) => c.uid === confirm)!.id].name} for ${R.REMOVE_PRICE}?</span>
          <button
            onClick={() => {
              removeCard(confirm);
              setConfirm(null);
              onClose();
            }}
            className="aero-btn aero-btn-primary px-3 py-0.5 text-[12px]"
          >
            Remove
          </button>
          <button onClick={() => setConfirm(null)} className="aero-btn-dark px-2.5 py-0.5 text-[12px]">
            Keep
          </button>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {cards.map((c) => (
          <DeckCard key={c.uid} def={CARD_BY_ID[c.id]} mod={c.mod} compact onClick={canRemove ? () => setConfirm(c.uid) : undefined} />
        ))}
      </div>
    </Panel>
  );
}
