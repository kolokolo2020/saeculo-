import { hash, lampPole, paintGround, r, sign, T, TILE, type Fx, type G, type Scene } from "./kit";

// The avenue, past the end of your street: a thrift shop, the mouth of an
// alley, the record shop, a laundromat that never closes, the club with a
// queue and a bouncer, and the stairs down to the subway. Off the far end,
// the underpass.

const ROAD = [
  "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
  "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
  "bbbbbDbbbbbDbbbbbbDbbbbbbbbbbbbbbbbDbbbbbbbbbbbb",
  "ssssssssssssssssssssssssssssssssssssssssssssssss",
  "ssssssssssssssssssssssssssssssssssssssssssssssss",
  "cccccccccccccccccccccccccccccccccccccccccccccccc",
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "llllllllllllllllllllllllllllllllllllllllllllllll",
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "cccccccccccccccccccccccccccccccccccccccccccccccc",
  "ffffffffffffffffffffffffffffffffffffffffffffffff",
];

function paint(g: G, s: Scene) {
  paintGround(g, s);
  // puddles
  for (const [px, py] of [
    [3, 6.6],
    [15, 8.3],
    [28, 6.4],
    [40, 8.2],
  ]) {
    r(g, px * TILE, py * TILE, 24, 4, "#262a3a");
    r(g, px * TILE + 4, py * TILE + 1, 12, 1, "#3a4260");
  }

  // the thrift shop (0..9): plaster, a big window of hanging clothes
  for (let tx = 0; tx < 10; tx++) r(g, tx * TILE, 0, TILE, 3 * TILE, tx % 2 ? "#3a3440" : "#383240");
  r(g, 0, 17, 10 * TILE, 2, "#2a2530");
  r(g, 1 * TILE, 21, 3.5 * TILE, 24, "#c9b38a");
  r(g, 1 * TILE + 2, 23, 3.5 * TILE - 4, 20, "#e8d6b0");
  r(g, 6 * TILE - 2, 21, 3.5 * TILE, 24, "#c9b38a");
  r(g, 6 * TILE, 23, 3.5 * TILE - 4, 20, "#e8d6b0");
  for (let k = 0; k < 7; k++) {
    const col = ["#2a4a7a", "#5a3a8a", "#2f6b3a", "#d0a020", "#26262b", "#c9c2b3", "#3c5a86"][k];
    r(g, 1 * TILE + 5 + k * 6, 26, 4, 14, col);
    r(g, 1 * TILE + 5 + k * 6, 25, 4, 1, "#8a8d94");
  }
  r(g, 6 * TILE + 8, 25, 10, 18, "#26262b");
  r(g, 6 * TILE + 10, 23, 6, 4, "#e8d6b0");
  r(g, 6 * TILE + 26, 28, 18, 12, "#7a2a6a");
  r(g, 1 * TILE, 23 + 10, 3.5 * TILE, 1, "rgba(255,255,255,0.15)");
  sign(g, "SECOND HAND", 1 * TILE + 6, 5, "#f2d8a8", "rgba(120,70,20,0.6)");
  r(g, 5 * TILE + 1, 2 * TILE - 6, 14, TILE + 6, "#2a2228");
  r(g, 5 * TILE + 3, 2 * TILE - 4, 10, TILE + 4, "#d8c49c");

  // the alley (10..12): a gap into the dark
  r(g, 10 * TILE, 0, 3 * TILE, 3 * TILE, "#0a0a0d");
  r(g, 10 * TILE + 6, 12, 2 * TILE + 4, 2 * TILE, "#121216");
  r(g, 10 * TILE + 10, 22, 22, 14, "#24402e");
  r(g, 10 * TILE + 10, 22, 22, 2, "#2f5a3e");
  r(g, 12 * TILE + 8, 6, 2, 3 * TILE, "#2a2b30");

  // the record shop (13..24): dark green, a window of sleeves, amber sign
  for (let tx = 13; tx < 25; tx++) r(g, tx * TILE, 0, TILE, 3 * TILE, "#1d2a25");
  r(g, 13 * TILE, 16, 12 * TILE, 2, "#152019");
  r(g, 14 * TILE, 20, 3.5 * TILE, 26, "#12181a");
  r(g, 20 * TILE - 4, 20, 4.5 * TILE, 26, "#12181a");
  for (let k = 0; k < 12; k++) {
    const x = (k < 5 ? 14 * TILE + 3 + k * 10 : 20 * TILE + (k - 5) * 10) + 0;
    const c = ["#d0a020", "#4f7d99", "#a4452f", "#e8e0cf", "#5a3a8a", "#2f6b3a"][k % 6];
    r(g, x, 23 + (k % 2) * 11, 9, 9, c);
    r(g, x + 2, 25 + (k % 2) * 11, 5, 5, "#111216");
    r(g, x + 4, 27 + (k % 2) * 11, 1, 1, c);
  }
  sign(g, "RECORDS", 17 * TILE + 6, 4, "#ffcf7a", "rgba(255,140,40,0.45)");
  r(g, 18 * TILE + 1, 2 * TILE - 6, 14, TILE + 6, "#0d1210");
  r(g, 18 * TILE + 3, 2 * TILE - 4, 10, TILE + 4, "#3a4a40");

  // the laundromat (25..29): pale tiles, round windows
  for (let tx = 25; tx < 30; tx++)
    for (let ty = 0; ty < 3; ty++) {
      r(g, tx * TILE, ty * TILE, TILE, TILE, "#9aa6aa");
      r(g, tx * TILE, ty * TILE + 15, TILE, 1, "#7f8a8e");
      r(g, tx * TILE + 15, ty * TILE, 1, TILE, "#7f8a8e");
    }
  r(g, 25 * TILE + 4, 18, 5 * TILE - 8, 28, "#c8e4ea");
  for (let k = 0; k < 4; k++) {
    const x = 25 * TILE + 10 + k * 17;
    r(g, x, 26, 13, 13, "#e9f0f0");
    r(g, x + 2, 28, 9, 9, "#3a5060");
  }
  sign(g, "LAUNDRY 24", 25 * TILE + 8, 5, "#20343c");

  // the club (30..41): black, a neon name, a door that thumps
  for (let tx = 30; tx < 42; tx++) r(g, tx * TILE, 0, TILE, 3 * TILE, "#0b0a10");
  for (let k = 0; k < 4; k++) r(g, 31 * TILE + k * 40, 20, 26, 18, ["#2a1640", "#16283a", "#2a1640", "#16283a"][k]);
  r(g, 35 * TILE - 2, 2 * TILE - 8, 20, TILE + 8, "#05040a");
  r(g, 35 * TILE + 1, 2 * TILE - 5, 14, TILE + 5, "#1a1028");
  // the rope
  r(g, 33.5 * TILE, 3 * TILE + 2, 2, 10, "#d8b35a");
  r(g, 37.3 * TILE, 3 * TILE + 2, 2, 10, "#d8b35a");

  // the end of the block (42..47): stone, and the subway stairs on the pavement
  for (let tx = 42; tx < 48; tx++)
    for (let ty = 0; ty < 3; ty++) {
      r(g, tx * TILE, ty * TILE, TILE, TILE, "#3a3a40");
      if (hash(tx, ty + 30) > 0.6) r(g, tx * TILE + 3, ty * TILE + 4, 6, 3, "#34343a");
      r(g, tx * TILE, ty * TILE + 15, TILE, 1, "#2e2e33");
    }
  for (const [x, w] of [
    [43, 1],
    [46, 1],
  ]) {
    r(g, x * TILE + 3, 12, w * TILE - 6, 18, "#1a1c22");
    r(g, x * TILE + 4, 13, w * TILE - 8, 16, "#c9a050");
  }
  // stairs down
  r(g, 44 * TILE - 2, 3 * TILE + 2, 2 * TILE + 4, 2 * TILE - 4, "#55565c");
  for (let k = 0; k < 6; k++) r(g, 44 * TILE, 3 * TILE + 4 + k * 4, 2 * TILE, 3, k % 2 ? "#1c1d22" : "#26272c");
  r(g, 44 * TILE - 2, 3 * TILE + 2, 2, 2 * TILE - 4, "#8a8d94");
  r(g, 46 * TILE, 3 * TILE + 2, 2, 2 * TILE - 4, "#8a8d94");
  // the sign on its pole
  r(g, 43 * TILE + 6, 2 * TILE + 8, 2, TILE + 8, "#2a2b30");
  r(g, 43 * TILE - 2, 2 * TILE - 2, 18, 10, "#1b5a3a");
  sign(g, "SUBWAY", 43 * TILE - 1, 2 * TILE, "#e8f5ea", undefined, 6);
}

