import { create } from "zustand";
import type { WindowKind, WindowState } from "@/lib/types";

const DEFAULT_SIZES: Record<WindowKind, { width: number; height: number }> = {
  saeculo: { width: 480, height: 560 },
  about: { width: 440, height: 420 },
  contact: { width: 400, height: 380 },
  beatmaker: { width: 620, height: 460 },
  rhythm: { width: 520, height: 480 },
};

const CASCADE_STEP = 32;

interface WindowManagerState {
  windows: Partial<Record<WindowKind, WindowState>>;
  focusedKind: WindowKind | null;
  nextZ: number;
  openCount: number;
  openWindow: (kind: WindowKind) => void;
  closeWindow: (kind: WindowKind) => void;
  toggleMinimize: (kind: WindowKind) => void;
  focusWindow: (kind: WindowKind) => void;
  setPosition: (kind: WindowKind, x: number, y: number) => void;
}

export const useWindowStore = create<WindowManagerState>((set) => ({
  windows: {},
  focusedKind: null,
  nextZ: 10,
  openCount: 0,

  openWindow: (kind) =>
    set((state) => {
      const existing = state.windows[kind];
      if (existing) {
        return {
          windows: {
            ...state.windows,
            [kind]: { ...existing, minimized: false, zIndex: state.nextZ },
          },
          focusedKind: kind,
          nextZ: state.nextZ + 1,
        };
      }
      const size = DEFAULT_SIZES[kind];
      const cascade = (state.openCount % 5) * CASCADE_STEP;
      const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
      const x = Math.max(16, Math.min(96 + cascade, vw - size.width - 16));
      const y = 48 + cascade;
      return {
        windows: {
          ...state.windows,
          [kind]: {
            kind,
            x,
            y,
            ...size,
            zIndex: state.nextZ,
            minimized: false,
          },
        },
        focusedKind: kind,
        nextZ: state.nextZ + 1,
        openCount: state.openCount + 1,
      };
    }),

  closeWindow: (kind) =>
    set((state) => {
      const windows = { ...state.windows };
      delete windows[kind];
      const remaining = Object.values(windows).filter((w) => !w.minimized);
      const top = remaining.sort((a, b) => b.zIndex - a.zIndex)[0];
      return {
        windows,
        focusedKind: state.focusedKind === kind ? (top?.kind ?? null) : state.focusedKind,
      };
    }),

  toggleMinimize: (kind) =>
    set((state) => {
      const existing = state.windows[kind];
      if (!existing) return state;
      const minimized = !existing.minimized;
      return {
        windows: {
          ...state.windows,
          [kind]: {
            ...existing,
            minimized,
            zIndex: minimized ? existing.zIndex : state.nextZ,
          },
        },
        focusedKind: minimized
          ? state.focusedKind === kind
            ? null
            : state.focusedKind
          : kind,
        nextZ: minimized ? state.nextZ : state.nextZ + 1,
      };
    }),

  focusWindow: (kind) =>
    set((state) => {
      const existing = state.windows[kind];
      if (!existing) return state;
      if (state.focusedKind === kind && !existing.minimized) return state;
      return {
        windows: {
          ...state.windows,
          [kind]: { ...existing, minimized: false, zIndex: state.nextZ },
        },
        focusedKind: kind,
        nextZ: state.nextZ + 1,
      };
    }),

  setPosition: (kind, x, y) =>
    set((state) => {
      const existing = state.windows[kind];
      if (!existing) return state;
      return { windows: { ...state.windows, [kind]: { ...existing, x, y } } };
    }),
}));
