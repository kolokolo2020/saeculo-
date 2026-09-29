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
  maximized: boolean;
  x: number;
  y: number;
}

export type VisMode = "reveal" | "scan";

interface SiteState {
  windows: Record<WindowId, WinState>;
  /** Back-to-front stacking order of open windows. */
  order: WindowId[];
  gameOpen: boolean;
  introOpen: boolean;
  calm: boolean;
  /** The moving visualizer's look (when not calm). */
  vis: VisMode;
  shortcutsOpen: boolean;
  /** "Sample this": a track and a moment, waiting for the studio to pick it up. */
  sample: { trackId: string; at: number } | null;

  openWindow: (id: WindowId) => void;
  closeWindow: (id: WindowId) => void;
  minimize: (id: WindowId) => void;
  focus: (id: WindowId) => void;
  moveWindow: (id: WindowId, x: number, y: number) => void;
  setGameOpen: (open: boolean) => void;
  setIntroOpen: (open: boolean) => void;
  setCalm: (calm: boolean) => void;
  /** Visuals: reveal → scan → still → reveal. */
  cycleVisuals: () => void;
  toggleMaximize: (id: WindowId) => void;
  /** Remember where the windows sit, for the next visit. */
  rememberPositions: () => void;
  setShortcutsOpen: (open: boolean) => void;
  /** Take the playing beat into the game's studio, cut from this moment. */
  sampleInStudio: (trackId: string, at: number) => void;
}

const CALM_KEY = "saeculo-calm";
const VIS_KEY = "saeculo-vis";
const POS_KEY = "saeculo-windows";

const initialWindows: Record<WindowId, WinState> = {
  beats: { open: false, minimized: false, maximized: false, x: -1, y: -1 },
  socials: { open: false, minimized: false, maximized: false, x: -1, y: -1 },
  contact: { open: false, minimized: false, maximized: false, x: -1, y: -1 },
};

export const useSiteStore = create<SiteState>((set, get) => ({
  windows: initialWindows,
  order: [],
  gameOpen: false,
  introOpen: false,
  calm: false,
  vis: "reveal",
  shortcutsOpen: false,
  sample: null,

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
  cycleVisuals: () => {
    const { calm, vis, setCalm } = get();
    if (calm) {
      setCalm(false);
      set({ vis: "reveal" });
    } else if (vis === "reveal") set({ vis: "scan" });
    else setCalm(true);
    try {
      localStorage.setItem(VIS_KEY, get().vis);
    } catch {
      // not remembered
    }
  },
  toggleMaximize: (id) => set((s) => ({ windows: { ...s.windows, [id]: { ...s.windows[id], maximized: !s.windows[id].maximized, minimized: false } } })),
  rememberPositions: () => {
    try {
      const w = get().windows;
      const pos = Object.fromEntries(WINDOW_IDS.map((id) => [id, { x: w[id].x, y: w[id].y }]));
      localStorage.setItem(POS_KEY, JSON.stringify(pos));
    } catch {
      // not remembered
    }
  },
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
  sampleInStudio: (trackId, at) => set({ sample: { trackId, at }, gameOpen: true }),
}));

/** Saved look and window positions, applied after the first render. */
export function restoreSitePrefs() {
  const patch: Partial<SiteState> = {};
  try {
    const vis = localStorage.getItem(VIS_KEY);
    if (vis === "scan" || vis === "reveal") patch.vis = vis;
    const pos = JSON.parse(localStorage.getItem(POS_KEY) ?? "null");
    if (pos && typeof pos === "object") {
      const windows = { ...useSiteStore.getState().windows };
      for (const id of WINDOW_IDS) {
        const p = pos[id];
        if (p && typeof p.x === "number" && typeof p.y === "number" && p.x >= 0 && p.y >= 0) windows[id] = { ...windows[id], x: p.x, y: p.y };
      }
      patch.windows = windows;
    }
  } catch {
    // defaults
  }
  useSiteStore.setState(patch);
}

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
