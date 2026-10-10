"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePlayerStore } from "@/components/player/playerStore";
import { useSiteStore } from "@/components/site/siteStore";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { DEFAULT_PROFILE, ITEMS, lookOf, randomProfile, type Profile } from "./character";
import { faceOff, foeLines, freshMe, isUp, makeFoe, moveMe, standDown, startDodge, swing, updateFoes, type FightEvents, type Me } from "./combat";
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
import { CONSUMABLES, consumableById, unlockedByWins, weaponById } from "./weapons";
import { Engine } from "./studio/engine";
import { PRESETS } from "./studio/presets";
import { loadStore } from "./studio/project";
import Studio from "./studio/Studio";
import { FINDABLE, playVoice, voiceById, VOICES } from "./studio/voices";
import { clearSmoke } from "./actors";
import { catFollows, catHome, cheerFor, lifeBlocks, lifeTarget, makeLife, sendCop, updateLife, type Actor } from "./life";
import { clone, type Project } from "./studio/project";
import { sampleProject } from "./studio/sample";
import { TRACKS } from "@/data/tracks";
import { formatTime } from "@/lib/audio";
import { blocked, inside, SCENES, START, tileAt, TILE, type Dir, type Door } from "./world";

// The game: a bedroom, the street outside, the corner store and a basement
// studio. You start at the laptop the website lives on; closing it puts you
// in the room, and using it again brings the site back. The loop is small:
// walk around, find a sound, take it to the studio, make a beat, save it,
// and find it on your shelf later.

type Phase = "closing" | "play" | "leaving";
interface Choice {
  label: string;
  run: () => void;
}
interface Dialog {
  lines: string[];
  i: number;
  choices?: Choice[];
}

const SPEED = 62; // px per second
const KEYMAP: Record<string, Dir> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};
const PLACE_NAMES: Record<Place, string> = {
  bedroom: "Your room",
  street: "Outside",
  store: "Corner store",
  studio: "Studio",
  park: "The park",
  rooftop: "The roof",
  avenue: "The avenue",
  alley: "The alley",
  records: "Record shop",
  thrift: "Thrift shop",
  club: "The club",
  subway: "Subway",
  underpass: "Underpass",
};
const HINT_AT: Record<string, string> = { rain: "window", phone: "phone", bottle: "counter", lighter: "bench", basketball: "hoop", chimes: "chimes", spray: "wall", dice: "dice", scratch: "crates", train: "edge", crowd: "booth", mic: "speaker" };
/** Where trouble finds you, and how likely it is when you walk in. */
const ROUGH: Partial<Record<Place, number>> = { street: 0, park: 0, avenue: 0.05, alley: 0.25, subway: 0.1, underpass: 0.2 };
/** Seconds of peace after trouble, whichever way it went. */
const BREATHER = 60;
/**
 * Carrying Dre's tape you're worth stopping: trouble comes this much sooner,
 * and is this much likelier to be waiting when you walk into a rough place
 * (never more than 45%, and never inside the breather).
 */
const CARRY_SOONER = 1.6;
const CARRY_ODDS = 1.8;
const carrying = (v: SaveData) => v.job?.stage === "carry";
/** How likely trouble is to be waiting when you walk in. */
const ambushOdds = (place: Place, v: SaveData) => Math.min(0.45, (ROUGH[place] ?? 0) * (carrying(v) ? CARRY_ODDS : 1));
/** What they say when they've seen the tape on you. */
const TAPE_LINES = [
  ["One of them nods at your pocket.", "\u201cWhat's on the tape?\u201d"],
  ["\u201cOi. That a tape?\u201d", "\u201cWhat's on the tape? Give us a listen.\u201d"],
  ["\u201cYou're carrying. Anyone can see you're carrying.\u201d", "\u201cSo what's on the tape?\u201d"],
];
const tapeLines = () => TAPE_LINES[Math.floor(Math.random() * TAPE_LINES.length)];
/** Pet the alley cat this many times in one visit and it comes with you for a bit. */
const CAT_PETS = 3;
const BOOMBOX = { x: 17.6 * TILE, y: 4.4 * TILE };

