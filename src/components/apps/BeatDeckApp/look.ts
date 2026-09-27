import type { Genre, Rarity, Role } from "@/lib/beatdeck/cards";

export const ROLES: Role[] = ["kick", "snare", "hats", "bass", "melody", "fx"];

export const ROLE_LABEL: Record<Role, string> = {
  kick: "Kick",
  snare: "Snare",
  hats: "Hats",
  bass: "Bass",
  melody: "Melody",
  fx: "FX",
};

/** [light, dark] per role, the same family as the Beat Maker's lanes. */
export const ROLE_COLOR: Record<Role, [string, string]> = {
  kick: ["#ffc07a", "#d9660f"],
  snare: ["#9fd3ff", "#1f6fd1"],
  hats: ["#b8f0a7", "#25a025"],
  bass: ["#ffb3d6", "#c42a78"],
  melody: ["#d9c6ff", "#7a4fd6"],
  fx: ["#ffe7a3", "#c9920e"],
};

export const GENRE_LABEL: Record<Genre, string> = { trap: "Trap", boombap: "Boom bap", lofi: "Lo-fi", club: "Club" };

export const RARITY_COLOR: Record<Rarity, string> = { common: "#9fb2c9", uncommon: "#6fb4ff", rare: "#ffd27a" };

/** Record-disc colours for each certification, Demo → Platinum. */
export const CERT_COLOR = ["#8a96a6", "#39a6ff", "#2ec4b6", "#9a6bff", "#ffc94a", "#e8f1ff"];

export const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
