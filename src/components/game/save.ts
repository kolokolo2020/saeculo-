import { fromOldTape, loadStore, saveStore } from "./studio/project";
import { FINDABLE } from "./studio/voices";

// What the game remembers between visits, in this browser only: the
// sounds you've found and whether you've seen the controls card. Beats you
// make live in the studio's own store (studio/project.ts).
export interface SaveData {
  found: string[];
  seenHelp: boolean;
  /** Findable sounds found but not yet looked at in the studio. */
  unseen: string[];
}

const KEY = "saeculo-game";

export function loadSave(): SaveData {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (!raw || typeof raw !== "object") return { found: [], seenHelp: false, unseen: [] };
    const found: string[] = Array.isArray(raw.found) ? raw.found.filter((s: unknown) => typeof s === "string" && FINDABLE.includes(s as string)) : [];
    const unseen = Array.isArray(raw.unseen) ? raw.unseen.filter((s: unknown) => found.includes(s as string)) : [];
    return { found, seenHelp: raw.seenHelp === true, unseen };
  } catch {
    return { found: [], seenHelp: false, unseen: [] };
  }
}

export function writeSave(data: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // storage full or blocked: progress lasts for this visit
  }
}

/** Beats saved to tape by the first version of the sampler move into the studio's project slots, once. */
export function migrateOldTapes() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    const tapes: unknown[] = Array.isArray(raw?.tapes) ? raw.tapes : [];
    const old = tapes.filter((t): t is { pattern: { steps: boolean[][]; tempo: number; swing: number; sounds: string[] } } => {
      const p = (t as { pattern?: { steps?: unknown; sounds?: unknown } } | null)?.pattern;
      return !!p && Array.isArray(p.steps) && Array.isArray(p.sounds) && p.steps.length === 4;
    });
    if (!old.length) return;
    const store = loadStore();
    old.forEach((t, i) => {
      const slot = store.slots.findIndex((s) => s === null);
      if (slot >= 0) store.slots[slot] = fromOldTape(t.pattern, `old tape ${"ABCD"[i] ?? i + 1}`);
    });
    saveStore(store);
    delete raw.tapes;
    localStorage.setItem(KEY, JSON.stringify(raw));
  } catch {
    // leave them be
  }
}
