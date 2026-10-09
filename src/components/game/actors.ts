import { CAR_W, type Actor } from "./life";
import type { Me } from "./combat";
import { dogSprites, flashed, personSprites, pigeonSprites, type Look } from "./people";
import type { Weapon } from "./weapons";
import { TILE, type Dir, type Light } from "./world";

// Drawing the neighbourhood's inhabitants: people with whatever's in their
// hand, dogs, pigeons, cars and bikes; the smoke off a joint; headlights.

type G = CanvasRenderingContext2D;
export { hpBar };
const r = (g: G, x: number, y: number, w: number, h: number, c: string) => {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), w, h);
};

interface Puff {
  x: number;
  y: number;
  vx: number;
  life: number;
}
const smoke: Puff[] = [];
const lastPuff = new Map<string, number>();

/** A hand-to-mouth cycle: most of the time down, now and then up for a second. */
const raised = (a: Actor, every: number) => (a.t + (a.sip ?? a.id.length)) % every > every - 1.2;

function drawItem(g: G, a: Actor, sx: number, sy: number, t: number, reduced: boolean) {
  const up = a.item === "cup" ? raised(a, 7) : a.item === "joint" ? raised(a, 5) : a.item === "bottle" ? raised(a, 9) : false;
  const facingUp = a.dir === "up";
  const hx = sx + 9;
  const hy = up ? sy + 4 : sy + 8;
  switch (a.item) {
    case "cup":
      // a double styrofoam cup, something purple inside
      if (facingUp) break;
      r(g, hx, hy, 3, 4, "#ece8de");
      r(g, hx, hy, 3, 1, "#8a3fd0");
      break;
    case "bottle":
      if (facingUp) break;
      r(g, hx, hy, 2, 5, "#6b3f1e");
      r(g, hx, hy - 1, 1, 1, "#8a5a2a");
      break;
    case "joint": {
      const ex = facingUp ? sx + 6 : up ? sx + 7 : hx + 2;
      const ey = facingUp ? sy + (up ? 3 : 6) : up ? sy + 5 : hy;
      if (!facingUp) r(g, ex - 2, ey, 2, 1, "#ece8de");
      const glow = up ? "#ffb46a" : Math.sin(t * 5 + a.x) > 0 ? "#ff7a2e" : "#c4461e";
      r(g, ex, ey, 1, 1, glow);
      if (!reduced) {
        const last = lastPuff.get(a.id) ?? 0;
        if (t - last > (up ? 0.08 : 0.22) && smoke.length < 120) {
          lastPuff.set(a.id, t);
          smoke.push({ x: ex, y: ey - 1, vx: (Math.random() - 0.5) * 3, life: 0 });
        }
      }
      break;
    }
    case "phone":
      if (facingUp) break;
      r(g, hx - 1, sy + 7, 2, 3, "#111216");
      r(g, hx - 1, sy + 7, 2, 1, "#8fd0ff");
      break;
    case "headphones":
      r(g, sx + 2, sy + 2, 1, 3, "#1b1b1f");
      r(g, sx + 9, sy + 2, 1, 3, "#1b1b1f");
      r(g, sx + 3, sy, 6, 1, "#1b1b1f");
      break;
    case "keys":
      // a little keyboard on a stand, in front
      r(g, sx - 3, sy + 9, 18, 4, "#1b1b1f");
      for (let k = 0; k < 8; k++) r(g, sx - 2 + k * 2, sy + 10, 1, 2, "#e8e0cf");
      r(g, sx + 1, sy + 13, 1, 4, "#3a3c42");
      r(g, sx + 10, sy + 13, 1, 4, "#3a3c42");
      break;
    case "mic":
      if (facingUp) break;
      r(g, hx - 1, sy + 4, 2, 5, "#2a2c33");
      r(g, hx - 1, sy + 3, 2, 2, "#9aa0aa");
      break;
  }
}

