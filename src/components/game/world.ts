import { hash, lampPole, paintGround, r, T, TILE, type Dir, type G, type Rect, type Scene } from "./places/kit";
import { AVENUE } from "./places/avenue";
import { CLUB, RECORDS, THRIFT } from "./places/interiors";
import { ALLEY, SUBWAY, UNDERPASS } from "./places/underground";
import type { Place } from "./sfx";

// Four small places, 16-px tiles. Each has a tile map (walls vs floor), the
// furniture you bump into and can use, doors, and lights. The static part
// of each place is painted once into an offscreen canvas (paintPlace); the
// things that move are drawn every frame in render.ts.

export { TILE, T, type Dir, type Rect, type Thing, type Door, type Light, type Scene } from "./places/kit";

export const SCENES: Record<Place, Scene> = {
  bedroom: {
    id: "bedroom",
    name: "Bedroom",
    tiles: [
      "####################",
      "#wwwwwwwwwwwwwwwwww#",
      "#wwwwwwwwwwwwwwwwww#",
      "#..................#",
      "#..................#",
      "#..................D",
      "#..................D",
      "#..................#",
      "#..................#",
      "#..................#",
      "####################",
    ],
    solid: "#w",
    surface: () => "wood",
    things: [
      { id: "laptop", body: T(2, 3, 4, 1), zone: T(2, 4, 4, 1) },
      { id: "window", zone: T(7, 3, 3, 1) },
      { id: "shelf", body: T(11, 3, 2, 1), zone: T(11, 4, 2, 1) },
      { id: "bed", body: T(15, 3, 4, 3), zone: { x: 14 * TILE, y: 3 * TILE, w: TILE, h: 3 * TILE } },
      { id: "lamp", body: { x: 18 * TILE + 3, y: 8 * TILE + 8, w: 10, h: 8 } },
      { id: "crate", body: T(1, 8, 2, 1), zone: T(1, 7, 2, 1) },
    ],
    doors: [{ zone: { x: 19 * TILE, y: 5 * TILE, w: TILE, h: 2 * TILE }, to: "street", label: "→ outside", spawn: { x: 4.5 * TILE, y: 3.7 * TILE, dir: "down" } }],
    lights: [
      { x: 4 * TILE, y: 3 * TILE, r: 78, color: "rgba(140,200,255,0.5)", kind: "screen" },
      { x: 18.5 * TILE, y: 7.6 * TILE, r: 66, color: "rgba(255,190,110,0.5)" },
      { x: 8.5 * TILE, y: 3.5 * TILE, r: 54, color: "rgba(170,190,235,0.25)" },
    ],
    darkness: 0.62,
  },

  street: {
    id: "street",
    name: "Street",
    tiles: [
      "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      "bbbbDbbbbbDbbbbbbbbbDbbbbbbbbbbbbbDbbbbb",
      "ssssssssssssssssssssssssssssssssssssssss",
      "ssssssssssssssssssssssssssssssssssssssss",
      "cccccccccccccccccccccccccccccccccccccccc",
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "llllllllllllllllllllllllllllllllllllllll",
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "cccccccccccccccccccccccccccccccccccccccc",
      "ffffffffffffffffffffffffffffffffffffffff",
    ],
    solid: "Bbf",
    surface: (ch) => (ch === "a" || ch === "l" ? "wet" : "stone"),
    outdoors: true,
    things: [
      { id: "bench", body: { x: 8 * TILE, y: 3 * TILE, w: 2 * TILE, h: 10 }, zone: T(8, 3.6, 2, 1) },
      { id: "lamp1", body: { x: 12 * TILE + 6, y: 3 * TILE + 8, w: 4, h: 4 } },
      { id: "cat", body: { x: 15 * TILE + 2, y: 3 * TILE + 6, w: 12, h: 6 }, zone: T(14.5, 3, 2, 1.6) },
      { id: "phone", body: { x: 26 * TILE, y: 3 * TILE, w: TILE, h: 10 }, zone: T(25.5, 3.6, 2, 1) },
      { id: "lamp2", body: { x: 30 * TILE + 6, y: 3 * TILE + 8, w: 4, h: 4 } },
      { id: "lamp3", body: { x: 37 * TILE + 6, y: 9 * TILE + 8, w: 4, h: 4 } },
      { id: "car", body: { x: 22 * TILE, y: 9 * TILE - 2, w: 4 * TILE, h: 18 }, zone: T(22, 8.2, 4, 1) },
      { id: "boombox", body: { x: 17 * TILE + 3, y: 4 * TILE + 6, w: 12, h: 6 }, zone: T(16.6, 4, 1.8, 1.4) },
      // the subway stairs on the far pavement: one stop to the avenue
      { id: "stairs", zone: T(30.2, 9.3, 2.6, 0.7) },
    ],
    doors: [
      { zone: T(4, 2), to: "bedroom", label: "↑ home", spawn: { x: 18.2 * TILE, y: 6.5 * TILE, dir: "left" } },
      { zone: T(20, 2), to: "store", label: "↑ corner store", spawn: { x: 7 * TILE, y: 7.4 * TILE, dir: "up" } },
      { zone: T(34, 2), to: "studio", label: "↑ studio", spawn: { x: 8 * TILE, y: 8.4 * TILE, dir: "up" } },
      { zone: T(10, 2), to: "rooftop", label: "↑ fire escape to the roof", spawn: { x: 1.6 * TILE, y: 5.8 * TILE, dir: "right" } },
      { zone: { x: 0, y: 3 * TILE, w: 6, h: 7 * TILE }, to: "park", label: "← the park", spawn: { x: 28.2 * TILE, y: 6 * TILE, dir: "left" } },
      { zone: { x: 39 * TILE + 10, y: 3 * TILE, w: 6, h: 7 * TILE }, to: "avenue", label: "→ the avenue", spawn: { x: 1.4 * TILE, y: 4.4 * TILE, dir: "right" } },
    ],
    lights: [
      { x: 12.5 * TILE, y: 1.2 * TILE, r: 74, color: "rgba(255,196,120,0.55)", kind: "lamp" },
      { x: 30.5 * TILE, y: 1.2 * TILE, r: 74, color: "rgba(255,196,120,0.5)" },
      { x: 37.5 * TILE, y: 7.2 * TILE, r: 60, color: "rgba(210,220,255,0.4)", kind: "dead" },
      { x: 20 * TILE, y: 2.6 * TILE, r: 96, color: "rgba(210,240,255,0.45)" },
      { x: 34.5 * TILE, y: 1.6 * TILE, r: 36, color: "rgba(255,60,40,0.6)" },
      { x: 3 * TILE, y: 0.8 * TILE, r: 26, color: "rgba(255,200,120,0.4)" },
      { x: 8 * TILE, y: 0.8 * TILE, r: 22, color: "rgba(255,200,120,0.3)" },
      { x: 31.5 * TILE, y: 9.6 * TILE, r: 40, color: "rgba(120,230,160,0.45)" },
    ],
    darkness: 0.74,
  },

  store: {
    id: "store",
    name: "Store",
    tiles: [
      "##############",
      "#wwwwwwwwwwww#",
      "#tttttttttttt#",
      "#tttttttttttt#",
      "#tttttttttttt#",
      "#tttttttttttt#",
      "#tttttttttttt#",
      "#tttttttttttt#",
      "######DD######",
    ],
    solid: "#w",
    surface: () => "tile",
    things: [
      { id: "fridge", body: T(1, 2, 5, 1), zone: T(1, 3, 5, 1) },
      { id: "aisle", body: { x: 2 * TILE, y: 5 * TILE, w: 5 * TILE, h: 12 }, zone: T(2, 6, 5, 1) },
      { id: "counter", body: T(8, 2, 5, 3), zone: T(8, 5, 5, 1) },
    ],
    doors: [{ zone: T(6, 8, 2, 1), to: "street", label: "↓ outside", spawn: { x: 20.5 * TILE, y: 3.7 * TILE, dir: "down" } }],
    lights: [
      { x: 4 * TILE, y: 2.4 * TILE, r: 70, color: "rgba(190,255,240,0.45)" },
      { x: 10.5 * TILE, y: 1.5 * TILE, r: 90, color: "rgba(240,250,255,0.35)" },
      { x: 5 * TILE, y: 5 * TILE, r: 110, color: "rgba(240,250,255,0.2)" },
    ],
    darkness: 0.34,
  },

  studio: {
    id: "studio",
    name: "Studio",
    tiles: [
      "################",
      "#wwwwwwwwwwwwww#",
      "#cccccccccccccc#",
      "#cccccccccccccc#",
      "#cccccccccccccc#",
      "#cccccccccccccc#",
      "#cccccccccccccc#",
      "#cccccccccccccc#",
      "#cccccccccccccc#",
      "#######DD#######",
    ],
    solid: "#w",
    surface: () => "carpet",
    things: [
      { id: "sampler", body: T(5, 2, 6, 1), zone: T(5.5, 3, 5, 1) },
      { id: "couch", body: T(11, 6, 4, 2) },
      { id: "redlamp", body: { x: 2 * TILE + 2, y: 2 * TILE + 6, w: 12, h: 8 } },
    ],
    doors: [{ zone: T(7, 9, 2, 1), to: "street", label: "↓ outside", spawn: { x: 34.5 * TILE, y: 3.7 * TILE, dir: "down" } }],
    lights: [
      { x: 2.5 * TILE, y: 2 * TILE, r: 100, color: "rgba(255,70,50,0.45)" },
      { x: 8 * TILE, y: 2.4 * TILE, r: 84, color: "rgba(255,190,100,0.5)", kind: "screen" },
      { x: 13 * TILE, y: 5.6 * TILE, r: 62, color: "rgba(170,110,255,0.35)" },
    ],
    darkness: 0.52,
  },

  park: {
    id: "park",
    name: "Park",
    tiles: [
      "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
      "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
      "ggggggggggggggggaaaaaaaaaaaagg",
      "ggggggggggggggggaaaaaaaaaaaagg",
      "ggggggggggggggggaaaaaaaaaaaagg",
      "ppppppppppppppppaaaaaaaaaaaapp",
      "ppppppppppppppppaaaaaaaaaaaapp",
      "ggggggggggggggggaaaaaaaaaaaagg",
      "ggggggggggggggggaaaaaaaaaaaagg",
      "gggggggggggggggggggggggggggggg",
      "ffffffffffffffffffffffffffffff",
    ],
    solid: "Tf",
    surface: (ch) => (ch === "a" || ch === "p" ? "stone" : "carpet"),
    outdoors: true,
    things: [
      { id: "park-bench", body: { x: 5 * TILE, y: 2 * TILE + 4, w: 2 * TILE, h: 12 } },
      { id: "swings", body: { x: 9 * TILE, y: 2 * TILE, w: 3 * TILE, h: 10 }, zone: T(9, 2.7, 3, 1) },
      { id: "hoop", body: { x: 26 * TILE + 5, y: 2 * TILE, w: 6, h: 10 }, zone: T(24.5, 2.6, 3, 1.6) },
      { id: "fountain", body: { x: 12 * TILE + 4, y: 8 * TILE + 2, w: 24, h: 12 }, zone: T(12, 7.2, 2, 1) },
    ],
    doors: [{ zone: { x: 29 * TILE + 10, y: 2 * TILE, w: 6, h: 8 * TILE }, to: "street", label: "→ back to the street", spawn: { x: 1.2 * TILE, y: 4.4 * TILE, dir: "right" } }],
    lights: [
      { x: 3 * TILE, y: 1.3 * TILE, r: 70, color: "rgba(255,196,120,0.5)", kind: "lamp" },
      { x: 21 * TILE, y: 2.2 * TILE, r: 96, color: "rgba(220,235,255,0.35)" },
      { x: 14 * TILE, y: 9 * TILE, r: 40, color: "rgba(160,200,255,0.25)" },
    ],
    darkness: 0.72,
  },

  rooftop: {
    id: "rooftop",
    name: "Rooftop",
    tiles: [
      "SSSSSSSSSSSSSSSSSSSS",
      "SSSSSSSSSSSSSSSSSSSS",
      "SSSSSSSSSSSSSSSSSSSS",
      "PPPPPPPPPPPPPPPPPPPP",
      "rrrrrrrrrrrrrrrrrrrP",
      "rrrrrrrrrrrrrrrrrrrP",
      "rrrrrrrrrrrrrrrrrrrP",
      "rrrrrrrrrrrrrrrrrrrP",
      "rrrrrrrrrrrrrrrrrrrP",
      "rrrrrrrrrrrrrrrrrrrP",
      "PPPPPPPPPPPPPPPPPPPP",
    ],
    solid: "SP",
    surface: () => "stone",
    outdoors: true,
    things: [
      { id: "chimney", body: T(4, 4, 2, 1), zone: T(4, 5, 2, 1) },
      { id: "chimes", body: { x: 8 * TILE + 6, y: 4 * TILE + 8, w: 4, h: 6 }, zone: T(7.5, 4.4, 2, 1.4) },
      { id: "tank", body: T(14, 4, 3, 2), zone: T(14, 6, 3, 1) },
      { id: "coop", body: T(16, 8, 3, 1.5), zone: T(15.5, 7, 3.5, 1) },
    ],
    doors: [{ zone: { x: 0, y: 4 * TILE, w: 6, h: 6 * TILE }, to: "street", label: "↓ down the fire escape", spawn: { x: 10.5 * TILE, y: 3.7 * TILE, dir: "down" } }],
    lights: [
      { x: 10 * TILE, y: 1 * TILE, r: 120, color: "rgba(180,200,255,0.3)" },
      { x: 6 * TILE, y: 3.4 * TILE, r: 50, color: "rgba(255,200,140,0.35)" },
      { x: 14 * TILE, y: 3.4 * TILE, r: 50, color: "rgba(255,200,140,0.35)" },
    ],
    darkness: 0.58,
  },

  avenue: AVENUE,
  alley: ALLEY,
  records: RECORDS,
  thrift: THRIFT,
  club: CLUB,
  subway: SUBWAY,
  underpass: UNDERPASS,
};

