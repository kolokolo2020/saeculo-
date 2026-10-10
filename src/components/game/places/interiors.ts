import { hash, r, sign, T, TILE, type Fx, type G, type Light, type Scene } from "./kit";

// Three rooms off the avenue: the record shop (crates to dig, a listening
// station, an owner who buys tapes), the thrift shop (racks, a shoe wall, a
// mirror), and the club (the decks, the bar, the floor).

function floorBoards(g: G, s: Scene, base: string, line: string, knot: string) {
  s.tiles.forEach((row, ty) =>
    [...row].forEach((ch, tx) => {
      const x = tx * TILE;
      const y = ty * TILE;
      if (ch === "#") r(g, x, y, TILE, TILE, "#0d0c10");
      else if (ch === "f" || ch === "D") {
        r(g, x, y, TILE, TILE, base);
        r(g, x, y + 15, TILE, 1, line);
        r(g, x + ((ty % 2) * 8 + 5) % 16, y, 1, 15, line);
        if (hash(tx, ty) > 0.75) r(g, x + 9, y + 6, 2, 1, knot);
      }
    }),
  );
}

// ------------------------------------------------------------ the record shop

function paintRecords(g: G, s: Scene) {
  floorBoards(g, s, "#3b2c22", "#2c2019", "#47352a");
  // walls: shelves of records, posters
  r(g, TILE, TILE, 14 * TILE, 2 * TILE, "#2a2420");
  for (let k = 0; k < 14; k++) {
    const x = TILE + 4 + k * 15.5;
    r(g, x, TILE + 6, 12, 12, ["#d0a020", "#4f7d99", "#a4452f", "#e8e0cf", "#5a3a8a", "#2f6b3a", "#c9c2b3"][k % 7]);
    r(g, x + 3, TILE + 9, 6, 6, "#111216");
  }
  r(g, TILE, TILE + 20, 14 * TILE, 2, "#4a3526");
  for (let k = 0; k < 40; k++) r(g, TILE + 4 + k * 5.4, TILE + 23, 4, 7, ["#1b1b1b", "#3a2a1e", "#2c3e50", "#c9c2b3", "#6b3f1e"][k % 5]);
  r(g, TILE, 2 * TILE + 14, 14 * TILE, 2, "#1a1512");
  // the listening station
  r(g, TILE + 2, 3 * TILE - 2, 2 * TILE - 4, 12, "#4a3526");
  r(g, TILE + 6, 3 * TILE - 8, 12, 8, "#1b1b1f");
  r(g, TILE + 8, 3 * TILE - 6, 8, 4, "#3a3c42");
  r(g, TILE + 20, 3 * TILE - 6, 5, 4, "#111216");
  // bins of records
  for (const y of [5, 7]) {
    r(g, 2 * TILE, y * TILE - 4, 6 * TILE, 14, "#5a4330");
    r(g, 2 * TILE, y * TILE - 4, 6 * TILE, 2, "#6a5038");
    for (let k = 0; k < 22; k++) r(g, 2 * TILE + 2 + k * 4.3, y * TILE - 10, 3, 8, ["#1b1b1b", "#d0a020", "#4f7d99", "#a4452f", "#e8e0cf", "#2f6b3a"][(k + y) % 6]);
  }
  // the counter and the register
  r(g, 10 * TILE, 4 * TILE - 4, 5 * TILE, 16, "#4a3526");
  r(g, 10 * TILE, 4 * TILE - 6, 5 * TILE, 3, "#6a5038");
  r(g, 13 * TILE, 4 * TILE - 14, 12, 9, "#2a2c31");
  r(g, 13 * TILE + 2, 4 * TILE - 12, 8, 3, "#f2b45a");
  // a turntable on the counter
  r(g, 10 * TILE + 6, 4 * TILE - 12, 18, 8, "#1b1b1f");
  r(g, 10 * TILE + 9, 4 * TILE - 11, 7, 6, "#0b0b0d");
  r(g, 10 * TILE + 11, 4 * TILE - 9, 3, 2, "#d0a020");
  // a rug
  r(g, 9 * TILE, 6 * TILE, 5 * TILE, 2 * TILE, "#3a2a3a");
  r(g, 9 * TILE + 3, 6 * TILE + 3, 5 * TILE - 6, 2 * TILE - 6, "#4a344a");
  r(g, 7 * TILE, 9 * TILE, 2 * TILE, TILE, "#2a2018");
}

