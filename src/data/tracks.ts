import type { Track } from "@/lib/types";
import analysis from "./trackAnalysis.json";

// The beats folder. To add one:
//   1. put the MP3 in public/audio/ and a square JPG/PNG cover in public/covers/
//   2. add an entry below (newest first; only id, title and src are required)
//   3. optional: `node scripts/analyze-tracks.mjs` measures the exact tempo,
//      first beat and waveform so the visualizer's beat pulse lines up.
// The player reads the length from the file itself and pulls the colours
// from the cover while it plays, so nothing else needs updating.
export const TRACKS: Track[] = [
  {
    id: "care4me",
    title: "care4me",
    bpm: 143,
    key: "F major",
    cover: "/covers/care4me.jpg",
    src: "/audio/care4me.mp3",
  },
  {
    id: "elbtunnel",
    title: "elbtunnel",
    bpm: 136,
    key: "A♭ major",
    cover: "/covers/elbtunnel.jpg",
    src: "/audio/elbtunnel.mp3",
  },
  {
    id: "dull-knife",
    title: "dull knife",
    bpm: 148,
    key: "D major",
    cover: "/covers/dull-knife.jpg",
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