function fx(g: G, f: Fx) {
  // the club's neon, which buzzes and now and then drops a letter
  const flick = f.reduced ? 1 : f.t % 9 < 0.12 || (f.t % 9 > 0.3 && f.t % 9 < 0.36) ? 0.35 : 1;
  g.globalAlpha = flick;
  sign(g, "AFTERHOURS", 32 * TILE + 6, 4, "#ffd6ff", "rgba(255,60,200,0.7)", 9);
  g.globalAlpha = 1;
  r(g, 32 * TILE + 6, 16, 9 * TILE - 2, 1, "#4fe3ff");
  // the door thumps
  if (f.beat && !f.reduced) r(g, 35 * TILE + 3, 2 * TILE - 3, 10, TILE + 2, "rgba(170,80,255,0.35)");
  // washers turning
  for (let k = 0; k < 4; k++) {
    const cx = 25 * TILE + 16 + k * 17;
    const a = f.reduced ? k : f.t * (k % 2 ? -5 : 4) + k;
    r(g, cx + Math.cos(a) * 2.5, 32 + Math.sin(a) * 2.5, 2, 2, ["#c9c2b3", "#4f7d99", "#d0a020", "#e8e0cf"][k]);
  }
}

function front(g: G) {
  lampPole(g, 9 * TILE, 3 * TILE);
  lampPole(g, 22 * TILE, 3 * TILE);
  lampPole(g, 41 * TILE, 9 * TILE);
}