/** A small health bar over someone's head. */
function hpBar(g: G, x: number, y: number, hp: number, max: number, w = 14) {
  const f = Math.max(0, hp / max);
  r(g, x - w / 2 - 1, y - 1, w + 2, 4, "rgba(0,0,0,0.75)");
  r(g, x - w / 2, y, w, 2, "#2a2a30");
  r(g, x - w / 2, y, Math.max(1, Math.round(w * f)), 2, f > 0.5 ? "#7ddc3a" : f > 0.25 ? "#ffd23a" : "#ff5a3a");
}

/** Someone flat on the ground: the sprite on its side. */
function drawDown(g: G, img: HTMLCanvasElement, x: number, y: number, right: boolean) {
  g.save();
  g.translate(Math.round(x), Math.round(y) - 3);
  g.rotate(right ? Math.PI / 2 : -Math.PI / 2);
  g.drawImage(img, -6, -img.height + 2);
  g.restore();
}

function drawPerson(g: G, a: Actor, t: number, beat: boolean, reduced: boolean) {
  const sp = personSprites(a.look!);
  const f = a.fighter;
  if (f && f.state === "down") {
    r(g, a.x - 7, a.y - 2, 14, 3, "rgba(0,0,0,0.35)");
    drawDown(g, f.flash > 0 ? flashed(sp.walk.down[0]) : sp.walk.down[0], a.x, a.y, a.dir !== "right");
    return;
  }
  let img: HTMLCanvasElement;
  if (a.pose === "sit") img = a.dir === "up" ? sp.sitBack : sp.sit;
  else if (a.pose === "crouch") img = sp.crouch;
  else img = sp.walk[a.dir][a.walking ? 1 + (Math.floor(a.t * 7) % 2) : 0];
  if (f && f.flash > 0) img = flashed(img);
  // nodding along: one pixel down on the beat; dancers sway as well
  const nod = a.bob && beat && !reduced ? 1 : 0;
  const sway = a.dance && !reduced ? Math.round(Math.sin(a.t * 3.2 + a.x) * 1.5) : 0;
  // a fighter leans back to wind up, and into the swing
  const lean = f ? (f.state === "windup" ? (a.dir === "right" ? -1 : 1) : f.state === "strike" ? (a.dir === "right" ? 2 : -2) : 0) : 0;
  const sx = Math.round(a.x) - 6 + sway + lean;
  // cheering: a couple of little hops (still with reduced motion)
  const hop = a.react && !reduced ? -Math.round(Math.abs(Math.sin(a.react * 9)) * 2) : 0;
  const sy = Math.round(a.y) - img.height + nod + hop + (a.pose === "sit" ? -3 : 0);
  if (a.pose !== "sit") r(g, a.x - 4, a.y - 1, 8, 2, "rgba(0,0,0,0.35)");
  // draw the head with the nod, the legs planted
  if (nod) {
    g.drawImage(img, 0, 0, 12, 6, sx, sy, 12, 6);
    g.drawImage(img, 0, 6, 12, img.height - 6, sx, sy + 5, 12, img.height - 6);
  } else g.drawImage(img, sx, sy);
  drawItem(g, a, sx, sy, t, reduced);
  if (a.item === "ball") drawBall(g, a, t, reduced);
  if (a.react && a.react > 0.4) {
    // a raised arm
    const right = a.dir !== "left";
    r(g, right ? sx + 10 : sx + 1, sy + 1, 1, 6, a.look!.skin);
  }
  if (f) {
    if (f.state === "strike") {
      // the fist, out
      const fx = a.dir === "right" ? sx + 12 : sx - 3;
      r(g, fx, sy + 8, 3, 3, a.look!.skin);
    }
    if (f.state === "windup" && (reduced || Math.floor(t * 10) % 2 === 0)) {
      r(g, Math.round(a.x), sy - 9, 2, 5, "#ffd23a");
      r(g, Math.round(a.x), sy - 3, 2, 2, "#ffd23a");
    }
    if (f.state !== "flee") hpBar(g, Math.round(a.x), sy - 5 - (f.kind === "boss" ? 1 : 0), f.hp, f.maxHp, f.kind === "boss" ? 22 : 14);
  }
}

