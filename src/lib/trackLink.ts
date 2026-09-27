import { TRACKS } from "@/data/tracks";

// Direct links to one track: saeculo.vercel.app/#track=<id> opens the
// media player on that track, ready to play.
const HASH_RE = /^#?track=([a-z0-9-]+)$/i;

/** The track index a `#track=…` hash points at, or -1. */
export function trackIndexFromHash(hash: string): number {
  const m = HASH_RE.exec(hash.trim());
  if (!m) return -1;
  return TRACKS.findIndex((t) => t.id === m[1].toLowerCase());
}

export function trackUrl(id: string): string {
  return `${window.location.origin}${window.location.pathname}#track=${id}`;
}
