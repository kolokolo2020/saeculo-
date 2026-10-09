"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePlayerStore, setMuffle } from "@/components/player/playerStore";
import { PROFILE } from "@/data/profile";
import { ALBUM, TRACKS } from "@/data/tracks";
import { seekTicks, startupChime, tapeIn } from "./sounds";

// The way in, once: an old machine starting up. The screen warms up on a
// BIOS check of the studio (sampler, drum machine, the crate of beats),
// waits for a key, then boots the way computers did in 2007: the loading
// bar, four streaks of light meeting in a spinning record with the
// startup chord, and the blue welcome screen, while the beat comes up
// from inside the machine. Skippable at any point (Skip or Esc); returning
// visitors don't see it (Site.tsx), and the clock menu replays it.

type Phase = "post" | "boot" | "orb" | "welcome" | "out";
const BOOT_MS = 2600;
const ORB_MS = 3600;
const WELCOME_MS = 3400;
const OUT_MS = 700;
/** When the streaks meet (and the chord lands), into the orb phase. */
const MEET_S = 1.05;

function stamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}/${p(d.getDate())}/${d.getFullYear()}`;
}

// ------------------------------------------------------------ the BIOS check

interface Line {
  label: string;
  value?: string;
  bright?: boolean;
  count?: number;
}

function postLines(): Line[] {
  const track = TRACKS[usePlayerStore.getState().trackIndex] ?? TRACKS[0];
  const n = TRACKS.length;
  return [
    { label: `${PROFILE.artistName.toUpperCase()} SOUND SYSTEMS  BIOS v6.08`, bright: true },
    { label: "(C) saeculo. All beats reserved." },
    { label: "" },
    { label: "Main processor", value: `808 groove engine @ ${track?.bpm ?? 90} BPM` },
    { label: "Memory test", value: "K OK", count: 65536 },
    { label: "Audio interface", value: "24-bit / 44.1 kHz" },
    { label: "Sampler", value: "16 pads  OK" },
    { label: "Drum machine", value: "OK" },
    { label: "Turntable", value: "33 1/3 RPM" },
    { label: "Tape deck", value: "OK" },
    { label: "Crate C:\\music\\beats", value: `${n} ${n === 1 ? "beat" : "beats"} found` },
  ];
}

function Counter({ to, run }: { to: number; run: boolean }) {
  const [n, setN] = useState(run ? 0 : to);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 650);
      setN(Math.round(to * p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, run]);
  return <>{n}</>;
}

function Cassette() {
  return (
    <svg viewBox="0 0 64 40" width="76" height="48" aria-hidden className="shrink-0">
      <rect x="1" y="1" width="62" height="38" rx="3" fill="none" stroke="#9fdc6a" strokeWidth="2" />
      <rect x="9" y="7" width="46" height="16" rx="2" fill="none" stroke="#9fdc6a" strokeWidth="1.5" />
      <circle cx="21" cy="15" r="4" fill="none" stroke="#9fdc6a" strokeWidth="1.5" className="boot-reel" />
      <circle cx="43" cy="15" r="4" fill="none" stroke="#9fdc6a" strokeWidth="1.5" className="boot-reel" />
      <path d="M14 39 L18 29 H46 L50 39" fill="none" stroke="#9fdc6a" strokeWidth="1.5" />
    </svg>
  );
}

function Post({ reduced, onEnter }: { reduced: boolean; onEnter: () => void }) {
  const [lines] = useState(postLines);
  const [shown, setShown] = useState(reduced ? lines.length : 0);
  const [date] = useState(stamp);
  useEffect(() => {
    if (shown >= lines.length) return;
    const id = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 500 : shown === 4 ? 720 : 130);
    return () => clearTimeout(id);
  }, [shown, lines.length]);
  const ready = shown >= lines.length;
  return (
    <div className="boot-post absolute inset-0 flex flex-col px-[6vw] py-[7vh] font-lcd text-[clamp(17px,2.1vw,25px)] leading-[1.25] text-[#c9c9c9]">
      <div className="flex items-start justify-between gap-6">
        <ul className="min-w-0 flex-1 space-y-[0.1em]" aria-label="System check">
          {lines.slice(0, shown).map((l, i) => (
            <li key={i} className={`flex min-h-[1.25em] items-baseline gap-2 ${l.bright ? "text-white" : ""}`}>
              <span className="shrink-0">{l.label}</span>
              {l.value !== undefined && (
                <>
                  <span className="min-w-4 flex-1 translate-y-[-0.3em] border-b-2 border-dotted border-[#5d5d5d]" aria-hidden />
                  <span className="shrink-0 text-[#e8e8e8]">
                    {l.count ? <Counter to={l.count} run={!reduced} /> : null}
                    {l.value}
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
        <div className="hidden flex-col items-center gap-1 text-[0.7em] text-[#9fdc6a] sm:flex">
          <Cassette />
          <span>SOUND ON</span>
        </div>
      </div>
      {ready && (
        <div className="mt-[4vh] flex flex-col items-start gap-3">
          <p className="text-white">
            Press any key to boot from tape<span className="boot-cursor">_</span>
          </p>
          <button onClick={onEnter} className="boot-enter border-2 border-[#c9c9c9] px-4 py-1 text-[0.9em] tracking-[0.2em] text-white uppercase hover:bg-white hover:text-black">
            ▸ enter
          </button>
        </div>
      )}
      <p className="mt-auto text-[0.75em] text-[#7d7d7d]">{date}-SCL-808-BEATS</p>
    </div>
  );
}

// ------------------------------------------------------------ the boot bar

function BootBar() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-end pb-[18vh]">
      <div className="boot-bar" aria-hidden>
        <div className="boot-bar-run">
          <i />
          <i />
          <i />
        </div>
      </div>
      <p className="mt-[12vh] font-vista text-[12px] tracking-wide text-[#8c8c8c]">© {PROFILE.artistName}</p>
    </div>
  );
}

// ------------------------------------------------------------ four lights, one record

const STREAKS = ["#ff6a2a", "#7ddc3a", "#2aa8ff", "#ffd23a"];

/** The four streaks spiralling in, the flash where they meet, the sparks after. */
function Streaks() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvas.current;
    const g = c?.getContext("2d");
    if (!c || !g) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      c.width = Math.round(window.innerWidth * dpr);
      c.height = Math.round(window.innerHeight * dpr);
    };
    resize();
    window.addEventListener("resize", resize);
    type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; r: number };
    const sparks: P[] = [];
    const trails: [number, number][][] = STREAKS.map(() => []);
    let burst = false;
    let raf = 0;
    const t0 = performance.now();
    let last = t0;
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const dot = (x: number, y: number, r: number, color: string, a: number) => {
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, color);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.globalAlpha = a;
      g.fillStyle = grad;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    };
    const frame = (now: number) => {
      const t = (now - t0) / 1000;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const w = c.width;
      const h = c.height;
      const cx = w / 2;
      const cy = h * 0.42;
      const R0 = Math.hypot(w, h) * 0.62;
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = 1;
      g.clearRect(0, 0, w, h);
      g.globalCompositeOperation = "lighter";
      if (t < MEET_S + 0.25) {
        const e = ease(Math.min(1, t / MEET_S));
        STREAKS.forEach((color, i) => {
          const a0 = -Math.PI * 0.75 + (i * Math.PI) / 2;
          const th = a0 + e * 2.4;
          const r = R0 * Math.pow(1 - e, 1.15);
          const x = cx + Math.cos(th) * r;
          const y = cy + Math.sin(th) * r * 0.62;
          const trail = trails[i];
          trail.push([x, y]);
          if (trail.length > 34) trail.shift();
          const fade = t > MEET_S ? Math.max(0, 1 - (t - MEET_S) / 0.25) : 1;
          g.strokeStyle = color;
          for (let k = 1; k < trail.length; k++) {
            const f = k / trail.length;
            g.beginPath();
            g.moveTo(trail[k - 1][0], trail[k - 1][1]);
            g.lineTo(trail[k][0], trail[k][1]);
            g.lineCap = "butt";
            g.globalAlpha = 0.08 * f * fade;
            g.lineWidth = (8 + 46 * f) * dpr;
            g.stroke();
            g.lineCap = "round";
            g.globalAlpha = 0.45 * f * fade;
            g.lineWidth = (1 + 5 * f) * dpr;
            g.stroke();
          }
          dot(x, y, 34 * dpr, color, 0.55 * fade);
          dot(x, y, 9 * dpr, "#ffffff", 0.9 * fade);
        });
      }
      if (t >= MEET_S && !burst) {
        burst = true;
        for (let i = 0; i < 90; i++) {
          const a = Math.random() * Math.PI * 2;
          const v = (60 + Math.random() * 320) * dpr;
          sparks.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7, life: 0, max: 1.2 + Math.random() * 1.8, color: STREAKS[i % 4], r: (2 + Math.random() * 4) * dpr });
        }
      }
      if (burst) {
        const k = t - MEET_S;
        if (k < 0.7) {
          // the flash ring
          g.globalAlpha = Math.max(0, 0.6 * (1 - k / 0.7));
          g.strokeStyle = "#cfefff";
          g.lineWidth = 3 * dpr;
          g.beginPath();
          g.ellipse(cx, cy, k * 520 * dpr, k * 360 * dpr, 0, 0, Math.PI * 2);
          g.stroke();
          dot(cx, cy, 220 * dpr * (1 - k / 0.7) + 40 * dpr, "#ffffff", 0.5 * (1 - k / 0.7));
        }
        for (let i = sparks.length - 1; i >= 0; i--) {
          const p = sparks[i];
          p.life += dt;
          if (p.life > p.max) {
            sparks.splice(i, 1);
            continue;
          }
          p.vx *= 1 - dt * 1.6;
          p.vy = p.vy * (1 - dt * 1.6) - 6 * dpr * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          dot(p.x, p.y, p.r * 3, p.color, 0.5 * Math.sin((p.life / p.max) * Math.PI));
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return <canvas ref={canvas} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function Orb({ lit }: { lit: boolean }) {
  return (
    <div className={`boot-orb-wrap absolute inset-x-0 top-[42%] flex -translate-y-1/2 flex-col items-center ${lit ? "boot-orb-lit" : ""}`}>
      <div className="relative">
        <div className="boot-orb">
          <div className="boot-orb-disc">
            <div className="boot-orb-label" />
          </div>
          <div className="boot-orb-gloss" />
        </div>
        <div className="boot-orb boot-orb-reflect" aria-hidden>
          <div className="boot-orb-disc">
            <div className="boot-orb-label" />
          </div>
        </div>
      </div>
      <p className="boot-word mt-[-28px] font-vista text-[clamp(34px,6vw,54px)] leading-none font-normal tracking-[0.12em] text-white">{PROFILE.artistName}</p>
      <p className="boot-word boot-word-2 mt-3 font-vista text-[12px] tracking-[0.38em] text-white/60 uppercase">{PROFILE.tagline}</p>
    </div>
  );
}

// ------------------------------------------------------------ welcome

function Aurora({ still }: { still: boolean }) {
  return (
    <div className={`boot-aurora absolute inset-0 overflow-hidden ${still ? "boot-still" : ""}`} aria-hidden>
      <svg className="boot-ribbons absolute inset-0 h-full w-full" viewBox="0 0 1600 900" preserveAspectRatio="none">
        <defs>
          <linearGradient id="bt-r1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8ff6ff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#bdf3ff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#7fd2ff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="bt-r2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#5af0c0" stopOpacity="0" />
            <stop offset="0.4" stopColor="#7ff0d8" stopOpacity="0.35" />
            <stop offset="1" stopColor="#9fb4ff" stopOpacity="0" />
          </linearGradient>
          <filter id="bt-soft">
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>
        <g className="boot-ribbon-a">
          <path d="M-100 560 C 300 380, 760 720, 1700 420" fill="none" stroke="url(#bt-r1)" strokeWidth="120" opacity="0.35" filter="url(#bt-soft)" />
          <path d="M-100 560 C 300 380, 760 720, 1700 420" fill="none" stroke="url(#bt-r1)" strokeWidth="2" />
          <path d="M-100 590 C 320 420, 780 760, 1700 460" fill="none" stroke="url(#bt-r1)" strokeWidth="1" opacity="0.6" />
        </g>
        <g className="boot-ribbon-b">
          <path d="M-100 700 C 420 560, 900 860, 1700 600" fill="none" stroke="url(#bt-r2)" strokeWidth="180" opacity="0.3" filter="url(#bt-soft)" />
          <path d="M-100 700 C 420 560, 900 860, 1700 600" fill="none" stroke="url(#bt-r2)" strokeWidth="1.5" />
        </g>
      </svg>
    </div>
  );
}

function Welcome() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pb-[6vh]">
      <div className="boot-tile">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ALBUM.cover} alt="" width={124} height={124} className="h-full w-full rounded-[5px] object-cover" />
      </div>
      <p className="mt-4 font-vista text-[26px] text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.6)]">{PROFILE.artistName}</p>
      <p className="mt-3 flex items-center gap-3 font-vista text-[20px] font-light text-white/90 [text-shadow:0_1px_6px_rgba(0,0,0,0.5)]">
        <span className="boot-busy" aria-hidden />
        Welcome
      </p>
      <div className="absolute inset-x-0 bottom-0 flex h-[72px] items-center justify-center bg-[linear-gradient(180deg,transparent,rgba(0,8,20,0.55))]">
        <p className="font-vista text-[15px] tracking-[0.08em] text-white/80">
          {PROFILE.artistName} <span className="text-white/45">{PROFILE.tagline}</span>
        </p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ the sequence

export default function BootIntro({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("post");
  const [reduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [glitch, setGlitch] = useState(0);
  const [orbLit, setOrbLit] = useState(false);
  const done = useRef(false);

  const finish = useCallback(
    (fast = false) => {
      if (done.current) return;
      done.current = true;
      setMuffle(0, fast ? 0.2 : 0.6);
      onDone();
    },
    [onDone],
  );

  const go = useCallback(
    (next: Phase) => {
      setPhase(next);
      if (!reduced) setGlitch((n) => n + 1);
      const track = TRACKS[usePlayerStore.getState().trackIndex];
      if (next === "boot") seekTicks(BOOT_MS / 1000 - 0.3);
      if (next === "orb") {
        startupChime(track?.key, MEET_S);
        setOrbLit(false);
      }
      // the beat comes up out of the machine
      if (next === "welcome") setMuffle(0, reduced ? 1 : 2.6);
    },
    [reduced],
  );

  // the click (or key) that lets sound start: a tape going in, the beat
  // starting muffled inside the machine
  const enter = () => {
    if (phase !== "post") return;
    tapeIn();
    usePlayerStore.getState().play();
    setMuffle(1, 0);
    go(reduced ? "welcome" : "boot");
  };

  // each phase moves on by itself
  useEffect(() => {
    let id: ReturnType<typeof setTimeout> | undefined;
    if (phase === "boot") id = setTimeout(() => go("orb"), BOOT_MS);
    else if (phase === "orb") {
      const lit = setTimeout(() => setOrbLit(true), reduced ? 0 : MEET_S * 1000);
      id = setTimeout(() => go("welcome"), ORB_MS);
      return () => {
        clearTimeout(lit);
        clearTimeout(id);
      };
    } else if (phase === "welcome") id = setTimeout(() => setPhase("out"), reduced ? 1600 : WELCOME_MS);
    else if (phase === "out") id = setTimeout(() => finish(), reduced ? 0 : OUT_MS);
    return () => clearTimeout(id);
  }, [phase, go, finish, reduced]);

  /** Clicking or pressing a key hurries it along, one step at a time. */
  const advance = () => {
    if (phase === "post") enter();
    else if (phase === "boot") go("orb");
    else if (phase === "orb") go("welcome");
    else if (phase === "welcome") setPhase("out");
  };

  const skip = () => {
    if (phase === "post") setMuffle(0, 0);
    finish(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
      else if (e.key.length === 1 || e.key === "Enter") {
        // any key: letters, numbers, space, Enter (not Tab, arrows or modifiers)
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const blue = phase === "welcome" || phase === "out";

  return (
    <div
      className={`fixed inset-0 z-[10000] cursor-default overflow-clip select-none ${blue ? "bg-[#03213a]" : "bg-black"} ${phase === "out" ? "boot-out" : ""}`}
      role="dialog"
      aria-label="Intro"
      data-phase={phase}
      onClick={advance}
    >
      <div className={reduced ? "" : "boot-poweron absolute inset-0"}>
        {phase === "post" && <Post reduced={reduced} onEnter={enter} />}
        {phase === "boot" && <BootBar />}
        {phase === "orb" && (
          <>
            {!reduced && <Streaks />}
            <Orb lit={orbLit || reduced} />
          </>
        )}
        {blue && (
          <>
            <Aurora still={reduced} />
            <Welcome />
          </>
        )}
      </div>

      <div className="boot-crt pointer-events-none absolute inset-0" aria-hidden />
      {glitch > 0 && <div key={glitch} className="boot-glitch pointer-events-none absolute inset-0" aria-hidden />}

      <button
        onClick={(e) => {
          e.stopPropagation();
          skip();
        }}
        className="absolute top-4 right-5 z-10 px-2 py-1 font-mono text-[12px] tracking-widest text-white/60 uppercase hover:text-white"
      >
        Skip · Esc
      </button>
    </div>
  );
}
