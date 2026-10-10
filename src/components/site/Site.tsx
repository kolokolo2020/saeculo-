"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import AudioEngine from "@/components/player/AudioEngine";
import { usePlayerStore } from "@/components/player/playerStore";
import BeatsWindow from "@/components/beats/BeatsWindow";
import { trackIndexFromHash } from "@/lib/trackLink";
import ContactWindow from "./ContactWindow";
import { BeatsIcon, ContactIcon, GameIcon, SocialsIcon } from "./Icons";
import ShortcutsCard from "./ShortcutsCard";
import { readCalm, restoreSitePrefs, useSiteStore, type WindowId } from "./siteStore";
import SocialsWindow from "./SocialsWindow";
import Taskbar from "./Taskbar";
import { useShortcuts } from "./useShortcuts";
import Window from "./Window";

// The intro and the game are only downloaded when they're needed: returning
// visitors never fetch the intro, and nobody fetches the game until they
// open it.
const BootIntro = dynamic(() => import("@/components/intro/BootIntro"), { ssr: false });
const Game = dynamic(() => import("@/components/game/Game"), { ssr: false, loading: () => <GameLoading /> });

const SEEN_KEY = "saeculo-intro-seen";
const noop = () => () => {};

function GameLoading() {
  return (
    <div className="fixed inset-0 z-[2000] grid place-items-center bg-black font-lcd text-[22px] text-[#cfc6b3]" role="status">
      closing the laptop…
    </div>
  );
}

// The desk: warm stone with a fine dot screen (globals.css).
function Wallpaper() {
  return <div className="wallpaper pointer-events-none" aria-hidden />;
}

const ICONS: { id: WindowId | "game"; label: string; Icon: typeof BeatsIcon }[] = [
  { id: "beats", label: "Beats", Icon: BeatsIcon },
  { id: "socials", label: "Socials", Icon: SocialsIcon },
  { id: "contact", label: "Contact", Icon: ContactIcon },
  { id: "game", label: "Game", Icon: GameIcon },
];

export default function Site() {
  useShortcuts();
  const windows = useSiteStore((s) => s.windows);
  const gameOpen = useSiteStore((s) => s.gameOpen);
  const introOpen = useSiteStore((s) => s.introOpen);
  // false while rendering on the server and hydrating, true after
  const ready = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

  // first paint: intro for first-time visitors, straight in for everyone else
  useEffect(() => {
    useSiteStore.setState({
      calm: readCalm() || window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    });
    restoreSitePrefs();
    const fromLink = trackIndexFromHash(window.location.hash);
    if (fromLink >= 0) usePlayerStore.getState().selectTrack(fromLink, false);
    const site = useSiteStore.getState();
    if (document.documentElement.dataset.intro === "skip") site.openWindow("beats");
    else site.setIntroOpen(true);
  }, []);

  // a share link followed while the site is already open
  useEffect(() => {
    const onHash = () => {
      const i = trackIndexFromHash(window.location.hash);
      if (i < 0) return;
      usePlayerStore.getState().selectTrack(i, false);
      useSiteStore.getState().openWindow("beats");
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const endIntro = useCallback(() => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // not remembered: they'll see it again next time
    }
    document.documentElement.dataset.intro = "skip";
    const site = useSiteStore.getState();
    site.setIntroOpen(false);
    site.openWindow("beats");
  }, []);

  const open = (id: WindowId | "game") => {
    const site = useSiteStore.getState();
    if (id === "game") site.setGameOpen(true);
    else site.openWindow(id);
  };

  return (
    <main className="fixed inset-0 overflow-clip select-none" data-ready={ready}>
      <AudioEngine />
      <div className="desktop absolute inset-0" inert={gameOpen || introOpen}>
        <Wallpaper />
        <h1 className="sr-only">saeculo: instrumentals &amp; beats</h1>

        <nav
          aria-label="Desktop"
          className="absolute top-[42%] left-1/2 grid -translate-x-1/2 -translate-y-1/2 grid-cols-2 gap-x-8 gap-y-6 sm:top-4 sm:left-3 sm:translate-x-0 sm:translate-y-0 sm:grid-cols-1 sm:gap-3"
        >
          {ICONS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className="desk-icon"
              data-testid={`icon-${id}`}
              aria-pressed={id === "game" ? gameOpen : windows[id].open && !windows[id].minimized}
              onClick={() => open(id)}
            >
              <Icon size={48} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <Window id="beats" width={780} height={568} icon={<BeatsIcon size={16} />}>
          <BeatsWindow />
        </Window>
        <Window id="socials" width={400} height={320} icon={<SocialsIcon size={16} />}>
          <SocialsWindow />
        </Window>
        <Window id="contact" width={440} height={430} icon={<ContactIcon size={16} />}>
          <ContactWindow />
        </Window>

        <Taskbar onReplayIntro={() => useSiteStore.getState().setIntroOpen(true)} />
        <ShortcutsCard />
      </div>

      {/* film grain for the intro and the game; the desktop stays clean paper */}
      {(gameOpen || introOpen) && <div className="grain" aria-hidden />}
      {!ready && <div className="intro-cover" aria-hidden />}
      {introOpen && <BootIntro onDone={endIntro} />}
      {gameOpen && <Game onExit={() => useSiteStore.getState().setGameOpen(false)} />}
    </main>
  );
}
