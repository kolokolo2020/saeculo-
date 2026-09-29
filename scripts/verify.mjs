// Browser checks for the site and the game. Run against a dev server:
//   npm i --no-save playwright-core axe-core
//   npx next dev -p 3210
//   node scripts/verify.mjs
// (axe-core is optional: without it the accessibility audit is skipped.)
import { chromium } from "playwright-core";
import { readFileSync } from "fs";
import { createRequire } from "module";

let axeSource = null;
try {
  axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
} catch {
  console.log("(axe-core not installed: skipping the accessibility audit)");
}

const BASE = process.env.BASE_URL ?? "http://localhost:3210";
const CHROME = process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const results = [];
function check(name, ok, extra = "") {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${extra ? " — " + extra : ""}`);
}
const isEnvNoise = (t) => /vercel-scripts|speed-insights|ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|ytimg|status of 503|status of 404/.test(t);
const errors = [];

const browser = await chromium.launch({ executablePath: CHROME, args: ["--autoplay-policy=no-user-gesture-required"] });

async function open({ seen = true, viewport = { width: 1366, height: 800 }, hash = "", reduced = false, mobile = false, init } = {}) {
  const ctx = await browser.newContext({
    viewport,
    reducedMotion: reduced ? "reduce" : "no-preference",
    ...(mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}),
  });
  await ctx.addInitScript(
    ([seen, init]) => {
      if (sessionStorage.getItem("verify-init")) return;
      sessionStorage.setItem("verify-init", "1");
      if (seen) localStorage.setItem("saeculo-intro-seen", "1");
      if (init) for (const [k, v] of Object.entries(init)) localStorage.setItem(k, v);
    },
    [seen, init ?? null],
  );
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && !isEnvNoise(m.text()) && errors.push(m.text()));
  await page.goto(BASE + "/" + hash, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  return { ctx, page };
}
const audio = (page) =>
  page.evaluate(() => {
    const a = document.querySelector("audio");
    return { paused: a.paused, t: a.currentTime, src: a.getAttribute("src") ?? a.src };
  });
const game = (page) => page.evaluate(() => window.__game.state());
/** Click the waveform at a point in time. */
async function seekTo(page, seconds) {
  const wave = page.getByTestId("waveform");
  const box = await wave.boundingBox();
  const dur = await page.evaluate(() => document.querySelector("audio").duration);
  await page.mouse.click(box.x + (box.width * seconds) / dur, box.y + box.height / 2);
}
const hold = async (page, key, ms) => {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
};

try {
  // ---------------------------------------------------------------- intro
  {
    const { ctx, page } = await open({ seen: false });
    const intro = page.getByRole("dialog", { name: "Intro" });
    check("first visit: intro shows", await intro.isVisible());
    await page.keyboard.press("a");
    await page.waitForTimeout(700);
    check("intro: any key goes in", (await page.getByRole("button", { name: /enter/i }).count()) === 0);
    check("intro: entering starts the music", !(await audio(page)).paused);
    await page.getByRole("button", { name: /skip/i }).click();
    await page.waitForTimeout(500);
    check("intro: skip lands on the desktop with Beats open", (await intro.count()) === 0 && (await page.getByTestId("window-beats").isVisible()));
    check("intro: remembered", (await page.evaluate(() => localStorage.getItem("saeculo-intro-seen"))) === "1");
    check("intro: music carries on after it", !(await audio(page)).paused);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    check("returning visit: no intro", (await page.getByRole("dialog", { name: "Intro" }).count()) === 0);
    await page.getByRole("button", { name: "Clock and settings" }).click();
    await page.getByRole("menuitem", { name: "Replay intro" }).click();
    await page.waitForTimeout(300);
    check("replay intro from the clock menu", await page.getByRole("dialog", { name: "Intro" }).isVisible());
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    check("Escape skips the intro", (await page.getByRole("dialog", { name: "Intro" }).count()) === 0);
    await ctx.close();
  }

  // ---------------------------------------------------------------- beats
  {
    const { ctx, page } = await open();
    check("Beats opens by default", await page.getByTestId("window-beats").isVisible());
    check("folder lists the tracks", (await page.locator("[data-testid^=track-]").count()) === 3);
    await page.getByTestId("deck-play").click();
    await page.waitForTimeout(1200);
    const a1 = await audio(page);
    check("play", !a1.paused && a1.t > 0);
    check("LCD says playing", (await page.getByTestId("lcd").textContent()).includes("PLAYING"));
    await seekTo(page, 60);
    await page.waitForTimeout(300);
    const t60 = (await audio(page)).t;
    check("seek on the waveform", t60 >= 57 && t60 <= 64, String(t60));
    await page.getByTestId("waveform").focus();
    await page.keyboard.press("ArrowRight");
    check("waveform: arrow keys step", (await audio(page)).t >= t60 + 4);
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.waitForTimeout(800);
    const a2 = await audio(page);
    check("next track", a2.src.includes("elbtunnel") && !a2.paused);
    check("active row follows", (await page.getByTestId("track-elbtunnel").getAttribute("aria-current")) === "true");
    await page.getByTestId("track-dull-knife").click();
    await page.waitForTimeout(600);
    check("pick from the folder", (await audio(page)).src.includes("dull-knife"));
    await seekTo(page, 20);
    await page.getByRole("button", { name: "Previous" }).click();
    await page.waitForTimeout(600);
    const a3 = await audio(page);
    check("previous restarts the track", a3.t < 2 && a3.src.includes("dull-knife"));
    await page.waitForTimeout(600);
    const drawn = await page.evaluate(() => {
      const c = document.querySelector("[data-testid=window-beats] canvas");
      const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      let lit = 0;
      for (let i = 0; i < d.length; i += 400) lit += d[i] + d[i + 1] + d[i + 2] > 60 ? 1 : 0;
      return lit;
    });
    check("visualizer draws the cover", drawn > 50, String(drawn));
    await page.getByRole("button", { name: /visuals:/ }).click();
    check("visuals: scan mode", (await page.getByRole("button", { name: /visuals:/ }).textContent()).includes("scan"));
    await page.waitForTimeout(400);
    check("scan mode draws", await page.evaluate(() => {
      const c = document.querySelector("[data-testid=window-beats] canvas");
      const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      let lit = 0;
      for (let i = 0; i < d.length; i += 400) lit += d[i] + d[i + 1] + d[i + 2] > 60 ? 1 : 0;
      return lit > 50;
    }));
    await page.getByRole("button", { name: /visuals:/ }).click();
    check("visuals: still mode", (await page.evaluate(() => document.documentElement.dataset.calm)) === "true");
    await page.getByRole("button", { name: /visuals:/ }).click();
    check("visuals: back to reveal", (await page.getByRole("button", { name: /visuals:/ }).textContent()).includes("reveal"));
    await page.getByRole("button", { name: "Repeat this beat" }).click();
    await page.getByRole("button", { name: "Shuffle" }).click();
    const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem("saeculo-player")));
    check("repeat and shuffle, remembered", prefs.repeatOne === true && prefs.shuffle === true);
    await page.getByRole("button", { name: "Repeat this beat" }).click();
    await page.getByRole("button", { name: "Shuffle" }).click();
    check("the tab shows what's playing", (await page.title()).startsWith("▶ "));
    // keyboard shortcuts, from the desktop
    await page.locator("main").click({ position: { x: 700, y: 700 } });
    await page.keyboard.press("Space");
    await page.waitForTimeout(200);
    check("shortcut: Space pauses", (await audio(page)).paused);
    await page.keyboard.press("Space");
    await page.waitForTimeout(300);
    check("shortcut: Space plays", !(await audio(page)).paused);
    await page.keyboard.press("2");
    await page.waitForTimeout(200);
    check("shortcut: 2 opens Socials", await page.getByTestId("window-socials").isVisible());
    await page.keyboard.press("?");
    check("shortcut: ? lists the shortcuts", await page.getByTestId("shortcuts").isVisible());
    await page.keyboard.press("Escape");
    check("shortcuts card closes", (await page.getByTestId("shortcuts").count()) === 0);
    await page.getByRole("button", { name: "Close Socials" }).click();
    await page.locator("[data-testid=window-beats] .win-title").dblclick();
    await page.waitForTimeout(200);
    const maxed = await page.getByTestId("window-beats").boundingBox();
    check("double-click maximises a window", maxed.width > 1300);
    await page.getByRole("button", { name: "Restore Beats" }).click();
    await page.getByRole("button", { name: "Close Beats" }).click();
    await page.getByTestId("icon-socials").click();
    await page.waitForTimeout(400);
    check("music keeps playing with Beats closed", !(await audio(page)).paused);
    check("compact player shows the track", (await page.getByTestId("mini-player").textContent()).includes("dull knife"));
    await page.getByTestId("mini-play").click();
    await page.waitForTimeout(200);
    check("compact player pauses", (await audio(page)).paused);
    await page.getByTestId("mini-play").click();
    await page.waitForTimeout(300);
    const links = await page.locator("[data-testid=window-socials] a").evaluateAll((as) => as.map((a) => [a.href, a.target]));
    check("socials: five real links, new tab", links.length === 5 && links.every(([h, t]) => h.startsWith("https://") && t === "_blank"));
    await page.getByTestId("icon-beats").click();
    await page.getByRole("slider", { name: "Volume" }).fill("0.3");
    check("volume", Math.abs((await page.evaluate(() => document.querySelector("audio").volume)) - 0.3) < 0.01);
    await ctx.close();
  }

  // share link, unavailable file, reduced motion
  {
    const { ctx, page } = await open({ seen: false, hash: "#track=elbtunnel" });
    check("share link skips the intro", (await page.getByRole("dialog", { name: "Intro" }).count()) === 0);
    check("share link selects the track", (await page.getByTestId("track-elbtunnel").getAttribute("aria-current")) === "true");
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 800 } });
    await ctx.addInitScript(() => localStorage.setItem("saeculo-intro-seen", "1"));
    await ctx.route("**/audio/care4me.mp3", (r) => r.fulfill({ status: 404, body: "" }));
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.getByTestId("deck-play").click();
    await page.waitForTimeout(1000);
    check("missing file: player says so", (await page.getByTestId("lcd").textContent()).includes("FILE UNAVAILABLE"));
    check("missing file: row marked", (await page.getByTestId("track-care4me").textContent()).includes("unavailable"));
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.waitForTimeout(800);
    check("missing file: next still plays", !(await audio(page)).paused);
    await ctx.close();
  }
  {
    const { ctx, page } = await open({ reduced: true });
    check("reduced motion: visuals start still", (await page.getByRole("button", { name: /visuals:/ }).textContent()).includes("still"));
    await ctx.close();
  }

  // ---------------------------------------------------------------- contact
  {
    const { ctx, page } = await open();
    await page.getByTestId("icon-contact").click();
    const win = page.getByTestId("window-contact");
    await win.getByRole("button", { name: "Send" }).click();
    check("contact: empty form shows three errors", (await win.locator("[aria-invalid=true]").count()) === 3);
    check("contact: focus goes to the first problem", await page.evaluate(() => document.activeElement?.id === "contact-name"));
    await win.getByLabel("Name").fill("Test");
    await win.getByLabel("Email").fill("not-an-email");
    await win.getByLabel("Message").fill("Hello, this is a test message.");
    await win.getByRole("button", { name: "Send" }).click();
    check("contact: bad email caught", (await win.getByText("doesn't look right").count()) === 1);
    await win.getByLabel("Email").fill("test@example.com");
    const res = page.waitForResponse("**/api/contact");
    await win.getByRole("button", { name: "Send" }).click();
    const r = await res;
    await page.waitForTimeout(300);
    if (r.status() === 503) {
      check("contact: unconfigured delivery is reported honestly", (await win.getByRole("alert").textContent()).includes("not sent"));
      check("contact: no fake success", (await win.getByText("Sent. Thank you.").count()) === 0);
    } else check("contact: delivery answered", r.status() === 200, String(r.status()));
    await page.route("**/api/contact", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }));
    await win.getByRole("button", { name: "Send" }).click();
    await page.waitForTimeout(300);
    check("contact: success only when the server confirms", (await win.getByText("Sent. Thank you.").count()) === 1);
    await ctx.close();
  }

  // ---------------------------------------------------------------- game
  {
    const { ctx, page } = await open({ init: { "saeculo-game": JSON.stringify({ found: [], tapes: [null, null, null, null], seenHelp: false, unseen: [] }) } });
    await page.getByTestId("deck-play").click();
    await page.waitForTimeout(800);
    await page.getByTestId("icon-game").click();
    await page.waitForTimeout(1800);
    check("game opens in the bedroom", (await page.getByTestId("game").getAttribute("data-place")) === "bedroom");
    const held = await audio(page);
    check("game: site music paused, position kept", held.paused && held.t > 0);
    check("game: controls card on first visit", await page.getByTestId("game-help").isVisible());
    await page.evaluate(() => document.querySelector("audio").play());
    await page.waitForTimeout(300);
    check("game: nothing can start the site music underneath (a media key, say)", (await audio(page)).paused);
    await page.keyboard.press("e");
    await page.waitForTimeout(200);
    check("game: starts at the laptop", (await page.getByTestId("game-prompt").textContent()).includes("laptop"));
    const x0 = (await game(page)).x;
    await hold(page, "ArrowRight", 900);
    check("game: walking", (await game(page)).x > x0 + 30);
    await hold(page, "ArrowUp", 250);
    await page.keyboard.press("e");
    await page.waitForTimeout(400);
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("saeculo-game")));
    check("game: the window gives the rain sound", (await saved()).found.includes("rain"));
    check("game: dialog shows", await page.getByTestId("game-dialog").isVisible());
    await page.keyboard.press("e");
    await page.evaluate(() => window.__game.teleport("bedroom", 18, 6.5, "right"));
    await hold(page, "ArrowRight", 500);
    await page.waitForTimeout(600);
    check("game: door to the street", (await page.getByTestId("game").getAttribute("data-place")) === "street");
    await page.evaluate(() => window.__game.teleport("street", 26.5, 4.6, "up"));
    await page.waitForTimeout(200);
    await page.keyboard.press("e");
    await page.waitForTimeout(300);
    check("game: the payphone gives the phone sound", (await saved()).found.includes("phone"));
    await page.keyboard.press("Escape");
    await page.evaluate(() => window.__game.teleport("store", 10.5, 5.6, "up"));
    await page.waitForTimeout(200);
    await page.keyboard.press("e");
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: "Just water" }).click();
    await page.waitForTimeout(300);
    check("game: the store gives the bottle sound", (await saved()).found.includes("bottle"));
    await page.keyboard.press("Escape");
    await page.evaluate(() => window.__game.teleport("street", 9, 4.4, "up"));
    await page.waitForTimeout(200);
    await page.keyboard.press("e");
    await page.waitForTimeout(250);
    await page.getByRole("button", { name: "Sit and smoke" }).click();
    await page.waitForTimeout(300);
    check("game: the bench gives the lighter", (await saved()).found.includes("lighter"));
    await page.keyboard.press("Escape");
    await page.evaluate(() => window.__game.teleport("studio", 8, 3.7, "up"));
    await page.waitForTimeout(200);
    await page.keyboard.press("e");
    await page.waitForTimeout(500);
    const studio = page.getByTestId("studio");
    const st = () => page.evaluate(() => window.__game.studio());
    check("game: the studio opens", await studio.isVisible());
    check("studio: opens on a starter project", (await st()).project.channels.length >= 6, (await st()).project.name);
    await studio.getByRole("tab", { name: /Found/ }).click();
    check("studio: found sounds are in the browser", (await studio.getByRole("button", { name: /Put bottle on/ }).count()) === 1);
    await page.getByTestId("studio-play").click();
    await page.waitForTimeout(1000);
    const p1 = (await st()).position;
    check("studio: plays, playhead moving", (await st()).playing && p1.step >= 0);
    check("studio: first-time hints, crossed off as you go", (await studio.getByTestId("studio-tips").isVisible()) && (await studio.locator("[data-testid=studio-tips] [data-done=true]").count()) === 1);
    check("studio: rack shows the playhead", (await studio.locator("[data-now=true]").count()) >= 1);
    check("studio: no website music underneath", (await audio(page)).paused);
    const n0 = (await st()).project.channels.length;
    await studio.getByRole("tab", { name: /Kicks/ }).click();
    await studio.getByRole("button", { name: "Add boom kick as a new channel" }).click();
    check("studio: add a channel from the browser", (await st()).project.channels.length === n0 + 1);
    const step = studio.getByRole("button", { name: "boom kick step 3", exact: true });
    await step.click();
    check("studio: toggle a step", (await step.getAttribute("aria-pressed")) === "true");
    await studio.getByRole("button", { name: /rhodes: open the piano roll/ }).click();
    await studio.getByRole("button", { name: "chord: 7th" }).click();
    const roll = studio.locator("[data-testid=piano-roll] [role=application]");
    const before = Number(await roll.getAttribute("data-notes"));
    const rb = await roll.boundingBox();
    await roll.click({ position: { x: 31 * (rb.width / 32) + 4, y: 16 * 5 + 5 } });
    const after = Number(await roll.getAttribute("data-notes"));
    check("piano roll: the chord tool stamps a 7th chord", after - before === 4, `${before} → ${after}`);
    // playing live over the loop, and recording it
    const rhodesId = (await st()).project.channels.find((c) => c.voice === "rhodes").id;
    const notesOf = async () => ((await st()).project.patterns[(await st()).position.pattern].notes[rhodesId] ?? []).length;
    const nLive = await notesOf();
    await page.keyboard.down("KeyG");
    await page.waitForTimeout(150);
    check("studio: the computer keyboard plays notes live", (await studio.locator("[data-testid=studio-keys] [data-down=true]").count()) === 1);
    await page.keyboard.up("KeyG");
    const n0rec = await notesOf();
    check("studio: live notes aren't written unless recording", n0rec === nLive);
    await page.getByTestId("studio-rec").click();
    await page.keyboard.down("KeyH");
    await page.waitForTimeout(400);
    await page.keyboard.up("KeyH");
    await page.waitForTimeout(100);
    check("studio: rec writes what you play into the pattern", (await notesOf()) === n0rec + 1, `${n0rec} → ${await notesOf()}`);
    await page.keyboard.press("KeyX");
    check("studio: X moves the keyboard up an octave", (await studio.getByRole("button", { name: /^C4 \(A\)/ }).count()) === 1);
    await page.keyboard.press("KeyZ");
    await page.getByTestId("studio-rec").click();
    check("studio: tips cross off steps and keys", (await studio.locator("[data-testid=studio-tips] [data-done=true]").count()) === 3);
    const kit = await page.evaluate(() => window.__game.kitLevels());
    const off = Object.entries(kit).filter(([, v]) => v.peak < 0.08 || v.peak > 0.95);
    check("studio: every synthesized sound is audible and none clips", off.length === 0, off.map(([k, v]) => `${k} ${v.peak}`).join(", "));
    await studio.getByRole("button", { name: "Mute dusty kick" }).click();
    check("studio: mute", (await st()).project.channels.find((c) => c.voice === "kick-dusty").mute === true);
    await studio.getByRole("button", { name: "Faster" }).click();
    check("studio: tempo", (await st()).project.tempo === 85);
    await studio.getByRole("button", { name: "Edit pattern B" }).click();
    await page.getByTestId("studio-mode").click();
    await page.waitForTimeout(700);
    check("studio: song mode plays the arrangement", (await st()).project.mode === "song" && (await st()).position.slot >= 0);
    await studio.getByRole("tab", { name: "mixer" }).click();
    check("studio: mixer", await studio.getByTestId("studio-mixer").isVisible());
    await studio.getByRole("tab", { name: "song" }).click();
    check("studio: song arranger", (await studio.getByTestId("studio-song").locator("button[aria-label^=Slot]").count()) === 16);
    await studio.getByText("project ▾", { exact: true }).click();
    await studio.getByRole("button", { name: "save", exact: true }).first().click();
    const slots = await page.evaluate(() => JSON.parse(localStorage.getItem("saeculo-studio")).slots);
    check("studio: save to a slot", slots[0] && slots[0].tempo === 85);
    const dl = page.waitForEvent("download", { timeout: 20000 });
    await page.getByTestId("studio-export").click();
    const file = await dl;
    const bytes = readFileSync(await file.path());
    check("studio: export the song as WAV", bytes.length > 100000 && bytes.slice(0, 4).toString() === "RIFF", `${bytes.length} bytes`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    check("studio: Escape back to the room", (await studio.count()) === 0 && !(await st()).playing);
    await page.evaluate(() => window.__game.teleport("bedroom", 12, 4.6, "up"));
    await page.waitForTimeout(250);
    check("game: your beat is on the shelf", (await page.getByTestId("game-prompt").textContent()).includes("play a tape"));
    // the neighbourhood: people, music, traffic, the park and the roof
    const lifeNow = () => page.evaluate(() => window.__game.life());
    await page.evaluate(() => window.__game.teleport("street", 18.4, 5.9, "up"));
    await page.waitForTimeout(1500);
    check("street: the boombox is playing", (await lifeNow()).music === "street");
    await page.keyboard.press("e");
    await page.waitForTimeout(300);
    const crewText = await page.getByTestId("game-dialog").textContent();
    check("street: talk to the crew", crewText.length > 5, crewText.slice(0, 40));
    const give = page.getByRole("button", { name: /^Play them/ });
    check("street: they'll play your tape", (await give.count()) === 1);
    await give.click();
    await page.waitForTimeout(1200);
    check("street: your tape on the boombox", (await lifeNow()).musicProject === (await page.evaluate(() => JSON.parse(localStorage.getItem("saeculo-studio")).slots[0].name)));
    await page.keyboard.press("Escape");
    // stand in the road until a car comes
    await page.evaluate(() => window.__game.teleport("street", 20, 7.5, "down"));
    let stoppedCar = false;
    for (let i = 0; i < 40 && !stoppedCar; i++) {
      await page.waitForTimeout(500);
      stoppedCar = (await lifeNow()).actors.some((a) => a.kind === "car" && a.stopped > 0.5);
    }
    check("street: traffic stops for you", stoppedCar);
    check("street: the dog walker walks", (await lifeNow()).actors.some((a) => a.id === "walker"));
    await page.evaluate(() => window.__game.teleport("studio", 12.9, 5.7, "down"));
    await page.waitForTimeout(1000);
    check("studio: the monitors are on", (await lifeNow()).music === "studio");
    await page.keyboard.press("e");
    await page.waitForTimeout(300);
    check("studio: someone to talk to on the couch", await page.getByTestId("game-dialog").isVisible());
    await page.keyboard.press("Escape");
    await page.evaluate(() => window.__game.teleport("street", 2, 5, "left"));
    await page.keyboard.down("ArrowLeft");
    await page.waitForTimeout(700);
    await page.keyboard.up("ArrowLeft");
    await page.waitForTimeout(700);
    check("street → the park", (await page.getByTestId("game").getAttribute("data-place")) === "park");
    const pigeonsBefore = (await lifeNow()).actors.filter((a) => a.kind === "pigeon" && a.place === "park" && a.fly !== null).length;
    await page.evaluate(() => window.__game.teleport("park", 6.8, 4.6, "up"));
    await page.waitForTimeout(500);
    const pigeonsAfter = (await lifeNow()).actors.filter((a) => a.kind === "pigeon" && a.place === "park" && a.fly !== null).length;
    check("park: pigeons scatter", pigeonsAfter > pigeonsBefore);
    await page.evaluate(() => window.__game.teleport("park", 26, 3.4, "up"));
    await page.waitForTimeout(250);
    await page.keyboard.press("e");
    await page.waitForTimeout(300);
    check("park: shooting hoops gives the basketball", (await saved()).found.includes("basketball"));
    await page.keyboard.press("Escape");
    await page.evaluate(() => window.__game.teleport("street", 10.5, 3.6, "up"));
    await page.keyboard.down("ArrowUp");
    await page.waitForTimeout(500);
    await page.keyboard.up("ArrowUp");
    await page.waitForTimeout(700);
    check("street → the roof by the fire escape", (await page.getByTestId("game").getAttribute("data-place")) === "rooftop");
    await page.evaluate(() => window.__game.teleport("rooftop", 8.6, 5.4, "up"));
    await page.waitForTimeout(250);
    await page.keyboard.press("e");
    await page.waitForTimeout(300);
    check("roof: the wind chimes", (await saved()).found.includes("chimes"));
    await page.keyboard.press("Escape");
    check("roof: someone on the ledge", (await lifeNow()).actors.some((a) => a.id === "ledge"));

    await page.getByTestId("game-exit").click();
    await page.waitForTimeout(1400);
    check("game: exit returns to the site", (await page.getByTestId("game").count()) === 0);
    check("game: music picks up where it was", !(await audio(page)).paused);
    await page.getByTestId("icon-game").click();
    await page.waitForTimeout(1600);
    check("game: remembers found sounds", (await page.getByTestId("game").textContent()).includes("sounds 6/6"));
    await page.getByTestId("game-to-studio").click();
    await page.waitForTimeout(500);
    check("game: straight to the studio", (await page.getByTestId("studio").isVisible()) && (await page.getByTestId("game").getAttribute("data-place")) === "studio");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(1400);
    check("game: Escape exits", (await page.getByTestId("game").count()) === 0);
    await ctx.close();
  }

  // ---------------------------------------------------------------- sample this
  {
    const { ctx, page } = await open({ init: { "saeculo-game": JSON.stringify({ found: [], seenHelp: true, unseen: [] }) } });
    await page.getByTestId("deck-play").click();
    await page.waitForTimeout(800);
    await seekTo(page, 40);
    await page.waitForTimeout(300);
    await page.getByTestId("sample-this").click();
    await page.waitForTimeout(2500);
    const st = await page.evaluate(() => window.__game?.studio());
    const cuts = st?.project.channels.filter((c) => c.voice.startsWith("cut:care4me:")) ?? [];
    check("sample this: opens the studio with the beat cut into four pieces", (await page.getByTestId("studio").isVisible()) && cuts.length === 4);
    check("sample this: cut from where the player was", cuts.length > 0 && Math.abs(Number(cuts[0].voice.split(":")[2]) * (60 / 142.68) - 40) < 4, cuts[0]?.voice);
    check("sample this: at the track's tempo and key, and playing", st.project.tempo === 143 && st.project.key === 5 && st.project.scale === "major" && st.playing);
    check("sample this: the site player is paused, not underneath", (await audio(page)).paused);
    await page.getByTestId("studio").getByRole("button", { name: "Undo" }).click();
    check("sample this: undo brings back the project you had", !(await page.evaluate(() => window.__game.studio())).project.channels.some((c) => c.voice.startsWith("cut:")));
    await page.keyboard.press("Escape");
    await page.getByTestId("game-exit").click();
    await page.waitForTimeout(1500);
    check("sample this: back on the site, the music picks up", !(await audio(page)).paused);
    await ctx.close();
  }

  // ---------------------------------------------------------------- phone
  {
    const { ctx, page } = await open({ viewport: { width: 390, height: 844 }, mobile: true });
    const w = await page.getByTestId("window-beats").boundingBox();
    check("phone: windows fill the screen", w && w.width >= 385);
    check("phone: no sideways scroll", await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.getByRole("button", { name: "Close Beats" }).tap();
    await page.getByTestId("icon-game").tap();
    await page.waitForTimeout(1800);
    check("phone: touch pad in the game", await page.getByRole("button", { name: "Walk right" }).isVisible());
    await page.getByRole("button", { name: "Got it" }).tap();
    const x0 = (await game(page)).x;
    const pad = page.getByRole("button", { name: "Walk right" });
    await pad.dispatchEvent("pointerdown", { pointerId: 1 });
    await page.waitForTimeout(600);
    await pad.dispatchEvent("pointerup", { pointerId: 1 });
    check("phone: pad walks", (await game(page)).x > x0 + 15);
    const cw = await page.locator("[data-testid=game] canvas").boundingBox();
    check("phone: the picture is zoomed in, not postcard-sized", cw.width >= 390 * 1.5 && cw.height >= 300, `${Math.round(cw.width)}×${Math.round(cw.height)}`);
    check("phone: game still has no sideways scroll", await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    const exitBox = await page.getByTestId("game-exit").boundingBox();
    check("phone: the game's top bar fits on one line", exitBox.height < 44 && exitBox.y < 48);
    await ctx.close();
  }

  // ---------------------------------------------------------------- accessibility
  if (axeSource) {
    const { ctx, page } = await open();
    await page.getByTestId("icon-socials").click();
    await page.getByTestId("icon-contact").click();
    await page.addScriptTag({ content: axeSource });
    const v = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations.map((x) => `${x.id} (${x.nodes.length})`));
    check("axe: no violations on the desktop", v.length === 0, v.join(", "));
    if (v.length) console.log(await page.evaluate(async () => JSON.stringify((await window.axe.run(document, { resultTypes: ["violations"] })).violations.flatMap((x) => x.nodes.map((n) => [n.target, n.any?.[0]?.message])))));
    await page.getByTestId("icon-game").click();
    await page.waitForTimeout(1600);
    const g = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations.map((x) => `${x.id} (${x.nodes.length})`));
    check("axe: no violations in the game", g.length === 0, g.join(", "));
    if (g.length) console.log(await page.evaluate(async () => JSON.stringify((await window.axe.run(document, { resultTypes: ["violations"] })).violations.flatMap((x) => x.nodes.map((n) => [n.target, n.any?.[0]?.message])))));
    await page.getByTestId("game-to-studio").click();
    await page.waitForTimeout(800);
    const sv = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations.map((x) => `${x.id} (${x.nodes.length})`));
    check("axe: no violations in the studio", sv.length === 0, sv.join(", "));
    if (sv.length) console.log(await page.evaluate(async () => JSON.stringify((await window.axe.run(document, { resultTypes: ["violations"] })).violations.flatMap((x) => x.nodes.map((n) => [n.target, n.any?.[0]?.message])))));
    await ctx.close();
  }
} catch (err) {
  check("script ran to the end", false, String(err).split("\n")[0]);
}

const real = errors.filter((e) => !isEnvNoise(e));
check("no console errors", real.length === 0, real.slice(0, 3).join(" | "));
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