export const START = { place: "bedroom" as Place, x: 4 * TILE, y: 4.7 * TILE, dir: "up" as Dir };

export const sceneSize = (s: Scene) => ({ w: s.tiles[0].length * TILE, h: s.tiles.length * TILE });

export function tileAt(s: Scene, px: number, py: number): string {
  const row = s.tiles[Math.floor(py / TILE)];
  return row?.[Math.floor(px / TILE)] ?? "#";
}

export const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export const inside = (px: number, py: number, r: Rect) => px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h;

/** Can a body of this rect stand here? */
export function blocked(s: Scene, box: Rect): boolean {
  const { w, h } = sceneSize(s);
  if (box.x < 0 || box.y < 0 || box.x + box.w > w || box.y + box.h > h) return true;
  const pts = [
    [box.x, box.y],
    [box.x + box.w - 0.01, box.y],
    [box.x, box.y + box.h - 0.01],
    [box.x + box.w - 0.01, box.y + box.h - 0.01],
  ];
  for (const [x, y] of pts) if (s.solid.includes(tileAt(s, x, y))) return true;
  return s.things.some((t) => t.body && overlaps(box, t.body));
}

// ------------------------------------------------------------ painting

function paintBedroom(g: G, s: Scene) {
  s.tiles.forEach((row, ty) =>
    [...row].forEach((ch, tx) => {
      const x = tx * TILE;
      const y = ty * TILE;
      if (ch === "#") r(g, x, y, TILE, TILE, "#0d0c10");
      else if (ch === "w") {
        r(g, x, y, TILE, TILE, "#2b2a3a");
        // faded wallpaper stripes
        r(g, x + 3, y, 1, TILE, "#302f40");
        r(g, x + 11, y, 1, TILE, "#302f40");
        if (ty === 2) r(g, x, y + 13, TILE, 3, "#1c1b26");
      } else {
        // floorboards
        r(g, x, y, TILE, TILE, "#3a2a20");
        const off = (ty % 2) * 8;
        r(g, x, y + 15, TILE, 1, "#2b1e17");
        r(g, x + ((off + 5) % 16), y, 1, 15, "#2e2119");
        if (hash(tx, ty) > 0.7) r(g, x + 9, y + 6, 2, 1, "#443126");
      }
    }),
  );
  // door (right wall)
  r(g, 19 * TILE, 5 * TILE - 2, TILE, 2 * TILE + 2, "#1d140f");
  r(g, 19 * TILE + 2, 5 * TILE, 12, 2 * TILE, "#4a3325");
  r(g, 19 * TILE + 4, 6 * TILE, 2, 2, "#c9a96a");

  // window: night, a few lit windows across the way
  const wx = 7 * TILE;
  const wy = TILE + 2;
  r(g, wx - 3, wy - 3, 3 * TILE + 6, 2 * TILE, "#16151c");
  r(g, wx, wy, 3 * TILE, 2 * TILE - 6, "#0f1830");
  r(g, wx, wy + 16, 3 * TILE, 10, "#141a2b");
  for (let i = 0; i < 7; i++) r(g, wx + 4 + i * 6, wy + 18 + (i % 2) * 3, 2, 2, hash(i, 3) > 0.5 ? "#e5b867" : "#2a3350");
  r(g, wx + 34, wy + 4, 5, 5, "#d7dcef");
  r(g, wx + 23, wy, 2, 2 * TILE - 6, "#16151c");
  r(g, wx, wy + 12, 3 * TILE, 2, "#16151c");
  r(g, wx - 4, wy + 2 * TILE - 7, 3 * TILE + 8, 3, "#4a4150");

  // desk + laptop
  const dx = 2 * TILE;
  const dy = 3 * TILE;
  r(g, dx, dy - 6, 4 * TILE, 12, "#4d3526");
  r(g, dx, dy + 6, 4 * TILE, 3, "#2f2017");
  r(g, dx + 2, dy + 9, 3, 7, "#2f2017");
  r(g, dx + 4 * TILE - 5, dy + 9, 3, 7, "#2f2017");
  // laptop, open, screen facing the chair
  r(g, dx + 20, dy - 20, 24, 15, "#16171b");
  r(g, dx + 22, dy - 18, 20, 11, "#8fd0ff");
  r(g, dx + 22, dy - 18, 20, 2, "#6e1f18");
  r(g, dx + 24, dy - 14, 3, 3, "#e4b95a");
  r(g, dx + 18, dy - 5, 28, 3, "#2a2c31");
  // speakers, a mug, headphones
  r(g, dx + 4, dy - 16, 9, 12, "#141417");
  r(g, dx + 6, dy - 11, 5, 5, "#26262b");
  r(g, dx + 51, dy - 16, 9, 12, "#141417");
  r(g, dx + 53, dy - 11, 5, 5, "#26262b");
  r(g, dx + 48, dy - 6, 3, 4, "#8e3a2b");

  // tape shelf (tapes painted dynamically, they're your saves)
  const sx = 11 * TILE;
  r(g, sx, 3 * TILE - 14, 2 * TILE, 30, "#3b2a1f");
  r(g, sx + 2, 3 * TILE - 12, 2 * TILE - 4, 11, "#1c140f");
  r(g, sx + 2, 3 * TILE + 1, 2 * TILE - 4, 11, "#1c140f");

  // bed
  const bx = 15 * TILE;
  const by = 3 * TILE;
  r(g, bx, by - 4, 4 * TILE, 3 * TILE + 4, "#211a1f");
  r(g, bx + 2, by - 2, 4 * TILE - 4, 14, "#c9c2b3");
  r(g, bx + 2, by + 12, 4 * TILE - 4, 3 * TILE - 16, "#3c3552");
  r(g, bx + 2, by + 12, 4 * TILE - 4, 2, "#4a4265");
  for (let i = 0; i < 5; i++) r(g, bx + 6 + i * 11, by + 20 + (i % 2) * 8, 6, 1, "#332d47");

  // rug
  r(g, 7 * TILE, 6 * TILE, 5 * TILE, 3 * TILE, "#4a1d1b");
  r(g, 7 * TILE + 3, 6 * TILE + 3, 5 * TILE - 6, 3 * TILE - 6, "#5d2622");
  for (let i = 0; i < 9; i++) r(g, 7 * TILE + 6 + i * 8, 7 * TILE + 6, 4, 4, "#6e3a2a");

  // record crate + floor lamp
  r(g, TILE, 8 * TILE - 4, 2 * TILE, 18, "#5a4330");
  for (let i = 0; i < 8; i++) r(g, TILE + 3 + i * 3.5, 8 * TILE - 10, 2, 8, ["#1b1b1b", "#6e1f18", "#2c3e50", "#c9c2b3"][i % 4]);
  r(g, 18 * TILE + 6, 7 * TILE, 3, 30, "#222");
  r(g, 18 * TILE + 1, 7 * TILE - 8, 13, 9, "#d9a760");
}

