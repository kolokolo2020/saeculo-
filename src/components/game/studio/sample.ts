import { emptyPattern, emptyProject, makeChannel, SONG_SLOTS, type Project } from "./project";
import { trackTiming } from "./voices";

// "Sample this": the two bars of a track around where the player is, cut
// into four two-beat pieces at the track's own tempo, with a plain drum
// part under them. Pattern A plays the bars as they are; B flips the order,
// the oldest trick there is. From there it's yours.

const hits = (s: string) => Array.from({ length: 32 }, (_, i) => (s[i % s.length] === "x" ? 1 : s[i % s.length] === "o" ? 0.6 : 0));

/** "A♭ major" → key 8, major. */
function parseKey(text?: string): { key: number; scale: string } {
  const m = /^([A-G])([♭♯b#]?)\s*(major|minor)?/i.exec(text ?? "");
  if (!m) return { key: 5, scale: "minor" };
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1].toUpperCase() as "C"]!;
  const shift = m[2] === "♭" || m[2] === "b" ? -1 : m[2] === "♯" || m[2] === "#" ? 1 : 0;
  return { key: (base + shift + 12) % 12, scale: m[3]?.toLowerCase() === "major" ? "major" : "minor" };
}

export function sampleProject(trackId: string, atSeconds: number, keyText?: string): Project | null {
  const tm = trackTiming(trackId);
  if (!tm) return null;
  const barLen = tm.beat * 4;
  const bars = tm.duration ? Math.floor((tm.duration - tm.offset) / barLen) : Infinity;
  // the bar you're in, kept inside the track with two bars to spare
  const bar = Math.max(0, Math.min(Math.floor((atSeconds - tm.offset) / barLen), bars - 3));
  const first = bar * 4;
  let tempo = 60 / tm.beat;
  if (tempo > 180) tempo /= 2;
  const p = emptyProject();
  const { key, scale } = parseKey(keyText);
  Object.assign(p, { name: `${tm.track.title} flip`, tempo: Math.round(Math.min(180, Math.max(60, tempo))), swing: 0, key, scale, length: 32 as const });
  const cuts = [0, 1, 2, 3].map((i) => makeChannel(`cut:${trackId}:${first + i * 2}`, { vol: 0.85, rev: 0.05 }));
  const kick = makeChannel("kick-dusty", { vol: 0.75 });
  const snare = makeChannel("snare-lofi", { vol: 0.7 });
  const hat = makeChannel("hat-dusty", { vol: 0.5 });
  p.channels = [...cuts, kick, snare, hat];
  const a = emptyPattern();
  const b = emptyPattern();
  const order = [
    [0, 1, 2, 3],
    [2, 1, 0, 3],
  ];
  [a, b].forEach((pat, n) => {
    cuts.forEach((c) => (pat.steps[c.id] = Array(32).fill(0)));
    order[n].forEach((cut, slot) => (pat.steps[cuts[cut].id][slot * 8] = 1));
    pat.steps[kick.id] = hits("x.........x.....x.....x.........");
    pat.steps[snare.id] = hits("....x.......x...");
    pat.steps[hat.id] = hits("x.o.");
  });
  p.patterns = [a, b, emptyPattern(), emptyPattern()];
  p.song = [0, 0, 1, 1, ...Array(SONG_SLOTS - 4).fill(-1)];
  p.master = { ...p.master, reverb: 0.3, delay: 0.25, drive: 0.2 };
  return p;
}
