"use client";

import { useEffect, useRef } from "react";
import { usePlayerStore, useCurrentTrack } from "@/components/player/playerStore";
import Visualizer from "@/components/player/Visualizer";
import { paletteFor } from "@/components/player/analysis";
import { useWindowStore } from "@/components/window-manager/windowStore";
import Glyph from "@/components/ui/Glyph";
import { useNow } from "@/hooks/useNow";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { PROFILE } from "@/data/profile";
import { formatLeft, releaseProgress } from "@/lib/release";
import { readWaveform } from "@/components/player/spectrum";

// Trig results can differ in the last float digit between the server's
// and the browser's JS engines, which breaks hydration — round them.
const r2 = (n: number) => Math.round(n * 100) / 100;

function ClockGadget() {
  const now = useNow();
  const d = new Date(now || 0);
  const sec = d.getSeconds();
  const min = d.getMinutes() + sec / 60;
  const hr = (d.getHours() % 12) + min / 60;
  return (
    <div className="flex flex-col items-center" role="group" aria-label="Clock gadget">
      <svg width="128" height="128" viewBox="0 0 128 128" aria-hidden className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)]">
        <defs>
          <radialGradient id="clock-face" cx="0.5" cy="0.35" r="0.7">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.75" stopColor="#e3ecf6" />
            <stop offset="1" stopColor="#b9c9dc" />
          </radialGradient>
          <linearGradient id="clock-ring" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dbe9f8" />
            <stop offset="0.5" stopColor="#7d97b6" />
            <stop offset="1" stopColor="#2b3c52" />
          </linearGradient>
        </defs>
        <circle cx="64" cy="64" r="61" fill="url(#clock-ring)" />
        <circle cx="64" cy="64" r="55" fill="url(#clock-face)" stroke="#6b829e" strokeWidth="0.8" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          const inner = i % 3 === 0 ? 43 : 47;
          return (
            <line
              key={i}
              x1={r2(64 + Math.sin(a) * inner)}
              y1={r2(64 - Math.cos(a) * inner)}
              x2={r2(64 + Math.sin(a) * 51)}
              y2={r2(64 - Math.cos(a) * 51)}
              stroke="#2b3c52"
              strokeWidth={i % 3 === 0 ? 3 : 1.5}
              strokeLinecap="round"
            />
          );
        })}
        <text x="64" y="86" textAnchor="middle" fontSize="8" fill="#6b829e" fontFamily="sans-serif">
          saeculo
        </text>
        {now > 0 && (
          <>
            <line x1="64" y1="64" x2="64" y2="36" stroke="#1b2533" strokeWidth="4" strokeLinecap="round" transform={`rotate(${hr * 30} 64 64)`} />
            <line x1="64" y1="64" x2="64" y2="24" stroke="#1b2533" strokeWidth="2.6" strokeLinecap="round" transform={`rotate(${min * 6} 64 64)`} />
            <line x1="64" y1="72" x2="64" y2="20" stroke="#d9412f" strokeWidth="1.2" strokeLinecap="round" transform={`rotate(${sec * 6} 64 64)`} />
          </>
        )}
        <circle cx="64" cy="64" r="3.5" fill="#d9412f" />
        <ellipse cx="54" cy="36" rx="34" ry="16" fill="#fff" opacity="0.35" />
      </svg>
      <p className="icon-label mt-1 text-[11px]" suppressHydrationWarning>
        {now ? d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) : " "}
      </p>
    </div>
  );
}

function NowPlayingGadget() {
  const track = useCurrentTrack();
  const playing = usePlayerStore((s) => s.playing);
  const { toggle, next, prev } = usePlayerStore.getState();
  const openWindow = useWindowStore((s) => s.openWindow);
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className="aero-gadget overflow-hidden p-2" role="group" aria-label="Now Playing gadget">
      <div className="overflow-hidden rounded-[4px] border border-black/60 bg-[#03070f]">
        <Visualizer mode="bars" playing={playing} reducedMotion={reducedMotion} className="h-12" palette={paletteFor(track.id)} />
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        {track.cover && (
          // eslint-disable-next-line @next/next/no-img-element -- tiny local thumbnail
          <img src={track.cover} loading="lazy" alt="" width={30} height={30} className="h-[30px] w-[30px] shrink-0 rounded-[2px] border border-white/25" />
        )}
        <div className="min-w-0 flex-1">
          <button
            onClick={() => openWindow("player")}
            className="block w-full truncate text-left text-[12px] font-semibold text-white hover:underline"
            title="Open Media Player"
          >
            {track.title}
          </button>
          <p className="truncate text-[10.5px] text-white/70">{track.mood}</p>
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-center gap-1.5">
        <button onClick={prev} aria-label="Gadget previous track" className="aero-btn-dark grid h-6 w-7 place-items-center">
          <Glyph name="prev" size={11} />
        </button>
        <button
          onClick={toggle}
          aria-label={playing ? "Gadget pause" : "Gadget play"}
          className="aero-orb grid h-8 w-8 place-items-center text-white"
        >
          <Glyph name={playing ? "pause" : "play"} size={13} />
        </button>
        <button onClick={next} aria-label="Gadget next track" className="aero-btn-dark grid h-6 w-7 place-items-center">
          <Glyph name="next" size={11} />
        </button>
      </div>
    </div>
  );
}