function paintStreet(g: G, s: Scene) {
  paintGround(g, s);
  // puddles
  [
    [7, 6.4],
    [22, 8.2],
    [31, 6.6],
  ].forEach(([px, py]) => {
    r(g, px * TILE, py * TILE, 22, 4, "#262a3a");
    r(g, px * TILE + 3, py * TILE + 1, 12, 1, "#3a4260");
  });

  // apartment block (x 0..11): brick, a few lit windows upstairs
  for (let ty = 0; ty < 3; ty++)
    for (let tx = 0; tx < 12; tx++) {
      const x = tx * TILE;
      const y = ty * TILE;
      r(g, x, y, TILE, TILE, "#3a1f1c");
      for (let k = 0; k < 4; k++) r(g, x, y + k * 4 + 3, TILE, 1, "#2c1614");
      r(g, x + ((ty * 4 + tx) % 2) * 8, y, 1, TILE, "#2c1614");
    }
  [1, 3, 6, 8, 10].forEach((tx, i) => {
    r(g, tx * TILE + 2, 4, 11, 14, "#12121a");
    if (i === 0 || i === 3) r(g, tx * TILE + 3, 5, 9, 12, "#d9a05a");
  });
  r(g, 4 * TILE + 1, 2 * TILE - 4, 14, TILE + 4, "#1c120e");
  r(g, 4 * TILE + 3, 2 * TILE - 2, 10, TILE + 2, "#3b2418");
  r(g, 4 * TILE, 2 * TILE - 7, TILE, 3, "#555");

  // the store (x 12..27): storefront glass, a plain sign
  for (let tx = 12; tx < 28; tx++) {
    r(g, tx * TILE, 0, TILE, 3 * TILE, "#2a2d33");
    r(g, tx * TILE, 18, TILE, 2, "#1d1f24");
  }
  r(g, 14 * TILE, 4, 12 * TILE, 12, "#15161a");
  // the sign just says what it is
  g.fillStyle = "#cfe8ff";
  g.font = "8px monospace";
  g.textBaseline = "top";
  g.fillText("OPEN 24 HRS", 18 * TILE + 6, 6);
  [16, 21].forEach((tx) => {
    r(g, tx * TILE, 22, 3 * TILE + 8, 24, "#aac7c9");
    r(g, tx * TILE + 2, 24, 3 * TILE + 4, 20, "#d8ecec");
    for (let k = 0; k < 6; k++) r(g, tx * TILE + 5 + k * 8, 34, 5, 8, ["#6e1f18", "#e4b95a", "#4f7d99", "#8fb37a"][k % 4]);
    r(g, tx * TILE + 2, 30, 3 * TILE + 4, 1, "#8ea8aa");
  });
  r(g, 20 * TILE + 1, 2 * TILE - 6, 14, TILE + 6, "#8fb0b2");
  r(g, 20 * TILE + 3, 2 * TILE - 4, 10, TILE + 4, "#cfe3e3");

  // the studio building (x 28..39): bare concrete, basement door, red bulb
  for (let tx = 28; tx < 40; tx++)
    for (let ty = 0; ty < 3; ty++) {
      r(g, tx * TILE, ty * TILE, TILE, TILE, "#26272b");
      if (hash(tx, ty + 9) > 0.75) r(g, tx * TILE + 4, ty * TILE + 5, 5, 3, "#2c2d31");
    }
  r(g, 28 * TILE, 0, 1, 3 * TILE, "#1b1c1f");
  r(g, 34 * TILE + 1, 2 * TILE - 8, 14, TILE + 8, "#101012");
  r(g, 34 * TILE + 3, 2 * TILE - 6, 10, TILE + 6, "#1e1f24");
  r(g, 34 * TILE + 6, 2 * TILE - 14, 4, 4, "#ff4a36");
  r(g, 31 * TILE, 26, 20, 8, "#141418");
  r(g, 37 * TILE, 26, 20, 8, "#141418");

  // bench
  r(g, 8 * TILE, 3 * TILE + 2, 2 * TILE, 4, "#5a4330");
  r(g, 8 * TILE, 3 * TILE - 6, 2 * TILE, 3, "#5a4330");
  r(g, 8 * TILE + 2, 3 * TILE + 6, 2, 5, "#222");
  r(g, 10 * TILE - 4, 3 * TILE + 6, 2, 5, "#222");

  // payphone
  r(g, 26 * TILE + 2, 2 * TILE + 2, 12, 22, "#3a4a58");
  r(g, 26 * TILE + 4, 2 * TILE + 6, 8, 8, "#1a2028");
  r(g, 26 * TILE + 5, 2 * TILE + 15, 3, 7, "#111");
  r(g, 26 * TILE + 3, 2 * TILE + 2, 10, 2, "#6f8596");

  // fire escape up the apartment block
  r(g, 10 * TILE + 2, 0, 2, 3 * TILE, "#55565c");
  r(g, 10 * TILE + 12, 0, 2, 3 * TILE, "#55565c");
  for (let y = 3; y < 3 * TILE; y += 5) r(g, 10 * TILE + 2, y, 12, 1, "#6c6d73");
  r(g, 9 * TILE, 8, 3 * TILE, 2, "#46474d");

  // parked car, on the far side
  const cx = 22 * TILE;
  const cy = 8 * TILE + 12;
  r(g, cx + 8, cy, 40, 10, "#2d3a44");
  r(g, cx + 12, cy + 2, 14, 7, "#1a2229");
  r(g, cx + 29, cy + 2, 14, 7, "#1a2229");
  r(g, cx, cy + 9, 64, 12, "#34434f");
  r(g, cx + 6, cy + 19, 10, 5, "#0b0b0d");
  r(g, cx + 46, cy + 19, 10, 5, "#0b0b0d");
  r(g, cx, cy + 12, 3, 3, "#b33");

  // subway stairs, going down through the railings on the far pavement
  const sx = 30 * TILE + 4;
  const sy = 9 * TILE + 8;
  r(g, sx, sy, 3 * TILE - 8, 2 * TILE - 8, "#0b0c10");
  for (let k = 0; k < 5; k++) r(g, sx + 2, sy + 3 + k * 4, 3 * TILE - 12, 2, k % 2 ? "#26282e" : "#33363d");
  r(g, sx - 2, sy - 2, 2, 2 * TILE - 6, "#6a7a70");
  r(g, sx + 3 * TILE - 8, sy - 2, 2, 2 * TILE - 6, "#6a7a70");
  r(g, sx - 2, sy - 2, 3 * TILE - 4, 1, "#7f9187");
  // the green globe and a little sign
  r(g, sx + 3 * TILE - 7, sy - 9, 3, 7, "#3a3c42");
  r(g, sx + 3 * TILE - 9, sy - 13, 6, 5, "#7fe0a0");
  r(g, sx + 6, sy - 7, 22, 5, "#1d4a30");
  g.fillStyle = "#e8f0e8";
  g.font = "5px monospace";
  g.textBaseline = "top";
  g.fillText("SUBWAY", sx + 7, sy - 7);
}

