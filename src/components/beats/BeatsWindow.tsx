"use client";

import { useEffect, useState } from "react";
import { usePlayerStore, useCurrentTrack } from "@/components/player/playerStore";
import { useSiteStore } from "@/components/site/siteStore";
import { NextGlyph, PauseGlyph, PlayGlyph, PrevGlyph, RepeatGlyph, ShuffleGlyph, VolumeGlyph } from "@/components/site/Icons";
import { TRACKS, isNew } from "@/data/tracks";
import analysis from "@/data/trackAnalysis.json";
import { formatTime } from "@/lib/audio";
import { trackUrl } from "@/lib/trackLink";
import CoverVisualizer from "./CoverVisualizer";
import { usePalette } from "./palette";
import WaveformSeek from "./WaveformSeek";

const measured = analysis as Record<string, { duration?: number } | undefined>;

// Lengths for the folder view: measured ones first, the rest read from each
// file's header (metadata only, never the audio) when the folder opens.
function useDurations() {
  const [probed, setProbed] = useState<Record<string, number>>({});
  useEffect(() => {
    const probes: HTMLAudioElement[] = [];
    for (const t of TRACKS) {
      if (measured[t.id]?.duration) continue;
      const a = new Audio();
      a.preload = "metadata";
      a.onloadedmetadata = () => setProbed((p) => ({ ...p, [t.id]: a.duration }));
      a.src = t.src;
      probes.push(a);
    }
    return () => probes.forEach((a) => a.removeAttribute("src"));
  }, []);
  return (id: string) => measured[id]?.duration ?? probed[id];
}

function Lcd() {
  const track = useCurrentTrack();
  const index = usePlayerStore((s) => s.trackIndex);
  const playing = usePlayerStore((s) => s.playing);
  const status = usePlayerStore((s) => s.status);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const heldBy = usePlayerStore((s) => s.heldBy);

  const state =
    status === "error"
      ? "FILE UNAVAILABLE"
      : playing && status === "loading"
        ? "LOADING…"
        : playing
          ? "PLAYING"
          : heldBy
            ? "PAUSED FOR GAME"
            : currentTime > 0
              ? "PAUSED"
              : "READY";

  return (
    <div className="lcd flex flex-col gap-0.5 rounded-[3px] px-3 py-2" data-testid="lcd">
      <div className="flex items-baseline justify-between gap-3 text-[15px] leading-none opacity-80">
        <span>
          {String(index + 1).padStart(2, "0")}/{String(TRACKS.length).padStart(2, "0")}
        </span>
        <span aria-live="polite" className={status === "error" ? "text-[#ff8a6a]" : ""}>
          {state}
        </span>
      </div>
      <p className="truncate text-[30px] leading-[1.05]" title={track?.title}>
        {track?.title ?? "—"}
      </p>
      <div className="flex items-baseline justify-between gap-3 text-[17px] leading-none">
        <span className="truncate opacity-75">{[track?.key, track?.bpm ? `${track.bpm} bpm` : ""].filter(Boolean).join(" · ")}</span>
        <span className="shrink-0 tabular-nums">
          {formatTime(currentTime)} / {duration ? formatTime(duration) : "–:––"}
        </span>
      </div>
    </div>
  );
}

function Transport() {
  const playing = usePlayerStore((s) => s.playing);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const repeatOne = usePlayerStore((s) => s.repeatOne);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const { toggle, prev, next, setVolume, toggleMute, toggleRepeat, toggleShuffle } = usePlayerStore.getState();
  const calm = useSiteStore((s) => s.calm);
  const vis = useSiteStore((s) => s.vis);
  const cycleVisuals = useSiteStore((s) => s.cycleVisuals);
  const vol = muted ? 0 : volume;
  const empty = TRACKS.length === 0;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex items-center gap-1.5">
        <button className="deck-btn" aria-label="Previous" onClick={prev} disabled={empty}>
          <PrevGlyph />
        </button>
        <button className="deck-btn deck-btn-main" aria-label={playing ? "Pause" : "Play"} onClick={toggle} disabled={empty} data-testid="deck-play">
          {playing ? <PauseGlyph size={16} /> : <PlayGlyph size={16} />}
        </button>
        <button className="deck-btn" aria-label="Next" onClick={next} disabled={empty}>
          <NextGlyph />
        </button>
        <button
          className="grid h-8 w-8 place-items-center rounded-[3px] text-[#8a8170] hover:text-white aria-pressed:text-[var(--accent)]"
          aria-label="Repeat this beat"
          aria-pressed={repeatOne}
          onClick={toggleRepeat}
          title="Repeat this beat"
        >
          <RepeatGlyph size={15} />
        </button>
        <button
          className="grid h-8 w-8 place-items-center rounded-[3px] text-[#8a8170] hover:text-white aria-pressed:text-[var(--accent)]"
          aria-label="Shuffle"
          aria-pressed={shuffle}
          onClick={toggleShuffle}
          title="Shuffle"
        >
          <ShuffleGlyph size={15} />
        </button>
      </div>
      <div className="flex min-w-[130px] flex-1 items-center gap-2">
        <button className="grid h-7 w-7 place-items-center text-[#cfc6b3] hover:text-white" aria-label={muted ? "Unmute" : "Mute"} onClick={toggleMute}>
          <VolumeGlyph muted={muted || volume === 0} />
        </button>
        <input
          type="range"
          className="deck-range min-w-0 flex-1"
          aria-label="Volume"
          min={0}
          max={1}
          step={0.01}
          value={vol}
          onChange={(e) => setVolume(Number(e.target.value))}
          style={{ ["--fill" as string]: `${vol * 100}%` }}
        />
      </div>
      <button
        className="rounded-[3px] border border-[#3a3733] px-2 py-1 font-lcd text-[16px] leading-none tracking-wide text-[#cfc6b3] hover:border-[#6d6558] hover:text-white"
        onClick={cycleVisuals}
        title="Change the visuals: reveal, scan or still"
      >
        visuals: {calm ? "still" : vis}
      </button>
    </div>
  );
}

