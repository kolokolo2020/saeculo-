import { chordOn, degree } from "./scales";
import { emptyPattern, makeChannel, SONG_SLOTS, type Channel, type Note, type Pattern, type Project } from "./project";

// Starting points: each a few bars that already sound like a beat, with
// drums, bass, chords and a hook spread over four patterns and a song.
// Built from scale degrees, so they're correct in their key and easy to
// read: change a degree, get a different progression.

/** "x" = hit, "o" = soft hit, anything else = rest. Repeats to fill `len`. */
const hits = (s: string, len: number, soft = 0.6) => Array.from({ length: len }, (_, i) => (s[i % s.length] === "x" ? 1 : s[i % s.length] === "o" ? soft : 0));

interface Ctx {
  key: number;
  scale: string;
  len: number;
}

/** Sustained or rhythmic chords, one chord per `span` steps. */
function chords(c: Ctx, degs: number[], span: number, rhythm: [number, number][] = [[0, span]], size = 4, base = 48, vel = 0.8): Note[] {
  return degs.flatMap((deg, i) =>
    rhythm.flatMap(([at, len]) => chordOn(c.key, c.scale, deg, size, base).map((midi) => ({ step: i * span + at, midi, len, vel }))),
  );
}

/** A bass line on each chord's root. */
function roots(c: Ctx, degs: number[], span: number, rhythm: [number, number][], base = 36, vel = 0.95): Note[] {
  return degs.flatMap((deg, i) => rhythm.map(([at, len]) => ({ step: i * span + at, midi: degree(c.key, c.scale, deg, base), len, vel })));
}

/** A melody from [step, scale degree, length] triples. */
const line = (c: Ctx, notes: [number, number, number][], base = 60, vel = 0.85): Note[] => notes.map(([step, deg, len]) => ({ step, midi: degree(c.key, c.scale, deg, base), len, vel }));

function build(
  name: string,
  meta: { tempo: number; swing: number; key: number; scale: string },
  channels: Channel[],
  fill: (c: Ctx, ch: Record<string, Channel>) => Pattern[],
  song: number[],
): Project {
  const c: Ctx = { key: meta.key, scale: meta.scale, len: 32 };
  const byVoice = Object.fromEntries(channels.map((ch) => [ch.voice, ch]));
  return {
    name,
    tempo: meta.tempo,
    swing: meta.swing,
    key: meta.key,
    scale: meta.scale,
    length: 32,
    channels,
    patterns: fill(c, byVoice),
    song: [...song, ...Array(SONG_SLOTS - song.length).fill(-1)],
    mode: "pattern",
    master: { vol: 0.85, cutoff: 1, drive: 0.2, reverb: 0.5, delay: 0.4 },
  };
}

function pattern(steps: Record<string, number[]>, notes: Record<string, Note[]>): Pattern {
  return { ...emptyPattern(), steps, notes };
}

// ------------------------------------------------------------ late-night boom bap

function boomBap(): Project {
  const chs = [
    makeChannel("kick-dusty"),
    makeChannel("snare-classic", { rev: 0.15 }),
    makeChannel("hat-dusty", { vol: 0.55, pan: 0.2 }),
    makeChannel("ohat", { vol: 0.4, pan: -0.2 }),
    makeChannel("vinyl-pop", { vol: 0.5 }),
    makeChannel("synth-bass", { vol: 0.7 }),
    makeChannel("rhodes", { vol: 0.7, rev: 0.3 }),
    makeChannel("music-box", { vol: 0.5, rev: 0.35, dly: 0.3, pan: 0.25 }),
  ];
  return build("late-night boom bap", { tempo: 84, swing: 0.22, key: 5, scale: "minor" }, chs, (c, ch) => {
    const drums = (fill = false) => ({
      [ch["kick-dusty"].id]: hits("x.....x...x.....x.....x...x..o..", 32),
      [ch["snare-classic"].id]: hits(fill ? "....x.......x.......x.......x.xo" : "....x.......x.......x.......x...", 32),
      [ch["hat-dusty"].id]: hits("x.o.x.o.x.o.x.oox.o.x.o.x.o.x.o.", 32),
      [ch["ohat"].id]: hits("..............x...............x.", 32),
      [ch["vinyl-pop"].id]: hits("x...............................", 32),
    });
    const bass = (degs: number[]) => roots(c, degs, 16, [[0, 5], [6, 3], [10, 5]]);
    const keys = (degs: number[]) => chords(c, degs, 16, [[0, 6], [10, 5]]);
    const hook = line(c, [[0, 4, 3], [4, 3, 2], [6, 2, 4], [12, 0, 3], [16, 2, 3], [20, 3, 2], [22, 4, 6], [28, 2, 3]], 60);
    const A = [0, 5];
    const B = [3, 4];
    return [
      pattern(drums(), { [ch["synth-bass"].id]: bass(A), [ch["rhodes"].id]: keys(A) }),
      pattern(drums(true), { [ch["synth-bass"].id]: bass(B), [ch["rhodes"].id]: keys(B) }),
      pattern(drums(), { [ch["synth-bass"].id]: bass(A), [ch["rhodes"].id]: keys(A), [ch["music-box"].id]: hook }),
      pattern(drums(true), { [ch["synth-bass"].id]: bass(B), [ch["rhodes"].id]: keys(B), [ch["music-box"].id]: hook.map((n) => ({ ...n, midi: n.midi - 2 })) }),
    ];
  }, [0, 1, 0, 1, 2, 3, 2, 3]);
}

