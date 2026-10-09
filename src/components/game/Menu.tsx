"use client";

import { useEffect, useRef, useState } from "react";
import { BODIES, DEFAULT_PROFILE, HAIR_COLORS, HAIR_STYLES, ITEMS, itemById, lookOf, SKINS, SLOTS, styleOf, type Item, type Profile, type Slot } from "./character";
import { GOALS } from "./goals";
import { personSprites } from "./people";
import { MAX_HP, type SaveData, type Settings } from "./save";
import { CONSUMABLES, WEAPONS } from "./weapons";

// The menu (M, or the button up top): you, your wardrobe, your weapons and
// what's in your pockets, the goals, and the settings. The first time
// round it's just the mirror: who are you?

export type MenuTab = "you" | "wardrobe" | "fight" | "goals" | "settings";
const TABS: { id: MenuTab; name: string }[] = [
  { id: "you", name: "you" },
  { id: "wardrobe", name: "wardrobe" },
  { id: "fight", name: "fight" },
  { id: "goals", name: "goals" },
  { id: "settings", name: "settings" },
];

const btn = "rounded-[2px] border border-[#4a4540] bg-[#1d1b19] px-2.5 py-1 hover:border-amber focus-visible:border-amber aria-pressed:border-amber aria-pressed:bg-[#3a2e1c] disabled:opacity-40";

/** You, drawn big: front, side, back. */
function Preview({ profile }: { profile: Profile }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvas.current;
    const g = c?.getContext("2d");
    if (!c || !g) return;
    const sp = personSprites(lookOf(profile));
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, c.width, c.height);
    [sp.walk.down[0], sp.walk.right[0], sp.walk.up[0]].forEach((img, i) => {
      g.fillStyle = "rgba(0,0,0,0.35)";
      g.fillRect(i * 84 + 18, 15 * 5 + 1, 48, 6);
      g.drawImage(img, i * 84 + 12, 4, 12 * 5, 14 * 5);
    });
  }, [profile]);
  return <canvas ref={canvas} width={252} height={84} className="pixel h-[84px] w-[252px] max-w-full" role="img" aria-label={`${profile.name || "You"}, front, side and back`} />;
}

function Swatches({ colors, value, onPick, label }: { colors: string[]; value: number; onPick: (i: number) => void; label: string }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
      {colors.map((c, i) => (
        <button key={c + i} role="radio" aria-checked={value === i} aria-label={`${label} ${i + 1}`} onClick={() => onPick(i)} className="h-7 w-7 rounded-[2px] border-2 border-[#2a2724] aria-checked:border-amber" style={{ background: c }} />
      ))}
    </div>
  );
}

function unlockText(it: Item): string {
  const u = it.unlock;
  return u.kind === "buy" ? `$${u.price} at the thrift shop` : u.kind === "wins" ? `win ${u.n} fights` : u.kind === "goal" ? u.label : "";
}

