"use client";

import { useState } from "react";
import BootScreen from "./BootScreen";
import DesktopIcon from "./DesktopIcon";
import ScreensaverOverlay from "./ScreensaverOverlay";
import StartMenu from "./StartMenu";
import Taskbar from "./Taskbar";
import WindowFrame from "@/components/window-manager/WindowFrame";
import { APPS, APP_BY_KIND } from "@/components/window-manager/windowRegistry";
import { useWindowStore } from "@/components/window-manager/windowStore";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useIdleTimer } from "@/hooks/useIdleTimer";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { PROFILE } from "@/data/profile";
import SaeculoApp from "@/components/apps/SaeculoApp/SaeculoApp";
import AboutApp from "@/components/apps/AboutApp";
import ContactApp from "@/components/apps/ContactApp";
import BeatMakerApp from "@/components/lab/BeatMakerApp/BeatMakerApp";
import RhythmRushApp from "@/components/lab/RhythmRushApp/RhythmRushApp";
import type { WindowKind } from "@/lib/types";

const APP_COMPONENTS: Record<WindowKind, React.ComponentType> = {
  saeculo: SaeculoApp,
  about: AboutApp,
  contact: ContactApp,
  beatmaker: BeatMakerApp,
  rhythm: RhythmRushApp,
};

export default function Desktop() {
  const [booting, setBooting] = useState(true);
  const [startOpen, setStartOpen] = useState(false);
  const windows = useWindowStore((s) => s.windows);
  const isMobile = useIsMobile();
  const reducedMotion = usePrefersReducedMotion();
  const idle = useIdleTimer(45_000);
  const showScreensaver = idle && !booting && !reducedMotion;

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-void text-ink">
      {booting && <BootScreen onDone={() => setBooting(false)} />}

      {/* wallpaper: grain + scanlines over the void, watermark wordmark */}
      <div className="crt-scanlines pointer-events-none absolute inset-0" aria-hidden />
      <div className="crt-grain pointer-events-none absolute inset-0" aria-hidden />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <p className="font-display text-center text-2xl leading-relaxed font-semibold text-ink/[0.06] select-none sm:text-4xl">
          {PROFILE.artistName}
          <br />
          <span className="font-readout text-base sm:text-xl">{PROFILE.tagline}</span>
        </p>
      </div>

      {/* desktop icons */}
      <div className="absolute top-3 left-2 flex flex-col gap-2 max-md:flex-row max-md:flex-wrap max-md:gap-1">
        {APPS.map((app) => (
          <DesktopIcon key={app.kind} app={app} />
        ))}
      </div>

      {/* windows — kept mounted while minimized so audio survives */}
      {(Object.keys(windows) as WindowKind[]).map((kind) => {
        const app = APP_BY_KIND[kind];
        const Component = APP_COMPONENTS[kind];
        return (
          <WindowFrame key={kind} kind={kind} title={app.title} icon={app.icon} isMobile={isMobile}>
            <Component />
          </WindowFrame>
        );
      })}

      {startOpen && <StartMenu onClose={() => setStartOpen(false)} />}
      <Taskbar onStartClick={() => setStartOpen((v) => !v)} startOpen={startOpen} />
      {showScreensaver && <ScreensaverOverlay />}
    </main>
  );
}
