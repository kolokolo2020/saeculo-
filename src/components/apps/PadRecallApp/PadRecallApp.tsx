"use client";

import { PAD_KEYS, PAD_NAMES, usePadRecall } from "./usePadRecall";

const PAD_COLORS = [
  ["#ffb35c", "#c2620c"],
  ["#ffc978", "#c47a12"],
  ["#ffd98f", "#b8841a"],
  ["#ffe7a8", "#b8961a"],
  ["#7fc4ff", "#155fb8"],
  ["#8fd0ff", "#1a6fc2"],
  ["#a3dcff", "#207ccc"],
  ["#c0e8ff", "#2a8ad6"],
];

export default function PadRecallApp() {
  const { phase, round, lit, best, wrongPad, start, press } = usePadRecall();

  const status =
    phase === "idle"
      ? "Watch the pads, then play the pattern back."
      : phase === "showing"
        ? "Listen…"
        : phase === "input"
          ? "Your turn"
          : `Wrong pad — you recalled ${Math.max(0, round - 1)} hit${round - 1 === 1 ? "" : "s"}.`;

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="font-pixel flex items-center justify-between text-[9px] text-white [text-shadow:0_0_8px_rgba(80,170,255,0.9)]">
        <span>ROUND {round}</span>
        <span className="text-[#ffd27a]">PAD RECALL</span>
        <span>BEST {best}</span>
      </div>

      {/* the MPC-style pad bank */}
      <div className="flex-1 rounded-[8px] border border-black bg-gradient-to-b from-[#2b3340] to-[#0c1016] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
        <div className="grid h-full grid-cols-4 grid-rows-2 gap-2.5" role="group" aria-label="Drum pads">
          {PAD_KEYS.map((key, i) => {
            const on = lit === i;
            const wrong = phase === "over" && wrongPad === i;
            const [hi, lo] = PAD_COLORS[i];
            return (
              <button
                key={key}
                onPointerDown={(e) => {
                  e.preventDefault();
                  press(i);
                }}
                disabled={phase !== "input"}
                aria-label={`Pad ${key.toUpperCase()} ${PAD_NAMES[i]}`}
                className="relative flex flex-col items-center justify-end rounded-[6px] border border-black pb-1.5 transition-[filter,box-shadow] duration-100 disabled:cursor-default"
                style={{
                  background: on
                    ? `radial-gradient(circle at 50% 40%, #fff, ${hi} 45%, ${lo})`
                    : wrong
                      ? "radial-gradient(circle at 50% 40%, #ffb3a8, #d9412f 60%, #6b140a)"
                      : `linear-gradient(to bottom, #3b4452, #1d232c)`,
                  boxShadow: on
                    ? `0 0 18px ${hi}, inset 0 1px 0 rgba(255,255,255,0.6)`
                    : `inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -3px 0 ${lo}`,
                }}
              >
                <span className={`text-[11px] font-semibold ${on ? "text-[#1b2533]" : "text-white/70"}`}>
                  {key.toUpperCase()}
                </span>
                <span className={`text-[9.5px] ${on ? "text-[#1b2533]" : "text-white/40"}`}>{PAD_NAMES[i]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <p className={`flex-1 text-[12.5px] ${phase === "over" ? "text-[#ff9a8a]" : "text-[#b7c7dc]"}`} aria-live="polite">
          {status}
        </p>
        <button
          onClick={start}
          disabled={phase === "showing" || phase === "input"}
          className="aero-btn aero-btn-primary px-5 py-1.5 text-[13px]"
        >
          {phase === "idle" ? "Start" : "New game"}
        </button>
      </div>
    </div>
  );
}
