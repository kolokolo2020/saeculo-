"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { setMuffle, usePlayerStore } from "@/components/player/playerStore";
import { useSiteStore } from "@/components/site/siteStore";
import { PROFILE } from "@/data/profile";
import { createScene, T } from "./scene";
import { burn, exhale, hush, lighter, type Handle } from "./sounds";
import s from "./intro.module.css";

// The way in, once: a dark room, the name, quietly. A click (the gesture
// that lets sound start) and a cigarette is smoked down to the filter in
// one long drag, the coal creeping, the ash dropping off; the breath goes
// out and the smoke blows in from the side, and the name shows through it,
// bright. Then the dark lifts and the beat comes up. Skippable at any point
// (Skip or Esc; a click or a key hurries it along); returning visitors
// don't see it (Site.tsx), and the clock menu replays it.

type Phase = "gate" | "burn" | "exhale" | "reveal" | "out";

/** Where each phase ends (ms after the click). */
const ENDS: [Exclude<Phase, "gate">, number][] = [
  ["burn", T.exhale],
  ["exhale", T.reveal],
  ["reveal", T.out],
  ["out", T.end],
];
const phaseAt = (t: number): Phase => ENDS.find(([, end]) => t < end)?.[0] ?? "out";

/** Hurrying along: how much faster the clock runs to the next phase. */
const HURRY = 4;
/** The still version: how long the name stays, and the fade. */
const STILL_MS = 1500;
const STILL_OUT_MS = 380;

/** The crackle's louder pops, in seconds into the drag. */
function makePops(dur: number) {
  const pops: number[] = [];
  for (let x = 0.25 + Math.random() * 0.2; x < dur - 0.15; x += 0.16 + Math.random() * 0.34) pops.push(x);
  return pops;
}

/** The music, held back until the end: started (muffled, from inside the smoke) if it isn't already. */
function startMusic() {
  const p = usePlayerStore.getState();
  if (!p.playing) {
    setMuffle(1, 0);
    p.play();
  }
}

