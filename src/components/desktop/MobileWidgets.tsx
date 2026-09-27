"use client";

import { usePlayerStore, useCurrentTrack } from "@/components/player/playerStore";
import Visualizer from "@/components/player/Visualizer";
import { analysisFor, paletteFor } from "@/components/player/analysis";
import { useWindowStore } from "@/components/window-manager/windowStore";
import Glyph from "@/components/ui/Glyph";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { formatTime } from "@/lib/audio";
import { ReleaseGadget } from "./Sidebar";

// Phones have no room for the sidebar, which left the home screen empty
// under the icons. These widgets fill it the way a phone's lock screen
// would: the music first (one tap to play), then the countdown.
export default function MobileWidgets() {
  const track = useCurrentTrack();
  const playing = usePlayerStore((s) => s.playing);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const loaded = usePlayerStore((s) => s.duration);
  const { toggle, next, prev } = usePlayerStore.getState();
  const openWindow = useWindowStore((s) => s.openWindow);
  const reducedMotion = usePrefersReducedMotion();
  const palette = paletteFor(track.id);
  // before the audio's metadata loads, the measured length stands in
  const duration = loaded || analysisFor(track.id)?.duration || 0;
  const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="absolute inset-x-3 bottom-[150px] z-[4] flex flex-col gap-2 md:hidden">
      <div
        role="group"
        aria-label="Now playing widget"
        className="aero-gadget relative overflow-hidden p-0"
        style={{ background: `linear-gradient(to bottom, color-mix(in srgb, ${palette.deep} 80%, transparent), rgba(3,7,15,0.85))` }}
      >
        {track.cover && (
          // eslint-disable-next-line @next/next/no-img-element -- local cover, used as a blurred backdrop
          <img src={track.cover} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-125 object-cover opacity-35 blur-2xl" />
        )}

        <div className="relative flex items-center gap-3 p-3 pb-2">
          <button onClick={() => openWindow("player")} aria-label={`Open ${track.title} in the Media Player`} className="shrink-0">
            {track.cover && (
              // eslint-disable-next-line @next/next/no-img-element -- local cover
              <img src={track.cover} alt="" width={64} height={64} className="h-16 w-16 rounded-[5px] border border-white/25 object-cover shadow-[0_4px_12px_rgba(0,0,0,0.5)]" />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] tracking-[0.14em] text-white/60 uppercase">{playing ? "Now playing" : "saeculo · tap play"}</p>
            <p className="truncate text-[16px] font-semibold text-white">{track.title}</p>
            <p className="truncate text-[11.5px] text-white/70">
              {track.mood} · {track.bpm} bpm
            </p>
          </div>
          <button onClick={toggle} aria-label={`${playing ? "Pause" : "Play"} ${track.title}`} className="aero-orb grid h-12 w-12 shrink-0 place-items-center text-white">
            <Glyph name={playing ? "pause" : "play"} size={18} />
          </button>
        </div>

        <div className="relative flex items-center gap-2 px-3 pb-3">
          <button onClick={prev} aria-label="Widget previous track" className="aero-btn-dark grid h-7 w-8 place-items-center">
            <Glyph name="prev" size={11} />
          </button>
          <span className="w-9 text-right font-mono text-[10.5px] text-white/70">{formatTime(currentTime)}</span>
          <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/15" aria-hidden>
            <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: palette.accent }} />
          </span>
          <span className="w-9 font-mono text-[10.5px] text-white/70">{formatTime(duration)}</span>
          <button onClick={next} aria-label="Widget next track" className="aero-btn-dark grid h-7 w-8 place-items-center">
            <Glyph name="next" size={11} />
          </button>
        </div>
        {/* a strip of live bars along the bottom edge; the space is kept while paused so nothing jumps */}
        <div className="relative h-5 overflow-hidden border-t border-white/10 bg-black/30" aria-hidden>
          {playing && <Visualizer mode="bars" playing reducedMotion={reducedMotion} className="h-5" palette={palette} />}
        </div>
      </div>
      <ReleaseGadget />
    </div>
  );
}
