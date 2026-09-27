"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useWindowStore } from "@/components/window-manager/windowStore";
import { APPS, type AppMeta } from "@/components/window-manager/windowRegistry";
import AppIcon from "@/components/ui/AppIcon";
import Glyph from "@/components/ui/Glyph";
import StartMark from "@/components/ui/StartMark";
import { PROFILE } from "@/data/profile";
import { isKonamiPhrase } from "@/components/secrets/konami";
import { useSecretStore } from "@/components/secrets/secretStore";
import type { WindowKind } from "@/lib/types";

const PINNED: WindowKind[] = ["player", "beatdeck", "beatmaker"];
const RIGHT_LINKS: { label: string; kind: WindowKind }[] = [
  { label: "Music", kind: "player" },
  { label: "Beat Deck", kind: "beatdeck" },
  { label: "Beat Maker", kind: "beatmaker" },
  { label: "About", kind: "about" },
  { label: "Contact", kind: "contact" },
  { label: "Recycle Bin", kind: "recycle" },
  { label: "Personalize", kind: "personalize" },
  { label: "Welcome Center", kind: "welcome" },
];

const LISTED = APPS.filter((a) => !a.hidden);

function matches(app: AppMeta, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return `${app.title} ${app.label} ${app.description}`.toLowerCase().includes(q);
}

function Item({
  app,
  big,
  onLaunch,
}: {
  app: AppMeta;
  big?: boolean;
  onLaunch: (kind: WindowKind) => void;
}) {
  return (
    <li>
      <button
        onClick={() => onLaunch(app.kind)}
        className="aero-row flex w-full items-center gap-2.5 px-2 py-1 text-left"
      >
        <AppIcon kind={app.kind} size={big ? 32 : 24} />
        <span className="min-w-0">
          <span className={`block truncate text-[13px] text-ink ${big ? "font-semibold" : ""}`}>
            {app.label}
          </span>
          {big && <span className="block truncate text-[11px] text-mute">{app.description}</span>}
        </span>
      </button>
    </li>
  );
}

export default function StartMenu({
  onClose,
  onRestart,
  onLock,
}: {
  onClose: () => void;
  onRestart: () => void;
  onLock: () => void;
}) {
  const openWindow = useWindowStore((s) => s.openWindow);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    searchRef.current?.focus({ preventScroll: true });
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const launch = (kind: WindowKind) => {
    openWindow(kind);
    onClose();
  };

  const results = useMemo(() => LISTED.filter((a) => matches(a, query)), [query]);
  const searching = query.trim().length > 0;
  const pinned = LISTED.filter((a) => PINNED.includes(a.kind));
  const rest = LISTED.filter((a) => !PINNED.includes(a.kind));

  return (
    <>
      <div className="fixed inset-0 z-[9100]" onClick={onClose} aria-hidden />
      <nav
        aria-label="Start menu"
        className="aero-start absolute bottom-10 left-0 z-[9200] flex w-[430px] p-2 pt-9 max-md:inset-x-1 max-md:w-auto max-sm:pt-2"
      >
        {/* left: white program pane */}
        <div className="flex min-w-0 flex-1 flex-col rounded-[4px] border border-[#6a7f99] bg-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.8)]">
          <ul className="max-h-[360px] flex-1 overflow-y-auto p-1.5">
            {searching ? (
              results.length ? (
                results.map((app) => <Item key={app.kind} app={app} onLaunch={launch} />)
              ) : (
                <li className="px-2 py-3 text-[12px] text-mute">
                  {/vault/i.test(query) ? "C:\\saeculo\\vault is not accessible. Access is denied." : "No items match your search."}
                </li>
              )
            ) : (
              <>
                {pinned.map((app) => (
                  <Item key={app.kind} app={app} big onLaunch={launch} />
                ))}
                <li className="mx-2 my-1 border-t border-[#d8e0ea]" aria-hidden />
                {rest.map((app) => (
                  <Item key={app.kind} app={app} onLaunch={launch} />
                ))}
              </>
            )}
          </ul>
          <div className="border-t border-[#c9d3df] bg-gradient-to-b from-[#f4f7fb] to-[#e3eaf3] p-1.5">
            <label className="aero-input flex items-center gap-1.5 px-2 py-1">
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => {
                  // the cheat code works typed out here too, for phones
                  if (isKonamiPhrase(e.target.value)) {
                    useSecretStore.getState().find("konami");
                    onClose();
                    return;
                  }
                  setQuery(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && results[0]) launch(results[0].kind);
                }}
                placeholder="Start Search"
                aria-label="Start Search"
                className="min-w-0 flex-1 bg-transparent text-[12px] italic outline-none placeholder:text-[#8a96a6]"
              />
              <Glyph name="search" size={14} className="text-[#3d6fa8]" />
            </label>
          </div>
        </div>

        {/* right: dark glass places pane */}
        <div className="relative flex w-[150px] shrink-0 flex-col pl-2 max-sm:hidden">
          <div className="absolute -top-[46px] left-1/2 h-[52px] w-[52px] -translate-x-1/2 rounded-[6px] border border-white/60 bg-gradient-to-br from-[#4fb0ff] via-[#1f6fd1] to-[#0b2a5b] p-[3px] shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
            <div className="grid h-full w-full place-items-center rounded-[3px] bg-gradient-to-b from-white/25 to-transparent">
              <StartMark size={26} />
            </div>
          </div>
          <p className="mt-3 px-2 text-[13px] font-semibold text-white">{PROFILE.artistName}</p>
          <ul className="mt-1 flex-1">
            {RIGHT_LINKS.map((link) => (
              <li key={link.label}>
                <button
                  onClick={() => launch(link.kind)}
                  className="aero-start-link w-full px-2 py-1.5 text-left text-[12.5px]"
                >
                  {link.label}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center justify-end gap-1">
            <button
              onClick={() => {
                onClose();
                onLock();
              }}
              aria-label="Lock"
              title="Lock (screensaver)"
              className="grid h-7 w-8 place-items-center rounded-[4px] border border-black/60 bg-gradient-to-b from-[#f5c46a] to-[#b8741a] text-[#3a2203] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] hover:brightness-110"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden>
                <rect x="3" y="7" width="10" height="7.5" rx="1.5" fill="currentColor" />
                <path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </button>
            <button
              onClick={() => {
                onClose();
                onRestart();
              }}
              aria-label="Restart"
              title="Restart"
              className="grid h-7 w-8 place-items-center rounded-[4px] border border-black/60 bg-gradient-to-b from-[#ff9d7e] to-[#c2371c] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] hover:brightness-110"
            >
              <Glyph name="power" size={13} />
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
