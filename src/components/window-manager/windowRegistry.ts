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
  /** Left out of the start menu and its search — found, not listed. */
  hidden?: boolean;
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
    description: "An 8-lane groovebox with chords, swing and a filter",
    category: "app",
    surface: "dark",
    onDesktop: true,
    defaultSize: { width: 840, height: 650 },
  },
  {
    kind: "beatdeck",
    title: "Beat Deck",
    label: "Beat Deck",
    description: "Make beats for clients, beat the bosses",
    category: "game",
    surface: "dark",
    onDesktop: true,
    defaultSize: { width: 960, height: 680 },
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
  {
    kind: "personalize",
    title: "Personalize",
    label: "Personalize",
    description: "Glass color & desktop background",
    category: "system",
    surface: "light",
    onDesktop: false,
    defaultSize: { width: 500, height: 470 },
  },
  {
    kind: "welcome",
    title: "Welcome Center",
    label: "Welcome Center",
    description: "Start here: the music, the game, the links",
    category: "system",
    surface: "light",
    onDesktop: false,
    defaultSize: { width: 660, height: 630 },
  },
  {
    kind: "release",
    title: "Downloading next_single.exe",
    label: "next_single.exe",
    description: "Countdown to the next release",
    category: "app",
    surface: "light",
    onDesktop: true,
    defaultSize: { width: 420, height: 270 },
  },
  {
    kind: "vault",
    title: "vault.zip",
    label: "vault.zip",
    description: "Password protected",
    category: "system",
    surface: "light",
    onDesktop: false,
    hidden: true,
    defaultSize: { width: 460, height: 420 },
  },
];

export const APP_BY_KIND = Object.fromEntries(APPS.map((a) => [a.kind, a])) as Record<
  WindowKind,
  AppMeta
>;