export default function BootIntro({ onDone }: { onDone: () => void }) {
  const [reduced] = useState(() => useSiteStore.getState().calm || document.documentElement.dataset.calm === "true" || window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [touch] = useState(() => window.matchMedia("(hover: none)").matches);
  const [phase, setPhase] = useState<Phase>("gate");

  const backRef = useRef<HTMLCanvasElement>(null);
  const smokeRef = useRef<HTMLCanvasElement>(null);
  const fgRef = useRef<HTMLCanvasElement>(null);
  const nameRef = useRef<HTMLParagraphElement>(null);

  // the intro's own clock: ms, running at `rate` (faster while hurrying)
  const clock = useRef({ now: 0, startAt: -1, rate: 1, until: 0 });
  const startedReal = useRef(0);
  const done = useRef(false);
  const phaseRef = useRef<Phase>("gate");
  /** The burn's crackle, cut short if the visitor hurries it. */
  const burning = useRef<Handle | null>(null);
  /** The scene's setPops, for start() (set once the scene is made). */
  const sceneSetPops = useRef<((pops: number[]) => void) | null>(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const finish = useCallback((fast = false) => {
    if (done.current) return;
    done.current = true;
    hush(fast ? 0.1 : 0.4);
    setMuffle(0, fast ? 0.2 : 0.6);
    onDoneRef.current();
  }, []);

  // music already playing (a replay): it goes behind the wall for now
  useEffect(() => {
    if (usePlayerStore.getState().playing) setMuffle(1, 0.6);
    return () => hush(0.1);
  }, []);

  const enterPhase = useCallback((next: Phase) => {
    if (phaseRef.current === next) return;
    phaseRef.current = next;
    setPhase(next);
  }, []);

  // ---------------------------------------------------------- the full version

  useEffect(() => {
    if (reduced) return;
    const back = backRef.current;
    const smoke = smokeRef.current;
    const fg = fgRef.current;
    if (!back || !smoke || !fg) return;
    const scene = createScene({ back, fg, smoke });
    sceneSetPops.current = scene.setPops;
    let box: DOMRect | null = null;
    const measure = () => {
      const el = nameRef.current;
      if (!el) return;
      // its place without the drift it takes on the way out
      const r = el.getBoundingClientRect();
      box = r;
      scene.setName({ x: r.left, y: r.top, w: r.width, h: r.height });
    };
    const onResize = () => {
      scene.resize();
      measure();
    };
    measure();
    window.addEventListener("resize", onResize);
    void document.fonts?.ready.then(measure);

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
      const t = c.startAt < 0 ? -1 : c.now - c.startAt;
      const reach = scene.frame(t, c.now);
      if (t < 0 || done.current) return;

      enterPhase(phaseAt(t));
      if (t >= T.exhale)
        once("exhale", () => {
          burning.current?.stop(0.25);
          exhale(1.9);
        });
      // the name shows through the smoke as it passes over it
      const el = nameRef.current;
      if (el && box && t >= T.smoke - 100) {
        const edge = reach - box.left;
        el.style.setProperty("--edge", `${Math.round(edge)}px`);
        if (edge > box.width + 200) el.dataset.clear = "true";
      }
      if (t >= T.reveal - 400)
        once("music", () => {
          startMusic();
          // the beat comes up out of the smoke
          setMuffle(0.55, 2.4);
        });
      if (t >= T.reveal) once("name", () => el && (el.dataset.shown = "true"));
      if (t >= T.out) once("clear", () => setMuffle(0, 1.2));
      if (t >= T.end) finish();
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      scene.destroy();
      sceneSetPops.current = null;
    };
  }, [reduced, enterPhase, finish]);

  // ---------------------------------------------------------- the still version

  useEffect(() => {
    if (!reduced) return;
    let id: ReturnType<typeof setTimeout> | undefined;
    if (phase === "reveal") id = setTimeout(() => enterPhase("out"), STILL_MS);
    else if (phase === "out") id = setTimeout(() => finish(), STILL_OUT_MS);
    return () => clearTimeout(id);
  }, [reduced, phase, enterPhase, finish]);

  // ---------------------------------------------------------- input

  /** The click (or key) that lets sound start: the lighter, the drag. */
  const start = () => {
    if (phaseRef.current !== "gate" || done.current) return;
    const p = usePlayerStore.getState();
    if (reduced) {
      setMuffle(0, 0);
      if (!p.playing) p.play();
      enterPhase("reveal");
      return;
    }
    // Let the player start later without a click of its own (Safari wants
    // the first play() inside one): start it now and stop it at once.
    if (!p.playing && p.audio) {
      setMuffle(1, 0);
      p.play();
      usePlayerStore.getState().pause();
    }
    const dur = (T.burnt - T.drag) / 1000;
    const pops = makePops(dur);
    lighter(0);
    burning.current = burn(T.drag / 1000, dur, pops);
    const c = clock.current;
    c.startAt = c.now;
    startedReal.current = performance.now();
    enterPhase("burn");
    // the sparks fly with the pops
    sceneSetPops.current?.(pops.map((x) => T.drag + x * 1000));
  };

  /** A click or a key once it's going: on to the next phase, quickly. */
  const hurry = () => {
    const ph = phaseRef.current;
    if (ph === "gate") return start();
    if (reduced) {
      if (ph === "reveal") enterPhase("out");
      return;
    }
    const c = clock.current;
    // a double tap shouldn't skip the cigarette it just lit
    if (c.rate !== 1 || c.startAt < 0 || performance.now() - startedReal.current < 600) return;
    const t = c.now - c.startAt;
    const end = ENDS.find(([, e]) => t < e)?.[1];
    if (end === undefined) return;
    if (ph === "burn") burning.current?.stop(0.3);
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
    <div
      className={`${s.root} ${reduced ? s.still : ""}`}
      role="dialog"
      aria-label="Intro"
      data-phase={phase}
      onClick={hurry}
    >
      {!reduced && <canvas ref={backRef} className={s.layer} aria-hidden />}

      <div className={s.nameWrap}>
        <p ref={nameRef} className={s.name} aria-hidden={phase === "gate"} data-shown={reduced && (phase === "reveal" || phase === "out") ? "true" : undefined}>
          {PROFILE.artistName}
        </p>
      </div>

      {!reduced && (
        <>
          <canvas ref={smokeRef} className={s.layer} aria-hidden />
          <canvas ref={fgRef} className={s.layer} aria-hidden />
          <div className={`${s.layer} ${s.flicker}`} aria-hidden />
        </>
      )}
      <div className={`${s.layer} ${s.grain}`} aria-hidden />
      <div className={`${s.layer} ${s.vignette}`} aria-hidden />
      <div className={s.frame} aria-hidden>
        <i />
        <i />
        <i />
        <i />
      </div>

      <div className={s.gate} inert={phase !== "gate"}>
        <p className={s.quiet}>{PROFILE.artistName}</p>
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
