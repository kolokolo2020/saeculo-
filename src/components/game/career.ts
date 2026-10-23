import type { Look } from "./people";
import type { SaveData } from "./save";
import type { Place } from "./sfx";
import type { Project } from "./studio/project";

// Your career, as the block sees it: followers on your page, the artists
// who'll buy a beat or get on a song with you, the songs earning while you
// walk about, your posts and messages, and the people who notice when
// somebody's getting money. Numbers live here; Game.tsx and scripts.ts do
// the talking.

/** The clock and the dice, for the game's event handlers (kept out of the component so the compiler doesn't mistake them for render work). */
export const now = () => Date.now();
export const roll = () => Math.random();

// ------------------------------------------------------------ fame

/** Followers needed for each step up, and what the block calls you there. */
export const TIERS: { fans: number; name: string }[] = [
  { fans: 0, name: "nobody yet" },
  { fans: 100, name: "local" },
  { fans: 500, name: "buzzing" },
  { fans: 2000, name: "rising" },
  { fans: 10000, name: "hot right now" },
  { fans: 50000, name: "famous" },
  { fans: 250000, name: "a star" },
];
export const tierOf = (fans: number) => TIERS.reduce((t, x, i) => (fans >= x.fans ? i : t), 0);
export const nextTier = (fans: number) => TIERS[tierOf(fans) + 1] ?? null;

/** 1.2K, 34K, 1.1M. */
export function fmtFans(n: number): string {
  n = Math.floor(n);
  if (n < 1000) return String(n);
  if (n < 1e6) return `${(n / 1000).toFixed(n < 10000 ? 1 : 0).replace(/\.0$/, "")}K`;
  return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
}

/** The more people know you, the more a beat of yours is worth. */
export const fameMult = (fans: number) => 1 + 0.5 * Math.log2(1 + fans / 200);

/** What a beat's worth on its own: how much is in it. */
export function priceOf(p: Project): number {
  const chans = p.channels.length;
  const patterns = p.patterns.filter((pt) => Object.values(pt.steps).some((st) => st.some((v) => v > 0)) || Object.values(pt.notes).some((n) => n.length)).length;
  const song = p.song.filter((x) => x >= 0).length;
  const found = p.channels.filter((c) => /^(rain|bottle|phone|lighter|basketball|chimes|spray|dice|scratch|train|crowd|mic)$/.test(c.voice)).length;
  return Math.min(90, 12 + chans * 3 + patterns * 4 + Math.min(song, 8) + found * 4);
}

// ------------------------------------------------------------ the artists

export interface Artist {
  id: string;
  name: string;
  handle: string;
  /** What they do, in a word or two. */
  kind: string;
  place: Place;
  at: [number, number];
  /** Followers you need before they'll take you seriously. */
  fans: number;
  /** Followers before they're even around (the big ones come to you). */
  show: number;
  /** What they pay, against a beat's worth. */
  pays: number;
  /** Their audience: how many of them find you through a beat or a song. */
  reach: number;
  look: Look;
  /** What they say before they know you, and once they do. */
  cold: string[];
  warm: string[][];
  /** On a song: what the session's like. */
  session: string;
}

