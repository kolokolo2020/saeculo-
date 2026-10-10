"use client";

import { useEffect, useState } from "react";
import { usePlayerStore, useCurrentTrack } from "@/components/player/playerStore";
import { useSiteStore } from "@/components/site/siteStore";
import { NextGlyph, PauseGlyph, PlayGlyph, PrevGlyph, RepeatGlyph, ShuffleGlyph, VolumeGlyph } from "@/components/site/Icons";
import { ALBUM, TRACKS, isNew } from "@/data/tracks";
import analysis from "@/data/trackAnalysis.json";
import { formatTime } from "@/lib/audio";
import { trackUrl } from "@/lib/trackLink";
import WaveformSeek from "./WaveformSeek";

// The Beats window: the album's cover (one for every beat) as the hero,
// what's playing, the waveform seek bar, the transport and the tracklist,
// on the desktop's paper. Nothing animates but the playing row's bars.

// the dusk blue of the theme, easing into the lilac of the cover's rays
const ACCENT = "#3d5a8a";
const ACCENT_2 = "#6c5fa6";
const REST = "#c9c0ae";
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
  const tone = status === "error" ? "text-rust" : playing ? "text-dusk" : "text-ink-2";
  return (
    <div className="flex min-w-0 flex-col gap-1" data-testid="lcd">
      <p className="flex items-center justify-between gap-3 text-[11px] font-medium tracking-[0.16em] text-ink-2 uppercase">
        <span className="truncate">
          {ALBUM.title} · {String(index + 1).padStart(2, "0")}/{String(TRACKS.length).padStart(2, "0")}
        </span>
        <span aria-live="polite" className={`flex shrink-0 items-center gap-1.5 ${tone}`}>
          {playing && status !== "error" && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
          {state}
        </span>
      </p>
      <p className="mp-title truncate text-[30px] leading-[1.15] font-light tracking-[-0.01em] sm:text-[34px]" title={track?.title}>
        {track?.title ?? "—"}
      </p>
      <p className="truncate text-[14px] text-ink-2">{track ? meta(track) || " " : " "}</p>
    </div>
  );
}

function Times() {
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  return (
    <p className="mp-time flex justify-between tabular-nums" aria-hidden>
      <span>{formatTime(currentTime)}</span>
      <span className="text-ink-2">{duration ? formatTime(duration) : "–:––"}</span>
    </p>
  );
}