// ------------------------------------------------------------ lofi

function lofi(): Project {
  const chs = [
    makeChannel("kick-soft"),
    makeChannel("snare-lofi", { rev: 0.2 }),
    makeChannel("rim", { vol: 0.45, pan: -0.25 }),
    makeChannel("shaker", { vol: 0.45, pan: 0.3 }),
    makeChannel("sub", { vol: 0.7 }),
    makeChannel("piano", { vol: 0.75, rev: 0.35, cutoff: 0.7 }),
    makeChannel("pad", { vol: 0.5, rev: 0.4 }),
    makeChannel("flute", { vol: 0.45, rev: 0.4, dly: 0.25 }),
  ];
  return build("rainy lofi", { tempo: 74, swing: 0.28, key: 9, scale: "minor" }, chs, (c, ch) => {
    const drums = () => ({
      [ch["kick-soft"].id]: hits("x......x..x.....x.........x.....", 32),
      [ch["snare-lofi"].id]: hits("....x.......x...", 32),
      [ch["rim"].id]: hits("..........o...........o......o..", 32),
      [ch["shaker"].id]: hits("oxoxoxoxoxoxoxox", 32, 0.4),
    });
    const A = [3, 4];
    const B = [2, 5];
    const sub = (degs: number[]) => roots(c, degs, 16, [[0, 7], [10, 5]]);
    const keys = (degs: number[]) => chords(c, degs, 16, [[0, 3], [3, 4], [10, 6]], 4, 48, 0.7);
    const pad = (degs: number[]) => chords(c, degs, 16, [[0, 16]], 3, 48, 0.6);
    const melody = line(c, [[2, 7, 2], [4, 9, 4], [10, 8, 2], [12, 7, 4], [18, 6, 2], [20, 7, 6], [28, 4, 4]], 48);
    return [
      pattern(drums(), { [ch["sub"].id]: sub(A), [ch["piano"].id]: keys(A), [ch["pad"].id]: pad(A) }),
      pattern(drums(), { [ch["sub"].id]: sub(B), [ch["piano"].id]: keys(B), [ch["pad"].id]: pad(B) }),
      pattern(drums(), { [ch["sub"].id]: sub(A), [ch["piano"].id]: keys(A), [ch["pad"].id]: pad(A), [ch["flute"].id]: melody }),
      pattern(drums(), { [ch["sub"].id]: sub(B), [ch["piano"].id]: keys(B), [ch["pad"].id]: pad(B), [ch["flute"].id]: melody }),
    ];
  }, [0, 1, 0, 1, 2, 3, 2, 3]);
}

// ------------------------------------------------------------ cold trap