export const ARTISTS: Artist[] = [
  {
    id: "brick",
    name: "Lil Brick",
    handle: "lilbrick",
    kind: "rapper",
    place: "street",
    at: [23.4, 4.25],
    fans: 0,
    show: 0,
    pays: 0.6,
    reach: 18,
    look: { skin: "#8d5a3b", hair: "#120d0a", top: "#b33a3a", topStyle: "hoodie", trim: "#111216", pants: "#1c1f26", pantsStyle: "joggers", style: "buzz", body: "slim", hat: "durag", hatColor: "#111216", extra: "chain" },
    cold: ["“Yo. You're the one with the light on all night? Making beats?”", "“I rap. I'm gonna be big. I just need beats. Cheap ones.”"],
    warm: [["“My mixtape's nearly done. Nearly. Needs your stuff on it.”"], ["“My cousin played your beat at a party. Whole room went.”"], ["“When I blow up I'm putting you on. Watch.”"]],
    session: "He does his verse in one take, then nine more.",
  },
  {
    id: "kaya",
    name: "Kaya",
    handle: "kayasings",
    kind: "singer",
    place: "park",
    at: [3, 6.2],
    fans: 100,
    show: 0,
    pays: 0.9,
    reach: 45,
    look: { skin: "#e0b193", hair: "#3a2416", top: "#e8e0cf", topStyle: "puffer", pants: "#2c3e5a", style: "long", extra: "headphones", extraColor: "#e8e0cf" },
    cold: ["She takes one headphone off. “Sorry, I'm writing.”", "“Come back when people know your stuff. Then we'll talk.”"],
    warm: [["“I hum your beats on the bus. People stare.”"], ["“Slow ones. Rain ones. That's my lane.”"], ["“The park's where I write. Nobody here cares if it's bad.”"]],
    session: "She sings it soft, three takes, then a fourth that makes everyone go quiet.",
  },
  {
    id: "dread",
    name: "Mo Dread",
    handle: "modread",
    kind: "drill rapper",
    place: "alley",
    at: [4.6, 6.4],
    fans: 250,
    show: 0,
    pays: 1.1,
    reach: 70,
    look: { skin: "#4e3020", hair: "#0d0a08", top: "#111216", topStyle: "puffer", pants: "#111216", pantsStyle: "cargo", style: "braids", hat: "ski", hatColor: "#111216", hatShade: "#26262b" },
    cold: ["He looks at you for a long time through the mask.", "“I don't buy from nobodies. Get some numbers up.”"],
    warm: [["“Dark. Sliding. That's all I want.”"], ["“They pull up on me, I pull up on a beat. That's the difference.”"], ["“Your 808s go crazy. Don't tell nobody I said that.”"]],
    session: "He paces the whole time, mask on, and doesn't miss a word.",
  },
  {
    id: "juno",
    name: "Juno Vale",
    handle: "junovale",
    kind: "R&B singer",
    place: "club",
    at: [3.4, 7.1],
    fans: 500,
    show: 0,
    pays: 1.5,
    reach: 220,
    look: { skin: "#b07a58", hair: "#151010", top: "#7a2a6a", topStyle: "jacket", trim: "#e8e0cf", pants: "#111216", style: "bun", extra: "shades", body: "slim" },
    cold: ["“The VIP's not really... you know.”", "She smiles, polite. “Get your following up, babe.”"],
    warm: [["“I need something for late. Like three a.m. late.”"], ["“My manager asked who made that beat. I said you. He wrote it down.”"], ["“Don't overthink it. Chords and a pocket.”"]],
    session: "She does the harmonies herself, stacked six deep, and asks for the lights off.",
  },
  {
    id: "ojay",
    name: "Saint Ojay",
    handle: "saintojay",
    kind: "underground legend",
    place: "underpass",
    at: [8.6, 7.4],
    fans: 2000,
    show: 0,
    pays: 2,
    reach: 800,
    look: { skin: "#6b4431", hair: "#8a8a86", top: "#4a3a2a", topStyle: "leather", trim: "#c9c2b3", pants: "#26262b", style: "afro", body: "broad", hat: "bucket", hatColor: "#26262b", neck: "chain", neckColor: "#d8b35a" },
    cold: ["“Everybody under this bridge makes beats.”", "“Come see me when the city knows your name. Not just the block.”"],
    warm: [["“I've been rapping under this bridge since before you were born.”"], ["“Real ones hear it. That's enough.”"], ["“Tank used to carry my bags. Ask him.”"]],
    session: "He listens to the beat twice, nods, and does it off the top. Every word.",
  },
  {
    id: "halo",
    name: "Big Halo",
    handle: "bighalo",
    kind: "platinum rapper",
    place: "rooftop",
    at: [12.5, 7.6],
    fans: 10000,
    show: 5000,
    pays: 3,
    reach: 4000,
    look: { skin: "#4e3020", hair: "#0d0a08", top: "#111216", topStyle: "fur", trim: "#e8e0cf", pants: "#111216", pantsStyle: "leatherp", style: "buzz", body: "broad", extra: "grillz", extraColor: "#f0c850", neck: "iced", neckColor: "#e8f4ff", shoes: "#111216", shoeTrim: "#d02a2a" },
    cold: ["Two men in black step between you before you get close.", "Big Halo doesn't look up from his phone. “I know who I work with.”"],
    warm: [["“Shooting the video up here. Your roof, right? Respect.”"], ["“Label wants a single. Your sound's the single.”"], ["“Stay hungry. I'm serious. Look at me.”"]],
    session: "His people clear the room. He does sixteen bars, listens back, and laughs.",
  },
  {
    id: "nova",
    name: "Nova Reign",
    handle: "novareign",
    kind: "superstar",
    place: "boutique",
    at: [9.5, 4.6],
    fans: 50000,
    show: 25000,
    pays: 4.2,
    reach: 20000,
    look: { skin: "#f1d2bd", hair: "#e8e0cf", top: "#e8e0cf", topStyle: "fur", trim: "#ffffff", pants: "#111216", pantsStyle: "leatherp", style: "long", body: "slim", extra: "shades", neck: "cuban", neckColor: "#f0c850" },
    cold: ["Her security doesn't even let you say your name.", "(she only works with the famous)"],
    warm: [["“They keep sending me the same beat. You don't make the same beat.”"], ["“I came in for a coat. Leaving with a producer.”"], ["“Don't post this. Actually, post this.”"]],
    session: "The whole session is twenty minutes. The song's done. You're not sure what happened.",
  },
];
export const artistById = (id: string) => ARTISTS.find((a) => a.id === id);

