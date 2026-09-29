import { CAR_W, type Actor } from "./life";
import { dogSprites, personSprites, pigeonSprites } from "./people";
import { TILE, type Light } from "./world";

// Drawing the neighbourhood's inhabitants: people with whatever's in their
// hand, dogs, pigeons, cars and bikes; the smoke off a joint; headlights.

type G = CanvasRenderingContext2D;
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
  }
}

function drawPerson(g: G, a: Actor, t: number, beat: boolean, reduced: boolean) {
  const sp = personSprites(a.look!);
  let img: HTMLCanvasElement;
  if (a.pose === "sit") img = a.dir === "up" ? sp.sitBack : sp.sit;
  else if (a.pose === "crouch") img = sp.crouch;
  else img = sp.walk[a.dir][a.walking ? 1 + (Math.floor(a.t * 7) % 2) : 0];
  // nodding along: one pixel down on the beat
  const nod = a.bob && beat && !reduced ? 1 : 0;
  const sx = Math.round(a.x) - 6;
  const sy = Math.round(a.y) - img.height + nod + (a.pose === "sit" ? -3 : 0);
  if (a.pose !== "sit") r(g, a.x - 4, a.y - 1, 8, 2, "rgba(0,0,0,0.35)");
  // draw the head with the nod, the legs planted
  if (nod) {
    g.drawImage(img, 0, 0, 12, 6, sx, sy, 12, 6);
    g.drawImage(img, 0, 6, 12, img.height - 6, sx, sy + 5, 12, img.height - 6);
  } else g.drawImage(img, sx, sy);
  drawItem(g, a, sx, sy, t, reduced);
  if (a.item === "ball") drawBall(g, a, t, reduced);
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

function drawCar(g: G, a: Actor) {
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
      return drawCar(g, a);
    case "bike":
      return drawBike(g, a, t);
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
export function actorLights(actors: Actor[], place: string): Light[] {
  const out: Light[] = [];
  for (const a of actors) {
    if (a.place !== place || a.hidden) continue;
    if (a.kind === "car") {
      const right = (a.vx ?? 0) > 0;
      out.push({ x: a.x + (right ? CAR_W / 2 + 18 : -CAR_W / 2 - 18), y: a.y - 8, r: 42, color: "rgba(255,240,200,0.5)" });
      out.push({ x: a.x + (right ? -CAR_W / 2 : CAR_W / 2), y: a.y - 8, r: 14, color: "rgba(255,60,40,0.5)" });
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
