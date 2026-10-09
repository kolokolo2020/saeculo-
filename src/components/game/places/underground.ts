import { bricks, hash, r, sign, T, TILE, type Fx, type G, type Light, type Scene } from "./kit";

// The rougher end: the alley behind the avenue (a fire in a barrel, a dice
// game, a wall that wants your name), the subway platform (trains that
// come and go), and the underpass where the cypher is and Tank holds court.

// ------------------------------------------------------------ the alley

function paintAlley(g: G, s: Scene) {
  s.tiles.forEach((row, ty) =>
    [...row].forEach((ch, tx) => {
      const x = tx * TILE;
      const y = ty * TILE;
      if (ch === "#") r(g, x, y, TILE, TILE, "#0b0b0e");
      else if (ch === "g" || ch === "D") {
        r(g, x, y, TILE, TILE, "#1b1c21");
        const n = hash(tx + 7, ty);
        if (n > 0.6) r(g, x + Math.floor(n * 12), y + Math.floor(n * 10), 3, 1, "#24252b");
        if (n < 0.08) r(g, x + 4, y + 6, 6, 3, "#262a3a");
      }
    }),
  );
  bricks(g, 0, 0, 24 * TILE, 2 * TILE, "#3a201c", "#2a1512");
  // old graffiti, faded
  const tags: [number, string][] = [
    [2, "#4a6a8a"],
    [9, "#6a4a7a"],
    [20, "#5a7a4a"],
  ];
  for (const [x, c] of tags) {
    for (let k = 0; k < 7; k++) r(g, x * TILE + k * 4, 10 + Math.round(Math.sin(k * 1.7) * 3), 3, 8 + (k % 3) * 2, c);
  }
  // the blank stretch you can tag
  r(g, 14 * TILE, 4, 4 * TILE, 2 * TILE - 8, "#4a2a24");
  bricks(g, 14 * TILE, 4, 4 * TILE, 2 * TILE - 8, "#4a2a24", "#3a201c");
  // the club's back door and its bulb
  r(g, 6 * TILE + 1, TILE - 4, 14, TILE + 4, "#14141a");
  r(g, 6 * TILE + 3, TILE - 2, 10, TILE + 2, "#26262e");
  sign(g, "STAFF", 6 * TILE + 1, TILE - 12, "#9a9aa4", undefined, 6);
  r(g, 6 * TILE + 6, TILE - 16, 4, 3, "#f0e0a0");
  // dumpsters
  r(g, TILE, 2 * TILE - 6, 3 * TILE, 20, "#24402e");
  r(g, TILE, 2 * TILE - 8, 3 * TILE, 3, "#2f5a3e");
  r(g, TILE + 4, 2 * TILE + 2, 12, 3, "#1a2e22");
  r(g, 2.5 * TILE, 2 * TILE + 2, 12, 3, "#1a2e22");
  // crates
  r(g, 21 * TILE, 2 * TILE - 4, 2 * TILE, 2 * TILE, "#5a4330");
  for (let k = 0; k < 4; k++) r(g, 21 * TILE, 2 * TILE + k * 8, 2 * TILE, 1, "#3a2a1e");
  // the barrel
  r(g, 8 * TILE + 2, 5 * TILE - 4, 12, 12, "#3a3c42");
  r(g, 8 * TILE + 2, 5 * TILE, 12, 1, "#24262b");
  r(g, 8 * TILE + 2, 5 * TILE + 4, 12, 1, "#24262b");
  // the dice spot: cardboard on the ground
  r(g, 18.6 * TILE, 6.6 * TILE, 26, 12, "#6a5038");
  r(g, 18.6 * TILE + 2, 6.6 * TILE + 2, 22, 8, "#7a6048");
  r(g, 11 * TILE, 9 * TILE, 2 * TILE, TILE, "#16161a");
}

