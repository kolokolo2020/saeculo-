import { create } from "zustand";
import type { WindowKind } from "@/lib/types";
import { useNow } from "@/hooks/useNow";

// The desktop's haunted moments: rare, brief, and never in the way. The
// scheduler in Haunts.tsx picks one per visit; each is a flag here that the
// piece of UI it touches reads.

export const HAUNTS = ["title", "clock", "cat", "bin"] as const;
export type Haunt = (typeof HAUNTS)[number];

export const HAUNT_TITLES = [
  "don't turn around",
  "who else is here?",
  "it's 3:33 am",
  "the tape is still recording",
  "he never left the room",
];

export const GHOST_FILES = ["reel_02_DO_NOT_WATCH.avi", "room_tone_4th_sound.wav", "the_saeculo_tapes.mpg"];

interface HauntState {
  /** A window whose title says something else for a moment. */
  title: { kind: WindowKind; text: string } | null;
  /** When the clocks started running backwards (epoch ms). */
  clockBack: number | null;
  cat: boolean;
  /** A file flickering into the Recycle Bin. */
  ghostFile: string | null;
  set: (partial: Partial<Omit<HauntState, "set">>) => void;
}

export const useHauntStore = create<HauntState>((set) => ({
  title: null,
  clockBack: null,
  cat: false,
  ghostFile: null,
  set: (partial) => set(partial),
}));

/** The time the clocks show: normally now, but running backwards from the
 *  moment a "clock" haunt starts until it ends. */
export function useClockNow(): { now: number; reversed: boolean } {
  const now = useNow();
  const back = useHauntStore((s) => s.clockBack);
  if (!back || !now) return { now, reversed: false };
  return { now: back - Math.max(0, now - back), reversed: true };
}