export const AVENUE: Scene = {
  id: "avenue",
  name: "The avenue",
  tiles: ROAD,
  solid: "Bbf",
  surface: (ch) => (ch === "a" || ch === "l" ? "wet" : "stone"),
  outdoors: true,
  things: [
    { id: "lamp-a1", body: { x: 9 * TILE + 6, y: 3 * TILE + 8, w: 4, h: 4 } },
    { id: "lamp-a2", body: { x: 22 * TILE + 6, y: 3 * TILE + 8, w: 4, h: 4 } },
    { id: "lamp-a3", body: { x: 41 * TILE + 6, y: 9 * TILE + 8, w: 4, h: 4 } },
    { id: "rope-a", body: { x: 33.5 * TILE - 1, y: 3 * TILE + 6, w: 4, h: 6 } },
    { id: "rope-b", body: { x: 37.3 * TILE - 1, y: 3 * TILE + 6, w: 4, h: 6 } },
    { id: "rail-l", body: { x: 44 * TILE - 3, y: 3 * TILE + 4, w: 3, h: 2 * TILE - 8 } },
    { id: "rail-r", body: { x: 46 * TILE, y: 3 * TILE + 4, w: 3, h: 2 * TILE - 8 } },
    { id: "laundry", zone: T(25.5, 3, 4, 1) },
    { id: "thrift-window", zone: T(1, 3, 3, 1) },
    { id: "records-window", zone: T(14, 3, 3, 1) },
  ],
  doors: [
    { zone: { x: 0, y: 3 * TILE, w: 6, h: 7 * TILE }, to: "street", label: "← your street", spawn: { x: 38.6 * TILE, y: 4.4 * TILE, dir: "left" } },
    { zone: T(5, 2), to: "thrift", label: "↑ thrift shop", spawn: { x: 7 * TILE, y: 7.4 * TILE, dir: "up" } },
    { zone: T(11, 2), to: "alley", label: "↑ the alley", spawn: { x: 12 * TILE, y: 8.4 * TILE, dir: "up" } },
    { zone: T(18, 2), to: "records", label: "↑ record shop", spawn: { x: 8 * TILE, y: 8.4 * TILE, dir: "up" } },
    { zone: T(35, 2), to: "club", label: "↑ the club", spawn: { x: 12 * TILE, y: 11.4 * TILE, dir: "up" }, lock: "club" },
    { zone: { x: 44 * TILE + 2, y: 3.4 * TILE, w: 2 * TILE - 4, h: 1.2 * TILE }, to: "subway", label: "↓ subway", spawn: { x: 3 * TILE, y: 3.6 * TILE, dir: "down" } },
    { zone: { x: 47 * TILE + 10, y: 3 * TILE, w: 6, h: 7 * TILE }, to: "underpass", label: "→ the underpass", spawn: { x: 1.4 * TILE, y: 6.5 * TILE, dir: "right" } },
  ],
  lights: [
    { x: 9.5 * TILE, y: 1.2 * TILE, r: 74, color: "rgba(255,196,120,0.5)", kind: "lamp" },
    { x: 22.5 * TILE, y: 1.2 * TILE, r: 74, color: "rgba(255,196,120,0.5)" },
    { x: 41.5 * TILE, y: 7.2 * TILE, r: 64, color: "rgba(255,196,120,0.45)" },
    { x: 4.5 * TILE, y: 2.2 * TILE, r: 80, color: "rgba(255,210,150,0.4)" },
    { x: 18.5 * TILE, y: 2.2 * TILE, r: 84, color: "rgba(255,170,80,0.4)" },
    { x: 27.5 * TILE, y: 2.2 * TILE, r: 76, color: "rgba(210,240,255,0.45)" },
    { x: 36 * TILE, y: 1 * TILE, r: 100, color: "rgba(255,60,200,0.4)" },
    { x: 35.5 * TILE, y: 2.6 * TILE, r: 40, color: "rgba(150,90,255,0.45)" },
    { x: 43.5 * TILE, y: 2.3 * TILE, r: 40, color: "rgba(120,255,170,0.4)" },
  ],
  darkness: 0.72,
  paint,
  fx,
  front,
};
