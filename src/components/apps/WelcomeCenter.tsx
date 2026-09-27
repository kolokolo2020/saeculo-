"use client";

import { useState } from "react";
import { TRACKS } from "@/data/tracks";
import { PROFILE } from "@/data/profile";
import { useWindowStore } from "@/components/window-manager/windowStore";
import { usePlayerStore } from "@/components/player/playerStore";
import { paletteFor } from "@/components/player/analysis";
import AppIcon from "@/components/ui/AppIcon";
import StartMark from "@/components/ui/StartMark";
import type { WindowKind } from "@/lib/types";

export const WELCOME_KEY = "saeculo-welcome";

const TASKS: { kind: WindowKind; title: string; text: string }[] = [
  { kind: "player", title: "Listen to the beats", text: "Every track, with visualizers made from its cover." },
  { kind: "beatdeck", title: "Play Beat Deck", text: "A card game where every hand is a beat. Beat the bosses." },
  { kind: "beatmaker", title: "Make a beat", text: "An 8-lane groovebox with chords. Share the loop with a link." },
  { kind: "release", title: "Next single", text: "The countdown to what's coming." },
  { kind: "about", title: "About saeculo", text: "Who's behind the beats." },
  { kind: "contact", title: "Booking & collabs", text: "Send a message straight to saeculo." },
];

// Vista's Welcome Center, for this desktop: who this is, the latest
// tracks one click from playing, where to start, and where to follow.
// Opens after boot until "Show at startup" is unticked.
export default function WelcomeCenter() {
  const openWindow = useWindowStore((s) => s.openWindow);
  const [showAtStartup, setShowAtStartup] = useState(() => {
    try {
      return localStorage.getItem(WELCOME_KEY) !== "off";
    } catch {
      return true;
    }
  });

  const playTrack = (i: number) => {
    usePlayerStore.getState().selectTrack(i);
    openWindow("player");
  };

  return (
    <div className="flex h-full flex-col text-ink">
      <div className="dark-scroll min-h-0 flex-1 overflow-y-auto">
        {/* header: the user tile and the pitch */}
        <div className="flex items-center gap-4 border-b border-[#c9d3df] bg-gradient-to-b from-[#eef5fd] to-[#d9e8f8] px-5 py-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[6px] border border-white/70 bg-gradient-to-br from-[#4fb0ff] via-[#1f6fd1] to-[#0b2a5b] shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
            <StartMark size={34} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[20px] font-light text-[#1e3287]">Welcome to {PROFILE.artistName}</h3>
            <p className="text-[12.5px] text-[#3b4a5c]">
              {PROFILE.tagline}. Everything here is live: the beats, a card game built out of them, and a groovebox to make your own. Some things are hidden.
            </p>
          </div>
        </div>

        {/* the tracks, one click from playing */}
        <div className="px-5 pt-4">
          <p className="text-[12px] font-semibold text-[#1e3287]">Latest tracks</p>
          <div className="mt-2 grid grid-cols-3 gap-3">
            {TRACKS.map((t, i) => (
              <button
                key={t.id}
                onClick={() => playTrack(i)}
                aria-label={`Play ${t.title}`}
                className="group flex flex-col gap-1 rounded-[5px] border border-transparent p-1.5 text-left hover:border-[#aecff7] hover:bg-gradient-to-b hover:from-[#f2f8ff] hover:to-[#dcebfc]"
              >
                <span className="relative block overflow-hidden rounded-[3px] shadow-[0_3px_8px_rgba(0,0,0,0.3)]">
                  {t.cover && (
                    // eslint-disable-next-line @next/next/no-img-element -- local cover
                    <img src={t.cover} alt="" loading="lazy" className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105 sm:aspect-[16/10]" />
                  )}
                  <span className="absolute inset-0 grid place-items-center bg-black/0 transition-colors group-hover:bg-black/30">
                    <span className="aero-orb grid h-10 w-10 place-items-center text-white opacity-0 transition-opacity group-hover:opacity-100" aria-hidden>
                      ▶
                    </span>
                  </span>
                  <span className="absolute inset-x-0 bottom-0 h-1" style={{ background: paletteFor(t.id).accent }} />
                </span>
                <span className="truncate text-[12.5px] font-semibold">{t.title}</span>
                <span className="text-[11px] text-mute">
                  {t.mood} · {t.bpm} bpm
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* where to start */}
        <div className="px-5 pt-3 pb-4">
          <p className="text-[12px] font-semibold text-[#1e3287]">Get started</p>
          <ul className="mt-1.5 grid gap-1 sm:grid-cols-2">
            {TASKS.map((task) => (
              <li key={task.kind}>
                <button
                  onClick={() => openWindow(task.kind)}
                  className="flex w-full items-start gap-2.5 rounded-[4px] border border-transparent p-2 text-left hover:border-[#aecff7] hover:bg-gradient-to-b hover:from-[#f2f8ff] hover:to-[#dcebfc]"
                >
                  <AppIcon kind={task.kind} size={32} />
                  <span className="min-w-0">
                    <span className="block text-[13px] text-[#0645ad]">{task.title}</span>
                    <span className="block text-[11.5px] leading-snug text-mute">{task.text}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
            <span className="text-mute">Follow:</span>
            {PROFILE.socials.map((s) => (
              <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" className="text-[#0645ad] hover:underline">
                {s.label}
              </a>
            ))}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[#d4dbe4] bg-[#f1f5fa] px-4 py-2">
        <label className="flex items-center gap-2 text-[12px]">
          <input
            type="checkbox"
            checked={showAtStartup}
            onChange={(e) => {
              setShowAtStartup(e.target.checked);
              try {
                localStorage.setItem(WELCOME_KEY, e.target.checked ? "on" : "off");
              } catch {
                // not remembered
              }
            }}
            className="h-3.5 w-3.5 accent-[#1f6fd1]"
          />
          Show at startup
        </label>
        <button onClick={() => useWindowStore.getState().closeWindow("welcome")} className="aero-btn px-5 py-1 text-[12px]">
          Close
        </button>
      </div>
    </div>
  );
}