/** Where your hand is, for what you're holding. */
function handAt(dir: Dir, sx: number, sy: number): [number, number] {
  if (dir === "right") return [sx + 9, sy + 9];
  if (dir === "left") return [sx + 2, sy + 9];
  if (dir === "down") return [sx + 9, sy + 9];
  return [sx + 2, sy + 9];
}

/** A weapon as a line of pixels from the hand, at an angle. */
function weaponLine(g: G, x: number, y: number, ang: number, w: Weapon) {
  const n = Math.max(2, w.len);
  for (let k = 0; k < n; k++) {
    const px = x + Math.cos(ang) * k;
    const py = y + Math.sin(ang) * k;
    const c = k > n * 0.7 ? w.colors[1] : w.colors[0];
    r(g, px, py, w.id === "chain" && k % 2 ? 1 : 2, 2, c);
  }
}

const DIR_ANG: Record<Dir, number> = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };

export interface MeView {
  x: number;
  y: number;
  dir: Dir;
  walk: number;
  sitting: boolean;
  look: Look;
  weapon: Weapon;
  /** Combat state, while fighting (or recovering). */
  me: Me | null;
  down: boolean;
}

/** You: your look, your weapon (out in a fight), the swing, the flash. */
export function drawMe(g: G, v: MeView, t: number, reduced: boolean) {
  const sp = personSprites(v.look);
  const me = v.me;
  if (v.down) {
    r(g, v.x - 7, v.y - 2, 14, 3, "rgba(0,0,0,0.35)");
    drawDown(g, sp.walk.down[0], v.x, v.y, true);
    return;
  }
  let img = v.sitting ? sp.sit : sp.walk[v.dir][v.walk ? 1 + (Math.floor(v.walk * 8) % 2) : 0];
  const dodging = !!me && me.dodge > 0;
  if (me && me.flash > 0) img = flashed(img);
  const sx = Math.round(v.x) - 6;
  const sy = Math.round(v.y) - img.height + (v.sitting ? -4 : 0);
  r(g, Math.round(v.x) - 4, Math.round(v.y) - 1, 8, 2, "rgba(0,0,0,0.35)");
  if (dodging && !reduced) {
    g.globalAlpha = 0.35;
    g.drawImage(img, Math.round(sx - me!.dvx * 0.05), Math.round(sy - me!.dvy * 0.05));
    g.globalAlpha = 1;
  }
  // blink while you can't be hit
  if (!(me && me.iframes > 0 && !dodging && !reduced && Math.floor(t * 20) % 2 === 0)) g.drawImage(img, sx, sy);
  if (!me || v.sitting) return;
  const [hx, hy] = handAt(v.dir, sx, sy);
  const w = v.weapon;
  if (me.atk > 0) {
    const p = 1 - me.atk / 0.18;
    if (w.id === "fists" || w.id === "knuckles") {
      // a straight punch
      const reach = Math.sin(p * Math.PI) * 6;
      const a = DIR_ANG[v.dir];
      r(g, hx + Math.cos(a) * reach - 1, hy + Math.sin(a) * reach - 1, 3, 3, w.id === "knuckles" ? w.colors[0] : v.look.skin);
    } else {
      const side = v.dir === "left" ? -1 : 1;
      weaponLine(g, hx, hy, DIR_ANG[v.dir] + side * (-1.7 + p * 2.4), w);
      if (!reduced && p > 0.3 && p < 0.8) {
        // the arc it cuts
        g.fillStyle = "rgba(255,255,255,0.25)";
        for (let k = 0; k < 5; k++) {
          const a = DIR_ANG[v.dir] + side * (-1.2 + k * 0.45);
          g.fillRect(Math.round(hx + Math.cos(a) * w.reach), Math.round(hy + Math.sin(a) * w.reach), 1, 1);
        }
      }
    }
  } else if (w.id !== "fists") {
    // held, pointing down
    if (w.id === "knuckles") r(g, hx - 1, hy - 1, 3, 2, w.colors[0]);
    else weaponLine(g, hx, hy, Math.PI / 2 + (v.dir === "left" ? 0.5 : -0.5), w);
  }
}