function fxAlley(g: G, f: Fx) {
  // fire in the barrel
  const x = 8 * TILE + 3;
  const y = 5 * TILE - 5;
  for (let k = 0; k < 5; k++) {
    const h = f.reduced ? 4 : 3 + Math.round((Math.sin(f.t * 9 + k * 1.7) + 1) * 2.5);
    r(g, x + k * 2, y - h, 2, h, k % 2 ? "#ff9a3a" : "#ffd27a");
  }
  // the dice, still or tumbling
  const rolling = (f.state.diceRoll ?? 0) > 0;
  const off = rolling && !f.reduced ? Math.round(Math.sin(f.t * 30) * 2) : 0;
  r(g, 19.2 * TILE + off, 6.8 * TILE, 4, 4, "#ece8de");
  r(g, 19.6 * TILE - off, 6.9 * TILE, 4, 4, "#ece8de");
  r(g, 19.2 * TILE + 1 + off, 6.8 * TILE + 1, 1, 1, "#111");
  r(g, 19.6 * TILE + 2 - off, 6.9 * TILE + 2, 1, 1, "#111");
}

function lightsAlley(f: Fx): Light[] {
  const flick = f.reduced ? 0 : Math.sin(f.t * 11) * 6 + Math.sin(f.t * 23) * 3;
  return [{ x: 8.5 * TILE, y: 4.6 * TILE, r: 70 + flick, color: "rgba(255,140,50,0.6)" }];
}

export const ALLEY: Scene = {
  id: "alley",
  name: "The alley",
  tiles: ["WWWWWWWWWWWWWWWWWWWWWWWW", "WWWWWWWWWWWWWWWWWWWWWWWW", "#gggggggggggggggggggggg#", "#gggggggggggggggggggggg#", "#gggggggggggggggggggggg#", "#gggggggggggggggggggggg#", "#gggggggggggggggggggggg#", "#gggggggggggggggggggggg#", "#gggggggggggggggggggggg#", "###########DD###########"],
  solid: "W#",
  surface: () => "grit",
  outdoors: true,
  things: [
    { id: "dumpster", body: { x: TILE, y: 2 * TILE - 6, w: 3 * TILE, h: 20 }, zone: T(1, 3, 3, 0.9) },
    { id: "barrel", body: { x: 8 * TILE + 2, y: 5 * TILE - 2, w: 12, h: 9 }, zone: T(7.5, 5.4, 2, 1) },
    { id: "wall", zone: T(14, 2, 4, 1) },
    { id: "back-door", zone: T(6, 2, 1, 0.8) },
    { id: "crates-alley", body: T(21, 2, 2, 1.8) },
  ],
  doors: [{ zone: T(11, 9, 2, 1), to: "avenue", label: "↓ the avenue", spawn: { x: 11.5 * TILE, y: 3.7 * TILE, dir: "down" } }],
  lights: [
    { x: 6.5 * TILE, y: 0.6 * TILE, r: 54, color: "rgba(255,230,160,0.45)", kind: "lamp" },
    { x: 19.5 * TILE, y: 6.5 * TILE, r: 40, color: "rgba(140,200,255,0.25)" },
  ],
  darkness: 0.78,
  paint: paintAlley,
  fx: fxAlley,
  liveLights: lightsAlley,
};

// ------------------------------------------------------------ the subway

/** Where the train is: x of its nose, and whether its doors are open. */
export function trainAt(t: number): { x: number; open: boolean; here: boolean; arriving: boolean } {
  const P = 34;
  const k = t % P;
  const W = 32 * TILE;
  // in from the right, stop, out to the left, gone
  if (k < 4) {
    const e = 1 - Math.pow(1 - k / 4, 2);
    return { x: W + 40 - e * (W - 2 * TILE + 40), open: false, here: true, arriving: true };
  }
  if (k < 12) return { x: 2 * TILE, open: k > 4.6 && k < 11.4, here: true, arriving: false };
  if (k < 15) {
    const e = Math.pow((k - 12) / 3, 2);
    return { x: 2 * TILE - e * (W + 40), open: false, here: true, arriving: false };
  }
  return { x: -9999, open: false, here: false, arriving: k > P - 3 };
}

