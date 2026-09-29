import type { Look, Pose } from "./people";
import type { Place } from "./sfx";
import { sceneSize, SCENES, TILE, type Dir, type Rect } from "./world";

// The neighbourhood's inhabitants: people hanging out, a dog walker and
// their dog, traffic, cyclists, pigeons. Each place keeps its own; only
// the place you're in is simulated (traffic keeps its own timer).

export type Item = "cup" | "joint" | "bottle" | "phone" | "headphones" | "ball";
export type ActorKind = "person" | "dog" | "pigeon" | "car" | "bike";

export interface Actor {
  id: string;
  kind: ActorKind;
  place: Place;
  x: number;
  y: number;
  dir: Dir;
  look?: Look;
  pose?: Pose;
  item?: Item;
  /** Nods along when there's music in the room. */
  bob?: boolean;
  /** Can be talked to; the label is the prompt. */
  talk?: string;
  solid?: boolean;
  // walking
  path?: [number, number][];
  pi?: number;
  speed?: number;
  wait?: number;
  walking?: boolean;
  follow?: string;
  // vehicles
  color?: string;
  vx?: number;
  stopped?: number;
  honkAt?: number;
  rung?: boolean;
  // pigeons
  home?: [number, number];
  fly?: number;
  away?: number;
  // animation clock and small events
  t: number;
  sip?: number;
}

const T = TILE;
const person = (id: string, place: Place, x: number, y: number, look: Look, extra: Partial<Actor> = {}): Actor => ({
  id,
  kind: "person",
  place,
  x: x * T,
  y: y * T,
  dir: "down",
  look,
  pose: "stand",
  solid: true,
  t: Math.random() * 10,
  ...extra,
});

export function makeLife(): Actor[] {
  const pigeons = (place: Place, spots: [number, number][]) =>
    spots.map(([x, y], i): Actor => ({ id: `pigeon-${place}-${i}`, kind: "pigeon", place, x: x * T, y: y * T, dir: i % 2 ? "left" : "right", home: [x * T, y * T], t: Math.random() * 5 }));
  return [
    // outside the corner store: three of them round a boombox
    person("crew-smoke", "street", 16.4, 3.9, { skin: "#8d5a3b", hair: "#151010", top: "#2f4a3a", pants: "#1c1f26", style: "hood" }, { item: "joint", bob: true, talk: "talk" }),
    person("crew-box", "street", 18.6, 4.7, { skin: "#5c3a26", hair: "#120d0a", top: "#1f2230", pants: "#2c2f38", style: "cap", accent: "#9e2b22" }, { pose: "crouch", bob: true, talk: "talk" }),
    person("crew-drink", "street", 19.9, 4.1, { skin: "#e0b193", hair: "#d8b35a", top: "#5a2a3a", pants: "#23252e", style: "long" }, { item: "bottle", bob: true, talk: "talk" }),
    // the dog walker, up and down the block
    person("walker", "street", 4, 4.7, { skin: "#c99a7c", hair: "#8a8a86", top: "#6b5a3a", pants: "#2a2a30", style: "short" }, {
      talk: "talk",
      solid: false,
      path: [
        [3 * T, 4.7 * T],
        [36 * T, 4.7 * T],
      ],
      pi: 1,
      speed: 17,
      dir: "right",
      item: "phone",
    }),
    { id: "dog", kind: "dog", place: "street", x: 3 * T, y: 5 * T, dir: "right", follow: "walker", talk: "pet the dog", color: "#8a5a34", t: 0 },

    // the studio couch
    person("couch-cup", "studio", 11.6, 7.1, { skin: "#6b4431", hair: "#0f0b08", top: "#3c2f5a", pants: "#1f2230", style: "curly" }, { pose: "sit", item: "cup", bob: true, talk: "talk", solid: false }),
    person("couch-blunt", "studio", 12.9, 7.1, { skin: "#e2b69a", hair: "#3a2416", top: "#2d3a3a", pants: "#23252e", style: "hood" }, { pose: "sit", item: "joint", bob: true, talk: "talk", solid: false }),
    person("couch-phones", "studio", 14.2, 7.1, { skin: "#9a6446", hair: "#15100c", top: "#7a2a2a", pants: "#1c1f26", style: "bun", accent: "#e8e0cf" }, { pose: "sit", item: "headphones", bob: true, talk: "talk", solid: false }),

    // the park
    person("oldman", "park", 5.6, 3.05, { skin: "#d2a58a", hair: "#bdbdb8", top: "#4a3a2a", pants: "#2a2a30", style: "bald" }, { pose: "sit", talk: "talk", solid: false }),
    person("hooper-1", "park", 24.2, 4.6, { skin: "#4e3020", hair: "#0d0a08", top: "#c9c2b3", pants: "#1c3a5a", style: "short" }, { talk: "talk", item: "ball", dir: "up" }),
    person("hooper-2", "park", 21.2, 5.6, { skin: "#e8c0a4", hair: "#6b3a1c", top: "#2a4a7a", pants: "#1f1f24", style: "curly" }, { talk: "talk", dir: "right" }),
    ...pigeons("park", [
      [6.5, 4.2],
      [7.3, 4.6],
      [4.6, 4.9],
      [8.4, 3.9],
      [5.4, 5.6],
      [9.2, 5.1],
    ]),

    // the rooftop
    person("ledge", "rooftop", 11, 3.75, { skin: "#e6bea6", hair: "#2a1a12", top: "#4a4a6a", pants: "#1f2230", style: "long" }, { pose: "sit", dir: "up", item: "joint", talk: "talk", solid: false }),
    ...pigeons("rooftop", [
      [15.4, 7.2],
      [17.2, 6.8],
      [12.2, 8.6],
    ]),
  ];
}

