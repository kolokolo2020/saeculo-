// What you can hit with, and what patches you up. Some weapons are earned
// (fights won, the ones who run the underpass and the block), the rest are
// bought off Smokey, the man in the long coat in the alley. Food and drink
// are bought at the corner store and the club.

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
  /** Seconds it leaves them reeling (a taser, a spray). */
  stun?: number;
  unlock: { wins: number } | { boss: true } | { start: true } | { buy: number } | { beat: "rook" | "kade" };
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
  { id: "spray", name: "pepper spray", dmg: 3, reach: 24, cooldown: 0.9, knock: 20, sweep: true, stun: 1.1, unlock: { buy: 45 }, found: "", colors: ["#b33a3a", "#e8e0cf"], len: 3 },
  { id: "pipe", name: "lead pipe", dmg: 15, reach: 16, cooldown: 0.5, knock: 120, unlock: { buy: 60 }, found: "", colors: ["#6a6d74", "#9aa0aa"], len: 9 },
  { id: "blade", name: "switchblade", dmg: 12, reach: 12, cooldown: 0.22, knock: 40, unlock: { buy: 90 }, found: "", colors: ["#26262b", "#d9d9d9"], len: 4 },
  { id: "golf", name: "golf club", dmg: 14, reach: 21, cooldown: 0.52, knock: 150, unlock: { buy: 110 }, found: "", colors: ["#9aa0aa", "#d9d9d9"], len: 12 },
  { id: "nunchucks", name: "nunchucks", dmg: 10, reach: 15, cooldown: 0.2, knock: 60, sweep: true, unlock: { buy: 160 }, found: "", colors: ["#5a3a22", "#8a6038"], len: 7 },
  { id: "taser", name: "taser", dmg: 8, reach: 12, cooldown: 0.8, knock: 30, stun: 1.6, unlock: { buy: 240 }, found: "", colors: ["#1b1b1f", "#4fe3ff"], len: 4 },
  { id: "machete", name: "machete", dmg: 21, reach: 18, cooldown: 0.58, knock: 110, sweep: true, unlock: { buy: 380 }, found: "", colors: ["#3a2a1e", "#c9ccd4"], len: 10 },
  { id: "sledge", name: "sledgehammer", dmg: 32, reach: 18, cooldown: 0.95, knock: 260, unlock: { buy: 520 }, found: "", colors: ["#5a3a22", "#5a5d66"], len: 12 },
  { id: "spiked", name: "spiked bat", dmg: 25, reach: 18, cooldown: 0.52, knock: 170, unlock: { beat: "rook" }, found: "Rook's bat, the one with the nails in it, on the ground where he dropped it. Nobody's going to ask for it back.", colors: ["#7a5030", "#c9ccd4"], len: 10 },
  { id: "cane", name: "gold cane", dmg: 28, reach: 22, cooldown: 0.5, knock: 210, sweep: true, unlock: { beat: "kade" }, found: "Kade's cane, the gold top dented now. Mr. Vance can buy another.", colors: ["#111216", "#f0c850"], len: 13 },
];
export const weaponById = (id: string) => WEAPONS.find((w) => w.id === id) ?? WEAPONS[0];

/** Weapons earned by this many wins (boss weapons aside). */
export const unlockedByWins = (wins: number) => WEAPONS.filter((w) => "wins" in w.unlock && wins >= w.unlock.wins).map((w) => w.id);
/** What Smokey sells, cheapest first. */
export const FOR_SALE = WEAPONS.filter((w): w is Weapon & { unlock: { buy: number } } => "buy" in w.unlock).sort((a, b) => a.unlock.buy - b.unlock.buy);
/** How you come by a weapon, in a few words. */
export const howToGet = (w: Weapon) =>
  "wins" in w.unlock ? `win ${w.unlock.wins} ${w.unlock.wins === 1 ? "fight" : "fights"}` : "boss" in w.unlock ? "beat Tank" : "buy" in w.unlock ? `$${w.unlock.buy} from Smokey in the alley` : "beat" in w.unlock ? (w.unlock.beat === "rook" ? "take Rook down" : "take Kade down") : "";

export interface Consumable {
  id: string;
  name: string;
  heal: number;
  price: number;
  /** Where it's sold. */
  at: "store" | "club" | "boutique";
  line: string;
}

export const CONSUMABLES: Consumable[] = [
  { id: "noodles", name: "instant noodles", heal: 35, price: 4, at: "store", line: "Hot, salty, too fast. Better." },
  { id: "energy", name: "energy drink", heal: 20, price: 3, at: "store", line: "Tastes like a battery. Your hands stop shaking." },
  { id: "plasters", name: "plasters", heal: 50, price: 8, at: "store", line: "You patch up the worst of it." },
  { id: "water", name: "bottle of water", heal: 10, price: 1, at: "store", line: "Cold. You drink half and pour the rest on your neck." },
  { id: "drink", name: "something purple", heal: 25, price: 6, at: "club", line: "Sweet and heavy. The room tilts a little, nicely." },
  { id: "bottle-service", name: "bottle service", heal: 100, price: 60, at: "club", line: "A sparkler in the bottle, a whole booth's worth. You feel brand new." },
  { id: "kit", name: "first-aid kit", heal: 80, price: 25, at: "store", line: "Gauze, tape, the works. You wince and wrap." },
];
export const consumableById = (id: string) => CONSUMABLES.find((c) => c.id === id);