function paintSubway(g: G, s: Scene) {
  s.tiles.forEach((row, ty) =>
    [...row].forEach((ch, tx) => {
      const x = tx * TILE;
      const y = ty * TILE;
      if (ch === "W") {
        r(g, x, y, TILE, TILE, "#c9cfc8");
        r(g, x, y + 7, TILE, 1, "#aab2aa");
        r(g, x, y + 15, TILE, 1, "#aab2aa");
        r(g, x + 7, y, 1, TILE, "#aab2aa");
        if (ty === 1) r(g, x, y + 10, TILE, 3, "#2f6b4a");
      } else if (ch === "S") {
        r(g, x, y, TILE, TILE, "#55565c");
        for (let k = 0; k < 4; k++) r(g, x, y + k * 4, TILE, 2, "#3a3b40");
      } else if (ch === "p") {
        r(g, x, y, TILE, TILE, "#5a5a5e");
        r(g, x, y + 15, TILE, 1, "#4c4c50");
        r(g, x + 15, y, 1, TILE, "#4c4c50");
        if (hash(tx, ty + 70) > 0.85) r(g, x + 4, y + 9, 3, 2, "#3a3a3e");
      } else if (ch === "y") {
        r(g, x, y, TILE, TILE, "#5a5a5e");
        r(g, x, y + 8, TILE, 6, "#d8b030");
        for (let k = 0; k < 4; k++) r(g, x + k * 4 + 1, y + 9, 2, 4, "#b89020");
        r(g, x, y + 14, TILE, 2, "#2a2a2e");
      } else if (ch === "r") {
        r(g, x, y, TILE, TILE, "#141416");
        r(g, x, y + 3, TILE, 2, "#5a5d66");
        r(g, x, y + 11, TILE, 2, "#5a5d66");
        for (let k = 0; k < 2; k++) r(g, x + k * 8 + 2, y + 1, 4, 14, "#2a2220");
      }
    }),
  );
  sign(g, "AVENUE", 4 * TILE + 4, TILE + 11, "#ffffff", undefined, 7);
  sign(g, "AVENUE", 24 * TILE + 4, TILE + 11, "#ffffff", undefined, 7);
  // the album, on a poster
  const px = 16 * TILE;
  r(g, px - 2, 2, 2 * TILE + 4, TILE + 10, "#e8e8e8");
  r(g, px, 4, 2 * TILE, TILE + 6, "#05060f");
  for (let k = 0; k < 9; k++) r(g, px + 3 + k * 3, 14 - (k % 3) * 2, 2, 4 + (k % 3) * 2, ["#2fe6ff", "#7f96ff", "#c77dff"][k % 3]);
  r(g, px + 2, 19, 2 * TILE - 4, 1, "#5fe9ff");
  // the map, scrawled on
  r(g, 26 * TILE, 3, 3 * TILE, TILE + 8, "#e8e4da");
  r(g, 26 * TILE + 4, 8, 3 * TILE - 8, 2, "#d0302a");
  r(g, 26 * TILE + 10, 14, 3 * TILE - 20, 2, "#2a6ad0");
  r(g, 26 * TILE + 20, 6, 2, 14, "#2f9a4a");
  r(g, 26 * TILE + 30, 12, 4, 4, "#111216");
  // ticket machine
  r(g, 5 * TILE + 1, 2 * TILE - 8, 14, 22, "#2a4a6a");
  r(g, 5 * TILE + 3, 2 * TILE - 5, 10, 6, "#9fd3ff");
  // benches
  for (const x of [8, 20]) {
    r(g, x * TILE, 2 * TILE + 4, 3 * TILE, 4, "#6a6d74");
    r(g, x * TILE, 2 * TILE - 2, 3 * TILE, 3, "#55585f");
    r(g, x * TILE + 2, 2 * TILE + 8, 2, 4, "#2a2a2e");
    r(g, x * TILE + 3 * TILE - 4, 2 * TILE + 8, 2, 4, "#2a2a2e");
  }
}

function drawTrain(g: G, f: Fx) {
  const tr = trainAt(f.t);
  if (!tr.here) return;
  const y = 6 * TILE + 10;
  const len = 28 * TILE;
  const x0 = Math.round(tr.x);
  r(g, x0, y, len, 2 * TILE + 2, "#8a9098");
  r(g, x0, y, len, 3, "#b0b6be");
  r(g, x0, y + 12, len, 2, "#2f6b4a");
  for (let k = 0; k < 13; k++) {
    const wx = x0 + 10 + k * 34;
    r(g, wx, y + 4, 22, 7, tr.open && k % 3 === 1 ? "#f0f0d8" : "#cfe6ea");
    if (k % 3 === 1) {
      r(g, wx - 4, y + 3, 30, 26, "#6a7078");
      if (tr.open) r(g, wx + 2, y + 4, 18, 24, "#f0f0d8");
      else r(g, wx + 10, y + 4, 2, 24, "#3a3e44");
    }
  }
  r(g, x0, y + 2 * TILE - 2, len, 4, "#2a2c30");
}

