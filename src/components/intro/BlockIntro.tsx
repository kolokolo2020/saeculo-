"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { setMuffle, usePlayerStore } from "@/components/player/playerStore";
import { useSiteStore } from "@/components/site/siteStore";
import { createScene, PRESS, READY_AT, T, ZOOM } from "./block";
import { hush, keyClick } from "./city";
import s from "./block.module.css";

// The way in, once. It plays by itself: the block at night, in the game's
// pixels; the camera goes down your building to the one lit window and in
// through the glass, and stays there, in the room: someone in the desk
// chair beside the laptop, hood up, lights a joint and smokes it, slowly,
// over and over. Then the visitor is asked for a key. When they press one,
// whoever's in the chair stops, leans over and presses the laptop's space
// bar: the beat starts (from the laptop), "saeculo" comes up on the screen,
// and the camera goes into the screen, which opens onto the site. That key
// is also what lets sound start, so there's no sound before it. Skippable
// at any point (Skip or Esc; a click or key on the way in hurries it to the
// room); returning visitors don't see it (Site.tsx), and the clock menu
// replays it. With reduced motion or still visuals: one still picture of
// the room; a key puts "saeculo" on the screen, and then in.

type Phase = "sky" | "descend" | "window" | "room" | "press" | "screen" | "out";

const phaseAt = (t: number): Phase => (t < T.descend ? "sky" : t < T.window ? "descend" : t < T.room ? "window" : "room");

/** Hurrying along to the room: how much faster the clock runs. */
const HURRY = 4;
/** The still version: how long "saeculo" stays on the screen, and the fade. */
const STILL_MS = 1300;
const STILL_OUT_MS = 380;

/** The music, if it isn't on yet. */
function startMusic() {
  const p = usePlayerStore.getState();
  if (!p.playing) p.play();
}

