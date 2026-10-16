import type { Track } from "@/lib/types";
import analysis from "./trackAnalysis.json";

// The beats, as one album under one cover (the owner's artwork,
// public/covers/saeculo.jpg). To add a beat:
//   1. put the MP3 in public/audio/
//   2. add an entry below (newest first; only id, title and src are required;
//      a file name with spaces or brackets goes in `src` URL-encoded, e.g.
//      "joy4us (21.09.26).mp3" is "/audio/joy4us%20(21.09.26).mp3")
//   3. optional: `node scripts/analyze-tracks.mjs` measures the exact tempo,
//      first beat and waveform so the seek bar lines up.
// The player reads the length from the file itself, so nothing else needs
// updating.
export const ALBUM = {
  title: "saeculo",
  /** Shown on the site. */
  cover: "/covers/saeculo.jpg",
  /** The same cover as a JPEG, for share cards and lock screens. */
  coverJpg: "/covers/saeculo.jpg",
};

export const TRACKS: Track[] = [
  {
    id: "growin-and-slowin",
    title: "growin & slowin",
    bpm: 101,
    key: "E♭ major",
    src: "/audio/growin%20%26%20slowin%20%2824.09.26%29.mp3",
  },
  {
    id: "kiss-me-miss-ya",
    title: "kiss me, miss ya",
    bpm: 97,
    key: "F♯ major",
    src: "/audio/kiss%20me%2C%20miss%20ya%20%2823.09.26%29.mp3",
  },
  {
    id: "joy4us",
    title: "joy4us",
    bpm: 96,
    key: "B major",
    src: "/audio/joy4us%20%2821.09.26%29.mp3",
  },
  {
    id: "beauty-fangs",
    title: "beauty fangs",
    bpm: 149,
    key: "A♯ minor",
    src: "/audio/beauty%20fangs%20%2815.08.26%29.mp3",
  },
  {
    id: "nite2die-4",
    title: "nite2die 4",
    bpm: 138,
    key: "F♯ minor",
    src: "/audio/nite2die%204%20%2823.07.26%29.mp3",
  },
  {
    id: "care4me",
    title: "care4me",
    bpm: 143,
    key: "F major",
    src: "/audio/care4me%20%2821.07.26%29.mp3",
  },
  {
    id: "interview",
    title: "interview",
    bpm: 146,
    key: "F major",
    src: "/audio/interview%20%2809.06.26%29.mp3",
  },
  {
    id: "2patient",
    title: "2patient",
    bpm: 52,
    key: "F♯ major",
    src: "/audio/2patient%20%2831.05.26%29.mp3",
  },
  {
    id: "american-dream",
    title: "american dream",
    bpm: 102,
    key: "A major",
    src: "/audio/american%20dream.mp3",
  },
  {
    id: "analog",
    title: "analog",
    bpm: 155,
    key: "C minor",
    src: "/audio/analog.mp3",
  },
  {
    id: "day2nite",
    title: "day2nite",
    bpm: 139,
    key: "A minor",
    src: "/audio/day2nite.mp3",
  },
  {
    id: "dull-knife",
    title: "dull knife",
    bpm: 149,
    key: "D major",
    src: "/audio/dull%20knife.mp3",
  },
  {
    id: "late-departure",
    title: "late departure",
    bpm: 133,
    key: "C major",
    src: "/audio/late%20departure.mp3",
  },
  {
    id: "mef-muzik",
    title: "mef muzik",
    bpm: 147,
    key: "C major",
    src: "/audio/mef%20muzik.mp3",
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
