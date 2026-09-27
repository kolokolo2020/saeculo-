"use client";

import { useEffect, useRef } from "react";
import { usePlayerStore, useCurrentTrack } from "./playerStore";

// The session's single <audio> element. Mounted once by the desktop and
// never unmounted, so playback survives every window opening and closing.
// src is managed imperatively by the store — rendering it as a prop would
// make React re-set the attribute after selectTrack() already did, which
// restarts the load and aborts the pending play().
export default function AudioEngine() {
  const ref = useRef<HTMLAudioElement>(null);
  const repeatOne = usePlayerStore((s) => s.repeatOne);
  const playing = usePlayerStore((s) => s.playing);
  const track = useCurrentTrack();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    usePlayerStore.getState().attach(el);
    return () => usePlayerStore.getState().detach(el);
  }, []);

  // Lock-screen / notification controls with the cover art, on phones and
  // in desktop browsers' media hubs.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const session = navigator.mediaSession;
    const cover = track.cover ? new URL(track.cover, window.location.href).href : undefined;
    session.metadata = new MediaMetadata({
      title: track.title,
      artist: "saeculo",
      artwork: cover ? [{ src: cover, sizes: "640x640", type: "image/jpeg" }] : [],
    });
  }, [track]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = playing ? "playing" : "paused";
  }, [playing]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const session = navigator.mediaSession;
    const store = usePlayerStore.getState;
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => store().play()],
      ["pause", () => store().pause()],
      ["previoustrack", () => store().prev()],
      ["nexttrack", () => store().next()],
      ["seekto", (d) => d.seekTime !== undefined && store().seek(d.seekTime)],
    ];
    for (const [action, handler] of handlers) {
      try {
        session.setActionHandler(action, handler);
      } catch {
        // action not supported by this browser
      }
    }
    return () => {
      for (const [action] of handlers) {
        try {
          session.setActionHandler(action, null);
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const sync = usePlayerStore((s) => s.sync);

  return (
    <audio
      ref={ref}
      preload="metadata"
      loop={repeatOne}
      data-testid="player-audio"
      onPlay={() => sync({ playing: true })}
      onPause={() => sync({ playing: false })}
      onTimeUpdate={(e) => sync({ currentTime: e.currentTarget.currentTime })}
      onLoadedMetadata={(e) => sync({ duration: e.currentTarget.duration })}
      onEnded={() => {
        if (!usePlayerStore.getState().repeatOne) usePlayerStore.getState().next();
      }}
    />
  );
}