function You({ profile, onChange }: { profile: Profile; onChange: (p: Profile) => void }) {
  const set = (patch: Partial<Profile>) => onChange({ ...profile, ...patch });
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-[#b9b09e]">name</span>
        <input
          className="w-full max-w-[280px] rounded-[2px] border border-[#4a4540] bg-[#0b0a09] px-2 py-1 text-[22px] text-[#e8e0cf] outline-none focus:border-amber"
          value={profile.name}
          maxLength={16}
          placeholder="your name"
          onChange={(e) => set({ name: e.target.value.replace(/[^\p{L}\p{N} ._\-']/gu, "") })}
          data-testid="menu-name"
          onKeyDown={(e) => e.stopPropagation()}
        />
      </label>
      <div className="flex flex-col gap-1">
        <span className="text-[#b9b09e]">skin</span>
        <Swatches colors={SKINS} value={profile.skin} onPick={(skin) => set({ skin })} label="Skin tone" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[#b9b09e]">hair</span>
        <div className="flex flex-wrap gap-1.5">
          {HAIR_STYLES.map((h) => (
            <button key={h.id} className={btn} aria-pressed={profile.hair === h.id} onClick={() => set({ hair: h.id })}>
              {h.name}
            </button>
          ))}
        </div>
        <Swatches colors={HAIR_COLORS} value={profile.hairColor} onPick={(hairColor) => set({ hairColor })} label="Hair colour" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[#b9b09e]">build</span>
        <div className="flex flex-wrap gap-1.5">
          {BODIES.map((b) => (
            <button key={b.id} className={btn} aria-pressed={profile.body === b.id} onClick={() => set({ body: b.id })}>
              {b.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Wardrobe({ profile, owned, onChange }: { profile: Profile; owned: string[]; onChange: (p: Profile) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[18px] text-[#b9b09e]">style {styleOf(profile)} · more clothes at the thrift shop on the avenue</p>
      {SLOTS.map(({ id: slot, name, optional }) => {
        const worn = profile[slot as Slot];
        const items = ITEMS.filter((x) => x.slot === slot);
        return (
          <div key={slot} className="flex flex-col gap-1">
            <span className="text-[#b9b09e]">{name}</span>
            <div className="flex flex-wrap gap-1.5">
              {optional && (
                <button className={btn} aria-pressed={!worn} onClick={() => onChange({ ...profile, [slot]: null })}>
                  none
                </button>
              )}
              {items.map((it) => {
                const has = owned.includes(it.id);
                return (
                  <button
                    key={it.id}
                    className={btn}
                    aria-pressed={worn?.id === it.id}
                    disabled={!has}
                    title={has ? `style ${it.styleScore}` : `locked: ${unlockText(it)}`}
                    onClick={() => onChange({ ...profile, [slot]: { id: it.id, color: 0 } })}
                  >
                    {has ? it.name : `🔒 ${it.name}`}
                  </button>
                );
              })}
            </div>
            {worn && (itemById(worn.id)?.colors.length ?? 0) > 1 && (
              <Swatches
                colors={itemById(worn.id)!.colors.map((c) => c[0])}
                value={worn.color}
                onPick={(color) => onChange({ ...profile, [slot]: { ...worn, color } })}
                label={`${itemById(worn.id)!.name} colour`}
              />
            )}
          </div>
        );
      })}
      <p className="text-[16px] text-[#8a8170]">locked: {ITEMS.filter((x) => !owned.includes(x.id)).map((x) => `${x.name} (${unlockText(x)})`).join(" · ") || "nothing. You've got it all."}</p>
    </div>
  );
}

function Fight({ save, onEquip, onUse }: { save: SaveData; onEquip: (id: string) => void; onUse: (id: string) => void }) {
  const s = save.stats;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[18px] text-[#b9b09e]">
        fights won {s.wins} · lost {s.losses} · got away {s.fled}
      </p>
      <div className="flex flex-col gap-1">
        <span className="text-[#b9b09e]">weapon</span>
        <ul className="flex flex-col gap-1">
          {WEAPONS.map((w) => {
            const has = save.weapons.includes(w.id);
            const how = "wins" in w.unlock ? `win ${w.unlock.wins} ${w.unlock.wins === 1 ? "fight" : "fights"}` : "boss" in w.unlock ? "beat Tank" : "";
            return (
              <li key={w.id} className="flex flex-wrap items-center gap-2">
                <button className={btn} aria-pressed={save.weapon === w.id} disabled={!has} onClick={() => onEquip(w.id)} data-testid={`weapon-${w.id}`}>
                  {has ? w.name : `🔒 ${w.name}`}
                </button>
                <span className="text-[16px] text-[#8a8170]">{has ? `damage ${w.dmg} · reach ${w.reach}${w.sweep ? " · hits everyone in reach" : ""}` : how}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[#b9b09e]">
          health {Math.round(save.hp)}/{MAX_HP} · in your pockets
        </span>
        <ul className="flex flex-col gap-1">
          {CONSUMABLES.filter((c) => (save.items[c.id] ?? 0) > 0).map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              <button className={btn} disabled={save.hp >= MAX_HP} onClick={() => onUse(c.id)}>
                use
              </button>
              <span>
                {c.name} ×{save.items[c.id]} <span className="text-[16px] text-[#8a8170]">+{c.heal} health</span>
              </span>
            </li>
          ))}
          {!CONSUMABLES.some((c) => (save.items[c.id] ?? 0) > 0) && <li className="text-[#8a8170]">Nothing. The corner store sells noodles.</li>}
        </ul>
      </div>
      <p className="text-[16px] text-[#8a8170]">In a fight: E or Space to swing, Shift to dodge (nothing hits you mid-dash), Q to eat something. Watch for the “!”: that’s a swing coming.</p>
    </div>
  );
}

function Goals({ save, tapes }: { save: SaveData; tapes: number }) {
  return (
    <ul className="flex flex-col gap-2" data-testid="menu-goals">
      {GOALS.map((g) => {
        const done = save.goals.includes(g.id);
        const pr = g.progress?.(save, { tapes });
        const reward = [g.reward.cash ? `$${g.reward.cash}` : "", g.reward.rep ? `${g.reward.rep} respect` : ""].filter(Boolean).join(", ");
        return (
          <li key={g.id} className={`flex gap-2 ${done ? "text-[#8a8170]" : ""}`} data-done={done}>
            <span className={done ? "text-amber" : "text-[#5a544a]"} aria-hidden>
              {done ? "✔" : "◇"}
            </span>
            <span>
              <span className={done ? "line-through decoration-1" : "text-[#e8e0cf]"}>{g.name}</span>
              {pr && !done && <span className="ml-2 text-[16px] text-amber">{`${pr[0]}/${pr[1]}`}</span>}
              <span className="block text-[16px] leading-tight text-[#8a8170]">
                {g.hint}
                {reward && ` (${reward})`}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function SettingsTab({ settings, onChange, onReset, touch }: { settings: Settings; onChange: (s: Settings) => void; onReset: () => void; touch: boolean }) {
  const [sure, setSure] = useState(false);
  const set = (p: Partial<Settings>) => onChange({ ...settings, ...p });
  return (
    <div className="flex flex-col gap-3">
      {(
        [
          ["sfx", "sound effects"],
          ["music", "music in the game"],
        ] as const
      ).map(([k, label]) => (
        <label key={k} className="flex flex-wrap items-center gap-3">
          <span className="w-[170px] text-[#b9b09e]">{label}</span>
          <input type="range" min={0} max={1} step={0.05} value={settings[k]} onChange={(e) => set({ [k]: Number(e.target.value) })} className="deck-range w-40" aria-label={label} />
          <span className="w-10 text-[18px]">{Math.round(settings[k] * 100)}</span>
        </label>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-[170px] text-[#b9b09e]">fights</span>
        {(["chill", "normal", "hard"] as const).map((d) => (
          <button key={d} className={btn} aria-pressed={settings.difficulty === d} onClick={() => set({ difficulty: d })}>
            {d}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button className={btn} aria-pressed={settings.shake} onClick={() => set({ shake: !settings.shake })}>
          screen shake: {settings.shake ? "on" : "off"}
        </button>
        <button className={btn} aria-pressed={settings.hints} onClick={() => set({ hints: !settings.hints })}>
          hints: {settings.hints ? "on" : "off"}
        </button>
      </div>
      <div className="text-[17px] leading-snug text-[#8a8170]">
        {touch ? (
          <p>pad: walk · A: use, talk, swing · B: dodge · ☰: this menu</p>
        ) : (
          <p>WASD / arrows: walk · E / Space: use, talk, swing · Shift: dodge · Q: eat · M: this menu · Esc: back to the site</p>
        )}
        <p>Reduced motion (or still visuals on the site) turns off rain, flicker and shake.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {sure ? (
          <>
            <span className="text-[#ff9a7a]">Start over? Your beats stay; everything else goes.</span>
            <button className={btn} onClick={onReset}>
              yes, start over
            </button>
            <button className={btn} onClick={() => setSure(false)}>
              no
            </button>
          </>
        ) : (
          <button className={btn} onClick={() => setSure(true)}>
            start over…
          </button>
        )}
      </div>
    </div>
  );
}

export default function Menu({
  save,
  tab,
  creator,
  tapes,
  touch,
  onTab,
  onProfile,
  onEquip,
  onUse,
  onSettings,
  onReset,
  onClose,
}: {
  save: SaveData;
  tab: MenuTab;
  /** First visit: just the mirror, then "start". */
  creator: boolean;
  tapes: number;
  touch: boolean;
  onTab: (t: MenuTab) => void;
  onProfile: (p: Profile) => void;
  onEquip: (id: string) => void;
  onUse: (id: string) => void;
  onSettings: (s: Settings) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const profile = save.profile ?? DEFAULT_PROFILE;
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    root.current?.querySelector<HTMLElement>(creator ? "input" : "[role=tab][aria-selected=true]")?.focus();
  }, [creator]);
  return (
    <div
      ref={root}
      role="dialog"
      aria-label={creator ? "Who are you?" : "Menu"}
      data-testid="game-menu"
      className="game-fade absolute inset-0 z-30 flex flex-col overflow-hidden bg-[#0b0a09]/[0.97] font-lcd text-[20px] text-[#e8e0cf]"
      onKeyDown={(e) => {
        if (e.key === "Escape" && !creator) {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-[#2a2724] px-4 py-2">
        <span className="text-amber">{creator ? "who are you?" : profile.name || "you"}</span>
        {!creator && (
          <span className="text-[18px] text-[#b9b09e]">
            ${Math.floor(save.cash)} · respect {Math.floor(save.rep)} · style {styleOf(profile)} · health {Math.round(save.hp)}
          </span>
        )}
        <button className={`${btn} ml-auto font-sans text-[13px]`} onClick={onClose} data-testid="menu-close">
          {creator ? "Start" : "Close (Esc)"}
        </button>
      </div>
      {!creator && (
        <div role="tablist" aria-label="Menu" className="flex shrink-0 flex-wrap gap-1 border-b border-[#2a2724] px-3 pt-2">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className="rounded-t-[3px] border border-b-0 border-transparent px-3 py-1 text-[#b9b09e] aria-selected:border-[#3a3733] aria-selected:bg-[#171615] aria-selected:text-amber" onClick={() => onTab(t.id)}>
              {t.name}
            </button>
          ))}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div className="mx-auto flex max-w-[760px] flex-col gap-4 sm:flex-row">
          {(tab === "you" || tab === "wardrobe" || creator) && (
            <div className="flex shrink-0 flex-col items-center gap-2 sm:items-start">
              <Preview profile={profile} />
              {creator && <p className="max-w-[260px] text-[17px] leading-snug text-[#8a8170]">The mirror in the thrift shop (or M, any time) changes all this later. More clothes get unlocked as you go.</p>}
            </div>
          )}
          <div className="min-w-0 flex-1">
            {(creator || tab === "you") && <You profile={profile} onChange={onProfile} />}
            {!creator && tab === "wardrobe" && <Wardrobe profile={profile} owned={save.owned} onChange={onProfile} />}
            {!creator && tab === "fight" && <Fight save={save} onEquip={onEquip} onUse={onUse} />}
            {!creator && tab === "goals" && <Goals save={save} tapes={tapes} />}
            {!creator && tab === "settings" && <SettingsTab settings={save.settings} onChange={onSettings} onReset={onReset} touch={touch} />}
          </div>
        </div>
      </div>
    </div>
  );
}
