import type { Track } from "@/lib/types";
import analysis from "./trackAnalysis.json";

// The tracks in the media player (and Beat Deck's chops).
//
// `tempo` and `beatOffset` come from the audio files themselves, measured by
// scripts/analyze-tracks.mjs (hi-hat grid, phase stable to ~5ms across each
// whole track) along with the waveform and the cover palette. After adding
// or replacing a track, run: node scripts/analyze-tracks.mjs
const measured = analysis as Record<string, { tempo: number; beatOffset: number }>;
const SPOTIFY = "https://open.spotify.com/artist/20rwZAautzWKkxjkYA9sfg";
const SOUNDCLOUD = "https://soundcloud.com/saeculo";
const YOUTUBE = "https://www.youtube.com/@saeculo";

const LINKS = [
  { label: "Spotify", url: SPOTIFY },
  { label: "SoundCloud", url: SOUNDCLOUD },
  { label: "YouTube", url: YOUTUBE },
];

export const TRACKS: Track[] = [
  {
    id: "care4me",
    title: "care4me",
    bpm: 143,
    mood: "F major",
    cover: "/covers/care4me.jpg",
    src: "/audio/care4me.mp3",
    streamingLinks: LINKS,
  },
  {
    id: "elbtunnel",
    title: "elbtunnel",
    bpm: 136,
    mood: "A♭ major",
    cover: "/covers/elbtunnel.jpg",
    src: "/audio/elbtunnel.mp3",
    streamingLinks: LINKS,
  },
  {
    id: "dull-knife",
    title: "dull knife",
    bpm: 148,
    mood: "D major",
    cover: "/covers/dull-knife.jpg",
    src: "/audio/dull-knife.mp3",
    streamingLinks: LINKS,
  },
];

for (const t of TRACKS) {
  t.tempo ??= measured[t.id]?.tempo;
  t.beatOffset ??= measured[t.id]?.beatOffset;
}

/** The exact tempo of the audio (falls back to the listed BPM). */
export const gridTempo = (track: Track) => track.tempo ?? track.bpm;
