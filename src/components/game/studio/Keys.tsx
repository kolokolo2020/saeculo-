"use client";

import { inScale, noteName } from "./scales";
import { chip } from "./ui";

// A keyboard to play over the loop: on screen (mouse or finger) and on the
// computer's own keys, laid out like a piano across the home row (A is C,
// W is C♯, S is D…). Z and X move an octave. With rec on, what you play is
// written into the pattern on the nearest step.

/** Computer key (event.code) → semitone above the keyboard's C. */
export const KEY_CODES: Record<string, number> = {
  KeyA: 0,
  KeyW: 1,
  KeyS: 2,
  KeyE: 3,
  KeyD: 4,
  KeyF: 5,
  KeyT: 6,
  KeyG: 7,
  KeyY: 8,
  KeyH: 9,
  KeyU: 10,
  KeyJ: 11,
  KeyK: 12,
  KeyO: 13,
  KeyL: 14,
  KeyP: 15,
  Semicolon: 16,
};
const LABELS = Object.fromEntries(Object.entries(KEY_CODES).map(([code, n]) => [n, code === "Semicolon" ? ";" : code.slice(3)]));
const SEMIS = Array.from({ length: 17 }, (_, i) => i);
const BLACK = new Set([1, 3, 6, 8, 10]);

export default function Keys({
  base,
  target,
  down,
  rec,
  keyRoot,
  scale,
  melodic,
  onDown,
  onUp,
  onOctave,
  onRec,
}: {
  /** MIDI note of the leftmost key. */
  base: number;
  /** The channel being played, by name; null when there's nothing to play. */
  target: string | null;
  /** Semitones currently held. */
  down: number[];
  rec: boolean;
  keyRoot: number;
  scale: string;
  melodic: boolean;
  onDown: (semi: number, time: number) => void;
  onUp: (semi: number, time: number) => void;
  onOctave: (d: -1 | 1) => void;
  onRec: () => void;
}) {
  const whites = SEMIS.filter((n) => !BLACK.has(n % 12));
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[3px] border border-[#3a3733] bg-[#1a1917] px-2.5 py-2" data-testid="studio-keys">
      <div className="flex min-w-[150px] flex-col gap-1 text-[12px] text-[#b9b09e]">
        <span>
          play <span className="text-[#e8e0cf]">{target ?? "—"}</span>
        </span>
        <div className="flex items-center gap-1">
          <button className={chip} onClick={() => onOctave(-1)} aria-label="Octave down (Z)" title="Octave down (Z)">
            Z −
          </button>
          <span className="w-8 text-center font-mono text-[11px]">{melodic ? noteName(base) : `${base - 60 >= 0 ? "+" : ""}${base - 60}`}</span>
          <button className={chip} onClick={() => onOctave(1)} aria-label="Octave up (X)" title="Octave up (X)">
            + X
          </button>
          <button
            className={`${chip} ml-1 flex items-center gap-1 aria-pressed:border-[#d0694f] aria-pressed:text-[#ff9a7e]`}
            aria-pressed={rec}
            onClick={onRec}
            data-testid="studio-rec"
            title="Record what you play into the pattern"
          >
            <span className={`h-2 w-2 rounded-full ${rec ? "bg-[#e0553c]" : "bg-[#6d6558]"}`} />
            rec
          </button>
        </div>
      </div>
      <div className="relative h-[58px] min-w-0 flex-1 select-none touch-none" role="group" aria-label="Keyboard">
        <div className="absolute inset-0 flex">
          {whites.map((n) => (
            <KeyButton key={n} n={n} base={base} down={down.includes(n)} dim={melodic && !inScale(base + n, keyRoot, scale)} onDown={onDown} onUp={onUp} className="h-full flex-1 border-r border-[#2a2724] bg-[#d9d0bd] text-[#3a352d] last:border-r-0 data-[down=true]:bg-amber" />
          ))}
        </div>
        {SEMIS.filter((n) => BLACK.has(n % 12)).map((n) => {
          const left = whites.filter((w) => w < n).length;
          return (
            <KeyButton
              key={n}
              n={n}
              base={base}
              down={down.includes(n)}
              dim={melodic && !inScale(base + n, keyRoot, scale)}
              onDown={onDown}
              onUp={onUp}
              className="absolute top-0 z-10 h-[60%] -translate-x-1/2 rounded-b-[2px] bg-[#1b1a18] text-[#b9b09e] data-[down=true]:bg-[#b07a2c]"
              style={{ left: `${(left / whites.length) * 100}%`, width: `${(0.62 / whites.length) * 100}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}

function KeyButton({
  n,
  base,
  down,
  dim,
  onDown,
  onUp,
  className,
  style,
}: {
  n: number;
  base: number;
  down: boolean;
  dim: boolean;
  onDown: (n: number, time: number) => void;
  onUp: (n: number, time: number) => void;
  className: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      tabIndex={-1}
      data-down={down}
      aria-label={`${noteName(base + n)} (${LABELS[n]})`}
      className={`flex flex-col items-center justify-end pb-0.5 font-mono text-[9.5px] leading-none ${className}`}
      style={style}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
        onDown(n, e.timeStamp);
      }}
      onPointerUp={(e) => onUp(n, e.timeStamp)}
      onPointerLeave={(e) => down && onUp(n, e.timeStamp)}
      onPointerCancel={(e) => onUp(n, e.timeStamp)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className={dim ? "opacity-40" : ""}>{LABELS[n]}</span>
    </button>
  );
}
