"use client";

import { CARD_BY_ID, RARITY_PRICE } from "@/lib/beatdeck/cards";
import { GEAR_BY_ID, MAX_GEAR } from "@/lib/beatdeck/gear";
import * as R from "@/lib/beatdeck/run";
import { ROUND_BY_ID } from "@/lib/beatdeck/rounds";
import { BEAT_TYPE_BY_ID, typeLevelStats } from "@/lib/beatdeck/scoring";
import { MAX_SESSIONS, SESSION_BY_ID } from "@/lib/beatdeck/sessions";
import { sfx } from "./sfx";
import { useDeckStore } from "./deckStore";
import { runKeyFor } from "./deckAudio";
import { playTakeLive } from "./sound";
import DeckCard from "./DeckCard";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[6px] border border-black/70 bg-black/30 p-3">
      <h3 className="mb-2 font-pixel text-[9px] tracking-wide text-[#9fb2c9]">{title}</h3>
      {children}
    </section>
  );
}

// Between rounds: spend cash on gear, new sounds, studio time (level up a
// beat type), or cut a card from your deck. Then meet the next client.
export default function Shop({ onShowDeck }: { onShowDeck: () => void }) {
  const run = useDeckStore((s) => s.run)!;
  const store = useDeckStore.getState();
  const buy = (fn: () => void) => () => {
    fn();
    sfx("cash");
  };
  const buyGear = (i: number) => buy(() => store.buyGear(i))();
  const buyCard = (i: number) => buy(() => store.buyCard(i))();
  const buySession = (i: number) => buy(() => store.buySession(i))();
  const buyUpgrade = buy(store.buyUpgrade);
  const { reroll, nextRound } = store;
  const shop = run.shop!;
  const next = ROUND_BY_ID[run.plan[run.round]];
  const upgrade = shop.upgrade ? BEAT_TYPE_BY_ID[shop.upgrade] : null;
  const lvl = upgrade ? (run.levels[upgrade.id] ?? 0) : 0;
  const now = upgrade ? typeLevelStats(upgrade, lvl) : null;
  const after = upgrade ? typeLevelStats(upgrade, lvl + 1) : null;
  const key = runKeyFor(run.seed);

  return (
    <div className="dark-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3" aria-label="Shop">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-pixel text-[12px] text-white">THE SHOP</h2>
        <p className="text-[12px] text-[#9fb2c9]">
          Deck: {run.deck.length} cards ·{" "}
          <button onClick={onShowDeck} className="text-[#6fb4ff] hover:underline">
            view
          </button>
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Section title="GEAR">
          <div className="flex flex-col gap-2">
            {shop.gear.map((id, i) => {
              if (!id) return <p key={i} className="text-[12px] text-[#7f93ad]">Sold.</p>;
              const g = GEAR_BY_ID[id];
              const full = run.gear.length >= MAX_GEAR;
              return (
                <div key={i} className="flex items-center gap-2 rounded-[4px] border border-white/10 bg-white/5 p-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold text-white">{g.name}</p>
                    <p className="text-[11.5px] leading-snug text-[#c9d6e6]">{g.text}</p>
                  </div>
                  <button
                    onClick={() => buyGear(i)}
                    disabled={full || run.money < g.price}
                    aria-label={`Buy ${g.name} for $${g.price}`}
                    className="aero-btn aero-btn-primary shrink-0 px-3 py-1 text-[12px] disabled:opacity-45"
                  >
                    {full ? "Full" : `$${g.price}`}
                  </button>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="STUDIO TIME">
          {upgrade && now && after ? (
            <div className="flex items-center gap-2 rounded-[4px] border border-white/10 bg-white/5 p-2">
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold text-white">
                  Master: {upgrade.name} <span className="text-[#9fb2c9]">LV{lvl + 1} → {lvl + 2}</span>
                </p>
                <p className="text-[11.5px] text-[#c9d6e6]">
                  {now.groove} × {now.hype} → <b className="text-[#9fffb0]">{after.groove} × {after.hype}</b>
                </p>
                <p className="text-[10.5px] text-[#7f93ad]">{upgrade.needs}</p>
              </div>
              <button
                onClick={buyUpgrade}
                disabled={run.money < R.UPGRADE_PRICE}
                aria-label={`Master ${upgrade.name} for $${R.UPGRADE_PRICE}`}
                className="aero-btn aero-btn-primary shrink-0 px-3 py-1 text-[12px] disabled:opacity-45"
              >
                ${R.UPGRADE_PRICE}
              </button>
            </div>
          ) : (
            <p className="text-[12px] text-[#7f93ad]">Booked.</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={onShowDeck}
              disabled={shop.removed || run.money < R.REMOVE_PRICE || run.deck.length <= 10}
              className="aero-btn-dark px-2.5 py-1 text-[11.5px] disabled:opacity-40"
            >
              {shop.removed ? "Card removed" : `Remove a card ($${R.REMOVE_PRICE})`}
            </button>
            <button onClick={reroll} disabled={run.money < shop.rerollCost} className="aero-btn-dark px-2.5 py-1 text-[11.5px] disabled:opacity-40">
              Reroll gear & sounds (${shop.rerollCost})
            </button>
          </div>
        </Section>
      </div>

      <Section title="STUDIO SESSIONS · ONE USE">
        <div className="grid gap-2 sm:grid-cols-2">
          {shop.sessions.map((id, i) => {
            if (!id) return <p key={i} className="text-[12px] text-[#7f93ad]">Booked.</p>;
            const def = SESSION_BY_ID[id];
            const full = run.sessions.length >= MAX_SESSIONS;
            return (
              <div key={i} className="flex items-center gap-2 rounded-[4px] border border-[#ffd27a]/25 bg-[#ffd27a]/5 p-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold text-[#ffe7a3]">◆ {def.name}</p>
                  <p className="text-[11.5px] leading-snug text-[#c9d6e6]">{def.text}</p>
                </div>
                <button
                  onClick={() => buySession(i)}
                  disabled={full || run.money < def.price}
                  aria-label={`Buy ${def.name} for $${def.price}`}
                  className="aero-btn aero-btn-primary shrink-0 px-3 py-1 text-[12px] disabled:opacity-45"
                >
                  {full ? "Full" : `$${def.price}`}
                </button>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="SOUNDS">
        <div className="dark-scroll flex gap-3 overflow-x-auto pt-1 pb-1">
          {shop.cards.map((id, i) =>
            id ? (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <DeckCard
                  def={CARD_BY_ID[id]}
                  label={`${CARD_BY_ID[id].name} (for sale)`}
                  onAudition={() => playTakeLive([CARD_BY_ID[id]], next.tempo, key, 1, 0.05)}
                />
                <button
                  onClick={() => buyCard(i)}
                  disabled={run.money < RARITY_PRICE[CARD_BY_ID[id].rarity]}
                  aria-label={`Buy ${CARD_BY_ID[id].name} for $${RARITY_PRICE[CARD_BY_ID[id].rarity]}`}
                  className="aero-btn aero-btn-primary px-3 py-0.5 text-[12px] disabled:opacity-45"
                >
                  ${RARITY_PRICE[CARD_BY_ID[id].rarity]}
                </button>
              </div>
            ) : (
              <p key={i} className="w-[112px] self-center text-center text-[12px] text-[#7f93ad]">
                Added to your deck.
              </p>
            ),
          )}
        </div>
      </Section>

      <div className="flex flex-wrap items-center gap-3 rounded-[6px] border border-[#1f6fd1]/60 bg-[#0b2a5b]/60 p-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-[#9fb2c9]">
            Next: round {run.round + 1} {next.boss && <b className="text-[#ff9a8a]">· BOSS</b>}
            {run.endless && <b className="text-[#d9c6ff]"> · endless</b>}
          </p>
          <p className="text-[13px] font-semibold text-white">{next.who}</p>
          <p className="text-[11.5px] text-[#ffd27a]">{next.rule}</p>
        </div>
        <button onClick={nextRound} className="aero-btn aero-btn-primary px-5 py-1.5 text-[13px]">
          Next client ›
        </button>
      </div>
    </div>
  );
}
