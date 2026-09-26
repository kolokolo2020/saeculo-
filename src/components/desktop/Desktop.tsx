"use client";

import { useCallback, useEffect, useState } from "react";
import BootScreen from "./BootScreen";
import DesktopContextMenu from "./DesktopContextMenu";
import DesktopIcon from "./DesktopIcon";
import ScreensaverOverlay from "./ScreensaverOverlay";
import Sidebar from "./Sidebar";
import StartMenu from "./StartMenu";
import Taskbar from "./Taskbar";
import { usePersonalizeStore } from "./personalizeStore";
import WindowFrame from "@/components/window-manager/WindowFrame";
import { APPS } from "@/components/window-manager/windowRegistry";
import { useWindowStore } from "@/components/window-manager/windowStore";
import AudioEngine from "@/components/player/AudioEngine";
import { usePlayerStore } from "@/components/player/playerStore";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useIdleTimer } from "@/hooks/useIdleTimer";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { PROFILE } from "@/data/profile";
import { decodeBeat, setPendingBeat } from "@/lib/beatCode";
import MediaPlayerApp from "@/components/apps/MediaPlayerApp";
import AboutApp from "@/components/apps/AboutApp";
import ContactApp from "@/components/apps/ContactApp";
import GamesExplorerApp from "@/components/apps/GamesExplorerApp";
import RecycleBinApp from "@/components/apps/RecycleBinApp";
import BeatMakerApp from "@/components/lab/BeatMakerApp/BeatMakerApp";
import RhythmRushApp from "@/components/lab/RhythmRushApp/RhythmRushApp";
import BeatBrawlApp from "@/components/apps/BeatBrawlApp/BeatBrawlApp";
import PadRecallApp from "@/components/apps/PadRecallApp/PadRecallApp";
import PersonalizeApp from "@/components/apps/PersonalizeApp";
import VaultApp from "@/components/apps/VaultApp";
import ReleaseApp from "@/components/apps/ReleaseApp";
import TrayBalloon from "./TrayBalloon";
import { useSecretStore } from "@/components/secrets/secretStore";
import { createKonamiListener } from "@/components/secrets/konami";
import type { WindowKind } from "@/lib/types";

const APP_COMPONENTS: Record<WindowKind, React.ComponentType> = {
  player: MediaPlayerApp,
  beatmaker: BeatMakerApp,
  games: GamesExplorerApp,
  rhythm: RhythmRushApp,
  brawl: BeatBrawlApp,
  pads: PadRecallApp,
  about: AboutApp,
  contact: ContactApp,
  recycle: RecycleBinApp,
  personalize: PersonalizeApp,
  vault: VaultApp,
  release: ReleaseApp,
};

export default function Desktop() {
  const [booting, setBooting] = useState(true);
  const [forceBoot, setForceBoot] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const glass = usePersonalizeStore((s) => s.glass);
  const wallpaper = usePersonalizeStore((s) => s.wallpaper);
  const transparency = usePersonalizeStore((s) => s.transparency);
  const windows = useWindowStore((s) => s.windows);
  const isMobile = useIsMobile();
  const reducedMotion = usePrefersReducedMotion();
  const idle = useIdleTimer(45_000);
  const showScreensaver = !booting && (locked || (idle && !reducedMotion));

  const finishBoot = useCallback(() => {
    setBooting(false);
    setForceBoot(false);
  }, []);
  const closeStart = useCallback(() => setStartOpen(false), []);
  const unlock = useCallback(() => setLocked(false), []);
  const restart = useCallback(() => {
    usePlayerStore.getState().pause();
    useWindowStore.setState({ windows: {}, focusedKind: null });
    setForceBoot(true);
    setBooting(true);
  }, []);
  const closeMenu = useCallback(() => setMenu(null), []);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // the saved look is applied after mount so the first render matches SSR
  useEffect(() => {
    usePersonalizeStore.getState().hydrate();
    useSecretStore.getState().hydrate();
  }, []);

  // ↑ ↑ ↓ ↓ ← → ← → B A anywhere outside a text field reveals a hidden word
  useEffect(() => {
    const konami = createKonamiListener();
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable=true]")) return;
      if (konami(e.key)) useSecretStore.getState().find("konami");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // A share link (#beat=…) opens straight into the Beat Maker with that
  // loop; the hash is then dropped so a refresh doesn't re-import it. A link
  // pasted into a tab that already has the site open only changes the hash,
  // so listen for that too.
  useEffect(() => {
    const importFromHash = () => {
      const beat = decodeBeat(window.location.hash);
      if (!beat) return;
      setPendingBeat(beat);
      useWindowStore.getState().openWindow("beatmaker");
      history.replaceState(null, "", window.location.pathname + window.location.search);
    };
    importFromHash();
    window.addEventListener("hashchange", importFromHash);
    return () => window.removeEventListener("hashchange", importFromHash);
  }, []);

  // Right-click on the bare desktop (not on a window, gadget or the taskbar)
  const onContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("section, footer, aside, button, [role=menu], nav[aria-label='Start menu']")) return;
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <main
      data-glass={glass}
      data-wall={wallpaper}
      data-transparency={transparency ? "on" : "off"}
      onContextMenu={onContextMenu}
      className="aero-wallpaper relative h-dvh w-full overflow-clip text-ink"
    >
      <AudioEngine />
      {booting && <BootScreen onDone={finishBoot} force={forceBoot} />}

      {/* wallpaper: drifting aurora ribbons + a quiet wordmark */}
      {/* clipped in their own box: the rotated ribbons would otherwise
          extend past the viewport and make the desktop scrollable */}
      <div className="pointer-events-none absolute inset-0 overflow-clip" aria-hidden>
        <div className="aero-ribbon aero-ribbon-a" />
        <div className="aero-ribbon aero-ribbon-b" />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute right-8 bottom-16 text-right select-none lg:right-[212px]"
      >
        <p className="text-5xl font-light tracking-tight text-white/[0.13] sm:text-6xl">{PROFILE.artistName}</p>
        <p className="text-sm tracking-[0.3em] text-white/[0.18] uppercase">{PROFILE.tagline}</p>
      </div>

      {/* desktop icons */}
      <nav
        key={refreshKey}
        aria-label="Desktop"
        className="aero-open absolute top-2 left-1 flex max-h-[calc(100%-56px)] flex-col flex-wrap content-start gap-1 max-md:right-1 max-md:flex-row"
      >
        {APPS.filter((a) => a.onDesktop).map((app) => (
          <DesktopIcon key={app.kind} app={app} />
        ))}
      </nav>

      <Sidebar />

      {/* windows — kept mounted while minimized so games/sequencers keep state */}
      {(Object.keys(windows) as WindowKind[]).map((kind) => {
        const Component = APP_COMPONENTS[kind];
        return (
          <WindowFrame key={kind} kind={kind} isMobile={isMobile}>
            <Component />
          </WindowFrame>
        );
      })}

      {menu && <DesktopContextMenu x={menu.x} y={menu.y} onClose={closeMenu} onRefresh={refresh} />}
      {startOpen && <StartMenu onClose={closeStart} onRestart={restart} onLock={() => setLocked(true)} />}
      <TrayBalloon />
      <Taskbar onStartClick={() => setStartOpen((v) => !v)} startOpen={startOpen} />
      {showScreensaver && <ScreensaverOverlay onDismiss={locked ? unlock : undefined} />}
    </main>
  );
}