/** What an artist pays for a beat of yours, at your current fame. */
export const artistPrice = (tape: Project, a: Artist, fans: number) => Math.round(priceOf(tape) * a.pays * fameMult(fans));
/** How many people find you through a beat sold to them. */
export const saleFans = (tape: Project, a: Artist) => Math.round(a.reach * (0.5 + priceOf(tape) / 90));

// ------------------------------------------------------------ songs

/** A song you made with someone: it keeps earning while it's out. */
export interface Song {
  title: string;
  artist: string;
  /** Session score, 0..100. */
  q: number;
  streams: number;
  /** $ it's earned you so far. */
  earned: number;
  /** $ a minute it pays now (it fades, but never to nothing). */
  rate: number;
  floor: number;
}

const WORDS_A = ["Late", "Cold", "Rain", "Gold", "Low", "Blue", "Slow", "Night", "Glass", "Smoke", "Corner", "Midnight", "Sirens", "Velvet", "Concrete", "Neon"];
const WORDS_B = ["Money", "Season", "Weather", "Feelings", "Lights", "Talk", "Motion", "Hours", "Summer", "Static", "Window", "Days", "Prayers", "Chains", "Love", "Run"];
export function songTitle(seed = Math.random()): string {
  const a = WORDS_A[Math.floor(seed * WORDS_A.length)];
  const b = WORDS_B[Math.floor(((seed * 7919) % 1) * WORDS_B.length)];
  return `${a} ${b}`;
}

/** A finished session becomes a song: money up front, followers, and a rate it earns at. */
export function makeSong(a: Artist, tape: Project, q: number, fans: number): { song: Song; upfront: number; gain: number } {
  const price = artistPrice(tape, a, fans);
  const k = 0.3 + q / 100;
  const rate = Math.max(1, Math.round(price * 0.22 * k));
  const song: Song = { title: songTitle(), artist: a.id, q, streams: 0, earned: 0, rate, floor: Math.max(0.5, rate * 0.08) };
  return { song, upfront: Math.round(price * 0.5 * k), gain: Math.round(a.reach * (1 + q / 35)) };
}

// ------------------------------------------------------------ posts and messages

export type PostKind = "beat" | "sale" | "song" | "fit" | "fight" | "show" | "news";
export interface Post {
  kind: PostKind;
  text: string;
  likes: number;
  /** A colour for the square in the grid. */
  hue: number;
}
export type MsgKind = "fan" | "artist" | "mob" | "offer" | "news";
export interface Msg {
  id: string;
  from: string;
  kind: MsgKind;
  text: string;
  read: boolean;
  /** Something you can answer (an artist to link up with, a mob to pay or not, a brand deal). */
  act?: { type: "link"; artist: string } | { type: "mob"; mob: MobId } | { type: "sponsor"; pay: number };
  done?: boolean;
}

const FAN_DMS = [
  ["beatsbyno1", "bro your beats have no business being this hard"],
  ["late.nite.kid", "that loop you posted is on repeat in my room rn"],
  ["mia_listens", "do u do custom beats?? asking for my brother"],
  ["corner.radio", "playing you on the show tonight 🔊"],
  ["dj_softhands", "can I play your stuff in my set saturday"],
  ["trapgremlin", "type beat when?? 😭"],
  ["auntie.k", "saw you in the store. tell your mum I said hi"],
  ["no.skips.only", "this the one. this the one."],
];
export const fanDm = (i: number): Msg => {
  const [from, text] = FAN_DMS[i % FAN_DMS.length];
  return { id: `fan-${i}-${Date.now()}`, from, kind: "fan", text, read: false };
};

