import { fromOldTape, loadStore, saveStore } from "./studio/project";
import { ITEMS, sanitizeProfile, STARTERS, type Profile } from "./character";
import { FINDABLE } from "./studio/voices";
import { WEAPONS } from "./weapons";
import { PLACES, type Place } from "./sfx";
import { ARTISTS, freshMob, MOB_IDS, VENUE_IDS, type Chart, type ManagerStage, type Mixtape, type MobId, type MobState, type Msg, type Post, type Song, type Venue } from "./career";

// What the game remembers between visits, in this browser only: who you
// are and what you wear, your cash and respect, your health, what you've
// unlocked, the sounds you've found, who you've played your beats for, the
// goals you've reached, the small things that only happen once, your
// career (followers, posts, messages, songs, who you've sold to, who wants a
// cut) and the settings. Beats you make live in the studio's own store (studio/project.ts).

export const MAX_HP = 100;
export type Difficulty = "chill" | "normal" | "hard";

export interface Settings {
  /** Footsteps, doors, punches. 0..1 */
  sfx: number;
  /** Boomboxes, monitors, the club. 0..1 */
  music: number;
  shake: boolean;
  /** The glints over things still to find. */
  hints: boolean;
  difficulty: Difficulty;
}

export interface Stats {
  wins: number;
  losses: number;
  fled: number;
  beatsSold: number;
  earned: number;
  cypherBest: number;
  djBest: number;
  diceWon: number;
  digs: number;
  tags: number;
  swishes: number;
  battleWins: number;
  battleLosses: number;
  jobs: number;
  rides: number;
  /** What songs and the beat store have paid, all told. */
  royalties: number;
  /** Beats sold to artists. */
  leases: number;
  songs: number;
  /** Fight nights won, and rounds. */
  ringWins: number;
  monteWon: number;
  shows: number;
  arrests: number;
  turfWins: number;
  freestyleWins: number;
  poolWins: number;
  deliveries: number;
  /** Weeks with a song of yours at number one. */
  number1s: number;
  disses: number;
}

/** A job from Dre: a tape to take somewhere, then back to him for the money (or to tell him it's gone). */
export interface Job {
  /** Who it goes to (an actor id). */
  to: string;
  stage: "carry" | "back" | "lost";
  pay: number;
}

export interface SaveData {
  found: string[];
  seenHelp: boolean;
  /** Findable sounds found but not yet looked at in the studio. */
  unseen: string[];
  /** Who you've played a tape for, and which (they remember). */
  heard: Record<string, string>;
  /** Small one-time things that have already happened. */
  seen: string[];
  /** null until you've been to the mirror. */
  profile: Profile | null;
  cash: number;
  /** Respect: fights won, crowds moved, walls tagged. */
  rep: number;
  hp: number;
  /** Clothes you own (the starters always count). */
  owned: string[];
  weapons: string[];
  weapon: string;
  /** Things to eat and drink, by id. */
  items: Record<string, number>;
  stats: Stats;
  /** Goals reached. */
  goals: string[];
  /** Tapes sold, by name (each sells once). */
  sold: string[];
  /** Places you've been. */
  places: string[];
  /** Your tag on the alley wall, if you've sprayed it. */
  tag: { color: string } | null;
  /** The job you're on, if any. */
  job: Job | null;
  /** Followers on your page. */
  fans: number;
  /** Newest first. */
  posts: Post[];
  /** Newest first. */
  inbox: Msg[];
  /** Artists you've linked up with. */
  contacts: string[];
  /** How well each artist knows you (beats bought, songs made). */
  rel: Record<string, number>;
  /** Tapes each artist has bought from you (each buys a tape once). */
  leases: Record<string, string[]>;
  collabs: Song[];
  /** Tapes up on your page's beat store. */
  posted: string[];
  mob: Record<MobId, MobState>;
  /** When things can happen again (wall-clock ms). */
  cd: Record<string, number>;
  chart: Chart;
  /** A show you've said yes to, waiting for you at the venue. */
  show: Venue | null;
  mixtapes: Mixtape[];
  manager: ManagerStage;
  /** How much the police have noticed you, 0..5 (it cools off). */
  heat: number;
  /** A corner the Kings want cleared, if you've said yes. */
  turf: Place | null;
  /** What you've bought for your room, your studio, your ride. */
  upgrades: string[];
  settings: Settings;
}

