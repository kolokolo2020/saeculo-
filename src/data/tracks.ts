import type { Track } from "@/lib/types";

// PLACEHOLDER CONTENT — replace src with your real instrumentals (drop files
// into public/audio/) and swap the streaming links for your real profiles.
export const TRACKS: Track[] = [
  {
    id: "midnight-drive",
    title: "midnight drive",
    bpm: 92,
    mood: "dark / moody",
    src: "/audio/midnight-drive.wav",
    streamingLinks: [
      { label: "Spotify", url: "https://open.spotify.com/" },
      { label: "YouTube", url: "https://youtube.com/" },
    ],
  },
  {
    id: "arcade-dust",
    title: "arcade dust",
    bpm: 100,
    mood: "chiptune / nostalgic",
    src: "/audio/arcade-dust.wav",
    streamingLinks: [
      { label: "Spotify", url: "https://open.spotify.com/" },
      { label: "SoundCloud", url: "https://soundcloud.com/" },
    ],
  },
  {
    id: "velvet-static",
    title: "velvet static",
    bpm: 84,
    mood: "lo-fi / hazy",
    src: "/audio/velvet-static.wav",
    streamingLinks: [
      { label: "SoundCloud", url: "https://soundcloud.com/" },
      { label: "YouTube", url: "https://youtube.com/" },
    ],
  },
  {
    id: "neon-rain",
    title: "neon rain",
    bpm: 96,
    mood: "melodic / driving",
    src: "/audio/neon-rain.wav",
    streamingLinks: [
      { label: "Spotify", url: "https://open.spotify.com/" },
      { label: "SoundCloud", url: "https://soundcloud.com/" },
    ],
  },
];
