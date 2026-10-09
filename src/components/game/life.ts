import type { Fighter } from "./combat";
import type { Hair, Look, Pose } from "./people";
import type { Place } from "./sfx";
import { sceneSize, SCENES, TILE, type Dir, type Rect } from "./world";

// The neighbourhood's inhabitants: people hanging out, a dog walker and
// their dog, traffic, cyclists, pigeons. Each place keeps its own; only
// the place you're in is simulated (traffic keeps its own timer).

export type Item = "cup" | "joint" | "bottle" | "phone" | "headphones" | "ball" | "keys" | "mic";
export type ActorKind = "person" | "dog" | "pigeon" | "car" | "bike" | "cat";

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
  /** Not there right now. */
  hidden?: boolean;
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
  /** Dancing: sways side to side on the beat. */
  dance?: boolean;
  /** In a fight with you (combat.ts moves them, not this). */
  fighter?: Fighter;
  /** A police car: the light bar on the roof. */
  cop?: boolean;
  /** Walks its path once and is gone (people passing through). */
  oneway?: boolean;
  /** Seconds left of reacting to something (a fight you just won): a little hop. */
  react?: number;
  /** The cat: where it's going, and where it likes to sit. */
  goal?: [number, number];
  perches?: [number, number][];
  /** Running, not strolling. */
  bolt?: boolean;
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

    // the avenue: the door, the queue, the man with the CDs, people passing
    person("bouncer", "avenue", 35.5, 3.6, { skin: "#4e3020", hair: "#0d0a08", top: "#111216", trim: "#26262b", topStyle: "jacket", pants: "#111216", style: "bald", body: "broad", extra: "shades" }, { talk: "talk to the bouncer" }),
    person("queue-1", "avenue", 38.4, 3.7, { skin: "#e8c0a4", hair: "#d06aa8", top: "#5a3a8a", pants: "#111216", style: "bun" }, { dir: "left", item: "phone", talk: "talk" }),
    person("queue-2", "avenue", 39.5, 3.8, { skin: "#8d5a3b", hair: "#151010", top: "#d0a020", pants: "#26262b", style: "afro" }, { dir: "left", talk: "talk" }),
    person("queue-3", "avenue", 40.6, 3.65, { skin: "#c99a7c", hair: "#3a2416", top: "#26262b", topStyle: "leather", trim: "#e8e0cf", pants: "#1c1f26", style: "mullet" }, { dir: "left", item: "joint" }),
    person("cd-guy", "avenue", 24.4, 4.4, { skin: "#6b4431", hair: "#0f0b08", top: "#2f6b3a", topStyle: "track", trim: "#e8e0cf", pants: "#111216", style: "cap", accent: "#d0a020", extra: "backpack" }, { talk: "talk" }),
    person("stroller", "avenue", 6, 4.6, { skin: "#f1d2bd", hair: "#8a8a86", top: "#3c5a86", topStyle: "puffer", pants: "#2a2a30", style: "short" }, {
      solid: false,
      talk: "talk",
      path: [
        [4 * T, 4.6 * T],
        [30 * T, 4.6 * T],
      ],
      pi: 1,
      speed: 14,
    }),

    // the alley: the dice game, someone warming their hands
    person("dice-1", "alley", 18.2, 6.9, { skin: "#5c3a26", hair: "#120d0a", top: "#1f2230", pants: "#2c2f38", style: "short", hat: "durag", hatColor: "#3a5ab3" }, { pose: "crouch", dir: "right", talk: "the dice game" }),
    person("dice-2", "alley", 21, 7.1, { skin: "#e0b193", hair: "#3a2416", top: "#4a4a32", pants: "#23252e", style: "short", topStyle: "hoodie" }, { pose: "crouch", dir: "left", talk: "the dice game" }),
    {
      id: "alley-cat",
      kind: "cat",
      place: "alley",
      x: 3.2 * T,
      y: 3.6 * T,
      dir: "right",
      talk: "the cat",
      color: "#6a6058",
      t: 0,
      perches: [
        [3.2 * T, 3.6 * T],
        [22.3 * T, 4.2 * T],
        [14.6 * T, 8.6 * T],
        [5.5 * T, 8.4 * T],
      ],
    },
    person("barrel-man", "alley", 9.9, 5.6, { skin: "#d2a58a", hair: "#bdbdb8", top: "#4a3a2a", pants: "#2a2a30", style: "long", topStyle: "jacket", trim: "#6a5a4a" }, { dir: "left", talk: "talk" }),

    // the record shop
    person("records-owner", "records", 12.5, 3.75, { skin: "#b07a58", hair: "#e8e0cf", top: "#4a3a2a", pants: "#26262b", style: "afro", extra: "shades" }, { talk: "talk to the owner", solid: false }),
    person("digger", "records", 5, 6.35, { skin: "#e8c0a4", hair: "#9a5a2a", top: "#2a4a2a", topStyle: "varsity", trim: "#e8e0cf", pants: "#1c1f26", style: "curly", extra: "headphones" }, { dir: "up", talk: "talk" }),

    // the thrift shop
    person("thrift-owner", "thrift", 10.5, 2.75, { skin: "#f1d2bd", hair: "#d06aa8", top: "#7a2a6a", topStyle: "tee", pants: "#26262b", style: "ponytail" }, { talk: "talk to her", solid: false }),

    // the club: the DJ, the bar, the floor
    person("dj", "club", 12, 3.15, { skin: "#8d5a3b", hair: "#151010", top: "#111216", pants: "#111216", style: "braids", extra: "headphones" }, { bob: true, talk: "talk to the DJ", solid: false }),
    person("bartender", "club", 20.6, 6, { skin: "#e8c0a4", hair: "#151010", top: "#26262b", topStyle: "jacket", trim: "#e8e0cf", pants: "#111216", style: "bun" }, { dir: "left", talk: "the bar", solid: false }),
    ...[
      [7.5, 6.2, "#5a3a8a", "afro"],
      [9.6, 7.4, "#2a4a7a", "long"],
      [12.2, 6.6, "#d0a020", "curly"],
      [14.6, 7.6, "#2f6b3a", "short"],
      [16.4, 6.3, "#7a2a6a", "bun"],
      [8.4, 9.2, "#26262b", "mullet"],
      [11.3, 9.5, "#c9c2b3", "ponytail"],
      [15.2, 9.3, "#3c5a86", "braids"],
    ].map(([x, y, top, style], k) =>
      person(`dancer-${k}`, "club", x as number, y as number, { skin: ["#f1d2bd", "#8d5a3b", "#c99a7c", "#4e3020", "#e8c0a4", "#6b4431", "#d2a58a", "#b07a58"][k], hair: ["#151010", "#d8b35a", "#3a2416", "#d06aa8"][k % 4], top: top as string, pants: "#1c1f26", style: style as Hair }, { dance: true, bob: true, solid: false, dir: k % 2 ? "left" : "down", talk: k % 3 === 0 ? "talk" : undefined }),
    ),

    // the subway
    person("busker", "subway", 14, 3.6, { skin: "#c99a7c", hair: "#3a2416", top: "#4a3a2a", topStyle: "jacket", trim: "#c9c2b3", pants: "#2c3e5a", style: "long", hat: "beanie", hatColor: "#d0a020" }, { item: "keys", bob: true, talk: "talk" }),
    person("commuter", "subway", 9.4, 2.85, { skin: "#e8c0a4", hair: "#151010", top: "#3c5a86", topStyle: "jacket", trim: "#e8e0cf", pants: "#1c1f26", style: "short" }, { pose: "sit", item: "phone", talk: "talk", solid: false }),
    person("waiting", "subway", 24.5, 4.4, { skin: "#6b4431", hair: "#0f0b08", top: "#5a5d66", topStyle: "puffer", pants: "#26262b", style: "cap", accent: "#111216" }, { dir: "down", talk: "talk", item: "headphones" }),

    // the underpass: the cypher, Dre, Tank
    ...[
      [15.6, 5.5, "right", "#2a4a7a", "cap"],
      [19.4, 5.5, "left", "#5a3a8a", "hood"],
      [16, 7.3, "up", "#26262b", "braids"],
      [19, 7.3, "up", "#2f6b3a", "afro"],
    ].map(([x, y, dir, top, style], k) =>
      person(`mc-${k}`, "underpass", x as number, y as number, { skin: ["#5c3a26", "#e0b193", "#8d5a3b", "#c99a7c"][k], hair: "#120d0a", top: top as string, pants: "#1c1f26", style: style as Hair, accent: "#d0a020" }, { dir: dir as Dir, bob: true, talk: k === 0 ? "the cypher" : "talk", item: k === 1 ? "mic" : undefined }),
    ),
    // Vee: another producer, there once you've made a name (Game.tsx shows her)
    person("vee", "underpass", 22.6, 6.3, { skin: "#b07a58", hair: "#151010", top: "#5a3a8a", topStyle: "track", trim: "#e8e0cf", pants: "#111216", style: "braids", extra: "headphones", extraColor: "#d0a020" }, { dir: "left", talk: "talk to Vee", hidden: true, bob: true }),
    person("dre", "underpass", 12.5, 6.8, { skin: "#4e3020", hair: "#0d0a08", top: "#e8e0cf", topStyle: "tee", pants: "#111216", style: "cap", accent: "#111216", extra: "chain", extraColor: "#d8b35a" }, { dir: "right", talk: "talk to Dre" }),
    person("tank", "underpass", 27.2, 5.7, { skin: "#7a4a32", hair: "#0d0a08", top: "#141418", trim: "#d8b35a", topStyle: "leather", pants: "#1c1f26", style: "buzz", body: "broad", extra: "chain", extraColor: "#d8b35a" }, { dir: "right", talk: "talk to Tank" }),
    person("goon", "underpass", 29.8, 6.4, { skin: "#c99a7c", hair: "#151010", top: "#26262b", topStyle: "hoodie", pants: "#2a2a30", style: "hood", body: "broad" }, { dir: "left", item: "joint" }),
    ...pigeons("underpass", [
      [4, 8.5],
      [5.2, 8.8],
      [31, 8.4],
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
let nextCop = 25;
let nextPasser = 2;
/** Send the next police car now (for the browser tests). */
export const sendCop = () => void (nextCop = 0);

export interface LifeEvents {
  honk: () => void;
  bell: () => void;
  flap: () => void;
  /** The police car's two notes, once, as it passes. */
  siren?: () => void;
}

const SKINS = ["#f1d2bd", "#e8c0a4", "#d2a58a", "#c99a7c", "#b07a58", "#8d5a3b", "#6b4431", "#4e3020"];
const TOPS = ["#3c5a86", "#5a2a3a", "#2f4a3a", "#26262b", "#c9c2b3", "#7a2a6a", "#d0a020", "#4a4a32", "#6e1f18"];
const HAIRS: Hair[] = ["short", "long", "curly", "bun", "afro", "cap", "hood", "ponytail", "bald", "braids"];
const pick = <X,>(xs: X[]) => xs[Math.floor(Math.random() * xs.length)];
/** Someone walking down the avenue on their way somewhere else. */
function passer(w: number): Actor {
  const right = Math.random() < 0.5;
  const y = (4.2 + Math.random() * 1.1) * T;
  const look: Look = { skin: pick(SKINS), hair: pick(["#151010", "#3a2416", "#d8b35a", "#8a8a86", "#9a5a2a"]), top: pick(TOPS), pants: pick(["#1c1f26", "#2a2a30", "#2c3e5a", "#3a3a40"]), style: pick(HAIRS), accent: pick(["#111216", "#d0a020", "#9e2b22"]) };
  if (Math.random() < 0.4) look.topStyle = pick(["puffer", "jacket", "hoodie", "track"]);
  return {
    id: `passer-${seq++}`,
    kind: "person",
    place: "avenue",
    x: right ? -10 : w + 10,
    y,
    dir: right ? "right" : "left",
    look,
    pose: "stand",
    solid: false,
    oneway: true,
    path: [[right ? w + 12 : -12, y]],
    pi: 0,
    speed: 15 + Math.random() * 10,
    item: Math.random() < 0.5 ? pick<Item>(["phone", "headphones", "bottle", "cup"]) : undefined,
    t: Math.random() * 10,
  };
}

/** Advance everyone in the player's place by `dt` seconds. */
export function updateLife(actors: Actor[], dt: number, place: Place, px: number, py: number, ev: LifeEvents) {
  const { w } = sceneSize(SCENES[place]);

  // traffic on the street and the avenue
  if (place === "street" || place === "avenue") {
    nextCar -= dt;
    if (nextCar <= 0) {
      const lane = LANES[Math.random() < 0.5 ? 0 : 1];
      actors.push({
        id: `car-${seq++}`,
        kind: "car",
        place,
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
        place,
        x: right ? -20 : w + 20,
        y: right ? 7.45 * T : 7.2 * T,
        dir: right ? "right" : "left",
        vx: (right ? 1 : -1) * (42 + Math.random() * 14),
        look: { skin: ["#c99a7c", "#6b4431", "#e8c0a4"][seq % 3], hair: "#1a1410", top: ["#9e2b22", "#2a4a7a", "#c9c2b3"][seq % 3], pants: "#1f1f24", style: seq % 2 ? "cap" : "short", accent: "#1b1b1f" },
        t: 0,
      });
      nextBike = 16 + Math.random() * 16;
    }
    // now and then a police car, slow, lights going, no hurry
    nextCop -= dt;
    if (nextCop <= 0) {
      const lane = LANES[Math.random() < 0.5 ? 0 : 1];
      actors.push({ id: `cop-${seq++}`, kind: "car", cop: true, place, x: lane.dir > 0 ? -CAR_W : w + CAR_W, y: lane.y, dir: lane.dir > 0 ? "right" : "left", vx: lane.dir * (38 + Math.random() * 10), color: "#1d2433", t: 0 });
      nextCop = 50 + Math.random() * 60;
    }
  }
  // the avenue's never empty: people walking through
  if (place === "avenue") {
    nextPasser -= dt;
    if (nextPasser <= 0) {
      if (actors.filter((a) => a.oneway && a.place === "avenue").length < 4) actors.push(passer(w));
      nextPasser = 5 + Math.random() * 8;
    }
  }

  for (let i = actors.length - 1; i >= 0; i--) {
    const a = actors[i];
    if (a.place !== place || a.fighter) continue;
    a.t += dt;
    if (a.react) a.react = Math.max(0, a.react - dt);

    if (a.kind === "car") {
      // stop for someone standing in the lane ahead, and let them know
      const dirX = Math.sign(a.vx ?? 0);
      const ahead = (px - a.x) * dirX;
      const inLane = Math.abs(py - (a.y - 4)) < 12;
      if (a.cop && !a.rung && Math.abs(a.x - px) < 120) {
        a.rung = true;
        ev.siren?.();
      }
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

    if (a.kind === "cat") {
      // sits a while, then pads off to somewhere else; runs if you rush it
      const near = Math.hypot(a.x - px, a.y - py);
      if (!a.goal && a.perches && (Math.random() < dt / 30 || (near < 14 && Math.random() < dt * 0.6))) {
        const others = a.perches.filter(([x, y]) => Math.hypot(x - a.x, y - a.y) > 8);
        a.goal = others[Math.floor(Math.random() * others.length)];
        a.bolt = near < 30;
      }
      if (a.goal) {
        const dx = a.goal[0] - a.x;
        const dy = a.goal[1] - a.y;
        const d = Math.hypot(dx, dy);
        const step = Math.min(d, (a.bolt ? 70 : 18) * dt);
        if (d < 1) {
          a.goal = undefined;
          a.bolt = false;
          a.walking = false;
        } else {
          a.x += (dx / d) * step;
          a.y += (dy / d) * step;
          a.walking = true;
          if (Math.abs(dx) > 0.5) a.dir = dx > 0 ? "right" : "left";
        }
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
      if (dist < 1 && a.oneway) {
        actors.splice(i, 1);
        continue;
      }
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

/** Everyone matching gets excited for a couple of seconds (a little hop, a raised arm). */
export function cheerFor(actors: Actor[], which: (a: Actor) => boolean, secs = 2.4) {
  for (const a of actors) if (a.kind === "person" && !a.fighter && !a.hidden && which(a)) a.react = secs;
}

/** Does anyone stand where this box wants to go? */
export function lifeBlocks(actors: Actor[], place: Place, box: Rect): boolean {
  for (const a of actors) {
    if (a.place !== place) continue;
    let r: Rect | null = null;
    if (a.kind === "car") r = carRect(a);
    else if (a.kind === "person" && a.solid && !a.path && !a.hidden && !a.fighter) r = { x: a.x - 4, y: a.y - 3, w: 8, h: 4 };
    if (r && box.x < r.x + r.w && box.x + box.w > r.x && box.y < r.y + r.h && box.y + box.h > r.y) return true;
  }
  return false;
}

/** The person (or dog) you'd talk to from here, if any. */
export function lifeTarget(actors: Actor[], place: Place, px: number, py: number, fx: number, fy: number): Actor | null {
  let best: Actor | null = null;
  let bestD = 18;
  for (const a of actors) {
    if (a.place !== place || !a.talk || a.hidden || a.fighter || (a.kind === "cat" && a.goal)) continue;
    const d = Math.min(Math.hypot(a.x - fx, a.y - 3 - fy), Math.hypot(a.x - px, a.y - py) + 4);
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return best;
}