// the hooper dribbles, and every few seconds puts one up at the rim
const RIM = { x: 25.95 * TILE, y: 1.55 * TILE };
function drawBall(g: G, a: Actor, t: number, reduced: boolean) {
  const cycle = (t + 2) % 7;
  let bx: number;
  let by: number;
  if (cycle < 5 || reduced) {
    const h = Math.abs(Math.sin(cycle * 6));
    bx = a.x + 5;
    by = a.y - 2 - h * 7;
  } else {
    const p = (cycle - 5) / 2;
    if (p < 0.5) {
      const k = p / 0.5;
      bx = a.x + 5 + (RIM.x - a.x - 5) * k;
      by = a.y - 10 + (RIM.y - a.y + 10) * k - Math.sin(k * Math.PI) * 26;
    } else {
      const k = (p - 0.5) / 0.5;
      bx = RIM.x + (a.x + 5 - RIM.x) * k;
      by = RIM.y + (a.y - 2 - RIM.y) * k - Math.abs(Math.sin(k * Math.PI * 2)) * 10;
    }
  }
  r(g, bx - 1, by - 1, 3, 3, "#e0662a");
  r(g, bx, by - 1, 1, 3, "#8a3a12");
}

/** The police car's light bar: red and blue taking turns (steady with reduced motion). */
const copPhase = (t: number, reduced: boolean) => (reduced ? -1 : Math.floor(t * 4) % 2);

function drawCar(g: G, a: Actor, t = 0, reduced = false) {
  const right = (a.vx ?? 0) > 0;
  const x = Math.round(a.x - CAR_W / 2);
  const y = Math.round(a.y - 16);
  const body = a.color ?? "#3a4d5c";
  r(g, x + 2, y + 13, CAR_W - 4, 3, "rgba(0,0,0,0.4)");
  r(g, x, y + 5, CAR_W, 8, body);
  r(g, x + (right ? 8 : 10), y, 20, 6, body);
  r(g, x + (right ? 10 : 12), y + 1, 7, 4, "#1a2229");
  r(g, x + (right ? 19 : 21), y + 1, 7, 4, "#1a2229");
  r(g, x, y + 8, CAR_W, 1, "rgba(255,255,255,0.12)");
  r(g, x + 5, y + 11, 6, 5, "#0b0b0d");
  r(g, x + CAR_W - 11, y + 11, 6, 5, "#0b0b0d");
  r(g, right ? x + CAR_W - 2 : x, y + 6, 2, 2, "#fff2c0");
  r(g, right ? x : x + CAR_W - 2, y + 6, 2, 2, "#d0302a");
  if (a.cop) {
    // white doors, a stripe, the bar on the roof
    r(g, x + 9, y + 6, CAR_W - 18, 5, "#e8e4da");
    r(g, x + 1, y + 10, CAR_W - 2, 1, "#3a5ab3");
    const ph = copPhase(t, reduced);
    const bx = x + (right ? 14 : 16);
    r(g, bx, y - 2, 8, 2, "#26262b");
    r(g, bx, y - 2, 4, 2, ph === 0 ? "#ff3a3a" : "#7a1a1a");
    r(g, bx + 4, y - 2, 4, 2, ph === 1 ? "#4a8aff" : "#1a2a6a");
  }
}