function Transport() {
  const playing = usePlayerStore((s) => s.playing);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const repeatOne = usePlayerStore((s) => s.repeatOne);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const { toggle, prev, next, setVolume, toggleMute, toggleRepeat, toggleShuffle } = usePlayerStore.getState();
  const vol = muted ? 0 : volume;
  const empty = TRACKS.length === 0;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <div className="flex items-center gap-1">
        <button className="mp-icon" aria-label="Shuffle" aria-pressed={shuffle} onClick={toggleShuffle} title="Shuffle">
          <ShuffleGlyph size={16} />
        </button>
        <button className="mp-icon" aria-label="Repeat this beat" aria-pressed={repeatOne} onClick={toggleRepeat} title="Repeat this beat">
          <RepeatGlyph size={16} />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button className="mp-skip" aria-label="Previous" onClick={prev} disabled={empty}>
          <PrevGlyph size={16} />
        </button>
        <button className="mp-play" aria-label={playing ? "Pause" : "Play"} onClick={toggle} disabled={empty} data-testid="deck-play">
          {playing ? <PauseGlyph size={20} /> : <PlayGlyph size={20} className="translate-x-[1px]" />}
        </button>
        <button className="mp-skip" aria-label="Next" onClick={next} disabled={empty}>
          <NextGlyph size={16} />
        </button>
      </div>
      <div className="flex min-w-0 items-center justify-end gap-1">
        <button className="mp-icon" aria-label={muted ? "Unmute" : "Mute"} onClick={toggleMute}>
          <VolumeGlyph muted={muted || volume === 0} size={16} />
        </button>
        <input
          type="range"
          className="mp-range hidden w-full max-w-[104px] min-w-0 sm:block"
          aria-label="Volume"
          min={0}
          max={1}
          step={0.01}
          value={vol}
          onChange={(e) => setVolume(Number(e.target.value))}
          style={{ ["--fill" as string]: `${vol * 100}%` }}
        />
      </div>
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
      <div className="grid flex-1 place-items-center p-6 text-center text-ink-2">
        <div className="max-w-xs space-y-2">
          <p className="text-[14px] text-ink">This album is empty.</p>
          <p>New beats go in public/audio/ and get listed in src/data/tracks.ts.</p>
        </div>
      </div>
    );
  }

  return (
    <ol className="min-h-0 flex-1 overflow-y-auto" aria-label="Beats">
      {TRACKS.map((t, i) => {
        const current = i === index;
        const bad = failed.includes(t.id);
        const len = lengthOf(t.id);
        return (
          <li key={t.id}>
            <button className="mp-row" aria-current={current} data-testid={`track-${t.id}`} onClick={() => (current ? toggle() : selectTrack(i))}>
              <span className="text-right font-mono text-[12px] text-ink-2 tabular-nums">
                {current && playing ? (
                  <span className="eq-bars text-dusk" aria-hidden>
                    <i />
                    <i />
                    <i />
                  </span>
                ) : (
                  i + 1
                )}
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <span className={`truncate text-[14.5px] ${current ? "font-medium" : ""}`}>{t.title}</span>
                {current && <span className="sr-only">{playing ? ", playing" : ", selected"}</span>}
                {isNew(t) && <span className="mp-new">new</span>}
              </span>
              <span className={`hidden truncate text-[12.5px] sm:block ${bad ? "text-rust" : "text-ink-2"}`}>{bad ? "file unavailable" : t.key ?? ""}</span>
              <span className={`text-right text-[12.5px] sm:hidden ${bad ? "text-rust" : "text-ink-2"}`}>{bad ? "unavailable" : t.bpm ? `${t.bpm} bpm` : ""}</span>
              <span className="hidden text-right font-mono text-[12px] text-ink-2 tabular-nums sm:block">{t.bpm ?? ""}</span>
              <span className="text-right font-mono text-[12px] tabular-nums">{len ? formatTime(len) : "–:––"}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export default function BeatsWindow() {
  const track = useCurrentTrack();
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
    <div className="mp flex min-h-0 flex-1 flex-col overflow-y-auto" style={{ ["--accent" as string]: ACCENT }}>
      <div className="mp-hero flex shrink-0 flex-col items-center gap-4 px-4 pt-5 pb-4 sm:flex-row sm:items-stretch sm:gap-6 sm:p-5">
        <div className="mp-cover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ALBUM.cover} alt={`${ALBUM.title}: the album cover`} width={464} height={464} className="block h-full w-full object-cover" data-testid="cover" />
        </div>
        <div className="flex w-full min-w-0 flex-1 flex-col justify-between gap-4 sm:py-0.5">
          <NowPlaying />
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1.5">
              <WaveformSeek track={track} accent={ACCENT} accent2={ACCENT_2} rest={REST} />
              <Times />
            </div>
            <Transport />
          </div>
        </div>
      </div>

      <div className="mp-list flex min-h-[176px] flex-1 flex-col">
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
      <div className="mp-foot sticky bottom-0 flex shrink-0 items-center justify-between gap-2 px-4 py-2 text-[12.5px]">
        <span>
          {TRACKS.length} {TRACKS.length === 1 ? "beat" : "beats"}
          {total > 0 ? ` · ${formatTime(total)}` : ""}
        </span>
        {track && (
          <span className="flex items-center gap-4">
            <button
              className="mp-link"
              onClick={() => useSiteStore.getState().sampleInStudio(track.id, usePlayerStore.getState().currentTime)}
              title="Take the two bars playing now into the studio, in the game"
              data-testid="sample-this"
            >
              sample this
            </button>
            <button className="mp-link" onClick={copyLink}>
              {copied ? "link copied" : "copy link"}
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
