"use client";

import type { RefObject } from "react";
import { fmtFans } from "./career";
import { FINDABLE } from "./studio/voices";
import type { Dir } from "./world";

// The game's screen furniture, around and over the picture: the top bar,
// what the thing in front of you does, people talking, the first-visit help,
// notices, the touch pad and the knocked-out screen. Only drawing and
// handing clicks back: everything they do lives in Game.tsx.

export interface Choice {
  label: string;
  run: () => void;
}
export interface Dialog {
  lines: string[];
  i: number;
  choices?: Choice[];
}

/** Where you are, cash, respect and followers, sounds found, the menu, your phone, the studio and the way out. */
export function TopBar({
  place,
  cash,
  rep,
  fans,
  unread,
  saved,
  heat,
  found,
  studio,
  fighting,
  onMenu,
  onPhone,
  onStudio,
  onExit,
}: {
  place: string;
  cash: number;
  rep: number;
  fans: number;
  unread: number;
  /** Just saved (a moment's note), or the browser won't keep it. */
  saved: "" | "saved" | "failed";
  /** Police heat, 0..5: shown as stars once it's at least one. */
  heat: number;
  found: number;
  studio: boolean;
  fighting: boolean;
  onMenu: () => void;
  onPhone: () => void;
  onStudio: () => void;
  onExit: () => void;
}) {
  return (
    <div className="relative flex h-12 shrink-0 items-center gap-2 border-b border-[#1d1b19] px-3 font-lcd text-[20px] leading-none whitespace-nowrap sm:gap-3">
      <span data-testid="game-place" className="min-w-[3ch] truncate">
        {place}
      </span>
      <span className="text-amber" data-testid="game-cash" aria-label={`$${Math.floor(cash)}, respect ${Math.floor(rep)}, ${Math.floor(fans)} followers`}>
        ${Math.floor(cash)}
        <span className="ml-2 hidden text-[#b9b09e] min-[420px]:inline">★{Math.floor(rep)}</span>
        <span className="ml-2 text-[#e8a0b0]" data-testid="game-fans">
          ♥{fmtFans(fans)}
        </span>
      </span>
      {Math.floor(heat) >= 1 && (
        <span className="text-[#7aa8ff]" data-testid="game-heat" aria-label={`Police heat: ${Math.floor(heat)} of 5`} title="Police heat: it cools off by itself, faster at home; sleeping clears it">
          {"✶".repeat(Math.floor(heat))}
        </span>
      )}
      {/* under the bar's left end, over the picture, so it never squeezes anything */}
      <span className={`pointer-events-none absolute top-full left-3 z-10 mt-1 rounded-[2px] bg-black/60 px-1.5 text-[16px] transition-opacity ${saved === "failed" ? "text-[#ff9a7a]" : "text-[#b9b09e]"} ${saved ? "opacity-100" : "opacity-0"}`} role="status" data-testid="game-saved">
        {saved === "failed" ? "not saved" : saved ? "saved ✓" : ""}
      </span>
      <span className="hidden text-[#8a8170] lg:inline" aria-label={`${found} of ${FINDABLE.length} sounds found`}>
        sounds {found}/{FINDABLE.length}
      </span>
      {!studio && (
        <>
          <button
            className="ml-auto rounded-[3px] border border-[#3a3733] bg-[#171615] px-2 py-1.5 font-sans text-[13px] hover:border-[#6d6558] sm:px-3"
            onClick={onMenu}
            disabled={fighting}
            data-testid="game-menu-btn"
            aria-label="Menu (M)"
          >
            <span className="sm:hidden">☰</span>
            <span className="hidden sm:inline">Menu (M)</span>
          </button>
          <button
            className="relative rounded-[3px] border border-[#3a3733] bg-[#171615] px-2.5 py-[7px] font-sans text-[13px] hover:border-[#6d6558] sm:px-3 sm:py-1.5"
            onClick={onPhone}
            disabled={fighting}
            data-testid="game-phone-btn"
            aria-label={unread ? `Phone (P), ${unread} new` : "Phone (P)"}
          >
            <svg className="block h-[15px] w-[10px] sm:hidden" viewBox="0 0 10 15" aria-hidden>
              <rect x="0.75" y="0.75" width="8.5" height="13.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <rect x="3.5" y="11" width="3" height="1.2" fill="currentColor" />
            </svg>
            <span className="hidden sm:inline">Phone (P)</span>
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] rounded-full bg-[#b33a3a] px-1 text-center text-[11px] leading-[18px] text-white" aria-hidden>
                {unread}
              </span>
            )}
          </button>
          <button
            className="rounded-[3px] border border-[#3a3733] bg-[#171615] px-2.5 py-[7px] font-sans text-[13px] hover:border-[#6d6558] sm:px-3 sm:py-1.5"
            onClick={onStudio}
            disabled={fighting}
            data-testid="game-to-studio"
            aria-label="Go to the studio"
          >
            <svg className="block h-[15px] w-[13px] sm:hidden" viewBox="0 0 13 15" aria-hidden>
              <path d="M4 12V2.5l8-1.8V10" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <ellipse cx="2.6" cy="12.2" rx="2.3" ry="1.8" fill="currentColor" />
              <ellipse cx="10.6" cy="10.4" rx="2.3" ry="1.8" fill="currentColor" />
            </svg>
            <span className="hidden sm:inline">
              <span className="lg:hidden">Studio</span>
              <span className="hidden lg:inline">Go to the studio</span>
            </span>
          </button>
        </>
      )}
      <button
        className={`${studio ? "ml-auto" : ""} flex items-center gap-2 rounded-[3px] border border-[#3a3733] bg-[#171615] px-3 py-1.5 font-sans text-[13px] hover:border-[#6d6558]`}
        onClick={onExit}
        data-testid="game-exit"
      >
        <span className="sm:hidden">Exit</span>
        <span className="hidden sm:inline">Back to the site</span> <span className="hidden text-[#948b7a] sm:inline">Esc</span>
      </button>
    </div>
  );
}