export default function BlockIntro({ onDone, onReveal }: { onDone: () => void; onReveal?: () => void }) {
  const [reduced] = useState(() => useSiteStore.getState().calm || document.documentElement.dataset.calm === "true" || window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [touch] = useState(() => window.matchMedia("(hover: none)").matches);
  const [phase, setPhase] = useState<Phase>(() => (reduced ? "room" : "sky"));
  /** In the room and lit up: time to ask for a key. */
  const [ready, setReady] = useState(reduced);
  /** "saeculo" is on the laptop's screen. */
  const [named, setNamed] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  // the intro's own clock: ms, running at `rate` (faster while hurrying)
  const clock = useRef({ now: 0, rate: 1, until: 0, pressAt: -1 });
  const done = useRef(false);
  const phaseRef = useRef<Phase>(phase);
  const stillRef = useRef<((pressed: boolean) => void) | null>(null);
  const onDoneRef = useRef(onDone);
  const onRevealRef = useRef(onReveal);
  useEffect(() => {
    onDoneRef.current = onDone;
    onRevealRef.current = onReveal;
  }, [onDone, onReveal]);

  const finish = useCallback((fast = false) => {
    if (done.current) return;
    done.current = true;
    hush(fast ? 0.1 : 0.4);
    setMuffle(0, fast ? 0.2 : 0.6);
    onDoneRef.current();
  }, []);

  // music already playing (a replay): it goes quiet, behind the walls, till the key
  useEffect(() => {
    if (usePlayerStore.getState().playing) setMuffle(1, 0.6);
    return () => hush(0.1);
  }, []);

  const enterPhase = useCallback((next: Phase) => {
    if (phaseRef.current === next) return;
    phaseRef.current = next;
    setPhase(next);
  }, []);

  // ---------------------------------------------------------- the picture

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    if (reduced) {
      let pressed = false;
      const draw = () => {
        scene.resize();
        scene.still(pressed);
      };
      const scene = createScene(el, draw);
      stillRef.current = (p) => {
        pressed = p;
        scene.still(p);
      };
      draw();
      window.addEventListener("resize", draw);
      return () => {
        window.removeEventListener("resize", draw);
        stillRef.current = null;
        scene.destroy();
      };
    }
    const scene = createScene(el);
    const onResize = () => scene.resize();
    window.addEventListener("resize", onResize);

    const fired = new Set<string>();
    const once = (key: string, fn: () => void) => {
      if (fired.has(key)) return;
      fired.add(key);
      fn();
    };

    let raf = 0;
    let last = performance.now();
    const loop = (real: number) => {
      raf = requestAnimationFrame(loop);
      const c = clock.current;
      const dt = Math.min(100, real - last) * c.rate;
      last = real;
      c.now += dt;
      if (c.rate !== 1 && c.now >= c.until) {
        c.now = c.until;
        c.rate = 1;
      }
      const t = c.now;
      const press = c.pressAt < 0 ? null : t - c.pressAt;
      scene.frame(t, t, dt, press);
      if (done.current) return;

      if (press === null) {
        enterPhase(phaseAt(t));
        if (t - T.room >= READY_AT) once("ready", () => setReady(true));
        return;
      }
      enterPhase(press < ZOOM.start ? "press" : "screen");
      if (press >= PRESS.hit)
        once("hit", () => {
          // the space bar: the beat, from the laptop, and the name on its screen
          setMuffle(0.5, 0.05);
          startMusic();
          setNamed(true);
        });
      if (press >= ZOOM.start)
        once("zoom", () => {
          setMuffle(0, (ZOOM.end - ZOOM.start) / 1000);
          onRevealRef.current?.();
        });
      if (press >= ZOOM.end) finish();
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      scene.destroy();
    };
  }, [reduced, enterPhase, finish]);

  // ---------------------------------------------------------- the still version

  useEffect(() => {
    if (!reduced) return;
    let id: ReturnType<typeof setTimeout> | undefined;
    if (phase === "press") id = setTimeout(() => enterPhase("out"), STILL_MS);
    else if (phase === "out") id = setTimeout(() => finish(), STILL_OUT_MS);
    return () => clearTimeout(id);
  }, [reduced, phase, enterPhase, finish]);

  // ---------------------------------------------------------- input

  /** The key: they press the laptop's space bar. Also what lets sound start. */
  const press = () => {
    if (done.current || phaseRef.current !== "room") return;
    const p = usePlayerStore.getState();
    if (reduced) {
      setMuffle(0, 0);
      if (!p.playing) p.play();
      stillRef.current?.(true);
      setNamed(true);
      onRevealRef.current?.();
      enterPhase("press");
      return;
    }
    // Let the player start a moment from now without a gesture of its own
    // (Safari wants the first play() inside one): start it now, stop it at once.
    if (!p.playing && p.audio) {
      setMuffle(1, 0);
      p.play();
      usePlayerStore.getState().pause();
    }
    keyClick(PRESS.hit / 1000 - 0.02);
    const c = clock.current;
    c.rate = 1;
    c.pressAt = c.now;
    enterPhase("press");
  };

  /** A click or a key: on the way in, on to the room; in the room, the space bar. */
  const act = () => {
    const ph = phaseRef.current;
    if (ph === "room") return press();
    if (reduced || ph === "press" || ph === "screen" || ph === "out") return;
    const c = clock.current;
    if (c.rate !== 1) return;
    c.until = T.room;
    c.rate = HURRY;
  };

  const skip = () => {
    startMusic();
    finish(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
      // a focused button (Skip, the prompt) answers its own Enter and Space
      else if ((e.key === "Enter" || e.key === " ") && e.target instanceof Element && e.target.closest("button")) return;
      else if (e.key.length === 1 || e.key === "Enter") {
        // any key: letters, numbers, space, Enter (not Tab, arrows or modifiers)
        e.preventDefault();
        act();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div
      className={`${s.root} ${reduced ? s.still : ""}`}
      role="dialog"
      aria-label="Intro"
      data-phase={phase}
      data-ready={ready ? "true" : undefined}
      data-screen={named ? "saeculo" : undefined}
      onClick={act}
    >
      <canvas ref={canvasRef} className={s.layer} aria-hidden />
      <div className={`${s.layer} ${s.vignette}`} aria-hidden />
      {named && <p className="sr-only">saeculo</p>}

      <div className={s.prompt} inert={!(ready && phase === "room")}>
        <button
          className={s.enter}
          onClick={(e) => {
            e.stopPropagation();
            press();
          }}
        >
          {touch ? "tap to play" : "press any key"}
        </button>
      </div>

      <button
        className={s.skip}
        onClick={(e) => {
          e.stopPropagation();
          skip();
        }}
      >
        Skip · Esc
      </button>
    </div>
  );
}