let catFrames: HTMLCanvasElement[] | null = null;
function catSprites(fur: string) {
  if (catFrames) return catFrames;
  const pal: Record<string, string> = { k: fur, d: "#3a3430", e: "#c8e86a", p: "#e8a0a0" };
  const make = (rows: string[]) => {
    const c = document.createElement("canvas");
    c.width = rows[0].length;
    c.height = rows.length;
    const cg = c.getContext("2d")!;
    rows.forEach((row, y) => [...row].forEach((ch, x) => pal[ch] && ((cg.fillStyle = pal[ch]), cg.fillRect(x, y, 1, 1))));
    return c;
  };
  catFrames = [
    // sitting, tail curled round
    make(["........k.k.", "........kkk.", "........kek.", "....kkkkkkk.", "...kkkkkkk..", "..kkkkkkkk..", "kkkkkdkdkk.."]),
    // trotting, two steps
    make(["..........k.", "k........kkk", ".k.kkkkkkkek", "..kkkkkkkkk.", "...kkkkkkk..", "...k.k..k.k.", "..k...k.k..k"]),
    make(["..........k.", "k........kkk", ".kkkkkkkkkek", "..kkkkkkkkk.", "...kkkkkkk..", "....kk..kk..", "....k.k..kk."]),
  ];
  return catFrames;
}

function drawCat(g: G, a: Actor, t: number) {
  const [sit, w1, w2] = catSprites(a.color ?? "#6a6058");
  const img = a.walking ? (Math.floor(t * (a.bolt ? 14 : 7)) % 2 ? w1 : w2) : sit;
  const x = Math.round(a.x) - 6;
  const y = Math.round(a.y) - img.height;
  r(g, a.x - 5, a.y - 1, 10, 2, "rgba(0,0,0,0.3)");
  if (a.dir === "left") {
    g.save();
    g.scale(-1, 1);
    g.drawImage(img, -x - 12, y);
    g.restore();
  } else g.drawImage(img, x, y);
}

function drawBike(g: G, a: Actor, t: number) {
  const right = (a.vx ?? 0) > 0;
  const x = Math.round(a.x);
  const y = Math.round(a.y);
  const wheel = (cx: number) => {
    r(g, cx - 2, y - 5, 5, 1, "#15161a");
    r(g, cx - 2, y - 1, 5, 1, "#15161a");
    r(g, cx - 3, y - 4, 1, 3, "#15161a");
    r(g, cx + 3, y - 4, 1, 3, "#15161a");
  };
  wheel(x - 6);
  wheel(x + 6);
  r(g, x - 6, y - 3, 12, 1, "#8a8d94");
  r(g, x + (right ? 5 : -6), y - 8, 1, 5, "#8a8d94");
  const sp = personSprites(a.look!);
  const img = sp.walk[right ? "right" : "left"][1 + (Math.floor(t * 8) % 2)];
  g.drawImage(img, x - 6, y - 4 - img.height + 3);
}

function drawDog(g: G, a: Actor) {
  const frames = dogSprites(a.color ?? "#8a5a34", "#4a2e1a");
  const img = frames[a.walking ? Math.floor(a.t * 8) % 2 : 0];
  const x = Math.round(a.x) - 6;
  const y = Math.round(a.y) - img.height;
  r(g, a.x - 5, a.y - 1, 10, 2, "rgba(0,0,0,0.3)");
  if (a.dir === "left") {
    g.save();
    g.scale(-1, 1);
    g.drawImage(img, -x - 12, y);
    g.restore();
  } else g.drawImage(img, x, y);
}

function drawPigeon(g: G, a: Actor, t: number) {
  const [stand, peck, fly] = pigeonSprites();
  const img = a.fly !== undefined ? fly : Math.sin(a.t * 2 + a.x) > 0.6 ? peck : stand;
  const alpha = a.fly !== undefined ? Math.max(0, 1 - a.fly / 1.6) : 1;
  if (alpha <= 0) return;
  g.globalAlpha = alpha;
  const x = Math.round(a.x) - 3;
  const y = Math.round(a.y) - 5 + (a.fly !== undefined && Math.floor(t * 12) % 2 ? -1 : 0);
  if (a.dir === "left") {
    g.save();
    g.scale(-1, 1);
    g.drawImage(img, -x - 12, y);
    g.restore();
  } else g.drawImage(img, x, y);
  g.globalAlpha = 1;
}

