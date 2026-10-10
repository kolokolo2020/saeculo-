import type { Actor } from "./life";
import type { Look } from "./people";
import type { Difficulty } from "./save";
import { blocked, type Dir, type Scene } from "./world";
import type { Weapon } from "./weapons";

// Fights. Whoever's fighting you is an ordinary person in the neighbourhood
// with a `fighter` on them: they close in (drunk ones weave and stumble),
// wind up where you can see it, swing, and need a moment after. You swing
// with whatever you've got, dodge with a short dash (you can't be hit
// mid-dash), eat something to patch up. Knock them all down and they get
// up and stumble off, lighter by a few notes; go down yourself and you
// wake up at home with less in your pockets. Leaving through a door is
// always an option.

export type FoeKind = "drunk" | "rowdy" | "boss" | "goon";
export type FoeState = "approach" | "windup" | "strike" | "recover" | "stagger" | "down" | "flee";

export interface Fighter {
  kind: FoeKind;
  hp: number;
  maxHp: number;
  dmg: number;
  speed: number;
  reach: number;
  windup: number;
  state: FoeState;
  timer: number;
  cd: number;
  /** White flash after a hit. */
  flash: number;
  kvx: number;
  kvy: number;
  seed: number;
  /** Cash in their pockets, dropped when they go down. */
  purse: number;
  /** After a stagger they shrug hits off for a moment (no stun-locking). */
  guard: number;
}

export interface Me {
  x: number;
  y: number;
  dir: Dir;
  hp: number;
  /** Swing animation time left. */
  atk: number;
  atkCd: number;
  dodge: number;
  dodgeCd: number;
  dvx: number;
  dvy: number;
  iframes: number;
  kvx: number;
  kvy: number;
  flash: number;
}

export const freshMe = (x: number, y: number, dir: Dir, hp: number): Me => ({ x, y, dir, hp, atk: 0, atkCd: 0, dodge: 0, dodgeCd: 0, dvx: 0, dvy: 0, iframes: 0, kvx: 0, kvy: 0, flash: 0 });

export interface FightEvents {
  hit: (heavy: boolean) => void;
  whoosh: () => void;
  hurt: () => void;
  down: () => void;
  shake: (amount: number) => void;
}

const STATS: Record<FoeKind, Omit<Fighter, "kind" | "state" | "timer" | "cd" | "flash" | "kvx" | "kvy" | "seed" | "purse" | "guard">> = {
  drunk: { hp: 36, maxHp: 36, dmg: 11, speed: 34, reach: 12, windup: 0.58 },
  rowdy: { hp: 52, maxHp: 52, dmg: 13, speed: 42, reach: 12, windup: 0.48 },
  goon: { hp: 60, maxHp: 60, dmg: 13, speed: 42, reach: 13, windup: 0.45 },
  boss: { hp: 190, maxHp: 190, dmg: 19, speed: 38, reach: 16, windup: 0.6 },
};
/** How much harder (or softer) each setting makes them. */
export const TUNING: Record<Difficulty, { dmg: number; hp: number; windup: number; rest: number }> = {
  chill: { dmg: 0.55, hp: 0.85, windup: 1.3, rest: 1.35 },
  normal: { dmg: 1, hp: 1, windup: 1, rest: 1 },
  hard: { dmg: 1.3, hp: 1.2, windup: 0.82, rest: 0.7 },
};
/** How long each kind shrugs off hits after being staggered. */
const GUARD: Record<FoeKind, number> = { drunk: 1.5, rowdy: 1.9, goon: 2, boss: 2.6 };

const LOOKS: Look[] = [
  { skin: "#e0b193", hair: "#6b3a1c", top: "#5a2a3a", pants: "#23252e", style: "short", body: "broad" },
  { skin: "#c99a7c", hair: "#151010", top: "#2a4a2a", pants: "#1c1f26", style: "cap", accent: "#c9c2b3" },
  { skin: "#d2a58a", hair: "#d8b35a", top: "#3a3a5a", pants: "#2c2f38", style: "long" },
  { skin: "#8d5a3b", hair: "#120d0a", top: "#5a4a2a", pants: "#1f1f24", style: "hood", body: "broad" },
  { skin: "#f1d2bd", hair: "#9a5a2a", top: "#6a2a2a", pants: "#2a2a30", style: "mullet" },
  { skin: "#6b4431", hair: "#0f0b08", top: "#26262b", pants: "#3a3a40", style: "buzz", body: "slim" },
];
const TANK: Look = { skin: "#7a4a32", hair: "#0d0a08", top: "#141418", trim: "#d8b35a", topStyle: "leather", pants: "#1c1f26", style: "buzz", body: "broad", extra: "chain", extraColor: "#d8b35a" };

