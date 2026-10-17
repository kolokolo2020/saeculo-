"use client";

import { useEffect, useRef } from "react";
import { ALBUM } from "@/data/tracks";
import { savePosition, usePlayerStore, useCurrentTrack } from "./playerStore";

// The session's single <audio> element. Mounted once by the site and
// never unmounted, so playback survives every window opening and closing.
// src is managed imperatively by the store — rendering it as a prop would
// make React re-set the attribute after selectTrack() already did, which
// restarts the load and aborts the pending play().
export default function AudioEngine() {
  const ref = useRef<HTMLAudioElement>(null);
  const playing = usePlayerStore((s) => s.playing);
  const loop = usePlayerStore((s) => s.loop);
  const track = useCurrentTrack();
  const lastSave = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    usePlayerStore.getState().attach(el);
    return () => usePlayerStore.getState().detach(el);
  }, []);

  // Lock-screen / notification controls with the cover art, on phones and
  // in desktop browsers' media hubs.
  useEffect(() => {
    if (!("mediaSession" in navigator) || !track) return;
    const session = navigator.mediaSession;
    session.metadata = new MediaMetadata({
      title: track.title,
      artist: "saeculo",
      album: ALBUM.title,
      artwork: [{ src: new URL(ALBUM.coverJpg, window.location.href).href, sizes: "1200x1200", type: "image/jpeg" }],
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

  // A loop jumps back on time: checked every frame while it plays (timeupdate
  // only fires a few times a second), and on timeupdate in a background tab.
  useEffect(() => {
    const el = ref.current;
    if (!el || !loop || !playing) return;
    let id = 0;
    const tick = () => {
      if (el.currentTime >= loop.end) el.currentTime = loop.start;
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [loop, playing]);

  // where you left off: saved every few seconds, on pause and on leaving
  useEffect(() => {
    window.addEventListener("pagehide", savePosition);
    return () => window.removeEventListener("pagehide", savePosition);
  }, []);

  const sync = usePlayerStore((s) => s.sync);

  return (
    <audio
      ref={ref}
      preload="metadata"
      data-testid="player-audio"
      onPlay={(e) => {
        // nothing starts the site's music under the game (a media key, say): it waits its turn
        if (usePlayerStore.getState().heldBy) {
          e.currentTarget.pause();
          usePlayerStore.setState({ resumeOnRelease: true });
        } else sync({ playing: true });
      }}
      onPause={() => {
        sync({ playing: false });
        savePosition();
      }}
      onLoadStart={() => sync({ status: "loading" })}
      onWaiting={() => sync({ status: "loading" })}
      onCanPlay={() => sync({ status: "ready" })}
      onPlaying={() => sync({ status: "ready" })}
      onError={() => usePlayerStore.getState().markFailed()}
      onTimeUpdate={(e) => {
        const el = e.currentTarget;
        const { loop: l } = usePlayerStore.getState();
        if (l && el.currentTime >= l.end) el.currentTime = l.start;
        sync({ currentTime: el.currentTime });
        if (Date.now() - lastSave.current > 5000) {
          lastSave.current = Date.now();
          savePosition();
        }
      }}
      onLoadedMetadata={(e) => sync({ duration: e.currentTarget.duration, status: "ready" })}
      onEnded={() => usePlayerStore.getState().ended()}
    />
  );
}
