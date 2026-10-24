import { huntedBy, shelterOf, tierOf } from "./career";
import type { SaveData } from "./save";
import type { Place } from "./sfx";
import { SCENES, TILE, type Dir } from "./world";

// The game's numbers and lookups: walking speed and keys, place names, where
// each findable sound is hinted, and how trouble finds you.

export const SPEED = 62; // px per second
export const KEYMAP: Record<string, Dir> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};
export const PLACE_NAMES: Record<Place, string> = {
  bedroom: "Your room",
  street: "Outside",
  store: "Corner store",
  studio: "Studio",
  park: "The park",
  rooftop: "The roof",
  avenue: "The avenue",
  alley: "The alley",
  records: "Record shop",
  thrift: "Thrift shop",
  club: "The club",
  subway: "Subway",
  underpass: "Underpass",
  boutique: "Maison",
};
export const HINT_AT: Record<string, string> = { rain: "window", phone: "phone", bottle: "counter", lighter: "bench", basketball: "hoop", chimes: "chimes", spray: "wall", dice: "dice", scratch: "crates", train: "edge", crowd: "booth", mic: "speaker" };
/** Where trouble finds you, and how likely it is when you walk in. */
export const ROUGH: Partial<Record<Place, number>> = { street: 0, park: 0, avenue: 0.05, alley: 0.25, subway: 0.1, underpass: 0.2 };
/** Seconds of peace after trouble, whichever way it went. */
export const BREATHER = 60;
/**
 * Carrying Dre's tape you're worth stopping: trouble comes this much sooner,
 * and is this much likelier to be waiting when you walk into a rough place
 * (never more than 45%, and never inside the breather).
 */
export const CARRY_SOONER = 1.6;
const CARRY_ODDS = 1.8;
export const carrying = (v: SaveData) => v.job?.stage === "carry";
/**
 * Where trouble can find you as things stand: the rough places, and once
 * people know your face (or someone's after you) anywhere outside but your
 * own roof.
 */
export const troubleHere = (place: Place, v: SaveData) => ROUGH[place] !== undefined || (place !== "rooftop" && !!SCENES[place].outdoors && (tierOf(v.fans) >= 2 || !!huntedBy(v) || v.heat >= 2));
/** How likely trouble is to be waiting when you walk in. */
export const ambushOdds = (place: Place, v: SaveData) => {
  if (!troubleHere(place, v)) return 0;
  const fame = Math.max(0, tierOf(v.fans) - 1) * 0.04;
  const hunted = huntedBy(v) ? 0.3 : 0;
  return Math.min(hunted ? 0.65 : 0.45, ((ROUGH[place] ?? 0) + fame) * (carrying(v) ? CARRY_ODDS : 1) * shelterOf(v) + hunted);
};
/** How much sooner trouble comes round, as things stand (the tape on you, your face, who's after you, who you pay). */
export const troublePace = (v: SaveData) => (carrying(v) ? CARRY_SOONER : 1) * (1 + tierOf(v.fans) * 0.12) * (huntedBy(v) ? 2.4 : 1) * (shelterOf(v) < 1 ? 0.6 : 1) * (1 + Math.floor(v.heat) * 0.15);
/** What they say when they've seen the tape on you. */
const TAPE_LINES = [
  ["One of them nods at your pocket.", "\u201cWhat's on the tape?\u201d"],
  ["\u201cOi. That a tape?\u201d", "\u201cWhat's on the tape? Give us a listen.\u201d"],
  ["\u201cYou're carrying. Anyone can see you're carrying.\u201d", "\u201cSo what's on the tape?\u201d"],
];
export const tapeLines = () => TAPE_LINES[Math.floor(Math.random() * TAPE_LINES.length)];
/** Pet the alley cat this many times in one visit and it comes with you for a bit. */
export const CAT_PETS = 3;
export const BOOMBOX = { x: 17.6 * TILE, y: 4.4 * TILE };
