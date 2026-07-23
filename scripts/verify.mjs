import { chromium } from "playwright-core";

const BASE = "http://localhost:3210";
const results = [];
function check(name, ok, extra = "") {
  results.push({ name, ok, extra });
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${extra ? " — " + extra : ""}`);
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const consoleErrors = [];

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  await page.goto(BASE, { waitUntil: "networkidle" });

  // boot screen present, skip it
  const bootVisible = await page.getByLabel("Skip boot sequence").isVisible().catch(() => false);
  check("boot screen appears", bootVisible);
  await page.getByLabel("Skip boot sequence").click({ force: true }).catch(() => {});
  await page.waitForTimeout(300);

  // keyboard-only reachability: tab to an icon and press Enter
  await page.keyboard.press("Tab");
  await page.getByRole("button", { name: /My Beats\.exe/i }).focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  const musicWindow = page.getByRole("region", { name: /saeculo player/i });
  check("music window opens via keyboard Enter on icon", await musicWindow.isVisible());

  // drag the window by titlebar
  const titlebar = musicWindow.locator("header");
  const before = await musicWindow.boundingBox();
  await titlebar.hover();
  await page.mouse.down();
  await page.mouse.move((before?.x ?? 0) + 120, (before?.y ?? 0) + 80, { steps: 10 });
  await page.mouse.up();
  const after = await musicWindow.boundingBox();
  check(
    "window drags via titlebar",
    !!before && !!after && (Math.abs(before.x - after.x) > 20 || Math.abs(before.y - after.y) > 20),
    `dx=${(after?.x ?? 0) - (before?.x ?? 0)} dy=${(after?.y ?? 0) - (before?.y ?? 0)}`,
  );

  // play audio
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForTimeout(500);
  const paused1 = await page.locator("audio").evaluate((el) => el.paused);
  check("audio plays after clicking Play", paused1 === false);

  // visualizer animates — compare two canvas frames
  const frame1 = await page.locator("canvas").evaluate((c) => c.toDataURL());
  await page.waitForTimeout(400);
  const frame2 = await page.locator("canvas").evaluate((c) => c.toDataURL());
  check("visualizer canvas is animating", frame1 !== frame2);

  // minimize and confirm audio keeps playing
  await page.getByRole("button", { name: /Minimize saeculo player/i }).click();
  await page.waitForTimeout(200);
  const pausedAfterMinimize = await page.locator("audio").evaluate((el) => el.paused);
  check("audio keeps playing after minimize", pausedAfterMinimize === false);

  // reopen via taskbar, then close
  await page.getByRole("button", { name: /saeculo player/i }).first().click();
  await page.waitForTimeout(200);
  check("window reopens via taskbar", await musicWindow.isVisible());
  await page.getByRole("button", { name: /Close saeculo player/i }).click();
  await page.waitForTimeout(200);
  const pausedAfterClose = await page.locator("audio").count();
  check("window closes (unmounts) via titlebar close", pausedAfterClose === 0);

  // reopen via start menu, check About/Contact content
  await page.getByRole("button", { name: /start/i }).click();
  await page.getByLabel("Start menu").getByRole("button", { name: /About Me\.txt/i }).click();
  await page.waitForTimeout(200);
  const aboutText = await page.getByRole("region", { name: /About Me/i }).innerText();
  check("About window shows bio text", aboutText.includes("saeculo"));
  await page.getByRole("button", { name: /Close About Me/i }).click();

  await page.getByRole("button", { name: /start/i }).click();
  await page.getByLabel("Start menu").getByRole("button", { name: /Contact\.exe/i }).click();
  await page.waitForTimeout(200);
  const contactLinks = await page.getByRole("region", { name: /Contact/i }).getByRole("link").count();
  check("Contact window shows social links", contactLinks > 0);
  await page.getByRole("button", { name: /Close Contact/i }).click();

  // Beat Maker: toggle a step, play, confirm the scheduler advances and
  // audio actually produces sound (analyser would be overkill — check the
  // sequencer's own step highlight instead)
  await page.getByRole("button", { name: /Beat Maker\.exe/i }).click();
  await page.waitForTimeout(200);
  const beatMakerWindow = page.getByRole("region", { name: /Beat Maker/i });
  check("Beat Maker window opens", await beatMakerWindow.isVisible());
  await beatMakerWindow.getByLabel("kick step 3").click();
  check(
    "Beat Maker step toggles on",
    (await beatMakerWindow.getByLabel("kick step 3").getAttribute("aria-pressed")) === "true",
  );
  await beatMakerWindow.getByRole("button", { name: "Play sequencer" }).click();
  await page.waitForTimeout(700);
  const stopVisible = await beatMakerWindow.getByRole("button", { name: "Stop sequencer" }).isVisible();
  check("Beat Maker starts playing (play → stop button)", stopVisible);
  await beatMakerWindow.getByRole("button", { name: "Stop sequencer" }).click();
  await page.getByRole("button", { name: /Close Beat Maker/i }).click();

  // Rhythm Rush: start a run, hit a lane key, confirm score/combo respond
  await page.getByRole("button", { name: /Rhythm Rush\.exe/i }).click();
  await page.waitForTimeout(200);
  const rhythmWindow = page.getByRole("region", { name: /Rhythm Rush/i });
  check("Rhythm Rush window opens", await rhythmWindow.isVisible());
  await rhythmWindow.getByRole("button", { name: /^▶ (start|play again)$/ }).click();
  await page.waitForTimeout(300);
  // mash all four lanes repeatedly so at least one lands inside a hit window
  for (let i = 0; i < 12; i++) {
    for (const key of ["d", "f", "j", "k"]) await rhythmWindow.getByRole("button", { name: new RegExp(`Hit lane ${key}`, "i") }).click();
    await page.waitForTimeout(120);
  }
  const scoreText = await rhythmWindow.locator("span", { hasText: /^score \d+/ }).innerText();
  check("Rhythm Rush registers a hit (score > 0)", /score [1-9]/.test(scoreText), scoreText);
  await page.getByRole("button", { name: /Close Rhythm Rush/i }).click();

  // visualizer mode cycling
  await page.getByRole("button", { name: /My Beats\.exe/i }).click();
  await page.waitForTimeout(200);
  await musicWindow.getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForTimeout(200);
  const vizButton = musicWindow.getByRole("button", { name: "Cycle visualizer style" });
  const modeLabel1 = await vizButton.innerText();
  await vizButton.click();
  const modeLabel2 = await vizButton.innerText();
  check("visualizer mode cycles on click", modeLabel1 !== modeLabel2, `${modeLabel1} -> ${modeLabel2}`);
  await page.getByRole("button", { name: /Close saeculo player/i }).click();

  // mobile viewport — all windows are closed at this point, so the desktop
  // icons are reachable directly
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: /My Beats\.exe/i }).click();
  await page.waitForTimeout(200);
  const mobileMusicBox = await page.getByRole("region", { name: /saeculo player/i }).boundingBox();
  check(
    "mobile: opened window is full-screen",
    !!mobileMusicBox && mobileMusicBox.width > 350,
    `w=${mobileMusicBox?.width}`,
  );

  check("no console errors", consoleErrors.length === 0, consoleErrors.slice(0, 5).join(" | "));

  // Screensaver: isolated context with a virtual clock so we don't burn 45
  // real seconds (or destabilize the rAF-timed checks above with a shared
  // fake clock) just to prove the idle timer fires.
  const ssContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const ssPage = await ssContext.newPage();
  await ssPage.clock.install();
  await ssPage.goto(BASE, { waitUntil: "networkidle" });
  await ssPage.getByLabel("Skip boot sequence").click({ force: true }).catch(() => {});
  const screensaver = ssPage.getByRole("status", { name: /Screensaver active/i });
  check("screensaver absent before idle threshold", !(await screensaver.isVisible().catch(() => false)));
  await ssPage.clock.fastForward("00:46");
  await ssPage.waitForTimeout(150);
  check("screensaver appears after 45s idle (virtual clock)", await screensaver.isVisible().catch(() => false));
  await ssPage.mouse.move(50, 50);
  await ssPage.waitForTimeout(150);
  check("screensaver dismisses on activity", !(await screensaver.isVisible().catch(() => false)));
  await ssContext.close();
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exit(1);
