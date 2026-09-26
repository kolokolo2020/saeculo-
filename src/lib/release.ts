import { PROFILE } from "@/data/profile";

export interface ReleaseProgress {
  /** 0–1, how far from the announcement to the drop. */
  fraction: number;
  done: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/** Countdown state at `now` (epoch ms), or null when no release is set. */
export function releaseProgress(now: number): ReleaseProgress | null {
  const release = PROFILE.nextRelease;
  if (!release) return null;
  const start = Date.parse(release.announced);
  const end = Date.parse(release.date);
  const left = Math.max(0, end - now);
  const fraction = end > start ? Math.min(1, Math.max(0, (now - start) / (end - start))) : 1;
  const s = Math.floor(left / 1000);
  return {
    fraction,
    done: left === 0,
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");
export const formatLeft = (p: ReleaseProgress) =>
  `${p.days}d ${pad(p.hours)}:${pad(p.minutes)}:${pad(p.seconds)}`;
