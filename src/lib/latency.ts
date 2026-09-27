// A per-device timing correction for the rhythm games, measured by the
// calibration tool in the Games folder. Bluetooth headphones play sound
// 100–250 ms late, and the browser's own latency figure doesn't include
// that — so players tap late and every hit reads as a miss.
const KEY = "saeculo-latency-ms";
export const MIN_OFFSET_MS = -100;
export const MAX_OFFSET_MS = 400;

export function readLatencyOffsetMs(): number {
  try {
    const v = Number(localStorage.getItem(KEY));
    return Number.isFinite(v) ? Math.min(MAX_OFFSET_MS, Math.max(MIN_OFFSET_MS, v)) : 0;
  } catch {
    return 0;
  }
}

export function saveLatencyOffsetMs(ms: number) {
  try {
    localStorage.setItem(KEY, String(Math.round(Math.min(MAX_OFFSET_MS, Math.max(MIN_OFFSET_MS, ms)))));
  } catch {
    // storage unavailable — the correction lasts for this visit only
  }
}
