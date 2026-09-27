import data from "@/data/trackAnalysis.json";

// What scripts/analyze-tracks.mjs measured for each track: its waveform,
// exact tempo and first beat, and a palette from its cover.
export interface TrackPalette {
  accent: string;
  second: string;
  deep: string;
}

export interface TrackAnalysis {
  duration: number;
  tempo: number;
  beatOffset: number;
  /** 600 columns, 0..1: loudest sample. */
  peaks: number[];
  /** 600 columns, 0..1: average loudness. */
  rms: number[];
  palette: TrackPalette | null;
}

export const DEFAULT_PALETTE: TrackPalette = { accent: "hsl(207 90% 62%)", second: "hsl(160 70% 55%)", deep: "hsl(215 60% 8%)" };

const ANALYSIS = data as Record<string, TrackAnalysis>;

export const analysisFor = (id: string): TrackAnalysis | undefined => ANALYSIS[id];
export const paletteFor = (id: string): TrackPalette => ANALYSIS[id]?.palette ?? DEFAULT_PALETTE;
