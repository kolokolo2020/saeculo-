"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePlayerStore, setMuffle } from "@/components/player/playerStore";
import { beatInfo } from "@/components/player/spectrum";
import { startAmbience, stopAmbience } from "@/lib/ambience";
import { PROFILE } from "@/data/profile";
import { BeatsIcon } from "@/components/site/Icons";
import { ArtistArt, ArtistHead, BackArt, CatHead, CatTail, DeskArt, EMBER, H, LavaBlobs, SCREEN, W } from "./art";

// The way in, once: a title card, then the room (night, rain, someone at a
// laptop, the cat on the desk). The camera moves over his shoulder into the
// laptop screen and the desktop takes over. The song you hear muffled
// through his headphones opens up as you go in and keeps playing. Skippable
// at any point; returning visitors don't see it (Site.tsx), and the clock
// menu in the taskbar replays it.

type Phase = "title" | "room" | "push";
const PUSH_MS = 3200;
const S = { x: SCREEN.x + SCREEN.w / 2, y: SCREEN.y + SCREEN.h / 2 };
/** What must stay in frame on narrow screens: his head, the laptop, the cat. */
const FOCUS_X = 930;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function stamp() {
  const d = new Date();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const date = d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }).toUpperCase();
  return { time, date };
}

/** Smoke from the ember: soft particles rising and curling, on a small canvas. */
function useSmoke(canvas: React.RefObject<HTMLCanvasElement | null>, active: boolean, puff: React.RefObject<number>) {
  useEffect(() => {
    const c = canvas.current;
    const g = c?.getContext("2d");
    if (!c || !g || !active) return;
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 64;
    const sg = sprite.getContext("2d")!;
    const grad = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(200,215,230,0.55)");
    grad.addColorStop(1, "rgba(200,215,230,0)");
    sg.fillStyle = grad;
    sg.fillRect(0, 0, 64, 64);
    type P = { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; seed: number };
    const ps: P[] = [];
    // ember in canvas coordinates (the canvas sits at 640, 120)
    const ex = EMBER.x - 640;
    const ey = EMBER.y - 120;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      acc += dt * 14;
      while (acc > 1) {
        acc -= 1;
        ps.push({ x: ex, y: ey, vx: (Math.random() - 0.5) * 6, vy: -18 - Math.random() * 10, r: 3, life: 0, max: 5 + Math.random() * 3, seed: Math.random() * 10 });
      }
      if (puff.current > 0) {
        for (let i = 0; i < 26; i++) {
          ps.push({ x: 120 + Math.random() * 30, y: 380 + Math.random() * 20, vx: 20 + Math.random() * 30, vy: -14 - Math.random() * 16, r: 10, life: 0, max: 4 + Math.random() * 3, seed: Math.random() * 10 });
        }
        puff.current = 0;
      }
      g.clearRect(0, 0, c.width, c.height);
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.life += dt;
        if (p.life > p.max) {
          ps.splice(i, 1);
          continue;
        }
        p.vx += Math.sin(now / 900 + p.seed + p.life * 1.3) * 10 * dt;
        p.vy -= 2 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.r += 9 * dt;
        const a = Math.sin((p.life / p.max) * Math.PI) * 0.5;
        g.globalAlpha = a;
        g.drawImage(sprite, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      }
      g.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [canvas, active, puff]);
}

export default function RoomIntro({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("title");
  const [fit, setFit] = useState({ k: 1, ox: 0, oy: 0, vw: 1, vh: 1 });
  const [catLooking, setCatLooking] = useState(false);
  const [inhale, setInhale] = useState(false);
  const [sweep, setSweep] = useState(0);
  const [{ time, date }] = useState(stamp);
  const reduced = useRef(false);
  const back = useRef<HTMLDivElement>(null);
  const desk = useRef<HTMLDivElement>(null);
  const artist = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const bootOverlay = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const playhead = useRef<HTMLDivElement>(null);
  const smoke = useRef<HTMLCanvasElement>(null);
  const puff = useRef(0);
  const mouse = useRef({ x: 0, y: 0 });
  const done = useRef(false);

  // cover the viewport with the artboard, keeping the laptop in frame
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const measure = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const k = Math.max(vw / W, vh / H);
      const ox = clamp(vw / 2 - FOCUS_X * k, vw - W * k, 0);
      const oy = clamp(vh / 2 - (H / 2) * k, vh - H * k, 0);
      setFit({ k, ox, oy, vw, vh });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // idle life: the cat turns to look at you, he draws on the joint, headlights sweep the wall
  useEffect(() => {
    if (phase === "title") return;
    const look = setInterval(() => {
      setCatLooking(true);
      setTimeout(() => setCatLooking(false), 2200);
    }, 9000);
    const drag = setInterval(() => {
      setInhale(true);
      setTimeout(() => {
        setInhale(false);
        puff.current = 1;
      }, 1400);
    }, 6500);
    const car = setInterval(() => setSweep((n) => n + 1), 11000);
    return () => {
      clearInterval(look);
      clearInterval(drag);
      clearInterval(car);
    };
  }, [phase]);

  useSmoke(smoke, phase !== "title", puff);

  // head nod, playhead, parallax: one loop, straight to the DOM
  useEffect(() => {
    if (phase === "title") return;
    let raf = 0;
    const tick = () => {
      const b = beatInfo();
      const pulse = b?.pulse ?? 0;
      if (head.current) head.current.style.transform = `rotate(${(-2 + pulse * 5).toFixed(2)}deg) translateY(${(pulse * 3).toFixed(1)}px)`;
      if (playhead.current) {
        const bar = b ? ((b.beat % 16) + b.phase) / 16 : (performance.now() / 8000) % 1;
        playhead.current.style.transform = `translateX(${(bar * (SCREEN.w - 44)).toFixed(1)}px)`;
      }
      if (phase === "room" && !reduced.current) {
        const { x, y } = mouse.current;
        if (back.current) back.current.style.transform = `translate(${x * -6}px, ${y * -4}px)`;
        if (artist.current) artist.current.style.transform = `translate(${x * 14}px, ${y * 8}px)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    stopAmbience(1.2);
    setMuffle(0, 0.2);
    onDone();
  }, [onDone]);

  const push = useCallback(() => {
    if (phase !== "room") return;
    setPhase("push");
    if (reduced.current) {
      finish();
      return;
    }
    const { k, ox, oy, vw, vh } = fit;
    // the screen, in artboard units, must fill the viewport
    const Z = Math.max(vw / (SCREEN.w * k), vh / (SCREEN.h * k)) * 1.06;
    const tx = (vw / 2 - ox) / k - S.x;
    const ty = (vh / 2 - oy) / k - S.y;
    const t0 = performance.now();
    setMuffle(0, PUSH_MS / 1000);
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / PUSH_MS);
      const e = ease(p);
      const zoom = (z: number) => 1 + (z - 1) * Math.pow(e, 1.6);
      const set = (el: HTMLDivElement | null, z: number, extra = "") => {
        if (el) el.style.transform = `translate(${tx * e}px, ${ty * e}px) scale(${zoom(z)})${extra}`;
      };
      set(back.current, 1 + (Z - 1) * 0.55);
      set(desk.current, Z);
      set(artist.current, 1 + (Z - 1) * 1.9, ` translate(${-120 * e}px, ${160 * e}px)`);
      if (artist.current) artist.current.style.filter = `blur(${(e * 7).toFixed(1)}px)`;
      if (bootOverlay.current) bootOverlay.current.style.opacity = String(clamp((p - 0.45) / 0.3, 0, 1));
      if (flash.current) flash.current.style.opacity = String(clamp((p - 0.88) / 0.08, 0, 1) * (1 - clamp((p - 0.96) / 0.04, 0, 1)) * 0.5);
      if (p < 1) requestAnimationFrame(step);
      else finish();
    };
    requestAnimationFrame(step);
  }, [phase, fit, finish]);

  const enter = () => {
    if (phase !== "title") return;
    // the click that lets sound start: his music, muffled, and the rain
    const player = usePlayerStore.getState();
    player.play();
    setMuffle(1, 0);
    startAmbience(0.35, 2);
    setPhase("room");
  };

  // it moves on by itself after a short look around
  useEffect(() => {
    if (phase !== "room") return;
    const id = setTimeout(push, 7000);
    return () => clearTimeout(id);
  }, [phase, push]);

  const skip = () => {
    if (done.current) return;
    done.current = true;
    stopAmbience(0.5);
    setMuffle(0, 0.2);
    onDone();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
      else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (phase === "title") enter();
        else push();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const layerStyle = { transformOrigin: `${S.x}px ${S.y}px` };

  return (
    <div
      className="fixed inset-0 z-[10000] cursor-default overflow-clip bg-black select-none"
      role="dialog"
      aria-label="Intro"
      onClick={() => (phase === "title" ? enter() : push())}
      onPointerMove={(e) => {
        mouse.current = { x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 };
      }}
    >
      {/* the stage: artboard units, scaled to cover the screen */}
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ width: W, height: H, transform: `translate(${fit.ox}px, ${fit.oy}px) scale(${fit.k})` }}
        aria-hidden
      >
        <div ref={back} className="absolute inset-0 will-change-transform" style={layerStyle}>
          <BackArt />
          {/* rain on the glass, clouds past the moon, a car's headlights across the wall */}
          <div className="absolute overflow-hidden" style={{ left: 130, top: 100, width: 420, height: 420 }}>
            <div className="room-clouds absolute" />
            <div className="room-rain absolute inset-0" />
          </div>
          {sweep > 0 && <div key={sweep} className="room-headlights absolute" />}
        </div>

        <div ref={desk} className="absolute inset-0 will-change-transform" style={layerStyle}>
          <DeskArt />
          {/* what's on his screen: a beat in progress, then (as we go in) the boot screen */}
          <div className="room-screen absolute overflow-hidden" style={{ left: SCREEN.x, top: SCREEN.y, width: SCREEN.w, height: SCREEN.h }}>
            <div className="h-[14px] bg-[linear-gradient(90deg,#4a120d,#6e1f18_45%,#a4452f)]" />
            <div className="relative h-[181px] bg-[#0b1018] px-1.5 pt-1">
              {["#ffc07a", "#9fd3ff", "#b8f0a7", "#ffb3d6", "#d9c6ff", "#ffe7a3"].map((c, i) => (
                <div key={i} className="mb-[3px] flex h-[24px] items-center gap-[3px]">
                  <span className="w-[34px] shrink-0 truncate text-[6px] text-[#7f93ad]">{["KICK", "SNARE", "HATS", "808", "KEYS", "CHOP"][i]}</span>
                  {Array.from({ length: 8 }, (_, j) =>
                    (i * 3 + j * 5) % 7 < 5 ? (
                      <span key={j} className="h-[18px] flex-1 rounded-[2px]" style={{ background: `${c}${j % 2 ? "cc" : "99"}`, boxShadow: `0 0 6px ${c}55` }} />
                    ) : (
                      <span key={j} className="h-[18px] flex-1" />
                    ),
                  )}
                </div>
              ))}
              <div ref={playhead} className="absolute top-0 bottom-0 left-[42px] w-[2px] bg-white shadow-[0_0_8px_#fff]" />
            </div>
            <div ref={bootOverlay} className="absolute inset-0 bg-[#0c0d0d] opacity-0">
              <div className="absolute top-2 left-2 flex flex-col items-center gap-0.5 text-[6px] text-[#f1ece2]">
                <BeatsIcon size={18} />
                beats
              </div>
            </div>
          </div>
          <div className="room-screenglow pointer-events-none absolute inset-0" />
          <div className="absolute" style={{ left: 1100, top: 378 }}>
            <CatHead looking={catLooking} />
          </div>
          <div className="room-tail absolute" style={{ left: 1250, top: 620, transformOrigin: "38px 20px" }}>
            <CatTail />
          </div>
          <div className="absolute" style={{ left: 1460, top: 380 }}>
            <LavaBlobs />
          </div>
        </div>

        <div ref={artist} className="absolute inset-0 will-change-transform" style={layerStyle}>
          <ArtistArt />
          <div ref={head} className="absolute" style={{ left: 610, top: 470, transformOrigin: "90px 150px" }}>
            <ArtistHead />
          </div>
          <div className={`room-ember absolute ${inhale ? "room-ember-hot" : ""}`} style={{ left: EMBER.x - 12, top: EMBER.y - 12 }} />
          <canvas ref={smoke} width={540} height={480} className="absolute" style={{ left: 640, top: 120, width: 540, height: 480 }} />
        </div>
      </div>

      <div ref={flash} className="pointer-events-none absolute inset-0 bg-[#cfefff] opacity-0 mix-blend-screen" />

      {/* letterbox and a camcorder date stamp */}
      {phase !== "title" && (
        <>
          <div className={`room-bars ${phase === "push" ? "room-bars-open" : ""}`} aria-hidden />
          <p className="pointer-events-none absolute bottom-5 left-6 font-mono text-[13px] tracking-widest text-white/70 [text-shadow:0_0_6px_rgba(255,255,255,0.5)]" aria-hidden>
            {date} {time}
          </p>
          {phase === "room" && (
            <p className="room-hint pointer-events-none absolute inset-x-0 bottom-[12vh] text-center font-mono text-[12px] tracking-[0.3em] text-white/70 uppercase">
              click to go in
            </p>
          )}
        </>
      )}

      {phase === "title" && (
        <div className="room-titlecard absolute inset-0 grid place-items-center bg-black text-center">
          <div className="flex flex-col items-center gap-4 px-6">
            <h1 className="font-film text-[clamp(56px,10vw,120px)] leading-none text-[#e9e3d2] [text-shadow:0_0_24px_rgba(233,227,210,0.25)]">{PROFILE.artistName}</h1>
            <div className="mt-6 h-px w-40 bg-[#8a7d63]/50" />
            <button onClick={enter} className="room-hint mt-2 font-mono text-[14px] tracking-[0.3em] text-[#e9e3d2] uppercase">
              ▸ enter
            </button>
            <p className="font-mono text-[11px] text-[#8f846e]">sound on</p>
          </div>
        </div>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          skip();
        }}
        className="absolute top-4 right-5 z-10 px-2 py-1 font-mono text-[12px] tracking-widest text-white/60 uppercase hover:text-white"
      >
        Skip ›
      </button>
    </div>
  );
}
