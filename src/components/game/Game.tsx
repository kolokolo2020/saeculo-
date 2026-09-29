"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePlayerStore } from "@/components/player/playerStore";
import { useSiteStore } from "@/components/site/siteStore";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { draw, VIEW_H, VIEW_W } from "./render";
import { loadSave, migrateOldTapes, writeSave, type SaveData } from "./save";
import { duck, setPlace, setRing, sfx, startGameAudio, stopGameAudio, type Place } from "./sfx";
import { Engine } from "./studio/engine";
import { PRESETS } from "./studio/presets";
import { loadStore } from "./studio/project";
import Studio from "./studio/Studio";
import { FINDABLE, playVoice, voiceById, VOICES } from "./studio/voices";
import { blocked, inside, SCENES, START, TILE, type Dir, type Door } from "./world";

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
const PLACE_NAMES: Record<Place, string> = { bedroom: "Your room", street: "Outside", store: "Corner store", studio: "Studio" };
const HINT_AT: Record<string, string> = { rain: "window", phone: "phone", bottle: "counter", lighter: "bench" };
/** How many saved projects there are (they show as tapes on the shelf). */
const savedProjects = () => loadStore().slots.filter(Boolean).length;

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
  // the save as of right now (state lags a render behind)
  const saveRef = useRef(save);
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
  });
  // the latest UI state, for the loop and key handlers
  const ui = useRef({ dialog, studio, help, phase });
  useLayoutEffect(() => {
    ui.current = { dialog, studio, help, phase };
  }, [dialog, studio, help, phase]);

  const updateSave = useCallback((fn: (s: SaveData) => SaveData) => {
    const next = fn(saveRef.current);
    saveRef.current = next;
    writeSave(next);
    setSaveState(next);
  }, []);

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
    engine.current?.dispose();
    stopTape();
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
  }, [onExit, reduced]);

  // ------------------------------------------------------------ arrival

  useEffect(() => {
    usePlayerStore.getState().hold("game");
    startGameAudio();
    setPlace("bedroom");
    const el = lid.current;
    const arrive = () => {
      setPhase("play");
      root.current?.focus();
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
      stopGameAudio();
      usePlayerStore.getState().release("game");
    };
  }, []);

  // ------------------------------------------------------------ the studio

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
          say(["Not yet. The night isn't over."]);
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
          if (!found.includes("phone")) {
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
          say(["“You again.”"], [
            { label: "A beer", run: bottle },
            { label: "Just water", run: bottle },
            { label: "Just looking", run: () => say(["The clerk turns the radio down a little and goes back to it."]) },
          ]);
          break;
        }
        case "sampler":
          openStudio();
          break;
        case "couch":
          say(["The cushion is still warm."]);
          break;
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
        return shelfRef.current ? (tape.current ? "next tape" : "play a tape") : "look at the shelf";
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
      case "couch":
        return "sit on the couch";
      default:
        return null;
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

  const tryInteract = useCallback(() => {
    const u = ui.current;
    if (u.phase !== "play" || u.studio) return;
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
      if (e.code === "KeyE" || e.code === "Space" || e.code === "Enter") {
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
      setScale(Math.max(1, k));
      setBelow(coarse && portrait);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // dev-only handle for the browser tests (scripts/verify.mjs)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as { __game?: unknown };
    w.__game = {
      state: () => ({ ...st.current, trans: !!st.current.trans }),
      teleport: (place: Place, x: number, y: number, dir: Dir = "up") => {
        const s = st.current;
        if (s.place === "bedroom" && place !== "bedroom") stopTape();
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
      studio: () => {
        const e = engine.current;
        return e ? { playing: e.playing, position: e.position(), project: e.project } : null;
      },
    };
    return () => {
      delete w.__game;
    };
  }, []);

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
      const frozen = u.phase !== "play" || !!u.dialog || u.studio || u.help || !!s.trans;

      // walking
      const held = keys.current;
      if (!frozen && held.length) {
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
          if (!blocked(scene, { x: nx - 4, y: s.y - 3, w: 8, h: 4 })) s.x = nx;
          const ny = s.y + vy * SPEED * dt;
          if (!blocked(scene, { x: s.x - 4, y: ny - 3, w: 8, h: 4 })) s.y = ny;
          s.walk += dt;
          s.stepAcc += dt;
          if (s.stepAcc > 0.3) {
            s.stepAcc = 0;
            sfx.step(scene.surface(""));
          }
        }
      } else s.walk = 0;

      // doors
      if (!s.trans && u.phase === "play") {
        const door = scene.doors.find((d) => inside(s.x, s.y - 1, d.zone));
        if (door) {
          s.trans = { door, t: 0, swapped: false };
          sfx.door();
        }
      }
      if (s.trans) {
        s.trans.t += dt;
        if (!s.trans.swapped && s.trans.t >= 0.22) {
          const { to, spawn } = s.trans.door;
          if (s.place === "bedroom") stopTape();
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
      s.target = hit && promptFor(hit.id) ? hit.id : null;
      const near = cur.doors.find((d) => Math.abs(s.x - (d.zone.x + d.zone.w / 2)) < d.zone.w / 2 + 14 && Math.abs(s.y - (d.zone.y + d.zone.h / 2)) < d.zone.h / 2 + 18);
      const p = frozen ? null : s.target ? promptFor(s.target) : near ? `@${near.label}` : null;
      if (p !== lastPrompt) {
        lastPrompt = p;
        setPrompt(p);
      }

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
      const ringing = !saveRef.current.found.includes("phone");
      setRing(s.place === "street" && ringing ? Math.max(0, 1 - Math.abs(s.x - 26.5 * TILE) / (16 * TILE)) : 0);

      draw(g, {
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
        hints: [
          ...FINDABLE.filter((id) => !saveRef.current.found.includes(id)).map((id) => HINT_AT[id]),
          ...(shelfRef.current ? [] : ["sampler"]),
        ],
        reduced,
      });
      if (s.trans) {
        const k = s.trans.t < 0.22 ? s.trans.t / 0.22 : 1 - (s.trans.t - 0.22) / 0.22;
        g.fillStyle = `rgba(0,0,0,${Math.max(0, Math.min(1, k)).toFixed(3)})`;
        g.fillRect(0, 0, VIEW_W, VIEW_H);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
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
      <div className="relative flex h-12 shrink-0 items-center gap-3 border-b border-[#1d1b19] px-3 font-lcd text-[20px] leading-none">
        <span data-testid="game-place">{PLACE_NAMES[place]}</span>
        <span className="text-[#8a8170]" aria-label={`${foundCount} of ${FINDABLE.length} sounds found`}>
          sounds {foundCount}/{FINDABLE.length}
        </span>
        {!studio && (
          <button
            className="ml-auto rounded-[3px] border border-[#3a3733] bg-[#171615] px-3 py-1.5 font-sans text-[13px] hover:border-[#6d6558]"
            onClick={goToStudio}
            data-testid="game-to-studio"
          >
            Go to the studio
          </button>
        )}
        <button
          className={`${studio ? "ml-auto" : ""} flex items-center gap-2 rounded-[3px] border border-[#3a3733] bg-[#171615] px-3 py-1.5 font-sans text-[13px] hover:border-[#6d6558]`}
          onClick={leave}
          data-testid="game-exit"
        >
          Back to the site <span className="text-[#948b7a]">Esc</span>
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-start overflow-hidden sm:justify-center">
        <canvas
          ref={canvas}
          width={VIEW_W}
          height={VIEW_H}
          className="pixel block"
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

        {help && phase === "play" && (
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
          <p className="pointer-events-none absolute top-3 left-1/2 z-20 -translate-x-1/2 rounded-[3px] bg-[#6e1f18] px-3 py-2 text-center font-lcd text-[19px] leading-tight shadow-lg" role="status" data-testid="game-toast">
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
            <button
              className="pad-btn pointer-events-auto h-20 w-20 rounded-full text-[28px]"
              aria-label={prompt && !prompt.startsWith("@") ? `Use: ${prompt}` : "Use"}
              onPointerDown={(e) => {
                e.preventDefault();
                tryInteract();
              }}
            >
              A
            </button>
          </div>
        )}

        {studio && studioEngine && (
          <Studio engine={studioEngine} found={save.found} fresh={save.unseen} onSeen={() => updateSave((s) => ({ ...s, unseen: [] }))} onClose={closeStudio} />
        )}
      </div>
      </div>

      {/* the laptop lid: comes down over the site on the way in, lifts on the way out */}
      <div ref={lid} className="pointer-events-none fixed inset-0 z-50 bg-black" style={{ clipPath: "inset(0 0 100% 0)" }} aria-hidden />
    </div>
  );
}
