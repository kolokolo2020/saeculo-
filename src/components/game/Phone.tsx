"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_PROFILE, lookOf, styleOf } from "./character";
import { ARTISTS, artistById, cutOf, fmtFans, MOB_IDS, MOBS, nextTier, storeRate, tierOf, TIERS, type Msg, type PostKind } from "./career";
import { personSprites } from "./people";
import type { SaveData } from "./save";

// Your phone (P, or the button up top): your page (followers, posts, a
// beat or a fit to post), your messages (fans, artists who want to link,
// people who want a cut), and the money your music makes on its own.

export type PhoneTab = "page" | "dms" | "money";
const TABS: { id: PhoneTab; name: string }[] = [
  { id: "page", name: "page" },
  { id: "dms", name: "messages" },
  { id: "money", name: "money" },
];
const GLYPH: Record<PostKind, string> = { beat: "♪", sale: "$", song: "★", fit: "◆", fight: "✊", show: "♫", news: "!" };

const btn = "rounded-[2px] border border-[#4a4540] bg-[#1d1b19] px-2.5 py-1 text-[#e8e0cf] hover:border-amber focus-visible:border-amber disabled:opacity-40";

function Avatar({ save }: { save: SaveData }) {
  const c = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const g = c.current?.getContext("2d");
    if (!g) return;
    const img = personSprites(lookOf(save.profile ?? DEFAULT_PROFILE)).walk.down[0];
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, 48, 48);
    g.fillStyle = "#2a2724";
    g.fillRect(0, 0, 48, 48);
    // head and shoulders, big
    g.drawImage(img, 0, 0, 12, 10, 0, 4, 48, 40);
  }, [save.profile]);
  return <canvas ref={c} width={48} height={48} className="pixel h-14 w-14 shrink-0 rounded-full border-2 border-amber" aria-hidden />;
}

