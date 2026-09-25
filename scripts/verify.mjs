// Browser smoke test for the desktop. Run against a local dev server:
//   npm i --no-save playwright-core && npm run dev -- -p 3210
//   node scripts/verify.mjs
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3210";
const CHROME = process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const results = [];
function check(name, ok, extra = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${extra ? " — " + extra : ""}`);
}

// Sandboxed/CI environments often can't reach Vercel's analytics script;
// that's the network, not the site.
const isEnvNoise = (text) => /vercel-scripts|ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED/.test(text);

const browser = await chromium.launch({ executablePath: CHROME });
const consoleErrors = [];

try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 800 } });
  const page = await context.newPage();
  page.on("console", (msg) => msg.type() === "error" && !isEnvNoise(msg.text()) && consoleErrors.push(msg.text()));
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  const desktop = page.getByRole("navigation", { name: "Desktop" });
  const openFromDesktop = async (label) => {
    await desktop.getByRole("button", { name: label, exact: true }).click();
    await page.waitForTimeout(250);
  };
  const openFromStart = async (label) => {
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await page.getByRole("navigation", { name: "Start menu" }).getByRole("button", { name: new RegExp(`^${label}`) }).first().click();
    await page.waitForTimeout(250);
  };
  const win = (title) => page.getByRole("region", { name: title, exact: true });
  const close = async (title) => {
    await page.getByRole("button", { name: `Close ${title}`, exact: true }).click();
    await page.waitForTimeout(150);
  };
  const audioPaused = () => page.getByTestId("player-audio").evaluate((el) => el.paused);

  await page.goto(BASE, { waitUntil: "networkidle" });

  // ---- boot ----
  check("boot screen appears", await page.getByLabel("Skip boot sequence").isVisible().catch(() => false));
  await page.getByLabel("Skip boot sequence").click({ force: true });
  await page.waitForTimeout(300);
  check("desktop shows 6 icons", (await desktop.getByRole("button").count()) === 6);

  // ---- media player + global audio ----
  await desktop.getByRole("button", { name: "Media Player", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  const player = win("saeculo Media Player");
  check("player opens via keyboard Enter on icon", await player.isVisible());

  const before = await player.boundingBox();
  await player.locator("header").hover({ position: { x: 120, y: 12 } });
  await page.mouse.down();
  await page.mouse.move((before?.x ?? 0) + 260, (before?.y ?? 0) + 90, { steps: 10 });
  await page.mouse.up();
  const after = await player.boundingBox();
  check("window drags by its title bar", !!before && !!after && Math.abs(after.x - before.x) > 40, `dx=${Math.round((after?.x ?? 0) - (before?.x ?? 0))}`);

  const sizeBefore = await player.boundingBox();
  await page.mouse.move(sizeBefore.x + sizeBefore.width - 5, sizeBefore.y + sizeBefore.height - 5);
  await page.mouse.down();
  await page.mouse.move(sizeBefore.x + sizeBefore.width + 80, sizeBefore.y + sizeBefore.height + 40, { steps: 8 });
  await page.mouse.up();
  const sizeAfter = await player.boundingBox();
  check("window resizes from the corner grip", sizeAfter.width > sizeBefore.width + 40, `w ${Math.round(sizeBefore.width)}→${Math.round(sizeAfter.width)}`);

  await player.getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForTimeout(600);
  check("audio plays", (await audioPaused()) === false);

  const canvas = player.locator("canvas");
  const f1 = await canvas.evaluate((c) => c.toDataURL());
  await page.waitForTimeout(400);
  const f2 = await canvas.evaluate((c) => c.toDataURL());
  check("visualizer animates", f1 !== f2);

  const vizBtn = player.getByRole("button", { name: "Cycle visualizer style" });
  const m1 = await vizBtn.innerText();
  await vizBtn.click();
  check("visualizer mode cycles", (await vizBtn.innerText()) !== m1);

  await page.getByRole("button", { name: "Maximize saeculo Media Player" }).click();
  await page.waitForTimeout(200);
  const maxBox = await player.boundingBox();
  check("maximize fills the screen", maxBox.width >= 1360, `w=${Math.round(maxBox.width)}`);
  await page.getByRole("button", { name: "Restore saeculo Media Player" }).click();

  await page.getByRole("button", { name: "Minimize saeculo Media Player" }).click();
  await page.waitForTimeout(200);
  check("audio survives minimize", (await audioPaused()) === false);
  await page.getByRole("button", { name: "Taskbar saeculo Media Player" }).click();
  await page.waitForTimeout(200);
  check("taskbar button restores the window", await player.isVisible());

  await close("saeculo Media Player");
  check("window closes", (await player.count()) === 0);
  check("music keeps playing after the player window closes", (await audioPaused()) === false);
  check("tray shows now-playing while music plays", await page.getByRole("button", { name: /^Now playing:/ }).isVisible());

  await page.getByRole("button", { name: "Gadget pause" }).click();
  await page.waitForTimeout(200);
  check("sidebar gadget pauses the global player", (await audioPaused()) === true);

  // ---- start menu search ----
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.keyboard.type("pad");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  const pads = win("Pad Recall");
  check("start search + Enter launches Pad Recall", await pads.isVisible());

  // ---- Pad Recall: actually play round 1 ----
  await pads.getByRole("button", { name: "Start" }).click();
  const litPad = await page.waitForFunction(
    () => {
      const btns = [...document.querySelectorAll('[aria-label="Drum pads"] button')];
      const i = btns.findIndex((b) => b.style.background.includes("radial-gradient") && !b.style.background.includes("217, 65, 47"));
      return i >= 0 ? i : false;
    },
    null,
    { timeout: 3000 },
  );
  const padIndex = await litPad.jsonValue();
  await pads.getByText("Your turn").waitFor({ timeout: 3000 });
  await page.keyboard.press(["q", "w", "e", "r", "a", "s", "d", "f"][padIndex]);
  await pads.getByText("ROUND 2").waitFor({ timeout: 3000 }).catch(() => {});
  check("Pad Recall: repeating the pattern advances to round 2", await pads.getByText("ROUND 2").isVisible());
  await close("Pad Recall");

  // ---- Beat Maker ----
  await openFromDesktop("Beat Maker");
  const bm = win("Beat Maker");
  await bm.getByLabel("kick step 3").click();
  check("Beat Maker step toggles on", (await bm.getByLabel("kick step 3").getAttribute("aria-pressed")) === "true");
  await bm.getByRole("combobox", { name: "Load preset" }).selectOption("Trap");
  check("Beat Maker preset sets the tempo", (await bm.getByText("140 bpm").count()) === 1);
  await bm.getByRole("button", { name: "Play sequencer" }).click();
  await page.waitForTimeout(500);
  check("Beat Maker plays", await bm.getByRole("button", { name: "Stop sequencer" }).isVisible());
  await bm.getByRole("button", { name: "Stop sequencer" }).click();
  await close("Beat Maker");

  // ---- Games Explorer → Rhythm Rush ----
  await openFromDesktop("Games");
  check("Games Explorer lists 3 games", (await win("Games").getByRole("list", { name: "Games" }).getByRole("button").count()) === 3);
  await page.getByRole("button", { name: "Play Rhythm Rush" }).click();
  await page.waitForTimeout(300);
  const rr = win("Rhythm Rush");
  await rr.getByRole("button", { name: "Start" }).click();
  const sawGo = await rr
    .getByText("GO", { exact: true })
    .waitFor({ timeout: 6000 })
    .then(() => true)
    .catch(() => false);
  check("Rhythm Rush counts in 3-2-1-GO", sawGo);
  for (let i = 0; i < 40; i++) {
    for (const k of ["d", "f", "j", "k"]) await page.keyboard.press(k);
    await page.waitForTimeout(70);
  }
  const scoreText = await rr.getByText(/^SCORE \d+/).innerText();
  check("Rhythm Rush registers hits on the beat grid", /SCORE [1-9]/.test(scoreText), scoreText);
  await close("Rhythm Rush");
  await close("Games");

  // ---- Beat Brawl ----
  await openFromStart("Beat Brawl");
  const brawl = win("Beat Brawl");
  await brawl.getByRole("button", { name: "Fight" }).click();
  await page.waitForTimeout(2600);
  for (let i = 0; i < 40; i++) {
    for (const k of ["d", "f", "j", "k"]) await page.keyboard.press(k);
    await page.waitForTimeout(70);
  }
  const bossWidth = await brawl.locator(".aero-progress-fill-red").evaluate((el) => el.style.width);
  check("Beat Brawl: landed notes damage the boss", parseFloat(bossWidth) < 100, `boss hp ${bossWidth}`);
  await close("Beat Brawl");

  // ---- content apps ----
  await openFromDesktop("about.txt");
  check("Notepad shows the bio", (await win("about.txt - Notepad").innerText()).includes("saeculo"));
  await close("about.txt - Notepad");

  await openFromDesktop("Contact");
  const mail = win("New Message - Booking");
  check("Contact is a compose form with a Send button", await mail.getByRole("button", { name: "Send" }).isVisible());
  await close("New Message - Booking");

  await openFromDesktop("Recycle Bin");
  const bin = win("Recycle Bin");
  await bin.getByRole("button", { name: "Empty Recycle Bin" }).click();
  await bin.getByRole("button", { name: "Yes", exact: true }).click();
  check("Recycle Bin empties", await bin.getByText("This folder is empty.").isVisible());
  await close("Recycle Bin");

  // ---- lock / restart ----
  const saver = page.getByRole("status", { name: /Screensaver active/ });
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.getByRole("button", { name: "Lock", exact: true }).click();
  await page.waitForTimeout(300);
  check("Lock shows the screensaver", await saver.isVisible());
  await page.waitForTimeout(800);
  await page.mouse.move(300, 300);
  await page.mouse.move(420, 360);
  await page.waitForTimeout(200);
  check("screensaver unlocks on activity", !(await saver.isVisible()));

  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await page.waitForTimeout(300);
  check("Restart replays the boot screen", await page.getByLabel("Skip boot sequence").isVisible());
  await page.getByText("Welcome").waitFor({ timeout: 4000 }).catch(() => {});
  check("boot hands off to the Welcome screen", await page.getByText("Welcome").isVisible());
  await page.getByLabel("Skip boot sequence").click({ force: true });

  check("no console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));

  // ---- idle screensaver (virtual clock, isolated context) ----
  const ssContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const ssPage = await ssContext.newPage();
  await ssPage.clock.install();
  await ssPage.goto(BASE, { waitUntil: "networkidle" });
  await ssPage.getByLabel("Skip boot sequence").click({ force: true }).catch(() => {});
  const idleSaver = ssPage.getByRole("status", { name: /Screensaver active/ });
  check("screensaver absent before idle", !(await idleSaver.isVisible().catch(() => false)));
  await ssPage.clock.fastForward("00:46");
  await ssPage.waitForTimeout(150);
  check("screensaver appears after 45s idle", await idleSaver.isVisible().catch(() => false));
  await ssPage.mouse.move(50, 50);
  await ssPage.waitForTimeout(150);
  check("idle screensaver dismisses on activity", !(await idleSaver.isVisible().catch(() => false)));
  await ssContext.close();

  // ---- mobile ----
  const mContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const m = await mContext.newPage();
  await m.goto(BASE, { waitUntil: "networkidle" });
  await m.getByLabel("Skip boot sequence").click({ force: true });
  await m.getByRole("navigation", { name: "Desktop" }).getByRole("button", { name: "Games", exact: true }).tap();
  await m.waitForTimeout(500); // let the 160ms open animation (scale .94→1) settle before measuring
  const gBox = await m.getByRole("region", { name: "Games", exact: true }).boundingBox();
  check("mobile: windows open full-screen", gBox.width >= 389, `w=${gBox?.width}`);
  await m.getByRole("list", { name: "Games" }).getByRole("button", { name: "Pad Recall" }).tap();
  await m.waitForTimeout(200);
  check("mobile: a single tap opens a game", await m.getByRole("region", { name: "Pad Recall", exact: true }).isVisible());
  await mContext.close();
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exit(1);
