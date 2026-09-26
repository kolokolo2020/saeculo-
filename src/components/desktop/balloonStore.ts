import { create } from "zustand";

export interface Balloon {
  id: number;
  title: string;
  body: string;
}

interface BalloonState {
  balloon: Balloon | null;
  show: (title: string, body: string) => void;
  dismiss: () => void;
}

let nextId = 1;

// One notification balloon at a time, popping out of the tray like the
// system notifications of the era. A new one replaces the old.
export const useBalloonStore = create<BalloonState>((set) => ({
  balloon: null,
  show: (title, body) => set({ balloon: { id: nextId++, title, body } }),
  dismiss: () => set({ balloon: null }),
}));