let seq = 0;

/** A foe, standing at (x, y), ready to come at you. */
export function makeFoe(kind: FoeKind, place: Actor["place"], x: number, y: number, look?: Look, difficulty: Difficulty = "normal"): Actor {
  const s = { ...STATS[kind] };
  s.hp = s.maxHp = Math.round(s.hp * TUNING[difficulty].hp);
  s.windup *= TUNING[difficulty].windup;
  return {
    id: `foe-${kind}-${seq++}`,
    kind: "person",
    place,
    x,
    y,
    dir: "left",
    look: look ?? (kind === "boss" ? TANK : LOOKS[Math.floor(Math.random() * LOOKS.length)]),
    pose: "stand",
    item: kind === "drunk" && Math.random() < 0.6 ? "bottle" : undefined,
    solid: false,
    t: Math.random() * 10,
    fighter: {
      kind,
      ...s,
      state: "approach",
      timer: 0,
      cd: 0.6 + Math.random() * 0.8,
      flash: 0,
      kvx: 0,
      kvy: 0,
      seed: Math.random() * 10,
      purse: kind === "boss" ? 60 : kind === "goon" ? 14 : kind === "rowdy" ? 10 + Math.floor(Math.random() * 10) : 6 + Math.floor(Math.random() * 8),
      guard: 0,
    },
  };
}

export const isUp = (a: Actor) => !!a.fighter && a.fighter.state !== "down" && a.fighter.state !== "flee";

function move(a: { x: number; y: number }, nx: number, ny: number, scene: Scene) {
  const box = (x: number, y: number) => ({ x: x - 4, y: y - 3, w: 8, h: 4 });
  if (!blocked(scene, box(nx, a.y))) a.x = nx;
  if (!blocked(scene, box(a.x, ny))) a.y = ny;
}

