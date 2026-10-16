"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { setMuffle, usePlayerStore } from "@/components/player/playerStore";
import { useSiteStore } from "@/components/site/siteStore";
import { PROFILE } from "@/data/profile";
import { createScene, T } from "./block";
import { carBy, hush, night } from "./city";
import s from "./block.module.css";

// The way in, once: the block at night, in the game's pixels. The name over
// the sky, quietly, until a click (the gesture that lets sound start). Then
// the beat comes on, muffled, from somewhere in the building; the camera
// goes down your building past the dark windows to the one that's lit,
// in through the glass, and on into the laptop on the desk, whose screen is
// the site. Skippable at any point (Skip or Esc; a click or a key hurries
// it along); returning visitors don't see it (Site.tsx), and the clock menu
// replays it. With reduced motion or still visuals: one still picture of
// the lit window, then in.

type Phase = "gate" | "sky" | "descend" | "window" | "screen" | "out";

/** Where each phase ends (ms after the click). */
const ENDS: [Exclude<Phase, "gate" | "out">, number][] = [
  ["sky", T.descend],
  ["descend", T.window],
  ["window", T.screen],
  ["screen", T.end],
];
const phaseAt = (t: number): Phase => ENDS.find(([, end]) => t < end)?.[0] ?? "screen";

/** Hurrying along: how much faster the clock runs to the next phase. */
const HURRY = 4;
/** The still version: how long the picture stays, and the fade. */
const STILL_MS = 1500;
const STILL_OUT_MS = 380;
/** How far the music is behind the wall at each step (1 = far off). */
const MUFFLE: [number, number, number][] = [
  // [at ms, amount, over seconds]
  [T.descend, 0.82, 2.4],
  [T.window, 0.55, 1.8],
  [T.screen, 0.22, 1.2],
];

/** The music, if it isn't on yet (Skip): started clear. */
function startMusic() {
  const p = usePlayerStore.getState();
  if (!p.playing) p.play();
}

export default function BlockIntro({ onDone, onReveal }: { onDone: () => void; onReveal?: () => void }) {
  const [reduced] = useState(() => useSiteStore.getState().calm || document.documentElement.dataset.calm === "true" || window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [touch] = useState(() => window.matchMedia("(hover: none)").matches);
  const [phase, setPhase] = useState<Phase>("gate");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  // the intro's own clock: ms, running at `rate` (faster while hurrying)
  const clock = useRef({ now: 0, startAt: -1, rate: 1, until: 0 });
  const startedReal = useRef(0);
  const done = useRef(false);
  const phaseRef = useRef<Phase>("gate");
  const onDoneRef = useRef(onDone);
  const onRevealRef = useRef(onReveal);
  useEffect(() => {
    onDoneRef.current = onDone;
    onRevealRef.current = onReveal;
  }, [onDone, onReveal]);

  const finish = useCallback((fast = false) => {
    if (done.current) return;
    done.current = true;
    hush(fast ? 0.1 : 0.5);
    setMuffle(0, fast ? 0.2 : 0.6);
    onDoneRef.current();
  }, []);

  // music already playing (a replay): it goes far off, behind the walls
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
      const draw = () => {
        scene.resize();
        scene.still();
      };
      const scene = createScene(el, draw);
      draw();
      window.addEventListener("resize", draw);
      return () => {
        window.removeEventListener("resize", draw);
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
      const dt = Math.min(100, real - last);
      last = real;
      c.now += dt * c.rate;
      if (c.rate !== 1 && c.startAt >= 0 && c.now - c.startAt >= c.until) {
        c.now = c.startAt + c.until;
        c.rate = 1;
      }
      const t = c.startAt < 0 ? -1 : Math.min(T.end, c.now - c.startAt);
      scene.frame(t, c.now);
      if (t < 0 || done.current) return;

      enterPhase(phaseAt(t));
      for (const [at, amount, over] of MUFFLE) if (t >= at) once(`muffle${at}`, () => setMuffle(amount, over / c.rate));
      if (t >= T.screen) once("reveal", () => onRevealRef.current?.());
      if (t >= T.end) finish();
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
    if (phase === "window") id = setTimeout(() => enterPhase("out"), STILL_MS);
    else if (phase === "out") id = setTimeout(() => finish(), STILL_OUT_MS);
    return () => clearTimeout(id);
  }, [reduced, phase, enterPhase, finish]);

  // ---------------------------------------------------------- input

  /** The click (or key) that lets sound start: the beat, far off, and the city. */
  const start = () => {
    if (phaseRef.current !== "gate" || done.current) return;
    const p = usePlayerStore.getState();
    if (reduced) {
      setMuffle(0, 0);
      if (!p.playing) p.play();
      onRevealRef.current?.();
      enterPhase("window");
      return;
    }
    // play() inside the click itself, so every browser lets it start
    setMuffle(1, 0);
    if (!p.playing) p.play();
    night();
    carBy((2300 + 200) / 1000);
    const c = clock.current;
    c.startAt = c.now;
    startedReal.current = performance.now();
    enterPhase("sky");
  };

  /** A click or a key once it's going: on to the next phase, quickly. */
  const hurry = () => {
    const ph = phaseRef.current;
    if (ph === "gate") return start();
    if (reduced) {
      if (ph === "window") enterPhase("out");
      return;
    }
    const c = clock.current;
    // a double tap shouldn't skip the sky it just opened on
    if (c.rate !== 1 || c.startAt < 0 || performance.now() - startedReal.current < 600) return;
    const t = c.now - c.startAt;
    const end = ENDS.find(([, e]) => t < e)?.[1];
    if (end === undefined) return;
    c.until = end;
    c.rate = HURRY;
  };

  const skip = () => {
    if (phaseRef.current === "gate") setMuffle(0, 0);
    else startMusic();
    finish(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
      // a focused button (Skip, enter) answers its own Enter and Space
      else if ((e.key === "Enter" || e.key === " ") && e.target instanceof Element && e.target.closest("button")) return;
      else if (e.key.length === 1 || e.key === "Enter") {
        // any key: letters, numbers, space, Enter (not Tab, arrows or modifiers)
        e.preventDefault();
        hurry();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className={`${s.root} ${reduced ? s.still : ""}`} role="dialog" aria-label="Intro" data-phase={phase} onClick={hurry}>
      <canvas ref={canvasRef} className={s.layer} aria-hidden />
      <div className={`${s.layer} ${s.vignette}`} aria-hidden />

      <div className={s.gate} inert={phase !== "gate"}>
        <p className={s.name}>{PROFILE.artistName}</p>
        <button
          className={s.enter}
          onClick={(e) => {
            e.stopPropagation();
            start();
          }}
        >
          {touch ? "tap" : "click"} to enter
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
