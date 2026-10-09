"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, VOICES, type Category, type Voice } from "./voices";
import { CAT_COLORS } from "./ui";

// The sound browser: every sound by category. Click a name to hear it,
// "+" to add it as a new channel, "swap" to put it on the selected one.

export default function Browser({
  found,
  fresh,
  canAdd,
  canSwap,
  onPreview,
  onAdd,
  onSwap,
}: {
  found: string[];
  fresh: string[];
  canAdd: boolean;
  canSwap: boolean;
  onPreview: (v: Voice) => void;
  onAdd: (v: Voice) => void;
  onSwap: (v: Voice) => void;
}) {
  const [cat, setCat] = useState<Category>("Kicks");
  const [query, setQuery] = useState("");
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return VOICES.filter((v) => (q ? v.name.toLowerCase().includes(q) || v.cat.toLowerCase().includes(q) : v.cat === cat));
  }, [cat, query]);

  return (
    <div className="flex min-h-0 flex-col gap-2" data-testid="studio-browser">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search sounds"
        aria-label="Search sounds"
        className="rounded-[3px] border border-[#3a3733] bg-[#11100f] px-2 py-1.5 text-[13px] text-[#e8e0cf] placeholder:text-[#948b7a]"
      />
      {!query && (
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Sound categories">
          {CATEGORIES.map((c) => {
            const n = VOICES.filter((v) => v.cat === c).length;
            if (!n && c !== "Your samples") return null;
            const isNew = VOICES.some((v) => v.cat === c && fresh.includes(v.id));
            return (
              <button
                key={c}
                role="tab"
                aria-selected={cat === c}
                onClick={() => setCat(c)}
                className="flex items-center gap-1 rounded-[3px] border border-transparent px-1.5 py-0.5 text-[12px] text-[#b9b09e] hover:text-white aria-selected:border-[#4a4540] aria-selected:bg-[#24221f] aria-selected:text-white"
              >
                <span className="h-2 w-2 rounded-full" style={{ background: CAT_COLORS[c] }} />
                {c}
                {isNew && <span className="h-1.5 w-1.5 rounded-full bg-amber" aria-label="new" />}
              </button>
            );
          })}
        </div>
      )}
      <ul className="min-h-0 flex-1 overflow-y-auto rounded-[3px] border border-[#2e2b28] bg-[#12110f]" aria-label="Sounds">
        {list.map((v) => {
          const locked = !!v.foundAt && !found.includes(v.id);
          return (
            <li key={v.id} className="flex items-center gap-1 border-b border-[#1f1d1b] px-1.5 py-1 last:border-b-0">
              <button
                className="min-w-0 flex-1 truncate py-0.5 text-left text-[13px] text-[#e8e0cf] hover:text-amber disabled:text-[#948b7a]"
                disabled={locked}
                onClick={() => onPreview(v)}
                title={locked ? `Find it at ${v.foundAt}` : `Play ${v.name}`}
              >
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: CAT_COLORS[v.cat] }} />
                {locked ? `??? · find it at ${v.foundAt}` : v.name}
                {fresh.includes(v.id) && <span className="ml-1.5 text-[10px] text-amber uppercase">new</span>}
                {v.load && !locked && <span className="ml-1.5 text-[10px] text-[#948b7a]">loads on use</span>}
              </button>
              {!locked && (
                <>
                  <button className="rounded-[2px] px-1.5 text-[12px] text-[#b9b09e] hover:bg-[#2d2a27] hover:text-white disabled:opacity-30" disabled={!canSwap} onClick={() => onSwap(v)} aria-label={`swap: Put ${v.name} on the selected channel`} title="Put on the selected channel">
                    swap
                  </button>
                  <button className="rounded-[2px] px-1.5 text-[15px] leading-none text-[#b9b09e] hover:bg-[#2d2a27] hover:text-white disabled:opacity-30" disabled={!canAdd} onClick={() => onAdd(v)} aria-label={`Add ${v.name} as a new channel`} title="Add as a new channel">
                    +
                  </button>
                </>
              )}
            </li>
          );
        })}
        {!list.length && <li className="p-3 text-[12.5px] text-[#948b7a]">{query ? "Nothing by that name." : "No sounds here yet. Put your own in public/samples/ and list them in src/data/samples.ts."}</li>}
      </ul>
    </div>
  );
}
