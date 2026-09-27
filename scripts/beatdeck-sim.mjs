// Balance check for Beat Deck: a greedy bot plays N seeded runs and reports
// the win rate and where runs end. It tries every take of up to 5 cards,
// redraws when the best take won't make the target, and shops simply.
//
//   node scripts/beatdeck-sim.mjs [runs=300]
//
// The game rules in src/lib/beatdeck are plain TypeScript with no DOM, so
// they're transpiled to a temp folder with the project's own TypeScript.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const src = path.join(path.dirname(new URL(import.meta.url).pathname), "../src/lib/beatdeck");
const out = fs.mkdtempSync(path.join(os.tmpdir(), "beatdeck-"));
for (const f of fs.readdirSync(src).filter((f) => f.endsWith(".ts"))) {
  const code = ts.transpileModule(fs.readFileSync(path.join(src, f), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  fs.writeFileSync(path.join(out, f.replace(/\.ts$/, ".mjs")), code.replace(/from "\.\/(\w+)"/g, 'from "./$1.mjs"'));
}
const lib = (name) => import(pathToFileURL(path.join(out, `${name}.mjs`)).href);
const { newRun, playTake, redraw, openShop, buyGear, buyUpgrade, buyCard, nextRound, previewTake, maxPlay } = await lib("run");
const { GEAR_BY_ID } = await lib("gear");
const { CARD_BY_ID, RARITY_PRICE } = await lib("cards");

function subsets(arr, max) {
  const res = [];
  const rec = (start, cur) => {
    if (cur.length) res.push([...cur]);
    if (cur.length === max) return;
    for (let i = start; i < arr.length; i++) {
      cur.push(arr[i]);
      rec(i + 1, cur);
      cur.pop();
    }
  };
  rec(0, []);
  return res;
}

function playRound(s) {
  while (s.phase === "play") {
    let best = null;
    let bestScore = -1;
    for (const c of subsets(s.hand, maxPlay(s))) {
      const r = previewTake(s, c);
      if (r.score > bestScore) [bestScore, best] = [r.score, c];
    }
    if (s.redrawsLeft > 0 && bestScore * s.takesLeft < (s.target - s.score) * 1.1) {
      const toss = s.hand.filter((u) => !best.includes(u)).slice(0, 5);
      if (toss.length) {
        s = redraw(s, toss);
        continue;
      }
    }
    s = playTake(s, best).state;
  }
  return s;
}

function run(seed) {
  let s = newRun(seed);
  for (;;) {
    s = playRound(s);
    if (s.phase !== "won") return s;
    s = openShop(s);
    for (let pass = 0; pass < 2; pass++) {
      s.shop.gear.forEach((g, i) => {
        if (g && s.money >= GEAR_BY_ID[g].price + 2) s = buyGear(s, i);
      });
      if (s.shop.upgrade && s.money >= 6) s = buyUpgrade(s);
      s.shop.cards.forEach((c, i) => {
        if (c && CARD_BY_ID[c].rarity !== "common" && s.money >= RARITY_PRICE[CARD_BY_ID[c].rarity] + 3) s = buyCard(s, i);
      });
    }
    s = nextRound(s);
  }
}

const N = Number(process.argv[2] || 300);
const ended = {};
let wins = 0;
for (let i = 1; i <= N; i++) {
  const s = run(i * 7919);
  const key = s.phase === "victory" ? "won" : `round ${s.round}`;
  ended[key] = (ended[key] || 0) + 1;
  if (s.phase === "victory") wins++;
}
console.log(`${N} runs · bot win rate ${((wins / N) * 100).toFixed(1)}%`);
console.log("runs ended at:", ended);
fs.rmSync(out, { recursive: true, force: true });