/** Advance the foes by dt. Returns the damage they did to you. */
export function updateFoes(foes: Actor[], me: Me, dt: number, scene: Scene, difficulty: Difficulty, ev: FightEvents) {
  for (const a of foes) {
    const f = a.fighter!;
    a.t += dt;
    f.flash = Math.max(0, f.flash - dt);
    f.cd = Math.max(0, f.cd - dt);
    f.guard = Math.max(0, f.guard - dt);
    // being shoved
    if (Math.abs(f.kvx) + Math.abs(f.kvy) > 1) {
      move(a, a.x + f.kvx * dt, a.y + f.kvy * dt, scene);
      const k = Math.exp(-9 * dt);
      f.kvx *= k;
      f.kvy *= k;
    }
    const dx = me.x - a.x;
    const dy = me.y - a.y;
    a.walking = false;
    switch (f.state) {
      case "down":
        f.timer -= dt;
        if (f.timer <= 0) {
          f.state = "flee";
          f.timer = 3.5;
        }
        break;
      case "flee": {
        f.timer -= dt;
        const away = dx > 0 ? -1 : 1;
        a.dir = away > 0 ? "right" : "left";
        move(a, a.x + away * 34 * dt, a.y, scene);
        a.walking = true;
        if (f.timer <= 0) a.hidden = true;
        break;
      }
      case "stagger":
        f.timer -= dt;
        move(a, a.x + Math.sin(a.t * 3 + f.seed) * 14 * dt, a.y + Math.cos(a.t * 2 + f.seed) * 6 * dt, scene);
        if (f.timer <= 0) f.state = "approach";
        break;
      case "approach": {
        a.dir = Math.abs(dx) > Math.abs(dy) * 1.4 ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
        // stand off to one side of you, at arm's length
        const side = dx > 0 ? -1 : 1;
        const tx = me.x + side * (f.reach - 3);
        const ty = me.y + Math.sin(a.t * 0.9 + f.seed) * 2;
        const ex = tx - a.x;
        const ey = ty - a.y;
        const d = Math.hypot(ex, ey);
        if (d > 2) {
          const weave = f.kind === "drunk" ? Math.sin(a.t * 3.1 + f.seed) * 14 : 0;
          const sp = f.speed * (f.kind === "drunk" ? 0.8 + 0.3 * Math.sin(a.t * 1.7 + f.seed) : 1);
          move(a, a.x + (ex / d) * sp * dt, a.y + (ey / d) * sp * dt + weave * dt, scene);
          a.walking = true;
        }
        if (Math.abs(dx) < f.reach + 3 && Math.abs(dy) < 7 && f.cd <= 0) {
          f.state = "windup";
          f.timer = f.windup;
          a.dir = dx > 0 ? "right" : "left";
        } else if (f.kind === "drunk" && Math.random() < dt * 0.12) {
          f.state = "stagger";
          f.timer = 0.8;
        }
        break;
      }
      case "windup":
        f.timer -= dt;
        if (f.timer <= 0) {
          f.state = "strike";
          f.timer = 0.12;
          const facing = a.dir === "right" ? 1 : -1;
          const inFront = dx * facing > -2 && Math.abs(dx) < f.reach + 5 && Math.abs(dy) < 9;
          if (inFront && me.iframes <= 0 && me.dodge <= 0) {
            const dmg = Math.round(f.dmg * TUNING[difficulty].dmg * (0.85 + Math.random() * 0.3));
            me.hp = Math.max(0, me.hp - dmg);
            me.iframes = 0.55;
            me.flash = 0.18;
            me.kvx = facing * (f.kind === "boss" ? 170 : 110);
            ev.hurt();
            ev.hit(f.kind === "boss");
            ev.shake(f.kind === "boss" ? 4 : 2.5);
          } else ev.whoosh();
        }
        break;
      case "strike":
        f.timer -= dt;
        if (f.timer <= 0) {
          f.state = "recover";
          f.timer = f.kind === "boss" ? 0.5 : 0.65;
        }
        break;
      case "recover":
        f.timer -= dt;
        if (f.timer <= 0) {
          f.state = "approach";
          f.cd = ((f.kind === "boss" ? 0.45 : 0.4) + Math.random() * 0.7) * TUNING[difficulty].rest;
        }
        break;
    }
  }
  // keep them from standing in each other
  const up = foes.filter(isUp);
  for (let i = 0; i < up.length; i++)
    for (let j = i + 1; j < up.length; j++) {
      const a = up[i];
      const b = up[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < 11 && d > 0.01) {
        const push = ((11 - d) / d) * 0.5;
        move(a, a.x + (a.x - b.x) * push, a.y + (a.y - b.y) * push, scene);
        move(b, b.x - (a.x - b.x) * push, b.y - (a.y - b.y) * push, scene);
      }
    }
}

