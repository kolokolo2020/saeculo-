"use client";

import { useEffect, useState } from "react";
import { usePlayerStore, useCurrentTrack } from "@/components/player/playerStore";
import { useSiteStore } from "@/components/site/siteStore";
import { NextGlyph, PauseGlyph, PlayGlyph, PrevGlyph, RepeatGlyph, ShuffleGlyph, VolumeGlyph } from "@/components/site/Icons";
import { ALBUM, TRACKS, isNew } from "@/data/tracks";
import analysis from "@/data/trackAnalysis.json";
import { formatTime } from "@/lib/audio";
import { trackUrl } from "@/lib/trackLink";
import Visualizer from "./Visualizer";
import WaveformSeek from "./WaveformSeek";

// The Beats window: a 2007 media player in night-blue glass. The album
// cover (one for every beat) with its reflection, what's playing, the
// wordmark visualizer, the waveform seek bar, the transport with its big
// round play button, and the tracklist.

const ACCENT = "#4fe3ff";
const ACCENT_2 = "#a98bff";
const measured = analysis as Record<string, { duration?: number } | undefined>;

// Lengths for the tracklist: measured ones first, the rest read from each
// file's header (metadata only, never the audio) when the window opens.
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

const meta = (t: { key?: string; bpm?: number }) => [t.key, t.bpm ? `${t.bpm} bpm` : ""].filter(Boolean).join(" · ");

function NowPlaying() {
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
    <div className="flex min-w-0 flex-col gap-0.5" data-testid="lcd">
      <p className="flex items-center justify-between gap-3 text-[11px] tracking-[0.18em] uppercase">
        <span className="truncate text-[#7fdcff]">
          {ALBUM.title} · {String(index + 1).padStart(2, "0")}/{String(TRACKS.length).padStart(2, "0")}
        </span>
        <span aria-live="polite" className={`shrink-0 ${status === "error" ? "text-[#ffb36b]" : "text-white/55"}`}>
          {state}
        </span>
      </p>
      <p className="truncate text-[26px] leading-tight font-light text-white sm:text-[30px]" title={track?.title}>
        {track?.title ?? "—"}
      </p>
      <p className="flex items-baseline justify-between gap-3 text-[13px] text-white/60">
        <span className="truncate">{track ? meta(track) : ""}</span>
        <span className="shrink-0 font-mono text-[12px] text-white/80 tabular-nums">
          {formatTime(currentTime)} / {duration ? formatTime(duration) : "–:––"}
        </span>
      </p>
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
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <div className="flex items-center gap-0.5">
        <button className="mp-icon" aria-label="Shuffle" aria-pressed={shuffle} onClick={toggleShuffle} title="Shuffle">
          <ShuffleGlyph size={15} />
        </button>
        <button className="mp-icon" aria-label="Repeat this beat" aria-pressed={repeatOne} onClick={toggleRepeat} title="Repeat this beat">
          <RepeatGlyph size={15} />
        </button>
        <button className="mp-chip ml-1 hidden sm:inline-flex" onClick={cycleVisuals} title="Change the visuals: led, wave or still">
          visuals: {calm ? "still" : vis}
        </button>
      </div>
      <div className="flex items-center">
        <button className="mp-skip mp-skip-l" aria-label="Previous" onClick={prev} disabled={empty}>
          <PrevGlyph size={14} />
        </button>
        <button className="mp-play" aria-label={playing ? "Pause" : "Play"} onClick={toggle} disabled={empty} data-testid="deck-play">
          {playing ? <PauseGlyph size={20} /> : <PlayGlyph size={20} />}
        </button>
        <button className="mp-skip mp-skip-r" aria-label="Next" onClick={next} disabled={empty}>
          <NextGlyph size={14} />
        </button>
      </div>
      <div className="flex min-w-0 items-center justify-end gap-1.5">
        <button className="mp-icon" aria-label={muted ? "Unmute" : "Mute"} onClick={toggleMute}>
          <VolumeGlyph muted={muted || volume === 0} />
        </button>
        <input
          type="range"
          className="mp-range hidden w-full max-w-[110px] min-w-0 sm:block"
          aria-label="Volume"
          min={0}
          max={1}
          step={0.01}
          value={vol}
          onChange={(e) => setVolume(Number(e.target.value))}
          style={{ ["--fill" as string]: `${vol * 100}%` }}
        />
      </div>
      <button className="mp-chip col-span-3 inline-flex justify-self-center sm:hidden" onClick={cycleVisuals} title="Change the visuals: led, wave or still">
        visuals: {calm ? "still" : vis}
      </button>
    </div>
  );
}