export default function Phone({
  save,
  tab,
  latest,
  onTab,
  onPostBeat,
  onPostFit,
  onAct,
  onMob,
  onClose,
}: {
  save: SaveData;
  tab: PhoneTab;
  /** Your newest tape, and whether it can go up (or why not). */
  latest: { name: string; ok: boolean; why?: string } | null;
  onTab: (t: PhoneTab) => void;
  onPostBeat: () => void;
  onPostFit: () => void;
  onAct: (m: Msg, yes: boolean) => void;
  onMob: (id: (typeof MOB_IDS)[number], what: "stop" | "peace") => void;
  onClose: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    root.current?.querySelector<HTMLElement>("[role=tab][aria-selected=true]")?.focus();
  }, []);
  const name = save.profile?.name || "you";
  const handle = name.toLowerCase().replace(/[^a-z0-9._]/g, "") || "producer";
  const tier = tierOf(save.fans);
  const next = nextTier(save.fans);
  const lo = TIERS[tier].fans;
  const pct = next ? Math.round(((save.fans - lo) / (next.fans - lo)) * 100) : 100;
  const unread = save.inbox.filter((m) => !m.read).length;
  // the clock, for how long till you can post again
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const fitWait = Math.max(0, Math.ceil(((save.cd.fit ?? 0) - now) / 1000));
  const beatWait = Math.max(0, Math.ceil(((save.cd.post ?? 0) - now) / 1000));
  const totalStreams = save.collabs.reduce((n, s) => n + s.streams, 0);
  const songRate = save.collabs.reduce((n, s) => n + s.rate, 0);
  const cut = cutOf(save);
  return (
    <div
      ref={root}
      role="dialog"
      aria-label="Your phone"
      data-testid="phone"
      className="game-fade absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-2 font-lcd text-[19px] text-[#e8e0cf] sm:p-4"
      onKeyDown={(e) => {
        if (e.key === "Escape" || (e.key.toLowerCase() === "p" && !(e.target instanceof HTMLInputElement))) {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="flex h-full max-h-[700px] w-full max-w-[400px] flex-col overflow-hidden rounded-[18px] border-[3px] border-[#3a3733] bg-[#0b0a09] shadow-2xl">
        {/* the status bar */}
        <div className="flex shrink-0 items-center gap-2 border-b border-[#2a2724] px-4 py-2 text-[16px] text-[#8a8170]">
          <span>{handle}</span>
          <span className="ml-auto">${Math.floor(save.cash)}</span>
          <button className={`${btn} ml-2 font-sans text-[13px]`} onClick={onClose} data-testid="phone-close">
            Close<span className="hidden sm:inline"> (P)</span>
          </button>
        </div>
        <div role="tablist" aria-label="Phone" className="flex shrink-0 border-b border-[#2a2724]">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className="flex-1 border-b-2 border-transparent px-2 py-1.5 text-[#b9b09e] aria-selected:border-amber aria-selected:text-amber"
              onClick={() => onTab(t.id)}
              data-testid={`phone-tab-${t.id}`}
            >
              {t.name}
              {t.id === "dms" && unread > 0 && <span className="ml-1 rounded-full bg-[#b33a3a] px-1.5 text-[14px] text-white">{unread}</span>}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {tab === "page" && (
            <div className="flex flex-col gap-3" data-testid="phone-page">
              <div className="flex items-center gap-3">
                <Avatar save={save} />
                <div className="grid flex-1 grid-cols-3 text-center leading-tight">
                  <span>
                    <span className="block text-[22px]">{save.posts.length}</span>
                    <span className="text-[15px] text-[#8a8170]">posts</span>
                  </span>
                  <span>
                    <span className="block text-[22px]" data-testid="phone-fans">
                      {fmtFans(save.fans)}
                    </span>
                    <span className="text-[15px] text-[#8a8170]">followers</span>
                  </span>
                  <span>
                    <span className="block text-[22px]">{save.contacts.length + 41}</span>
                    <span className="text-[15px] text-[#8a8170]">following</span>
                  </span>
                </div>
              </div>
              <div className="leading-tight">
                <p>
                  {name} <span className="text-[15px] text-[#8a8170]">· producer</span>
                </p>
                <p className="text-[16px] text-[#b9b09e]">beats from the block. dm for collabs. style {save.profile ? styleOf(save.profile) : 0}</p>
              </div>
              <div>
                <p className="text-[16px] text-[#b9b09e]">
                  <span className="text-amber">{TIERS[tier].name}</span>
                  {next ? ` · ${fmtFans(next.fans - save.fans)} more to ${next.name}` : " · as big as it gets"}
                </p>
                <div className="mt-1 h-2 w-full rounded-full bg-[#2a2724]" role="progressbar" aria-label="Followers to the next level" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-2 rounded-full bg-amber" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className={btn} disabled={!latest?.ok || beatWait > 0} onClick={onPostBeat} data-testid="phone-post-beat">
                  {latest ? `post “${latest.name}”` : "post a beat"}
                </button>
                <button className={btn} disabled={fitWait > 0 || !save.profile} onClick={onPostFit} data-testid="phone-post-fit">
                  post a fit
                </button>
              </div>
              <p className="text-[15px] leading-tight text-[#8a8170]">
                {!latest ? "Make a beat in the studio to post it." : !latest.ok ? latest.why : beatWait ? `Post again in ${beatWait}s: don’t flood the feed.` : "Posted beats sell leases on your page while you’re out."}
                {fitWait > 0 && ` Next fit pic in ${fitWait}s.`}
              </p>
              {save.posts.length ? (
                <ul className="grid grid-cols-3 gap-1" aria-label="Posts">
                  {save.posts.map((p, i) => (
                    <li key={i} className="relative flex aspect-square flex-col justify-between overflow-hidden rounded-[2px] p-1 text-[13px] leading-none" style={{ background: `hsl(${p.hue} 35% 22%)` }}>
                      <span className="text-[22px] text-white/80" aria-hidden>
                        {GLYPH[p.kind]}
                      </span>
                      <span className="line-clamp-3 text-white/90">{p.text}</span>
                      <span className="text-[12px] text-white/70">♥ {fmtFans(p.likes)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[#8a8170]">No posts yet. Sell a beat, make a song, post something.</p>
              )}
            </div>
          )}
          {tab === "dms" && (
            <ul className="flex flex-col gap-2" data-testid="phone-dms">
              {save.inbox.length === 0 && <li className="text-[#8a8170]">Nothing yet. People write once they’ve heard of you.</li>}
              {save.inbox.map((m) => (
                <li key={m.id} className={`rounded-[3px] border px-2 py-1.5 ${m.read ? "border-[#2a2724]" : "border-amber"}`}>
                  <p className="text-[16px]">
                    <span className={m.kind === "mob" ? "text-[#ff7a6a]" : m.kind === "artist" ? "text-amber" : "text-[#b9b09e]"}>@{m.from}</span>
                    {!m.read && <span className="ml-2 text-[13px] text-amber">new</span>}
                  </p>
                  <p className="leading-tight">{m.text}</p>
                  {m.act && !m.done && (
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {m.act.type === "link" && (
                        <>
                          <button className={btn} onClick={() => onAct(m, true)}>
                            link up
                          </button>
                          <button className={btn} onClick={() => onAct(m, false)}>
                            leave it
                          </button>
                        </>
                      )}
                      {m.act.type === "sponsor" && (
                        <>
                          <button className={btn} onClick={() => onAct(m, true)}>
                            take the deal (${m.act.pay})
                          </button>
                          <button className={btn} onClick={() => onAct(m, false)}>
                            no thanks
                          </button>
                        </>
                      )}
                      {m.act.type === "mob" && <span className="text-[15px] text-[#8a8170]">They’d rather talk in person.</span>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          {tab === "money" && (
            <div className="flex flex-col gap-3" data-testid="phone-money">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-[3px] border border-[#2a2724] p-2">
                  <p className="text-[24px] text-amber">${Math.floor(save.cash)}</p>
                  <p className="text-[15px] text-[#8a8170]">cash</p>
                </div>
                <div className="rounded-[3px] border border-[#2a2724] p-2">
                  <p className="text-[24px]">${Math.floor(save.stats.royalties)}</p>
                  <p className="text-[15px] text-[#8a8170]">streams & leases, all told</p>
                </div>
              </div>
              <p className="text-[16px] leading-tight text-[#b9b09e]">
                coming in: about ${(songRate + storeRate(save)).toFixed(1)} a minute
                {cut > 0 && <span className="text-[#ff9a7a]"> · {Math.round(cut * 100)}% of it goes to people you pay</span>}
              </p>
              <div>
                <p className="text-[#b9b09e]">beat store · {save.posted.length} beats up</p>
                <p className="text-[15px] text-[#8a8170]">leases sell on their own, more the more people follow you (${storeRate(save).toFixed(1)}/min)</p>
              </div>
              <div>
                <p className="text-[#b9b09e]">songs · {fmtFans(totalStreams)} streams</p>
                {save.collabs.length ? (
                  <ul className="mt-1 flex flex-col gap-1" data-testid="phone-songs">
                    {save.collabs.map((s, i) => (
                      <li key={i} className="flex gap-2 text-[17px] leading-tight">
                        <span className="min-w-0 flex-1 truncate">
                          “{s.title}” <span className="text-[#8a8170]">ft. {artistById(s.artist)?.name}</span>
                        </span>
                        <span className="shrink-0 text-[#8a8170]">{fmtFans(s.streams)}</span>
                        <span className="shrink-0 text-amber">${Math.floor(s.earned)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[15px] text-[#8a8170]">None yet. Link up with an artist and make one.</p>
                )}
              </div>
              <div>
                <p className="text-[#b9b09e]">contacts</p>
                <p className="text-[16px] leading-tight">
                  {save.contacts.length ? save.contacts.map((id) => ARTISTS.find((a) => a.id === id)?.name).join(" · ") : <span className="text-[#8a8170]">Nobody yet. Talk to the artists round the block.</span>}
                </p>
              </div>
              {MOB_IDS.some((id) => save.mob[id].stage !== "none") && (
                <div data-testid="phone-mob">
                  <p className="text-[#b9b09e]">protection</p>
                  <ul className="flex flex-col gap-1.5">
                    {MOB_IDS.filter((id) => save.mob[id].stage !== "none").map((id) => {
                      const m = save.mob[id];
                      const mob = MOBS[id];
                      return (
                        <li key={id} className="text-[16px] leading-tight">
                          <span className="text-[#e8e0cf]">{mob.name}</span>{" "}
                          <span className="text-[#8a8170]">
                            {m.stage === "asked" && `want ${Math.round(mob.cut * 100)}%. ${mob.boss} wants an answer.`}
                            {m.stage === "paying" && `you pay ${Math.round(mob.cut * 100)}% ($${Math.floor(m.paid)} so far). They keep the wrong people off you.`}
                            {m.stage === "hunted" && `after you. ${m.squads}/${mob.squadsToHeavy} of their crews seen off.`}
                            {m.stage === "done" && "won't bother you again."}
                          </span>
                          {m.stage === "paying" && (
                            <button className={`${btn} ml-2 mt-1`} onClick={() => onMob(id, "stop")}>
                              stop paying
                            </button>
                          )}
                          {m.stage === "hunted" && (
                            <button className={`${btn} ml-2 mt-1`} disabled={save.cash < mob.peace(save)} onClick={() => onMob(id, "peace")}>
                              make peace (${mob.peace(save)})
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
