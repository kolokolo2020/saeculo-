import { voiceById } from "./voices";

// A studio project: channels (one sound each, with mixer settings), four
// patterns of steps and notes, and a song that strings patterns together.
// Plain JSON so it saves to the browser as is.

export interface Channel {
  id: string;
  voice: string;
  vol: number; // 0..1
  pan: number; // -1..1
  pitch: number; // semitones
  mute: boolean;
  solo: boolean;
  rev: number; // send 0..1
  dly: number; // send 0..1
  cutoff: number; // 0..1 (1 = open)
}

export interface Note {
  step: number;
  midi: number;
  len: number; // in steps
  vel: number;
}

export interface Pattern {
  /** Per channel: one velocity per step, 0 = off. */
  steps: Record<string, number[]>;
  /** Per melodic channel. */
  notes: Record<string, Note[]>;
}

export interface Master {
  vol: number;
  cutoff: number; // 0..1
  drive: number; // 0..1
  reverb: number; // return level 0..1
  delay: number; // return level 0..1
}

export interface Project {
  name: string;
  tempo: number;
  swing: number; // 0..0.5
  key: number; // 0..11
  scale: string;
  length: 16 | 32;
  channels: Channel[];
  patterns: Pattern[]; // always 4
  song: number[]; // pattern index per slot, -1 = empty
  mode: "pattern" | "song";
  master: Master;
}

export const MAX_CHANNELS = 16;
export const SONG_SLOTS = 16;
export const PATTERN_NAMES = ["A", "B", "C", "D"];

let seq = 0;
export const newId = () => `c${Date.now().toString(36)}${(seq++).toString(36)}`;

export function makeChannel(voice: string, over: Partial<Channel> = {}): Channel {
  return { id: newId(), voice, vol: 0.8, pan: 0, pitch: 0, mute: false, solo: false, rev: 0.1, dly: 0, cutoff: 1, ...over };
}

export const emptyPattern = (): Pattern => ({ steps: {}, notes: {} });

export function emptyProject(): Project {
  return {
    name: "untitled",
    tempo: 88,
    swing: 0.15,
    key: 5,
    scale: "minor",
    length: 16,
    channels: [makeChannel("kick-dusty"), makeChannel("snare-classic"), makeChannel("hat-dusty", { vol: 0.6 }), makeChannel("rhodes", { rev: 0.25 })],
    patterns: [emptyPattern(), emptyPattern(), emptyPattern(), emptyPattern()],
    song: [0, 0, 1, 1, ...Array(SONG_SLOTS - 4).fill(-1)],
    mode: "pattern",
    master: { vol: 0.85, cutoff: 1, drive: 0.15, reverb: 0.5, delay: 0.4 },
  };
}

export const isMelodic = (c: Channel) => voiceById(c.voice)?.kind === "melodic";

/** Steps for a channel in a pattern, padded to the project length. */
export function stepsOf(p: Pattern, id: string, length: number): number[] {
  const s = p.steps[id] ?? [];
  return s.length >= length ? s.slice(0, length) : [...s, ...Array(length - s.length).fill(0)];
}

export const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

// ------------------------------------------------------------ saving

const KEY = "saeculo-studio";
export const PROJECT_SLOTS = 8;

export interface Store {
  current: Project | null;
  slots: (Project | null)[];
}

function valid(p: unknown): p is Project {
  const x = p as Project;
  return (
    !!x &&
    typeof x.tempo === "number" &&
    Array.isArray(x.channels) &&
    Array.isArray(x.patterns) &&
    x.patterns.length === 4 &&
    Array.isArray(x.song) &&
    x.channels.every((c) => typeof c.id === "string" && typeof c.voice === "string")
  );
}

/** Fill anything an older save is missing, and drop sounds that no longer exist. */
function tidy(p: Project): Project {
  const base = emptyProject();
  const q: Project = { ...base, ...p, master: { ...base.master, ...p.master } };
  q.channels = q.channels.filter((c) => voiceById(c.voice)).map((c) => ({ ...makeChannel(c.voice), ...c }));
  q.song = Array.from({ length: SONG_SLOTS }, (_, i) => (typeof q.song[i] === "number" ? q.song[i] : -1));
  q.length = q.length === 32 ? 32 : 16;
  return q;
}

export function loadStore(): Store {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (raw && typeof raw === "object") {
      return {
        current: valid(raw.current) ? tidy(raw.current) : null,
        slots: Array.from({ length: PROJECT_SLOTS }, (_, i) => (valid(raw.slots?.[i]) ? tidy(raw.slots[i]) : null)),
      };
    }
  } catch {
    // unreadable: start fresh
  }
  return { current: null, slots: Array(PROJECT_SLOTS).fill(null) };
}

export function saveStore(s: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // storage full or blocked: this visit only
  }
}

// ------------------------------------------------------------ the old 4-lane tapes

const OLD_SOUNDS: Record<string, string> = {
  kick: "kick-dusty",
  kick808: "kick-long",
  snare: "snare-classic",
  bottle: "bottle",
  hat: "hat-tight",
  rain: "rain",
  keys: "rhodes",
  phone: "phone",
};
// the old keys lane played this progression's chords, one bar each
const OLD_CHORDS = [
  [56, 60, 63, 67],
  [53, 56, 60, 65],
  [56, 60, 61, 65],
  [55, 58, 63, 67],
];

interface OldPattern {
  steps: boolean[][];
  tempo: number;
  swing: number;
  sounds: string[];
}

/** Turn a tape from the first version of the sampler into a project. */
export function fromOldTape(old: OldPattern, name: string): Project {
  const p = emptyProject();
  p.name = name;
  p.tempo = old.tempo;
  p.swing = old.swing;
  p.key = 5;
  p.scale = "minor";
  p.channels = old.sounds.map((s) => makeChannel(OLD_SOUNDS[s] ?? "kick-dusty"));
  p.patterns = [0, 1, 2, 3].map(() => emptyPattern());
  const keys = p.channels[3];
  p.patterns.forEach((pat, bar) => {
    p.channels.slice(0, 3).forEach((c, lane) => (pat.steps[c.id] = old.steps[lane].map((on) => (on ? 1 : 0))));
    const hits = old.steps[3].map((on, i) => (on ? i : -1)).filter((i) => i >= 0);
    pat.notes[keys.id] = hits.flatMap((step, h) => {
      const len = (hits[h + 1] ?? 16) - step;
      return OLD_CHORDS[bar].map((midi) => ({ step, midi, len: Math.min(len, 8), vel: 0.9 }));
    });
  });
  p.song = [0, 1, 2, 3, ...Array(SONG_SLOTS - 4).fill(-1)];
  p.mode = "song";
  return p;
}
