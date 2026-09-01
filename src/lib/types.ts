export type WindowKind = "saeculo" | "beatmaker" | "rhythm" | "about" | "contact";

export interface WindowState {
  kind: WindowKind;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
}

export interface Track {
  id: string;
  title: string;
  bpm: number;
  mood: string;
  src: string;
  streamingLinks: { label: string; url: string }[];
}

export interface SocialLink {
  label: string;
  url: string;
  handle: string;
}
