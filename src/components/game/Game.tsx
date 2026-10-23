"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePlayerStore } from "@/components/player/playerStore";
import { useSiteStore } from "@/components/site/siteStore";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { blingOf, DEFAULT_PROFILE, ITEMS, itemById, lookOf, randomProfile, styleOf, takeable, type Profile } from "./character";
import { accrue, ARTISTS, artistById, cutOf, fanDm, fmtFans, huntedBy, makePost, makeSong, MOB_IDS, MOBS, mobDue, now, priceOf, recognised, roll, tierOf, TIERS, type MobId, type Msg, type PostKind } from "./career";
import { faceOff, foeLines, freshMe, isUp, makeFoe, moveMe, robberLines, standDown, startDodge, swing, updateFoes, type FightEvents, type FoeKind, type Me } from "./combat";
import Phone, { type PhoneTab } from "./Phone";
import Monte from "./minigames/Monte";
import Session from "./minigames/Session";
import { newlyDone } from "./goals";
import Menu, { type MenuTab } from "./Menu";
import Crates, { type DigResult } from "./minigames/Crates";
import Dice from "./minigames/Dice";
import Hoops from "./minigames/Hoops";
import Rhythm, { battleCharts } from "./minigames/Rhythm";
import Shop from "./minigames/Shop";
import Tag from "./minigames/Tag";
import { drawRide, overhead, trainAt } from "./places/underground";
import { camera, draw, VIEW_H, VIEW_W } from "./render";
import { loadSave, MAX_HP, migrateOldTapes, resetSave, writeSave, type SaveData, type Settings } from "./save";
import { battle, clubOk, operate, promptFor as promptMore, talk as talkMore, veeBeat, type Api, type Mini } from "./scripts";
import { duck, setCrowd, setPlace, setRing, setRumble, setSfxVolume, sfx, startGameAudio, stopGameAudio, type Place } from "./sfx";
import { CONSUMABLES, consumableById, unlockedByWins, weaponById, WEAPONS } from "./weapons";
import { Engine } from "./studio/engine";
import { PRESETS } from "./studio/presets";
import { loadStore, saveStore } from "./studio/project";
import Studio from "./studio/Studio";
import { FINDABLE, playVoice, voiceById, VOICES } from "./studio/voices";
import { clearSmoke } from "./actors";
import { catFollows, catHome, cheerFor, lifeBlocks, lifeTarget, makeLife, sendCop, updateLife, type Actor } from "./life";
import { clone, type Project } from "./studio/project";
import { sampleProject } from "./studio/sample";
import { TRACKS } from "@/data/tracks";
import { formatTime } from "@/lib/audio";
import { blocked, inside, SCENES, START, tileAt, TILE, type Dir, type Door } from "./world";
import { ambushOdds, BOOMBOX, BREATHER, carrying, CAT_PETS, HINT_AT, KEYMAP, PLACE_NAMES, ROUGH, SPEED, tapeLines, troubleHere, troublePace } from "./tuning";
import { LINES, savedProjects, verdict } from "./lines";
import { KnockedOut, Overlays, TopBar, TouchPad, type Choice, type Dialog } from "./hud";

// The game: a bedroom, the street outside, the corner store and a basement
// studio. You start at the laptop the website lives on; closing it puts you
// in the room, and using it again brings the site back. The loop is small:
// walk around, find a sound, take it to the studio, make a beat, save it,
// and find it on your shelf later.

type Phase = "closing" | "play" | "leaving";
/**
 * Who's walked up to you: drunks (the old trouble), people who know your face
 * from your page, a crew from whoever you said no to, the one sent to ask for
 * a cut, the heavy who comes once you've seen off enough of them, Tank's ring.
 */
type Crew = "drunks" | "robbers" | "gang" | "suits" | "envoy-kings" | "envoy-syndicate" | "heavy-kings" | "heavy-syndicate" | "ring" | "tank";
const mobOf = (c: Crew): MobId | null => (c === "gang" || c.endsWith("kings") ? "kings" : c === "suits" || c.endsWith("syndicate") ? "syndicate" : null);

