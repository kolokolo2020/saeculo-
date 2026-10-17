import type { Track } from "./types";

// "Play similar next": after a beat, the one closest to it by tempo and key.
// Tempo counts most (half and double time count as the same groove); keys
// are compared round the circle of fifths, with a minor key standing in for
// its relative major. Beats heard recently this visit are passed over, so
// two close beats don't just swap back and forth.

const NOTES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Where a key sits on the circle of fifths (0–11), or null if it can't be read. */
export function fifths(key: string | undefined): number | null {
  const m = key?.trim().match(/^([A-G])\s*([♯#♭b]?)\s+(major|minor)$/i);
  if (!m) return null;
  let pc = NOTES[m[1].toUpperCase()];
  if (m[2] === "♯" || m[2] === "#") pc += 1;
  else if (m[2] === "♭" || m[2] === "b") pc -= 1;
  // a minor key shares its notes with the major three semitones up
  if (m[3].toLowerCase() === "minor") pc += 3;
  return ((((pc % 12) + 12) % 12) * 7) % 12;
}

/** How far apart two beats feel: 0 is the same tempo and key. */
export function distance(a: Track, b: Track): number {
  let tempo = 1;
  if (a.bpm && b.bpm) {
    const ratios = [a.bpm / b.bpm, (2 * a.bpm) / b.bpm, a.bpm / (2 * b.bpm)];
    // one unit per 8% of tempo
    tempo = Math.min(...ratios.map((r) => Math.abs(Math.log(r)))) / 0.08;
  }
  const ka = fifths(a.key);
  const kb = fifths(b.key);
  let key = 1.5;
  if (ka !== null && kb !== null) {
    const d = Math.abs(ka - kb);
    key = Math.min(d, 12 - d) * 0.5;
  }
  return tempo + key;
}

/**
 * The index of the beat to play after `index`: the closest one that hasn't
 * been heard lately (`played`: ids, oldest first). -1 with fewer than two beats.
 */
export function nextSimilar(tracks: Track[], index: number, played: string[]): number {
  const current = tracks[index];
  if (!current || tracks.length < 2) return -1;
  const recent = new Set(played.slice(-Math.floor(tracks.length / 2)));
  let best = -1;
  let bestRecent = -1;
  for (let i = 0; i < tracks.length; i++) {
    if (i === index) continue;
    const d = distance(current, tracks[i]);
    if (!recent.has(tracks[i].id)) {
      if (best < 0 || d < distance(current, tracks[best])) best = i;
    } else if (bestRecent < 0 || d < distance(current, tracks[bestRecent])) bestRecent = i;
  }
  return best >= 0 ? best : bestRecent;
}