function lightsSubway(f: Fx): Light[] {
  const tr = trainAt(f.t);
  const out: Light[] = [];
  if (tr.here) for (let k = 0; k < 6; k++) out.push({ x: tr.x + 40 + k * 70, y: 7 * TILE, r: 40, color: "rgba(240,240,210,0.45)" });
  return out;
}

export const SUBWAY: Scene = {
  id: "subway",
  name: "The subway",
  tiles: ["WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW", "WSSSWWWWWWWWWWWWWWWWWWWWWWWWWWWW", "pppppppppppppppppppppppppppppppp", "pppppppppppppppppppppppppppppppp", "pppppppppppppppppppppppppppppppp", "pppppppppppppppppppppppppppppppp", "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy", "rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr", "rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr"],
  solid: "Wr",
  surface: (ch) => (ch === "S" ? "stone" : ch === "y" ? "metal" : "tile"),
  things: [
    { id: "ticket", body: { x: 5 * TILE + 1, y: 2 * TILE - 2, w: 14, h: 8 }, zone: T(5, 2.4, 1, 1) },
    { id: "bench-s", body: T(8, 2, 3, 0.7) },
    { id: "bench-s", body: T(20, 2, 3, 0.7) },
    { id: "poster", zone: T(16, 2, 2, 1) },
    { id: "map", zone: T(26, 2, 3, 1) },
    { id: "edge", zone: T(4, 5.6, 26, 0.9) },
  ],
  doors: [{ zone: { x: TILE + 2, y: TILE + 2, w: 3 * TILE - 4, h: 8 }, to: "avenue", label: "↑ the avenue", spawn: { x: 45 * TILE, y: 5.2 * TILE, dir: "down" } }],
  lights: [
    { x: 6 * TILE, y: 2 * TILE, r: 90, color: "rgba(230,255,240,0.4)" },
    { x: 16 * TILE, y: 2 * TILE, r: 90, color: "rgba(230,255,240,0.4)", kind: "lamp" },
    { x: 26 * TILE, y: 2 * TILE, r: 90, color: "rgba(230,255,240,0.35)", kind: "dead" },
  ],
  darkness: 0.42,
  paint: paintSubway,
  front: drawTrain,
  liveLights: lightsSubway,
};

/** Inside the carriage between stops: seats, poles, the tunnel lights going past (still with reduced motion). */
export function drawRide(g: G, w: number, h: number, t: number, reduced: boolean, to: string) {
  r(g, 0, 0, w, h, "#20242a");
  // windows, and the tunnel through them
  const wy = 30;
  for (let k = 0; k < 4; k++) {
    const wx = 18 + k * 78;
    r(g, wx, wy, 56, 34, "#07080b");
    if (!reduced) {
      const off = (t * 520 + k * 40) % 140;
      r(g, wx + 56 - off, wy + 12, 6, 2, "#f0e0a0");
      r(g, wx + 56 - ((off + 70) % 140), wy + 22, 4, 1, "#9fb0c8");
    } else r(g, wx + 20, wy + 14, 4, 2, "#5a5640");
    r(g, wx, wy, 56, 2, "#3a3f46");
    r(g, wx, wy + 32, 56, 2, "#3a3f46");
  }
  // the map strip over the windows: two stops, near the middle so a phone sees both
  r(g, 0, 8, w, 16, "#e8e4da");
  r(g, w / 2 - 66, 20, 132, 2, "#2f9a4a");
  for (const [x, label, here] of [[w / 2 - 66, "your block", to === "street"], [w / 2 + 34, "avenue", to === "avenue"]] as const) {
    r(g, x, 18, 6, 6, here ? "#d0302a" : "#111216");
    g.fillStyle = here ? "#d0302a" : "#111216";
    g.font = "6px monospace";
    g.textBaseline = "top";
    g.fillText(label, x, 10);
  }
  // seats and poles
  r(g, 0, 80, w, 26, "#2f6b4a");
  r(g, 0, 80, w, 3, "#3f8a60");
  for (let k = 0; k < 5; k++) r(g, 40 + k * 64, 22, 3, 110, "#b8bec6");
  r(g, 0, 106, w, h - 106, "#3a3d44");
  for (let k = 0; k < 12; k++) r(g, k * 28 + ((Math.floor(t * 8) % 2) && !reduced ? 1 : 0), 120, 14, 1, "#30333a");
  // the announcement, as it reads on the board
  r(g, w / 2 - 70, h - 34, 140, 18, "#07080b");
  g.fillStyle = "#ff9a3a";
  g.font = "8px monospace";
  g.textAlign = "center";
  g.fillText(`next stop: ${to === "street" ? "your block" : "the avenue"}`, w / 2, h - 29);
  g.textAlign = "left";
}

