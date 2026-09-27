// Browser smoke test for the desktop. Run against a local dev server:
//   npm i --no-save playwright-core && npm run dev -- -p 3210
//   node scripts/verify.mjs
import { chromium } from "playwright-core";
import { readFileSync } from "fs";

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
  const context = await browser.newContext({ viewport: { width: 1366, height: 800 }, acceptDownloads: true });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(BASE).origin });
  const page = await context.newPage();
  page.on("console", (msg) => msg.type() === "error" && !isEnvNoise(msg.text()) && consoleErrors.push(msg.text()));
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  const desktop = page.getByRole("navigation", { name: "Desktop" });
  const openFromDesktop = async (label) => {
    await desktop.getByRole("button", { name: label, exact: true }).click();
    await page.waitForTimeout(250);
  };
  const win = (title) => page.getByRole("region", { name: title, exact: true });
  const close = async (title) => {
    await page.getByRole("button", { name: `Close ${title}`, exact: true }).click();
    // windows play a short close animation before they go
    await page.getByRole("region", { name: title, exact: true }).waitFor({ state: "detached", timeout: 3000 }).catch(() => {});
  };
  const audioPaused = () => page.getByTestId("player-audio").evaluate((el) => el.paused);

  await page.goto(BASE, { waitUntil: "networkidle" });

  // ---- boot ----
  check("boot screen appears", await page.getByLabel("Skip boot sequence").isVisible().catch(() => false));
  await page.getByLabel("Skip boot sequence").click({ force: true });
  await page.waitForTimeout(300);
  check("desktop shows 7 icons", (await desktop.getByRole("button").count()) === 7);
  const welcome = win("Welcome Center");
  check("the Welcome Center greets a first visit", await welcome.getByRole("button", { name: "Play care4me" }).isVisible());
  await welcome.getByRole("checkbox", { name: "Show at startup" }).uncheck();
  await close("Welcome Center");

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

  const canvas = player.getByRole("img", { name: "Audio visualizer" });
  const f1 = await canvas.evaluate((c) => c.toDataURL());
  await page.waitForTimeout(400);
  const f2 = await canvas.evaluate((c) => c.toDataURL());
  check("visualizer animates", f1 !== f2);

  const vizBtn = player.getByRole("button", { name: "Cycle visualizer style" });
  const m1 = await vizBtn.innerText();
  check("the Cover Art visualizer is the default", m1.includes("Cover Art"), m1);
  const seekBar = player.getByRole("slider", { name: "Seek" });
  const tBefore = await page.getByTestId("player-audio").evaluate((a) => a.currentTime);
  await seekBar.focus();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(200);
  const tAfter = await page.getByTestId("player-audio").evaluate((a) => a.currentTime);
  check("the waveform seek bar moves playback", tAfter - tBefore >= 4, `${tBefore.toFixed(1)} → ${tAfter.toFixed(1)}`);
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

  // ---- start menu search → Beat Deck ----
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.keyboard.type("deck");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1200); // the game loads on demand
  const deck = win("Beat Deck");
  check("start search + Enter launches Beat Deck", await deck.getByRole("button", { name: "New run" }).isVisible());
  check("locked starting decks can't be picked yet", await deck.getByRole("radio", { name: "Trap House deck (locked)" }).isDisabled());
  await deck.getByRole("button", { name: "The Crate" }).click();
  check("the Crate lists every card, hidden until found", (await deck.getByText("???").count()) > 30);
  await deck.getByRole("button", { name: "Back" }).click();
  await deck.getByRole("button", { name: "New run" }).click();
  await page.waitForTimeout(300);
  const tour = page.getByRole("dialog", { name: "Tutorial" });
  check("a first run starts with the tutorial", await tour.isVisible());
  await tour.getByRole("button", { name: "Skip" }).click();
  const handCards = deck.getByLabel("Your hand").getByRole("button", { name: / card$/ });
  check("Beat Deck deals a hand of 8", (await handCards.count()) === 8);
  for (let i = 0; i < 3; i++) await handCards.nth(i).click();
  check(
    "selecting cards previews the beat type",
    (await deck.getByRole("button", { name: /^Play take \(3\/5\)/ }).isVisible()) && (await deck.getByText(/groove × \d+ hype base/).isVisible()),
  );
  await deck.getByRole("button", { name: /^Play take/ }).click();
  await deck.getByLabel("Groove").waitFor({ timeout: 3000 });
  await page.waitForTimeout(1500);
  check("a take plays and counts up groove", Number((await deck.getByLabel("Groove").innerText()).replace(/,/g, "")) > 0);
  await deck.getByRole("button", { name: "Skip ›" }).click();
  await page.waitForTimeout(300);
  check(
    "the take's score lands in the round",
    Number((await deck.getByLabel("Round score").innerText()).replace(/,/g, "")) > 0 && (await deck.getByLabel("Takes: 3 of 4 left").isVisible()),
  );
  const speedBtn = deck.getByRole("button", { name: /^Scoring speed/ });
  await speedBtn.click();
  check("scoring speed can be changed", (await speedBtn.getAttribute("aria-label")) === "Scoring speed: Fast");
  await speedBtn.click();
  await speedBtn.click();
  await handCards.first().click();
  await deck.getByRole("button", { name: /^Redraw selected/ }).click();
  check("redraw swaps cards and uses a redraw", await deck.getByLabel("Redraws: 2 of 3 left").isVisible());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  await openFromDesktop("Beat Deck");
  await page.waitForTimeout(1000);
  check("a run survives a reload (Continue)", await win("Beat Deck").getByRole("button", { name: /^Continue — round 1\/8/ }).isVisible());
  await close("Beat Deck");

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

  await bm.getByRole("combobox", { name: "Load preset" }).selectOption("House");
  await bm.getByRole("button", { name: "Copy share link" }).click();
  const shareLink = await bm.getByRole("textbox", { name: "Share link" }).inputValue();
  // House @124: kick 0/4/8/12 → 1111, snare 4/12 → 1010, hat 2/6/10/14 → 4444, bass → 4c4c
  check("share link encodes the loop", shareLink.endsWith("#beat=124-1111101044444c4c"), shareLink);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    bm.getByRole("button", { name: "Export loop as WAV" }).click(),
  ]);
  const wav = readFileSync(await download.path());
  check(
    "Export .wav downloads a real WAV file",
    wav.toString("ascii", 0, 4) === "RIFF" && wav.toString("ascii", 8, 12) === "WAVE" && wav.length > 500_000,
    `${download.suggestedFilename()} ${wav.length} bytes`,
  );
  await close("Beat Maker");

  const shared = await context.newPage();
  await shared.goto(shareLink, { waitUntil: "networkidle" });
  await shared.getByLabel("Skip boot sequence").click({ force: true }).catch(() => {});
  await shared.waitForTimeout(300);
  const sharedBm = shared.getByRole("region", { name: "Beat Maker", exact: true });
  check(
    "opening a share link boots into the Beat Maker with that beat",
    (await sharedBm.isVisible()) &&
      (await sharedBm.getByText("124 bpm").count()) === 1 &&
      (await sharedBm.getByLabel("bass step 4").getAttribute("aria-pressed")) === "true",
  );
  check("share hash is cleared after import", (await shared.evaluate(() => location.hash)) === "");
  // a link pasted into a tab that already has the site open only changes the hash
  await shared.evaluate(() => (location.hash = "#beat=90-0001000000000000"));
  await shared.waitForTimeout(300);
  check(
    "pasting a share link into an open Beat Maker swaps in that beat",
    (await sharedBm.getByText("90 bpm").count()) === 1 &&
      (await sharedBm.getByLabel("kick step 1", { exact: true }).getAttribute("aria-pressed")) === "true" &&
      (await sharedBm.getByLabel("bass step 4").getAttribute("aria-pressed")) === "false",
  );
  await shared.getByRole("button", { name: "Close Beat Maker" }).click();
  await sharedBm.waitFor({ state: "detached", timeout: 3000 }).catch(() => {});
  await shared.evaluate(() => (location.hash = "#beat=110-0000000100000000"));
  await shared.waitForTimeout(400);
  check(
    "pasting a share link with the Beat Maker closed opens it with that beat",
    (await sharedBm.isVisible()) &&
      (await sharedBm.getByText("110 bpm").count()) === 1 &&
      (await sharedBm.getByLabel("snare step 1", { exact: true }).getAttribute("aria-pressed")) === "true",
  );
  await shared.close();

  // ---- right-click menu + Personalize ----
  const root = page.locator("main");
  await page.mouse.click(700, 420, { button: "right" });
  check("right-click on the desktop opens a context menu", await page.getByRole("menu", { name: "Desktop menu" }).isVisible());
  await page.getByRole("menuitem", { name: "Personalize" }).click();
  await page.waitForTimeout(250);
  await page.getByRole("button", { name: "Glass color Violet" }).click();
  await page.getByRole("button", { name: "Background Dusk" }).click();
  check(
    "Personalize applies glass color and background live",
    (await root.getAttribute("data-glass")) === "violet" && (await root.getAttribute("data-wall")) === "dusk",
  );
  const thumbBg = (label) =>
    page.getByRole("button", { name: `Background ${label}` }).locator("span").first().evaluate((el) => getComputedStyle(el).backgroundImage);
  check("wallpaper thumbnails preview their own background", (await thumbBg("Aurora")) !== (await thumbBg("Dusk")));
  await page.getByRole("button", { name: "OK", exact: true }).click();

  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.getByRole("navigation", { name: "Start menu" }).getByRole("button", { name: "Personalize" }).first().click();
  await page.getByRole("button", { name: "Glass color Rose" }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  check("Cancel restores the previous look", (await root.getAttribute("data-glass")) === "violet");

  await page.reload({ waitUntil: "networkidle" });
  await page.getByLabel("Skip boot sequence").click({ force: true }).catch(() => {});
  await page.waitForTimeout(300);
  check(
    "the chosen look survives a reload",
    (await root.getAttribute("data-glass")) === "violet" && (await root.getAttribute("data-wall")) === "dusk",
  );

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
  check(
    "Recycle Bin empties, except vault.zip",
    (await bin.getByRole("row").count()) === 2 &&
      (await bin.getByText("vault.zip could not be deleted: the file is in use.").isVisible()),
  );
  await close("Recycle Bin");

  // ---- release countdown ----
  await openFromDesktop("next_single.exe");
  const release = win("Downloading next_single.exe");
  await page.waitForTimeout(1200); // the shared clock ticks once a second
  check(
    "next_single.exe counts down to the release",
    /^\d+d \d\d:\d\d:\d\d$/.test(await release.getByLabel("Time left").innerText()) &&
      Number(await release.getByRole("progressbar").getAttribute("aria-valuenow")) >= 0,
    await release.getByLabel("Time left").innerText(),
  );
  await close("Downloading next_single.exe");

  // ---- secret hunt: three hidden words open vault.zip ----
  const balloon = page.getByRole("status").filter({ hasText: "Hidden word found" });
  await openFromDesktop("about.txt");
  await win("about.txt - Notepad").getByRole("button", { name: "Edit" }).click();
  await page.waitForTimeout(200);
  check("selecting about.txt reveals word 1", (await balloon.innerText().catch(() => "")).includes("(1/3)"));
  await close("about.txt - Notepad");

  await page.mouse.click(700, 600);
  for (const key of ["ArrowUp", "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"]) {
    await page.keyboard.press(key);
  }
  await page.waitForTimeout(200);
  check("the Konami code reveals word 3", (await balloon.innerText().catch(() => "")).includes("Word 3 is LOOPS"));

  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.getByRole("textbox", { name: "Start Search" }).fill("vault");
  check("Start Search denies access to the vault", await page.getByText(/vault is not accessible/).isVisible());
  await page.keyboard.press("Escape");

  await openFromDesktop("Recycle Bin");
  await win("Recycle Bin").getByRole("row", { name: /vault\.zip/ }).dblclick();
  await page.waitForTimeout(250);
  const vault = win("vault.zip");
  await vault.getByLabel("Vault password").fill("letmein");
  await vault.getByRole("button", { name: "Extract" }).click();
  check("a wrong vault password is refused", await vault.getByText("The password is incorrect.", { exact: false }).isVisible());
  await vault.getByLabel("Vault password").fill("Late Night Loops");
  await vault.getByRole("button", { name: "Extract" }).click();
  await page.waitForTimeout(200);
  check("the right password opens the vault", await vault.getByRole("list", { name: "Unreleased snippets" }).isVisible());
  await vault.getByRole("button", { name: /^Play untitled_0412/ }).click();
  await page.waitForTimeout(300);
  check("a vault snippet plays", await vault.getByRole("button", { name: /^Pause untitled_0412/ }).isVisible());
  await vault.getByRole("button", { name: /^Pause untitled_0412/ }).click();
  await close("vault.zip");
  await close("Recycle Bin");

  // ---- player polish: track links, saved volume, lock-screen info ----
  await page.goto(`${BASE}/#track=elbtunnel`, { waitUntil: "networkidle" });
  await page.getByLabel("Skip boot sequence").click({ force: true }).catch(() => {});
  await page.waitForTimeout(400);
  const linked = win("saeculo Media Player");
  check(
    "a #track= link opens the player on that track",
    (await linked.isVisible()) && (await linked.getByText("elbtunnel", { exact: true }).first().isVisible()),
  );
  check("the track hash is cleared after opening", (await page.evaluate(() => location.hash)) === "");
  await linked.getByRole("tab", { name: "Library" }).click();
  await linked.getByRole("button", { name: "Copy link to elbtunnel" }).click();
  check(
    "Copy link copies a direct track link",
    (await page.evaluate(() => navigator.clipboard.readText())).endsWith("/#track=elbtunnel"),
  );
  await linked.getByRole("slider", { name: "Volume" }).fill("0.35");
  await linked.getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForTimeout(600);
  check(
    "lock-screen controls show the track and cover",
    await page.evaluate(
      () => navigator.mediaSession.metadata?.title === "elbtunnel" && /covers\/elbtunnel\.jpg$/.test(navigator.mediaSession.metadata?.artwork[0]?.src ?? ""),
    ),
  );
  await linked.getByRole("button", { name: "Pause", exact: true }).click();
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  check(
    "the volume setting survives a reload",
    Math.abs((await page.getByTestId("player-audio").evaluate((a) => a.volume)) - 0.35) < 0.01,
  );
  check(
    "the player shows the track length before playing",
    await page.waitForFunction(() => {
      const a = document.querySelector("[data-testid=player-audio]");
      return a && Number.isFinite(a.duration) && a.duration > 60;
    }, null, { timeout: 5000 }).then(() => true, () => false),
  );

  // ---- Beat Deck: beating the first boss, the shop ----
  await page.evaluate(() => {
    const run = JSON.parse(localStorage.getItem("saeculo-beatdeck-run"));
    Object.assign(run, { phase: "won", round: 3, score: 1000, target: 1000, reward: { base: 6, takes: 1, interest: 0, chain: 0, register: 0, total: 7, session: null }, money: 20, sessions: ["saturate"] });
    run.plan[2] = "label";
    localStorage.setItem("saeculo-beatdeck-run", JSON.stringify(run));
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  await openFromDesktop("Beat Deck");
  await page.waitForTimeout(1000);
  await win("Beat Deck").getByRole("button", { name: /^Continue/ }).click();
  const won = page.getByRole("dialog", { name: "Round complete" });
  check("beating the first boss drops the vault's word 2", (await won.innerText()).includes("SCRAP OF PAPER") && (await balloon.innerText().catch(() => "")).includes("Word 2 is NIGHT"));
  await won.getByRole("button", { name: "Visit the shop ›" }).click();
  const shop = win("Beat Deck").getByLabel("Shop");
  const gearBuy = shop.getByRole("button", { name: /^Buy .* for \$/ }).first();
  const gearName = (await gearBuy.getAttribute("aria-label")).replace(/^Buy (.*) for .*$/, "$1");
  await gearBuy.click();
  check("the shop sells gear", await win("Beat Deck").getByLabel("Gear").getByRole("button", { name: gearName }).isVisible(), gearName);
  await shop.getByRole("button", { name: "Next client ›" }).click();
  check("the next client starts round 4", await win("Beat Deck").getByText("ROUND 4/8").isVisible());
  const bd = win("Beat Deck");
  await bd.getByLabel("Your hand").getByRole("button", { name: / card$/ }).first().click();
  await bd.getByLabel("Studio sessions").getByRole("button", { name: /Saturator/ }).click();
  await bd.getByRole("button", { name: "Use", exact: true }).click();
  check("a studio session upgrades a card", (await bd.getByLabel("Your hand").getByRole("button", { name: /\(Tape-saturated\)$/ }).count()) === 1);
  await close("Beat Deck");

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
  const noWelcome = () => localStorage.setItem("saeculo-welcome", "off");
  const ssContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ssContext.addInitScript(noWelcome);
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
  await mContext.addInitScript(noWelcome);
  const m = await mContext.newPage();
  await m.goto(BASE, { waitUntil: "networkidle" });
  await m.getByLabel("Skip boot sequence").click({ force: true });
  await m.getByRole("navigation", { name: "Desktop" }).getByRole("button", { name: "Beat Deck", exact: true }).tap();
  await m.waitForTimeout(1200); // the game loads on demand; the open animation (scale .94→1) settles
  const gBox = await m.getByRole("region", { name: "Beat Deck", exact: true }).boundingBox();
  check("mobile: windows open full-screen", gBox.width >= 389, `w=${gBox?.width}`);
  await m.getByRole("button", { name: "New run" }).tap();
  await m.getByRole("dialog", { name: "Tutorial" }).getByRole("button", { name: "Skip" }).tap();
  await m.getByLabel("Your hand").getByRole("button", { name: / card$/ }).first().tap();
  check("mobile: Beat Deck plays with taps", await m.getByRole("button", { name: /^Play take \(1\/5\)/ }).isVisible());
  await m.getByLabel("Taskbar").getByRole("button", { name: "Start", exact: true }).tap();
  await m.getByRole("textbox", { name: "Start Search" }).fill("up up down down left right left right b a");
  await m.waitForTimeout(200);
  check(
    "mobile: the cheat code typed into Start Search reveals word 3",
    (await m.getByRole("status").filter({ hasText: "Hidden word found" }).innerText().catch(() => "")).includes("LOOPS"),
  );
  for (const title of ["Beat Deck"]) {
    await m.getByRole("button", { name: `Close ${title}`, exact: true }).tap().catch(() => {});
    await m.getByRole("region", { name: title, exact: true }).waitFor({ state: "detached", timeout: 3000 }).catch(() => {});
  }
  await m.waitForTimeout(200);
  await m.getByRole("navigation", { name: "Desktop" }).getByRole("button", { name: "Beat Maker", exact: true }).tap();
  await m.waitForTimeout(500);
  const cell = await m.getByRole("button", { name: "kick step 1", exact: true }).boundingBox();
  check("mobile: Beat Maker steps are big enough to tap", cell.width >= 28, `${Math.round(cell.width)}px`);
  await mContext.close();

  // ---- iPhone: plain <audio> (keeps playing with the screen locked) ----
  const iContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  });
  await iContext.addInitScript(noWelcome);
  const ip = await iContext.newPage();
  await ip.goto(BASE, { waitUntil: "networkidle" });
  await ip.getByLabel("Skip boot sequence").click({ force: true });
  await ip.getByRole("navigation", { name: "Desktop" }).getByRole("button", { name: "Media Player", exact: true }).tap();
  await ip.waitForTimeout(400);
  await ip.getByRole("button", { name: "Play", exact: true }).tap();
  await ip.waitForTimeout(800);
  const canvasHash = () =>
    ip.evaluate(() => {
      const c = document.querySelector('section[aria-label="saeculo Media Player"] canvas');
      const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      let h = 0;
      for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) >>> 0;
      return h;
    });
  const h1 = await canvasHash();
  await ip.waitForTimeout(300);
  const h2 = await canvasHash();
  check(
    "iPhone: music plays without the Web Audio graph, and the visualizer still moves",
    !(await ip.getByTestId("player-audio").evaluate((a) => a.paused)) && h1 !== h2,
  );
  await iContext.close();
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exit(1);
