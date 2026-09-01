"use client";

import { TRACKS } from "@/data/tracks";
import { formatTime } from "@/lib/audio";
import { usePlayer } from "@/components/site/usePlayer";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import Waveform from "@/components/site/Waveform";

export default function SaeculoApp() {
  const {
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
  } = usePlayer();
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className="flex h-full flex-col gap-3">
      <audio
        ref={audioRef}
        src={track.src}
        preload="none"
        loop
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />

      {/* now playing marquee */}
      <div className="deck-panel-recessed overflow-hidden px-2 py-1.5">
        <p className="font-readout animate-marquee text-signal text-base whitespace-nowrap">
          {playing ? "▸" : "II"} saeculo — {track.title} ({track.bpm} bpm · {track.mood})
          &nbsp;&nbsp;&nbsp;*** placeholder beat — real instrumentals coming soon ***
        </p>
      </div>

      <div className="deck-panel-recessed">
        <Waveform analyserRef={analyserRef} active={playing} reducedMotion={reducedMotion} />
      </div>

      {/* seek */}
      <div className="flex items-center gap-2">
        <span className="font-readout w-10 text-right text-sm text-signal">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={(e) => onSeek(Number(e.target.value))}
          aria-label="Seek"
          className="signal-range flex-1"
        />
        <span className="font-readout w-10 text-sm text-signal/60">{formatTime(duration)}</span>
      </div>

      {/* transport */}
      <div className="flex items-center justify-center gap-2">
        <button onClick={prev} aria-label="Previous track" className="deck-button h-9 w-10 text-sm">
          «
        </button>
        {playing ? (
          <button onClick={pause} aria-label="Pause" className="deck-button h-9 w-16 text-sm">
            II
          </button>
        ) : (
          <button onClick={play} aria-label="Play" className="deck-button h-9 w-16 text-sm">
            ▸
          </button>
        )}
        <button onClick={next} aria-label="Next track" className="deck-button h-9 w-10 text-sm">
          »
        </button>
        <div className="ml-3 flex items-center gap-1.5">
          <span aria-hidden className="text-xs text-signal">
            vol
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Volume"
            className="signal-range w-20"
          />
        </div>
      </div>

      {/* tracklist */}
      <div className="deck-panel-recessed min-h-0 flex-1 overflow-y-auto">
        <ul>
          {TRACKS.map((t, i) => {
            const isCurrent = i === trackIndex;
            const isPlaying = isCurrent && playing;
            return (
              <li key={t.id}>
                <button
                  onClick={() => (isPlaying ? pause() : selectTrack(i))}
                  className="group flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left hover:bg-signal/10 focus-visible:bg-signal/10 focus:outline-none"
                >
                  <span
                    className={`font-readout flex h-6 w-8 shrink-0 -rotate-2 items-center justify-center rounded-[2px] text-sm transition-colors ${
                      isPlaying ? "bg-signal text-void" : "tape-label group-hover:rotate-0"
                    }`}
                    aria-hidden
                  >
                    {isPlaying ? "▸" : (i + 1).toString().padStart(2, "0")}
                  </span>
                  <span
                    className={`font-body flex-1 truncate text-base ${
                      isCurrent ? "text-signal" : "text-ink"
                    }`}
                  >
                    {t.title}
                  </span>
                  <span className="font-readout text-sm text-mute">{t.bpm}bpm</span>
                </button>
                {isCurrent && (
                  <div className="flex gap-3 px-2.5 pb-1.5 pl-11">
                    {t.streamingLinks.map((link) => (
                      <a
                        key={link.label}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-readout text-bleed text-sm underline decoration-dotted hover:text-signal"
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
      </div>
    </div>
  );
}