function trap(): Project {
  const chs = [
    makeChannel("kick-trap"),
    makeChannel("clap", { rev: 0.2 }),
    makeChannel("hat-808", { vol: 0.5, pan: 0.15 }),
    makeChannel("ohat-808", { vol: 0.35, pan: -0.15 }),
    makeChannel("808-dirty", { vol: 0.8 }),
    makeChannel("bell", { vol: 0.5, rev: 0.4, dly: 0.35 }),
    makeChannel("choir", { vol: 0.45, rev: 0.5 }),
  ];
  return build("cold trap", { tempo: 140, swing: 0, key: 1, scale: "minor" }, chs, (c, ch) => {
    const drums = (roll = false) => ({
      [ch["kick-trap"].id]: hits("x.........x.......x...x.....x...", 32),
      [ch["clap"].id]: hits("........x...............x.......", 32),
      [ch["hat-808"].id]: hits(roll ? "x.x.x.xxx.x.x.x.x.x.x.x.xxxxx.x." : "x.x.x.x.x.x.xox.x.x.x.x.x.x.x.xx", 32),
      [ch["ohat-808"].id]: hits("......x...............x.........", 32),
    });
    const A = [0, 5];
    const B = [3, 6];
    const bass = (degs: number[]) => roots(c, degs, 16, [[0, 8], [10, 4], [14, 2]], 36);
    const choir = (degs: number[]) => chords(c, degs, 16, [[0, 16]], 3, 48, 0.55);
    const bells = line(c, [[0, 7, 2], [3, 9, 2], [6, 8, 2], [8, 7, 4], [16, 7, 2], [19, 11, 2], [22, 9, 2], [24, 8, 6]], 60);
    return [
      pattern(drums(), { [ch["808-dirty"].id]: bass(A), [ch["choir"].id]: choir(A) }),
      pattern(drums(true), { [ch["808-dirty"].id]: bass(B), [ch["choir"].id]: choir(B) }),
      pattern(drums(), { [ch["808-dirty"].id]: bass(A), [ch["choir"].id]: choir(A), [ch["bell"].id]: bells }),
      pattern(drums(true), { [ch["808-dirty"].id]: bass(B), [ch["choir"].id]: choir(B), [ch["bell"].id]: bells }),
    ];
  }, [0, 1, 0, 1, 2, 3, 2, 3]);
}

// ------------------------------------------------------------ drill

function drill(): Project {
  const chs = [
    makeChannel("kick-punch"),
    makeChannel("snare-crack", { rev: 0.2 }),
    makeChannel("hat-tight", { vol: 0.5, pan: 0.2 }),
    makeChannel("808-glide", { vol: 0.8 }),
    makeChannel("strings", { vol: 0.5, rev: 0.4 }),
    makeChannel("piano", { vol: 0.6, rev: 0.3, dly: 0.2 }),
  ];
  return build("night drill", { tempo: 142, swing: 0, key: 7, scale: "harmonic" }, chs, (c, ch) => {
    const drums = () => ({
      [ch["kick-punch"].id]: hits("x.........x.....x...x.......x...", 32),
      [ch["snare-crack"].id]: hits("........x...............x....o..", 32),
      [ch["hat-tight"].id]: hits("x..x..x.x..x.x..x..x..x.x..x.x.x", 32),
    });
    const A = [0, 5];
    const B = [6, 4];
    const bass = (degs: number[]) => roots(c, degs, 16, [[0, 6], [7, 3], [11, 5]], 36);
    const str = (degs: number[]) => chords(c, degs, 16, [[0, 16]], 3, 55, 0.6);
    const keys = line(c, [[0, 7, 2], [2, 8, 2], [4, 7, 2], [6, 6, 4], [12, 4, 4], [16, 7, 2], [18, 9, 2], [20, 8, 4], [26, 6, 6]], 48);
    return [
      pattern(drums(), { [ch["808-glide"].id]: bass(A), [ch["strings"].id]: str(A) }),
      pattern(drums(), { [ch["808-glide"].id]: bass(B), [ch["strings"].id]: str(B) }),
      pattern(drums(), { [ch["808-glide"].id]: bass(A), [ch["strings"].id]: str(A), [ch["piano"].id]: keys }),
      pattern(drums(), { [ch["808-glide"].id]: bass(B), [ch["strings"].id]: str(B), [ch["piano"].id]: keys }),
    ];
  }, [0, 1, 0, 1, 2, 3, 2, 3]);
}

export const PRESETS: { id: string; name: string; make: () => Project }[] = [
  { id: "boombap", name: "late-night boom bap · 84", make: boomBap },
  { id: "lofi", name: "rainy lofi · 74", make: lofi },
  { id: "trap", name: "cold trap · 140", make: trap },
  { id: "drill", name: "night drill · 142", make: drill },
];
