"use client";

import { useEffect, useState } from "react";
import StartMark from "@/components/ui/StartMark";
import { PROFILE } from "@/data/profile";

const SESSION_KEY = "saeculo-booted";
const BOOT_MS = 2400;
const WELCOME_MS = 1300;

type Phase = "boot" | "welcome";

// Black screen with a glowing mark and the green sweeping loading bar,
// then the blue "Welcome" screen with the user tile and a spinner — the
// two beats every mid-2000s PC made you sit through. Plays once per tab
// session (or on Restart from the start menu), always skippable.
export default function BootScreen({ onDone, force }: { onDone: () => void; force: boolean }) {
  const [phase, setPhase] = useState<Phase>("boot");

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!force && (reducedMotion || sessionStorage.getItem(SESSION_KEY))) {
      sessionStorage.setItem(SESSION_KEY, "1");
      onDone();
      return;
    }
    const toWelcome = setTimeout(() => setPhase("welcome"), BOOT_MS);
    const finish = setTimeout(() => {
      sessionStorage.setItem(SESSION_KEY, "1");
      onDone();
    }, BOOT_MS + WELCOME_MS);
    return () => {
      clearTimeout(toWelcome);
      clearTimeout(finish);
    };
  }, [onDone, force]);

  const skip = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    onDone();
  };

  return (
    <button
      onClick={skip}
      aria-label="Skip boot sequence"
      className={`fixed inset-0 z-[9999] block w-full cursor-default text-left ${
        phase === "boot" ? "bg-black" : "aero-wallpaper"
      }`}
    >
      {phase === "boot" ? (
        <div className="flex h-full flex-col items-center justify-center gap-10">
          <div className="relative grid h-40 w-40 place-items-center">
            <div className="absolute inset-0 animate-pulse rounded-full bg-[radial-gradient(circle,rgba(80,170,255,0.55),rgba(30,90,200,0.15)_55%,transparent_70%)]" />
            <StartMark size={64} className="relative drop-shadow-[0_0_14px_rgba(120,200,255,0.9)]" />
          </div>
          <div className="relative h-[14px] w-[184px] overflow-hidden rounded-[4px] border border-[#555] bg-[#111] shadow-[inset_0_1px_3px_rgba(0,0,0,0.9)]">
            <div className="absolute top-[2px] flex gap-[3px] [animation:boot-sweep_1.5s_linear_infinite]">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-[8px] w-[9px] rounded-[1px] bg-gradient-to-b from-[#b9ffac] via-[#42d242] to-[#119911]"
                />
              ))}
            </div>
          </div>
          <p className="absolute bottom-8 text-[12px] text-[#777]">© {PROFILE.artistName} — instrumentals</p>
        </div>
      ) : (
        <div className="relative flex h-full flex-col items-center justify-center gap-6 overflow-hidden">
          <div className="aero-ribbon aero-ribbon-a" aria-hidden />
          <div className="relative rounded-[8px] border-2 border-white/70 bg-gradient-to-br from-[#4fb0ff] via-[#1f6fd1] to-[#0b2a5b] p-5 shadow-[0_6px_24px_rgba(0,0,0,0.5)]">
            <StartMark size={48} />
          </div>
          <div className="relative flex items-center gap-4">
            <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-white/25 border-t-[#9fe0ff]" aria-hidden />
            <p className="text-4xl font-light text-white [text-shadow:0_0_18px_rgba(120,200,255,0.9)]">Welcome</p>
          </div>
          <p className="relative text-[14px] text-white/80">{PROFILE.artistName}</p>
        </div>
      )}
      <span className="absolute right-4 bottom-4 text-[11px] text-white/35">click anywhere to skip</span>
    </button>
  );
}