function fxRecords(g: G, f: Fx) {
  // the record on the counter turns
  const a = f.reduced ? 0 : f.t * 6;
  r(g, 10 * TILE + 12 + Math.cos(a) * 2, 4 * TILE - 9 + Math.sin(a) * 1.5, 1, 1, "#e8e0cf");
}

export const RECORDS: Scene = {
  id: "records",
  name: "The record shop",
  tiles: ["################", "#wwwwwwwwwwwwww#", "#wwwwwwwwwwwwww#", "#ffffffffffffff#", "#ffffffffffffff#", "#ffffffffffffff#", "#ffffffffffffff#", "#ffffffffffffff#", "#ffffffffffffff#", "#######DD#######"],
  solid: "#w",
  surface: () => "wood",
  things: [
    { id: "listening", body: T(1, 2.6, 2, 0.6), zone: T(1, 3.2, 2, 1) },
    { id: "crates", body: { x: 2 * TILE, y: 5 * TILE - 6, w: 6 * TILE, h: 10 }, zone: T(2, 5.4, 6, 0.8) },
    { id: "crates", body: { x: 2 * TILE, y: 7 * TILE - 6, w: 6 * TILE, h: 10 }, zone: T(2, 7.4, 6, 0.8) },
    { id: "record-counter", body: T(10, 3.6, 5, 0.8), zone: T(10, 4.4, 5, 1) },
  ],
  doors: [{ zone: T(7, 9, 2, 1), to: "avenue", label: "↓ the avenue", spawn: { x: 18.5 * TILE, y: 3.7 * TILE, dir: "down" } }],
  lights: [
    { x: 5 * TILE, y: 2.5 * TILE, r: 90, color: "rgba(255,190,110,0.5)" },
    { x: 12 * TILE, y: 3 * TILE, r: 80, color: "rgba(255,170,90,0.45)" },
    { x: 8 * TILE, y: 7 * TILE, r: 100, color: "rgba(255,200,140,0.25)" },
  ],
  darkness: 0.5,
  paint: paintRecords,
  fx: fxRecords,
};

// ------------------------------------------------------------ the thrift shop