function paintPark(g: G, s: Scene) {
  s.tiles.forEach((row, ty) =>
    [...row].forEach((ch, tx) => {
      const x = tx * TILE;
      const y = ty * TILE;
      const n = hash(tx + 50, ty);
      if (ch === "T") {
        r(g, x, y, TILE, TILE, "#0c1510");
        r(g, x + (n > 0.5 ? 2 : 6), y + (ty === 0 ? 3 : 1), 10, 9, n > 0.4 ? "#142519" : "#10201a");
        if (ty === 1 && tx % 3 === 1) r(g, x + 7, y + 8, 3, 8, "#241810");
      } else if (ch === "g") {
        r(g, x, y, TILE, TILE, "#1b2718");
        if (n > 0.55) r(g, x + Math.floor(n * 11), y + Math.floor(n * 13), 1, 2, "#2a3a22");
        if (n > 0.8) r(g, x + 3, y + 5, 1, 2, "#314528");
      } else if (ch === "p") {
        r(g, x, y, TILE, TILE, "#3a3528");
        if (n > 0.6) r(g, x + Math.floor(n * 12), y + Math.floor(n * 10), 2, 1, "#4a4434");
      } else if (ch === "a") {
        r(g, x, y, TILE, TILE, "#23282f");
        if (n > 0.7) r(g, x + 4, y + 9, 2, 1, "#2a3038");
      } else if (ch === "f") {
        r(g, x, y, TILE, TILE, "#0e0f12");
        r(g, x, y + 2, TILE, 2, "#2c2e33");
        for (let k = 1; k < TILE; k += 4) r(g, x + k, y, 1, TILE, "#24262b");
      }
    }),
  );
  // court lines
  const line = "rgba(201,194,179,0.45)";
  r(g, 16 * TILE + 4, 2 * TILE + 4, 12 * TILE - 8, 1, line);
  r(g, 16 * TILE + 4, 9 * TILE - 5, 12 * TILE - 8, 1, line);
  r(g, 16 * TILE + 4, 2 * TILE + 4, 1, 7 * TILE - 8, line);
  r(g, 23 * TILE, 3 * TILE, 1, 3 * TILE, line);
  r(g, 23 * TILE, 3 * TILE, 5 * TILE - 4, 1, line);
  r(g, 23 * TILE, 6 * TILE, 5 * TILE - 4, 1, line);
  for (let a = 0; a < 20; a++) {
    const ang = (a / 20) * Math.PI * 2;
    r(g, Math.round(20 * TILE + Math.cos(ang) * 18), Math.round(5.5 * TILE + Math.sin(ang) * 18), 1, 1, line);
  }
  // hoop: pole, backboard, rim
  r(g, 26 * TILE + 6, 1 * TILE, 4, 2 * TILE, "#5c5f66");
  r(g, 25 * TILE + 8, 0.5 * TILE, 22, 14, "#d9d4c8");
  r(g, 25 * TILE + 13, 0.5 * TILE + 5, 12, 7, "#8e2b1f");
  r(g, 25 * TILE + 14, 0.5 * TILE + 6, 10, 5, "#d9d4c8");
  r(g, 25 * TILE + 12, 1.5 * TILE, 14, 2, "#e0662a");
  for (let k = 0; k < 4; k++) r(g, 25 * TILE + 13 + k * 3, 1.5 * TILE + 2, 1, 5, "#c9c2b3");
  // bench
  r(g, 5 * TILE, 2 * TILE + 4, 2 * TILE, 3, "#5a4330");
  r(g, 5 * TILE, 2 * TILE + 10, 2 * TILE, 4, "#6a5038");
  r(g, 5 * TILE + 2, 2 * TILE + 14, 2, 4, "#222");
  r(g, 7 * TILE - 4, 2 * TILE + 14, 2, 4, "#222");
  // swings
  r(g, 9 * TILE, 1 * TILE + 4, 2, 2 * TILE - 2, "#4a4d55");
  r(g, 12 * TILE - 2, 1 * TILE + 4, 2, 2 * TILE - 2, "#4a4d55");
  r(g, 9 * TILE, 1 * TILE + 4, 3 * TILE, 2, "#5c5f66");
  for (const sx of [9.6, 10.9]) {
    r(g, sx * TILE, 1 * TILE + 6, 1, 18, "#8a8d94");
    r(g, sx * TILE + 8, 1 * TILE + 6, 1, 18, "#8a8d94");
    r(g, sx * TILE - 1, 1 * TILE + 24, 11, 3, "#6e1f18");
  }
  // fountain
  r(g, 12 * TILE + 2, 8 * TILE, 28, 14, "#5a5a60");
  r(g, 12 * TILE + 5, 8 * TILE + 3, 22, 8, "#26324a");
  r(g, 12 * TILE + 8, 8 * TILE + 5, 6, 1, "#4d6590");
  // trash can
  r(g, 15 * TILE, 2 * TILE + 2, 10, 13, "#2f3a33");
  r(g, 15 * TILE - 1, 2 * TILE + 1, 12, 2, "#3f4a43");
}

