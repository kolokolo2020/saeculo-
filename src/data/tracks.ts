import type { Track } from "@/lib/types";
import analysis from "./trackAnalysis.json";

// The beats, as one album under one cover (the wordmark on a spectrum
// analyser, drawn by scripts/make-cover.mjs). To add a beat:
//   1. put the MP3 in public/audio/
//   2. add an entry below (newest first; only id, title and src are required)
//   3. optional: `node scripts/analyze-tracks.mjs` measures the exact tempo,
//      first beat and waveform so the seek bar and the visualizer line up.
// The player reads the length from the file itself, so nothing else needs
// updating.
export const ALBUM = {
  title: "saeculo",
  /** Shown on the site. */
  cover: "/covers/saeculo.svg",
  /** The same cover as a JPEG, for share cards and lock screens. */
  coverJpg: "/covers/saeculo.jpg",
};

export const TRACKS: Track[] = [
  {
    id: "care4me",
    title: "care4me",
    bpm: 143,
    key: "F major",
    src: "/audio/care4me.mp3",
  },
  {
    id: "elbtunnel",
    title: "elbtunnel",
    bpm: 136,
    key: "A♭ major",
    src: "/audio/elbtunnel.mp3",
  },
  {
    id: "dull-knife",
    title: "dull knife",
    bpm: 148,
    key: "D major",
    src: "/audio/dull-knife.mp3",
  },
];

const measured = analysis as Record<string, { tempo?: number; beatOffset?: number } | undefined>;
for (const t of TRACKS) {
  t.tempo ??= measured[t.id]?.tempo;
  t.beatOffset ??= measured[t.id]?.beatOffset;
}

/** The exact tempo of the audio (falls back to the listed BPM, then 90). */
export const gridTempo = (track: Track) => track.tempo ?? track.bpm ?? 90;

const NEW_DAYS = 30;
export function isNew(track: Track, now = Date.now()): boolean {
  if (!track.added) return false;
  const t = Date.parse(track.added);
  return Number.isFinite(t) && now - t < NEW_DAYS * 864e5 && now >= t;
}