/** Your swing. Returns the foes it landed on (and knocks the downed ones out). */
export function swing(foes: Actor[], me: Me, w: Weapon, ev: FightEvents): { hits: Actor[]; downed: Actor[] } {
  const hits: Actor[] = [];
  const downed: Actor[] = [];
  const fx = me.dir === "left" ? -1 : me.dir === "right" ? 1 : 0;
  const fy = me.dir === "up" ? -1 : me.dir === "down" ? 1 : 0;
  const cands = foes
    .filter(isUp)
    .map((a) => {
      const dx = a.x - me.x;
      const dy = a.y - me.y;
      const along = dx * fx + dy * fy;
      const across = Math.abs(dx * fy - dy * fx);
      return { a, along, across };
    })
    .filter((c) => c.along > -3 && c.along < w.reach + 6 && c.across < (fx ? 9 : 11))
    .sort((p, q) => p.along - q.along);
  for (const { a } of w.sweep ? cands : cands.slice(0, 1)) {
    const f = a.fighter!;
    const crit = Math.random() < 0.15;
    // catching them mid wind-up knocks the swing out of them
    const interrupt = f.state === "windup";
    const dmg = Math.round(w.dmg * (0.9 + Math.random() * 0.2) * (crit ? 1.5 : 1) * (interrupt ? 1.2 : 1));
    f.hp = Math.max(0, f.hp - dmg);
    f.flash = 0.14;
    // while they're shrugging hits off, they barely move
    const k = w.knock * (f.kind === "boss" ? 0.35 : 1) * (f.guard > 0 && !crit ? 0.35 : 1);
    f.kvx = (fx || Math.sign(a.x - me.x) || 1) * k;
    f.kvy = fy * k;
    if (f.hp <= 0) {
      f.state = "down";
      f.timer = 1.6;
      downed.push(a);
      ev.down();
    } else if (crit || (f.guard <= 0 && (interrupt || f.kind !== "boss"))) {
      // a stagger, then a moment where hits land but don't stop them
      f.state = "stagger";
      f.timer = interrupt ? 0.55 : 0.25;
      f.guard = GUARD[f.kind] + f.timer;
    }
    hits.push(a);
  }
  if (hits.length) {
    ev.hit(w.dmg >= 16);
    ev.shake(w.dmg >= 16 ? 2.5 : 1.5);
  } else ev.whoosh();
  return { hits, downed };
}

/** Move you by your dodge and any shove; returns true while dashing. */
export function moveMe(me: Me, dt: number, scene: Scene) {
  me.atk = Math.max(0, me.atk - dt);
  me.atkCd = Math.max(0, me.atkCd - dt);
  me.dodgeCd = Math.max(0, me.dodgeCd - dt);
  me.iframes = Math.max(0, me.iframes - dt);
  me.flash = Math.max(0, me.flash - dt);
  if (me.dodge > 0) {
    me.dodge -= dt;
    move(me, me.x + me.dvx * dt, me.y + me.dvy * dt, scene);
  }
  if (Math.abs(me.kvx) + Math.abs(me.kvy) > 1) {
    move(me, me.x + me.kvx * dt, me.y + me.kvy * dt, scene);
    const k = Math.exp(-10 * dt);
    me.kvx *= k;
    me.kvy *= k;
  }
  return me.dodge > 0;
}

export function startDodge(me: Me, held: Dir[]) {
  if (me.dodgeCd > 0 || me.dodge > 0) return false;
  let vx = (held.includes("right") ? 1 : 0) - (held.includes("left") ? 1 : 0);
  let vy = (held.includes("down") ? 1 : 0) - (held.includes("up") ? 1 : 0);
  if (!vx && !vy) {
    // back away from where you're facing
    vx = me.dir === "left" ? 1 : me.dir === "right" ? -1 : 0;
    vy = me.dir === "up" ? 1 : me.dir === "down" ? -1 : 0;
  }
  const d = Math.hypot(vx, vy) || 1;
  me.dvx = (vx / d) * 175;
  me.dvy = (vy / d) * 175;
  me.dodge = 0.2;
  me.iframes = Math.max(me.iframes, 0.32);
  me.dodgeCd = 0.6;
  return true;
}

const FOE_LINES = [
  ["\u201cOi. Nice headphones.\u201d", "\u201cGive us a listen. Or give us the headphones.\u201d"],
  ["\u201cWhat you looking at?\u201d", "\u201cHe's looking at you, Dave.\u201d"],
  ["\u201cSpare a fiver? No?\u201d", "\u201cShame. Shame for you.\u201d"],
  ["\u201cYou're the beat kid. Make us a beat. Go on. Now.\u201d"],
  ["One of them walks into you on purpose. \u201cWatch it.\u201d"],
];
/** What they say when they reach you. */
export const foeLines = () => FOE_LINES[Math.floor(Math.random() * FOE_LINES.length)];

/** They stop in front of you and square up. */
export function faceOff(foes: Actor[], x: number) {
  for (const f of foes) {
    f.walking = false;
    f.dir = f.x < x ? "right" : "left";
  }
}

/** Tank and his friend come back once his fight's over, whichever way it went. */
export function standDown(actors: Actor[]) {
  for (const a of actors) if (a.id === "tank" || a.id === "goon") a.hidden = false;
}