/** The dark windows across the way from the roof, for lighting up. */
let skyline: [number, number][] | null = null;
export function skylineWindows(): [number, number][] {
  if (skyline) return skyline;
  const { w } = sceneSize(SCENES.rooftop);
  const out: [number, number][] = [];
  let x = 0;
  let i = 0;
  while (x < w) {
    const bw = 10 + Math.floor(hash(i, 1) * 22);
    const bh = 10 + Math.floor(hash(i, 2) * 26);
    for (let wy = 3 * TILE - bh + 3; wy < 3 * TILE - 2; wy += 5) for (let wx = x + 2; wx < x + bw - 2; wx += 4) if (hash(wx, wy) <= 0.8 && hash(wx, wy) > 0.45) out.push([wx, wy]);
    x += bw + 1;
    i++;
  }
  skyline = out;
  return out;
}

function paintRooftop(g: G, s: Scene) {
  const { w } = sceneSize(s);
  // sky and the city across
  const sky = g.createLinearGradient(0, 0, 0, 3 * TILE);
  sky.addColorStop(0, "#070b1c");
  sky.addColorStop(1, "#1c2442");
  g.fillStyle = sky;
  g.fillRect(0, 0, w, 3 * TILE);
  for (let i = 0; i < 40; i++) r(g, Math.floor(hash(i, 3) * w), Math.floor(hash(i, 7) * 26), 1, 1, hash(i, 9) > 0.6 ? "#c9d2ef" : "#5b6690");
  r(g, 15 * TILE, 6, 9, 9, "#dfe5f5");
  r(g, 15 * TILE + 2, 8, 2, 2, "#c3cbe2");
  let x = 0;
  let i = 0;
  while (x < w) {
    const bw = 10 + Math.floor(hash(i, 1) * 22);
    const bh = 10 + Math.floor(hash(i, 2) * 26);
    r(g, x, 3 * TILE - bh, bw, bh, i % 2 ? "#0a0d18" : "#0d111e");
    for (let wy = 3 * TILE - bh + 3; wy < 3 * TILE - 2; wy += 5)
      for (let wx = x + 2; wx < x + bw - 2; wx += 4) if (hash(wx, wy) > 0.8) r(g, wx, wy, 1, 2, hash(wx + 1, wy) > 0.5 ? "#e0b060" : "#8fa6d0");
    if (hash(i, 5) > 0.75) {
      r(g, x + Math.floor(bw / 2), 3 * TILE - bh - 8, 1, 8, "#0a0d18");
      r(g, x + Math.floor(bw / 2), 3 * TILE - bh - 9, 1, 1, "#ff4a36");
    }
    x += bw + 1;
    i++;
  }
  s.tiles.forEach((row, ty) =>
    [...row].forEach((ch, tx) => {
      const px = tx * TILE;
      const py = ty * TILE;
      if (ch === "r") {
        r(g, px, py, TILE, TILE, "#1f1f23");
        const n = hash(tx + 90, ty);
        for (let k = 0; k < 4; k++) r(g, px + Math.floor(hash(tx + k, ty) * 15), py + Math.floor(hash(tx, ty + k) * 15), 1, 1, n > 0.5 ? "#2b2b30" : "#18181b");
        if (ty % 3 === 0) r(g, px, py + 15, TILE, 1, "#18181b");
      } else if (ch === "P") {
        r(g, px, py, TILE, TILE, "#3a3a41");
        r(g, px, py, TILE, 3, "#55555d");
        r(g, px + (tx % 2) * 8, py + 7, 1, 9, "#2c2c32");
      }
    }),
  );
  // the ladder up from the fire escape
  r(g, 2, 4 * TILE + 8, 2, 2 * TILE + 8, "#6c6d73");
  r(g, 12, 4 * TILE + 8, 2, 2 * TILE + 8, "#6c6d73");
  // chimney
  r(g, 4 * TILE, 3 * TILE, 2 * TILE, 2 * TILE, "#4a2420");
  for (let yy = 0; yy < 4; yy++) r(g, 4 * TILE, 3 * TILE + yy * 8, 2 * TILE, 1, "#321816");
  r(g, 4 * TILE - 2, 3 * TILE - 3, 2 * TILE + 4, 4, "#5b5b62");
  // antenna, chimes hanging off it
  r(g, 8 * TILE + 7, 1 * TILE, 2, 3.8 * TILE, "#6c6d73");
  r(g, 8 * TILE + 1, 1.4 * TILE, 14, 1, "#6c6d73");
  // water tank on its legs
  r(g, 14 * TILE + 3, 4 * TILE, 2, 2 * TILE, "#2a2a2e");
  r(g, 17 * TILE - 5, 4 * TILE, 2, 2 * TILE, "#2a2a2e");
  r(g, 14 * TILE, 1.6 * TILE, 3 * TILE, 2.6 * TILE, "#4a3526");
  for (let k = 0; k < 5; k++) r(g, 14 * TILE, 1.6 * TILE + 6 + k * 8, 3 * TILE, 1, "#2c1f16");
  r(g, 14 * TILE - 2, 1.6 * TILE - 4, 3 * TILE + 4, 5, "#3a2a1e");
  // pigeon coop
  r(g, 16 * TILE, 7.6 * TILE, 3 * TILE, 1.9 * TILE, "#4f3a28");
  for (let k = 0; k < 6; k++) r(g, 16 * TILE + 3 + k * 7, 7.6 * TILE + 5, 1, 1.9 * TILE - 8, "#8a8d94");
  r(g, 16 * TILE, 7.6 * TILE + 5, 3 * TILE, 1, "#8a8d94");
  // string lights along the ledge
  for (let k = 0; k < 14; k++) r(g, 2 * TILE + k * 14, 3 * TILE + 6 + (k % 2), 2, 2, k % 3 ? "#f2c47a" : "#f08a5a");
}

