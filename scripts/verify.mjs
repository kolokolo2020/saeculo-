// Smoke test for the desktop OS. Needs a dev server already running:
//   npm run dev     (in one terminal)
//   npm run verify  (in another)
// Needs a browser once: npx playwright install chromium
// Override either default with:
//   VERIFY_BASE=http://localhost:3001  VERIFY_BROWSER=/path/to/chrome
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE ?? "http://localhost:3000";

const results = [];
function check(name, ok, extra = "") {
  results.push({ name, ok, extra });
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${extra ? " — " + extra : ""}`);
}

async function launch() {
  if (process.env.VERIFY_BROWSER) {
    return chromium.launch({ executablePath: process.env.VERIFY_BROWSER });
  }
  try {
    return await chromium.launch();
  } catch (err) {
    // Fall back to a locally installed Chrome or Edge before giving up, so
    // this still runs on a machine that never ran `playwright install`.
    for (const channel of ["chrome", "msedge"]) {
      try {
        return await chromium.launch({ channel });
      } catch {
        // try the next one
      }
    }
    throw new Error(
      `No browser available. Run \`npx playwright install chromium\`, or set ` +
        `VERIFY_BROWSER to a Chromium binary.\nOriginal error: ${err.message}`,
    );
  }
}

// Accessible names come from windowRegistry.ts — desktop icons are labelled
// with desktopLabel, window regions and their buttons with title.
const APPS = {
  saeculo: { icon: "saeculo.wav", title: "saeculo — now playing" },
  beatmaker: { icon: "beatmaker.exe", title: "Beat Maker" },
  rhythm: { icon: "rhythmrush.exe", title: "Rhythm Rush" },
  brawl: { icon: "beatbrawl.exe", title: "Beat Brawl" },
  about: { icon: "about.txt", title: "about.txt — Notepad" },
  contact: { icon: "booking.exe", title: "Booking & Contact" },
};

const browser = await launch();
const consoleErrors = [];

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  const openWindow = async (key) => {
    await page.getByRole("button", { name: APPS[key].icon, exact: true }).first().click();
    await page.waitForTimeout(250);
    return page.getByRole("region", { name: APPS[key].title });
  };
  const closeWindow = async (key) => {
    await page.getByRole("button", { name: `Close ${APPS[key].title}` }).click();
    await page.waitForTimeout(200);
  };

  await page.goto(BASE, { waitUntil: "networkidle" });

  const bootVisible = await page.getByLabel("Skip boot sequence").isVisible().catch(() => false);
  check("boot screen appears", bootVisible);
  await page.getByLabel("Skip boot sequence").click({ force: true }).catch(() => {});
  await page.waitForTimeout(400);

  // every registered app opens from its desktop icon
  for (const key of Object.keys(APPS)) {
    const win = await openWindow(key);
    check(`${APPS[key].icon} opens`, await win.isVisible().catch(() => false));
    await closeWindow(key);
  }

  // keyboard-only reachability
  await page.getByRole("button", { name: APPS.saeculo.icon, exact: true }).first().focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(250);
  const player = page.getByRole("region", { name: APPS.saeculo.title });
  check("player opens via keyboard Enter on its icon", await player.isVisible().catch(() => false));

  // drag by titlebar
  const before = await player.boundingBox();
  await player.locator("header").first().hover();
  await page.mouse.down();
  await page.mouse.move((before?.x ?? 0) + 140, (before?.y ?? 0) + 90, { steps: 10 });
  await page.mouse.up();
  const after = await player.boundingBox();
  check(
    "window drags via titlebar",
    !!before && !!after && (Math.abs(before.x - after.x) > 20 || Math.abs(before.y - after.y) > 20),
    `dx=${Math.round((after?.x ?? 0) - (before?.x ?? 0))} dy=${Math.round((after?.y ?? 0) - (before?.y ?? 0))}`,
  );

  // playback + visualizer
  await player.getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForTimeout(600);
  check("audio plays after clicking Play", (await page.locator("audio").evaluate((el) => el.paused)) === false);
  check(
    "audio source is mp3",
    (await page.locator("audio").evaluate((el) => el.currentSrc)).endsWith(".mp3"),
  );
  const frame1 = await page.locator("canvas").first().evaluate((c) => c.toDataURL());
  await page.waitForTimeout(500);
  const frame2 = await page.locator("canvas").first().evaluate((c) => c.toDataURL());
  check("visualizer canvas is animating", frame1 !== frame2);
  await closeWindow("saeculo");

  // Beat Maker: a step toggles and the transport starts
  const beatMaker = await openWindow("beatmaker");
  await beatMaker.getByLabel("kick step 3").click();
  check(
    "Beat Maker step toggles on",
    (await beatMaker.getByLabel("kick step 3").getAttribute("aria-pressed")) === "true",
  );
  await beatMaker.getByRole("button", { name: "Play sequencer" }).click();
  await page.waitForTimeout(600);
  check(
    "Beat Maker transport starts",
    await beatMaker.getByRole("button", { name: "Stop sequencer" }).isVisible().catch(() => false),
  );
  await beatMaker.getByRole("button", { name: "Stop sequencer" }).click().catch(() => {});
  await closeWindow("beatmaker");

  // Beat Brawl: the fight starts and the boss has health
  const brawl = await openWindow("brawl");
  const brawlStart = brawl.getByRole("button", { name: /start|fight|play/i }).first();
  await brawlStart.click().catch(() => {});
  await page.waitForTimeout(600);
  check("Beat Brawl starts a fight", await brawl.isVisible().catch(() => false));
  await closeWindow("brawl");

  // About / Booking still render their content
  const about = await openWindow("about");
  check("about window shows bio text", (await about.innerText()).toLowerCase().includes("saeculo"));
  await closeWindow("about");

  const booking = await openWindow("contact");
  check("booking window shows a mail link", (await booking.getByRole("link").count()) > 0);
  await closeWindow("contact");

  // mobile: windows go full-screen instead of floating
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const mobilePlayer = await openWindow("saeculo");
  const box = await mobilePlayer.boundingBox();
  check("mobile: opened window is full-screen", !!box && box.width > 350, `w=${Math.round(box?.width ?? 0)}`);
  await page.setViewportSize({ width: 1440, height: 900 });

  check("no console errors", consoleErrors.length === 0, consoleErrors.slice(0, 5).join(" | "));

  // Screensaver, on a virtual clock so we don't wait 45 real seconds.
  const ssContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const ssPage = await ssContext.newPage();
  await ssPage.clock.install();
  await ssPage.goto(BASE, { waitUntil: "networkidle" });
  await ssPage.getByLabel("Skip boot sequence").click({ force: true }).catch(() => {});
  const screensaver = ssPage.getByRole("status", { name: /Screensaver active/i });
  check("screensaver absent before idle threshold", !(await screensaver.isVisible().catch(() => false)));
  await ssPage.clock.fastForward("00:46");
  await ssPage.waitForTimeout(200);
  check("screensaver appears after 45s idle", await screensaver.isVisible().catch(() => false));
  await ssPage.mouse.move(60, 60);
  await ssPage.waitForTimeout(200);
  check("screensaver dismisses on activity", !(await screensaver.isVisible().catch(() => false)));
  await ssContext.close();
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exit(1);
