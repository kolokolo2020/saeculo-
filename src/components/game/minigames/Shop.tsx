"use client";

import { ITEMS, type Item } from "../character";
import type { SaveData } from "../save";
import { CONSUMABLES } from "../weapons";
import Frame, { miniBtn } from "./Frame";

// Buying things: clothes at the thrift shop, food at the corner store,
// drinks at the club's bar.

export type ShopKind = "thrift" | "store" | "bar";
const TITLES: Record<ShopKind, [string, string]> = {
  thrift: ["Second hand", "everything's been worn once"],
  store: ["The counter", "noodles, drinks, plasters"],
  bar: ["The bar", "the purple stuff, mostly"],
};

export default function Shop({ kind, save, onBuy, onClose }: { kind: ShopKind; save: SaveData; onBuy: (id: string, price: number) => void; onClose: () => void }) {
  const [title, sub] = TITLES[kind];
  const clothes = ITEMS.filter((x): x is Item & { unlock: { kind: "buy"; price: number } } => x.unlock.kind === "buy");
  const food = CONSUMABLES.filter((c) => c.at === (kind === "bar" ? "club" : "store"));
  return (
    <Frame title={title} sub={sub} onClose={onClose} testid="shop" wide>
      <p className="mb-2 text-[#b9b09e]">you’ve got ${Math.floor(save.cash)}</p>
      <ul className="flex flex-col gap-1.5">
        {kind === "thrift"
          ? clothes.map((it) => {
              const has = save.owned.includes(it.id);
              return (
                <li key={it.id} className="flex items-center gap-3">
                  <span className="flex shrink-0 gap-0.5" aria-hidden>
                    {it.colors.map((c) => (
                      <span key={c[0]} className="h-4 w-4 rounded-[2px] border border-[#2a2724]" style={{ background: c[0] }} />
                    ))}
                  </span>
                  <span className="min-w-0 flex-1">
                    {it.name} <span className="text-[16px] text-[#8a8170]">{it.slot} · style {it.styleScore}</span>
                  </span>
                  <button className={miniBtn} disabled={has || save.cash < it.unlock.price} onClick={() => onBuy(it.id, it.unlock.price)} aria-label={has ? `${it.name}: yours` : `$${it.unlock.price}: buy the ${it.name}`}>
                    {has ? "yours" : `$${it.unlock.price}`}
                  </button>
                </li>
              );
            })
          : food.map((c) => (
              <li key={c.id} className="flex items-center gap-3">
                <span className="min-w-0 flex-1">
                  {c.name} <span className="text-[16px] text-[#8a8170]">+{c.heal} health · you have {save.items[c.id] ?? 0}</span>
                </span>
                <button className={miniBtn} disabled={save.cash < c.price} onClick={() => onBuy(c.id, c.price)} aria-label={`$${c.price}: buy ${c.name}`}>
                  ${c.price}
                </button>
              </li>
            ))}
      </ul>
      {kind === "thrift" && <p className="mt-3 text-[16px] text-[#8a8170]">Bought clothes go in your wardrobe (the mirror, or M). Some things aren’t for sale: they’re earned.</p>}
    </Frame>
  );
}