function paintStore(g: G, s: Scene) {
  s.tiles.forEach((row, ty) =>
    [...row].forEach((ch, tx) => {
      const x = tx * TILE;
      const y = ty * TILE;
      if (ch === "#") r(g, x, y, TILE, TILE, "#101216");
      else if (ch === "w") {
        r(g, x, y, TILE, TILE, "#b9bdb3");
        r(g, x, y + 12, TILE, 4, "#8d9188");
      } else {
        r(g, x, y, TILE, TILE, (tx + ty) % 2 ? "#cfd2c6" : "#b9bcb0");
      }
    }),
  );
  r(g, 6 * TILE, 8 * TILE, 2 * TILE, TILE, "#a9c4c6");
  // fridges along the back
  for (let i = 0; i < 5; i++) {
    const x = (1 + i) * TILE;
    r(g, x, TILE, TILE, 2 * TILE, "#dfe6e6");
    r(g, x + 2, TILE + 2, 12, 2 * TILE - 6, "#a7d8d6");
    for (let k = 0; k < 3; k++) for (let j = 0; j < 3; j++) r(g, x + 3 + j * 4, TILE + 5 + k * 8, 2, 5, ["#7a2a22", "#e4b95a", "#4f7d99", "#8fb37a"][(i + k + j) % 4]);
    r(g, x, 3 * TILE - 2, TILE, 2, "#8d9188");
  }
  // aisle
  r(g, 2 * TILE, 5 * TILE - 8, 5 * TILE, 20, "#6f6a60");
  for (let i = 0; i < 18; i++) r(g, 2 * TILE + 2 + i * 4.3, 5 * TILE - 6 + (i % 3) * 5, 3, 4, ["#b33", "#e4b95a", "#4f7d99", "#ddd", "#8fb37a"][i % 5]);
  // counter
  r(g, 8 * TILE, 4 * TILE - 2, 5 * TILE, 18, "#5b4637");
  r(g, 8 * TILE, 4 * TILE - 4, 5 * TILE, 3, "#7a604c");
  r(g, 8 * TILE, 2 * TILE, 1, 2 * TILE, "#8d9188");
  // register + a small radio
  r(g, 10 * TILE, 4 * TILE - 12, 12, 9, "#2a2c31");
  r(g, 10 * TILE + 2, 4 * TILE - 10, 8, 3, "#7fd07f");
  r(g, 12 * TILE - 2, 4 * TILE - 9, 12, 6, "#3a3025");
  r(g, 12 * TILE, 4 * TILE - 8, 3, 3, "#1a1a1a");
  // shelf of bottles behind
  r(g, 9 * TILE, TILE + 4, 4 * TILE, 3, "#5b4637");
  for (let i = 0; i < 12; i++) r(g, 9 * TILE + 2 + i * 5, TILE - 4, 3, 8, ["#6b3f1e", "#2f5a3a", "#8a7a4a"][i % 3]);
}

