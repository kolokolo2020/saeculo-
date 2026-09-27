import { PROGRESSIONS, STEPS, patternFrom, type Cell, type Groove, type Pattern } from "@/lib/groove";

type Preset = Omit<Groove, "muted">;

export const PRESETS: Record<string, Preset> = {
  "Lo-Fi": {
    bpm: 82,
    swing: 45,
    key: 5,
    prog: 0,
    filter: 70,
    pattern: patternFrom(
      { kick: [0, 7, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14, 15], perc: [11], bass: [0, 7, 10], keys: [0, 6] },
      { hat: [0, 8], keys: [0] },
    ),
  },
  "Boom Bap": {
    bpm: 90,
    swing: 55,
    key: 2,
    prog: 1,
    filter: 100,
    pattern: patternFrom(
      { kick: [0, 7, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], openhat: [14], bass: [0, 7, 10], keys: [0, 11] },
      { snare: [4, 12], keys: [0] },
    ),
  },
  Trap: {
    bpm: 140,
    swing: 0,
    key: 11,
    prog: 3,
    filter: 100,
    pattern: patternFrom(
      { kick: [0, 6, 11], clap: [8], hat: [0, 1, 2, 4, 5, 6, 8, 9, 10, 11, 12, 14, 15], perc: [13], bass: [0, 6, 11], keys: [0] },
      { clap: [8], hat: [0, 4, 8, 12], bass: [11], keys: [0] },
    ),
  },
  House: {
    bpm: 124,
    swing: 20,
    key: 8,
    prog: 4,
    filter: 100,
    pattern: patternFrom({
      kick: [0, 4, 8, 12],
      clap: [4, 12],
      hat: [1, 3, 5, 7, 9, 11, 13, 15],
      openhat: [2, 6, 10, 14],
      perc: [7, 15],
      bass: [2, 3, 6, 10, 11, 14],
      keys: [3, 6, 11],
    }),
  },
  Drill: {
    bpm: 142,
    swing: 30,
    key: 4,
    prog: 2,
    filter: 100,
    pattern: patternFrom(
      { kick: [0, 3, 10], snare: [8, 15], hat: [0, 3, 6, 8, 11, 14], perc: [5, 13], bass: [0, 3, 10], keys: [0] },
      { snare: [8], bass: [10], keys: [0] },
    ),
  },
};

export const DEFAULT_GROOVE: Groove = { ...PRESETS["Lo-Fi"], muted: [] };

// Random, but musical: kick on the one, a backbeat, busy hats with the
// quarter notes leaning in, the 808 shadowing kicks, a couple of chord stabs.
export function randomGroove(prev: Groove): Groove {
  const r = Math.random;
  const p: Pattern = patternFrom({});
  const set = (lane: keyof Pattern, step: number, accent = false) => (p[lane][step] = (accent ? 2 : 1) as Cell);
  const halfTime = prev.bpm >= 130;

  set("kick", 0, r() < 0.3);
  for (const s of [3, 6, 7, 10, 11, 14]) if (r() < 0.35) set("kick", s);
  const back = r() < 0.5 ? "snare" : "clap";
  for (const s of halfTime ? [8] : [4, 12]) set(back, s, r() < 0.5);
  for (let s = 0; s < STEPS; s++) {
    if (s % 4 !== 0 && r() < 0.05) set(back === "snare" ? "clap" : "snare", s);
    if (r() < (s % 2 ? 0.45 : 0.85)) set("hat", s, s % 4 === 0 && r() < 0.4);
    if (s % 4 === 2 && !p.hat[s] && r() < 0.3) set("openhat", s);
    if (r() < 0.07) set("perc", s);
    if (p.kick[s] && r() < 0.75) set("bass", s, r() < 0.15);
  }
  const stabs = [0, 3, 6, 8, 10, 11, 14].filter(() => r() < 0.22);
  for (const s of new Set([0, ...stabs])) set("keys", s, r() < 0.4);

  return { ...prev, pattern: p, prog: Math.floor(r() * (PROGRESSIONS.length - 1)) };
}
