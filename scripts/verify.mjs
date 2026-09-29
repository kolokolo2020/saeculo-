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
    await page.getByRole("button", { name: /enter/i }).click();
    await page.waitForTimeout(700);
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
    await page.getByRole("slider", { name: "Seek" }).fill("60");
    await page.waitForTimeout(300);
    check("seek", (await audio(page)).t >= 59);
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.waitForTimeout(800);
    const a2 = await audio(page);
    check("next track", a2.src.includes("elbtunnel") && !a2.paused);
    check("active row follows", (await page.getByTestId("track-elbtunnel").getAttribute("aria-current")) === "true");
    await page.getByTestId("track-dull-knife").click();
    await page.waitForTimeout(600);
    check("pick from the folder", (await audio(page)).src.includes("dull-knife"));
    await page.getByRole("slider", { name: "Seek" }).fill("20");
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
    check("visuals: still mode", (await page.evaluate(() => document.documentElement.dataset.calm)) === "true");
    await page.getByRole("button", { name: /visuals:/ }).click();
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
    await page.evaluate(() => window.__game.teleport("studio", 8, 3.7, "up"));
    await page.waitForTimeout(200);
    await page.keyboard.press("e");
    await page.waitForTimeout(400);
    const studio = page.getByTestId("studio");
    check("game: the sampler opens", await studio.isVisible());
    const opts = await studio.getByLabel("Snare sound").locator("option").allTextContents();
    check("sampler: found sounds are in the lists", opts.some((o) => o.includes("bottle")));
    await studio.getByLabel("Snare sound").selectOption("bottle");
    const step = studio.getByRole("button", { name: "Kick step 3", exact: true });
    const before = await step.getAttribute("aria-pressed");
    await step.click();
    check("sampler: toggle a step", (await step.getAttribute("aria-pressed")) !== before);
    await page.getByTestId("studio-play").click();
    await page.waitForTimeout(900);
    check("sampler: playhead moves with the beat", (await studio.locator("[data-now=true]").count()) === 4);
    check("sampler: no website music underneath", (await audio(page)).paused);
    await studio.getByRole("button", { name: "Save" }).first().click();
    const tape = (await saved()).tapes[0];
    check("sampler: save to tape", tape && tape.pattern.sounds[1] === "bottle");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    check("sampler: Escape back to the room", (await studio.count()) === 0);
    await page.evaluate(() => window.__game.teleport("bedroom", 12, 4.6, "up"));
    await page.waitForTimeout(250);
    check("game: your tape is on the shelf", (await page.getByTestId("game-prompt").textContent()).includes("play a tape"));
    await page.getByTestId("game-exit").click();
    await page.waitForTimeout(1400);
    check("game: exit returns to the site", (await page.getByTestId("game").count()) === 0);
    check("game: music picks up where it was", !(await audio(page)).paused);
    await page.getByTestId("icon-game").click();
    await page.waitForTimeout(1600);
    check("game: remembers found sounds", (await page.getByTestId("game").textContent()).includes("sounds 3/3"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(1400);
    check("game: Escape exits", (await page.getByTestId("game").count()) === 0);
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