/**
 * Over the picture: the prompt for what's in front of you, someone talking
 * (with choices), the first-visit help card and notices. On phones held
 * upright (`below`) they sit in the free space under the picture, which is
 * `picture` pixels tall.
 */
export function Overlays({
  prompt,
  dialog,
  help,
  showHelp,
  toast,
  touch,
  below,
  picture,
  showingChoices,
  choiceBox,
  onAdvance,
  onChoose,
  onGotIt,
  onStudio,
}: {
  prompt: string | null;
  dialog: Dialog | null;
  /** The first-visit help is pending (the prompt waits for it)... */
  help: boolean;
  /** ...and showing now (playing, no menu open). */
  showHelp: boolean;
  toast: string | null;
  touch: boolean;
  below: boolean;
  picture: number;
  showingChoices: boolean;
  choiceBox: RefObject<HTMLDivElement | null>;
  onAdvance: () => void;
  onChoose: (c: Choice) => void;
  onGotIt: () => void;
  onStudio: () => void;
}) {
  return (
    <>
    {/* what the thing in front of you does */}
    {prompt && !dialog && !help && (
      <p
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-[3px] bg-black/75 px-3 py-1.5 font-lcd text-[20px] leading-none whitespace-nowrap"
        style={{ top: below ? picture + 10 : Math.min(picture - 44, picture * 0.84) }}
        data-testid="game-prompt"
      >
        {prompt.startsWith("@") ? (
          prompt.slice(1)
        ) : (
          <>
            <span className="mr-2 text-amber">{touch ? "A" : "E"}</span>
            {prompt}
          </>
        )}
      </p>
    )}

    {dialog && (
      <div
        className="absolute left-1/2 z-20 w-[min(560px,calc(100%-24px))] -translate-x-1/2 rounded-[3px] border-2 border-[#3a3733] bg-[#0f0e0d]/95 p-3 font-lcd text-[22px] leading-tight"
        style={{ top: below ? picture + 10 : Math.max(8, Math.min(picture - 120, picture * 0.55)) }}
        role="dialog"
        aria-live="polite"
        data-testid="game-dialog"
        onClick={() => !showingChoices && onAdvance()}
      >
        <p>{dialog.lines[dialog.i]}</p>
        {showingChoices ? (
          <div ref={choiceBox} className="mt-2 flex flex-wrap gap-2">
            {dialog.choices!.map((c) => (
              <button
                key={c.label}
                className="rounded-[2px] border border-[#4a4540] bg-[#1d1b19] px-3 py-1 text-[20px] hover:border-amber focus-visible:border-amber"
                onClick={(e) => {
                  e.stopPropagation();
                  onChoose(c);
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-right text-[16px] text-[#8a8170]">{touch ? "tap" : "E"} ▸</p>
        )}
      </div>
    )}

    {showHelp && (
      <div
        style={{ top: below ? picture + 10 : 12 }}
        className="absolute inset-x-3 z-20 mx-auto max-w-[440px] rounded-[3px] border-2 border-[#3a3733] bg-[#0f0e0d]/95 p-4 font-lcd text-[20px] leading-snug" data-testid="game-help">
        <p className="text-amber">late, the same night</p>
        <p className="mt-1">
          Find sounds around the block, then make a beat with them in the studio at the end of the street.
        </p>
        <ul className="mt-2 text-[18px] text-[#b9b09e]">
          {touch ? (
            <>
              <li>pad: walk · A: use / talk</li>
              <li>Back to the site: top right</li>
            </>
          ) : (
            <>
              <li>WASD / arrows: walk</li>
              <li>E / Space: use, talk</li>
              <li>Esc: back to the site</li>
            </>
          )}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="rounded-[2px] border border-[#4a4540] bg-[#1d1b19] px-3 py-1 text-[20px] hover:border-amber"
            onClick={onGotIt}
          >
            Got it
          </button>
          <button className="rounded-[2px] border border-[#4a4540] bg-[#1d1b19] px-3 py-1 text-[20px] hover:border-amber" onClick={onStudio}>
            Straight to the studio
          </button>
        </div>
      </div>
    )}

    {toast && (
      <p
        className={`pointer-events-none absolute left-1/2 z-20 w-max max-w-[calc(100%-24px)] -translate-x-1/2 rounded-[3px] bg-[#6e1f18] px-3 py-2 text-center font-lcd text-[19px] leading-tight shadow-lg ${below && !dialog ? "" : "top-3"}`}
        // phones held upright: in the free space under the picture, clear of the pad (over the picture while someone's talking there)
        style={below && !dialog ? { bottom: touch ? 206 : 16 } : undefined}
        role="status"
        data-testid="game-toast"
      >
        {toast}
      </p>
    )}
    </>
  );
}

/** The pad for touch screens: walking, A (use, swing), and in a fight B (dodge) and eat. */
export function TouchPad({
  down,
  fighting,
  talking,
  prompt,
  onPress,
  onRelease,
  onEat,
  onDodge,
  onHeavy,
  onUse,
}: {
  down: Dir | null;
  fighting: boolean;
  /** Someone's talking: the box sits where the pad is, and there's nowhere to walk anyway. */
  talking: boolean;
  prompt: string | null;
  onPress: (dir: Dir) => (e: React.PointerEvent) => void;
  onRelease: (e: React.PointerEvent) => void;
  onEat: () => void;
  onDodge: () => void;
  onHeavy: () => void;
  onUse: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
      <div className={`pointer-events-auto grid grid-cols-3 grid-rows-3 gap-1 ${talking ? "invisible" : ""}`} aria-label="Movement pad">
        {(
          [
            ["up", "▲", "col-start-2 row-start-1"],
            ["left", "◀", "col-start-1 row-start-2"],
            ["right", "▶", "col-start-3 row-start-2"],
            ["down", "▼", "col-start-2 row-start-3"],
          ] as const
        ).map(([dir, label, pos]) => (
          <button
            key={dir}
            className={`pad-btn h-14 w-14 rounded-[4px] ${pos}`}
            data-down={down === dir}
            aria-label={`Walk ${dir}`}
            onPointerDown={onPress(dir)}
            onPointerUp={onRelease}
            onPointerCancel={onRelease}
            onContextMenu={(e) => e.preventDefault()}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="pointer-events-auto flex items-end gap-2">
        {fighting && (
          <div className="flex flex-col gap-2">
            <button
              className="pad-btn h-11 w-14 rounded-[4px] text-[16px]"
              aria-label="H: heavy hit"
              onPointerDown={(e) => {
                e.preventDefault();
                onHeavy();
              }}
            >
              H
            </button>
            <button
              className="pad-btn h-11 w-14 rounded-[4px] text-[16px]"
              aria-label="Eat"
              onPointerDown={(e) => {
                e.preventDefault();
                onEat();
              }}
            >
              eat
            </button>
            <button
              className="pad-btn h-16 w-16 rounded-full text-[24px]"
              aria-label="B: dodge"
              onPointerDown={(e) => {
                e.preventDefault();
                onDodge();
              }}
            >
              B
            </button>
          </div>
        )}
        <button
          className="pad-btn h-20 w-20 rounded-full text-[28px]"
          aria-label={fighting ? "A: swing" : prompt && !prompt.startsWith("@") ? `Use: ${prompt}` : "Use"}
          onPointerDown={(e) => {
            e.preventDefault();
            onUse();
          }}
        >
          A
        </button>
      </div>
    </div>
  );
}

/** Going down (stage 1), then the morning after (stage 2) with the way back up. */
export function KnockedOut({ stage, onWake }: { stage: number; onWake: () => void }) {
  return (
    <div className="game-fade absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/90 font-lcd text-[24px]" role="alertdialog" aria-label="Knocked out" data-testid="game-ko">
      {stage === 2 && (
        <>
          <p className="text-[34px] text-[#ff7a6a]">Knocked out.</p>
          <p className="max-w-[420px] px-6 text-center text-[20px] text-[#b9b09e]">The ground comes up fast. Somebody’s going through your pockets. Then nothing.</p>
          <button className="rounded-[2px] border border-[#4a4540] bg-[#1d1b19] px-4 py-1.5 text-[22px] hover:border-amber" onClick={onWake} autoFocus data-testid="game-wake">
            Wake up
          </button>
        </>
      )}
    </div>
  );
}
