"use client";

import { useState } from "react";
import { TRACKS } from "@/data/tracks";
import { formatTime } from "@/lib/audio";
import { usePlayerStore, useCurrentTrack } from "@/components/player/playerStore";
import Visualizer, { VIZ_LABEL, VIZ_MODES } from "@/components/player/Visualizer";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import Glyph from "@/components/ui/Glyph";

type Tab = "now" | "library";

// A glossy-black, WMP11-flavoured player. All state lives in the global
// player store, so this window is just one of several remotes for it.
export default function MediaPlayerApp() {
  const [tab, setTab] = useState<Tab>("now");
  const [vizIndex, setVizIndex] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  const track = useCurrentTrack();
  const trackIndex = usePlayerStore((s) => s.trackIndex);
  const playing = usePlayerStore((s) => s.playing);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const repeatOne = usePlayerStore((s) => s.repeatOne);
  const { toggle, next, prev, seek, setVolume, toggleMute, toggleRepeat, selectTrack, pause } =
    usePlayerStore.getState();

  const vizMode = VIZ_MODES[vizIndex];

  return (
    <div className="flex h-full flex-col">
      {/* tabs */}
      <div className="aero-toolbar-dark flex h-9 shrink-0 items-end gap-1 px-2" role="tablist">
        {(
          [
            ["now", "Now Playing"],
            ["library", "Library"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-t-[4px] px-3 py-1.5 text-[13px] transition-colors ${
              tab === id
                ? "bg-gradient-to-b from-[#3d8ee8] to-[#0f3f86] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]"
                : "text-[#b7c7dc] hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto pb-1.5 text-[11px] text-[#7f93ad]">{TRACKS.length} items</span>
      </div>

      {/* main area */}
      <div className="relative min-h-0 flex-1">
        {tab === "now" ? (
          <div className="relative h-full">
            <Visualizer mode={vizMode} playing={playing} reducedMotion={reducedMotion} className="h-full" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-4 pt-10 pb-3">
              <p className="text-lg font-semibold text-white drop-shadow">{track.title}</p>
              <p className="text-[13px] text-[#9fc3ea]">
                saeculo · {track.mood} · {track.bpm} bpm
              </p>
            </div>
            <button
              onClick={() => setVizIndex((i) => (i + 1) % VIZ_MODES.length)}
              aria-label="Cycle visualizer style"
              className="aero-btn-dark absolute top-2 right-2 px-2 py-1 text-[11px]"
            >
              {VIZ_LABEL[vizMode]} ↻
            </button>
          </div>
        ) : (
          <ul className="dark-scroll h-full overflow-y-auto p-2" aria-label="Library">
            <li className="grid grid-cols-[2rem_1fr_6rem_3.5rem] px-2 pb-1 text-[11px] text-[#7f93ad]">
              <span>#</span>
              <span>Title</span>
              <span>Genre</span>
              <span className="text-right">BPM</span>
            </li>
            {TRACKS.map((t, i) => {
              const isCurrent = i === trackIndex;
              return (
                <li key={t.id}>
                  <button
                    onClick={() => (isCurrent && playing ? pause() : selectTrack(i))}
                    className={`grid w-full grid-cols-[2rem_1fr_6rem_3.5rem] items-center px-2 py-1.5 text-left text-[13px] ${
                      isCurrent ? "aero-row-dark-selected text-white" : "aero-row-dark text-[#d7e4f3]"
                    }`}
                  >
                    <span className="text-[#8fb4e0]">{isCurrent && playing ? <Glyph name="play" size={11} /> : i + 1}</span>
                    <span className="truncate">{t.title}</span>
                    <span className="truncate text-[#9fb2c9]">{t.mood.split(" / ")[0]}</span>
                    <span className="text-right text-[#9fb2c9]">{t.bpm}</span>
                  </button>
                  {isCurrent && (
                    <div className="flex gap-3 px-10 pt-0.5 pb-1.5">
                      {t.streamingLinks.map((link) => (
                        <a
                          key={link.label}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[12px] text-[#6fb4ff] hover:text-white hover:underline"
                        >
                          {link.label} ↗
                        </a>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* transport */}
      <div className="aero-toolbar-dark shrink-0 border-t border-black px-3 pt-2 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-9 text-right font-mono text-[11px] text-[#9fc3ea]">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Seek"
            className="aero-range flex-1"
          />
          <span className="w-9 font-mono text-[11px] text-[#7f93ad]">{formatTime(duration)}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <button
            onClick={toggleRepeat}
            aria-pressed={repeatOne}
            aria-label="Repeat current track"
            title="Repeat one"
            className="aero-btn-dark grid h-7 w-8 place-items-center"
          >
            <Glyph name="repeat" size={14} />
          </button>
          <div className="mx-auto flex items-center gap-2">
            <button onClick={prev} aria-label="Previous track" className="aero-btn-dark grid h-8 w-9 place-items-center rounded-full">
              <Glyph name="prev" size={14} />
            </button>
            <button
              onClick={toggle}
              aria-label={playing ? "Pause" : "Play"}
              className="aero-orb grid h-12 w-12 place-items-center text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]"
            >
              <Glyph name={playing ? "pause" : "play"} size={20} />
            </button>
            <button onClick={next} aria-label="Next track" className="aero-btn-dark grid h-8 w-9 place-items-center rounded-full">
              <Glyph name="next" size={14} />
            </button>
          </div>
          <button
            onClick={toggleMute}
            aria-pressed={muted}
            aria-label={muted ? "Unmute" : "Mute"}
            className="aero-btn-dark grid h-7 w-8 place-items-center"
          >
            <Glyph name={muted ? "mute" : "volume"} size={14} />
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Volume"
            className="aero-range w-20"
          />
        </div>
      </div>
    </div>
  );
}
