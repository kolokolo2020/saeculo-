"use client";

import { ITEMS, type Item } from "../character";
import { fmtFans } from "../career";
import type { SaveData } from "../save";
import { CONSUMABLES, FOR_SALE } from "../weapons";
import Frame, { miniBtn } from "./Frame";

// Buying things: clothes at the thrift shop, designer at Maison, food at
// the corner store, drinks at the club's bar, and whatever Smokey's got
// under his coat in the alley.

export type ShopKind = "thrift" | "store" | "bar" | "maison" | "smokey";
const TITLES: Record<ShopKind, [string, string]> = {
  thrift: ["Second hand", "everything's been worn once"],
  store: ["The counter", "noodles, drinks, plasters"],
  bar: ["The bar", "the purple stuff, mostly"],
  maison: ["Maison", "designer. no refunds. no photos."],
  smokey: ["Smokey's coat", "no questions, no receipts"],
};

type Priced = Item & { unlock: { kind: "buy" | "designer"; price: number; fans?: number } };

function Swatches({ it }: { it: Item }) {
  // a fixed width, so the names line up whatever the number of colours
  return (
    <span className="flex w-[78px] shrink-0 gap-0.5" aria-hidden>
      {it.colors.slice(0, 4).map((c) => (
        <span key={c[0] + c[1]} className="h-4 w-4 rounded-[2px] border border-[#2a2724]" style={{ background: c[0] }} />
      ))}
    </span>
  );
}

export default function Shop({ kind, save, onBuy, onClose }: { kind: ShopKind; save: SaveData; onBuy: (id: string, price: number) => void; onClose: () => void }) {
  const [title, sub] = TITLES[kind];
  const clothes = ITEMS.filter((x): x is Priced => x.unlock.kind === (kind === "maison" ? "designer" : "buy")).sort((a, b) => a.unlock.price - b.unlock.price);
  const food = CONSUMABLES.filter((c) => c.at === (kind === "bar" ? "club" : "store"));
  const cash = Math.floor(save.cash);
  return (
    <Frame title={title} sub={sub} onClose={onClose} testid="shop" wide>
      <p className="mb-2 text-[#b9b09e]">you’ve got ${cash}</p>
      <ul className="flex flex-col gap-1.5">
        {(kind === "thrift" || kind === "maison") &&
          clothes.map((it) => {
            const has = save.owned.includes(it.id);
            const need = it.unlock.fans ?? 0;
            const known = save.fans >= need;
            return (
              <li key={it.id} className="flex items-center gap-3" data-testid={`buy-${it.id}`}>
                <Swatches it={it} />
                <span className="min-w-0 flex-1 leading-tight">
                  {it.name} <span className="text-[16px] text-[#8a8170]">{it.slot} · style {it.styleScore}{!known && ` · for people with ${fmtFans(need)} followers`}</span>
                </span>
                <button className={miniBtn} disabled={has || !known || cash < it.unlock.price} onClick={() => onBuy(it.id, it.unlock.price)} aria-label={has ? `${it.name}: yours` : `$${it.unlock.price}: buy the ${it.name}`}>
                  {has ? "yours" : `$${it.unlock.price}`}
                </button>
              </li>
            );
          })}
        {kind === "smokey" &&
          FOR_SALE.map((w) => {
            const has = save.weapons.includes(w.id);
            return (
              <li key={w.id} className="flex items-center gap-3" data-testid={`buy-${w.id}`}>
                <span className="min-w-0 flex-1 leading-tight">
                  {w.name}{" "}
                  <span className="text-[16px] text-[#8a8170]">
                    damage {w.dmg} · reach {w.reach}
                    {w.sweep ? " · hits everyone in reach" : ""}
                    {w.stun ? " · stuns" : ""}
                    {w.cooldown <= 0.25 ? " · fast" : w.cooldown >= 0.9 ? " · slow" : ""}
                  </span>
                </span>
                <button className={miniBtn} disabled={has || cash < w.unlock.buy} onClick={() => onBuy(w.id, w.unlock.buy)} aria-label={has ? `${w.name}: yours` : `$${w.unlock.buy}: buy the ${w.name}`}>
                  {has ? "yours" : `$${w.unlock.buy}`}
                </button>
              </li>
            );
          })}
        {(kind === "store" || kind === "bar") &&
          food.map((c) => (
            <li key={c.id} className="flex items-center gap-3">
              <span className="min-w-0 flex-1">
                {c.name} <span className="text-[16px] text-[#8a8170]">+{c.heal} health · you have {save.items[c.id] ?? 0}</span>
              </span>
              <button className={miniBtn} disabled={cash < c.price} onClick={() => onBuy(c.id, c.price)} aria-label={`$${c.price}: buy ${c.name}`}>
                ${c.price}
              </button>
            </li>
          ))}
      </ul>
      {kind === "thrift" && <p className="mt-3 text-[16px] text-[#8a8170]">Bought clothes go in your wardrobe (the mirror, or M). Some things aren’t for sale: they’re earned.</p>}
      {kind === "maison" && <p className="mt-3 text-[16px] text-[#8a8170]">The more it cost, the more people look. Not all of them nicely.</p>}
      {kind === "smokey" && <p className="mt-3 text-[16px] text-[#8a8170]">Pick what you hold in the menu, under fight.</p>}
    </Frame>
  );
}
