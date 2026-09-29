import { create } from "zustand";

// The site has four places. Three are windows on the desktop; the fourth,
// the game, takes over the whole screen.
export type WindowId = "beats" | "socials" | "contact";
export const WINDOW_IDS: WindowId[] = ["beats", "socials", "contact"];

export const WINDOW_TITLES: Record<WindowId, string> = {
  beats: "Beats",
  socials: "Socials",
  contact: "Contact",
};

interface WinState {
  open: boolean;
  minimized: boolean;
  x: number;
  y: number;
}

interface SiteState {
  windows: Record<WindowId, WinState>;
  /** Back-to-front stacking order of open windows. */
  order: WindowId[];
  gameOpen: boolean;
  introOpen: boolean;
  calm: boolean;

  openWindow: (id: WindowId) => void;
  closeWindow: (id: WindowId) => void;
  minimize: (id: WindowId) => void;
  focus: (id: WindowId) => void;
  moveWindow: (id: WindowId, x: number, y: number) => void;
  setGameOpen: (open: boolean) => void;
  setIntroOpen: (open: boolean) => void;
  setCalm: (calm: boolean) => void;
}

const CALM_KEY = "saeculo-calm";

const initialWindows: Record<WindowId, WinState> = {
  beats: { open: false, minimized: false, x: -1, y: -1 },
  socials: { open: false, minimized: false, x: -1, y: -1 },
  contact: { open: false, minimized: false, x: -1, y: -1 },
};

export const useSiteStore = create<SiteState>((set, get) => ({
  windows: initialWindows,
  order: [],
  gameOpen: false,
  introOpen: false,
  calm: false,

  openWindow: (id) =>
    set((s) => ({
      windows: { ...s.windows, [id]: { ...s.windows[id], open: true, minimized: false } },
      order: [...s.order.filter((w) => w !== id), id],
    })),
  closeWindow: (id) =>
    set((s) => ({
      windows: { ...s.windows, [id]: { ...s.windows[id], open: false, minimized: false } },
      order: s.order.filter((w) => w !== id),
    })),
  minimize: (id) =>
    set((s) => ({
      windows: { ...s.windows, [id]: { ...s.windows[id], minimized: true } },
      // a minimized window drops to the back so the next one up is active
      order: [id, ...s.order.filter((w) => w !== id)],
    })),
  focus: (id) => {
    const { order, windows } = get();
    if (order[order.length - 1] === id && !windows[id].minimized) return;
    set({
      windows: { ...windows, [id]: { ...windows[id], minimized: false } },
      order: [...order.filter((w) => w !== id), id],
    });
  },
  moveWindow: (id, x, y) => set((s) => ({ windows: { ...s.windows, [id]: { ...s.windows[id], x, y } } })),
  setGameOpen: (gameOpen) => set({ gameOpen }),
  setIntroOpen: (introOpen) => set({ introOpen }),
  setCalm: (calm) => {
    try {
      localStorage.setItem(CALM_KEY, calm ? "1" : "0");
    } catch {
      // not remembered
    }
    document.documentElement.dataset.calm = String(calm);
    set({ calm });
  },
}));

/** The window on top that isn't minimized, if any. */
export function activeWindow(s: Pick<SiteState, "order" | "windows">): WindowId | null {
  for (let i = s.order.length - 1; i >= 0; i--) {
    const id = s.order[i];
    if (s.windows[id].open && !s.windows[id].minimized) return id;
  }
  return null;
}

export function readCalm(): boolean {
  try {
    return localStorage.getItem(CALM_KEY) === "1";
  } catch {
    return false;
  }
}