/** Lines people say, cycled one set per conversation. */
const LINES: Record<string, string[][]> = {
  "crew-smoke": [
    ["\u201cYou live up top? Light's on all night.\u201d"],
    ["\u201cThis block's quieter than it looks.\u201d", "\u201cThat's the problem.\u201d"],
    ["\u201cDon't answer that payphone. Or do. Your business.\u201d"],
  ],
  "crew-drink": [["\u201cStore never closes. Neither do we.\u201d"], ["\u201cMilo found that speaker in a skip. Still slaps.\u201d"]],
  "crew-box": [["\u201cThis speaker's older than me.\u201d"], ["\u201cYou make beats? Bring us something.\u201d"]],
  walker: [["\u201cHe likes you. He doesn't like anyone.\u201d"], ["\u201cSame walk every night. He insists.\u201d"]],
  "couch-cup": [["\u201cSip slow.\u201d"], ["\u201cYou cooking tonight or just looking at the pads?\u201d"]],
  "couch-blunt": [["\u201cSit down, you're making the room nervous.\u201d"]],
  "couch-phones": [["She slides one side of her headphones off."]],
  oldman: [
    ["\u201cSame pigeons every night. I think they know me.\u201d"],
    ["\u201cThat payphone on the corner rings for years now.\u201d", "\u201cI stopped wondering who.\u201d"],
  ],
  "hooper-1": [["\u201cNext.\u201d"]],
  "hooper-2": [["\u201cHe's been missing all night. Don't tell him.\u201d"]],
  "alley-cat": [
    ["The cat lets you scratch behind one ear. Then it decides that's enough."],
    ["It looks at you like you owe it money."],
    ["It purrs, very quietly, like it doesn't want anyone to know."],
  ],
  ledge: [["She doesn't turn around."], ["\u201cYou can see the whole block from here.\u201d", "\u201cYour window's the one that never goes dark.\u201d"]],
};
/** How many saved projects there are (they show as tapes on the shelf). */
const savedProjects = () => loadStore().slots.filter(Boolean).length;

