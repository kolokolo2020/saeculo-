// Keys, scales and chords for the piano roll and the starter projects.

export const KEY_NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];

export const SCALES: Record<string, { name: string; steps: number[] }> = {
  minor: { name: "minor", steps: [0, 2, 3, 5, 7, 8, 10] },
  major: { name: "major", steps: [0, 2, 4, 5, 7, 9, 11] },
  dorian: { name: "dorian", steps: [0, 2, 3, 5, 7, 9, 10] },
  phrygian: { name: "phrygian", steps: [0, 1, 3, 5, 7, 8, 10] },
  harmonic: { name: "harmonic minor", steps: [0, 2, 3, 5, 7, 8, 11] },
  pentatonic: { name: "minor pentatonic", steps: [0, 3, 5, 7, 10] },
};

export const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
export const noteName = (midi: number) => `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
export const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export function inScale(midi: number, key: number, scale: string): boolean {
  const steps = SCALES[scale]?.steps ?? SCALES.minor.steps;
  return steps.includes((((midi - key) % 12) + 12) % 12);
}

/** The n-th degree (0-based, can exceed the scale) above the key's root at `base`. */
export function degree(key: number, scale: string, n: number, base = 48): number {
  const steps = SCALES[scale]?.steps ?? SCALES.minor.steps;
  const oct = Math.floor(n / steps.length);
  const i = ((n % steps.length) + steps.length) % steps.length;
  return base + key + oct * 12 + steps[i];
}

/** A chord stacked in thirds from a scale degree: 3 = triad, 4 = seventh, 5 = ninth. */
export function chordOn(key: number, scale: string, deg: number, size = 4, base = 48): number[] {
  return Array.from({ length: size }, (_, i) => degree(key, scale, deg + i * 2, base));
}

/** The scale degree nearest below a midi note (for snapping a click to a chord root). */
export function degreeOf(midi: number, key: number, scale: string, base = 0): number {
  for (let n = 90; n >= -40; n--) if (degree(key, scale, n, base) <= midi) return n;
  return 0;
}

/** The nearest scale note at or below `midi`. */
export const snapToScale = (midi: number, key: number, scale: string) => degree(key, scale, degreeOf(midi, key, scale, 0), 0);
