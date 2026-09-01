"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TRACKS } from "@/data/tracks";
import { useAudioAnalyser } from "@/hooks/useAudioAnalyser";

// One audio element lives at the top of the site (see Site.tsx) so the hero
// waveform and the beats list always reflect the same, single source of
// playback — there is only ever one thing playing at a time.
export function usePlayer() {
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

  const onSeek = useCallback((value: number) => {
    const el = audioRef.current;
    if (!el || !Number.isFinite(el.duration)) return;
    el.currentTime = value;
  }, []);

  return {
    audioRef,
    analyserRef,
    track,
    trackIndex,
    playing,
    currentTime,
    duration,
    volume,
    setVolume,
    play,
    pause,
    selectTrack,
    next,
    prev,
    onSeek,
    setPlaying,
    setCurrentTime,
    setDuration,
  };
}

export type Player = ReturnType<typeof usePlayer>;
