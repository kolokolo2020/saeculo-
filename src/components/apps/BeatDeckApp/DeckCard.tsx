"use client";

import { MODS, rolesOf, type CardDef, type CardMod } from "@/lib/beatdeck/cards";
import Glyph from "@/components/ui/Glyph";
import { GENRE_LABEL, RARITY_COLOR, ROLE_COLOR, ROLE_LABEL } from "./look";

// One sound card: role colours along the top, the card's one-bar pattern
// drawn per role, groove per hit, and any special text.
const MOD_BADGE: Record<CardMod, string> = { tape: "TAPE", gold: "GOLD", double: "2×", vinyl: "VINYL" };

export default function DeckCard({
  def,
  mod,
  selected = false,
  dimmed = false,
  compact = false,
  deal,
  onClick,
  onAudition,
  label,
}: {
  def: CardDef;
  mod?: CardMod;
  selected?: boolean;
  dimmed?: boolean;
  compact?: boolean;
  /** Animate in as a freshly dealt card, staggered by this index. */
  deal?: number;
  onClick?: () => void;
  onAudition?: () => void;
  /** Accessible name override (defaults to the card's name). */
  label?: string;
}) {
  const roles = rolesOf(def);
  const stripe =
    roles.length === 1
      ? `linear-gradient(to bottom, ${ROLE_COLOR[roles[0]][0]}, ${ROLE_COLOR[roles[0]][1]})`
      : `linear-gradient(to right, ${roles.map((r, i) => `${ROLE_COLOR[r][1]} ${(i / roles.length) * 100}% ${((i + 1) / roles.length) * 100}%`).join(", ")})`;
  const w = compact ? "w-[92px]" : "w-[104px]";

  return (
    <div
      className={`group/card relative shrink-0 ${w} transition-transform duration-150 ${selected ? "-translate-y-3" : onClick ? "hover:-translate-y-1" : ""} ${
        deal !== undefined ? "animate-[deck-deal_0.38s_cubic-bezier(.2,.8,.3,1.2)_both] motion-reduce:animate-none" : ""
      }`}
      style={deal !== undefined ? { animationDelay: `${deal * 55}ms` } : undefined}
    >
      <button
        onClick={onClick}
        aria-pressed={onClick ? selected : undefined}
        aria-label={label ?? `${def.name} card${mod ? ` (${MODS[mod].name})` : ""}`}
        className={`flex w-full flex-col overflow-hidden rounded-[7px] border text-left shadow-[0_4px_10px_rgba(0,0,0,0.5)] ${
          selected ? "border-[#9fe0ff] ring-2 ring-[#6fb4ff]" : "border-black/80"
        } ${dimmed ? "opacity-45" : ""} bg-gradient-to-b from-[#26303e] to-[#0e131b]`}
        style={
          mod && !selected
            ? {
                borderColor: MODS[mod].color,
                boxShadow: `0 0 10px ${MODS[mod].color}66, 0 4px 10px rgba(0,0,0,0.5)`,
                backgroundImage:
                  mod === "vinyl"
                    ? "repeating-radial-gradient(circle at 50% 120%, rgba(255,255,255,0.05) 0 1px, transparent 1px 4px), linear-gradient(to bottom, #2b2640, #0e0b18)"
                    : mod === "gold"
                      ? "linear-gradient(to bottom, #3a3120, #14100a)"
                      : undefined,
              }
            : undefined
        }
      >
        <span className="block h-[7px]" style={{ background: stripe }} />
        <span className={`flex flex-col gap-1 ${compact ? "px-1.5 pt-1 pb-1.5" : "px-2 pt-1.5 pb-2"}`}>
          <span className={`leading-tight font-semibold text-white ${compact ? "text-[11px]" : "text-[12.5px]"}`}>{def.name}</span>
          <span className="flex items-center gap-1 text-[9.5px] tracking-wide text-[#9fb2c9] uppercase">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: RARITY_COLOR[def.rarity] }} />
            {GENRE_LABEL[def.genre]}
          </span>
          {roles.map((role) => (
            <span key={role} className="flex items-center gap-1">
              <span className="w-[26px] text-[8.5px] text-[#7f93ad]">{ROLE_LABEL[role]}</span>
              <span className="grid flex-1 grid-cols-16 gap-[1px]">
                {Array.from({ length: 16 }, (_, step) => {
                  const on = def.hits.some((h) => h.role === role && h.step === step);
                  return (
                    <span
                      key={step}
                      className="h-[5px] rounded-[1px]"
                      style={{ background: on ? ROLE_COLOR[role][0] : step % 4 === 0 ? "#3a4452" : "#232b36" }}
                    />
                  );
                })}
              </span>
            </span>
          ))}
          <span className="mt-0.5 font-mono text-[11px] text-[#7fe0ff]">
            {def.groove ? `+${def.groove} groove/hit` : "no hits"}
          </span>
          {def.text && !compact && <span className="text-[10px] leading-snug text-[#c9d6e6]">{def.text}</span>}
          {mod && (
            <span className="mt-0.5 self-start rounded-[3px] px-1 py-[1px] font-pixel text-[7px] text-black" style={{ background: MODS[mod].color }} title={MODS[mod].text}>
              {MOD_BADGE[mod]}
            </span>
          )}
        </span>
      </button>
      {onAudition && (
        <button
          onClick={onAudition}
          aria-label={`Listen to ${def.name}`}
          className="aero-btn-dark absolute top-2.5 right-1.5 grid h-5 w-5 place-items-center rounded-full"
        >
          <Glyph name="play" size={8} />
        </button>
      )}
    </div>
  );
}
