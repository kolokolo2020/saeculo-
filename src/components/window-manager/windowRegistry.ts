import type { WindowKind } from "@/lib/types";

export interface AppMeta {
  kind: WindowKind;
  title: string;
  icon: string;
  desktopLabel: string;
}

export const APPS: AppMeta[] = [
  { kind: "music", title: "saeculo player", icon: "♫", desktopLabel: "My Beats.exe" },
  { kind: "beatmaker", title: "Beat Maker", icon: "▦", desktopLabel: "Beat Maker.exe" },
  { kind: "rhythm", title: "Rhythm Rush", icon: "▲", desktopLabel: "Rhythm Rush.exe" },
  { kind: "about", title: "About Me.txt — Notepad", icon: "▤", desktopLabel: "About Me.txt" },
  { kind: "contact", title: "Contact & Booking", icon: "✉", desktopLabel: "Contact.exe" },
];

export const APP_BY_KIND = Object.fromEntries(APPS.map((a) => [a.kind, a])) as Record<
  WindowKind,
  AppMeta
>;
