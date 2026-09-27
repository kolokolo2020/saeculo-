"use client";

import { usePersonalizeStore, type Atmosphere } from "@/components/desktop/personalizeStore";
import { useLateNight } from "./useLateNight";

/** The atmosphere in effect: Tape turns into Midnight between midnight and
 *  4 am; Clean always stays clean. */
export function useAtmosphere(): Atmosphere {
  const chosen = usePersonalizeStore((s) => s.atmosphere);
  const lateNight = useLateNight();
  return chosen === "tape" && lateNight ? "midnight" : chosen;
}
