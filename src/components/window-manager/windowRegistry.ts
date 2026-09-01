import type { WindowKind } from "@/lib/types";

export interface AppMeta {
  kind: WindowKind;
  title: string;
  icon: string;
  desktopLabel: string;
}

export const APPS: AppMeta[] = [
  { kind: "saeculo", title: "saeculo — now playing", icon: "▸", desktopLabel: "saeculo.wav" },
  { kind: "beatmaker", title: "Beat Maker", icon: "▦", desktopLabel: "beatmaker.exe" },
  { kind: "rhythm", title: "Rhythm Rush", icon: "▲", desktopLabel: "rhythmrush.exe" },
  { kind: "about", title: "about.txt — Notepad", icon: "▤", desktopLabel: "about.txt" },
  { kind: "contact", title: "Booking & Contact", icon: "@", desktopLabel: "booking.exe" },
];

export const APP_BY_KIND = Object.fromEntries(APPS.map((a) => [a.kind, a])) as Record<
  WindowKind,
  AppMeta
>;
