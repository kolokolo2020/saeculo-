import { create } from "zustand";
import type { WindowKind, WindowState } from "@/lib/types";
import { APP_BY_KIND } from "./windowRegistry";

const CASCADE_STEP = 30;
export const TASKBAR_HEIGHT = 40;
export const MIN_WINDOW = { width: 320, height: 240 };

interface WindowManagerState {
  windows: Partial<Record<WindowKind, WindowState>>;
  focusedKind: WindowKind | null;
  nextZ: number;
  openCount: number;
  openWindow: (kind: WindowKind) => void;
  closeWindow: (kind: WindowKind) => void;
  toggleMinimize: (kind: WindowKind) => void;
  toggleMaximize: (kind: WindowKind) => void;
  focusWindow: (kind: WindowKind) => void;
  setPosition: (kind: WindowKind, x: number, y: number) => void;
  setSize: (kind: WindowKind, width: number, height: number) => void;
  minimizeAll: () => void;
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
      const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
      const vh = typeof window !== "undefined" ? window.innerHeight : 800;
      const base = APP_BY_KIND[kind].defaultSize;
      // never open bigger than the screen minus the taskbar
      const width = Math.min(base.width, vw - 24);
      const height = Math.min(base.height, vh - TASKBAR_HEIGHT - 24);
      const cascade = (state.openCount % 6) * CASCADE_STEP;
      const x = Math.max(12, Math.min(140 + cascade, vw - width - 12));
      const y = Math.max(8, Math.min(28 + cascade, vh - TASKBAR_HEIGHT - height - 8));
      return {
        windows: {
          ...state.windows,
          [kind]: {
            kind,
            x,
            y,
            width,
            height,
            zIndex: state.nextZ,
            minimized: false,
            maximized: false,
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

  toggleMaximize: (kind) =>
    set((state) => {
      const existing = state.windows[kind];
      if (!existing) return state;
      return {
        windows: {
          ...state.windows,
          [kind]: { ...existing, maximized: !existing.maximized, zIndex: state.nextZ },
        },
        focusedKind: kind,
        nextZ: state.nextZ + 1,
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

  setSize: (kind, width, height) =>
    set((state) => {
      const existing = state.windows[kind];
      if (!existing) return state;
      return { windows: { ...state.windows, [kind]: { ...existing, width, height } } };
    }),

  minimizeAll: () =>
    set((state) => ({
      windows: Object.fromEntries(
        Object.entries(state.windows).map(([k, w]) => [k, { ...w, minimized: true }]),
      ) as WindowManagerState["windows"],
      focusedKind: null,
    })),
}));