// The next drop, as a download that is taking its time.
export function ReleaseGadget() {
  const now = useNow();
  const openWindow = useWindowStore((s) => s.openWindow);
  const progress = now ? releaseProgress(now) : null;
  if (!PROFILE.nextRelease) return null;
  return (
    <button
      onClick={() => openWindow("release")}
      aria-label="Release countdown gadget"
      className="aero-gadget block w-full p-2 text-left"
    >
      <p className="truncate text-[11.5px] font-semibold text-white">next_single.exe</p>
      <div className="aero-progress mt-1.5 h-2.5">
        <div className="aero-progress-fill" style={{ width: `${Math.floor((progress?.fraction ?? 0) * 100)}%` }} />
      </div>
      <p className="mt-1 font-mono text-[10.5px] text-white/75">
        {!progress ? "calculating…" : progress.done ? "download complete" : `${formatLeft(progress)} left`}
      </p>
    </button>
  );
}

// Two dials in the style of the classic CPU/RAM meter gadget: live output
// level (RMS off the analyser) and the current track's tempo.
function MeterGadget() {
  const track = useCurrentTrack();
  const needleRef = useRef<SVGLineElement>(null);
  const readoutRef = useRef<SVGTextElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const buf = new Uint8Array(512);
    let level = 0;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      let target = 0;
      if (readWaveform(buf)) {
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        target = Math.min(1, Math.sqrt(sum / buf.length) * 3.2);
      }
      level += (target - level) * 0.18;
      needleRef.current?.setAttribute("transform", `rotate(${-120 + level * 240} 50 52)`);
      if (readoutRef.current) readoutRef.current.textContent = `${Math.round(level * 100)}%`;
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

  const bpmAngle = -120 + Math.min(1, Math.max(0, (track.bpm - 60) / 120)) * 240;

  return (
    <div className="aero-gadget flex items-end justify-center gap-1 px-1 py-2" role="group" aria-label="Meter gadget">
      <svg width="96" height="84" viewBox="0 0 100 88" aria-hidden>
        <circle cx="50" cy="52" r="40" fill="#0d1117" stroke="#8fa4bd" strokeWidth="3" />
        <path d="M20 72 A40 40 0 1 1 80 72" fill="none" stroke="#1f6fd1" strokeWidth="4" opacity="0.5" />
        {Array.from({ length: 9 }, (_, i) => {
          const a = ((-120 + i * 30) * Math.PI) / 180;
          return (
            <line
              key={i}
              x1={r2(50 + Math.sin(a) * 30)}
              y1={r2(52 - Math.cos(a) * 30)}
              x2={r2(50 + Math.sin(a) * 36)}
              y2={r2(52 - Math.cos(a) * 36)}
              stroke={i > 6 ? "#d9412f" : "#cfe3f7"}
              strokeWidth="2"
            />
          );
        })}
        <line ref={needleRef} x1="50" y1="52" x2="50" y2="20" stroke="#ff5c3c" strokeWidth="2.4" strokeLinecap="round" transform="rotate(-120 50 52)" />
        <circle cx="50" cy="52" r="4" fill="#cfe3f7" />
        <text ref={readoutRef} x="50" y="76" textAnchor="middle" fontSize="11" fill="#9fe0ff" fontFamily="monospace">
          0%
        </text>
        <text x="50" y="87" textAnchor="middle" fontSize="8" fill="#fff" opacity="0.8">
          LEVEL
        </text>
      </svg>
      <svg width="56" height="60" viewBox="0 0 60 64" aria-hidden className="mb-1">
        <circle cx="30" cy="32" r="24" fill="#0d1117" stroke="#8fa4bd" strokeWidth="2.5" />
        <line x1="30" y1="32" x2="30" y2="14" stroke="#5fd35f" strokeWidth="2" strokeLinecap="round" transform={`rotate(${bpmAngle} 30 32)`} />
        <circle cx="30" cy="32" r="3" fill="#cfe3f7" />
        <text x="30" y="48" textAnchor="middle" fontSize="9" fill="#b8f0a7" fontFamily="monospace">
          {track.bpm}
        </text>
        <text x="30" y="63" textAnchor="middle" fontSize="7" fill="#fff" opacity="0.8">
          BPM
        </text>
      </svg>
    </div>
  );
}

// The translucent gadget column down the right edge of the desktop.
export default function Sidebar() {
  return (
    <aside
      aria-label="Sidebar"
      className="absolute top-0 right-0 bottom-10 z-[5] hidden w-[180px] flex-col gap-4 border-l border-white/10 bg-gradient-to-r from-transparent to-[rgba(4,16,36,0.45)] px-3 pt-4 lg:flex"
    >
      <ClockGadget />
      <ReleaseGadget />
      <NowPlayingGadget />
      <MeterGadget />
    </aside>
  );
}