function Tracklist({ lengthOf }: { lengthOf: (id: string) => number | undefined }) {
  const index = usePlayerStore((s) => s.trackIndex);
  const playing = usePlayerStore((s) => s.playing);
  const failed = usePlayerStore((s) => s.failed);
  const selectTrack = usePlayerStore((s) => s.selectTrack);
  const toggle = usePlayerStore((s) => s.toggle);

  if (!TRACKS.length) {
    return (
      <div className="grid flex-1 place-items-center p-6 text-center text-white/60">
        <div className="max-w-xs space-y-2">
          <p className="text-[14px] text-white">This album is empty.</p>
          <p>New beats go in public/audio/ and get listed in src/data/tracks.ts.</p>
        </div>
      </div>
    );
  }

  return (
    <ol className="min-h-0 flex-1 overflow-y-auto py-1" aria-label="Beats">
      {TRACKS.map((t, i) => {
        const current = i === index;
        const bad = failed.includes(t.id);
        const len = lengthOf(t.id);
        return (
          <li key={t.id}>
            <button className="mp-row" aria-current={current} data-testid={`track-${t.id}`} onClick={() => (current ? toggle() : selectTrack(i))}>
              <span className="text-right font-mono text-[12px] text-white/45 tabular-nums">
                {current && playing ? (
                  <span className="eq-bars text-[#4fe3ff]" aria-hidden>
                    <i />
                    <i />
                    <i />
                  </span>
                ) : (
                  i + 1
                )}
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <span className={`truncate text-[14px] ${current ? "text-white" : "text-white/85"}`}>{t.title}</span>
                {current && <span className="sr-only">{playing ? ", playing" : ", selected"}</span>}
                {isNew(t) && <span className="rounded-[2px] bg-[#4fe3ff] px-1 text-[10px] font-bold text-[#04121c] uppercase">new</span>}
              </span>
              <span className={`hidden truncate text-[12px] sm:block ${bad ? "text-[#ffb36b]" : "text-white/50"}`}>{bad ? "file unavailable" : t.key ?? ""}</span>
              <span className={`text-right text-[12px] sm:hidden ${bad ? "text-[#ffb36b]" : "text-white/50"}`}>{bad ? "unavailable" : t.bpm ? `${t.bpm} bpm` : ""}</span>
              <span className="hidden text-right font-mono text-[12px] text-white/50 tabular-nums sm:block">{t.bpm ?? ""}</span>
              <span className="text-right font-mono text-[12px] text-white/70 tabular-nums">{len ? formatTime(len) : "–:––"}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export default function BeatsWindow() {
  const track = useCurrentTrack();
  const calm = useSiteStore((s) => s.calm);
  const vis = useSiteStore((s) => s.vis);
  const lengthOf = useDurations();
  const [copied, setCopied] = useState(false);
  const total = TRACKS.reduce((sum, t) => sum + (lengthOf(t.id) ?? 0), 0);

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
    <div className="mp flex min-h-0 flex-1 flex-col font-vista" style={{ ["--accent" as string]: ACCENT, ["--accent-2" as string]: ACCENT_2 }}>
      <div className="mp-stage grid shrink-0 grid-cols-[92px_minmax(0,1fr)] gap-x-3 gap-y-2.5 p-3 sm:h-[208px] sm:grid-cols-[184px_minmax(0,1fr)] sm:grid-rows-[auto_minmax(0,1fr)] sm:gap-x-4">
        <div className="mp-cover sm:row-span-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ALBUM.cover} alt={`${ALBUM.title}: the album cover`} width={184} height={184} className="block h-full w-full object-cover" />
        </div>
        <div className="flex min-w-0 flex-col justify-center">
          <NowPlaying />
        </div>
        <div className="mp-screen col-span-2 h-[88px] sm:col-span-1 sm:col-start-2 sm:h-auto">
          <Visualizer mode={vis} still={calm} />
        </div>
      </div>

      <div className="mp-deck flex shrink-0 flex-col gap-2 px-3 pt-2.5 pb-3">
        <WaveformSeek track={track} accent={ACCENT} accent2={ACCENT_2} rest="#25304a" />
        <Transport />
      </div>

      <div className="mp-list flex min-h-[120px] flex-1 flex-col">
        <div className="mp-row mp-head" aria-hidden>
          <span className="text-right">#</span>
          <span>title</span>
          <span className="hidden sm:block">key</span>
          <span className="text-right sm:hidden">tempo</span>
          <span className="hidden text-right sm:block">bpm</span>
          <span className="text-right">time</span>
        </div>
        <Tracklist lengthOf={lengthOf} />
      </div>
      <div className="mp-foot flex shrink-0 items-center justify-between gap-2 px-3 py-1.5 text-[12px] text-white/55">
        <span>
          {TRACKS.length} {TRACKS.length === 1 ? "beat" : "beats"}
          {total > 0 ? ` · ${formatTime(total)}` : ""}
        </span>
        {track && (
          <span className="flex items-center gap-3">
            <button
              className="underline decoration-dotted underline-offset-2 hover:text-white"
              onClick={() => useSiteStore.getState().sampleInStudio(track.id, usePlayerStore.getState().currentTime)}
              title="Take the two bars playing now into the studio, in the game"
              data-testid="sample-this"
            >
              sample this
            </button>
            <button className="underline decoration-dotted underline-offset-2 hover:text-white" onClick={copyLink}>
              {copied ? "link copied" : "copy link"}
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