function Folder() {
  const index = usePlayerStore((s) => s.trackIndex);
  const playing = usePlayerStore((s) => s.playing);
  const failed = usePlayerStore((s) => s.failed);
  const selectTrack = usePlayerStore((s) => s.selectTrack);
  const toggle = usePlayerStore((s) => s.toggle);
  const lengthOf = useDurations();

  if (!TRACKS.length) {
    return (
      <div className="grid flex-1 place-items-center p-6 text-center text-mute">
        <div className="max-w-xs space-y-2">
          <p className="text-[14px] text-ink">This folder is empty.</p>
          <p>New beats go in public/audio/ and get listed in src/data/tracks.ts.</p>
        </div>
      </div>
    );
  }

  return (
    <ol className="min-h-0 flex-1 overflow-y-auto p-1" aria-label="Beats">
      {TRACKS.map((t, i) => {
        const current = i === index;
        const bad = failed.includes(t.id);
        const len = lengthOf(t.id);
        return (
          <li key={t.id}>
            <button
              className="track-row"
              aria-current={current}
              data-testid={`track-${t.id}`}
              onClick={() => (current ? toggle() : selectTrack(i))}
              aria-label={`${t.title}${current ? (playing ? ", playing" : ", selected") : ""}${bad ? ", file unavailable" : ""}`}
            >
              {t.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.cover} alt="" width={34} height={34} loading="lazy" className="h-[34px] w-[34px] object-cover shadow-[0_0_0_1px_rgba(0,0,0,0.4)]" />
              ) : (
                <span className="h-[34px] w-[34px] bg-[#2a2622]" />
              )}
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className={`truncate text-[14px] ${current ? "font-bold" : ""}`}>{t.title}</span>
                  {current && playing && (
                    <span className="eq-bars" aria-hidden>
                      <i />
                      <i />
                      <i />
                    </span>
                  )}
                  {isNew(t) && <span className="bg-amber px-1 text-[10px] font-bold text-ink uppercase">new</span>}
                </span>
                <span className={`block truncate text-[12px] ${current ? "text-white/75" : "text-mute"}`}>
                  {bad ? "file unavailable" : [t.key, t.bpm ? `${t.bpm} bpm` : ""].filter(Boolean).join(" · ") || "mp3"}
                </span>
              </span>
              <span className={`font-mono text-[12px] tabular-nums ${current ? "text-white/80" : "text-mute"}`}>{len ? formatTime(len) : "–:––"}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export default function BeatsWindow() {
  const track = useCurrentTrack();
  const palette = usePalette(track?.cover);
  const calm = useSiteStore((s) => s.calm);
  const vis = useSiteStore((s) => s.vis);
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    if (!track) return;
    try {
      await navigator.clipboard.writeText(trackUrl(track.id));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="deck bevel-in flex shrink-0 flex-col gap-3 p-3 sm:flex-row"
        style={{ ["--accent" as string]: palette.accent, ["--accent-2" as string]: palette.second }}
      >
        <div className="mx-auto aspect-square w-[min(62vw,240px)] shrink-0 overflow-hidden bg-black shadow-[0_0_0_1px_#000,0_6px_18px_rgba(0,0,0,0.6)] sm:mx-0 sm:w-[212px]">
          <CoverVisualizer track={track} palette={palette} calm={calm} mode={vis} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
          <Lcd />
          <WaveformSeek track={track} accent={palette.accent} />
          <Transport />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 px-1 pt-2 pb-1 text-[12px]">
        <span className="text-mute">Address</span>
        <span className="bevel-field flex-1 truncate px-2 py-0.5 font-mono text-[12px]">C:\music\beats</span>
      </div>
      <div className="bevel-field mx-1 flex min-h-[132px] flex-1 flex-col">
        <Folder />
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2 px-1 pt-1 text-[12px] text-mute">
        <span>
          {TRACKS.length} {TRACKS.length === 1 ? "beat" : "beats"}
        </span>
        {track && (
          <span className="flex items-center gap-3">
            <button
              className="underline decoration-dotted underline-offset-2 hover:text-ink"
              onClick={() => useSiteStore.getState().sampleInStudio(track.id, usePlayerStore.getState().currentTime)}
              title="Take the two bars playing now into the studio, in the game"
              data-testid="sample-this"
            >
              sample this
            </button>
            <button className="underline decoration-dotted underline-offset-2 hover:text-ink" onClick={copyLink}>
              {copied ? "link copied" : "copy link"}
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