/** The post a thing you did turns into, and how it lands. */
export function makePost(kind: PostKind, text: string, fans: number, boost = 1): Post {
  const base = Math.max(3, Math.round((8 + fans * 0.06) * boost * (0.7 + Math.random() * 0.6)));
  return { kind, text, likes: base, hue: Math.floor(Math.random() * 360) };
}

// ------------------------------------------------------------ the people who want a cut

export type MobId = "kings" | "syndicate";
export type MobStage = "none" | "asked" | "paying" | "hunted" | "done";
export interface MobState {
  stage: MobStage;
  /** Squads you've sent off while they were after you. */
  squads: number;
  /** What you've paid them, all told. */
  paid: number;
}
export interface Mob {
  id: MobId;
  name: string;
  boss: string;
  /** Who comes for you once you've seen off enough of them. */
  heavy: string;
  /** Followers before they come asking. */
  fans: number;
  /** Their share of what your music earns. */
  cut: number;
  /** Robberies (and drunks) still happen, just not this often, while you pay. */
  shelter: number;
  /** To stop being hunted after saying no. */
  peace: (s: SaveData) => number;
  /** Squads to see off before the heavy comes himself. */
  squadsToHeavy: number;
}
export const MOBS: Record<MobId, Mob> = {
  kings: { id: "kings", name: "the Block Kings", boss: "Rook", heavy: "Rook", fans: 1500, cut: 0.15, shelter: 0.35, peace: (s) => Math.max(250, Math.round(s.stats.earned * 0.12)), squadsToHeavy: 3 },
  syndicate: { id: "syndicate", name: "the Syndicate", boss: "Mr. Vance", heavy: "Kade", fans: 25000, cut: 0.25, shelter: 0.2, peace: (s) => Math.max(2000, Math.round(s.stats.earned * 0.2)), squadsToHeavy: 3 },
};
export const MOB_IDS: MobId[] = ["kings", "syndicate"];
export const freshMob = (): MobState => ({ stage: "none", squads: 0, paid: 0 });

/** The share of what your music earns that goes to people you pay. */
export const cutOf = (s: SaveData) => MOB_IDS.reduce((c, id) => c + (s.mob[id].stage === "paying" ? MOBS[id].cut : 0), 0);
/** Who's after you right now, if anyone (the worse one first). */
export const huntedBy = (s: SaveData): MobId | null => (s.mob.syndicate.stage === "hunted" ? "syndicate" : s.mob.kings.stage === "hunted" ? "kings" : null);
/** How much less trouble you get for paying. */
export const shelterOf = (s: SaveData) => MOB_IDS.reduce((k, id) => k * (s.mob[id].stage === "paying" ? MOBS[id].shelter : 1), 1);
/** A mob that's noticed you and wants to talk (they come and find you). */
export const mobDue = (s: SaveData): MobId | null => MOB_IDS.find((id) => (s.mob[id].stage === "none" || s.mob[id].stage === "asked") && s.fans >= MOBS[id].fans) ?? null;

// ------------------------------------------------------------ money that comes in on its own

/** $ a minute from beats posted to your page (leases, sold while you sleep). */
export const storeRate = (s: SaveData) => Math.min(80, s.posted.length * Math.sqrt(s.fans) * 0.035);

/**
 * A stretch of time passing for your catalogue: songs earn (and fade),
 * the beat store sells. Returns the new songs and what came in before anyone's cut.
 */
export function accrue(s: SaveData, minutes: number): { songs: Song[]; songCash: number; storeCash: number } {
  let songCash = 0;
  const songs = s.collabs.map((x) => {
    const cash = x.rate * minutes;
    songCash += cash;
    return { ...x, earned: x.earned + cash, streams: x.streams + Math.round(cash * 330), rate: Math.max(x.floor, x.rate * Math.pow(0.94, minutes)) };
  });
  return { songs, songCash, storeCash: storeRate(s) * minutes };
}

// ------------------------------------------------------------ how famous people get stopped

/** Odds that trouble on the street is someone who knows your face. */
export const recognised = (s: SaveData) => Math.min(0.75, tierOf(s.fans) * 0.12);
