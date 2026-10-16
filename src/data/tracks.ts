import type { Track } from "@/lib/types";
import analysis from "./trackAnalysis.json";

/**
 * The URL of an MP3 in public/audio/, from its file name as it is on disk.
 * Encoded the one way every server agrees on (`&` and `,` escaped, brackets
 * left as they are), so names like "growin & slowin (24.09.26).mp3" load
 * both on Vercel and under `next start`.
 */
const audioFile = (name: string) => `/audio/${encodeURIComponent(name)}`;

// The beats, as one album under one cover (the owner's artwork,
// public/covers/saeculo.jpg). To add a beat:
//   1. put the MP3 in public/audio/
//   2. add an entry below (newest first; only id, title and src are required).
//      `src` is the file name exactly as it is in public/audio/, inside
//      audioFile(...), e.g. src: audioFile("joy4us (21.09.26).mp3").
//      `added` ("YYYY-MM-DD") shows a "new" tag for 30 days.
//   3. optional: `node scripts/analyze-tracks.mjs` measures the exact tempo,
//      first beat, loudness and waveform so the seek bar lines up and every
//      beat plays at the same level.
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
    added: "2026-09-24",
    bpm: 101,
    key: "E♭ major",
    src: audioFile("growin & slowin (24.09.26).mp3"),
  },
  {
    id: "kiss-me-miss-ya",
    title: "kiss me, miss ya",
    added: "2026-09-23",
    bpm: 97,
    key: "F♯ major",
    src: audioFile("kiss me, miss ya (23.09.26).mp3"),
  },
  {
    id: "joy4us",
    title: "joy4us",
    added: "2026-09-21",
    bpm: 96,
    key: "B major",
    src: audioFile("joy4us (21.09.26).mp3"),
  },
  {
    id: "beauty-fangs",
    title: "beauty fangs",
    bpm: 149,
    key: "A♯ minor",
    src: audioFile("beauty fangs (15.08.26).mp3"),
  },
  {
    id: "nite2die-4",
    title: "nite2die 4",
    bpm: 138,
    key: "F♯ minor",
    src: audioFile("nite2die 4 (23.07.26).mp3"),
  },
  {
    id: "care4me",
    title: "care4me",
    bpm: 143,
    key: "F major",
    src: audioFile("care4me (21.07.26).mp3"),
  },
  {
    id: "interview",
    title: "interview",
    bpm: 146,
    key: "F major",
    src: audioFile("interview (09.06.26).mp3"),
  },
  {
    id: "2patient",
    title: "2patient",
    bpm: 52,
    key: "F♯ major",
    src: audioFile("2patient (31.05.26).mp3"),
  },
  {
    id: "american-dream",
    title: "american dream",
    bpm: 102,
    key: "A major",
    src: audioFile("american dream.mp3"),
  },
  {
    id: "analog",
    title: "analog",
    bpm: 155,
    key: "C minor",
    src: audioFile("analog.mp3"),
  },
  {
    id: "day2nite",
    title: "day2nite",
    bpm: 139,
    key: "A minor",
    src: audioFile("day2nite.mp3"),
  },
  {
    id: "dull-knife",
    title: "dull knife",
    bpm: 149,
    key: "D major",
    src: audioFile("dull knife.mp3"),
  },
  {
    id: "late-departure",
    title: "late departure",
    bpm: 133,
    key: "C major",
    src: audioFile("late departure.mp3"),
  },
  {
    id: "mef-muzik",
    title: "mef muzik",
    bpm: 147,
    key: "C major",
    src: audioFile("mef muzik.mp3"),
  },
];

const measured = analysis as Record<string, { tempo?: number; beatOffset?: number; loudness?: number } | undefined>;
for (const t of TRACKS) {
  t.tempo ??= measured[t.id]?.tempo;
  t.beatOffset ??= measured[t.id]?.beatOffset;
  t.loudness ??= measured[t.id]?.loudness;
}

/**
 * Beats louder than this (in LUFS) are turned down to it in the player, so
 * one doesn't jump out after another. Quieter ones play as they are: nothing
 * is ever pushed up, so nothing can clip.
 */
export const LOUDNESS_TARGET = -10;

/** The player's gain for a track: 1, or less for a loud one. */
export function levelFor(track: Track | undefined): number {
  const l = track?.loudness;
  if (l === undefined || !Number.isFinite(l) || l <= LOUDNESS_TARGET) return 1;
  return Math.pow(10, (LOUDNESS_TARGET - l) / 20);
}

/** The exact tempo of the audio (falls back to the listed BPM, then 90). */
export const gridTempo = (track: Track) => track.tempo ?? track.bpm ?? 90;

const NEW_DAYS = 30;
export function isNew(track: Track, now = Date.now()): boolean {
  if (!track.added) return false;
  const t = Date.parse(track.added);
  return Number.isFinite(t) && now - t < NEW_DAYS * 864e5 && now >= t;
}