export default function Game({ onExit }: { onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>("closing");
  const [save, setSaveState] = useState<SaveData>(loadSave);
  const [studioEngine, setStudioEngine] = useState<Engine | null>(null);
  // beats saved in the studio, shown as tapes on the shelf (old tapes move in first)
  const [shelf, setShelf] = useState(() => {
    migrateOldTapes();
    return savedProjects();
  });
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [studio, setStudio] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [place, setPlaceName] = useState<Place>(START.place);
  const [help, setHelp] = useState(() => !loadSave().seenHelp);
  // the menu (and, the first time, the mirror), a mini-game, being knocked out
  const [menu, setMenu] = useState<{ tab: MenuTab; creator: boolean } | null>(null);
  const [mini, setMini] = useState<Mini | null>(null);
  const [phone, setPhone] = useState<PhoneTab | null>(null);
  const [ko, setKo] = useState<0 | 1 | 2>(0);
  const [fighting, setFighting] = useState(false);
  const [touch, setTouch] = useState(() => window.matchMedia("(pointer: coarse)").matches);
  const [scale, setScale] = useState(2);
  // phones held upright: text goes in the free space under the picture
  const [below, setBelow] = useState(false);
  const [down, setDown] = useState<Dir | null>(null);
  // while the lid is moving over the site, the room itself is see-through
  const [revealing, setRevealing] = useState(false);
  const calm = useSiteStore((s) => s.calm);
  const reducedPref = usePrefersReducedMotion();
  const reduced = calm || reducedPref;

  const canvas = useRef<HTMLCanvasElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const lid = useRef<HTMLDivElement>(null);
  const keys = useRef<Dir[]>([]);
  const engine = useRef<Engine | null>(null);
  const tape = useRef<{ engine: Engine; slot: number } | null>(null);
  const shelfRef = useRef(shelf);
  const closeStudioRef = useRef<() => void>(() => {});
  // the neighbourhood's people and traffic, and the music playing where you are
  const life = useRef<Actor[]>([]);
  const talks = useRef<Record<string, number>>({});
  const music = useRef<{ key: string; engine: Engine } | null>(null);
  const musicPick = useRef<Record<string, Project>>({});
  // the save as of right now (state lags a render behind)
  const saveRef = useRef(save);
  // you, as drawn
  const lookRef = useRef(lookOf(save.profile ?? DEFAULT_PROFILE));
  useLayoutEffect(() => {
    lookRef.current = lookOf(save.profile ?? DEFAULT_PROFILE);
  }, [save.profile]);
  const st = useRef({
    place: START.place as Place,
    x: START.x,
    y: START.y,
    dir: START.dir as Dir,
    walk: 0,
    stepAcc: 0,
    sitting: false,
    t: 0,
    windowOpen: false,
    figure: 0,
    figureArmed: false,
    figureGone: false,
    haze: 0,
    hazeUntil: 0,
    catLooking: false,
    catUntil: 0,
    trans: null as null | { door: Door; t: number; swapped: boolean },
    target: null as string | null,
    // this visit's small events
    outside: false,
    strangeTape: false,
    callPending: false,
    playedLedge: false,
    counterVisits: 0,
    // trouble: a group walking up to you, a fight in progress
    pending: null as Actor[] | null,
    pendingCrew: "drunks" as Crew,
    fight: null as null | { foes: Actor[]; me: Me; boss: boolean; over: number; outcome: "" | "won" | "lost"; crew: Crew },
    // Tank's fight night: which round you're on
    ring: 0,
    // money coming in on its own: seconds since the last pay-out, and what's come in since the last notice
    payAcc: 0,
    paidSince: 0,
    payTicks: 0,
    encounterIn: 95,
    shake: 0,
    fx: { beats: 0, diceRoll: 0 } as Record<string, number>,
    lastBeat: false,
    visit: {} as Record<string, number>,
    // where the visible picture starts, for the health bar
    hudX: 0,
    lastTrouble: -1e9,
    // the storm: a flash, then thunder a moment later
    bolt: 0,
    nextBolt: 40,
    thunderAt: 0,
    thunderNear: 0,
    bolts: 0,
    // on the train between stops
    ride: null as null | { to: "street" | "avenue"; t: number },
  });
  // the payphone playing your beat back down the line
  const call = useRef<{ engine: Engine; until: number } | null>(null);
  // the latest UI state, for the loop and key handlers
  const ui = useRef({ dialog, studio, help, phase, menu, mini, ko, phone });
  const view = useRef({ scale, below });
  useLayoutEffect(() => {
    view.current = { scale, below };
  }, [scale, below]);
  useLayoutEffect(() => {
    ui.current = { dialog, studio, help, phase, menu, mini, ko, phone };
  }, [dialog, studio, help, phase, menu, mini, ko, phone]);

  const updateSave = useCallback((fn: (s: SaveData) => SaveData) => {
    let next = fn(saveRef.current);
    // goals reached by this change pay out once
    const reached = newlyDone(next, { tapes: shelfRef.current });
    if (reached.length) {
      next = {
        ...next,
        goals: [...next.goals, ...reached.map((g) => g.id)],
        cash: next.cash + reached.reduce((n, g) => n + (g.reward.cash ?? 0), 0),
        rep: next.rep + reached.reduce((n, g) => n + (g.reward.rep ?? 0), 0),
      };
      const pay = (g: (typeof reached)[number]) => [g.reward.cash ? `+$${g.reward.cash}` : "", g.reward.rep ? `+${g.reward.rep} respect` : ""].filter(Boolean).join(", ");
      const msg = reached.map((g) => `Goal: ${g.name}${pay(g) ? ` (${pay(g)})` : ""}`).join(" · ");
      window.setTimeout(() => {
        sfx.unlock();
        setToast(msg);
        window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 5600);
      }, 0);
    }
    // clothes earned rather than bought
    const earned = ITEMS.filter((it) => !next.owned.includes(it.id) && ((it.unlock.kind === "goal" && next.goals.includes(it.unlock.goal)) || (it.unlock.kind === "wins" && next.stats.wins >= it.unlock.n)));
    if (earned.length) {
      next = { ...next, owned: [...next.owned, ...earned.map((it) => it.id)] };
      const msg = `Unlocked: ${earned.map((it) => it.name).join(", ")} (wardrobe)`;
      window.setTimeout(() => {
        setToast(msg);
        window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 5000);
      }, reached.length ? 5200 : 0);
    }
    saveRef.current = next;
    writeSave(next);
    setSaveState(next);
  }, []);

  // ------------------------------------------------------------ money, respect, health

  const earn = (n: number) => updateSave((v) => ({ ...v, cash: v.cash + n, stats: { ...v.stats, earned: v.stats.earned + Math.max(0, n) } }));
  const spend = (n: number) => {
    if (saveRef.current.cash < n) return false;
    updateSave((v) => ({ ...v, cash: v.cash - n }));
    return true;
  };
  const addRep = (n: number) => updateSave((v) => ({ ...v, rep: Math.max(0, v.rep + n) }));

  // ------------------------------------------------------------ the career

  /** Money your music makes: whoever you pay takes their share first. Returns what you keep. */
  const earnMusic = (n: number) => {
    const v = saveRef.current;
    const cut = cutOf(v);
    const taken = n * cut;
    const kept = n - taken;
    updateSave((x) => ({
      ...x,
      cash: x.cash + kept,
      stats: { ...x.stats, earned: x.stats.earned + kept },
      mob: cut ? (Object.fromEntries(MOB_IDS.map((id) => [id, x.mob[id].stage === "paying" ? { ...x.mob[id], paid: x.mob[id].paid + (n * MOBS[id].cut) } : x.mob[id]])) as SaveData["mob"]) : x.mob,
    }));
    return Math.round(kept);
  };

  /** A message on your phone. */
  const message = (m: Msg, note = true) => {
    updateSave((v) => ({ ...v, inbox: [m, ...v.inbox].slice(0, 30) }));
    sfx.select();
    if (note) showToast(`New message from @${m.from} (phone: P)`, 3200);
  };

  /** Followers, and the post that brought them; going up a level brings messages. */
  const addFans = (n: number, post?: { kind: PostKind; text: string }) => {
    const before = saveRef.current.fans;
    const gain = Math.max(0, Math.round(n));
    updateSave((v) => ({ ...v, fans: v.fans + gain, posts: post ? [makePost(post.kind, post.text, v.fans), ...v.posts].slice(0, 30) : v.posts }));
    const after = before + gain;
    const t0 = tierOf(before);
    const t1 = tierOf(after);
    if (t1 > t0) window.setTimeout(() => showToast(`You're ${TIERS[t1].name} now: ${fmtFans(after)} followers. More people want to work with you, and more people know your face.`, 5600), 600);
    careerCheck();
  };

  /** What your following brings round: artists who want to link, brands, and people who want a cut. */
  const careerCheck = () => {
    const v = saveRef.current;
    for (const a of ARTISTS) {
      if (a.fans === 0 || v.fans < a.fans || v.contacts.includes(a.id) || v.seen.includes(`dm-${a.id}`)) continue;
      markSeen(`dm-${a.id}`);
      const where = { street: "outside the corner store", park: "in the park", alley: "in the alley", club: "in the club", underpass: "under the bridge", rooftop: "on your roof, shooting a video", boutique: "at Maison" }[a.place as string] ?? "around";
      message({ id: `dm-${a.id}`, from: a.handle, kind: "artist", text: `been hearing your stuff everywhere. let's link. I'm ${where} most nights.`, read: false, act: { type: "link", artist: a.id } }, false);
      showToast(`@${a.handle} messaged you (phone: P)`, 3600);
      // the big ones turn up once they've heard of you
      const actor = life.current.find((x) => x.id === `artist-${a.id}`);
      if (actor) actor.hidden = false;
    }
    for (const [fans, pay, brand] of [
      [10000, 800, "a sneaker brand"],
      [50000, 4000, "a headphone company"],
    ] as [number, number, string][]) {
      if (v.fans < fans || v.seen.includes(`sponsor-${fans}`)) continue;
      markSeen(`sponsor-${fans}`);
      message({ id: `sponsor-${fans}`, from: brand.replace(/ /g, "."), kind: "offer", text: `we love what you're doing. $${pay} for one post with our stuff in it. interested?`, read: false, act: { type: "sponsor", pay } });
    }
    // someone's noticed you're getting money
    const due = mobDue(v);
    if (due && v.mob[due].stage === "none") {
      const mob = MOBS[due];
      updateSave((x) => ({ ...x, mob: { ...x.mob, [due]: { ...x.mob[due], stage: "asked" } } }));
      message({ id: `mob-${due}`, from: due === "kings" ? "rook.kings" : "unknown number", kind: "mob", text: due === "kings" ? "heard ur getting money now. we look after people round here. we'll come find u" : `${mob.boss} would like a word about your earnings. Someone will find you.`, read: false, act: { type: "mob", mob: due } });
      st.current.encounterIn = Math.min(st.current.encounterIn, 20);
    }
  };

  /** Some minutes of your songs and beat store earning (and fans writing in). */
  const payOut = (minutes: number) => {
    const s = st.current;
    const v = saveRef.current;
    const { songs, songCash, storeCash } = accrue(v, minutes);
    const total = songCash + storeCash;
    if (total > 0) {
      updateSave((x) => ({ ...x, collabs: songs, stats: { ...x.stats, royalties: x.stats.royalties + total } }));
      s.paidSince += earnMusic(total);
    }
    s.payTicks++;
    // a note every couple of minutes, not every half a minute
    if (s.payTicks % 4 === 0 && s.paidSince >= 1) {
      showToast(`Streams and leases: +$${Math.floor(s.paidSince)}${cutOf(v) ? " (after the cut)" : ""}`, 3000);
      s.paidSince = 0;
    }
    if (tierOf(v.fans) >= 1 && roll() < 0.22) message(fanDm(v.inbox.length + Math.floor(roll() * 8)), false);
    // out and about, people know you now
    const handle = (v.profile?.name || "producer").toLowerCase().replace(/[^a-z0-9._]/g, "") || "producer";
    if (tierOf(v.fans) >= 2 && SCENES[s.place].outdoors && !s.fight && !s.pending && roll() < 0.3) {
      const shouts = [`Someone across the road shouts “@${handle}!” and waves both arms.`, "Two kids stop and whisper. One of them holds a phone up, not very subtly.", `A car slows down. “Yo! ${v.profile?.name || "producer"}! Drop the tape!”`, "Somebody's playing your beat out of their phone as they walk past. They don't know you heard."];
      showToast(shouts[Math.floor(roll() * shouts.length)], 3800);
    }
    // the beat store and the songs bring a few people over on their own
    if (v.posted.length || v.collabs.length) {
      const drift = Math.round((v.posted.length * 0.6 + v.collabs.reduce((n, x) => n + x.q / 60, 0)) * (1 + Math.sqrt(v.fans) / 40) * minutes);
      if (drift) addFans(drift);
    }
  };

  // ------------------------------------------------------------ the phone

  const postBeat = () => {
    const v = saveRef.current;
    const tape = latestTape();
    if (!tape || v.posted.includes(tape.name) || (v.cd.post ?? 0) > now()) return;
    const viral = roll() < 0.08 + Math.min(0.1, priceOf(tape) / 900);
    const gain = Math.round((6 + priceOf(tape) / 2) * (1 + Math.sqrt(v.fans) / 12) * (viral ? 5 : 1));
    updateSave((x) => ({ ...x, posted: [...x.posted, tape.name], cd: { ...x.cd, post: now() + 90_000 } }));
    addFans(gain, { kind: "beat", text: viral ? `“${tape.name}” 🔥 (it's everywhere)` : `new beat: “${tape.name}”` });
    sfx.select();
    showToast(viral ? `“${tape.name}” is going viral: +${fmtFans(gain)} followers!` : `Posted “${tape.name}”: +${fmtFans(gain)} followers. It sells leases from your page now.`, 4200);
  };
  const postFit = () => {
    const v = saveRef.current;
    if (!v.profile || (v.cd.fit ?? 0) > now()) return;
    const style = styleOf(v.profile);
    const gain = Math.round((2 + style * 1.5) * (1 + Math.sqrt(v.fans) / 20) * (1 + blingOf(v.profile) / 3000));
    updateSave((x) => ({ ...x, cd: { ...x.cd, fit: Date.now() + 120_000 } }));
    addFans(gain, { kind: "fit", text: style >= 15 ? `fit check. no notes. (style ${style})` : `fit check (style ${style})` });
    sfx.select();
    showToast(`Fit pic up: +${fmtFans(gain)} followers.${style < 6 ? " Better clothes, better numbers." : ""}`, 3200);
  };
  const answer = (m: Msg, yes: boolean) => {
    updateSave((x) => ({ ...x, inbox: x.inbox.map((y) => (y.id === m.id ? { ...y, done: true, read: true } : y)) }));
    if (!yes || !m.act) return;
    if (m.act.type === "link") {
      const a = artistById(m.act.artist);
      if (!a || saveRef.current.contacts.includes(a.id)) return;
      updateSave((x) => ({ ...x, contacts: [...x.contacts, a.id] }));
      addFans(Math.round(a.reach / 3), { kind: "news", text: `linked with @${a.handle}` });
      const actor = life.current.find((x) => x.id === `artist-${a.id}`);
      if (actor) actor.hidden = false;
      showToast(`Linked with ${a.name}. Find them in person to sell a beat or make a song.`, 4200);
    } else if (m.act.type === "sponsor") {
      const pay = m.act.pay;
      earn(pay);
      addFans(Math.round(pay / 4), { kind: "news", text: "#ad (they sent a lot of free stuff)" });
      sfx.coins();
      showToast(`+$${pay}. The free stuff arrives in a very big box.`, 3600);
    }
  };
  const mobCall = (id: MobId, what: "stop" | "peace") => {
    const v = saveRef.current;
    const mob = MOBS[id];
    if (what === "stop" && v.mob[id].stage === "paying") {
      updateSave((x) => ({ ...x, mob: { ...x.mob, [id]: { ...x.mob[id], stage: "hunted" } } }));
      message({ id: `stop-${id}-${now()}`, from: id === "kings" ? "rook.kings" : "unknown number", kind: "mob", text: id === "kings" ? "so ur done paying. ok. see u outside" : "Mr. Vance noticed the payments stopped.", read: false }, false);
      showToast(`You've stopped paying ${mob.name}. Watch yourself outside.`, 4200);
    } else if (what === "peace" && v.mob[id].stage === "hunted") {
      const cost = mob.peace(v);
      if (!spend(cost)) return;
      updateSave((x) => ({ ...x, mob: { ...x.mob, [id]: { ...x.mob[id], stage: "paying", paid: x.mob[id].paid + cost } } }));
      showToast(`$${cost} to ${mob.name}. They call it off, and take ${Math.round(mob.cut * 100)}% from now on.`, 4600);
    }
  };

  // ------------------------------------------------------------ a song with someone

  const sessionDone = (artistId: string, q: number) => {
    const a = artistById(artistId);
    const tape = latestTape();
    const v = saveRef.current;
    if (!a || !tape) return;
    const { song, upfront, gain } = makeSong(a, tape, q, v.fans);
    updateSave((x) => ({ ...x, collabs: [song, ...x.collabs].slice(0, 40), rel: { ...x.rel, [a.id]: (x.rel[a.id] ?? 0) + 1 }, stats: { ...x.stats, songs: x.stats.songs + 1 }, cd: { ...x.cd, [`song-${a.id}`]: Date.now() + 4 * 60_000 } }));
    const kept = earnMusic(upfront);
    addFans(gain, { kind: "song", text: `“${song.title}” ft. ${a.name}, out now` });
    sfx.coins();
    showToast(`“${song.title}” with ${a.name} is out: +$${kept}, +${fmtFans(gain)} followers. It keeps earning (phone → money).`, 5600);
  };
  const heal = (n: number) => {
    const f = st.current.fight;
    if (f) f.me.hp = Math.min(MAX_HP, f.me.hp + n);
    updateSave((v) => ({ ...v, hp: Math.min(MAX_HP, (f ? f.me.hp : v.hp + n)) }));
  };
  /** Eat or drink the best thing you've got for how hurt you are. */
  const eatSomething = (id?: string) => {
    const v = saveRef.current;
    const hp = st.current.fight?.me.hp ?? v.hp;
    if (hp >= MAX_HP) return false;
    const have = CONSUMABLES.filter((c) => (v.items[c.id] ?? 0) > 0);
    const pick = id ? consumableById(id) : have.sort((a, b) => Math.abs(MAX_HP - hp - a.heal) - Math.abs(MAX_HP - hp - b.heal))[0];
    if (!pick || !(v.items[pick.id] > 0)) return false;
    updateSave((x) => ({ ...x, items: { ...x.items, [pick.id]: x.items[pick.id] - 1 } }));
    heal(pick.heal);
    sfx.gulp();
    showToast(`${pick.name}: ${pick.line} (+${pick.heal})`, 2600);
    return true;
  };

  const say = (lines: string[], choices?: Choice[]) => {
    sfx.talk();
    setDialog({ lines, i: 0, choices });
  };

  const showToast = (msg: string, ms = 4200) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), ms);
  };

  const find = (id: string) => {
    if (saveRef.current.found.includes(id)) return false;
    updateSave((s) => ({ ...s, found: [...s.found, id], unseen: [...s.unseen, id] }));
    sfx.found(id);
    const def = voiceById(id)!;
    showToast(`New sound: ${def.name}. It's in the studio, under Found.`, 5200);
    return true;
  };

  /** They'll remember what you played them. */
  const remember = (who: string, tape: Project) => updateSave((v) => ({ ...v, heard: { ...v.heard, [who]: tape.name } }));
  const happened = (id: string) => saveRef.current.seen.includes(id);
  const markSeen = (id: string) => !happened(id) && updateSave((v) => ({ ...v, seen: [...v.seen, id] }));

  const stopCall = () => {
    call.current?.engine.dispose();
    call.current = null;
  };

  const stopTape = () => {
    if (!tape.current) return;
    tape.current.engine.dispose();
    tape.current = null;
    duck(false);
  };

  // ------------------------------------------------------------ leaving

  const leave = useCallback(() => {
    if (ui.current.phase === "leaving") return;
    setPhase("leaving");
    setDialog(null);
    setStudio(false);
    setMenu(null);
    setMini(null);
    const f = st.current.fight;
    if (f && !f.outcome) updateSave((v) => ({ ...v, hp: Math.max(1, f.me.hp) }));
    st.current.fight = null;
    st.current.pending = null;
    setRumble(0);
    engine.current?.dispose();
    music.current?.engine.dispose();
    music.current = null;
    stopTape();
    stopCall();
    stopGameAudio();
    usePlayerStore.getState().release("game");
    const el = lid.current;
    if (!el || reduced) {
      onExit();
      return;
    }
    // the room goes dark, then the laptop opens on the site
    el.style.clipPath = "inset(0 0 0 0)";
    el.style.opacity = "0";
    const dim = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: "ease-in", fill: "forwards" });
    dim.onfinish = () => {
      setRevealing(true);
      const lift = el.animate([{ clipPath: "inset(0 0 0 0)" }, { clipPath: "inset(0 0 100% 0)" }], { duration: 650, easing: "cubic-bezier(.5,0,.2,1)", fill: "forwards" });
      lift.onfinish = onExit;
    };
  }, [onExit, reduced, updateSave]);

  // ------------------------------------------------------------ arrival

  useEffect(() => {
    usePlayerStore.getState().hold("game");
    life.current = makeLife();
    startGameAudio();
    setSfxVolume(saveRef.current.settings.sfx);
    setPlace("bedroom");
    const el = lid.current;
    const arrive = () => {
      setPhase("play");
      root.current?.focus();
      // the first time: the mirror before anything else
      if (!saveRef.current.profile) {
        updateSave((v) => ({ ...v, profile: { ...randomProfile(), name: "" } }));
        setMenu({ tab: "you", creator: true });
      }
      const p = usePlayerStore.getState();
      if (p.heldBy === "game" && p.resumeOnRelease) showToast("Music paused. It carries on when you open the laptop again.", 4800);
    };
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      arrive();
    } else {
      // the laptop lid comes down over the site
      const a = el.animate([{ clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0 0)" }], { duration: 650, easing: "cubic-bezier(.5,0,.2,1)", fill: "forwards" });
      a.onfinish = () => {
        arrive();
        const fade = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, easing: "ease-out", fill: "forwards" });
        fade.onfinish = () => {
          el.style.clipPath = "inset(0 0 100% 0)";
          fade.cancel();
          a.cancel();
        };
      };
    }
    return () => {
      // whatever way we go, nothing keeps playing and the music is handed back
      engine.current?.dispose();
      tape.current?.engine.dispose();
      music.current?.engine.dispose();
      call.current?.engine.dispose();
      clearSmoke();
      stopGameAudio();
      usePlayerStore.getState().release("game");
    };
  }, [updateSave]);

  // ------------------------------------------------------------ trouble

  const fightEv: FightEvents = {
    hit: (heavy) => sfx.hit(heavy),
    whoosh: () => sfx.whoosh(),
    hurt: () => sfx.hurt(),
    down: () => sfx.down(),
    shake: (n) => {
      if (saveRef.current.settings.shake) st.current.shake = Math.max(st.current.shake, n);
    },
  };

  /** Take foes out of the world (and put Tank and his friend back). */
  const dropFoes = (foes?: Actor[]) => {
    life.current = life.current.filter((a) => !a.fighter || (foes && !foes.includes(a)));
    standDown(life.current);
  };

  /** Foes that aren't fighting any more turn and go. */
  const walkOff = (foes: Actor[]) => {
    for (const f of foes) if (f.fighter) Object.assign(f.fighter, { state: "flee", timer: 4 });
    st.current.pending = null;
  };

  const startFight = (foes: Actor[], boss = false, crew: Crew = st.current.pendingCrew) => {
    const s = st.current;
    s.pending = null;
    for (const f of foes) Object.assign(f.fighter!, { state: "approach", cd: 0.25 + Math.random() * 0.6 });
    s.fight = { foes, me: freshMe(s.x, s.y, s.dir, saveRef.current.hp), boss, over: 0, outcome: "", crew };
    s.sitting = false;
    keys.current = [];
    setFighting(true);
    showToast(window.matchMedia("(pointer: coarse)").matches ? "A: swing · B: dodge · watch for the “!”" : "E / Space: swing · Shift: dodge · Q: eat · watch for the “!”", 3400);
  };

  /** Who comes for you, as things stand. */
  const pickCrew = (): Crew => {
    const s = st.current;
    const v = saveRef.current;
    const asked = MOB_IDS.find((id) => v.mob[id].stage === "asked");
    if (asked && s.t - (s.fx.envoyAt ?? -1e9) > 90) return `envoy-${asked}`;
    const hunted = huntedBy(v);
    if (hunted && Math.random() < 0.8) return v.mob[hunted].squads >= MOBS[hunted].squadsToHeavy ? `heavy-${hunted}` : hunted === "kings" ? "gang" : "suits";
    // the shinier you are, the more often it's someone after what you've got on
    const bling = v.profile ? Math.min(0.2, blingOf(v.profile) / 15000) : 0;
    if (Math.random() < recognised(v) + bling) return "robbers";
    // away from the rough places, it's only ever people who know you
    return ROUGH[s.place] === undefined || ROUGH[s.place] === 0 ? (tierOf(v.fans) >= 2 ? "robbers" : "drunks") : "drunks";
  };

  /** A group comes up the street at you. */
  const spawnTrouble = (want?: Crew) => {
    const s = st.current;
    const v = saveRef.current;
    const scene = SCENES[s.place];
    const w = scene.tiles[0].length * TILE;
    const crew = want ?? pickCrew();
    const diff = v.settings.difficulty;
    const kinds: FoeKind[] =
      crew === "robbers"
        ? tierOf(v.fans) >= 4 ? ["robber", "robber", "robber"] : ["robber", "robber"]
        : crew === "gang"
          ? ["gang", "gang", "gang"]
          : crew === "suits"
            ? Math.random() < 0.5 ? ["suit", "suit", "suit"] : ["suit", "suit"]
            : crew === "envoy-kings" || crew === "heavy-kings"
              ? ["rook", "gang", "gang"]
              : crew === "envoy-syndicate" || crew === "heavy-syndicate"
                ? ["kade", "suit", "suit"]
                : Array.from({ length: v.stats.wins >= 3 && Math.random() < 0.5 ? 3 : 2 }, (_, i) => (i === 0 && v.stats.wins >= 4 && Math.random() < 0.6 ? "rowdy" : "drunk"));
    const n = kinds.length;
    const side = s.x > w / 2 ? -1 : 1;
    const x0 = Math.max(14, Math.min(w - 14, s.x + side * 120));
    const foes: Actor[] = [];
    for (let i = 0; i < n; i++) {
      let y = s.y + (i - (n - 1) / 2) * 12;
      if (blocked(scene, { x: x0 - 4, y: y - 3, w: 8, h: 4 })) y = s.y;
      foes.push(makeFoe(kinds[i], s.place, x0 + side * i * 8, y, undefined, diff));
    }
    if (crew.startsWith("envoy")) s.fx.envoyAt = s.t;
    life.current.push(...foes);
    s.pending = foes;
    s.pendingCrew = crew;
    // the cat wants no part of it
    const cat = life.current.find((a) => a.kind === "cat" && a.place === s.place && a.trail);
    if (cat) catHome(cat, true);
  };

  /** They've reached you: what now? */
  const confront = () => {
    const s = st.current;
    const foes = s.pending!;
    const v = saveRef.current;
    faceOff(foes, s.x);
    s.dir = foes[0].x < s.x ? "left" : "right";
    keys.current = [];
    const crew = s.pendingCrew;
    if (crew !== "drunks") return confrontCrew(foes, crew);
    const toll = Math.min(15, Math.max(5, Math.floor(v.cash * 0.3)));
    const mine = latestTape();
    // they can tell when you're carrying Dre's tape (lose the fight and it goes with them)
    say(carrying(v) ? tapeLines() : foeLines(), [
      { label: "Fight", run: () => startFight(foes) },
      ...(mine
        ? [
            {
              label: `Play them “${mine.name}”`,
              run: () => {
                if (Math.random() < 0.5 + Math.min(0.35, v.rep / 150)) {
                  walkOff(foes);
                  addRep(2);
                  say(["You hold your phone up and press play.", "They stop. Listen. One of them starts nodding, then the other.", "“Alright. Alright. Go on then.”"]);
                } else {
                  say(["You hold your phone up and press play.", "They listen for about two bars.", "“That's rubbish, that.” Here it comes."]);
                  startFight(foes);
                }
              },
            },
          ]
        : []),
      ...(v.cash >= toll
        ? [
            {
              label: `Give them $${toll}`,
              run: () => {
                spend(toll);
                addRep(-2);
                walkOff(foes);
                say(["They take it and go, laughing.", "Your face is hot all the way down the block."]);
              },
            },
          ]
        : []),
      ...(v.rep >= 40
        ? [
            {
              label: "Do you know who I am?",
              run: () => {
                walkOff(foes);
                say(["One of them squints at you.", "“…Oh. Sorry. Didn't see it was you.”"]);
              },
            },
          ]
        : []),
      {
        label: "Walk away",
        run: () => {
          if (Math.random() < 0.5) {
            walkOff(foes);
            say(["You keep walking. They laugh, but they don't follow."]);
          } else {
            say(["You turn to go. One of them grabs your hood.", "No getting out of this one."]);
            startFight(foes);
          }
        },
      },
    ]);
  };

  /** The newer trouble: people who know your face, and the ones who want a cut. */
  const confrontCrew = (foes: Actor[], crew: Crew) => {
    const v = saveRef.current;
    const handle = (v.profile?.name || "producer").toLowerCase().replace(/[^a-z0-9._]/g, "") || "producer";
    const mobId = mobOf(crew);
    const mob = mobId ? MOBS[mobId] : null;
    const setStage = (id: MobId, stage: SaveData["mob"]["kings"]["stage"]) => updateSave((x) => ({ ...x, mob: { ...x.mob, [id]: { ...x.mob[id], stage } } }));
    const fight = () => startFight(foes, crew.startsWith("envoy") || crew.startsWith("heavy"), crew);
    if (crew === "robbers") {
      const item = v.profile ? takeable(v.profile) : null;
      const toll = Math.max(20, Math.floor(v.cash * 0.3));
      const selfie = Math.min(0.85, 0.25 + tierOf(v.fans) * 0.1);
      say(robberLines(handle, item?.name ?? null), [
        { label: "Fight", run: fight },
        ...(item
          ? [
              {
                label: `Hand over the ${item.name}`,
                run: () => {
                  loseItem(item.id);
                  walkOff(foes);
                  addRep(-3);
                  say([`You take off the ${item.name} and hold it out. One of them snatches it.`, "“Appreciate you. Big fan.” They're gone round the corner."]);
                },
              },
            ]
          : []),
        ...(v.cash >= toll
          ? [
              {
                label: `Give them $${toll}`,
                run: () => {
                  spend(toll);
                  addRep(-2);
                  walkOff(foes);
                  say(["They count it in front of you, slowly, and go.", "Somebody across the road was filming. Great."]);
                },
              },
            ]
          : []),
        {
          label: "Take a picture with them",
          run: () => {
            if (Math.random() < selfie) {
              walkOff(foes);
              addFans(8 + tierOf(v.fans) * 6, { kind: "news", text: "met some fans on the block" });
              say(["You pull your phone out first. “Picture? For the page.”", "They look at each other. One of them fixes his hair.", "Three photos later they're shaking your hand. They forget what they came for."]);
            } else {
              say(["“Picture? For the page?”", "“We're not fans, superstar.”"]);
              startFight(foes, false, crew);
            }
          },
        },
        {
          label: "Walk away",
          run: () => {
            if (Math.random() < 0.35) {
              walkOff(foes);
              say(["You keep your head down and keep moving. They shout your name after you. It's worse, somehow."]);
            } else {
              say(["You turn to go. One of them steps in front of you.", "“Nah. Not you. Not today.”"]);
              startFight(foes, false, crew);
            }
          },
        },
      ]);
      return;
    }
    if (!mobId || !mob) return startFight(foes, false, crew);
    const peace = mob.peace(v);
    const payNow = {
      label: `Pay what they want ($${peace})`,
      run: () => {
        if (!spend(peace)) return;
        updateSave((x) => ({ ...x, mob: { ...x.mob, [mobId]: { ...x.mob[mobId], stage: "paying", paid: x.mob[mobId].paid + peace } } }));
        walkOff(foes);
        say([`They take the money and count it twice.`, `“${mob.boss} says you're one of ours now. ${Math.round(mob.cut * 100)}% of what your music makes. Every time.”`]);
      },
    };
    if (crew.startsWith("envoy")) {
      const boss = mob.boss;
      say(
        mobId === "kings"
          ? ["Three of them, red bandanas. The one in front has gold teeth and a cuban link.", "“I'm Rook. These are my streets. You're making money on my streets.”", `“${Math.round(mob.cut * 100)}% of what your music makes, and nobody touches you round here. Simple.”`]
          : ["A man in a white suit, two more in black behind him. He doesn't take his shades off.", `“Kade. I work for ${boss}. He's been watching your numbers go up.”`, `“A quarter of everything. In return, the city's a lot friendlier. Think about how unfriendly it could be.”`],
        [
          {
            label: `Pay the ${Math.round(mob.cut * 100)}%`,
            run: () => {
              setStage(mobId, "paying");
              walkOff(foes);
              say([mobId === "kings" ? "Rook grins. Gold. “Smart. Nobody's going to bother you now. Not much, anyway.”" : "“Mr. Vance will be pleased.” They're back in the car before you've said anything else.", `(${Math.round(mob.cut * 100)}% of what your music makes goes to ${mob.name}. You can stop on your phone.)`]);
            },
          },
          {
            label: "No.",
            run: () => {
              setStage(mobId, "hunted");
              walkOff(foes);
              message({ id: `threat-${mobId}-${Date.now()}`, from: mobId === "kings" ? "rook.kings" : "unknown number", kind: "mob", text: mobId === "kings" ? "ok. remember u said no" : "Mr. Vance is disappointed. Watch yourself.", read: false });
              say(mobId === "kings" ? ["Rook laughs. Nobody else does.", "“Okay. Okay, producer. We'll see you around. All of us.”"] : ["Kade nods slowly, like he expected that.", "“Then the city's going to get a lot smaller for you.”"]);
            },
          },
          {
            label: "Let me think about it",
            run: () => {
              walkOff(foes);
              say(["“Think quick.” They go, and you can feel them watching all the way down the block."]);
            },
          },
          { label: "Fight them here", run: fight },
        ],
      );
      return;
    }
    say(
      crew.startsWith("heavy")
        ? mobId === "kings"
          ? ["Rook himself this time, with a bat with nails in it.", "“You've been embarrassing my people. That stops tonight.”"]
          : ["The white suit again. Kade's got a cane with a gold top, and he's not leaning on it.", "“Mr. Vance doesn't send people a fourth time. He sends me.”"]
        : mobId === "kings"
          ? [["“Rook says hi.” Red bandanas, three of them."], ["“You should've paid.”"], ["“Kings run this block. You knew that.”"]][Math.floor(roll() * 3)]
          : [["Two men in suits get out of a car that doesn't stop running.", "“Mr. Vance sends his regards.”"], ["“Nothing personal. It's business.”"]][Math.floor(roll() * 2)],
      [{ label: "Fight", run: fight }, ...(v.cash >= peace ? [payNow] : []), ...(crew.startsWith("heavy") ? [] : [{ label: "Run", run: () => (Math.random() < 0.4 ? (walkOff(foes), say(["You run. You don't stop till the next block."])) : (say(["You run. They're faster."]), startFight(foes, false, crew))) }])],
    );
  };

  /** Esc while they're in your face: the one sent to ask goes off to let you think; anyone else doesn't let you leave. */
  const turnAway = () => {
    const s = st.current;
    const foes = s.pending;
    if (!foes) return setDialog(null);
    if (s.pendingCrew.startsWith("envoy")) {
      walkOff(foes);
      say(["“Think quick.” They go, and you can feel them watching all the way down the block."]);
    } else if (s.pendingCrew === "drunks" && Math.random() < 0.5) {
      walkOff(foes);
      say(["You keep walking. They laugh, but they don't follow."]);
    } else {
      say(["You try to walk off. One of them steps in front of you.", "No getting out of this one."]);
      startFight(foes, s.pendingCrew.startsWith("heavy"), s.pendingCrew);
    }
  };

  /** Something you had on, gone (unequipped, out of your wardrobe). */
  const loseItem = (id: string) => {
    const it = itemById(id);
    if (!it) return;
    updateSave((x) => ({ ...x, owned: x.owned.filter((o) => o !== id), profile: x.profile && x.profile[it.slot]?.id === id ? { ...x.profile, [it.slot]: it.slot === "top" ? { id: "tee", color: 0 } : it.slot === "shoes" ? { id: "sneakers", color: 0 } : it.slot === "pants" ? { id: "jeans", color: 0 } : null } : x.profile }));
  };

  /** Tank's fight night: a round at a time, in the middle of the underpass. */
  const ringRound = (round: number) => {
    const s = st.current;
    const v = saveRef.current;
    s.ring = round;
    const diff = v.settings.difficulty;
    const kinds: FoeKind[] = round === 1 ? ["boxer", "boxer"] : round === 2 ? ["boxer", "boxer", "boxer"] : ["champ"];
    const foes = kinds.map((k, i) => makeFoe(k, "underpass", s.x + 60 + i * 10, s.y + (i - (kinds.length - 1) / 2) * 12, undefined, diff));
    life.current.push(...foes);
    say(round === 3 ? ["Round three. The crowd parts for a man in a gold jersey.", "“Champ,” somebody says. Not to you."] : [`Round ${round}.`, round === 1 ? "Tank holds his arm out between you and them, then drops it." : "No break. They're already coming."]);
    startFight(foes, round === 3, "ring");
    s.encounterIn = Math.max(s.encounterIn, 90);
  };
  const ringStart = () => {
    const s = st.current;
    if (s.place !== "underpass") return;
    Object.assign(s, { x: 17.5 * TILE, y: 8.6 * TILE, dir: "right", sitting: false });
    cheerFor(life.current, (a) => a.place === "underpass" && a.kind === "person" && !a.fighter);
    ringRound(1);
  };

  const bossFight = () => {
    const s = st.current;
    const tank = life.current.find((a) => a.id === "tank");
    const goon = life.current.find((a) => a.id === "goon");
    if (!tank) return;
    tank.hidden = true;
    if (goon) goon.hidden = true;
    const diff = saveRef.current.settings.difficulty;
    const boss = makeFoe("boss", "underpass", tank.x, tank.y, undefined, diff);
    const foes = [boss, ...(goon ? [makeFoe("goon", "underpass", goon.x, goon.y, goon.look, diff)] : [])];
    life.current.push(...foes);
    say(["The cypher stops. Everyone steps back.", "Tank rolls his shoulders. His friend cracks his knuckles."]);
    startFight(foes, true, "tank");
    s.encounterIn = Math.max(s.encounterIn, 60);
  };

  const winFight = () => {
    const s = st.current;
    const f = s.fight!;
    f.outcome = "won";
    setFighting(false);
    const v = saveRef.current;
    const crew = f.crew;
    // the ring: on to the next round, or the purse
    if (crew === "ring") {
      const round = s.ring;
      updateSave((x) => ({ ...x, hp: Math.min(MAX_HP, f.me.hp + 25) }));
      sfx.cheer();
      cheerFor(life.current, (a) => a.place === "underpass" && a.kind === "person" && !a.fighter);
      if (round < 3) {
        const purse = round * 40;
        window.setTimeout(
          () =>
            say([`Round ${round}: yours. Tank throws you a towel. (+25 health)`], [
              { label: `Round ${round + 1}`, run: () => ringRound(round + 1) },
              {
                label: `Take $${purse} and go`,
                run: () => {
                  earn(purse);
                  s.ring = 0;
                  say(["Tank counts it into your hand. “Smart. Or scared. Same money.”"]);
                },
              },
            ]),
          500,
        );
        return;
      }
      s.ring = 0;
      updateSave((x) => ({ ...x, stats: { ...x.stats, ringWins: x.stats.ringWins + 1, wins: x.stats.wins + 1 } }));
      earn(150);
      addRep(15);
      addFans(150 + tierOf(v.fans) * 60, { kind: "fight", text: "fight night champion 🏆" });
      sfx.coins();
      window.setTimeout(() => say(["The champ stays down. The whole underpass loses it.", "Tank lifts your arm. “Fight night. Yours.”", "(+$150, +15 respect, and somebody got it all on video)"]), 500);
      return;
    }
    const mobId = mobOf(crew);
    const heavy = !!mobId && (crew.startsWith("heavy") || crew.startsWith("envoy"));
    const cash = f.foes.reduce((n, a) => n + (a.fighter?.purse ?? 0), 0);
    const rep = heavy ? 30 : f.boss ? 25 : 4 * f.foes.length;
    const wins = v.stats.wins + 1;
    const gained = [...unlockedByWins(wins), ...(crew === "tank" ? ["mic"] : []), ...(heavy ? [mobId === "kings" ? "spiked" : "cane"] : [])].filter((w) => !v.weapons.includes(w));
    // a crew seen off counts towards the heavy coming; the heavy down, and that's the end of it
    if (mobId) updateSave((x) => ({ ...x, mob: { ...x.mob, [mobId]: heavy ? { ...x.mob[mobId], stage: "done" } : { ...x.mob[mobId], squads: x.mob[mobId].squads + (x.mob[mobId].stage === "hunted" ? 1 : 0) } } }));
    // people film fights, once people know who you are
    const clip = crew === "drunks" && tierOf(v.fans) === 0 ? 0 : heavy ? 300 + tierOf(v.fans) * 150 : crew === "tank" ? 80 : 4 + tierOf(v.fans) * 8;
    if (clip) addFans(clip, { kind: "fight", text: heavy ? `${mobId === "kings" ? "Rook" : "Kade"} found out` : crew === "tank" ? "the underpass has a new name in it" : "someone filmed it. you're welcome" });
    updateSave((x) => ({
      ...x,
      hp: f.me.hp,
      cash: x.cash + cash,
      rep: x.rep + rep,
      stats: { ...x.stats, wins, earned: x.stats.earned + cash },
      weapons: [...x.weapons, ...gained],
      seen: f.boss && !x.seen.includes("tank-beaten") ? [...x.seen, "tank-beaten"] : x.seen,
    }));
    sfx.coins();
    const w = gained.length ? weaponById(gained[gained.length - 1]) : null;
    const squads = mobId && !heavy ? saveRef.current.mob[mobId] : null;
    const lines = [
      heavy
        ? mobId === "kings"
          ? "Rook goes down, gold teeth and all. His boys pick him up and drag him off."
          : "Kade goes down in his white suit, in a puddle. The car drives off without him."
        : crew === "tank"
          ? "Tank goes down, and stays down a while. Nobody in the cypher says a word."
          : f.foes.length > 2
            ? "The last of them hits the pavement."
            : "Both of them on the ground. Your hands are shaking.",
      ...cheer(),
      `They leave $${cash} behind getting up. (+${rep} respect)`,
      ...(heavy ? [mobId === "kings" ? "The Block Kings won't be asking you for anything again." : "Mr. Vance sends a message, later: “Understood.” That's all."] : []),
      ...(squads && squads.stage === "hunted" && mobId ? [squads.squads >= MOBS[mobId].squadsToHeavy ? `That's ${squads.squads} of their crews. ${MOBS[mobId].heavy} will come himself next.` : `${squads.squads} of ${MOBS[mobId].squadsToHeavy} of their crews seen off.`] : []),
      ...(clip >= 10 ? [`Someone filmed it. (+${fmtFans(clip)} followers)`] : []),
      ...(w ? [w.found] : []),
    ];
    window.setTimeout(() => {
      say(lines, w ? [
        { label: `Use the ${w.name}`, run: () => updateSave((x) => ({ ...x, weapon: w.id })) },
        { label: "Keep what I've got", run: () => setDialog(null) },
      ] : undefined);
    }, 500);
  };

  /** Everyone who saw it reacts; returns what one of them says. */
  const cheer = (): string[] => {
    const s = st.current;
    const saw = life.current.filter((a) => a.place === s.place && a.kind === "person" && !a.fighter && !a.hidden && Math.hypot(a.x - s.x, a.y - s.y) < 170);
    for (const a of saw) a.react = 2.4;
    if (!saw.length) return [];
    if (s.place === "underpass") return ["Then the whole cypher goes up at once. Somebody starts a verse about it."];
    const who = saw.sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0];
    const said: Record<string, string> = {
      "barrel-man": "The man by the fire doesn't look up. \u201cTold you. Don't stand still.\u201d",
      "dice-1": "Jay whistles through his teeth. \u201cI'd have bet on you. I didn't, but I would have.\u201d",
      "dice-2": "Jay whistles through his teeth. \u201cI'd have bet on you. I didn't, but I would have.\u201d",
      "cd-guy": "The CD guy holds one up at you. \u201cSoundtrack to that? Five dollars.\u201d",
      bouncer: "The bouncer nods at you, once. That's a lot, from him.",
      busker: "The busker plays you a little fanfare on the keys.",
      dre: "Dre doesn't clap. He just nods, like he knew.",
    };
    const generic = ["\u201cYES! Did you see that?\u201d Somebody saw that.", "A whistle from across the way. Nobody comes over, but everybody saw.", "Someone starts clapping, slow, then stops when you look."];
    return [said[who.id] ?? generic[Math.floor(Math.random() * generic.length)]];
  };

  const knockout = () => {
    const s = st.current;
    s.fight!.outcome = "lost";
    setFighting(false);
    sfx.down();
    setKo(1);
    window.setTimeout(() => setKo(2), 1400);
  };

  const wake = () => {
    const s = st.current;
    const v = saveRef.current;
    const crew = s.fight?.crew ?? "drunks";
    // the ring: no pockets gone through, just the concrete and Tank with a bottle of water
    if (crew === "ring") {
      const round = s.ring;
      updateSave((x) => ({ ...x, hp: 45, stats: { ...x.stats, losses: x.stats.losses + 1 } }));
      dropFoes();
      Object.assign(s, { fight: null, pending: null, ring: 0 });
      setKo(0);
      say([`You come round on the concrete. Round ${round}, gone.`, "Tank hands you a bottle of water. “Next time.” (health 45)"]);
      root.current?.focus();
      return;
    }
    // the ones who knew who you were take more, and what you had on
    const share = crew === "drunks" ? 0.25 : crew === "robbers" ? 0.3 : 0.4;
    const lost = Math.floor(v.cash * share);
    const item = crew !== "drunks" && crew !== "tank" && v.profile ? takeable(v.profile) : null;
    if (item) loseItem(item.id);
    // Dre's tape went with whoever went through your pockets: the job's off (he'll want to hear about it)
    const tapeGone = carrying(v);
    updateSave((x) => ({ ...x, hp: 60, cash: x.cash - lost, stats: { ...x.stats, losses: x.stats.losses + 1 }, job: tapeGone && x.job ? { ...x.job, stage: "lost" } : x.job }));
    dropFoes();
    s.fight = null;
    s.pending = null;
    if (s.place !== "bedroom") arriveRef.current("bedroom", s.place);
    Object.assign(s, { place: "bedroom", x: 13.6 * TILE, y: 5.4 * TILE, dir: "right", sitting: false, trans: null });
    setPlace("bedroom", s.windowOpen);
    setPlaceName("bedroom");
    setKo(0);
    say(["You wake up on your bedroom floor. No idea how you got home.", lost ? `Your pockets are $${lost} lighter.` : "Your pockets were empty anyway.", ...(item ? [`Your ${item.name}'s gone too.`] : []), ...(tapeGone ? ["Dre's tape is gone too. He's not going to like that."] : []), "Your head's pounding. (health 60)"]);
    root.current?.focus();
  };

  /** Out through a door mid-fight. */
  const flee = () => {
    const s = st.current;
    const f = s.fight;
    if (!f) return;
    updateSave((x) => ({ ...x, hp: f.me.hp, rep: Math.max(0, x.rep - 1), stats: { ...x.stats, fled: x.stats.fled + 1 } }));
    dropFoes(f.foes);
    s.fight = null;
    s.ring = 0;
    setFighting(false);
    showToast("You got away.", 2400);
  };

  const attack = () => {
    const s = st.current;
    const f = s.fight;
    if (!f || f.outcome || f.me.atkCd > 0) return;
    const w = weaponById(saveRef.current.weapon);
    f.me.atk = 0.18;
    f.me.atkCd = w.cooldown;
    f.me.dir = s.dir;
    swing(f.foes, f.me, w, fightEv);
  };

  const dodge = () => {
    const f = st.current.fight;
    if (f && !f.outcome && startDodge(f.me, keys.current)) sfx.dodge();
  };

  /** On the train: the carriage for a moment, then off at the next stop (the loop does the arriving). */
  const rideTo = (to: "street" | "avenue") => {
    const s = st.current;
    setDialog(null);
    keys.current = [];
    s.ride = { to, t: 0 };
    s.sitting = false;
    sfx.chime();
    window.setTimeout(() => sfx.announce(8), 500);
  };

  const latestTape = (): Project | null => {
    const slots = loadStore().slots.filter((p): p is Project => !!p);
    return slots.length ? slots[slots.length - 1] : null;
  };

  /** What the newer places' scripts get to do (scripts.ts). */
  const api: Api = {
    say,
    close: () => setDialog(null),
    toast: showToast,
    find,
    save: () => saveRef.current,
    update: updateSave,
    earn,
    spend,
    addRep,
    heal,
    tape: latestTape,
    open: (m) => {
      setDialog(null);
      setMini(m);
    },
    menu: (tab) => {
      setDialog(null);
      setMenu({ tab, creator: false });
    },
    bossFight,
    happened,
    markSeen,
    radio: (ids) => void sfx.radio(ids),
    someChops: () => {
      const track = TRACKS[Math.floor(Math.random() * TRACKS.length)];
      const i = 1 + Math.floor(Math.random() * 6);
      return [`chop:${track.id}:${i}`, `chop:${track.id}:${i + 1}`, `chop:${track.id}:${i + 2}`];
    },
    sfx,
    ride: (to) => rideTo(to),
    music: earnMusic,
    fans: addFans,
    ring: () => {
      setDialog(null);
      ringStart();
    },
    life: () => life.current,
    t: () => st.current.t,
    get visit() {
      return st.current.visit;
    },
  };

  /** Walking into a place: what's waiting there this time. */
  const arriveAt = (to: Place, from: Place) => {
    const s = st.current;
    const v = saveRef.current;
    if (from === "street" && to !== "street") stopCall();
    if (from === "rooftop" && to !== "rooftop") delete musicPick.current.rooftop;
    if (to !== "bedroom") s.outside = true;
    // back from outside, with tapes of your own: one on the shelf you didn't make
    if (to === "bedroom" && s.outside && shelfRef.current > 0 && !v.seen.includes("unlabelled")) s.strangeTape = true;
    // once you've played your beat for someone, the payphone rings again
    if (to === "street" && v.found.includes("phone") && Object.keys(v.heard).length > 0 && shelfRef.current > 0 && !v.seen.includes("callback")) s.callPending = true;
    // she was on the ledge while your tape played; come back up and she isn't
    const ledge = life.current.find((a) => a.id === "ledge");
    if (to === "rooftop" && ledge && s.playedLedge) ledge.hidden = true;
    // trouble doesn't follow you through doors; a fight is a getaway (and one you've won is over)
    if (s.fight && !s.fight.outcome) flee();
    else if (s.fight?.outcome === "won") {
      dropFoes(s.fight.foes);
      s.fight = null;
    }
    if (s.pending) {
      dropFoes(s.pending);
      s.pending = null;
    }
    // the cat doesn't leave the alley: once you're gone it's back on one of its spots
    const cat = life.current.find((a) => a.kind === "cat" && a.place === from && a.trail);
    if (cat) {
      catHome(cat);
      if (cat.goal) [cat.x, cat.y] = cat.goal;
      Object.assign(cat, { goal: undefined, walking: false });
    }
    s.visit = {};
    if (!v.places.includes(to)) updateSave((x) => ({ ...x, places: [...x.places, to] }));
    // the rough places: sometimes they're waiting (more often while you carry Dre's tape)
    const rough = ambushOdds(to, v);
    if (rough && v.profile?.name && s.t - s.lastTrouble > BREATHER && Math.random() < rough && s.encounterIn > 4) s.encounterIn = 2.5 + Math.random() * 3;
    // Vee shows up at the underpass once you've sold a beat or played the cypher; the first time, she comes to you
    const vee = life.current.find((a) => a.id === "vee");
    if (vee) vee.hidden = !(v.stats.beatsSold > 0 || v.stats.cypherBest > 0 || v.stats.battleWins + v.stats.battleLosses > 0);
    if (to === "underpass" && vee && !vee.hidden && !v.seen.includes("vee")) {
      // as soon as you're free (not talking, not fighting), while you're still here
      const call = (tries: number) => {
        const s2 = st.current;
        if (s2.place !== "underpass" || happened("vee") || tries > 40) return;
        if (ui.current.dialog || ui.current.mini || ui.current.menu || (s2.fight && !s2.fight.outcome) || s2.pending) return void window.setTimeout(() => call(tries + 1), 500);
        markSeen("vee");
        battle(api, true);
      };
      window.setTimeout(() => call(0), 900);
    }
    // the big artists are only round once they've heard of you
    for (const a of ARTISTS) {
      const actor = life.current.find((x) => x.id === `artist-${a.id}`);
      if (actor) actor.hidden = v.fans < a.show && !v.contacts.includes(a.id);
    }
    // the bouncer steps aside for people he'll let in
    const bouncer = life.current.find((a) => a.id === "bouncer");
    if (to === "avenue" && bouncer) bouncer.x = (clubOk(v) ? 36.9 : 35.5) * TILE;
    if (to === "club" && !v.places.includes("club")) window.setTimeout(() => showToast("The bass is in your chest before the door shuts.", 3600), 300);
  };

  const arriveRef = useRef(arriveAt);
  useLayoutEffect(() => {
    arriveRef.current = arriveAt;
  });
  const rhythmDone = (mode: "cypher" | "dj", score: number) => {
    const v = saveRef.current;
    const s = st.current;
    const best = mode === "cypher" ? v.stats.cypherBest : v.stats.djBest;
    // the first set in a while pays; play straight again and the crowd's thinner
    const key = `paid-${mode}`;
    const fresh = !(s.t - (s.fx[key] ?? -1e9) < 180);
    const full = mode === "dj" ? (score >= 50 ? 15 + Math.round((score - 50) * 0.75) : Math.round(score * 0.1)) : Math.floor(score / 10) * 2;
    const cash = fresh ? full : Math.floor(full / 3);
    // respect for a good set the first time round, and for beating your best
    const rep = (fresh ? Math.floor(score / (mode === "dj" ? 12 : 10)) : 0) + (score > best ? Math.floor((score - best) / 10) : 0);
    if (fresh && score >= 30) s.fx[key] = s.t;
    updateSave((x) => ({ ...x, stats: { ...x.stats, [mode === "cypher" ? "cypherBest" : "djBest"]: Math.max(best, score) }, heard: mode === "dj" ? { ...x.heard, dj: "a set" } : x.heard }));
    if (cash) earn(cash);
    if (rep) addRep(rep);
    // a good set gets posted (by you, and by people in the crowd)
    const fans = fresh && score >= 40 ? Math.round((mode === "dj" ? score / 2 : score / 5) * (1 + tierOf(v.fans) * 0.5)) : 0;
    if (fans) addFans(fans, { kind: "show", text: mode === "dj" ? `took the decks at the club: ${score}%` : `kept the cypher going: ${score}%` });
    if (score >= 50) sfx.cheer();
    find(mode === "cypher" ? "mic" : "crowd");
    showToast(`${score}%: ${cash ? `+$${cash}` : "no money"}${rep ? `, +${rep} respect` : ""}${score > best ? " (your best)" : ""}${!fresh ? " · the crowd's thinner the second time" : ""}`, 4200);
  };
  /** The end of a beat battle: the stake was paid going in; a win pays it back double. */
  const battleDone = (score: number, rival: { name: string; score: number; stake: number }) => {
    const won = score >= rival.score;
    updateSave((x) => ({ ...x, stats: { ...x.stats, battleWins: x.stats.battleWins + (won ? 1 : 0), battleLosses: x.stats.battleLosses + (won ? 0 : 1) } }));
    if (won) {
      earn(rival.stake * 2);
      addRep(8);
      addFans(20 + tierOf(saveRef.current.fans) * 15, { kind: "show", text: `beat ${rival.name} under the bridge, ${score}% to ${rival.score}%` });
      sfx.cheer();
      cheerFor(life.current, (a) => a.place === "underpass" && a.id.startsWith("mc-"));
    }
    showToast(won ? `${score}% to ${rival.name}'s ${rival.score}%: +$${rival.stake * 2}, +8 respect` : `${score}% to ${rival.name}'s ${rival.score}%: ${rival.name} keeps your $${rival.stake}`, 4600);
  };
  // for the browser tests: a rhythm game's ending, without playing it
  const rhythmRef = useRef<(mode: "cypher" | "dj", score: number) => void>(() => {});
  const battleRef = useRef(battleDone);
  useLayoutEffect(() => {
    rhythmRef.current = rhythmDone;
    battleRef.current = battleDone;
  });

  // ------------------------------------------------------------ the studio

  // "sample this" from the Beats window: the project waiting to be opened
  const [sampled, setSampled] = useState<{ project: Project; msg: string } | null>(() => {
    const want = useSiteStore.getState().sample;
    const track = want && TRACKS.find((t) => t.id === want.trackId);
    const project = track && sampleProject(track.id, want.at, track.key);
    return project ? { project, msg: `Cut two bars of ${track.title} from ${formatTime(want.at)}. Undo brings back what you had.` } : null;
  });

  const openStudio = () => {
    stopTape();
    if (!engine.current) {
      const store = loadStore();
      engine.current = new Engine(store.current ?? PRESETS[0].make());
    }
    setStudioEngine(engine.current);
    setDialog(null);
    setHelp(false);
    duck(true);
    setStudio(true);
  };

  /** The shortcut: straight down to the basement and into the studio. */
  const goToStudio = () => {
    const s = st.current;
    if (s.place === "bedroom") stopTape();
    Object.assign(s, { place: "studio", x: 8 * TILE, y: 3.7 * TILE, dir: "up", sitting: false, trans: null });
    setPlace("studio");
    setPlaceName("studio");
    if (!saveRef.current.seenHelp) updateSave((v) => ({ ...v, seenHelp: true }));
    openStudio();
  };

  // arriving from "sample this": skip the room, straight to the sampler with the cut
  useEffect(() => {
    useSiteStore.setState({ sample: null });
    if (!sampled) return;
    const t = window.setTimeout(goToStudio, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------ people

  const smokeWith = () => {
    const s = st.current;
    s.hazeUntil = s.t + 25;
    sfx.flick();
    say(["You take one pull and pass it back.", "The room goes soft around the edges."]);
  };

  /** Play something on the boombox (street) or the studio monitors. */
  const playFor = (where: "street" | "studio" | "rooftop", project: Project) => {
    musicPick.current[where] = clone(project);
    if (music.current?.key === where) {
      music.current.engine.dispose();
      music.current = null;
    }
  };

  const talkTo = (a: Actor) => {
    const s = st.current;
    const n = talks.current[a.id] ?? 0;
    talks.current[a.id] = n + 1;
    const lines = LINES[a.id];
    const next = lines ? lines[n % lines.length] : ["…"];
    const tape = latestTape();
    const heard = saveRef.current.heard;
    // someone who's heard an older tape notices there's a new one
    const newer = (who: string) => !!tape && !!heard[who] && heard[who] !== tape.name;
    switch (a.id) {
      case "dog":
        say(["The dog leans on your leg for a second, then remembers the walk."]);
        return;
      case "alley-cat": {
        // pet it enough and it comes along for a bit
        const pets = (s.visit.pets ?? 0) + 1;
        s.visit.pets = pets;
        // it stays for a bit once it's been petted, so you can carry on
        a.settled = 8;
        if (pets < CAT_PETS) {
          say(next);
          return;
        }
        const again = !!s.visit.catFollowed;
        s.visit.catFollowed = 1;
        catFollows(a);
        say([...next, again ? "When you move off, it comes too. Again." : "When you step away, it gets up and follows you. A few steps behind, like it was going that way anyway."]);
        return;
      }
      case "crew-smoke":
        if (heard.crew && n % 2 === 0) {
          say([`\u201cMilo won't stop playing \u2018${heard.crew}\u2019. Whole block knows it now.\u201d`], [
            { label: "Hit the joint", run: smokeWith },
            { label: "I'm good", run: () => say(["\u201cSuit yourself.\u201d"]) },
          ]);
          return;
        }
        say(next, [
          { label: "Hit the joint", run: smokeWith },
          { label: "I'm good", run: () => say(["\u201cSuit yourself.\u201d"]) },
        ]);
        return;
      case "crew-drink":
        say(next, [
          { label: "Take a sip", run: () => say(["Warm, sweet, too strong. You hand it back.", "\u201cSee? Medicine.\u201d"]) },
          { label: "No thanks", run: () => setDialog(null) },
        ]);
        return;
      case "crew-box":
        boombox();
        return;
      case "couch-cup":
        if (heard.couch && n % 2 === 0) {
          say([`\u201cThat \u2018${heard.couch}\u2019. Run it again sometime.\u201d`, "He taps the cup against his knee, somewhere near the beat."]);
          return;
        }
        say(next, [
          { label: "Pour me one?", run: () => say(["\u201cNah. Not while you're working.\u201d", "He takes a long sip, eyes half shut."]) },
          { label: "Just looking", run: () => setDialog(null) },
        ]);
        return;
      case "couch-blunt":
        say(next, [
          { label: "Hit it", run: smokeWith },
          { label: "Pass", run: () => say(["\u201cMore for the couch.\u201d"]) },
        ]);
        return;
      case "couch-phones":
        if (tape)
          say([...next, heard.couch ? (newer("couch") ? `\u201cStill got \u2018${heard.couch}\u2019 in my head. That a new one?\u201d` : `\u201c\u2018${heard.couch}\u2019 again? Go on then.\u201d`) : "\u201cPlay me something you made.\u201d"], [
            {
              label: `Play \u201c${tape.name}\u201d`,
              run: () => {
                playFor("studio", tape);
                remember("couch", tape);
                say(["It comes out of the monitors, loud.", "The whole couch starts nodding.", newer("couch") || !heard.couch ? "Nobody talks till it loops." : "\u201cYeah. That one.\u201d"]);
              },
            },
            { label: "Not yet", run: () => say(["\u201cThen go make something.\u201d"]) },
          ]);
        else say([...next, "\u201cMake something first. The sampler's right there.\u201d"]);
        return;
      case "oldman":
        if (tape && (!heard.oldman || newer("oldman"))) {
          say(heard.oldman ? [`\u201cYou again. Still humming your \u2018${heard.oldman}\u2019.\u201d`, "\u201cGot another?\u201d"] : ["\u201cYou're the one with the light on all night. Making noise up there.\u201d", "\u201cLet me hear it, then.\u201d"], [
            {
              label: `Give him your headphones`,
              run: () => {
                sfx.select();
                remember("oldman", tape);
                say(["He holds one side to his ear and looks at the pigeons.", "His foot finds it after a bar.", ...verdict(tape), "He hands them back. \u201cDon't stop.\u201d"]);
              },
            },
            { label: "Not now", run: () => say(["\u201cI'm here most nights.\u201d"]) },
          ]);
          return;
        }
        if (heard.oldman && n % 2 === 0) {
          say([`\u201cThat \u2018${heard.oldman}\u2019 of yours. The pigeons liked it too.\u201d`]);
          return;
        }
        say(next);
        return;
      case "ledge":
        if (tape && !s.playedLedge) {
          say(heard.ledge ? [`\u201cYou played me \u2018${heard.ledge}\u2019 once.\u201d`, "\u201cPlay it again. Or something new.\u201d"] : ["She doesn't turn around.", "\u201cYou make them, don't you. The sounds from your window.\u201d"], [
            {
              label: `Play \u201c${tape.name}\u201d on your phone`,
              run: () => {
                s.playedLedge = true;
                playFor("rooftop", tape);
                remember("ledge", tape);
                say(["You put it on, quiet, and set the phone on the ledge between you.", "Across the street, windows start coming on."]);
              },
            },
            { label: "Just sit", run: () => say(["You sit a while. Neither of you says anything. It's fine."]) },
          ]);
          return;
        }
        say(s.playedLedge ? ["\u201cLeave it on.\u201d"] : next);
        return;
      case "hooper-1":
      case "hooper-2":
        say(next, [
          { label: "Take a shot", run: () => setMini({ kind: "hoops" }) },
          { label: "Watch", run: () => setDialog(null) },
        ]);
        return;
      default:
        if (!talkMore(a, api)) say(next);
    }
  };

  const boombox = () => {
    const tape = latestTape();
    const choices = [
      ...(tape
        ? [
            {
              label: `Play them \u201c${tape.name}\u201d`,
              run: () => {
                playFor("street", tape);
                const before = saveRef.current.heard.crew;
                remember("crew", tape);
                say(before ? ["Milo swaps it in without a word.", before === tape.name ? "\u201cThis again? Good.\u201d" : `\u201cBetter than \u2018${before}\u2019. Don't tell \u2018${before}\u2019.\u201d`] : ["Milo slots your tape in and turns it up.", "\u201cWait. You made this?\u201d", "Nobody says anything else. Heads start going."]);
              },
            },
          ]
        : []),
      { label: "Turn it down", run: () => say(["\u201cNah.\u201d"]) },
      { label: "Leave it", run: () => setDialog(null) },
    ];
    say(tape ? ["\u201cYou got something on you?\u201d"] : ["\u201cThis speaker's older than me.\u201d", "\u201cBring us a tape sometime. Something you made.\u201d"], choices);
  };

  // ------------------------------------------------------------ interactions

  const interact = useCallback(
    (id: string) => {
      const s = st.current;
      const found = saveRef.current.found;
      sfx.select();
      switch (id) {
        case "laptop":
          leave();
          break;
        case "window":
          s.windowOpen = !s.windowOpen;
          setPlace("bedroom", s.windowOpen);
          if (s.windowOpen && find("rain")) say(["You open the window. Rain on the sill, close enough to record."]);
          else say([s.windowOpen ? "You open the window. The rain gets louder." : "You close the window."]);
          break;
        case "shelf": {
          const store = loadStore();
          if (s.strangeTape) {
            // a tape you don't remember making: your own beat, slower, from further away
            s.strangeTape = false;
            markSeen("unlabelled");
            const mine = latestTape();
            stopTape();
            if (mine) {
              const slow = clone(mine);
              slow.tempo = Math.max(60, Math.round(mine.tempo * 0.72));
              slow.channels.forEach((c) => {
                c.pitch -= 4;
                c.rev = Math.min(1, c.rev + 0.35);
              });
              slow.master = { ...slow.master, cutoff: 0.42, drive: 0.5, reverb: 0.9 };
              slow.mode = "pattern";
              const player = new Engine(slow);
              void player.start();
              tape.current = { engine: player, slot: -1 };
              duck(true);
            }
            say(["A black tape at the end of the shelf. No label. You don't remember it.", "It's yours. Slower, and from further away, like through a wall.", "When it stops, the tape isn't on the shelf any more."]);
            break;
          }
          const slots = store.slots.map((t, i) => (t ? i : -1)).filter((i) => i >= 0);
          if (!slots.length) {
            say(["A shelf for tapes. It's empty.", "Beats you save in the studio end up here."]);
            break;
          }
          const cur = tape.current?.slot ?? -1;
          const next = slots.find((i) => i > cur);
          stopTape();
          if (next === undefined) {
            showToast("Tape stopped.", 1800);
            break;
          }
          const project = store.slots[next]!;
          const player = new Engine(project);
          void player.start();
          tape.current = { engine: player, slot: next };
          duck(true);
          showToast(`Playing “${project.name}”. Use the shelf again for the next tape.`, 3200);
          break;
        }
        case "bed":
          if (saveRef.current.hp < MAX_HP)
            say(["Your bed. Your whole body wants it."], [
              {
                label: "Sleep it off",
                run: () => {
                  updateSave((v) => ({ ...v, hp: MAX_HP }));
                  sfx.gulp();
                  say(["You lie down in your clothes. When you open your eyes it's still night. It's always still night.", "(health back to full)"]);
                },
              },
              { label: "Not yet", run: () => setDialog(null) },
            ]);
          else say(["Not yet. The night isn't over."]);
          break;
        case "crate":
          say(["Records, mostly borrowed. Worn sleeves, no labels."]);
          break;
        case "cat":
          s.catLooking = true;
          s.catUntil = s.t + 3;
          say(["The cat doesn't move. Its eyes follow you anyway."]);
          break;
        case "bench":
          say(["Sit down for a smoke?"], [
            {
              label: "Sit and smoke",
              run: () => {
                s.sitting = true;
                s.dir = "down";
                s.hazeUntil = s.t + 25;
                sfx.flick();
                if (find("lighter")) say(["You light up. The flick of the lighter, close to the ear. You keep it."]);
                else say(["You light up. The street goes quiet and soft for a while."]);
              },
            },
            { label: "Keep walking", run: () => setDialog(null) },
          ]);
          break;
        case "phone":
          if (s.callPending) {
            s.callPending = false;
            markSeen("callback");
            const mine = latestTape();
            if (mine) {
              const line = clone(mine);
              line.mode = "pattern";
              line.master = { ...line.master, cutoff: 0.33, drive: 0.7, vol: 0.5, reverb: 0.1 };
              const e = new Engine(line);
              void e.start();
              call.current = { engine: e, until: s.t + ((60 / line.tempo) * line.length) / 4 * 2 + 0.3 };
            }
            say(["You pick up.", "Someone on the other end is playing your beat. Tinny, far off, like it's coming from the next street.", "Then the line goes dead."]);
          } else if (!found.includes("phone")) {
            find("phone");
            say(["You pick up. Nobody speaks.", "Just a chord, held down the line. You keep it."]);
          } else say(["Dial tone. Nobody's calling back."]);
          break;
        case "car":
          say(["Rain beading on the windshield. A parking ticket, soaked through."]);
          break;
        case "fridge":
          say(["Cold light. The hum is the loudest thing in here."]);
          break;
        case "aisle":
          say(["Batteries, lighters, instant noodles."]);
          break;
        case "counter": {
          const bottle = () => {
            if (find("bottle")) say(["The bottle clinks on the counter. A good sound. You keep it."]);
            else say(["The clerk slides it over without looking up."]);
          };
          s.counterVisits++;
          const radio = () => {
            // between two stations, for a second, one of the real tracks
            const track = TRACKS[Math.floor(Math.random() * TRACKS.length)];
            const i = 1 + Math.floor(Math.random() * 7);
            void sfx.radio([`chop:${track.id}:${i}`, `chop:${track.id}:${i + 1}`]);
            say(["The clerk shrugs and rolls the dial.", "Static, a preacher, static. Then something you know, for a second, between stations.", "\u201cThat one comes in at night. Nobody knows what station.\u201d"]);
          };
          const friend = s.counterVisits === 3 && !happened("friend");
          if (friend) markSeen("friend");
          say(friend ? ["\u201cYour friend was in earlier.\u201d", "\u201cSame jacket as you. Bought the same thing, too.\u201d", "You don't have a friend with that jacket."] : ["\u201cYou again.\u201d"], [
            { label: "A beer", run: bottle },
            { label: "Just water", run: bottle },
            { label: "Turn the radio up", run: radio },
            { label: "Something to eat", run: () => setMini({ kind: "shop", shop: "store" }) },
          ]);
          break;
        }
        case "sampler":
          openStudio();
          break;
        case "stairs":
          say(["Down the stairs. Warm air, then the rumble.", "A train's in, doors open. One stop to the avenue."], [
            { label: "Get on: the avenue", run: () => rideTo("avenue") },
            { label: "Not now", run: () => setDialog(null) },
          ]);
          break;
        case "couch":
          say(["The cushion is still warm."]);
          break;
        case "boombox":
          boombox();
          break;
        case "swings":
          sfx.creak();
          say(["You sit on the swing for a bit. It creaks every time."]);
          break;
        case "hoop":
          setMini({ kind: "hoops" });
          break;
        case "fountain":
          sfx.splash();
          say(["Coins on the bottom, mostly old ones. You flip one in."]);
          break;
        case "chimney":
          say(["Warm air comes up from somewhere below."]);
          break;
        case "chimes":
          if (find("chimes")) say(["The chimes knock together in the wind.", "You keep the sound."]);
          else say(["The chimes keep time with nothing."]);
          break;
        case "tank":
          say(["An old water tank. Something drips inside, very slowly."]);
          break;
        case "coop":
          sfx.flap();
          say(["The pigeons shuffle and go quiet while you look at them."]);
          break;
        default:
          if (id.startsWith("npc:")) {
            const a = life.current.find((x) => x.id === id.slice(4));
            if (a) talkTo(a);
          } else operate(id, api);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [leave],
  );

  const promptFor = (id: string): string | null => {
    const s = st.current;
    switch (id) {
      case "laptop":
        return "open the laptop (back to the site)";
      case "window":
        return s.windowOpen ? "close the window" : "open the window";
      case "shelf":
        return s.strangeTape ? "the tape at the end of the shelf" : shelfRef.current ? (tape.current ? "next tape" : "play a tape") : "look at the shelf";
      case "bed":
        return "lie down";
      case "crate":
        return "look through the records";
      case "cat":
        return "the cat";
      case "bench":
        return s.sitting ? null : "sit down";
      case "phone":
        return saveRef.current.found.includes("phone") ? "the payphone" : "answer the phone";
      case "car":
        return "look at the car";
      case "fridge":
        return "open the fridge";
      case "aisle":
        return "look at the shelves";
      case "counter":
        return "talk to the clerk";
      case "sampler":
        return "use the sampler";
      case "stairs":
        return "the subway (one stop to the avenue)";
      case "couch":
        return "sit on the couch";
      case "boombox":
        return "the boombox";
      case "swings":
        return "sit on the swing";
      case "hoop":
        return "shoot some hoops";
      case "fountain":
        return "look in the fountain";
      case "chimney":
        return "the chimney";
      case "chimes":
        return "the wind chimes";
      case "tank":
        return "the water tank";
      case "coop":
        return "the pigeon coop";
      default:
        if (id.startsWith("npc:")) return life.current.find((a) => a.id === id.slice(4))?.talk ?? null;
        return promptMore(id, api) ?? null;
    }
  };

  // ------------------------------------------------------------ dialog

  const advance = useCallback(() => {
    setDialog((d) => {
      if (!d) return d;
      if (d.i < d.lines.length - 1) {
        sfx.talk();
        return { ...d, i: d.i + 1 };
      }
      return d.choices ? d : null;
    });
  }, []);

  // ------------------------------------------------------------ input

  // the fight's actions, for handlers made once
  const actions = useRef({ attack, dodge, eat: () => eatSomething(), turnAway });
  useLayoutEffect(() => {
    actions.current = { attack, dodge, eat: () => eatSomething(), turnAway };
  });

  const tryInteract = useCallback(() => {
    const u = ui.current;
    if (u.phase !== "play" || u.studio || u.menu || u.mini || u.ko || u.phone) return;
    const f = st.current.fight;
    if (f && !f.outcome && !u.dialog) {
      actions.current.attack();
      return;
    }
    if (u.help) {
      setHelp(false);
      updateSave((s) => ({ ...s, seenHelp: true }));
      return;
    }
    if (u.dialog) {
      advance();
      return;
    }
    const target = st.current.target;
    if (target) interact(target);
  }, [advance, interact, updateSave]);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const u = ui.current;
      if (u.studio) {
        // the studio handles its own keys; this catches Escape when focus has wandered off it
        if (e.key === "Escape") closeStudioRef.current();
        return;
      }
      if (u.phase !== "play") return;
      if (u.menu || u.mini || u.ko || u.phone) {
        if (e.key === "Escape" && u.mini) setMini(null);
        else if (e.key === "Escape" && u.menu && !u.menu.creator) setMenu(null);
        // the phone puts itself away with Esc or P, wherever focus has got to
        else if (u.phone && !u.mini && (e.key === "Escape" || (e.code === "KeyP" && !e.repeat))) {
          setPhone(null);
          root.current?.focus();
        }
        return;
      }
      const fighting = !!st.current.fight && !st.current.fight.outcome && !u.dialog;
      if (fighting && (e.code === "ShiftLeft" || e.code === "ShiftRight" || e.code === "KeyK" || e.code === "KeyL")) {
        e.preventDefault();
        actions.current.dodge();
        return;
      }
      if (e.code === "KeyQ" && !u.dialog && !e.repeat) {
        if (!actions.current.eat()) showToast(saveRef.current.hp >= MAX_HP ? "You're fine." : "Nothing to eat. The corner store has noodles.", 2000);
        return;
      }
      if (e.code === "KeyM" && !u.dialog && !fighting && !e.repeat) {
        e.preventDefault();
        setMenu({ tab: "you", creator: false });
        return;
      }
      if (e.code === "KeyP" && !u.dialog && !fighting && !e.repeat) {
        e.preventDefault();
        setPhone("page");
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        // turning your back on whoever's walked up to you is an answer too
        if (u.dialog && st.current.pending) actions.current.turnAway();
        else if (u.dialog) setDialog(null);
        else if (u.help) tryInteract();
        else leave();
        return;
      }
      // when choices are showing, their buttons own the keyboard
      if (u.dialog?.choices && u.dialog.i === u.dialog.lines.length - 1) return;
      const dir = KEYMAP[e.code];
      if (dir) {
        e.preventDefault();
        if (!keys.current.includes(dir)) keys.current.push(dir);
        return;
      }
      if (e.code === "KeyE" || e.code === "Space" || e.code === "Enter" || (fighting && e.code === "KeyJ")) {
        const el = e.target as HTMLElement;
        if (el.closest("button, a") && el !== root.current) return;
        e.preventDefault();
        if (!e.repeat) tryInteract();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      const dir = KEYMAP[e.code];
      if (dir) keys.current = keys.current.filter((k) => k !== dir);
    };
    const onBlur = () => (keys.current = []);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [leave, tryInteract]);

  // ------------------------------------------------------------ fit the screen

  useLayoutEffect(() => {
    const fit = () => {
      const portrait = window.innerHeight > window.innerWidth;
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      const w = window.innerWidth;
      const h = window.innerHeight - 48 - (coarse && portrait ? 190 : 0);
      let k = Math.min(w / VIEW_W, h / VIEW_H);
      if (k >= 2) k = Math.floor(k);
      // a phone held upright would show the whole view at postcard size:
      // zoom in instead and let the picture follow you sideways
      if (coarse && portrait) k = Math.max(k, Math.floor(Math.min(2.5, h / VIEW_H) * 2) / 2);
      setScale(Math.max(1, k));
      setBelow(coarse && portrait);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // ------------------------------------------------------------ music in the room
  // The boombox outside the store and the studio's monitors: loops from the
  // starters (or your tape, if you gave them one), louder and clearer as you
  // walk up. Returns whether it's on the beat right now, for the nodding.
  const musicClock = useRef(0);
  const placeMusic = (place: Place, inStudio: boolean, dt: number): boolean => {
    const playingLive = ui.current.mini?.kind === "rhythm";
    const want =
      playingLive
        ? null
        : place === "street"
          ? "street"
          : place === "studio" && !inStudio
            ? "studio"
            : place === "rooftop" && musicPick.current.rooftop
              ? "rooftop"
              : place === "club" || place === "underpass" || place === "avenue"
                ? place
                : null;
    if (music.current && music.current.key !== want) {
      music.current.engine.dispose();
      music.current = null;
    }
    if (want && !music.current && ui.current.phase === "play") {
      // the boombox plays trap, the club drill (through the wall, out on the avenue), the cypher boom bap
      const preset = want === "street" ? 2 : want === "club" || want === "avenue" ? 3 : 0;
      const base = musicPick.current[want] ?? PRESETS[preset].make();
      const project = clone(base);
      project.mode = project.song.some((x) => x >= 0) ? "song" : "pattern";
      const e = new Engine(project);
      music.current = { key: want, engine: e };
      void e.start();
      musicClock.current = 1;
    }
    const m = music.current;
    if (!m) return false;
    musicClock.current += dt;
    if (musicClock.current > 0.15) {
      musicClock.current = 0;
      const s = st.current;
      const base = m.engine.project;
      const from = (x: number, y: number, range: number) => Math.max(0, 1 - Math.hypot(s.x - x, s.y - y) / range);
      const near = want === "street" ? from(BOOMBOX.x, BOOMBOX.y, 230) : want === "underpass" ? from(17.5 * TILE, 6 * TILE, 260) : want === "avenue" ? from(35.5 * TILE, 2 * TILE, 190) : 1;
      // the boombox drops back while the payphone has your ear
      const vol = (want === "street" ? 0.75 * near * near * (call.current ? 0.2 : 1) : want === "underpass" ? 0.6 * near * near : want === "avenue" ? 0.45 * near : want === "club" ? 0.5 : want === "rooftop" ? 0.32 : 0.4) * saveRef.current.settings.music;
      const cutoff = want === "street" || want === "underpass" ? 0.3 + 0.7 * near : want === "avenue" ? 0.12 + 0.12 * near : want === "club" ? 1 : want === "rooftop" ? 0.5 : 0.62;
      m.engine.setProject({ ...base, master: { ...base.master, vol, cutoff } });
    }
    const p = m.engine.position();
    return p.step >= 0 && p.step % 4 < 2;
  };

  // dev-only handle for the browser tests (scripts/verify.mjs)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as { __game?: unknown };
    w.__game = {
      state: () => ({ ...st.current, trans: !!st.current.trans }),
      teleport: (place: Place, x: number, y: number, dir: Dir = "up") => {
        const s = st.current;
        if (s.place === "bedroom" && place !== "bedroom") stopTape();
        if (place !== s.place) arriveRef.current(place, s.place);
        Object.assign(s, { place, x: x * TILE, y: y * TILE, dir });
        setPlace(place, s.windowOpen);
        setPlaceName(place);
      },
      /** Render each synthesized sound offline and report its peak and length. */
      kitLevels: async () => {
        const out: Record<string, { peak: number; ms: number }> = {};
        for (const def of VOICES) {
          if (def.load) continue;
          const ctx = new OfflineAudioContext(1, 44100 * 3, 44100);
          playVoice(ctx, ctx.destination, def.id, 0.01, { midi: def.cat === "808 & bass" ? 36 : 60, dur: 0.6, vel: 1 });
          const d = (await ctx.startRendering()).getChannelData(0);
          let peak = 0;
          let last = 0;
          for (let i = 0; i < d.length; i++) {
            const a = Math.abs(d[i]);
            if (a > peak) peak = a;
            if (a > 0.001) last = i;
          }
          out[def.id] = { peak: Math.round(peak * 100) / 100, ms: Math.round((last / 44100) * 1000) };
        }
        return out;
      },
      life: () => ({
        announced: st.current.fx.announced ?? 0,
        music: music.current?.key ?? null,
        call: !!call.current,
        musicProject: music.current?.engine.project.name ?? null,
        actors: life.current.map((a) => ({ id: a.id, kind: a.kind, place: a.place, x: a.x, y: a.y, stopped: a.stopped ?? 0, fly: a.fly ?? null, hidden: !!a.hidden, dir: a.dir, cop: !!a.cop, react: a.react ?? 0 })),
      }),
      studio: () => {
        const e = engine.current;
        return e ? { playing: e.playing, position: e.position(), project: e.project } : null;
      },
      /** Bring trouble now (in a place where it happens), breather or not. */
      trouble: () => {
        st.current.encounterIn = 0;
        st.current.lastTrouble = -1e9;
      },
      /** Keep trouble away for the rest of the test. */
      peace: () => {
        st.current.encounterIn = 1e6;
        st.current.lastTrouble = 1e9;
      },
      /** How likely trouble is to be waiting in a place, and how much sooner it comes, as things stand. */
      odds: (place: Place) => ({ ambush: ambushOdds(place, saveRef.current), sooner: troublePace(saveRef.current) }),
      /** Go down in the fight you're in. */
      knockMe: () => {
        const f = st.current.fight;
        if (f) f.me.hp = 0;
      },
      /** The alley cat: how long it'll keep following (set it to cut that short), or sat at a spot (in tiles). */
      cat: (trail?: number, at?: [number, number]) => {
        const c = life.current.find((a) => a.id === "alley-cat");
        if (c && trail !== undefined) c.trail = trail;
        if (c && at) Object.assign(c, { x: at[0] * TILE, y: at[1] * TILE, goal: undefined, walking: false, bolt: false });
        return c ? { x: c.x, y: c.y, trail: c.trail ?? 0, walking: !!c.walking, goal: c.goal ?? null, perches: c.perches ?? [] } : null;
      },
      /** Vee's next beat, and what a battle on each of her beats asks of you. */
      veeBeat: () => veeBeat(saveRef.current),
      battleCharts,
      pending: () => st.current.pending?.length ?? 0,
      fight: () => {
        const f = st.current.fight;
        return f ? { outcome: f.outcome, hp: f.me.hp, boss: f.boss, foes: f.foes.map((a) => ({ id: a.id, hp: a.fighter!.hp, state: a.fighter!.state, x: a.x, y: a.y })) } : null;
      },
      /** Leave every foe on one hit. */
      weaken: () => st.current.fight?.foes.forEach((a) => a.fighter && (a.fighter.hp = 1)),
      give: (patch: Partial<SaveData>) => updateSave((v) => ({ ...v, ...patch })),
      save: () => saveRef.current,
      cop: sendCop,
      /** What your feet are on right now. */
      surface: () => {
        const s = st.current;
        const sc = SCENES[s.place];
        return sc.surface(tileAt(sc, s.x, s.y - 1));
      },
      ride: (to: "street" | "avenue") => rideTo(to),
      /** Bring the storm over now. */
      storm: () => {
        st.current.nextBolt = 0;
      },
      /** Pretend a rhythm game just finished with this score. */
      rhythm: (mode: "cypher" | "dj", score: number) => rhythmRef.current(mode, score),
      battle: (score: number, rival: number) => battleRef.current(score, { name: "Vee", score: rival, stake: 20 }),
      /** Save a starter beat to the shelf under this name, as if made in the studio. */
      makeTape: (name: string) => {
        const store = loadStore();
        const p = PRESETS[1].make();
        p.name = name;
        const slot = store.slots.findIndex((x) => x === null);
        store.slots[slot < 0 ? store.slots.length - 1 : slot] = p;
        saveStore(store);
        const saved = savedProjects();
        shelfRef.current = saved;
        setShelf(saved);
        updateSave((v) => v);
      },
      /** The career as things stand. */
      career: () => {
        const v = saveRef.current;
        return { fans: v.fans, tier: tierOf(v.fans), posts: v.posts.length, inbox: v.inbox.map((m) => ({ id: m.id, kind: m.kind, act: m.act?.type ?? null, done: !!m.done })), contacts: v.contacts, rel: v.rel, leases: v.leases, collabs: v.collabs, posted: v.posted, mob: v.mob, cut: cutOf(v), royalties: v.stats.royalties };
      },
      /** Followers, as if they'd just come in (with a post, so the level-ups and messages happen). */
      fans: (n: number) => addFans(n, { kind: "news", text: "test" }),
      /** Let some minutes of your catalogue pass. */
      payOut: (minutes: number) => payOut(minutes),
      /** Finish a session with an artist at this score (as if played). */
      session: (artist: string, q: number) => sessionDone(artist, q),
      /** Bring a particular crew now. */
      crew: (c: Crew) => {
        st.current.lastTrouble = -1e9;
        spawnTrouble(c);
      },
      crewNow: () => st.current.pendingCrew,
      ring: () => ringStart(),
      ringRound: () => st.current.ring,
      phone: (tab: PhoneTab | null) => setPhone(tab),
      /** Open a mini-game or a menu tab straight away. */
      mini: (m: Mini | null) => setMini(m),
      menu: (tab: MenuTab | null) => setMenu(tab ? { tab, creator: false } : null),
    };
    return () => {
      delete w.__game;
    };
    // the career handles work through refs (saveRef, st), so the first render's copies do
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateSave]);

  // ------------------------------------------------------------ the loop

  useEffect(() => {
    const c = canvas.current;
    const g = c?.getContext("2d");
    if (!c || !g) return;
    let raf = 0;
    let last = performance.now();
    let lastPrompt: string | null = null;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = st.current;
      s.t += dt;
      const u = ui.current;
      const scene = SCENES[s.place];
      const frozen = u.phase !== "play" || !!u.dialog || u.studio || u.help || !!s.trans || !!u.menu || !!u.mini || !!u.ko || !!s.ride || !!u.phone;
      const fight = s.fight;
      const dashing = !!fight && fight.me.dodge > 0;

      // walking
      const held = keys.current;
      if (!frozen && held.length && !dashing && !(fight?.outcome === "lost")) {
        const dir = held[held.length - 1];
        let vx = (held.includes("right") ? 1 : 0) - (held.includes("left") ? 1 : 0);
        let vy = (held.includes("down") ? 1 : 0) - (held.includes("up") ? 1 : 0);
        if (vx && vy) {
          vx *= Math.SQRT1_2;
          vy *= Math.SQRT1_2;
        }
        s.dir = dir;
        if (vx || vy) {
          s.sitting = false;
          const nx = s.x + vx * SPEED * dt;
          const free = (box: { x: number; y: number; w: number; h: number }) => !blocked(scene, box) && !lifeBlocks(life.current, s.place, box);
          if (free({ x: nx - 4, y: s.y - 3, w: 8, h: 4 })) s.x = nx;
          const ny = s.y + vy * SPEED * dt;
          if (free({ x: s.x - 4, y: ny - 3, w: 8, h: 4 })) s.y = ny;
          s.walk += dt;
          s.stepAcc += dt;
          if (s.stepAcc > 0.3) {
            s.stepAcc = 0;
            sfx.step(scene.surface(tileAt(scene, s.x, s.y - 1)));
          }
        }
      } else s.walk = 0;

      // the fight
      if (fight && !frozen) {
        const me = fight.me;
        Object.assign(me, { x: s.x, y: s.y, dir: s.dir });
        moveMe(me, dt, scene);
        s.x = me.x;
        s.y = me.y;
        if (!fight.outcome || fight.outcome === "won") updateFoes(fight.foes.filter((a) => !a.hidden), me, dt, scene, saveRef.current.settings.difficulty, fightEv);
        if (!fight.outcome) {
          if (me.hp <= 0) knockout();
          else if (!fight.foes.some(isUp)) winFight();
        } else if (fight.outcome === "won") {
          fight.over += dt;
          if (fight.over > 4) {
            dropFoes(fight.foes);
            s.fight = null;
          }
        }
      }
      // foes who've had enough wander off; the ones walking up to you arrive
      if (!frozen) {
        const loose = life.current.filter((a) => a.fighter && a.place === s.place && !a.hidden && a.fighter.state === "flee" && !s.fight?.foes.includes(a));
        if (loose.length) updateFoes(loose, freshMe(s.x, s.y, s.dir, 1), dt, scene, "normal", fightEv);
        if (s.pending) {
          for (const a of s.pending) {
            const dx = s.x - a.x;
            const dy = s.y - a.y;
            const d = Math.hypot(dx, dy) || 1;
            a.t += dt;
            a.walking = d > 26;
            if (d > 26) {
              const nx = a.x + (dx / d) * 30 * dt;
              const ny = a.y + (dy / d) * 30 * dt + Math.sin(a.t * 3 + a.x) * 8 * dt;
              if (!blocked(scene, { x: nx - 4, y: a.y - 3, w: 8, h: 4 })) a.x = nx;
              if (!blocked(scene, { x: a.x - 4, y: ny - 3, w: 8, h: 4 })) a.y = ny;
              a.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
            }
          }
          // a police car rolling past: they think better of it
          const cops = life.current.some((a) => a.cop && a.place === s.place && Math.abs(a.x - s.x) < 110);
          if (cops) {
            walkOff(s.pending);
            showToast("They see the police car and think better of it.", 3200);
          } else if (s.pending.some((a) => Math.hypot(s.x - a.x, s.y - a.y) < 30)) confront();
        }
        if (life.current.some((a) => a.fighter && a.hidden && !s.fight?.foes.includes(a))) life.current = life.current.filter((a) => !(a.fighter && a.hidden && !s.fight?.foes.includes(a)));
        // trouble, now and then, where it lives (and, once people know you, wherever you are)
        if (troubleHere(s.place, saveRef.current) && !s.fight && !s.pending && !s.ring && saveRef.current.profile?.name) {
          s.encounterIn -= dt * troublePace(saveRef.current);
          if (s.encounterIn <= 0 && s.t - s.lastTrouble > BREATHER) {
            spawnTrouble();
            s.lastTrouble = s.t;
            s.encounterIn = 100 + Math.random() * 100;
          }
        }
      }
      s.shake = Math.max(0, s.shake - dt * 10);

      // your catalogue earns while you walk about: every half a minute, songs and the beat store pay out
      if (u.phase === "play" && !u.studio) {
        s.payAcc += dt;
        if (s.payAcc >= 30) {
          s.payAcc = 0;
          payOut(0.5);
        }
      }

      // doors
      if (!s.trans && u.phase === "play" && !frozen) {
        const door = scene.doors.find((d) => inside(s.x, s.y - 1, d.zone));
        if (door?.lock === "club" && !clubOk(saveRef.current)) {
          s.y += 10;
          keys.current = [];
          say(["The bouncer puts a hand out without looking at you.", "\u201cNot tonight.\u201d"]);
        } else if (door) {
          s.trans = { door, t: 0, swapped: false };
          sfx.door();
        }
      }
      if (s.trans) {
        s.trans.t += dt;
        if (!s.trans.swapped && s.trans.t >= 0.22) {
          const { to, spawn } = s.trans.door;
          if (s.place === "bedroom") stopTape();
          arriveRef.current(to, s.place);
          s.place = to;
          s.x = spawn.x;
          s.y = spawn.y;
          s.dir = spawn.dir;
          s.sitting = false;
          s.trans.swapped = true;
          keys.current = [];
          if (to === "street") s.figureArmed = !s.figureGone && Math.random() < 0.4;
          setPlace(to, s.windowOpen);
          setPlaceName(to);
        }
        if (s.trans.t >= 0.44) s.trans = null;
      }

      // what's in front of you
      const fx = s.x + (s.dir === "left" ? -9 : s.dir === "right" ? 9 : 0);
      const fy = s.y - 3 + (s.dir === "up" ? -9 : s.dir === "down" ? 7 : 0);
      const cur = SCENES[s.place];
      const hit = cur.things.find((t) => t.zone && (inside(s.x, s.y - 2, t.zone) || inside(fx, fy, t.zone)));
      const who = lifeTarget(life.current, s.place, s.x, s.y, fx, fy);
      // the cat, right in front of you, comes before whatever it's sitting on (its first spot is on the dumpster)
      const pet = who?.kind === "cat" && Math.hypot(who.x - fx, who.y - 3 - fy) < 12 ? who : null;
      s.target = pet ? `npc:${pet.id}` : hit ? (promptFor(hit.id) ? hit.id : null) : who ? `npc:${who.id}` : null;
      const near = cur.doors.find((d) => Math.abs(s.x - (d.zone.x + d.zone.w / 2)) < d.zone.w / 2 + 14 && Math.abs(s.y - (d.zone.y + d.zone.h / 2)) < d.zone.h / 2 + 18);
      const inFight = !!fight && !fight.outcome;
      const p = frozen || (inFight && !near) ? null : s.target && !inFight ? promptFor(s.target) : near ? `@${near.label}` : null;
      if (p !== lastPrompt) {
        lastPrompt = p;
        setPrompt(p);
      }

      // everyone else, and the music where you are
      if (u.phase === "play") updateLife(life.current, dt, s.place, s.x, s.y, { honk: sfx.honk, bell: sfx.bell, flap: sfx.flap, siren: sfx.siren });
      // now and then the storm comes over: lightning (not with reduced motion), then thunder
      if (u.phase === "play" && scene.outdoors) {
        s.nextBolt -= dt;
        if (s.nextBolt <= 0) {
          const delay = 0.5 + Math.random() * 2.5;
          s.bolt = reduced ? 0 : 1;
          s.bolts++;
          s.thunderAt = s.t + delay;
          s.thunderNear = 1 - (delay - 0.5) / 2.5;
          s.nextBolt = 45 + Math.random() * 60;
        }
      }
      if (s.thunderAt && s.t >= s.thunderAt) {
        s.thunderAt = 0;
        sfx.thunder(SCENES[s.place].outdoors ? s.thunderNear : s.thunderNear * 0.3);
      }
      s.bolt = Math.max(0, s.bolt - dt * 1.4);
      const beat = placeMusic(s.place, u.studio, dt);
      if (beat && !s.lastBeat) s.fx.beats++;
      s.lastBeat = beat;
      // trains: one in the station, one going over the bridge
      const tr = s.place === "subway" ? trainAt(s.t) : null;
      const over = s.place === "underpass" ? overhead(s.t) : 0;
      setRumble(s.ride ? 0.5 : tr ? (tr.here ? (tr.open ? 0.2 : 0.6) : tr.arriving ? 0.3 : 0) : over);
      // the station announcement, as each train comes in (with what it says, on screen)
      const coming = !!tr?.arriving && tr.here;
      if (coming && !s.fx.announced && u.phase === "play" && !u.mini) {
        sfx.announce();
        // what it says, on screen, the first time each visit
        if (!s.visit.announced) showToast("\u201cThe train now arriving is for: your block. Mind the gap.\u201d (a voice through a bad speaker)", 4200);
        s.visit.announced = 1;
        s.fx.announcements = (s.fx.announcements ?? 0) + 1;
      }
      s.fx.announced = coming ? 1 : 0;
      // people talking: the club, round the cypher, the queue outside the club
      const closeTo = (x: number, y: number, range: number) => Math.max(0, 1 - Math.hypot(s.x - x, s.y - y) / range);
      const crowd = s.ride ? 0.05 : u.mini?.kind === "rhythm" ? 0 : s.place === "club" ? 0.22 : s.place === "underpass" ? 0.3 * closeTo(17.5 * TILE, 6.4 * TILE, 220) : s.place === "avenue" ? 0.14 * closeTo(38.5 * TILE, 3.7 * TILE, 110) : 0;
      setCrowd(crowd * saveRef.current.settings.sfx);
      s.fx.crowd = crowd;
      // the ride: a couple of seconds in the carriage, then up the stairs at the other end
      if (s.ride) {
        s.ride.t += dt;
        if (s.ride.t >= (reduced ? 1.6 : 2.6)) {
          const to = s.ride.to;
          const spot = to === "street" ? { x: 31.5 * TILE, y: 9.1 * TILE, dir: "up" as Dir } : { x: 45 * TILE, y: 5.2 * TILE, dir: "down" as Dir };
          arriveRef.current(to, s.place);
          Object.assign(s, { place: to, ...spot, ride: null, trans: null });
          setPlace(to, s.windowOpen);
          setPlaceName(to);
          sfx.door();
          updateSave((v) => ({ ...v, stats: { ...v.stats, rides: v.stats.rides + 1 } }));
          showToast(to === "street" ? "Your block. Up the stairs, across from the store." : "The avenue. Up the stairs by the underpass.", 3000);
        }
      }
      if (over > 0.6 && saveRef.current.settings.shake) s.shake = Math.max(s.shake, 0.8);

      // the neighbourhood's own small events
      if (s.catLooking && s.t > s.catUntil) s.catLooking = false;
      if (!s.catLooking && s.place === "street" && Math.sin(s.t * 0.9) > 0.995) {
        s.catLooking = true;
        s.catUntil = s.t + 1.6;
      }
      const figureWanted = s.place === "street" && s.figureArmed && !s.figureGone && s.x < 29 * TILE ? 0.85 : 0;
      if (s.place === "street" && s.figureArmed && s.figure > 0.5 && s.x >= 29 * TILE) s.figureGone = true;
      s.figure += (figureWanted - s.figure) * Math.min(1, dt * (figureWanted ? 0.6 : 3));
      const hazeTarget = s.t < s.hazeUntil ? 1 : 0;
      s.haze += (hazeTarget - s.haze) * Math.min(1, dt * 0.5);
      const ringing = !saveRef.current.found.includes("phone") || s.callPending;
      if (call.current && (s.place !== "street" || s.t > call.current.until)) stopCall();
      setRing(s.place === "street" && ringing ? Math.max(0, 1 - Math.abs(s.x - 26.5 * TILE) / (16 * TILE)) : 0);

      // how much of the picture is off the left of the screen (phones held upright)
      const vw = view.current;
      const box = c.parentElement;
      const full = VIEW_W * vw.scale;
      const bw = box?.clientWidth ?? full;
      const off = full > bw && !s.ride ? Math.min(0, Math.max(bw - full, bw / 2 - (s.x - camera(SCENES[s.place], s.x, s.y).cx) * vw.scale)) : (bw - full) / 2;
      if (s.ride) drawRide(g, VIEW_W, VIEW_H, s.ride.t, reduced, s.ride.to);
      else draw(g, {
        hudX: (s.hudX = vw.below ? Math.max(0, Math.round(-off / vw.scale)) : 0),
        place: s.place,
        x: s.x,
        y: s.y,
        dir: s.dir,
        walk: s.walk,
        sitting: s.sitting,
        t: s.t,
        windowOpen: s.windowOpen,
        ringing: s.place === "street" && ringing,
        figure: s.figure,
        haze: reduced ? 0 : s.haze,
        catLooking: s.catLooking,
        tapes: Array.from({ length: 4 }, (_, i) => i < shelfRef.current),
        hints: saveRef.current.settings.hints
          ? [...FINDABLE.filter((id) => !saveRef.current.found.includes(id)).map((id) => HINT_AT[id]), ...(shelfRef.current ? [] : ["sampler"])]
          : [],
        reduced,
        actors: life.current,
        beat,
        boombox: music.current?.key === "street",
        strangeTape: s.place === "bedroom" && s.strangeTape,
        ember: !!life.current.find((a) => a.id === "ledge")?.hidden,
        roofMusic: music.current?.key === "rooftop",
        dt,
        look: lookRef.current,
        weapon: weaponById(saveRef.current.weapon),
        me: s.fight && s.fight.outcome !== "won" ? s.fight.me : null,
        down: s.fight?.outcome === "lost",
        hp: s.fight ? s.fight.me.hp : saveRef.current.hp,
        maxHp: MAX_HP,
        tag: saveRef.current.tag ? { name: saveRef.current.profile?.name || "you", color: saveRef.current.tag.color } : null,
        shake: s.shake,
        fx: s.fx,
        lightning: s.bolt,
      });
      // zoomed in (phones held upright): keep you in the middle of the picture
      if (box) {
        const tf = vw.below ? `translateX(${Math.round(off)}px)` : "";
        if (c.style.transform !== tf) c.style.transform = tf;
      }
      if (s.trans) {
        const k = s.trans.t < 0.22 ? s.trans.t / 0.22 : 1 - (s.trans.t - 0.22) / 0.22;
        g.fillStyle = `rgba(0,0,0,${Math.max(0, Math.min(1, k)).toFixed(3)})`;
        g.fillRect(0, 0, VIEW_W, VIEW_H);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // everything it calls works through refs, so it only restarts for reduced motion
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  // choices take focus so the keyboard can pick one
  const choiceBox = useRef<HTMLDivElement>(null);
  const showingChoices = !!dialog?.choices && dialog.i === dialog.lines.length - 1;
  useEffect(() => {
    if (showingChoices) choiceBox.current?.querySelector("button")?.focus();
  }, [showingChoices]);

  // ------------------------------------------------------------ touch pad

  const press = (dir: Dir) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    keys.current = [dir];
    setDown(dir);
  };
  const release = (e: React.PointerEvent) => {
    e.preventDefault();
    keys.current = [];
    setDown(null);
  };

  const foundCount = save.found.length;
  // the beat a session's on, picked once as it opens (not every render)
  const sessionTape = useMemo(() => (mini?.kind === "session" ? latestTape() : null), [mini]);
  // your newest tape, for the phone's post button (the shelf changes when you save one)
  const phoneTape = useMemo(() => (phone && shelf >= 0 ? latestTape() : null), [phone, shelf]);

  // ------------------------------------------------------------ mini-games

  const closeMini = () => {
    setMini(null);
    st.current.fx.diceRoll = 0;
    root.current?.focus();
  };
  const setDiceRolling = useCallback((on: boolean) => {
    st.current.fx.diceRoll = on ? 1 : 0;
  }, []);
  const sprayed = useCallback(() => sfx.spray(380), []);
  const dug = (r: DigResult) => {
    if (!spend(5)) return;
    updateSave((v) => ({ ...v, stats: { ...v.stats, digs: v.stats.digs + 1 } }));
    sfx.voice(saveRef.current.found.includes("scratch") || r === "first" ? "scratch" : "vinyl-pop");
    if (r === "first") find("scratch");
    else if (r === "rare") {
      earn(15);
      sfx.coins();
    } else if (r === "break") addRep(1);
  };
  const buy = (id: string, price: number) => {
    if (!spend(price)) return;
    sfx.coins();
    const food = consumableById(id);
    const weapon = WEAPONS.find((w) => w.id === id && "buy" in w.unlock);
    if (food) updateSave((v) => ({ ...v, items: { ...v.items, [id]: (v.items[id] ?? 0) + 1 } }));
    else if (weapon) {
      updateSave((v) => ({ ...v, weapons: [...v.weapons, id], weapon: id }));
      showToast(`Smokey wraps the ${weapon.name} in a newspaper. “You didn't get it from me.” (in your hand now; the menu swaps it)`, 4200);
    } else {
      updateSave((v) => ({ ...v, owned: [...v.owned, id] }));
      showToast("In your wardrobe now: the mirror, or M.", 2600);
    }
  };

  const closeStudio = () => {
    if (!ui.current.studio) return;
    engine.current?.stop();
    duck(false);
    setStudio(false);
    const saved = savedProjects();
    shelfRef.current = saved;
    setShelf(saved);
    root.current?.focus();
  };
  useLayoutEffect(() => {
    closeStudioRef.current = closeStudio;
  });

  return (
    <div
      ref={root}
      tabIndex={-1}
      role="application"
      aria-label="Game: the neighbourhood"
      aria-roledescription="game"
      className={`fixed inset-0 z-[2000] flex flex-col text-[#e8e0cf] outline-none select-none ${phase === "closing" || revealing ? "bg-transparent" : "bg-[#050507]"}`}
      data-testid="game"
      data-place={place}
      onPointerDown={() => !touch && window.matchMedia("(pointer: coarse)").matches && setTouch(true)}
    >
      {/* top bar: where you are, what you've found, the way out */}
      <div className={`relative z-40 flex min-h-0 flex-1 flex-col ${phase === "closing" || revealing ? "invisible" : ""}`}>
      <TopBar
        place={PLACE_NAMES[place]}
        cash={save.cash}
        rep={save.rep}
        fans={save.fans}
        unread={save.inbox.filter((m) => !m.read).length}
        found={foundCount}
        studio={studio}
        fighting={fighting}
        onMenu={() => !fighting && setMenu({ tab: "you", creator: false })}
        onPhone={() => !fighting && setPhone("page")}
        onStudio={goToStudio}
        onExit={leave}
      />

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-start overflow-hidden sm:justify-center">
        <canvas
          ref={canvas}
          width={VIEW_W}
          height={VIEW_H}
          className={`pixel block shrink-0 ${below ? "self-start" : ""}`}
          style={{ width: VIEW_W * scale, height: VIEW_H * scale }}
          aria-hidden
        />

        <Overlays
          prompt={prompt}
          dialog={dialog}
          help={help}
          showHelp={help && phase === "play" && !menu}
          toast={toast}
          touch={touch}
          below={below}
          picture={VIEW_H * scale}
          showingChoices={showingChoices}
          choiceBox={choiceBox}
          onAdvance={advance}
          onChoose={(c) => {
            setDialog(null);
            c.run();
          }}
          onGotIt={() => {
            setHelp(false);
            updateSave((s) => ({ ...s, seenHelp: true }));
            root.current?.focus();
          }}
          onStudio={goToStudio}
        />

        {/* touch controls */}
        {touch && phase === "play" && !studio && (
          <TouchPad down={down} fighting={fighting} talking={!!dialog} prompt={prompt} onPress={press} onRelease={release} onEat={() => eatSomething()} onDodge={dodge} onUse={tryInteract} />
        )}

        {menu && (
          <Menu
            save={save}
            tab={menu.tab}
            creator={menu.creator}
            tapes={shelf}
            touch={touch}
            onTab={(tab) => setMenu({ tab, creator: false })}
            onProfile={(p: Profile) => updateSave((v) => ({ ...v, profile: p }))}
            onEquip={(id) => updateSave((v) => ({ ...v, weapon: id }))}
            onUse={(id) => eatSomething(id)}
            onSettings={(set: Settings) => {
              setSfxVolume(set.sfx);
              updateSave((v) => ({ ...v, settings: set }));
            }}
            onReset={() => {
              const fresh = resetSave();
              saveRef.current = fresh;
              setSaveState(fresh);
              updateSave((v) => ({ ...v, profile: { ...randomProfile(), name: "" } }));
              setMenu({ tab: "you", creator: true });
              setHelp(true);
            }}
            onClose={() => {
              if (menu.creator) updateSave((v) => ({ ...v, profile: v.profile && { ...v.profile, name: v.profile.name.trim() || "anon" } }));
              setMenu(null);
              root.current?.focus();
            }}
          />
        )}

        {mini?.kind === "rhythm" && (
          <Rhythm
            mode={mini.mode}
            rival={mini.rival}
            volume={save.settings.music}
            touch={touch}
            onFinish={(score) => (mini.mode === "battle" && mini.rival ? battleDone(score, mini.rival) : mini.mode !== "battle" && rhythmDone(mini.mode, score))}
            onClose={closeMini}
          />
        )}
        {mini?.kind === "dice" && (
          <Dice
            cash={save.cash}
            onSettle={(d) => {
              earn(d);
              if (d > 0) updateSave((v) => ({ ...v, stats: { ...v.stats, diceWon: v.stats.diceWon + 1 } }));
              find("dice");
            }}
            onRolling={setDiceRolling}
            onClose={closeMini}
          />
        )}
        {mini?.kind === "crates" && <Crates cash={save.cash} first={!save.found.includes("scratch")} onDig={dug} onClose={closeMini} />}
        {mini?.kind === "hoops" && (
          <Hoops
            cash={save.cash}
            reduced={reduced}
            onShot={(made) => {
              sfx.voice("basketball");
              find("basketball");
              if (made) updateSave((v) => ({ ...v, stats: { ...v.stats, swishes: v.stats.swishes + 1 } }));
            }}
            onSettle={(d) => {
              earn(d);
              if (d > 0) sfx.coins();
            }}
            onClose={closeMini}
          />
        )}
        {mini?.kind === "tag" && (
          <Tag
            name={save.profile?.name || "you"}
            onSpray={sprayed}
            onDone={(color) => {
              const first = !saveRef.current.tag;
              updateSave((v) => ({ ...v, tag: { color }, stats: { ...v.stats, tags: v.stats.tags + 1 } }));
              if (first) addRep(6);
              find("spray");
            }}
            onClose={closeMini}
          />
        )}
        {mini?.kind === "shop" && <Shop kind={mini.shop} save={save} onBuy={buy} onClose={closeMini} />}
        {mini?.kind === "monte" && (
          <Monte
            cash={save.cash}
            reduced={reduced}
            onSettle={(d) => {
              earn(d);
              if (d > 0) {
                sfx.coins();
                updateSave((v) => ({ ...v, stats: { ...v.stats, monteWon: v.stats.monteWon + 1 } }));
              }
            }}
            onClose={closeMini}
          />
        )}
        {mini?.kind === "session" && (
          <Session
            artist={artistById(mini.artist)?.name ?? "them"}
            line={artistById(mini.artist)?.session ?? ""}
            tape={sessionTape}
            volume={save.settings.music}
            reduced={reduced}
            onFinish={(q) => sessionDone(mini.artist, q)}
            onClose={closeMini}
          />
        )}

        {phone && (
          <Phone
            save={save}
            tab={phone}
            latest={phoneTape ? { name: phoneTape.name, ok: !save.posted.includes(phoneTape.name), why: save.posted.includes(phoneTape.name) ? "Your newest's already up. Make a new one in the studio." : undefined } : null}
            onTab={(t) => {
              setPhone(t);
              if (t === "dms") updateSave((v) => ({ ...v, inbox: v.inbox.map((m) => ({ ...m, read: true })) }));
            }}
            onPostBeat={postBeat}
            onPostFit={postFit}
            onAct={answer}
            onMob={mobCall}
            onClose={() => {
              setPhone(null);
              root.current?.focus();
            }}
          />
        )}

        {ko > 0 && <KnockedOut stage={ko} onWake={wake} />}

        {studio && studioEngine && (
          <Studio engine={studioEngine} load={sampled} onLoaded={() => setSampled(null)} found={save.found} fresh={save.unseen} onSeen={() => updateSave((s) => ({ ...s, unseen: [] }))} onClose={closeStudio} />
        )}
      </div>
      </div>

      {/* the laptop lid: comes down over the site on the way in, lifts on the way out */}
      <div ref={lid} className="pointer-events-none fixed inset-0 z-50 bg-black" style={{ clipPath: "inset(0 0 100% 0)" }} aria-hidden />
    </div>
  );
}
