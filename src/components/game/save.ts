import { FINDABLE, soundById } from "./kit";
import { STEPS, type Pattern } from "./sequencer";

// What the game remembers between visits, in this browser only: the
// sounds you've found, up to four beats saved to tape, and whether you've
// seen the controls card.
export interface Tape {
  pattern: Pattern;
  savedAt: number;
}

export interface SaveData {
  found: string[];
  tapes: (Tape | null)[];
  seenHelp: boolean;
  /** Findable sounds found but not yet looked at in the sampler. */
  unseen: string[];
}

export const TAPE_SLOTS = 4;
const KEY = "saeculo-game";

const empty = (): SaveData => ({ found: [], tapes: Array(TAPE_SLOTS).fill(null), seenHelp: false, unseen: [] });

function validPattern(p: unknown): p is Pattern {
  const x = p as Pattern;
  return (
    !!x &&
    typeof x.tempo === "number" &&
    typeof x.swing === "number" &&
    Array.isArray(x.sounds) &&
    x.sounds.length === 4 &&
    x.sounds.every((s) => typeof s === "string" && !!soundById(s)) &&
    Array.isArray(x.steps) &&
    x.steps.length === 4 &&
    x.steps.every((r) => Array.isArray(r) && r.length === STEPS)
  );
}

export function loadSave(): SaveData {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (!raw || typeof raw !== "object") return empty();
    const found = Array.isArray(raw.found) ? raw.found.filter((s: unknown) => typeof s === "string" && FINDABLE.includes(s as string)) : [];
    const tapes = Array.from({ length: TAPE_SLOTS }, (_, i) => {
      const t = raw.tapes?.[i];
      return t && validPattern(t.pattern) ? { pattern: t.pattern, savedAt: Number(t.savedAt) || 0 } : null;
    });
    const unseen = Array.isArray(raw.unseen) ? raw.unseen.filter((s: unknown) => found.includes(s)) : [];
    return { found, tapes, seenHelp: raw.seenHelp === true, unseen };
  } catch {
    return empty();
  }
}

export function writeSave(data: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // storage full or blocked: progress lasts for this visit
  }
}
