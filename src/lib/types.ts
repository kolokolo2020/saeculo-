export interface Track {
  /** Lowercase, dashes only. Used in share links (#track=<id>). */
  id: string;
  title: string;
  /** Tempo as shown to visitors. Optional. */
  bpm?: number;
  /** Exact tempo of the audio, measured by scripts/analyze-tracks.mjs. */
  tempo?: number;
  /** Seconds from the start of the file to the first beat (measured). */
  beatOffset?: number;
  /** Key or a short note, shown next to the title. Optional. */
  key?: string;
  /** The MP3 under public/. */
  src: string;
  /** When it went up (YYYY-MM-DD). Tracks from the last 30 days get a "new" tag. */
  added?: string;
}

export interface SocialLink {
  label: string;
  url: string;
  handle: string;
}