function paintThrift(g: G, s: Scene) {
  floorBoards(g, s, "#4a3e34", "#3a3028", "#56483c");
  r(g, TILE, TILE, 12 * TILE, TILE, "#5a4a5a");
  for (let k = 0; k < 24; k++) r(g, TILE + k * 8, TILE, 4, TILE, "#544454");
  r(g, TILE, 2 * TILE - 2, 12 * TILE, 2, "#3a2e3a");
  // the mirror
  r(g, 8 * TILE - 2, 2, 2 * TILE + 4, 2 * TILE - 4, "#8a6a40");
  r(g, 8 * TILE, 4, 2 * TILE, 2 * TILE - 8, "#9ab0c4");
  r(g, 8 * TILE + 4, 8, 3, 2 * TILE - 16, "#c8d8e8");
  sign(g, "SECOND HAND", 2 * TILE, TILE + 3, "#f2d8a8", undefined, 7);
  // racks: a rail and everything on it
  for (const y of [3, 6]) {
    r(g, 2 * TILE - 2, y * TILE - 12, 4 * TILE + 4, 2, "#8a8d94");
    r(g, 2 * TILE - 2, y * TILE - 12, 2, 18, "#6a6d74");
    r(g, 6 * TILE, y * TILE - 12, 2, 18, "#6a6d74");
    for (let k = 0; k < 14; k++) {
      const c = ["#2a4a7a", "#5a3a8a", "#2f6b3a", "#d0a020", "#26262b", "#c9c2b3", "#3c5a86", "#141418", "#1f2a5a"][(k + y) % 9];
      r(g, 2 * TILE + k * 4.4, y * TILE - 10, 4, 14 - (k % 3), c);
    }
  }
  // the shoe wall
  r(g, 12 * TILE - 2, 2 * TILE, 18, 4 * TILE, "#3a2a1e");
  for (let k = 0; k < 6; k++) {
    r(g, 12 * TILE, 2 * TILE + 6 + k * 10, 14, 1, "#5a4330");
    r(g, 12 * TILE + 2, 2 * TILE + 2 + k * 10, 5, 4, ["#e8e0cf", "#111216", "#4fe3ff", "#3a2a1e", "#d8b35a", "#a98bff"][k]);
    r(g, 12 * TILE + 8, 2 * TILE + 2 + k * 10, 5, 4, ["#e8e0cf", "#111216", "#4fe3ff", "#3a2a1e", "#d8b35a", "#a98bff"][k]);
  }
  // a hat stand
  r(g, 7 * TILE + 7, 5 * TILE - 6, 2, 22, "#5a4330");
  r(g, 7 * TILE + 2, 5 * TILE - 8, 5, 3, "#d0a020");
  r(g, 7 * TILE + 9, 5 * TILE - 4, 5, 3, "#c9c2b3");
  r(g, 6 * TILE, 8 * TILE, 2 * TILE, TILE, "#2a2018");
}

function frontThrift(g: G) {
  // the counter, in front of whoever stands behind it
  r(g, 9 * TILE, 3 * TILE - 2, 3 * TILE, 14, "#5b4637");
  r(g, 9 * TILE, 3 * TILE - 4, 3 * TILE, 3, "#7a604c");
  r(g, 10 * TILE + 6, 3 * TILE - 10, 10, 6, "#2a2c31");
}

export const THRIFT: Scene = {
  id: "thrift",
  name: "The thrift shop",
  tiles: ["##############", "#wwwwwwwwwwww#", "#ffffffffffff#", "#ffffffffffff#", "#ffffffffffff#", "#ffffffffffff#", "#ffffffffffff#", "#ffffffffffff#", "######DD######"],
  solid: "#w",
  surface: () => "wood",
  things: [
    { id: "rack", body: { x: 2 * TILE, y: 3 * TILE - 6, w: 4 * TILE, h: 8 }, zone: T(2, 3.3, 4, 0.9) },
    { id: "rack", body: { x: 2 * TILE, y: 6 * TILE - 6, w: 4 * TILE, h: 8 }, zone: T(2, 6.3, 4, 0.9) },
    { id: "shoes", body: T(12, 2, 1, 4), zone: T(11, 2.5, 1, 3) },
    { id: "mirror", zone: T(8, 2, 2, 1) },
    { id: "hatstand", body: { x: 7 * TILE + 5, y: 5 * TILE + 8, w: 6, h: 6 } },
    { id: "thrift-counter", body: T(9, 2.6, 3, 0.8), zone: T(9, 3.4, 3, 1) },
  ],
  doors: [{ zone: T(6, 8, 2, 1), to: "avenue", label: "↓ the avenue", spawn: { x: 5.5 * TILE, y: 3.7 * TILE, dir: "down" } }],
  lights: [
    { x: 4 * TILE, y: 2 * TILE, r: 90, color: "rgba(255,220,170,0.45)" },
    { x: 10 * TILE, y: 2.5 * TILE, r: 80, color: "rgba(255,210,160,0.45)" },
    { x: 7 * TILE, y: 6 * TILE, r: 90, color: "rgba(255,230,190,0.3)" },
  ],
  darkness: 0.36,
  paint: paintThrift,
  front: frontThrift,
};

// ------------------------------------------------------------ the club

const FLOOR = { x: 6, y: 5, w: 12, h: 6 };
const DISCO = ["#ff3cc8", "#4fe3ff", "#a98bff", "#ffd23a", "#7ddc3a"];