export function drawActor(g: G, a: Actor, t: number, beat: boolean, reduced: boolean) {
  switch (a.kind) {
    case "person":
      return drawPerson(g, a, t, beat, reduced);
    case "dog":
      return drawDog(g, a);
    case "pigeon":
      return drawPigeon(g, a, t);
    case "car":
      return drawCar(g, a, t, reduced);
    case "bike":
      return drawBike(g, a, t);
    case "cat":
      return drawCat(g, a, t);
  }
}

/** Smoke from every joint in the room: drifting up, spreading, fading. */
export function drawSmoke(g: G, dt: number) {
  for (let i = smoke.length - 1; i >= 0; i--) {
    const p = smoke[i];
    p.life += dt;
    if (p.life > 2.4) {
      smoke.splice(i, 1);
      continue;
    }
    p.y -= 7 * dt;
    p.x += (p.vx + Math.sin(p.life * 3 + p.y) * 2) * dt;
    const a = 0.45 * (1 - p.life / 2.4);
    const size = p.life > 1 ? 2 : 1;
    g.fillStyle = `rgba(200,205,215,${a.toFixed(3)})`;
    g.fillRect(Math.round(p.x), Math.round(p.y), size, size);
  }
}
export function clearSmoke() {
  smoke.length = 0;
}

/** Lights the inhabitants carry: headlights, phone screens. */
export function actorLights(actors: Actor[], place: string, t = 0, reduced = false): Light[] {
  const out: Light[] = [];
  for (const a of actors) {
    if (a.place !== place || a.hidden) continue;
    if (a.kind === "car") {
      const right = (a.vx ?? 0) > 0;
      out.push({ x: a.x + (right ? CAR_W / 2 + 18 : -CAR_W / 2 - 18), y: a.y - 8, r: 42, color: "rgba(255,240,200,0.5)" });
      out.push({ x: a.x + (right ? -CAR_W / 2 : CAR_W / 2), y: a.y - 8, r: 14, color: "rgba(255,60,40,0.5)" });
      if (a.cop) {
        const ph = copPhase(t, reduced);
        out.push({ x: a.x, y: a.y - 18, r: 46, color: ph === 0 ? "rgba(255,40,40,0.7)" : ph === 1 ? "rgba(60,110,255,0.7)" : "rgba(160,80,200,0.35)" });
      }
    } else if (a.item === "phone" && a.kind === "person") out.push({ x: a.x + 3, y: a.y - 8, r: 14, color: "rgba(140,200,255,0.4)" });
    else if (a.item === "joint" && a.kind === "person") out.push({ x: a.x + 4, y: a.y - 8, r: 8, color: "rgba(255,120,40,0.5)" });
  }
  return out;
}

/** The boombox outside the store: its cones push on the beat. */
export function drawBoombox(g: G, beat: boolean, playing: boolean) {
  const x = 17 * TILE + 3;
  const y = 4 * TILE + 3;
  r(g, x, y, 13, 8, "#26282d");
  r(g, x + 3, y - 2, 7, 1, "#44464c");
  r(g, x + 1, y + 1, 11, 1, "#3a3c42");
  const cone = playing && beat ? "#5a5d66" : "#3a3c42";
  r(g, x + 1, y + 3, 4, 4, "#111216");
  r(g, x + 8, y + 3, 4, 4, "#111216");
  r(g, x + 2, y + 4, 2, 2, cone);
  r(g, x + 9, y + 4, 2, 2, cone);
  if (playing) r(g, x + 6, y + 2, 1, 1, "#7fd07f");
}

/** Wind chimes on the rooftop antenna. */
export function drawChimes(g: G, t: number, reduced: boolean) {
  const x0 = 8 * TILE + 2;
  const y0 = 1.4 * TILE + 1;
  for (let i = 0; i < 5; i++) {
    const sway = reduced ? 0 : Math.round(Math.sin(t * 1.3 + i * 0.9) * 1.4);
    r(g, x0 + i * 3 + sway, y0, 1, 5 + (i % 3) * 2, "#c9c2b3");
  }
}