// ------------------------------------------------------------ the underpass

/** A train going over: 0 when quiet, up to 1 right overhead. */
export function overhead(t: number): number {
  const k = t % 41;
  return k > 30 && k < 36 ? Math.sin(((k - 30) / 6) * Math.PI) : 0;
}

function paintUnderpass(g: G, s: Scene) {
  s.tiles.forEach((row, ty) =>
    [...row].forEach((ch, tx) => {
      const x = tx * TILE;
      const y = ty * TILE;
      if (ch === "W") {
        r(g, x, y, TILE, TILE, ty === 0 ? "#141519" : "#26272c");
        if (ty === 0) r(g, x, y + 12, TILE, 4, "#1d1e23");
        if (ty === 2) r(g, x, y + 14, TILE, 2, "#1b1c20");
        if (hash(tx, ty + 40) > 0.7) r(g, x + 3, y + 5, 7, 3, "#2c2d32");
      } else if (ch === "g") {
        r(g, x, y, TILE, TILE, "#202126");
        if (hash(tx + 3, ty) > 0.65) r(g, x + 6, y + 4, 4, 1, "#2a2b30");
        if (hash(tx, ty + 9) > 0.92) r(g, x + 2, y + 9, 2, 2, "#5a4a3a");
      } else if (ch === "f") {
        r(g, x, y, TILE, TILE, "#0e1016");
        r(g, x, y, TILE, 2, "#3a3d44");
        r(g, x + 3, y + 2, 1, 14, "#2a2d34");
        r(g, x + 11, y + 2, 1, 14, "#2a2d34");
      }
    }),
  );
  // graffiti, bright, layered
  const pieces: [number, number, string, string][] = [
    [2, 18, "#d0302a", "#ffd23a"],
    [9, 20, "#2a8ad0", "#e8e0cf"],
    [19, 17, "#7a3fd0", "#4fe3ff"],
    [27, 19, "#2f9a4a", "#ffd23a"],
  ];
  for (const [x, y, a, b] of pieces) {
    for (let k = 0; k < 9; k++) r(g, x * TILE + k * 5, y + Math.round(Math.sin(k * 1.3) * 3), 4, 10 + (k % 3) * 2, a);
    for (let k = 0; k < 9; k++) r(g, x * TILE + k * 5 + 1, y + 2 + Math.round(Math.sin(k * 1.3) * 3), 2, 2, b);
  }
  // pillars
  for (const x of [6, 23]) {
    r(g, x * TILE, 2 * TILE, 2 * TILE, 2 * TILE + 4, "#3a3b42");
    r(g, x * TILE, 2 * TILE, 4, 2 * TILE + 4, "#4a4b52");
    r(g, x * TILE, 4 * TILE, 2 * TILE, 4, "#2a2b30");
  }
  // the cypher's ground: a ring worn into the concrete
  for (let a = 0; a < 28; a++) {
    const ang = (a / 28) * Math.PI * 2;
    r(g, Math.round(17.5 * TILE + Math.cos(ang) * 38), Math.round(6.2 * TILE + Math.sin(ang) * 22), 2, 1, "#2e2f35");
  }
  // the speaker
  r(g, 17 * TILE + 2, 6 * TILE - 6, 12, 14, "#141418");
  r(g, 17 * TILE + 4, 6 * TILE - 3, 8, 8, "#2a2a30");
  // the barrel by Tank's spot
  r(g, 28 * TILE + 2, 6 * TILE - 2, 12, 12, "#3a3c42");
  r(g, 28 * TILE + 2, 6 * TILE + 3, 12, 1, "#24262b");
  // shopping trolley, on its side
  r(g, 11 * TILE, 3 * TILE + 4, 18, 8, "#8a8d94");
  r(g, 11 * TILE + 2, 3 * TILE + 6, 14, 4, "#202126");
}

