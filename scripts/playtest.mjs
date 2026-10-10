// Screenshots of every place, the menu, the mini-games and a fight, on a
// desktop and a phone, for looking at by eye (and Vee's battle, Dre's tape
// lost in a knockout, the alley cat following you). Run against a dev server:
//   node scripts/playtest.mjs [outdir]
import { chromium } from "playwright-core";
import { mkdirSync } from "fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3210";
const CHROME = process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const OUT = process.argv[2] ?? "playtest";
const ONLY = process.argv[3];
mkdirSync(OUT, { recursive: true });

const SAVE = {
  found: ["rain", "phone"], seenHelp: true, unseen: [], cash: 120, rep: 12,
  profile: { name: "Tester", skin: 2, hair: "fade", hairColor: 0, body: "slim", top: "hoodie", bottom: "jeans", shoes: "sneakers", hat: "none", acc: "none" },
};
const PLACES = [
  ["bedroom", 10, 6, "down"], ["street", 18, 5, "down"], ["store", 10.5, 5.6, "up"], ["studio", 8, 5, "down"],
  ["park", 14, 5, "down"], ["rooftop", 10, 5, "down"], ["avenue", 20, 5, "down"], ["alley", 12, 7, "up"],
  ["records", 8, 7, "up"], ["thrift", 7, 6, "up"], ["club", 12, 9, "up"], ["subway", 6, 4, "down"], ["underpass", 14, 6.5, "right"],
];
const MINIS = [["cypher", { kind: "rhythm", mode: "cypher" }], ["dj", { kind: "rhythm", mode: "dj" }], ["dice", { kind: "dice" }], ["crates", { kind: "crates" }], ["hoops", { kind: "hoops" }], ["tag", { kind: "tag" }], ["shop-store", { kind: "shop", shop: "store" }], ["shop-thrift", { kind: "shop", shop: "thrift" }], ["shop-bar", { kind: "shop", shop: "bar" }]];
const TABS = ["you", "wardrobe", "fight", "goals", "settings"];

