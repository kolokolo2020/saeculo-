"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TRACKS } from "@/data/tracks";
import { formatTime } from "@/lib/audio";
import Visualizer from "./Visualizer";
import { useAudioAnalyser } from "./useAudioAnalyser";

export default function MusicPlayerApp() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { ensureGraph, analyserRef } = useAudioAnalyser(audioRef);
  const [trackIndex, setTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);

  const track = TRACKS[trackIndex];

  const play = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    ensureGraph();
    void el.play();
  }, [ensureGraph]);

  const pause = useCallback(() => audioRef.current?.pause(), []);

  const selectTrack = useCallback(
    (index: number) => {
      const el = audioRef.current;
      if (!el) return;
      setTrackIndex(index);
      el.src = TRACKS[index].src;
      el.load();
      ensureGraph();
      void el.play();
    },
    [ensureGraph],
  );

  const next = useCallback(
    () => selectTrack((trackIndex + 1) % TRACKS.length),
    [selectTrack, trackIndex],
  );
  const prev = useCallback(
    () => selectTrack((trackIndex - 1 + TRACKS.length) % TRACKS.length),
    [selectTrack, trackIndex],
  );

  useEffect(() => {
    const el = audioRef.current;
    if (el) el.volume = volume;
  }, [volume]);

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = audioRef.current;
    if (!el || !Number.isFinite(el.duration)) return;
    el.currentTime = Number(e.target.value);
  };

  return (
    <div className="flex h-full flex-col gap-3 bg-[#1a1a24] p-3">
      <audio
        ref={audioRef}
        src={track.src}
        loop
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />

      {/* now playing marquee */}
      <div className="bevel-in overflow-hidden bg-[#0a0a14] px-2 py-1.5">
        <p className="font-pixel animate-marquee whitespace-nowrap text-[10px] text-[#00e5a0]">
          {playing ? "▶" : "❚❚"} saeculo — {track.title} ({track.bpm} bpm · {track.mood})
          &nbsp;&nbsp;&nbsp;*** placeholder beat — real instrumentals coming soon ***
        </p>
      </div>

      <Visualizer analyserRef={analyserRef} active={playing} />

      {/* seek */}
      <div className="flex items-center gap-2">
        <span className="font-pixel w-10 text-right text-[9px] text-[#00e5a0]">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={onSeek}
          aria-label="Seek"
          className="retro-range flex-1"
        />
        <span className="font-pixel w-10 text-[9px] text-[#00e5a0]/60">
          {formatTime(duration)}
        </span>
      </div>

      {/* transport */}
      <div className="flex items-center justify-center gap-2">
        <button onClick={prev} aria-label="Previous track" className="transport-btn">⏮</button>
        {playing ? (
          <button onClick={pause} aria-label="Pause" className="transport-btn w-16">❚❚</button>
        ) : (
          <button onClick={play} aria-label="Play" className="transport-btn w-16">▶</button>
        )}
        <button onClick={next} aria-label="Next track" className="transport-btn">⏭</button>
        <div className="ml-3 flex items-center gap-1.5">
          <span aria-hidden className="text-xs text-[#00e5a0]">🔊</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Volume"
            className="retro-range w-20"
          />
        </div>
      </div>

      {/* tracklist */}
      <div className="bevel-in min-h-0 flex-1 overflow-y-auto bg-[#0a0a14]">
        <ul>
          {TRACKS.map((t, i) => (
            <li key={t.id}>
              <button
                onClick={() => (i === trackIndex && playing ? pause() : selectTrack(i))}
                className={`font-body flex w-full items-baseline gap-2 px-2.5 py-1.5 text-left text-base hover:bg-[#00e5a0]/15 focus-visible:bg-[#00e5a0]/15 focus:outline-none ${
                  i === trackIndex ? "text-[#00e5a0]" : "text-[#9aa0b0]"
                }`}
              >
                <span className="font-pixel text-[8px]">
                  {i === trackIndex && playing ? "▶" : `${(i + 1).toString().padStart(2, "0")}.`}
                </span>
                <span className="flex-1 truncate">{t.title}</span>
                <span className="text-sm opacity-60">{t.bpm}bpm</span>
              </button>
              {i === trackIndex && (
                <div className="flex gap-3 px-2.5 pb-1.5 pl-8">
                  {t.streamingLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-pixel text-[8px] text-[#ff2d78] underline decoration-dotted hover:text-[#ffe600]"
                    >
                      {link.label} ↗
                    </a>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