function fxUnderpass(g: G, f: Fx) {
  const x = 28 * TILE + 3;
  const y = 6 * TILE - 3;
  for (let k = 0; k < 5; k++) {
    const h = f.reduced ? 4 : 3 + Math.round((Math.sin(f.t * 8 + k * 2.1) + 1) * 2.5);
    r(g, x + k * 2, y - h, 2, h, k % 2 ? "#ff9a3a" : "#ffd27a");
  }
  // the speaker's cone on the beat
  if (f.beat && !f.reduced) r(g, 17 * TILE + 5, 6 * TILE - 2, 6, 6, "#4a4a52");
  // dust falling when a train goes over
  const o = overhead(f.t);
  if (o > 0.2 && !f.reduced)
    for (let k = 0; k < 14; k++) {
      const px = (k * 97 + Math.floor(f.t * 3) * 31) % (34 * TILE);
      const py = 3 * TILE + ((f.t * 40 + k * 17) % (6 * TILE));
      r(g, px, py, 1, 1, "rgba(200,190,170,0.6)");
    }
}

function lightsUnderpass(f: Fx): Light[] {
  const flick = f.reduced ? 0 : Math.sin(f.t * 10) * 6 + Math.sin(f.t * 27) * 3;
  const o = overhead(f.t);
  const out: Light[] = [{ x: 28.5 * TILE, y: 5.6 * TILE, r: 80 + flick, color: "rgba(255,140,50,0.6)" }];
  // the train's windows strobe through the gaps in the deck
  if (o > 0.05 && !f.reduced && Math.floor(f.t * 12) % 2 === 0) out.push({ x: 17 * TILE, y: 2 * TILE, r: 140 * o, color: "rgba(230,240,255,0.25)" });
  return out;
}

export const UNDERPASS: Scene = {
  id: "underpass",
  name: "The underpass",
  tiles: [
    "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    "gggggggggggggggggggggggggggggggggg",
    "gggggggggggggggggggggggggggggggggg",
    "gggggggggggggggggggggggggggggggggg",
    "gggggggggggggggggggggggggggggggggg",
    "gggggggggggggggggggggggggggggggggg",
    "gggggggggggggggggggggggggggggggggg",
    "gggggggggggggggggggggggggggggggggg",
    "ffffffffffffffffffffffffffffffffff",
  ],
  solid: "Wf",
  surface: () => "concrete",
  outdoors: true,
  things: [
    { id: "pillar", body: { x: 6 * TILE, y: 3 * TILE, w: 2 * TILE, h: TILE + 4 } },
    { id: "pillar", body: { x: 23 * TILE, y: 3 * TILE, w: 2 * TILE, h: TILE + 4 } },
    { id: "speaker", body: { x: 17 * TILE + 2, y: 6 * TILE + 2, w: 12, h: 6 }, zone: T(16.5, 6.5, 2, 1.2) },
    { id: "barrel-u", body: { x: 28 * TILE + 2, y: 6 * TILE + 2, w: 12, h: 8 }, zone: T(27.5, 6.6, 2, 1) },
    { id: "trolley", body: { x: 11 * TILE, y: 3 * TILE + 6, w: 18, h: 6 } },
  ],
  doors: [{ zone: { x: 0, y: 3 * TILE, w: 6, h: 7 * TILE }, to: "avenue", label: "← the avenue", spawn: { x: 46.6 * TILE, y: 4.4 * TILE, dir: "left" } }],
  lights: [
    { x: 12 * TILE, y: 3.4 * TILE, r: 60, color: "rgba(255,200,120,0.35)", kind: "dead" },
    { x: 17.5 * TILE, y: 6 * TILE, r: 60, color: "rgba(140,190,255,0.25)" },
  ],
  darkness: 0.76,
  paint: paintUnderpass,
  fx: fxUnderpass,
  liveLights: lightsUnderpass,
};
