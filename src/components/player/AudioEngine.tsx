"use client";

import { useEffect, useRef } from "react";
import { usePlayerStore } from "./playerStore";

// The session's single <audio> element. Mounted once by the desktop and
// never unmounted, so playback survives every window opening and closing.
// src is managed imperatively by the store — rendering it as a prop would
// make React re-set the attribute after selectTrack() already did, which
// restarts the load and aborts the pending play().
export default function AudioEngine() {
  const ref = useRef<HTMLAudioElement>(null);
  const repeatOne = usePlayerStore((s) => s.repeatOne);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    usePlayerStore.getState().attach(el);
    return () => usePlayerStore.getState().detach(el);
  }, []);

  const sync = usePlayerStore((s) => s.sync);

  return (
    <audio
      ref={ref}
      preload="none"
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