/** What someone makes of a tape, from how it actually goes. */
function verdict(p: Project): string[] {
  const t = p.tempo;
  const says = t < 80 ? "\u201cSlow. Like walking home the long way.\u201d" : t < 100 ? "\u201cThat's a Sunday. That's a whole Sunday.\u201d" : t < 130 ? "\u201cNow my knee's going. Look at it.\u201d" : "\u201cToo fast for me. But I'll allow it.\u201d";
  const feel = p.swing >= 0.2 ? "\u201cIt limps. The good kind.\u201d" : p.channels.some((c) => c.voice.startsWith("cut:") || c.voice.startsWith("chop:")) ? "\u201cI know that sample from somewhere.\u201d" : null;
  return feel ? [says, feel] : [says];
}

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
    fight: null as null | { foes: Actor[]; me: Me; boss: boolean; over: number; outcome: "" | "won" | "lost" },
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
  const ui = useRef({ dialog, studio, help, phase, menu, mini, ko });
  const view = useRef({ scale, below });
  useLayoutEffect(() => {
    view.current = { scale, below };
  }, [scale, below]);
  useLayoutEffect(() => {
    ui.current = { dialog, studio, help, phase, menu, mini, ko };
  }, [dialog, studio, help, phase, menu, mini, ko]);

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

  const startFight = (foes: Actor[], boss = false) => {
    const s = st.current;
    s.pending = null;
    for (const f of foes) Object.assign(f.fighter!, { state: "approach", cd: 0.25 + Math.random() * 0.6 });
    s.fight = { foes, me: freshMe(s.x, s.y, s.dir, saveRef.current.hp), boss, over: 0, outcome: "" };
    s.sitting = false;
    keys.current = [];
    setFighting(true);
    showToast(window.matchMedia("(pointer: coarse)").matches ? "A: swing · B: dodge · watch for the “!”" : "E / Space: swing · Shift: dodge · Q: eat · watch for the “!”", 3400);
  };

  /** A group comes up the street at you. */
  const spawnTrouble = () => {
    const s = st.current;
    const v = saveRef.current;
    const scene = SCENES[s.place];
    const w = scene.tiles[0].length * TILE;
    const n = v.stats.wins >= 3 && Math.random() < 0.5 ? 3 : 2;
    const side = s.x > w / 2 ? -1 : 1;
    const x0 = Math.max(14, Math.min(w - 14, s.x + side * 120));
    const foes: Actor[] = [];
    for (let i = 0; i < n; i++) {
      let y = s.y + (i - (n - 1) / 2) * 12;
      if (blocked(scene, { x: x0 - 4, y: y - 3, w: 8, h: 4 })) y = s.y;
      const kind = i === 0 && v.stats.wins >= 4 && Math.random() < 0.6 ? "rowdy" : "drunk";
      foes.push(makeFoe(kind, s.place, x0 + side * i * 8, y, undefined, v.settings.difficulty));
    }
    life.current.push(...foes);
    s.pending = foes;
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
    startFight(foes, true);
    s.encounterIn = Math.max(s.encounterIn, 60);
  };

  const winFight = () => {
    const s = st.current;
    const f = s.fight!;
    f.outcome = "won";
    setFighting(false);
    const v = saveRef.current;
    const cash = f.foes.reduce((n, a) => n + (a.fighter?.purse ?? 0), 0);
    const rep = f.boss ? 25 : 4 * f.foes.length;
    const wins = v.stats.wins + 1;
    const gained = [...unlockedByWins(wins), ...(f.boss ? ["mic"] : [])].filter((w) => !v.weapons.includes(w));
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
    const lines = [
      f.boss ? "Tank goes down, and stays down a while. Nobody in the cypher says a word." : f.foes.length > 2 ? "The last of them hits the pavement." : "Both of them on the ground. Your hands are shaking.",
      ...cheer(),
      `They leave $${cash} behind getting up. (+${rep} respect)`,
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
    const lost = Math.floor(v.cash * 0.25);
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
    say(["You wake up on your bedroom floor. No idea how you got home.", lost ? `Your pockets are $${lost} lighter.` : "Your pockets were empty anyway.", ...(tapeGone ? ["Dre's tape is gone too. He's not going to like that."] : []), "Your head's pounding. (health 60)"]);
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
  const actions = useRef({ attack, dodge, eat: () => eatSomething() });
  useLayoutEffect(() => {
    actions.current = { attack, dodge, eat: () => eatSomething() };
  });

  const tryInteract = useCallback(() => {
    const u = ui.current;
    if (u.phase !== "play" || u.studio || u.menu || u.mini || u.ko) return;
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
      if (u.menu || u.mini || u.ko) {
        if (e.key === "Escape" && u.mini) setMini(null);
        else if (e.key === "Escape" && u.menu && !u.menu.creator) setMenu(null);
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
      if (e.key === "Escape") {
        e.preventDefault();
        if (u.dialog) setDialog(null);
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
        st.current.lastTrouble = st.current.t;
      },
      /** How likely trouble is to be waiting in a place, and how much sooner it comes, as things stand. */
      odds: (place: Place) => ({ ambush: ambushOdds(place, saveRef.current), sooner: carrying(saveRef.current) ? CARRY_SOONER : 1 }),
      /** Go down in the fight you're in. */
      knockMe: () => {
        const f = st.current.fight;
        if (f) f.me.hp = 0;
      },
      /** The alley cat: how long it'll keep following (set it to cut that short). */
      cat: (trail?: number) => {
        const c = life.current.find((a) => a.id === "alley-cat");
        if (c && trail !== undefined) c.trail = trail;
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
      /** Open a mini-game or a menu tab straight away. */
      mini: (m: Mini | null) => setMini(m),
      menu: (tab: MenuTab | null) => setMenu(tab ? { tab, creator: false } : null),
    };
    return () => {
      delete w.__game;
    };
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
      const frozen = u.phase !== "play" || !!u.dialog || u.studio || u.help || !!s.trans || !!u.menu || !!u.mini || !!u.ko || !!s.ride;
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
        // trouble, now and then, where it lives
        if (ROUGH[s.place] !== undefined && !s.fight && !s.pending && saveRef.current.profile?.name) {
          s.encounterIn -= dt * (carrying(saveRef.current) ? CARRY_SOONER : 1);
          if (s.encounterIn <= 0 && s.t - s.lastTrouble > BREATHER) {
            spawnTrouble();
            s.lastTrouble = s.t;
            s.encounterIn = 100 + Math.random() * 100;
          }
        }
      }
      s.shake = Math.max(0, s.shake - dt * 10);

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
      const who = hit ? null : lifeTarget(life.current, s.place, s.x, s.y, fx, fy);
      s.target = hit && promptFor(hit.id) ? hit.id : who ? `npc:${who.id}` : null;
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
    if (food) updateSave((v) => ({ ...v, items: { ...v.items, [id]: (v.items[id] ?? 0) + 1 } }));
    else {
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
      <div className="relative flex h-12 shrink-0 items-center gap-3 border-b border-[#1d1b19] px-3 font-lcd text-[20px] leading-none whitespace-nowrap">
        <span data-testid="game-place" className="truncate">
          {PLACE_NAMES[place]}
        </span>
        <span className="text-amber" data-testid="game-cash" aria-label={`$${Math.floor(save.cash)}, respect ${Math.floor(save.rep)}`}>
          ${Math.floor(save.cash)}
          <span className="ml-2 text-[#b9b09e]">★{Math.floor(save.rep)}</span>
        </span>
        <span className="hidden text-[#8a8170] lg:inline" aria-label={`${foundCount} of ${FINDABLE.length} sounds found`}>
          sounds {foundCount}/{FINDABLE.length}
        </span>
        {!studio && (
          <>
            <button
              className="ml-auto rounded-[3px] border border-[#3a3733] bg-[#171615] px-2.5 py-1.5 font-sans text-[13px] hover:border-[#6d6558] sm:px-3"
              onClick={() => !fighting && setMenu({ tab: "you", creator: false })}
              disabled={fighting}
              data-testid="game-menu-btn"
              aria-label="Menu (M)"
            >
              <span className="sm:hidden">☰</span>
              <span className="hidden sm:inline">Menu (M)</span>
            </button>
            <button
              className="rounded-[3px] border border-[#3a3733] bg-[#171615] px-2.5 py-1.5 font-sans text-[13px] hover:border-[#6d6558] sm:px-3"
              onClick={goToStudio}
              disabled={fighting}
              data-testid="game-to-studio"
            >
              <span className="sm:hidden">Studio</span>
              <span className="hidden sm:inline">Go to the studio</span>
            </button>
          </>
        )}
        <button
          className={`${studio ? "ml-auto" : ""} flex items-center gap-2 rounded-[3px] border border-[#3a3733] bg-[#171615] px-3 py-1.5 font-sans text-[13px] hover:border-[#6d6558]`}
          onClick={leave}
          data-testid="game-exit"
        >
          <span className="sm:hidden">Exit</span>
          <span className="hidden sm:inline">Back to the site</span> <span className="hidden text-[#948b7a] sm:inline">Esc</span>
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-start overflow-hidden sm:justify-center">
        <canvas
          ref={canvas}
          width={VIEW_W}
          height={VIEW_H}
          className={`pixel block shrink-0 ${below ? "self-start" : ""}`}
          style={{ width: VIEW_W * scale, height: VIEW_H * scale }}
          aria-hidden
        />

        {/* what the thing in front of you does */}
        {prompt && !dialog && !help && (
          <p
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-[3px] bg-black/75 px-3 py-1.5 font-lcd text-[20px] leading-none whitespace-nowrap"
            style={{ top: below ? VIEW_H * scale + 10 : Math.min(VIEW_H * scale - 44, VIEW_H * scale * 0.84) }}
            data-testid="game-prompt"
          >
            {prompt.startsWith("@") ? (
              prompt.slice(1)
            ) : (
              <>
                <span className="mr-2 text-amber">{touch ? "A" : "E"}</span>
                {prompt}
              </>
            )}
          </p>
        )}

        {dialog && (
          <div
            className="absolute left-1/2 z-20 w-[min(560px,calc(100%-24px))] -translate-x-1/2 rounded-[3px] border-2 border-[#3a3733] bg-[#0f0e0d]/95 p-3 font-lcd text-[22px] leading-tight"
            style={{ top: below ? VIEW_H * scale + 10 : Math.max(8, Math.min(VIEW_H * scale - 120, VIEW_H * scale * 0.55)) }}
            role="dialog"
            aria-live="polite"
            data-testid="game-dialog"
            onClick={() => !showingChoices && advance()}
          >
            <p>{dialog.lines[dialog.i]}</p>
            {showingChoices ? (
              <div ref={choiceBox} className="mt-2 flex flex-wrap gap-2">
                {dialog.choices!.map((c) => (
                  <button
                    key={c.label}
                    className="rounded-[2px] border border-[#4a4540] bg-[#1d1b19] px-3 py-1 text-[20px] hover:border-amber focus-visible:border-amber"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDialog(null);
                      c.run();
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-right text-[16px] text-[#8a8170]">{touch ? "tap" : "E"} ▸</p>
            )}
          </div>
        )}

        {help && phase === "play" && !menu && (
          <div
            style={{ top: below ? VIEW_H * scale + 10 : 12 }}
            className="absolute inset-x-3 z-20 mx-auto max-w-[440px] rounded-[3px] border-2 border-[#3a3733] bg-[#0f0e0d]/95 p-4 font-lcd text-[20px] leading-snug" data-testid="game-help">
            <p className="text-amber">late, the same night</p>
            <p className="mt-1">
              Find sounds around the block, then make a beat with them in the studio at the end of the street.
            </p>
            <ul className="mt-2 text-[18px] text-[#b9b09e]">
              {touch ? (
                <>
                  <li>pad: walk · A: use / talk</li>
                  <li>Back to the site: top right</li>
                </>
              ) : (
                <>
                  <li>WASD / arrows: walk</li>
                  <li>E / Space: use, talk</li>
                  <li>Esc: back to the site</li>
                </>
              )}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="rounded-[2px] border border-[#4a4540] bg-[#1d1b19] px-3 py-1 text-[20px] hover:border-amber"
                onClick={() => {
                  setHelp(false);
                  updateSave((s) => ({ ...s, seenHelp: true }));
                  root.current?.focus();
                }}
              >
                Got it
              </button>
              <button className="rounded-[2px] border border-[#4a4540] bg-[#1d1b19] px-3 py-1 text-[20px] hover:border-amber" onClick={goToStudio}>
                Straight to the studio
              </button>
            </div>
          </div>
        )}

        {toast && (
          <p
            className={`pointer-events-none absolute left-1/2 z-20 w-max max-w-[calc(100%-24px)] -translate-x-1/2 rounded-[3px] bg-[#6e1f18] px-3 py-2 text-center font-lcd text-[19px] leading-tight shadow-lg ${below && !dialog ? "" : "top-3"}`}
            // phones held upright: in the free space under the picture, clear of the pad (over the picture while someone's talking there)
            style={below && !dialog ? { bottom: touch ? 206 : 16 } : undefined}
            role="status"
            data-testid="game-toast"
          >
            {toast}
          </p>
        )}

        {/* touch controls */}
        {touch && phase === "play" && !studio && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
            <div className="pointer-events-auto grid grid-cols-3 grid-rows-3 gap-1" aria-label="Movement pad">
              {(
                [
                  ["up", "▲", "col-start-2 row-start-1"],
                  ["left", "◀", "col-start-1 row-start-2"],
                  ["right", "▶", "col-start-3 row-start-2"],
                  ["down", "▼", "col-start-2 row-start-3"],
                ] as const
              ).map(([dir, label, pos]) => (
                <button
                  key={dir}
                  className={`pad-btn h-14 w-14 rounded-[4px] ${pos}`}
                  data-down={down === dir}
                  aria-label={`Walk ${dir}`}
                  onPointerDown={press(dir)}
                  onPointerUp={release}
                  onPointerCancel={release}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="pointer-events-auto flex items-end gap-2">
              {fighting && (
                <div className="flex flex-col gap-2">
                  <button
                    className="pad-btn h-11 w-14 rounded-[4px] text-[16px]"
                    aria-label="Eat"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      eatSomething();
                    }}
                  >
                    eat
                  </button>
                  <button
                    className="pad-btn h-16 w-16 rounded-full text-[24px]"
                    aria-label="B: dodge"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      dodge();
                    }}
                  >
                    B
                  </button>
                </div>
              )}
              <button
                className="pad-btn h-20 w-20 rounded-full text-[28px]"
                aria-label={fighting ? "A: swing" : prompt && !prompt.startsWith("@") ? `Use: ${prompt}` : "Use"}
                onPointerDown={(e) => {
                  e.preventDefault();
                  tryInteract();
                }}
              >
                A
              </button>
            </div>
          </div>
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

        {ko > 0 && (
          <div className="game-fade absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/90 font-lcd text-[24px]" role="alertdialog" aria-label="Knocked out" data-testid="game-ko">
            {ko === 2 && (
              <>
                <p className="text-[34px] text-[#ff7a6a]">Knocked out.</p>
                <p className="max-w-[420px] px-6 text-center text-[20px] text-[#b9b09e]">The ground comes up fast. Somebody’s going through your pockets. Then nothing.</p>
                <button className="rounded-[2px] border border-[#4a4540] bg-[#1d1b19] px-4 py-1.5 text-[22px] hover:border-amber" onClick={wake} autoFocus data-testid="game-wake">
                  Wake up
                </button>
              </>
            )}
          </div>
        )}

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
