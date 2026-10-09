// What you can hit with, and what patches you up. Weapons are earned, not
// bought: each comes from fights won (or from the one at the underpass who
// doesn't lose). Food and drink are bought at the corner store and the club.

export interface Weapon {
  id: string;
  name: string;
  /** Damage per hit. */
  dmg: number;
  /** How far in front of you it lands, in pixels. */
  reach: number;
  /** Seconds between swings. */
  cooldown: number;
  /** How hard it shoves, px/s. */
  knock: number;
  /** Hits everyone in reach, not just the nearest. */
  sweep?: boolean;
  unlock: { wins: number } | { boss: true } | { start: true };
  /** How it's handed to you. */
  found: string;
  /** Sprite colours: [handle/main, tip]. */
  colors: [string, string];
  /** Length of the drawn thing, in pixels. */
  len: number;
}

export const WEAPONS: Weapon[] = [
  { id: "fists", name: "fists", dmg: 7, reach: 11, cooldown: 0.36, knock: 60, unlock: { start: true }, found: "", colors: ["#c99a7c", "#c99a7c"], len: 0 },
  { id: "bat", name: "wooden bat", dmg: 13, reach: 16, cooldown: 0.48, knock: 110, unlock: { wins: 1 }, found: "One of them leaves a wooden bat behind. It's yours now.", colors: ["#8a6038", "#b88a52"], len: 9 },
  { id: "chain", name: "bike chain", dmg: 11, reach: 19, cooldown: 0.42, knock: 80, sweep: true, unlock: { wins: 4 }, found: "Someone's bike chain, swinging off a railing. You wrap it round your hand.", colors: ["#8a8d94", "#c9ccd4"], len: 10 },
  { id: "knuckles", name: "brass knuckles", dmg: 16, reach: 11, cooldown: 0.28, knock: 90, unlock: { wins: 7 }, found: "Brass knuckles, dropped in the gutter as they ran. Heavy, cold.", colors: ["#d8b35a", "#f0d080"], len: 2 },
  { id: "crowbar", name: "crowbar", dmg: 19, reach: 17, cooldown: 0.6, knock: 140, unlock: { wins: 10 }, found: "A crowbar in the skip by the alley. You've earned it, apparently.", colors: ["#3a3c42", "#9a3a2a"], len: 10 },
  { id: "mic", name: "mic stand", dmg: 22, reach: 22, cooldown: 0.62, knock: 190, sweep: true, unlock: { boss: true }, found: "Tank's mic stand from the cypher. “Keep it. You've got the voice for it.”", colors: ["#2a2c33", "#9aa0aa"], len: 13 },
];
export const weaponById = (id: string) => WEAPONS.find((w) => w.id === id) ?? WEAPONS[0];

/** Weapons earned by this many wins (boss weapons aside). */
export const unlockedByWins = (wins: number) => WEAPONS.filter((w) => "wins" in w.unlock && wins >= w.unlock.wins).map((w) => w.id);

export interface Consumable {
  id: string;
  name: string;
  heal: number;
  price: number;
  /** Where it's sold. */
  at: "store" | "club";
  line: string;
}

export const CONSUMABLES: Consumable[] = [
  { id: "noodles", name: "instant noodles", heal: 35, price: 4, at: "store", line: "Hot, salty, too fast. Better." },
  { id: "energy", name: "energy drink", heal: 20, price: 3, at: "store", line: "Tastes like a battery. Your hands stop shaking." },
  { id: "plasters", name: "plasters", heal: 50, price: 8, at: "store", line: "You patch up the worst of it." },
  { id: "water", name: "bottle of water", heal: 10, price: 1, at: "store", line: "Cold. You drink half and pour the rest on your neck." },
  { id: "drink", name: "something purple", heal: 25, price: 6, at: "club", line: "Sweet and heavy. The room tilts a little, nicely." },
];
export const consumableById = (id: string) => CONSUMABLES.find((c) => c.id === id);