const browser = await chromium.launch({ executablePath: CHROME, args: ["--autoplay-policy=no-user-gesture-required"] });
for (const [dev, opts] of [["desk", { viewport: { width: 1366, height: 800 } }], ["phone", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
  if (ONLY && ONLY !== dev) continue;
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript((save) => {
    if (sessionStorage.getItem("pt")) return;
    sessionStorage.setItem("pt", "1");
    localStorage.setItem("saeculo-intro-seen", "1");
    localStorage.setItem("saeculo-game", JSON.stringify(save));
  }, SAVE);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("pageerror", String(e)));
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  if (dev === "phone") { await page.getByRole("button", { name: "Close Beats" }).tap(); await page.getByTestId("icon-game").tap(); } else await page.getByTestId("icon-game").click();
  await page.waitForTimeout(1600);
  const g = (fn, ...a) => page.evaluate(([fn, a]) => window.__game[fn](...a), [fn, a]);
  const snap = (name) => page.screenshot({ path: `${OUT}/${dev}-${name}.png` });
  for (const [p, x, y, d] of PLACES) {
    await g("teleport", p, x, y, d);
    await page.waitForTimeout(700);
    await snap(`place-${p}`);
  }
  for (const t of TABS) {
    await g("menu", t);
    await page.waitForTimeout(300);
    await snap(`menu-${t}`);
  }
  await g("menu", null);
  for (const [name, m] of MINIS) {
    await g("mini", m);
    await page.waitForTimeout(600);
    await snap(`mini-${name}`);
    if (name === "cypher" || name === "dj") {
      await page.getByTestId("rhythm-start").click();
      await page.waitForTimeout(6000);
      await snap(`mini-${name}-play`);
    }
    await g("mini", null);
    await page.waitForTimeout(200);
  }
  // a whole fight
  await g("teleport", "alley", 12, 6, "right");
  await page.waitForTimeout(400);
  await g("trouble");
  for (let i = 0; i < 30 && !(await page.getByTestId("game-dialog").count()); i++) await page.waitForTimeout(200);
  await snap("fight-0-confront");
  for (let i = 0; i < 8 && (await page.getByTestId("game-dialog").count()); i++) {
    const b = page.getByTestId("game-dialog").getByRole("button", { name: "Fight" });
    if (await b.count()) { await b.click(); break; }
    await page.getByTestId("game-dialog").click();
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(900);
  await snap("fight-1-start");
  await page.waitForTimeout(2500);
  await snap("fight-2-mid");
  await g("weaken");
  for (let i = 0; i < 40 && (await g("fight"))?.outcome === ""; i++) {
    const f = await g("fight");
    const foe = f.foes.find((a) => a.hp > 0);
    if (foe) await g("teleport", "alley", (foe.x - 9) / 16, foe.y / 16, "right");
    if (dev === "phone") await page.getByRole("button", { name: "A: swing" }).dispatchEvent("pointerdown").catch(() => {});
    else await page.keyboard.press("e");
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(900);
  await snap("fight-3-won");

  // Vee's battle, on the beat she names
  const dialog = page.getByTestId("game-dialog");
  const clear = async () => {
    for (let i = 0; i < 8 && (await dialog.count()); i++) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(120);
    }
  };
  const fightBtn = page.getByRole("button", { name: "Fight", exact: true });
  // out of the alley and the last fight's over
  await g("teleport", "street", 18, 5, "down");
  await page.waitForTimeout(400);
  await clear();
  await g("peace");
  await g("mini", { kind: "rhythm", mode: "battle", rival: { name: "Vee", score: 72, stake: 20, beat: "trap" } });
  await page.waitForTimeout(600);
  await snap("vee-battle-trap");
  await g("mini", null);
  // carrying Dre's tape: they ask about it, a knockout loses it, Dre hears about it
  await g("give", { job: { to: "busker", stage: "carry", pay: 25 } });
  await g("teleport", "alley", 12, 6, "right");
  await g("trouble");
  for (let i = 0; i < 30 && !(await fightBtn.count()); i++) {
    if (await dialog.count()) await dialog.click();
    await page.waitForTimeout(200);
  }
  await snap("tape-0-asked");
  await fightBtn.click();
  await page.waitForTimeout(500);
  await g("knockMe");
  await page.getByTestId("game-wake").waitFor({ timeout: 5000 });
  await snap("tape-1-down");
  await page.getByTestId("game-wake").click();
  await page.waitForTimeout(300);
  for (let i = 0; i < 2 && (await dialog.count()); i++) {
    await dialog.click();
    await page.waitForTimeout(150);
  }
  await snap("tape-2-gone");
  await clear();
  await g("peace");
  await g("teleport", "underpass", 11.6, 6.8, "right");
  await page.waitForTimeout(300);
  await page.keyboard.press("e");
  await page.waitForTimeout(250);
  await dialog.click();
  await page.waitForTimeout(150);
  await snap("tape-3-dre");
  await clear();
  // the alley cat: three pets and it follows; trouble sends it home
  await g("teleport", "alley", 4.2, 3.6, "left");
  await g("cat", 0, [3.2, 3.6]);
  await page.waitForTimeout(250);
  for (let i = 0; i < 3; i++) {
    await clear();
    await page.keyboard.press("e");
    await page.waitForTimeout(250);
  }
  await clear();
  for (const [key, ms] of [["ArrowDown", 1200], ["ArrowRight", 1400]]) {
    await page.keyboard.down(key);
    await page.waitForTimeout(ms);
    await page.keyboard.up(key);
  }
  await page.waitForTimeout(1200);
  await snap("cat-following");
  await g("trouble");
  await page.waitForTimeout(700);
  await snap("cat-scared");
  await ctx.close();
}
await browser.close();
console.log("done");