function paintStudio(g: G, s: Scene) {
  s.tiles.forEach((row, ty) =>
    [...row].forEach((ch, tx) => {
      const x = tx * TILE;
      const y = ty * TILE;
      if (ch === "#") r(g, x, y, TILE, TILE, "#0c0b0e");
      else if (ch === "w") {
        r(g, x, y, TILE, TILE, "#1f1d22");
        // foam panels
        if (tx % 3 !== 0) {
          r(g, x + 2, y + 2, 12, 12, "#2a262c");
          r(g, x + 4, y + 4, 2, 8, "#241f26");
          r(g, x + 9, y + 4, 2, 8, "#241f26");
        }
      } else {
        r(g, x, y, TILE, TILE, "#2b2530");
        if (hash(tx, ty) > 0.6) r(g, x + 5, y + 9, 1, 1, "#352d3a");
      }
    }),
  );
  r(g, 7 * TILE, 9 * TILE, 2 * TILE, TILE, "#1a1719");
  // rug
  r(g, 4 * TILE, 4 * TILE, 8 * TILE, 4 * TILE, "#3a2224");
  r(g, 4 * TILE + 3, 4 * TILE + 3, 8 * TILE - 6, 4 * TILE - 6, "#452a2b");
  // the desk with the sampler and monitors
  r(g, 5 * TILE, 2 * TILE - 6, 6 * TILE, 14, "#3b2d24");
  r(g, 5 * TILE, 2 * TILE + 8, 6 * TILE, 3, "#241b16");
  r(g, 5 * TILE + 2, 2 * TILE - 22, 10, 16, "#141417");
  r(g, 5 * TILE + 4, 2 * TILE - 15, 6, 6, "#26262b");
  r(g, 11 * TILE - 12, 2 * TILE - 22, 10, 16, "#141417");
  r(g, 11 * TILE - 10, 2 * TILE - 15, 6, 6, "#26262b");
  // the sampler: 4 × 4 pads and a small amber screen
  const mx = 7 * TILE - 2;
  const my = 2 * TILE - 8;
  r(g, mx, my, 36, 14, "#2c2a28");
  r(g, mx + 2, my + 2, 12, 5, "#f2b45a");
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) r(g, mx + 17 + i * 4.5, my + 2 + j * 5, 3.5, 4, "#4a4540");
  // couch
  r(g, 11 * TILE, 6 * TILE - 2, 4 * TILE, 2 * TILE + 2, "#2d3a3a");
  r(g, 11 * TILE + 3, 6 * TILE + 8, 4 * TILE - 6, 2 * TILE - 12, "#3a4a4a");
  r(g, 11 * TILE, 6 * TILE - 2, 4 * TILE, 4, "#243030");
  // red lamp
  r(g, 2 * TILE + 5, 2 * TILE - 10, 6, 22, "#222");
  r(g, 2 * TILE + 1, 2 * TILE - 16, 14, 8, "#a3281c");
}

export function paintPlace(s: Scene): HTMLCanvasElement {
  const { w, h } = sceneSize(s);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  const own: Partial<Record<Place, (g: G, s: Scene) => void>> = { bedroom: paintBedroom, street: paintStreet, store: paintStore, studio: paintStudio, park: paintPark, rooftop: paintRooftop };
  (own[s.id] ?? s.paint)?.(g, s);
  return c;
}

/** Parts that stand in front of whoever walks behind them. */
export function paintForeground(g: G, s: Scene) {
  if (s.id === "park") lampPole(g, 2.5 * TILE, 3 * TILE);
  if (s.id === "street") {
    lampPole(g, 12 * TILE, 3 * TILE);
    lampPole(g, 30 * TILE, 3 * TILE);
    lampPole(g, 37 * TILE, 9 * TILE);
  }
}