function paintClub(g: G, s: Scene) {
  s.tiles.forEach((row, ty) =>
    [...row].forEach((ch, tx) => {
      const x = tx * TILE;
      const y = ty * TILE;
      if (ch === "#") r(g, x, y, TILE, TILE, "#050408");
      else if (ch === "w") {
        r(g, x, y, TILE, TILE, "#120e1a");
        if (ty === 2) r(g, x, y + 13, TILE, 3, "#0b0910");
        if ((tx + ty) % 3 === 0) r(g, x + 4, y + 3, 1, 8, "#1a1426");
      } else {
        r(g, x, y, TILE, TILE, "#16131c");
        if (hash(tx, ty) > 0.7) r(g, x + 6, y + 9, 2, 1, "#1d1924");
      }
    }),
  );
  // the floor's frame
  r(g, FLOOR.x * TILE - 2, FLOOR.y * TILE - 2, FLOOR.w * TILE + 4, FLOOR.h * TILE + 4, "#2a2236");
  // speakers
  for (const x of [1.2, 15.2]) {
    r(g, x * TILE, 2 * TILE + 4, 26, 30, "#0b0b0d");
    r(g, x * TILE + 4, 2 * TILE + 8, 18, 10, "#1b1b1f");
    r(g, x * TILE + 8, 2 * TILE + 10, 10, 6, "#2a2a30");
    r(g, x * TILE + 4, 2 * TILE + 21, 18, 10, "#1b1b1f");
    r(g, x * TILE + 8, 2 * TILE + 23, 10, 6, "#2a2a30");
  }
  // the bar
  r(g, 19 * TILE, 4 * TILE - 4, TILE, 5 * TILE + 4, "#2a1a24");
  r(g, 19 * TILE, 4 * TILE - 4, 3, 5 * TILE + 4, "#4a2a3a");
  r(g, 21 * TILE, TILE + 6, 2 * TILE, 3, "#3a2a1e");
  for (let k = 0; k < 8; k++) r(g, 21 * TILE + 1 + k * 4, TILE - 2, 3, 8, ["#6b3f1e", "#2f5a3a", "#8a3fd0", "#d0a020"][k % 4]);
  // couches
  r(g, TILE, 9 * TILE, 4 * TILE, 2 * TILE, "#2a1640");
  r(g, TILE + 3, 9 * TILE + 6, 4 * TILE - 6, 2 * TILE - 10, "#3a2054");
  // a poster of the album on the wall
  r(g, 4 * TILE, TILE + 2, 22, 22, "#05060f");
  for (let k = 0; k < 5; k++) r(g, 4 * TILE + 3 + k * 3.5, TILE + 14 - (k % 3) * 2, 2, 4 + (k % 3) * 2, ["#2fe6ff", "#7f96ff", "#c77dff"][k % 3]);
  r(g, 11 * TILE, 12 * TILE, 2 * TILE, TILE, "#1a1424");
}

function fxClub(g: G, f: Fx) {
  // the floor: a different few squares lit on every beat
  const beatN = f.state.beats ?? 0;
  for (let y = 0; y < FLOOR.h; y++)
    for (let x = 0; x < FLOOR.w; x++) {
      const k = (x * 7 + y * 13 + beatN * 5) % 11;
      const lit = !f.reduced && k < (f.beat ? 4 : 2);
      const c = lit ? DISCO[(x + y + beatN) % DISCO.length] : (x + y) % 2 ? "#1d1828" : "#221c2e";
      r(g, (FLOOR.x + x) * TILE + 1, (FLOOR.y + y) * TILE + 1, TILE - 2, TILE - 2, c);
      if (lit) r(g, (FLOOR.x + x) * TILE + 3, (FLOOR.y + y) * TILE + 3, TILE - 6, 2, "rgba(255,255,255,0.35)");
    }
  // a mirror ball over the floor
  const bx = 12 * TILE;
  const by = 2 * TILE + 6;
  r(g, bx - 4, by - 4, 8, 8, "#8a8d94");
  for (let k = 0; k < 6; k++) {
    const a = (f.reduced ? 0 : f.t * 1.4) + k;
    r(g, bx - 3 + ((k * 3) % 6), by - 3 + Math.floor(k / 2) * 2, 1, 1, Math.sin(a * 3) > 0.3 ? "#ffffff" : "#c9ccd4");
  }
  r(g, bx, TILE, 1, by - TILE - 4, "#3a3c42");
}

