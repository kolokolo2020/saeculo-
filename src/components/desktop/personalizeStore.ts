import { create } from "zustand";

export const GLASS_COLORS = [
  { id: "sky", label: "Sky", swatch: "#6fb0f0" },
  { id: "teal", label: "Teal", swatch: "#4cc4bd" },
  { id: "leaf", label: "Leaf", swatch: "#78c95a" },
  { id: "violet", label: "Violet", swatch: "#9a86e8" },
  { id: "rose", label: "Rose", swatch: "#ea8fb4" },
  { id: "graphite", label: "Graphite", swatch: "#8b95a3" },
] as const;

export const WALLPAPERS = [
  { id: "aurora", label: "Aurora" },
  { id: "harmony", label: "Harmony" },
  { id: "dusk", label: "Dusk" },
  { id: "midnight", label: "Midnight" },
] as const;

export type GlassColor = (typeof GLASS_COLORS)[number]["id"];
export type Wallpaper = (typeof WALLPAPERS)[number]["id"];

export interface Look {
  glass: GlassColor;
  wallpaper: Wallpaper;
  transparency: boolean;
}

const STORAGE_KEY = "saeculo-look";
const DEFAULT_LOOK: Look = { glass: "sky", wallpaper: "aurora", transparency: true };

interface PersonalizeState extends Look {
  set: (partial: Partial<Look>) => void;
  /** Load the saved look. Called from an effect after mount, so the first
   *  client render matches the server-rendered default. */
  hydrate: () => void;
}

function isLook(value: unknown): value is Look {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    GLASS_COLORS.some((c) => c.id === v.glass) &&
    WALLPAPERS.some((w) => w.id === v.wallpaper) &&
    typeof v.transparency === "boolean"
  );
}

export const usePersonalizeStore = create<PersonalizeState>((set, get) => ({
  ...DEFAULT_LOOK,
  set: (partial) => {
    set(partial);
    const { glass, wallpaper, transparency } = get();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ glass, wallpaper, transparency }));
    } catch {
      // storage unavailable — the look still applies for this session
    }
  },
  hydrate: () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (isLook(saved)) set(saved);
    } catch {
      // corrupted or blocked storage — keep the default look
    }
  },
}));
