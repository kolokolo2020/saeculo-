import { track } from "@vercel/analytics";

// What visitors do, sent to Vercel Web Analytics as custom events, each
// tagged with where the visit came from. No cookies: the source is kept in
// sessionStorage for this tab only.
//
// Where a visit came from: `?ref=yt` (or `?utm_source=yt`) on the link you
// post, else the site that linked here, else "direct". Use one short code
// per place you post, e.g.
//   saeculobeats.com/beat/care4me?ref=yt    a YouTube description
//   saeculobeats.com/?ref=ig                the Instagram bio
//   saeculobeats.com/beat/care4me?ref=dm    a DM to an artist
//
// Events: play (beat, once per beat per visit), lease (beat), contact
// (beat or "general", when the email app is opened), share (beat),
// social (which link).

const KEY = "saeculo-from";
const CODE_RE = /^[a-z0-9_-]{1,32}$/;

export type StatEvent = "play" | "lease" | "contact" | "share" | "social";

let from: string | null = null;
const played = new Set<string>();

/** Where this visit came from; worked out once, on the first call. */
export function visitSource(): string {
  if (from) return from;
  if (typeof window === "undefined") return "direct";
  try {
    const kept = sessionStorage.getItem(KEY);
    if (kept) return (from = kept);
  } catch {
    // storage blocked: work it out again for this page
  }
  const params = new URLSearchParams(window.location.search);
  const code = (params.get("ref") ?? params.get("utm_source") ?? "").trim().toLowerCase();
  let source = CODE_RE.test(code) ? code : "";
  if (!source && document.referrer) {
    try {
      const host = new URL(document.referrer).hostname.replace(/^www\./, "");
      if (host && host !== window.location.hostname.replace(/^www\./, "")) source = host;
    } catch {
      // not a URL
    }
  }
  from = source || "direct";
  try {
    sessionStorage.setItem(KEY, from);
  } catch {
    // fine: kept in memory for this page
  }
  return from;
}

/** Sends one event, tagged with the visit's source. */
export function stat(name: StatEvent, props: Record<string, string> = {}) {
  if (typeof window === "undefined") return;
  const data = { ...props, from: visitSource() };
  // scripts/verify.mjs reads these in development
  if (process.env.NODE_ENV !== "production") {
    const w = window as unknown as { __stats?: { name: string; data: Record<string, string> }[] };
    (w.__stats ??= []).push({ name, data });
  }
  try {
    track(name, data);
  } catch {
    // analytics never gets in the way
  }
}

/** A play, counted once per beat per visit. */
export function statPlay(beat: string) {
  if (played.has(beat)) return;
  played.add(beat);
  stat("play", { beat });
}