function frontClub(g: G, f: Fx) {
  // the booth, over the DJ's legs; its lights run with the beat
  r(g, 9 * TILE, 3 * TILE + 2, 6 * TILE, 14, "#0b0a10");
  r(g, 9 * TILE, 3 * TILE, 6 * TILE, 3, "#2a2236");
  for (let k = 0; k < 16; k++) {
    const on = !f.reduced && f.beat ? (k + (f.state.beats ?? 0)) % 3 === 0 : k % 4 === 0;
    r(g, 9 * TILE + 4 + k * 5.6, 3 * TILE + 8, 3, 2, on ? DISCO[k % DISCO.length] : "#221c2e");
  }
}

function lightsClub(f: Fx): Light[] {
  if (f.reduced) return [{ x: 12 * TILE, y: 8 * TILE, r: 120, color: "rgba(170,90,255,0.35)" }];
  const out: Light[] = [];
  for (let k = 0; k < 3; k++) {
    const a = f.t * (0.6 + k * 0.25) + k * 2.1;
    out.push({ x: 12 * TILE + Math.cos(a) * 70, y: 8 * TILE + Math.sin(a * 1.3) * 34, r: 46, color: ["rgba(255,60,200,0.6)", "rgba(79,227,255,0.6)", "rgba(169,139,255,0.6)"][k] });
  }
  if (f.beat) out.push({ x: 12 * TILE, y: 3 * TILE, r: 140, color: "rgba(255,255,255,0.12)" });
  return out;
}

export const CLUB: Scene = {
  id: "club",
  name: "The club",
  tiles: [
    "########################",
    "#wwwwwwwwwwwwwwwwwwwwww#",
    "#wwwwwwwwwwwwwwwwwwwwww#",
    "#cccccccccccccccccccccc#",
    "#cccccccccccccccccccccc#",
    "#cccccccccccccccccccccc#",
    "#cccccccccccccccccccccc#",
    "#cccccccccccccccccccccc#",
    "#cccccccccccccccccccccc#",
    "#cccccccccccccccccccccc#",
    "#cccccccccccccccccccccc#",
    "#cccccccccccccccccccccc#",
    "###########DD###########",
  ],
  solid: "#w",
  surface: () => "floor",
  things: [
    { id: "booth", body: T(9, 3, 6, 1), zone: T(9, 4, 6, 1) },
    { id: "speaker-l", body: { x: 1.2 * TILE, y: 3 * TILE, w: 26, h: 6 } },
    { id: "speaker-r", body: { x: 15.2 * TILE, y: 3 * TILE, w: 26, h: 6 } },
    { id: "bar", body: T(19, 4, 1, 5), zone: T(18, 4.5, 1, 4) },
    { id: "couch", body: T(1, 9, 4, 2) },
  ],
  doors: [{ zone: T(11, 12, 2, 1), to: "avenue", label: "↓ the avenue", spawn: { x: 35.5 * TILE, y: 3.7 * TILE, dir: "down" } }],
  lights: [
    { x: 12 * TILE, y: 3.5 * TILE, r: 70, color: "rgba(170,90,255,0.4)", kind: "screen" },
    { x: 20.5 * TILE, y: 3 * TILE, r: 70, color: "rgba(255,170,90,0.35)" },
    { x: 3 * TILE, y: 10 * TILE, r: 50, color: "rgba(255,60,200,0.3)" },
  ],
  darkness: 0.68,
  paint: paintClub,
  fx: fxClub,
  front: frontClub,
  liveLights: lightsClub,
};
