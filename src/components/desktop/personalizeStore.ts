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
  { id: "dreamscene", label: "DreamScene" },
] as const;

export const ATMOSPHERES = [
  { id: "clean", label: "Clean", text: "Just the desktop." },
  { id: "tape", label: "Tape", text: "Film grain, scanlines, the odd dropout." },
  { id: "midnight", label: "Midnight", text: "Heavier grain, a red cast, and things that happen after dark." },
] as const;

export type Atmosphere = (typeof ATMOSPHERES)[number]["id"];
export type GlassColor = (typeof GLASS_COLORS)[number]["id"];
export type Wallpaper = (typeof WALLPAPERS)[number]["id"];

export interface Look {
  glass: GlassColor;
  wallpaper: Wallpaper;
  transparency: boolean;
  atmosphere: Atmosphere;
}

const STORAGE_KEY = "saeculo-look";
const DEFAULT_LOOK: Look = { glass: "sky", wallpaper: "aurora", transparency: true, atmosphere: "tape" };

interface PersonalizeState extends Look {
  set: (partial: Partial<Look>) => void;
  /** Load the saved look. Called from an effect after mount, so the first
   *  client render matches the server-rendered default. */
  hydrate: () => void;
}

/** Saves from before the atmosphere setting lack it: they get the default. */
function isLook(value: unknown): value is Omit<Look, "atmosphere"> & Partial<Pick<Look, "atmosphere">> {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    GLASS_COLORS.some((c) => c.id === v.glass) &&
    WALLPAPERS.some((w) => w.id === v.wallpaper) &&
    typeof v.transparency === "boolean" &&
    (v.atmosphere === undefined || ATMOSPHERES.some((a) => a.id === v.atmosphere))
  );
}

export const usePersonalizeStore = create<PersonalizeState>((set, get) => ({
  ...DEFAULT_LOOK,
  set: (partial) => {
    set(partial);
    const { glass, wallpaper, transparency, atmosphere } = get();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ glass, wallpaper, transparency, atmosphere }));
    } catch {
      // storage unavailable — the look still applies for this session
    }
  },
  hydrate: () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (isLook(saved)) set({ ...saved, atmosphere: saved.atmosphere ?? DEFAULT_LOOK.atmosphere });
    } catch {
      // corrupted or blocked storage — keep the default look
    }
  },
}));
