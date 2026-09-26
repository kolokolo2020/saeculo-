import type { Track } from "@/lib/types";

// The tracks in the media player and the rhythm games.
//
// `tempo` and `beatOffset` were measured from the audio files themselves
// (hi-hat grid, phase stable to ~5ms across each whole track) — the rhythm
// games chart notes from them, so re-measure if a file is replaced.
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
    tempo: 142.68,
    beatOffset: 0.005,
    mood: "F major",
    cover: "/covers/care4me.jpg",
    src: "/audio/care4me.mp3",
    streamingLinks: LINKS,
  },
  {
    id: "elbtunnel",
    title: "elbtunnel",
    bpm: 136,
    tempo: 135.69,
    beatOffset: 0.004,
    mood: "A♭ major",
    cover: "/covers/elbtunnel.jpg",
    src: "/audio/elbtunnel.mp3",
    streamingLinks: LINKS,
  },
  {
    id: "dull-knife",
    title: "dull knife",
    bpm: 148,
    tempo: 147.66,
    beatOffset: 0.001,
    mood: "D major",
    cover: "/covers/dull-knife.jpg",
    src: "/audio/dull-knife.mp3",
    streamingLinks: LINKS,
  },
];

/** The tempo the games should follow. */
export const gridTempo = (track: Track) => track.tempo ?? track.bpm;