const KEY = "saeculo-game";

export const DEFAULT_SETTINGS: Settings = { sfx: 0.8, music: 0.8, shake: true, hints: true, difficulty: "normal" };
const ZERO: Stats = { wins: 0, losses: 0, fled: 0, beatsSold: 0, earned: 0, cypherBest: 0, djBest: 0, diceWon: 0, digs: 0, tags: 0, swishes: 0, battleWins: 0, battleLosses: 0, jobs: 0, rides: 0, royalties: 0, leases: 0, songs: 0, ringWins: 0, monteWon: 0, shows: 0, arrests: 0, turfWins: 0, freestyleWins: 0, poolWins: 0, deliveries: 0, number1s: 0, disses: 0 };

export function freshSave(): SaveData {
  return {
    found: [],
    seenHelp: false,
    unseen: [],
    heard: {},
    seen: [],
    profile: null,
    cash: 20,
    rep: 0,
    hp: MAX_HP,
    owned: [...STARTERS],
    weapons: ["fists"],
    weapon: "fists",
    items: { noodles: 1 },
    stats: { ...ZERO },
    goals: [],
    sold: [],
    places: ["bedroom"],
    tag: null,
    job: null,
    fans: 12,
    posts: [],
    inbox: [],
    contacts: [],
    rel: {},
    leases: {},
    collabs: [],
    posted: [],
    mob: { kings: freshMob(), syndicate: freshMob() },
    cd: {},
    chart: { week: 0, entries: [] },
    show: null,
    mixtapes: [],
    manager: "none",
    heat: 0,
    turf: null,
    upgrades: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

const strings = (x: unknown): string[] => (Array.isArray(x) ? x.filter((v): v is string => typeof v === "string") : []);
const num = (x: unknown, lo: number, hi: number, fallback: number) => (typeof x === "number" && Number.isFinite(x) ? Math.max(lo, Math.min(hi, x)) : fallback);
const obj = (x: unknown): Record<string, unknown> => (x && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : {});
const str = (x: unknown, max = 200) => (typeof x === "string" ? x.slice(0, max) : "");
const POST_KINDS = ["beat", "sale", "song", "fit", "fight", "show", "news"];
const MSG_KINDS = ["fan", "artist", "mob", "offer", "news"];
const STAGES = ["none", "asked", "paying", "hunted", "done"];

function loadPosts(x: unknown): Post[] {
  return (Array.isArray(x) ? x : []).slice(0, 40).flatMap((p): Post[] => {
    const o = obj(p);
    return POST_KINDS.includes(o.kind as string) ? [{ kind: o.kind as Post["kind"], text: str(o.text), likes: num(o.likes, 0, 1e9, 0), hue: num(o.hue, 0, 360, 0) }] : [];
  });
}
function loadInbox(x: unknown): Msg[] {
  return (Array.isArray(x) ? x : []).slice(0, 40).flatMap((m): Msg[] => {
    const o = obj(m);
    if (!MSG_KINDS.includes(o.kind as string) || typeof o.id !== "string") return [];
    const a = obj(o.act);
    const act: Msg["act"] =
      a.type === "link" && ARTISTS.some((x) => x.id === a.artist)
        ? { type: "link", artist: a.artist as string }
        : a.type === "mob" && MOB_IDS.includes(a.mob as MobId)
          ? { type: "mob", mob: a.mob as MobId }
          : a.type === "sponsor"
            ? { type: "sponsor", pay: num(a.pay, 0, 1e6, 0) }
            : a.type === "show" && VENUE_IDS.includes(a.venue as Venue)
              ? { type: "show", venue: a.venue as Venue }
              : a.type === "turf" && (PLACES as readonly string[]).includes(a.place as string)
                ? { type: "turf", place: a.place as Place }
              : a.type === "manager" || a.type === "diss"
                ? { type: a.type }
                : undefined;
    return [{ id: o.id, from: str(o.from, 40), kind: o.kind as Msg["kind"], text: str(o.text, 400), read: o.read === true, act, done: o.done === true }];
  });
}
function loadSongs(x: unknown): Song[] {
  return (Array.isArray(x) ? x : []).slice(0, 60).flatMap((v): Song[] => {
    const o = obj(v);
    if (!ARTISTS.some((a) => a.id === o.artist)) return [];
    return [{ title: str(o.title, 40), artist: o.artist as string, q: num(o.q, 0, 100, 50), streams: num(o.streams, 0, 1e12, 0), earned: num(o.earned, 0, 1e9, 0), rate: num(o.rate, 0, 1e5, 1), floor: num(o.floor, 0, 1e5, 0.5) }];
  });
}
function loadMob(x: unknown): Record<MobId, MobState> {
  const o = obj(x);
  const one = (v: unknown): MobState => {
    const m = obj(v);
    return { stage: STAGES.includes(m.stage as string) ? (m.stage as MobState["stage"]) : "none", squads: num(m.squads, 0, 99, 0), paid: num(m.paid, 0, 1e9, 0) };
  };
  return { kings: one(o.kings), syndicate: one(o.syndicate) };
}
function loadChart(x: unknown): Chart {
  const o = obj(x);
  const entries = (Array.isArray(o.entries) ? o.entries : []).slice(0, 10).flatMap((v): Chart["entries"] => {
    const e = obj(v);
    return typeof e.title === "string" && typeof e.artist === "string" ? [{ title: str(e.title, 60), artist: str(e.artist, 40), mine: e.mine === true, score: num(e.score, 0, 1e9, 0), last: num(e.last, 0, 10, 0) }] : [];
  });
  const y = obj(o.yours);
  return { week: num(o.week, 0, 1e6, 0), entries, yours: typeof y.title === "string" ? { title: str(y.title, 60), pos: num(y.pos, 1, 99, 99) } : null };
}
function loadMixtapes(x: unknown): Mixtape[] {
  return (Array.isArray(x) ? x : []).slice(0, 40).flatMap((v): Mixtape[] => {
    const m = obj(v);
    return typeof m.name === "string" ? [{ name: str(m.name, 60), songs: strings(m.songs) }] : [];
  });
}
const lists = (x: unknown): Record<string, string[]> => Object.fromEntries(Object.entries(obj(x)).map(([k, v]) => [k, strings(v)]));
const nums = (x: unknown, hi: number): Record<string, number> => Object.fromEntries(Object.entries(obj(x)).flatMap(([k, v]) => (typeof v === "number" && Number.isFinite(v) ? [[k, Math.max(0, Math.min(hi, v))]] : [])));

export function loadSave(): SaveData {
  const base = freshSave();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (!raw || typeof raw !== "object") return base;
    const found = strings(raw.found).filter((s) => FINDABLE.includes(s));
    const unseen = strings(raw.unseen).filter((s) => found.includes(s));
    const heard: Record<string, string> = {};
    if (raw.heard && typeof raw.heard === "object") for (const [k, v] of Object.entries(raw.heard)) if (typeof v === "string") heard[k] = v;
    const items: Record<string, number> = {};
    if (raw.items && typeof raw.items === "object") for (const [k, v] of Object.entries(raw.items)) if (typeof v === "number" && v > 0) items[k] = Math.min(99, Math.floor(v));
    const stats = { ...ZERO };
    if (raw.stats && typeof raw.stats === "object") for (const k of Object.keys(ZERO) as (keyof Stats)[]) stats[k] = num(raw.stats[k], 0, 1e9, 0);
    const st = raw.settings ?? {};
    const weapons = strings(raw.weapons).filter((w) => WEAPONS.some((x) => x.id === w));
    if (!weapons.includes("fists")) weapons.unshift("fists");
    return {
      found,
      seenHelp: raw.seenHelp === true,
      unseen,
      heard,
      seen: strings(raw.seen),
      profile: sanitizeProfile(raw.profile),
      cash: num(raw.cash, 0, 1e7, base.cash),
      rep: num(raw.rep, 0, 1e7, 0),
      hp: num(raw.hp, 1, MAX_HP, MAX_HP),
      owned: [...new Set([...STARTERS, ...strings(raw.owned).filter((id) => ITEMS.some((x) => x.id === id))])],
      weapons,
      weapon: weapons.includes(raw.weapon) ? raw.weapon : "fists",
      items: "items" in raw ? items : base.items,
      stats,
      goals: strings(raw.goals),
      sold: strings(raw.sold),
      places: [...new Set(["bedroom", ...strings(raw.places)])],
      tag: raw.tag && typeof raw.tag.color === "string" ? { color: raw.tag.color } : null,
      job: raw.job && typeof raw.job.to === "string" && (raw.job.stage === "carry" || raw.job.stage === "back" || raw.job.stage === "lost") ? { to: raw.job.to, stage: raw.job.stage, pay: num(raw.job.pay, 0, 500, 25) } : null,
      fans: num(raw.fans, 0, 1e9, base.fans),
      posts: loadPosts(raw.posts),
      inbox: loadInbox(raw.inbox),
      contacts: strings(raw.contacts).filter((id) => ARTISTS.some((a) => a.id === id)),
      rel: nums(raw.rel, 999),
      leases: lists(raw.leases),
      collabs: loadSongs(raw.collabs),
      posted: strings(raw.posted),
      mob: loadMob(raw.mob),
      cd: nums(raw.cd, 1e15),
      chart: loadChart(raw.chart),
      show: VENUE_IDS.includes(raw.show) ? raw.show : null,
      mixtapes: loadMixtapes(raw.mixtapes),
      manager: ["none", "offered", "hired", "fired"].includes(raw.manager) ? raw.manager : "none",
      heat: num(raw.heat, 0, 5, 0),
      upgrades: strings(raw.upgrades),
      turf: (PLACES as readonly string[]).includes(raw.turf) ? raw.turf : null,
      settings: {
        sfx: num(st.sfx, 0, 1, DEFAULT_SETTINGS.sfx),
        music: num(st.music, 0, 1, DEFAULT_SETTINGS.music),
        shake: st.shake !== false,
        hints: st.hints !== false,
        difficulty: st.difficulty === "chill" || st.difficulty === "hard" ? st.difficulty : "normal",
      },
    };
  } catch {
    return base;
  }
}

/** Returns false when the browser won't keep it (a private window, storage blocked or full). */
export function writeSave(data: SaveData): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return localStorage.getItem(KEY) !== null;
  } catch {
    // storage full or blocked: progress lasts for this visit
    return false;
  }
}

/** Start over: everything in the game except the beats you've made. */
export function resetSave(): SaveData {
  const fresh = freshSave();
  writeSave(fresh);
  return fresh;
}

/** Beats saved to tape by the first version of the sampler move into the studio's project slots, once. */
export function migrateOldTapes() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    const tapes: unknown[] = Array.isArray(raw?.tapes) ? raw.tapes : [];
    const old = tapes.filter((t): t is { pattern: { steps: boolean[][]; tempo: number; swing: number; sounds: string[] } } => {
      const p = (t as { pattern?: { steps?: unknown; sounds?: unknown } } | null)?.pattern;
      return !!p && Array.isArray(p.steps) && Array.isArray(p.sounds) && p.steps.length === 4;
    });
    if (!old.length) return;
    const store = loadStore();
    old.forEach((t, i) => {
      const slot = store.slots.findIndex((s) => s === null);
      if (slot >= 0) store.slots[slot] = fromOldTape(t.pattern, `old tape ${"ABCD"[i] ?? i + 1}`);
    });
    saveStore(store);
    delete raw.tapes;
    localStorage.setItem(KEY, JSON.stringify(raw));
  } catch {
    // leave them be
  }
}