// ------------------------------------------------------------ traffic

const LANES = [
  { y: 6.45 * T, dir: -1 },
  { y: 8.1 * T, dir: 1 },
];
const CAR_COLORS = ["#3a4d5c", "#6e1f18", "#c9c2b3", "#2b2d33", "#4a5a3a", "#8a7a4a", "#1d2a44"];
export const CAR_W = 38;
export const carRect = (a: Actor): Rect => ({ x: a.x - CAR_W / 2, y: a.y - 12, w: CAR_W, h: 14 });

let seq = 0;
let nextCar = 3;
let nextBike = 12;

export interface LifeEvents {
  honk: () => void;
  bell: () => void;
  flap: () => void;
}

/** Advance everyone in the player's place by `dt` seconds. */
export function updateLife(actors: Actor[], dt: number, place: Place, px: number, py: number, ev: LifeEvents) {
  const { w } = sceneSize(SCENES[place]);

  // traffic appears only on the street
  if (place === "street") {
    nextCar -= dt;
    if (nextCar <= 0) {
      const lane = LANES[Math.random() < 0.5 ? 0 : 1];
      actors.push({
        id: `car-${seq++}`,
        kind: "car",
        place: "street",
        x: lane.dir > 0 ? -CAR_W : w + CAR_W,
        y: lane.y,
        dir: lane.dir > 0 ? "right" : "left",
        vx: lane.dir * (55 + Math.random() * 30),
        color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
        t: 0,
      });
      nextCar = 6 + Math.random() * 9;
    }
    nextBike -= dt;
    if (nextBike <= 0) {
      const right = Math.random() < 0.5;
      actors.push({
        id: `bike-${seq++}`,
        kind: "bike",
        place: "street",
        x: right ? -20 : w + 20,
        y: right ? 7.45 * T : 7.2 * T,
        dir: right ? "right" : "left",
        vx: (right ? 1 : -1) * (42 + Math.random() * 14),
        look: { skin: ["#c99a7c", "#6b4431", "#e8c0a4"][seq % 3], hair: "#1a1410", top: ["#9e2b22", "#2a4a7a", "#c9c2b3"][seq % 3], pants: "#1f1f24", style: seq % 2 ? "cap" : "short", accent: "#1b1b1f" },
        t: 0,
      });
      nextBike = 16 + Math.random() * 16;
    }
  }

  for (let i = actors.length - 1; i >= 0; i--) {
    const a = actors[i];
    if (a.place !== place) continue;
    a.t += dt;

    if (a.kind === "car") {
      // stop for someone standing in the lane ahead, and let them know
      const dirX = Math.sign(a.vx ?? 0);
      const ahead = (px - a.x) * dirX;
      const inLane = Math.abs(py - (a.y - 4)) < 12;
      if (inLane && ahead > 0 && ahead < CAR_W / 2 + 34) {
        a.stopped = (a.stopped ?? 0) + dt;
        if (a.stopped > 0.7 && (a.honkAt ?? 0) <= a.t) {
          ev.honk();
          a.honkAt = a.t + 2.5;
        }
      } else {
        a.stopped = 0;
        a.x += (a.vx ?? 0) * dt;
      }
      if (a.x < -CAR_W * 2 || a.x > w + CAR_W * 2) actors.splice(i, 1);
      continue;
    }

    if (a.kind === "bike") {
      a.x += (a.vx ?? 0) * dt;
      if (!a.rung && Math.abs(a.x - px) < 46 && Math.abs(a.y - py) < 40) {
        a.rung = true;
        ev.bell();
      }
      if (a.x < -40 || a.x > w + 40) actors.splice(i, 1);
      continue;
    }

    if (a.kind === "pigeon") {
      const d = Math.hypot(a.x - px, a.y - py);
      if (a.fly !== undefined) {
        a.fly += dt;
        a.x += (a.away ?? 1) * 60 * dt;
        a.y -= 46 * dt;
        if (a.fly > 14 && a.home && Math.hypot(a.home[0] - px, a.home[1] - py) > 70) {
          a.fly = undefined;
          [a.x, a.y] = a.home;
        }
      } else if (d < 26) {
        a.fly = 0;
        a.away = a.x >= px ? 1 : -1;
        a.dir = a.away > 0 ? "right" : "left";
        ev.flap();
      } else if (Math.random() < dt * 0.4) {
        // a little shuffle now and then
        a.x += (Math.random() - 0.5) * 6;
        a.dir = Math.random() < 0.5 ? "left" : "right";
      }
      continue;
    }

    if (a.kind === "dog") {
      const lead = actors.find((b) => b.id === a.follow);
      if (lead) {
        const tx = lead.x + (lead.dir === "left" ? 14 : -14);
        const ty = lead.y + 4;
        const dx = tx - a.x;
        a.walking = Math.abs(dx) > 1.5;
        a.x += dx * Math.min(1, dt * 3);
        a.y += (ty - a.y) * Math.min(1, dt * 3);
        if (Math.abs(dx) > 0.5) a.dir = dx > 0 ? "right" : "left";
      }
      continue;
    }

    if (a.path) {
      if ((a.wait ?? 0) > 0) {
        a.wait! -= dt;
        a.walking = false;
        continue;
      }
      const [tx, ty] = a.path[a.pi ?? 0];
      const dx = tx - a.x;
      const dy = ty - a.y;
      const dist = Math.hypot(dx, dy);
      // step aside for nobody, but pause if the player is right in the way
      const blocked = Math.abs(px - (a.x + Math.sign(dx) * 10)) < 7 && Math.abs(py - a.y) < 6;
      if (dist < 1) {
        a.pi = ((a.pi ?? 0) + 1) % a.path.length;
        a.wait = 1.5 + Math.random() * 2.5;
      } else if (!blocked) {
        const step = Math.min(dist, (a.speed ?? 20) * dt);
        a.x += (dx / dist) * step;
        a.y += (dy / dist) * step;
        a.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
      }
      a.walking = !blocked && dist >= 1;
    }
  }
}

/** Does anyone stand where this box wants to go? */
export function lifeBlocks(actors: Actor[], place: Place, box: Rect): boolean {
  for (const a of actors) {
    if (a.place !== place) continue;
    let r: Rect | null = null;
    if (a.kind === "car") r = carRect(a);
    else if (a.kind === "person" && a.solid && !a.path) r = { x: a.x - 4, y: a.y - 3, w: 8, h: 4 };
    if (r && box.x < r.x + r.w && box.x + box.w > r.x && box.y < r.y + r.h && box.y + box.h > r.y) return true;
  }
  return false;
}

/** The person (or dog) you'd talk to from here, if any. */
export function lifeTarget(actors: Actor[], place: Place, px: number, py: number, fx: number, fy: number): Actor | null {
  let best: Actor | null = null;
  let bestD = 18;
  for (const a of actors) {
    if (a.place !== place || !a.talk) continue;
    const d = Math.min(Math.hypot(a.x - fx, a.y - 3 - fy), Math.hypot(a.x - px, a.y - py) + 4);
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return best;
}
