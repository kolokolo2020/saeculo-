export type WindowKind =
  | "player"
  | "beatmaker"
  | "beatdeck"
  | "about"
  | "contact"
  | "recycle"
  | "personalize"
  | "vault"
  | "release"
  | "welcome";

export interface WindowState {
  kind: WindowKind;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
}

export interface Track {
  id: string;
  title: string;
  /** Tempo as shown to visitors. */
  bpm: number;
  /** Exact tempo of the audio file, measured, when it differs from `bpm` —
   *  Beat Deck's chops and the player's beat sync use this. */
  tempo?: number;
  /** Seconds from the start of the file to the first beat. */
  beatOffset?: number;
  /** Short subtitle: key, mood or genre. */
  mood: string;
  /** Square cover art under public/. */
  cover?: string;
  src: string;
  streamingLinks: { label: string; url: string }[];
}

export interface SocialLink {
  label: string;
  url: string;
  handle: string;
}
