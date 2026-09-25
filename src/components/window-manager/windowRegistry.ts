import type { WindowKind } from "@/lib/types";

export type AppCategory = "app" | "game" | "system";

export interface AppMeta {
  kind: WindowKind;
  title: string;
  /** Label under the desktop icon and in the start menu. */
  label: string;
  /** One-line blurb for the start menu and Games Explorer. */
  description: string;
  category: AppCategory;
  /** Light Explorer/Notepad client area, or the glossy dark media body. */
  surface: "light" | "dark";
  onDesktop: boolean;
  defaultSize: { width: number; height: number };
}

export const APPS: AppMeta[] = [
  {
    kind: "player",
    title: "saeculo Media Player",
    label: "Media Player",
    description: "Play the beats, with live visualizers",
    category: "app",
    surface: "dark",
    onDesktop: true,
    defaultSize: { width: 520, height: 540 },
  },
  {
    kind: "beatmaker",
    title: "Beat Maker",
    label: "Beat Maker",
    description: "Build a 16-step drum loop",
    category: "app",
    surface: "dark",
    onDesktop: true,
    defaultSize: { width: 640, height: 430 },
  },
  {
    kind: "games",
    title: "Games",
    label: "Games",
    description: "Rhythm games synced to the beats",
    category: "system",
    surface: "light",
    onDesktop: true,
    defaultSize: { width: 560, height: 420 },
  },
  {
    kind: "rhythm",
    title: "Rhythm Rush",
    label: "Rhythm Rush",
    description: "Hit the notes as they cross the line",
    category: "game",
    surface: "dark",
    onDesktop: false,
    defaultSize: { width: 500, height: 560 },
  },
  {
    kind: "brawl",
    title: "Beat Brawl",
    label: "Beat Brawl",
    description: "Out-rhythm the metronome boss",
    category: "game",
    surface: "dark",
    onDesktop: false,
    defaultSize: { width: 520, height: 600 },
  },
  {
    kind: "pads",
    title: "Pad Recall",
    label: "Pad Recall",
    description: "Repeat the drum-pad pattern",
    category: "game",
    surface: "dark",
    onDesktop: false,
    defaultSize: { width: 460, height: 520 },
  },
  {
    kind: "about",
    title: "about.txt - Notepad",
    label: "about.txt",
    description: "Who is saeculo?",
    category: "app",
    surface: "light",
    onDesktop: true,
    defaultSize: { width: 480, height: 400 },
  },
  {
    kind: "contact",
    title: "New Message - Booking",
    label: "Contact",
    description: "Booking, collabs & licensing",
    category: "app",
    surface: "light",
    onDesktop: true,
    defaultSize: { width: 480, height: 440 },
  },
  {
    kind: "recycle",
    title: "Recycle Bin",
    label: "Recycle Bin",
    description: "Beats that didn't make the cut",
    category: "system",
    surface: "light",
    onDesktop: true,
    defaultSize: { width: 460, height: 340 },
  },
];

export const APP_BY_KIND = Object.fromEntries(APPS.map((a) => [a.kind, a])) as Record<
  WindowKind,
  AppMeta
>;

export const GAMES = APPS.filter((a) => a.category === "game");
