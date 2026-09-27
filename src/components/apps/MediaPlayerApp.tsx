"use client";

import { useEffect, useRef, useState } from "react";
import { TRACKS } from "@/data/tracks";
import { formatTime } from "@/lib/audio";
import { usePlayerStore, useCurrentTrack } from "@/components/player/playerStore";
import Visualizer, { VIZ_LABEL, VIZ_MODES, type VizMode } from "@/components/player/Visualizer";
import WaveformSeek from "@/components/player/WaveformSeek";
import BeatLed from "@/components/player/BeatLed";
import MiniWave from "@/components/player/MiniWave";
import { analysisFor, paletteFor } from "@/components/player/analysis";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import Glyph from "@/components/ui/Glyph";
import { trackUrl } from "@/lib/trackLink";

type Tab = "now" | "library";
const VIZ_KEY = "saeculo-viz";

function savedViz(): VizMode {
  try {
    const v = localStorage.getItem(VIZ_KEY);
    return VIZ_MODES.includes(v as VizMode) ? (v as VizMode) : "art";
  } catch {
    return "art";
  }
}

// A glossy-black, WMP11-flavoured player, themed by the playing track's
// cover. All state lives in the global player store, so this window is just
// one of several remotes for it.
export default function MediaPlayerApp() {
  const [tab, setTab] = useState<Tab>("now");
  // windows only render after the desktop has mounted, so storage is safe here
  const [viz, setViz] = useState<VizMode>(savedViz);
  const [copied, setCopied] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  const track = useCurrentTrack();
  const trackIndex = usePlayerStore((s) => s.trackIndex);
  const playing = usePlayerStore((s) => s.playing);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const repeatOne = usePlayerStore((s) => s.repeatOne);
  const { toggle, next, prev, setVolume, toggleMute, toggleRepeat, selectTrack, pause } = usePlayerStore.getState();
  const palette = paletteFor(track.id);
  const total = duration || analysisFor(track.id)?.duration || 0;

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const cycleViz = () => {
    const nextMode = VIZ_MODES[(VIZ_MODES.indexOf(viz) + 1) % VIZ_MODES.length];
    setViz(nextMode);
    try {
      localStorage.setItem(VIZ_KEY, nextMode);
    } catch {
      // not remembered — fine
    }
  };

  const toggleFullscreen = () => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.().catch(() => {});
  };

  const copyLink = async (id: string) => {
    const url = trackUrl(id);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  };

  // Space toggles playback while the player has focus (buttons and sliders
  // keep their own Space behaviour)
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== " " || (e.target as HTMLElement).closest("button, input, a, select, [role=slider]")) return;
    e.preventDefault();
    toggle();
  };

  return (
    <div
      className="flex h-full flex-col"
      onKeyDown={onKeyDown}
      style={{ ["--acc" as string]: palette.accent, ["--acc2" as string]: palette.second, ["--deep" as string]: palette.deep }}
    >
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
              tab === id ? "bg-gradient-to-b from-[#3d8ee8] to-[#0f3f86] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]" : "text-[#b7c7dc] hover:text-white"
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
          <div ref={stageRef} className="relative h-full overflow-hidden bg-[var(--deep)]">
            {/* the cover, blurred into a backdrop that takes its colours */}
            {track.cover && (
              // eslint-disable-next-line @next/next/no-img-element -- decorative backdrop from a local file
              <img key={track.cover} src={track.cover} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-125 object-cover opacity-45 blur-2xl" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/80" aria-hidden />
            <Visualizer mode={viz} playing={playing} reducedMotion={reducedMotion} className="relative h-full" palette={palette} cover={track.cover} />

            <div className="absolute top-2 right-2 flex gap-1.5">
              <button onClick={cycleViz} aria-label="Cycle visualizer style" className="aero-btn-dark px-2 py-1 text-[11px]">
                {VIZ_LABEL[viz]} ↻
              </button>
              <button onClick={toggleFullscreen} aria-label={fullscreen ? "Exit full screen" : "Full screen"} className="aero-btn-dark px-2 py-1 text-[11px]">
                {fullscreen ? "Exit ⤡" : "⤢"}
              </button>
            </div>

            <div
              className={`pointer-events-none absolute inset-x-0 bottom-0 flex items-end gap-3 bg-gradient-to-t from-black/85 to-transparent pt-12 ${
                fullscreen ? "px-10 pb-10" : "px-4 pb-3"
              }`}
            >
              {track.cover && (
                <div className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a small local cover; no optimizer needed */}
                  <img
                    src={track.cover}
                    alt={`${track.title} cover art`}
                    width={fullscreen ? 200 : 76}
                    height={fullscreen ? 200 : 76}
                    className={`${fullscreen ? "h-[200px] w-[200px]" : "h-[76px] w-[76px]"} rounded-[3px] border border-white/30 shadow-[0_6px_18px_rgba(0,0,0,0.7)]`}
                  />
                  {/* a Vista-style reflection under the cover */}
                  {/* eslint-disable-next-line @next/next/no-img-element -- decorative */}
                  <img
                    src={track.cover}
                    alt=""
                    aria-hidden
                    className={`absolute top-full left-0 ${fullscreen ? "h-[200px] w-[200px]" : "h-[76px] w-[76px]"} origin-top -scale-y-100 rounded-[3px] opacity-25 [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.6),transparent_45%)]`}
                  />
                </div>
              )}
              <div className="min-w-0 pb-0.5">
                <p className={`truncate font-semibold text-white drop-shadow ${fullscreen ? "text-[40px]" : "text-lg"}`}>{track.title}</p>
                <p className={`text-[#c9d6e6] ${fullscreen ? "text-[18px]" : "text-[12.5px]"}`}>saeculo</p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="rounded-full border border-white/20 bg-black/40 px-2 py-[1px] text-[#e6eef8]">{track.mood}</span>
                  <span className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-2 py-[1px] text-[#e6eef8]">
                    <BeatLed color={palette.accent} reducedMotion={reducedMotion} />
                    {track.bpm} bpm
                  </span>
                  {total > 0 && <span className="rounded-full border border-white/20 bg-black/40 px-2 py-[1px] font-mono text-[#e6eef8]">{formatTime(total)}</span>}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <ul className="dark-scroll h-full overflow-y-auto p-2" aria-label="Library">
            <li className="grid grid-cols-[2rem_1fr_5.5rem_5.5rem_3rem] px-2 pb-1 text-[11px] text-[#7f93ad] max-sm:grid-cols-[2rem_1fr_3rem]">
              <span>#</span>
              <span>Title</span>
              <span className="max-sm:hidden">Waveform</span>
              <span className="max-sm:hidden">Key</span>
              <span className="text-right">BPM</span>
            </li>
            {TRACKS.map((t, i) => {
              const isCurrent = i === trackIndex;
              const p = paletteFor(t.id);
              return (
                <li key={t.id}>
                  <button
                    onClick={() => (isCurrent && playing ? pause() : selectTrack(i))}
                    className={`grid w-full grid-cols-[2rem_1fr_5.5rem_5.5rem_3rem] items-center px-2 py-1.5 text-left text-[13px] max-sm:grid-cols-[2rem_1fr_3rem] ${
                      isCurrent ? "aero-row-dark-selected text-white" : "aero-row-dark text-[#d7e4f3]"
                    }`}
                  >
                    <span className="text-[#8fb4e0]">{isCurrent && playing ? <Glyph name="play" size={11} /> : i + 1}</span>
                    <span className="flex min-w-0 items-center gap-2">
                      {t.cover && (
                        // eslint-disable-next-line @next/next/no-img-element -- tiny local thumbnail
                        <img src={t.cover} loading="lazy" alt="" width={28} height={28} className="h-7 w-7 shrink-0 rounded-[2px]" />
                      )}
                      <span className="truncate">{t.title}</span>
                    </span>
                    <span className="pr-3 max-sm:hidden">
                      <MiniWave id={t.id} color={p.accent} />
                    </span>
                    <span className="truncate text-[#9fb2c9] max-sm:hidden">{t.mood}</span>
                    <span className="text-right text-[#9fb2c9]">{t.bpm}</span>
                  </button>
                  {isCurrent && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 px-10 pt-0.5 pb-1.5">
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
                      <button
                        onClick={() => void copyLink(t.id)}
                        aria-label={`Copy link to ${t.title}`}
                        className="text-[12px] text-[#9fb2c9] hover:text-white hover:underline"
                      >
                        {copied === t.id ? "Link copied ✓" : "Copy link"}
                      </button>
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
          <div className="min-w-0 flex-1">
            <WaveformSeek palette={palette} reducedMotion={reducedMotion} />
          </div>
          <span className="w-9 font-mono text-[11px] text-[#7f93ad]">{formatTime(total)}</span>
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
