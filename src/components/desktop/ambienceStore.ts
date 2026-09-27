import { create } from "zustand";
import { startAmbience, stopAmbience } from "@/lib/ambience";

// Whether the room tone is on, remembered between visits. A saved "on"
// waits for the first click of the visit before it makes a sound.
const KEY = "saeculo-ambience";

interface AmbienceState {
  on: boolean;
  toggle: () => void;
  /** Read the saved choice and arm it for the first click. */
  hydrate: () => void;
}

const save = (on: boolean) => {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // not remembered
  }
};

export const useAmbienceStore = create<AmbienceState>((set, get) => ({
  on: false,
  toggle: () => {
    const on = !get().on;
    set({ on });
    save(on);
    if (on) startAmbience();
    else stopAmbience();
  },
  hydrate: () => {
    let saved = false;
    try {
      saved = localStorage.getItem(KEY) === "on";
    } catch {
      // storage unavailable
    }
    if (!saved) return;
    set({ on: true });
    const first = () => {
      if (get().on) startAmbience();
    };
    window.addEventListener("pointerdown", first, { once: true });
  },
}));
