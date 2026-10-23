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
const CHROME = process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium";

const results = [];
function check(name, ok, extra = "") {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${extra ? " — " + extra : ""}`);
}
const isEnvNoise = (t) => /vercel-scripts|speed-insights|ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|ytimg|status of 503|status of 404/.test(t);
const errors = [];

const browser = await chromium.launch({ executablePath: CHROME, args: ["--autoplay-policy=no-user-gesture-required"] });

async function open({ seen = true, viewport = { width: 1366, height: 800 }, hash = "", reduced = false, mobile = false, init, now, path = "/" } = {}) {
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
  // a fixed date (Date.now, new Date) for date-dependent things like "new" tags
  if (now) await page.clock.setFixedTime(new Date(now));
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && !isEnvNoise(m.text()) && errors.push(m.text()));
  await page.goto(BASE + path + hash, { waitUntil: "networkidle" });
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
    check(
      "first visit: the cover before the intro is the intro's own night sky",
      (await page.evaluate(() => {
        // it's gone once the page is ready, so read the rule
        for (const sh of document.styleSheets) for (const r of (() => { try { return sh.cssRules; } catch { return []; } })()) if (r.selectorText === ".intro-cover") return r.style.backgroundColor;
        return null;
      })) === "rgb(7, 11, 28)",
    );
    const ph = () => intro.getAttribute("data-phase").catch(() => null);
    check("intro: plays by itself, from the sky down the building", ["sky", "descend", "window"].includes(await ph()));
    check("intro: no sound before a key", (await audio(page)).paused);
    /** The share of the intro's canvas that's warm light (the lit window, the lamp, the room). */
    const warm = () =>
      page.evaluate(() => {
        const c = document.querySelector('[role="dialog"] canvas');
        const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 16) if (d[i] > 150 && d[i] - d[i + 2] > 50) n++;
        return n / (d.length / 16);
      });
    const skyWarm = await warm();
    await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.dataset.phase === "room", null, { timeout: 6000 }).catch(() => {});
    check("intro: then in through the lit window, into the room", (await ph()) === "room");
    const roomWarm = await warm();
    check("intro: the room is lamp-lit, warm against the night", roomWarm > skyWarm, `${skyWarm.toFixed(4)} → ${roomWarm.toFixed(4)}`);
    check("intro: the key isn't asked for yet (they're lighting up)", (await intro.getAttribute("data-ready")) !== "true");
    /** Two frames of the canvas, apart: is anything moving? */
    const moving = async () => {
      const a = await page.evaluate(() => document.querySelector('[role="dialog"] canvas').toDataURL());
      await page.waitForTimeout(400);
      return a !== (await page.evaluate(() => document.querySelector('[role="dialog"] canvas').toDataURL()));
    };
    await page.waitForTimeout(2200);
    check("intro: then a key is asked for", (await intro.getAttribute("data-ready")) === "true" && (await page.getByRole("button", { name: /press any key/i }).isVisible()));
    check("intro: the room stays, the smoke keeps moving", (await ph()) === "room" && (await moving()));
    check("intro: still no sound", (await audio(page)).paused);
    if (axeSource) {
      await page.addScriptTag({ content: axeSource });
      const v = await page.evaluate(async () => (await window.axe.run(document.querySelector('[role="dialog"]'), { resultTypes: ["violations"] })).violations.map((x) => `${x.id} (${x.nodes.length})`));
      check("axe: no violations on the intro", v.length === 0, v.join(", "));
    }
    await page.keyboard.press("a");
    await page.waitForTimeout(300);
    check("intro: a key: they stop and lean over", (await ph()) === "press" && (await intro.getAttribute("data-screen")) !== "saeculo");
    await page.waitForTimeout(1100);
    check("intro: the space bar: the beat starts, saeculo on the screen", !(await audio(page)).paused && (await intro.getAttribute("data-screen")) === "saeculo");
    await page.waitForTimeout(500);
    check("intro: then into the screen, the desktop there behind it", (await ph()) === "screen" && (await page.getByTestId("window-beats").isVisible()));
    await page.waitForTimeout(2000);
    check("intro: lands on the desktop with Beats open", (await intro.count()) === 0 && (await page.getByTestId("window-beats").isVisible()));
    check("intro: remembered", (await page.evaluate(() => localStorage.getItem("saeculo-intro-seen"))) === "1");
    check("intro: music carries on after it", !(await audio(page)).paused);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    check("returning visit: no intro", (await page.getByRole("dialog", { name: "Intro" }).count()) === 0);
    await page.getByRole("button", { name: "Clock and settings" }).click();
    await page.getByRole("menuitem", { name: "Replay intro" }).click();
    await page.getByRole("dialog", { name: "Intro" }).waitFor({ timeout: 5000 }).catch(() => {});
    check("replay intro from the clock menu", await page.getByRole("dialog", { name: "Intro" }).isVisible());
    await page.waitForTimeout(300);
    await page.mouse.click(683, 400);
    await page.waitForTimeout(1300);
    check("intro: a click on the way in hurries it to the room", (await ph()) === "room");
    await page.getByRole("button", { name: /skip/i }).click();
    await page.waitForTimeout(500);
    check("intro: skip lands on the desktop with Beats open, music on", (await page.getByRole("dialog", { name: "Intro" }).count()) === 0 && (await page.getByTestId("window-beats").isVisible()) && !(await audio(page)).paused);
    await page.getByRole("button", { name: "Clock and settings" }).click();
    await page.getByRole("menuitem", { name: "Replay intro" }).click();
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    check("Escape skips the intro", (await page.getByRole("dialog", { name: "Intro" }).count()) === 0 && !(await audio(page)).paused);
    await page.getByTestId("icon-socials").click();
    await page.waitForTimeout(300);
    check("intro: nothing left blocking clicks after it", await page.getByTestId("window-socials").isVisible());
    await ctx.close();
  }
  {
    const { ctx, page } = await open({ seen: false, mobile: true, viewport: { width: 390, height: 844 } });
    const intro = page.getByRole("dialog", { name: "Intro" });
    check("intro on a phone: fits the screen", (await page.evaluate(() => document.documentElement.scrollWidth)) <= 390);
    // (the prompt is in the page but see-through until then, so wait on the attribute)
    await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.dataset.ready === "true", null, { timeout: 9000 }).catch(() => {});
    check("intro on a phone: asks for a tap in the room", (await intro.getAttribute("data-phase")) === "room" && (await page.getByRole("button", { name: /tap to play/i }).isVisible()));
    await page.getByRole("button", { name: /tap to play/i }).tap();
    await page.waitForTimeout(1500);
    check("intro on a phone: the tap presses space, the beat on", (await intro.getAttribute("data-screen")) === "saeculo" && !(await audio(page)).paused);
    await page.getByRole("button", { name: /skip/i }).tap();
    await page.waitForTimeout(500);
    check("intro on a phone: skip lands on the desktop, music on", (await intro.count()) === 0 && !(await audio(page)).paused);
    await ctx.close();
  }

  // ---------------------------------------------------------------- beats
  {
    const { ctx, page } = await open();
    check("Beats opens by default", await page.getByTestId("window-beats").isVisible());
    check("tracklist lists the beats", (await page.locator("[data-testid^=track-]").count()) === 12);
    check("one album cover for every beat", (await page.locator("[data-testid=window-beats] img").count()) === 1 && decodeURIComponent(await page.locator("[data-testid=window-beats] img").getAttribute("src")).includes("url=/covers/saeculo.jpg"));
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
    // the next file can take a moment to buffer
    for (let i = 0; i < 10 && (await audio(page)).paused; i++) await page.waitForTimeout(250);
    const a2 = await audio(page);
    check("next track", a2.src.includes("growin%20") && !a2.paused);
    check("active row follows", (await page.getByTestId("track-growin-and-slowin").getAttribute("aria-current")) === "true");
    await page.getByTestId("track-dull-knife").click();
    await page.waitForTimeout(600);
    check("pick from the folder", (await audio(page)).src.includes("dull%20knife"));
    await seekTo(page, 20);
    await page.getByRole("button", { name: "Previous" }).click();
    await page.waitForTimeout(600);
    const a3 = await audio(page);
    check("previous restarts the track", a3.t < 2 && a3.src.includes("dull%20knife"));
    await page.waitForTimeout(600);
    // the cover is the hero: the owner's artwork, big and sharp; no visualizer anywhere
    const cover = await page.getByTestId("cover").evaluate((img) => ({ src: img.currentSrc || img.src, w: img.getBoundingClientRect().width, natural: img.naturalWidth, done: img.complete, bytes: performance.getEntriesByName(img.currentSrc || img.src)[0]?.encodedBodySize ?? -1 }));
    check("Beats: the cover is the owner's artwork (saeculo.jpg)", decodeURIComponent(cover.src).includes("url=/covers/saeculo.jpg") && cover.done, cover.src);
    const servedW = Number(new URL(cover.src).searchParams.get("w"));
    const servedQ = Number(new URL(cover.src).searchParams.get("q"));
    check("Beats: the cover is served resized, sharp but not the 1200px original", servedW >= cover.w && servedW < 400, `${servedW}px for ${Math.round(cover.w)}px`);
    check("Beats: the cover keeps its grain (quality 90)", servedQ === 90, `q=${servedQ}`);
    check("Beats: the cover weighs a fraction of the original", cover.bytes > 0 && cover.bytes < 60_000, `${Math.round(cover.bytes / 1024)} KB`);
    const mini = await page.locator("[data-testid=mini-player] img").evaluate((img) => ({ src: img.currentSrc || img.src, natural: img.naturalWidth }));
    check("taskbar: the little cover is a small copy", decodeURIComponent(mini.src).includes("url=/covers/saeculo.jpg") && mini.natural > 0 && mini.natural <= 64, `${mini.natural}px`);
    check("Beats: the cover is the hero, shown large", cover.w >= 220, String(Math.round(cover.w)));
    check("Beats: no visualizer, the only canvas is the seek bar", (await page.locator("[data-testid=visualizer]").count()) === 0 && (await page.locator("[data-testid=window-beats] canvas").count()) === 1 && (await page.locator("[data-testid=window-beats] canvas[data-testid=waveform]").count()) === 1);
    check("Beats: no visuals switch, in the window or the clock menu", (await page.getByRole("button", { name: /visuals:/ }).count()) === 0);
    // the theme: flat paper with hairlines, no bevels or glass
    const look = await page.evaluate(() => {
      const css = (sel) => getComputedStyle(document.querySelector(sel));
      const win = css("[data-testid=window-beats]");
      const title = css("[data-testid=window-beats] .win-title");
      const cap = css("[data-testid=window-beats] .cap-btn");
      const play = css("[data-testid=deck-play]");
      return { winBg: win.backgroundColor, winBorder: win.borderTopWidth, winShadow: win.boxShadow, titleBg: title.backgroundImage, capShadow: cap.boxShadow, capRadius: parseFloat(cap.borderTopLeftRadius), mp: css(".mp").backgroundColor, playImg: play.backgroundImage, playShadow: play.boxShadow };
    });
    check("theme: windows are flat paper with a hairline and a soft shadow", look.winBg === "rgb(251, 248, 242)" && look.winBorder === "1px" && !look.winShadow.includes("inset") && look.titleBg === "none", JSON.stringify(look).slice(0, 160));
    check("theme: flat buttons (no bevels), rounded corners", look.capShadow === "none" && look.capRadius >= 4 && look.playImg === "none" && !look.playShadow.includes("inset"));
    check("theme: the player is on the same paper, not night-blue glass", look.mp === "rgb(251, 248, 242)");
    // the clock menu: still visuals is the one setting left
    await page.getByRole("button", { name: "Clock and settings" }).click();
    check("clock menu: no visualizer options, still visuals stays", (await page.getByRole("menu").getByRole("menuitem", { name: /led|wave/i }).count()) === 0 && (await page.getByRole("menuitemcheckbox", { name: "Still visuals" }).count()) === 1);
    await page.getByRole("menuitemcheckbox", { name: "Still visuals" }).click();
    check("clock menu: still visuals on", (await page.evaluate(() => document.documentElement.dataset.calm)) === "true" && (await page.getByRole("menuitemcheckbox", { name: "Still visuals" }).getAttribute("aria-checked")) === "true");
    check("still visuals: the playing row's bars stand still, still visible", await page.evaluate(() => {
      const bars = [...document.querySelectorAll("[data-testid=window-beats] .eq-bars i")];
      return bars.length === 3 && bars.every((b) => getComputedStyle(b).animationName === "none" && b.getBoundingClientRect().height > 2);
    }));
    await page.getByRole("menuitemcheckbox", { name: "Still visuals" }).click();
    check("clock menu: still visuals off again", (await page.evaluate(() => document.documentElement.dataset.calm)) === "false");
    await page.keyboard.press("Escape");
    check("clock menu: Escape closes it", (await page.getByRole("menu").count()) === 0);
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
    const labels = await page.locator("[data-testid=window-socials] a > span:first-child").allTextContents();
    check("socials: in order, no Linktree", JSON.stringify(labels) === JSON.stringify(["Instagram", "YouTube", "YouTube Music", "Spotify", "SoundCloud", "Apple Music", "Amazon Music", "TIDAL"]), labels.join(", "));
    check("socials: eight real links, new tab", links.length === 8 && links.every(([h, t]) => h.startsWith("https://") && t === "_blank"));
    const onLink = () => page.evaluate(() => !!document.activeElement?.closest?.("[data-testid=window-socials] a"));
    await page.locator("[data-testid=window-socials] .win-title h2").click();
    for (let i = 0; i < 8 && !(await onLink()); i++) await page.keyboard.press("Tab");
    check("socials: tabbing onto a link shows a clear ring", (await onLink()) && (await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement);
      return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2;
    })));
    await page.getByTestId("icon-beats").click();
    await page.getByRole("slider", { name: "Volume" }).fill("0.3");
    check("volume", Math.abs((await page.evaluate(() => document.querySelector("audio").volume)) - 0.3) < 0.01);
    await ctx.close();
  }

  // share link, unavailable file, reduced motion
  {
    const { ctx, page } = await open({ seen: false, hash: "#track=beauty-fangs" });
    check("share link skips the intro", (await page.getByRole("dialog", { name: "Intro" }).count()) === 0);
    check("share link selects the track", (await page.getByTestId("track-beauty-fangs").getAttribute("aria-current")) === "true");
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 800 } });
    await ctx.addInitScript(() => localStorage.setItem("saeculo-intro-seen", "1"));
    await ctx.route("**/audio/care4me*", (r) => r.fulfill({ status: 404, body: "" }));
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
    const { ctx, page } = await open({ seen: false, reduced: true });
    const intro = page.getByRole("dialog", { name: "Intro" });
    const still = () => page.evaluate(() => document.querySelector('[role="dialog"] canvas').toDataURL());
    const first = await still();
    await page.waitForTimeout(700);
    check("reduced motion: one still picture of the room, nothing moving", (await intro.isVisible()) && (await intro.getAttribute("data-phase")) === "room" && first === (await still()));
    check("reduced motion: a key asked for straight away", await page.getByRole("button", { name: /press any key/i }).isVisible());
    await page.keyboard.press("a");
    await page.waitForTimeout(300);
    check("reduced motion: a key puts saeculo on the screen", (await intro.getAttribute("data-screen")) === "saeculo" && first !== (await still()));
    await page.waitForTimeout(2300);
    check("reduced motion: a short, still intro, then in", (await page.getByRole("dialog", { name: "Intro" }).count()) === 0 && !(await audio(page)).paused);
    await ctx.close();
  }
  {
    const { ctx, page } = await open({ reduced: true });
    await page.getByRole("button", { name: "Clock and settings" }).click();
    check("reduced motion: still visuals start on", (await page.getByRole("menuitemcheckbox", { name: "Still visuals" }).getAttribute("aria-checked")) === "true");
    check("reduced motion: windows open without animating", await page.getByTestId("window-beats").evaluate((w) => getComputedStyle(w).animationName === "none"));
    await page.keyboard.press("Escape");
    await page.evaluate(() => localStorage.setItem("saeculo-game", JSON.stringify({ found: [], seenHelp: true, unseen: [], profile: { name: "R", skin: 1, hair: "short", hairColor: 0, body: "slim" } })));
    await page.getByTestId("icon-game").click();
    await page.waitForTimeout(800);
    await page.evaluate(() => window.__game.teleport("street", 18, 5.6, "down"));
    await page.evaluate(() => window.__game.storm());
    await page.waitForTimeout(150);
    const calm = await page.evaluate(() => window.__game.state());
    check("reduced motion: thunder, but no lightning flash", calm.bolts === 1 && calm.bolt === 0);
    await ctx.close();
  }

  // ------------------------------------- address, files, even loudness, new tags
  {
    const SITE = "https://www.saeculobeats.com";
    const { ctx, page } = await open();
    const html = await (await page.request.get(BASE + "/")).text();
    const attr = (re) => (html.match(re) ?? [])[1];
    check("address: the canonical link is saeculobeats.com", attr(/<link rel="canonical" href="([^"]+)"/) === SITE, attr(/<link rel="canonical" href="([^"]+)"/));
    // (the card's image URL takes the dev server's own host in development, by
    // Next's design; a production build puts it on saeculobeats.com)
    const ogImage = attr(/<meta property="og:image" content="([^"]+)"/) ?? "";
    const og = ogImage ? new URL(ogImage) : null;
    check("address: share cards point at saeculobeats.com", attr(/<meta property="og:url" content="([^"]+)"/) === SITE && !!og && [SITE, new URL(BASE).origin].includes(og.origin) && og.pathname === "/opengraph-image", ogImage);
    check("address: the structured data points at saeculobeats.com", html.includes(`"url":"${SITE}"`));
    check("address: nothing points at saeculo.vercel.app any more", !html.includes("saeculo.vercel.app"));
    // Vercel Web Analytics: its script is on the page (the dev build loads the
    // debug one, which records nothing) and it sets no cookies
    check("analytics: the Web Analytics script is on the page", await page.evaluate(() => !!document.querySelector('script[src*="/insights/script"], script[src*="vercel-scripts.com/v1/script"]')));
    check("analytics: no cookies", (await ctx.cookies()).length === 0);
    const robots = await (await page.request.get(BASE + "/robots.txt")).text();
    check("address: robots.txt names the sitemap on saeculobeats.com", robots.includes(`Sitemap: ${SITE}/sitemap.xml`), robots.replace(/\n/g, " "));
    const sitemap = await (await page.request.get(BASE + "/sitemap.xml")).text();
    check("address: the sitemap lists saeculobeats.com", sitemap.includes(`<loc>${SITE}</loc>`) && !sitemap.includes("vercel.app"));
    // the old address sends everyone to the new one, path and all; nothing else is redirected
    const { request: rawGet } = await import("node:http");
    const head = (path, host) =>
      new Promise((resolve, reject) => {
        const u = new URL(BASE);
        const req = rawGet({ host: u.hostname, port: u.port, path, method: "GET", headers: { host } }, (res) => {
          res.resume();
          resolve({ status: res.statusCode, location: res.headers.location ?? "" });
        });
        req.on("error", reject);
        req.end();
      });
    const old = await head("/sitemap.xml?x=1", "saeculo.vercel.app");
    check("address: saeculo.vercel.app redirects to saeculobeats.com for good", old.status === 308 && old.location === `${SITE}/sitemap.xml?x=1`, `${old.status} ${old.location}`);
    const oldTab = await head("/audio/analog.mp3", "saeculo.vercel.app");
    check("address: a tab already open on the old address still gets its MP3s", oldTab.status === 200, String(oldTab.status));
    const oldRoot = await head("/", "saeculo.vercel.app");
    check("address: the old address's front page redirects too", oldRoot.status === 308 && oldRoot.location === `${SITE}/`, `${oldRoot.status} ${oldRoot.location}`);
    const preview = await head("/robots.txt", "saeculo-git-main-turfmap.vercel.app");
    check("address: preview addresses are not redirected", preview.status === 200, String(preview.status));

    // every beat's file is there, under the URL the player asks for
    const list = await page.evaluate(() => window.__player.tracks());
    const missing = [];
    for (const t of list) {
      const r = await page.request.get(BASE + t.src, { headers: { range: "bytes=0-1" } });
      if (![200, 206].includes(r.status())) missing.push(`${t.id} ${r.status()}`);
    }
    check("files: every beat's MP3 loads", list.length === 12 && missing.length === 0, missing.join(", "));
    check("files: names with brackets and & are linked as-is", list.some((t) => t.src.includes("(24.09.26)")) && list.some((t) => t.src.includes("%26")) && !list.some((t) => /%28|%29/.test(t.src)));
    check("files: every link is the file name through encodeURIComponent", list.every((t) => t.src === "/audio/" + encodeURIComponent(decodeURIComponent(t.src.slice(7)))));

    // even loudness: loud beats are turned down to the target, quiet ones left alone
    check("loudness: measured for every beat", list.every((t) => typeof t.loudness === "number" && t.loudness < 0 && t.loudness > -30), list.map((t) => `${t.id} ${t.loudness}`).join(", "));
    const played = list.map((t) => t.loudness + 20 * Math.log10(t.level));
    const spreadBefore = Math.max(...list.map((t) => t.loudness)) - Math.min(...list.map((t) => t.loudness));
    const spreadAfter = Math.max(...played) - Math.min(...played);
    check("loudness: nothing is pushed up", list.every((t) => t.level <= 1));
    check("loudness: the beats play within about 1.5 LU of each other", spreadAfter <= 1.5, `${spreadBefore.toFixed(1)} LU → ${spreadAfter.toFixed(1)} LU`);
    const loud = list.reduce((a, b) => (b.loudness > a.loudness ? b : a));
    const quiet = list.reduce((a, b) => (b.loudness < a.loudness ? b : a));
    await page.getByTestId(`track-${loud.id}`).click();
    await page.waitForTimeout(900);
    const gLoud = await page.evaluate(() => window.__player.level());
    check(`loudness: the loudest (${loud.id}) plays turned down`, gLoud !== null && Math.abs(gLoud - loud.level) < 0.01 && gLoud < 0.9, `gain ${gLoud}`);
    await page.getByTestId(`track-${quiet.id}`).click();
    await page.waitForTimeout(600);
    const gQuiet = await page.evaluate(() => window.__player.level());
    check(`loudness: the quietest (${quiet.id}) plays as it is`, gQuiet === 1, `gain ${gQuiet}`);
    await page.getByTestId(`track-${loud.id}`).click();
    await page.waitForTimeout(400);
    check("loudness: going back to a loud beat turns it down again", Math.abs((await page.evaluate(() => window.__player.level())) - loud.level) < 0.01);
    await ctx.close();

  }
  // "new" tags: the beats added in the last 30 days, on a fixed date
  {
    const { ctx, page } = await open({ now: "2026-10-01T12:00:00Z" });
    const tagged = await page.locator("[data-testid^=track-]:has(.mp-new)").evaluateAll((rows) => rows.map((r) => r.dataset.testid.replace("track-", "")));
    check("new tags: none for now (growin & slowin's is off)", tagged.length === 0, tagged.join(", "));
    check("new tags: twelve rows", (await page.locator("[data-testid^=track-]").count()) === 12);
    if (axeSource) {
      await page.addScriptTag({ content: axeSource });
      const v = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations.map((x) => `${x.id} (${x.nodes.length})`));
      check("axe: no violations with new tags showing", v.length === 0, v.join(", "));
    }
    await page.clock.setFixedTime(new Date("2026-11-30T12:00:00Z"));
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    check("new tags: and stop saying it after 30 days", (await page.locator("[data-testid^=track-] .mp-new").count()) === 0);
    await ctx.close();
  }

  // ---------------------------------------------------------------- a page per beat
  {
    const SITE = "https://www.saeculobeats.com";
    const { ctx, page } = await open({ seen: false, path: "/beat/beauty-fangs" });
    check("beat page: a first visit there skips the intro", (await page.getByRole("dialog", { name: "Intro" }).count()) === 0);
    check("beat page: Beats is open on that beat, ready, not playing", (await page.getByTestId("window-beats").isVisible()) && (await page.getByTestId("track-beauty-fangs").getAttribute("aria-current")) === "true" && (await audio(page)).paused);
    check("beat page: the tab is titled with the beat", (await page.title()).startsWith("beauty fangs"), await page.title());
    const html = await (await page.request.get(BASE + "/beat/beauty-fangs")).text();
    const attr = (re) => (html.match(re) ?? [])[1];
    check("beat page: its canonical link is its own address", attr(/<link rel="canonical" href="([^"]+)"/) === `${SITE}/beat/beauty-fangs`, attr(/<link rel="canonical" href="([^"]+)"/));
    check("beat page: its share card names the beat", attr(/<meta property="og:title" content="([^"]+)"/) === "beauty fangs — saeculo" && attr(/<meta property="og:url" content="([^"]+)"/) === `${SITE}/beat/beauty-fangs` && (attr(/<meta property="og:description" content="([^"]+)"/) ?? "").includes("149 bpm"));
    const ogImage = attr(/<meta property="og:image" content="([^"]+)"/) ?? "";
    check("beat page: one card image, its own", (html.match(/property="og:image"/g) ?? []).length === 1 && new URL(ogImage).pathname === "/beat/beauty-fangs/opengraph-image", ogImage);
    const card = await page.request.get(BASE + new URL(ogImage).pathname);
    check("beat page: the card image is drawn", card.status() === 200 && card.headers()["content-type"] === "image/png" && (await card.body()).length > 20_000);
    check("beat page: an unknown beat is a 404", (await page.request.get(BASE + "/beat/nope")).status() === 404 && (await page.request.get(BASE + "/beat/nope/opengraph-image")).status() === 404);
    await page.goto(BASE + "/beat/nope", { waitUntil: "networkidle" });
    check("404: the desktop's own page, with the way back", (await page.getByRole("heading", { name: "Not found" }).isVisible()) && (await page.getByRole("link", { name: "Back to the desktop" }).getAttribute("href")) === "/");
    if (axeSource) {
      await page.addScriptTag({ content: axeSource });
      const nv = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations.map((x) => `${x.id} (${x.nodes.length})`));
      check("axe: no violations on the 404", nv.length === 0, nv.join(", "));
    }
    await page.getByRole("link", { name: "Back to the desktop" }).click();
    await page.waitForURL(BASE + "/", { timeout: 5000 }).catch(() => {});
    check("404: the link goes home", new URL(page.url()).pathname === "/", page.url());
    await page.goto(BASE + "/beat/beauty-fangs", { waitUntil: "networkidle" });
    const sitemap = await (await page.request.get(BASE + "/sitemap.xml")).text();
    check("beat page: the sitemap lists every beat's page", (sitemap.match(/<loc>[^<]*\/beat\/[a-z0-9-]+<\/loc>/g) ?? []).length === 12);
    // copy link gives the beat's own page
    await page.evaluate(() => {
      window.__copied = null;
      navigator.clipboard.writeText = async (t) => { window.__copied = t; };
    });
    await page.getByTestId("track-dull-knife").click();
    await page.getByRole("button", { name: "copy link" }).click();
    await page.waitForTimeout(200);
    check("copy link: gives the beat's own page", (await page.evaluate(() => window.__copied)) === new URL(BASE).origin + "/beat/dull-knife", await page.evaluate(() => window.__copied));
    await ctx.close();
    const { ctx: c2, page: p2 } = await open({ path: "/beat/analog", hash: "#track=day2nite" });
    check("beat page: an old #track= link on it still wins", (await p2.getByTestId("track-day2nite").getAttribute("aria-current")) === "true");
    await c2.close();
  }

  // -------------------------------- lighter first load, a taller Beats, lease this
  {
    const { ctx, page } = await open();
    // the waveforms come in their own small chunk, after the page
    const waveChunk = await page.evaluate(() => performance.getEntriesByType("resource").some((r) => /trackWaveforms/.test(r.name)));
    const drawn = await page.getByTestId("waveform").evaluate((c) => {
      const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) return true;
      return false;
    });
    check("first load: the waveforms load on their own, and get drawn", waveChunk && drawn);
    // the unplayed bars are drawn in the --color-wave-rest token, dark enough to read on paper
    const rest = await page.getByTestId("waveform").evaluate((c) => {
      const hex = getComputedStyle(c).getPropertyValue("--color-wave-rest").trim();
      const want = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] === 255 && want.every((v, k) => Math.abs(d[i + k] - v) <= 2)) return hex;
      return "";
    });
    check("Beats: the unplayed waveform is drawn in --color-wave-rest", rest === "#a39a89", rest);
    const html = await (await page.request.get(BASE + "/")).text();
    check("first load: the page itself carries no waveform data", !html.includes('"peaks"') && !/\[0\.\d+,0\.\d+,0\.\d+,0\.\d+,0\.\d+,0\.\d+,0\.\d+,0\.\d+/.test(html));
    // the tracklist: how many rows are wholly in view without scrolling
    const rowsInView = (p) =>
      p.evaluate(() => {
        const list = document.querySelector("[data-testid=window-beats] .mp");
        const box = list.getBoundingClientRect();
        const foot = document.querySelector("[data-testid=window-beats] .mp-foot").getBoundingClientRect();
        return [...document.querySelectorAll("[data-testid^=track-]")].filter((r) => {
          const b = r.getBoundingClientRect();
          return b.top >= box.top && b.bottom <= Math.min(box.bottom, foot.top) + 0.5;
        }).length;
      });
    const at1366 = await rowsInView(page);
    check("1366×800: Beats shows most of the tracklist without scrolling", at1366 >= 7, `${at1366} of 12 rows`);
    await ctx.close();
    const { ctx: big, page: bp } = await open({ viewport: { width: 1920, height: 1080 } });
    const at1080 = await rowsInView(bp);
    check("1920×1080: Beats shows the whole tracklist", at1080 === 12, `${at1080} of 12 rows`);
    await big.close();

    // lease this: Contact, about that beat, and the beat in the email's subject
    const { ctx: c3, page: p3 } = await open();
    await p3.getByTestId("track-beauty-fangs").click();
    await p3.getByTestId("lease-this").click();
    const win = p3.getByTestId("window-contact");
    check("lease this: opens Contact about that beat", (await win.isVisible()) && (await win.getByTestId("contact-beat").textContent()).includes("beauty fangs"));
    await p3.evaluate(() => {
      window.__mailto = null;
      document.addEventListener("click", (e) => {
        const a = e.target.closest?.("a[href^='mailto:']");
        if (a) {
          window.__mailto = a.href;
          e.preventDefault();
        }
      }, true);
    });
    await win.getByLabel("Name").fill("Test");
    await win.getByLabel("Message").fill("For a single, out in spring.");
    await win.getByRole("button", { name: "Send" }).click();
    await p3.waitForTimeout(200);
    const mail = decodeURIComponent((await p3.evaluate(() => window.__mailto)) ?? "");
    check("lease this: the email's subject names the beat", mail.includes("subject=Leasing “beauty fangs” (Test)") && mail.includes("For a single, out in spring."), mail.slice(0, 90));
    await win.getByRole("button", { name: "just a message" }).click();
    check("lease this: can go back to a plain message", (await win.getByTestId("contact-beat").count()) === 0);
    if (axeSource) {
      await p3.getByTestId("lease-this").click();
      await p3.addScriptTag({ content: axeSource });
      const v = await p3.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations.map((x) => `${x.id} (${x.nodes.length})`));
      check("axe: no violations with Contact about a beat", v.length === 0, v.join(", "));
    }
    await c3.close();
    const { ctx: c4, page: p4 } = await open({ viewport: { width: 390, height: 844 }, mobile: true });
    const foot = await p4.locator("[data-testid=window-beats] .mp-foot").evaluate((f) => ({ sw: f.scrollWidth, cw: f.clientWidth, lease: !!f.querySelector("[data-testid=lease-this]") }));
    check("phone: the Beats footer fits, lease this included", foot.lease && foot.sw <= foot.cw + 1, `${foot.sw} / ${foot.cw}`);
    await c4.close();
  }

  // ---------------------------------------------------------------- contact
  {
    const { ctx, page } = await open();
    await page.getByTestId("icon-contact").click();
    const win = page.getByTestId("window-contact");
    await win.getByRole("button", { name: "Send" }).click();
    check("contact: empty form shows two errors", (await win.locator("[aria-invalid=true]").count()) === 2);
    check("contact: focus goes to the first problem", await page.evaluate(() => document.activeElement?.id === "contact-name"));
    check("contact: the focused field shows a clear ring", await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement);
      return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2;
    }));
    await win.getByLabel("Name").fill("Test");
    await win.getByLabel("Message").fill("Hi");
    await win.getByRole("button", { name: "Send" }).click();
    check("contact: too-short message caught", (await win.getByText("A little more detail").count()) === 1);
    // catch the mailto link instead of letting it leave for an email app
    await page.evaluate(() => {
      window.__mailto = null;
      document.addEventListener("click", (e) => {
        const a = e.target.closest?.("a[href^='mailto:']");
        if (a) {
          window.__mailto = a.href;
          e.preventDefault();
        }
      }, true);
    });
    await win.getByLabel("Message").fill("Hello, this is a test message.");
    await win.getByRole("button", { name: "Send" }).click();
    await page.waitForTimeout(200);
    const mailto = await page.evaluate(() => window.__mailto);
    check("contact: Send opens an email to saeculo with the message written", !!mailto && mailto.startsWith("mailto:saeculo888@gmail.com?") && decodeURIComponent(mailto).includes("Hello, this is a test message.") && decodeURIComponent(mailto).includes("Message from Test"), mailto?.slice(0, 80));
    check("contact: says what happened, with the address as a fallback", (await win.getByTestId("contact-opened").isVisible()) && (await win.getByTestId("contact-opened").textContent()).includes("saeculo888@gmail.com"));
    check("contact: no server involved", (await page.request.post(new URL("/api/contact", page.url()).href, { data: {} })).status() === 404);
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
    check("game: first visit opens the mirror", await page.getByRole("dialog", { name: "Who are you?" }).isVisible());
    await page.getByTestId("menu-name").fill("Tester");
    await page.getByRole("button", { name: "mullet" }).click();
    await page.getByRole("button", { name: "broad" }).click();
    check("save: the mirror's button says it saves", (await page.getByTestId("menu-close").textContent()).includes("Save"));
    await page.getByTestId("menu-close").click();
    await page.waitForTimeout(300);
    const prof = await page.evaluate(() => JSON.parse(localStorage.getItem("saeculo-game")).profile);
    check("game: your name and look are saved", prof.name === "Tester" && prof.hair === "mullet" && prof.body === "broad");
    check("save: you're told it's saved", (await page.getByTestId("game-saved").textContent()).includes("saved") || (await page.getByTestId("game-toast").textContent().catch(() => "")).includes("saved"));
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
    // the noisy ones (a vinyl pop) come out a little different each time: a quiet one gets two more goes
    for (let i = 0; i < 2 && Object.values(kit).some((v) => v.peak < 0.08); i++) {
      const again = await page.evaluate(() => window.__game.kitLevels());
      for (const [k, v] of Object.entries(kit)) if (v.peak < 0.08) kit[k] = again[k];
    }
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
    const dl = page.waitForEvent("download", { timeout: 60000 });
    await page.getByTestId("studio-export").click();
    const file = await dl;
    const bytes = readFileSync(await file.path());
    check("studio: export the song as WAV", bytes.length > 100000 && bytes.slice(0, 4).toString() === "RIFF", `${bytes.length} bytes`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    check("studio: Escape back to the room", (await studio.count()) === 0 && !(await st()).playing);
    await page.evaluate(() => window.__game.teleport("bedroom", 12, 4.6, "up"));
    await page.waitForTimeout(250);
    check("game: your beat is on the shelf", /play a tape|tape at the end/.test(await page.getByTestId("game-prompt").textContent()));
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
    // wait for a car, then step into its lane ahead of it
    await page.evaluate(() => window.__game.teleport("street", 20, 5.4, "down"));
    let stoppedCar = false;
    let placed = false;
    for (let i = 0; i < 60 && !stoppedCar; i++) {
      await page.waitForTimeout(500);
      const cars = (await lifeNow()).actors.filter((a) => a.kind === "car");
      if (!placed) {
        const car = cars.find((a) => (a.dir === "right" ? a.x > -20 && a.x < 400 : a.x > 120 && a.x < 700));
        if (car) {
          const ahead = car.dir === "right" ? car.x + 55 : car.x - 55;
          await page.evaluate(([x, y]) => window.__game.teleport("street", x / 16, y / 16, "down"), [ahead, car.y - 4]);
          placed = true;
        }
      }
      stoppedCar = cars.some((a) => a.stopped > 0.5);
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
    await page.getByTestId("hoops-shoot").click();
    await page.waitForTimeout(200);
    check("park: shooting hoops gives the basketball", (await saved()).found.includes("basketball"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
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
    // people remember what you played them; a few things happen once
    const dialogText = () => page.getByTestId("game-dialog").textContent();
    const closeDialog = async () => {
      if (await page.getByTestId("game-dialog").count()) await page.keyboard.press("Escape");
    };
    const readAll = async () => {
      let text = "";
      for (let i = 0; i < 8 && (await page.getByTestId("game-dialog").count()); i++) {
        text += " " + (await dialogText());
        if (await page.getByTestId("game-dialog").getByRole("button").count()) break;
        await page.keyboard.press("e");
        await page.waitForTimeout(120);
      }
      return text;
    };
    await page.evaluate(() => window.__game.teleport("rooftop", 11, 4.7, "up"));
    await page.waitForTimeout(250);
    await page.keyboard.press("e");
    await page.waitForTimeout(250);
    await readAll();
    await page.getByRole("button", { name: /on your phone$/ }).click();
    await page.waitForTimeout(1200);
    check("roof: play your tape for her, and the city answers", (await lifeNow()).music === "rooftop");
    await closeDialog();
    await page.evaluate(() => window.__game.teleport("street", 10.5, 4.5, "down"));
    await page.waitForTimeout(300);
    check("roof: leaving turns your phone off", (await lifeNow()).music !== "rooftop");
    await page.evaluate(() => window.__game.teleport("rooftop", 6, 5.4, "up"));
    await page.waitForTimeout(300);
    check("roof: come back up and she isn't there", (await lifeNow()).actors.find((a) => a.id === "ledge").hidden);
    await page.evaluate(() => window.__game.teleport("park", 5.6, 4.1, "up"));
    await page.waitForTimeout(250);
    await page.keyboard.press("e");
    await page.waitForTimeout(250);
    check("park: the old man asks to hear your beat", (await readAll()).includes("Let me hear it"));
    await page.getByRole("button", { name: "Give him your headphones" }).click();
    await page.waitForTimeout(200);
    const verdict = await readAll();
    check("park: he says what he makes of it, from its tempo", verdict.includes("Sunday"), verdict.slice(0, 80));
    await closeDialog();
    check("park: he remembers the tape", (await saved()).heard.oldman === (await page.evaluate(() => JSON.parse(localStorage.getItem("saeculo-studio")).slots[0].name)));
    await page.evaluate(() => window.__game.teleport("street", 26.5, 4.3, "up"));
    await page.waitForTimeout(300);
    check("street: after you've played for people, the payphone rings again", (await game(page)).callPending);
    await page.keyboard.press("e");
    await page.waitForTimeout(1500);
    check("street: it's your beat, down the line", (await readAll()).includes("your beat") && (await lifeNow()).call && (await saved()).seen.includes("callback"));
    await closeDialog();
    await page.evaluate(() => window.__game.teleport("street", 17.3, 3.9, "left"));
    await page.waitForTimeout(250);
    await page.keyboard.press("e");
    await page.waitForTimeout(250);
    const crewAgain = await readAll();
    check("street: the crew remember your tape", crewAgain.includes("won't stop playing"), crewAgain.slice(0, 90));
    await closeDialog();
    await page.evaluate(() => window.__game.teleport("store", 10.5, 5.6, "up"));
    await page.waitForTimeout(250);
    await page.keyboard.press("e");
    await page.waitForTimeout(250);
    await readAll();
    await page.getByRole("button", { name: "Turn the radio up" }).click();
    await page.waitForTimeout(250);
    check("store: the clerk's radio finds one of the real tracks between stations", (await readAll()).includes("between stations"));
    await closeDialog();
    await page.evaluate(() => window.__game.teleport("bedroom", 12, 4.6, "up"));
    await page.waitForTimeout(300);
    check("bedroom: a tape you didn't make is on the shelf", (await game(page)).strangeTape);
    await page.keyboard.press("e");
    await page.waitForTimeout(300);
    check("bedroom: it's yours, slower, from further away", (await readAll()).includes("No label") && (await saved()).seen.includes("unlabelled") && !(await game(page)).strangeTape);
    await closeDialog();

    // the bigger map, the menu, shops, a fight
    await page.evaluate(() => window.__game.teleport("street", 39, 5, "right"));
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(500);
    await page.keyboard.up("ArrowRight");
    await page.waitForTimeout(700);
    check("street → the avenue", (await page.getByTestId("game").getAttribute("data-place")) === "avenue");
    await page.keyboard.press("m");
    await page.waitForTimeout(200);
    check("menu: opens with M", await page.getByTestId("game-menu").isVisible());
    await page.getByRole("tab", { name: "goals" }).click();
    check("menu: goals listed, some reached", (await page.locator("[data-testid=menu-goals] [data-done=true]").count()) >= 2);
    await page.getByRole("tab", { name: "settings" }).click();
    await page.getByRole("button", { name: "chill" }).click();
    check("menu: settings saved", (await saved()).settings.difficulty === "chill");
    // the track is drawn in a pseudo-element: read its colour off the screen,
    // a quarter of the way along (inside the 80% fill) and near the end
    const sfx = page.getByRole("slider", { name: "sound effects" });
    const px = await page.evaluate(async (b64) => {
      const img = await createImageBitmap(await (await fetch("data:image/png;base64," + b64)).blob());
      const c = new OffscreenCanvas(img.width, img.height);
      const g = c.getContext("2d");
      g.drawImage(img, 0, 0);
      const at = (fx) => [...g.getImageData(Math.round(img.width * fx), Math.round(img.height / 2), 1, 1).data.slice(0, 3)];
      return { fill: at(0.25), rest: at(0.95) };
    }, (await sfx.screenshot()).toString("base64"));
    check("menu: the volume sliders show how full they are", px.fill[0] > 180 && px.fill[2] < 140 && px.rest[0] < 90, JSON.stringify(px));
    await page.keyboard.press("Escape");
    await page.evaluate(() => window.__game.give({ cash: 200 }));
    await page.evaluate(() => window.__game.teleport("thrift", 3.5, 4.2, "up"));
    await page.waitForTimeout(250);
    await page.keyboard.press("e");
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: /buy the puffer/ }).click();
    check("thrift: buy clothes into the wardrobe", (await saved()).owned.includes("puffer") && (await saved()).cash === 110);
    await page.keyboard.press("Escape");
    await page.evaluate(() => window.__game.teleport("alley", 12, 6, "right"));
    await page.waitForTimeout(300);
    await page.evaluate(() => window.__game.trouble());
    for (let i = 0; i < 25 && !(await page.getByRole("button", { name: "Fight", exact: true }).count()); i++) {
      await page.waitForTimeout(400);
      if (await page.getByTestId("game-dialog").count()) await page.keyboard.press("e");
    }
    check("alley: trouble walks up to you", (await page.getByRole("button", { name: "Fight", exact: true }).count()) === 1);
    await page.getByRole("button", { name: "Fight", exact: true }).click();
    await page.waitForTimeout(300);
    check("fight: it starts, with health bars", (await page.evaluate(() => window.__game.fight()))?.foes.length >= 2);
    await page.waitForTimeout(200);
    const foeHp = (await page.evaluate(() => window.__game.fight())).foes.map((f) => f.hp);
    check("fight: on chill they're softer (a drunk 31 health, not 36)", foeHp.every((h) => h === 31 || h === 44), String(foeHp));
    check("fight: no talking mid-fight (E swings)", !/talk/.test((await page.getByTestId("game-prompt").textContent().catch(() => "")) ?? ""));
    await page.evaluate(() => window.__game.weaken());
    for (let i = 0; i < 40 && (await page.evaluate(() => window.__game.fight()?.outcome)) === ""; i++) {
      const f = await page.evaluate(() => window.__game.fight());
      const foe = f.foes.find((x) => x.state !== "down" && x.state !== "flee");
      if (foe) await page.evaluate(([x, y]) => window.__game.teleport("alley", (x - 9) / 16, y / 16, "right"), [foe.x, foe.y]);
      await page.keyboard.press("e");
      await page.waitForTimeout(380);
    }
    await page.waitForTimeout(800);
    const won = await saved();
    check("fight: win it, get paid, unlock the bat", won.stats.wins === 1 && won.weapons.includes("bat") && won.cash > 110, JSON.stringify(won.stats));
    check("fight: people who saw it react", (await lifeNow()).actors.some((a) => a.react > 0));
    await closeDialog();

    // balance: trouble leaves you alone (the club set also gets you the crowd sound) for a while after; a second set straight away pays less
    check("trouble: a breather after it", (await game(page)).lastTrouble > 0 && (await game(page)).encounterIn >= 100);
    const cash0 = (await saved()).cash;
    await page.evaluate(() => window.__game.rhythm("dj", 65));
    const cash1 = (await saved()).cash;
    await page.evaluate(() => window.__game.rhythm("dj", 65));
    const cash2 = (await saved()).cash;
    check("club: a good set pays, the same set straight after pays a third", cash1 - cash0 === 26 && cash2 - cash1 === 8, `${cash1 - cash0}, ${cash2 - cash1}`);
    await closeDialog();

    // things that happen: Vee's beat battle, Dre's job, the CD guy's request
    const talkTo = async (place, x, y, dir = "right") => {
      await closeDialog();
      await page.evaluate(([p, x, y, d]) => window.__game.teleport(p, x, y, d), [place, x, y, dir]);
      await page.waitForTimeout(250);
      await page.keyboard.press("e");
      await page.waitForTimeout(250);
    };
    const pick = async (name) => {
      for (let i = 0; i < 6 && !(await page.getByTestId("game-dialog").getByRole("button", { name }).count()); i++) {
        await page.keyboard.press("e");
        await page.waitForTimeout(150);
      }
      await page.getByTestId("game-dialog").getByRole("button", { name }).click();
      await page.waitForTimeout(250);
    };
    await page.evaluate(() => window.__game.give({ cash: 200, stats: { ...window.__game.save().stats, beatsSold: 1 } }));
    await page.evaluate(() => window.__game.teleport("underpass", 8, 6.5, "right"));
    await page.waitForTimeout(1400);
    const veeTalk = (await page.getByTestId("game-dialog").count()) ? await readAll() : "";
    check("underpass: Vee comes over and challenges you", /walks straight at you/.test(veeTalk) && (await saved()).seen.includes("vee"), veeTalk);
    check("battle: Vee names her beat (the first time, her night drill)", /My night drill, 142 BPM/.test(veeTalk), veeTalk);
    await pick(/Battle/);
    check("battle: the stake goes in, the hard rhythm game opens", (await saved()).cash === 180 && (await page.getByRole("dialog", { name: "Beat battle" }).isVisible()));
    check("battle: on the beat she named", /played the night drill first/.test(await page.getByTestId("rhythm").textContent()));
    await page.keyboard.press("Escape");
    await page.evaluate(() => window.__game.battle(80, 70));
    const bt = await saved();
    check("battle: win it, double your money, a goal", bt.cash >= 220 && bt.stats.battleWins === 1 && bt.goals.includes("battle"), `${bt.cash}`);
    await talkTo("underpass", 11.6, 6.8);
    await pick("Got any work?");
    await pick("I'll take it");
    check("Dre: a job, carrying a tape", (await saved()).job?.to === "busker" && (await saved()).job.stage === "carry");
    await talkTo("subway", 13.1, 3.6);
    check("subway: the busker takes it and gives you something back", (await saved()).job?.stage === "back");
    const cashBack = (await saved()).cash;
    await talkTo("underpass", 11.6, 6.8);
    const paid = await saved();
    check("Dre: back with the envelope, paid", paid.job === null && paid.stats.jobs === 1 && paid.cash > cashBack && paid.goals.includes("job"));

    // Vee: another of her beats each battle (she says which), every one playable
    await talkTo("underpass", 21.4, 6.3, "right");
    const veeAgain = (await page.getByTestId("game-dialog").count()) ? await readAll() : "";
    check("battle: after a win, Vee names the next beat (her cold trap)", /cold trap/.test(veeAgain), veeAgain);
    await closeDialog();
    const charts = await page.evaluate(() => window.__game.battleCharts());
    check(
      "battle: each of Vee's beats has a kick, a snare or clap, hats and low end, and a playable chart",
      charts.length === 4 && charts.every((c) => c.voices.every(Boolean) && c.hits.every((n) => n > 0) && c.perSecond > 3 && c.perSecond < 8),
      JSON.stringify(charts.map((c) => [c.id, c.hits, c.perSecond])),
    );
    const veeBeats = [];
    const addLoss = (n) => page.evaluate((n) => window.__game.give({ stats: { ...window.__game.save().stats, battleLosses: window.__game.save().stats.battleLosses + n } }), n);
    for (let i = 0; i < 4; i++) {
      veeBeats.push((await page.evaluate(() => window.__game.veeBeat())).preset);
      await addLoss(1);
    }
    await addLoss(-4);
    check("battle: a different beat each time, in turn", new Set(veeBeats).size === 4, veeBeats.join());

    // carrying Dre's tape: trouble comes sooner, they ask about it, and a knockout loses it
    await page.evaluate(() => window.__game.give({ job: { to: "busker", stage: "carry", pay: 25 } }));
    const odds = await page.evaluate(() => window.__game.odds("alley"));
    check("carrying Dre's tape: trouble's likelier and comes sooner", odds.ambush > 0.25 && odds.sooner > 1, JSON.stringify(odds));
    await closeDialog();
    await page.evaluate(() => window.__game.teleport("alley", 12, 6, "right"));
    await page.evaluate(() => window.__game.trouble());
    for (let i = 0; i < 30 && !(await page.getByRole("button", { name: "Fight", exact: true }).count()); i++) {
      if (await page.getByTestId("game-dialog").count()) await page.keyboard.press("e");
      await page.waitForTimeout(250);
    }
    check("carrying: they ask what's on the tape", /on the tape/.test((await page.getByTestId("game-dialog").count()) ? await dialogText() : ""));
    await page.getByRole("button", { name: "Fight", exact: true }).click();
    await page.waitForTimeout(500);
    await page.evaluate(() => window.__game.knockMe());
    await page.getByTestId("game-wake").waitFor({ timeout: 5000 }).catch(() => {});
    await page.getByTestId("game-wake").click();
    await page.waitForTimeout(300);
    const woke = await readAll();
    check("knocked out carrying: the tape's gone, and the job with it", (await saved()).job?.stage === "lost" && /Dre's tape is gone/.test(woke), woke);
    await talkTo("underpass", 11.6, 6.8);
    const dreLost = await readAll();
    check("Dre: no tape, no money (and the job's off)", (await saved()).job === null && /Where's my tape/.test(dreLost) && (await saved()).stats.jobs === 1, dreLost);
    await closeDialog();

    // the alley cat: pet it three times and it follows you; trouble or leaving sends it home
    await page.evaluate(() => window.__game.peace());
    await page.evaluate(() => window.__game.teleport("alley", 4.2, 3.6, "left"));
    await page.evaluate(() => window.__game.cat(0, [3.2, 3.6]));
    await page.waitForTimeout(250);
    check("alley: the cat on the dumpster can be petted", /the cat/.test(await page.getByTestId("game-prompt").textContent()));
    let petted = "";
    for (let i = 0; i < 3; i++) {
      await closeDialog();
      await page.waitForTimeout(150);
      await page.keyboard.press("e");
      await page.waitForTimeout(200);
      petted += await readAll();
    }
    await closeDialog();
    check("alley: pet it three times and it comes with you", (await page.evaluate(() => window.__game.cat())).trail > 0 && /follows you/.test(petted), petted);
    const catFrom = await page.evaluate(() => window.__game.cat());
    await page.keyboard.down("ArrowDown");
    await page.waitForTimeout(1200);
    await page.keyboard.up("ArrowDown");
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(1200);
    await page.keyboard.up("ArrowRight");
    await page.waitForTimeout(1500);
    const [me, catNow] = [await game(page), await page.evaluate(() => window.__game.cat())];
    check("alley: the cat keeps a few steps behind", Math.hypot(catNow.x - catFrom.x, catNow.y - catFrom.y) > 40 && Math.hypot(me.x - catNow.x, me.y - catNow.y) < 40, `${Math.round(Math.hypot(me.x - catNow.x, me.y - catNow.y))}`);
    await page.evaluate(() => window.__game.trouble());
    await page.waitForTimeout(400);
    const scared = await page.evaluate(() => window.__game.cat());
    check("alley: trouble sends the cat back to its spots", scared.trail === 0 && (!!scared.goal || scared.perches.some(([x, y]) => Math.hypot(x - scared.x, y - scared.y) < 1)));
    await page.evaluate(() => window.__game.cat(15));
    await page.evaluate(() => window.__game.teleport("avenue", 20, 5, "down"));
    await page.waitForTimeout(200);
    const left = await page.evaluate(() => window.__game.cat());
    check("alley: walk out and the cat stays, back on one of its spots", left.trail === 0 && left.perches.some(([x, y]) => Math.hypot(x - left.x, y - left.y) < 1));
    await page.evaluate(() => window.__game.peace());
    await closeDialog();
    await page.evaluate(() => window.__game.give({ seen: [...window.__game.save().seen, "cd"] }));
    await talkTo("avenue", 23.5, 4.4);
    const cdText = (await page.getByTestId("game-dialog").count()) ? await dialogText() : "";
    check("avenue: the CD guy wants a slow beat", (await saved()).seen.includes("cd-ask") && /track four/i.test(cdText), cdText);
    await closeDialog();

    // the subway as fast travel: one stop each way
    await talkTo("street", 31.5, 9.1, "down");
    const stairsText = (await page.getByTestId("game-dialog").count()) ? await dialogText() : "";
    check("street: subway stairs on the far pavement", /Down the stairs/.test(stairsText), stairsText + " " + JSON.stringify((({ place, x, y, target, pending }) => ({ place, x, y, target, pending: !!pending }))(await game(page))));
    await pick(/Get on: the avenue/);
    check("subway: on the train", (await game(page)).ride?.to === "avenue");
    await page.waitForTimeout(3000);
    check("subway: off at the avenue, by the stairs", (await game(page)).place === "avenue" && !(await game(page)).ride);
    await closeDialog();
    await page.evaluate(() => window.__game.teleport("subway", 15, 5.5, "down"));
    // wait for the doors (a train every 34 s): a whole cycle at most
    for (let i = 0; i < 160 && !((await game(page)).t % 34 > 5 && (await game(page)).t % 34 < 9); i++) await page.waitForTimeout(250);
    await page.keyboard.press("e");
    await page.waitForTimeout(200);
    await pick(/Get on: your block/);
    await page.waitForTimeout(3000);
    const home = await game(page);
    check("subway: board when the doors are open, off at your block", home.place === "street" && home.y > 140, `${home.place} ${home.y}`);
    check("subway: rides are counted", (await saved()).stats.rides === 2);
    await closeDialog();

    // sound: footsteps per surface, the crowd, the station announcement
    const underfoot = async (place, x, y) => {
      await page.evaluate(([p, x, y]) => window.__game.teleport(p, x, y, "down"), [place, x, y]);
      return page.evaluate(() => window.__game.surface());
    };
    const feet = [await underfoot("alley", 12, 6), await underfoot("underpass", 10, 6.5), await underfoot("avenue", 20, 7.5), await underfoot("subway", 15, 6.4), await underfoot("club", 12, 8)];
    check("footsteps: grit, concrete, wet road, the platform strip, the club floor", feet.join() === "grit,concrete,wet,metal,floor", feet.join());
    await page.waitForTimeout(200);
    check("club: people talking under the music", (await game(page)).fx.crowd > 0.1);
    await page.evaluate(() => window.__game.teleport("subway", 15, 4.5, "down"));
    const ann0 = (await game(page)).fx.announcements ?? 0;
    for (let i = 0; i < 90 && ((await game(page)).fx.announcements ?? 0) === ann0; i++) await page.waitForTimeout(400);
    check("subway: an announcement as the train comes in, captioned", ((await game(page)).fx.announcements ?? 0) > ann0 && /now arriving/.test((await page.getByTestId("game-toast").textContent().catch(() => "")) ?? ""));

    // more life: a police car, people passing on the avenue, the alley cat, the storm
    check("alley: a cat", (await lifeNow()).actors.some((a) => a.kind === "cat" && a.place === "alley"));
    await page.evaluate(() => window.__game.teleport("avenue", 20, 5, "down"));
    await page.evaluate(() => window.__game.cop());
    await page.waitForTimeout(1500);
    const ave = (await lifeNow()).actors.filter((a) => a.place === "avenue");
    check("avenue: a police car rolls by", ave.some((a) => a.cop));
    check("avenue: people passing through", ave.some((a) => a.id.startsWith("passer")));
    const bolts = (await game(page)).bolts;
    await page.evaluate(() => window.__game.storm());
    await page.waitForTimeout(150);
    check("outside: lightning now and then", (await game(page)).bolts === bolts + 1 && (await game(page)).bolt > 0);

    await page.getByTestId("game-exit").click();
    await page.waitForTimeout(1400);
    check("game: exit returns to the site", (await page.getByTestId("game").count()) === 0);
    check("game: music picks up where it was", !(await audio(page)).paused);
    await page.getByTestId("icon-game").click();
    await page.waitForTimeout(1600);
    check("game: remembers found sounds", (await page.getByTestId("game").textContent()).includes("sounds 8/12"));
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

  // ------------------------------------------------- where windows open
  {
    const { ctx, page } = await open();
    await page.keyboard.press("2");
    await page.keyboard.press("3");
    await page.waitForTimeout(700);
    const [b, so, co] = await Promise.all(["beats", "socials", "contact"].map((id) => page.getByTestId(`window-${id}`).boundingBox()));
    check("1366px: Socials and Contact open beside Beats, not over it", b.x >= 116 && b.x + b.width <= so.x && b.x + b.width <= co.x && co.x + co.width <= 1366, `${Math.round(b.x + b.width)} | ${Math.round(so.x)}, ${Math.round(co.x)}`);
    await ctx.close();
  }
  {
    const { ctx, page } = await open({ viewport: { width: 844, height: 390 }, mobile: true });
    const head = await page.locator("[data-testid=window-beats] .mp-head").boundingBox();
    const foot = await page.locator("[data-testid=window-beats] .mp-foot").boundingBox();
    check("phone held sideways: the tracklist starts above the fold", head && foot && head.y + head.height <= foot.y, head && foot ? `${Math.round(head.y + head.height)} / ${Math.round(foot.y)}` : "");
    await ctx.close();
  }

  // ---------------------------------------------------------------- phone
  {
    const { ctx, page } = await open({ viewport: { width: 390, height: 844 }, mobile: true, now: "2026-10-23T22:58:00" }); // the widest clock ("10:58 PM", local time)
    const w = await page.getByTestId("window-beats").boundingBox();
    check("phone: windows fill the screen", w && w.width >= 385);
    check("phone: no sideways scroll", await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    const pc = await page.getByTestId("cover").boundingBox();
    check("phone: the cover leads the player, big and whole", pc && pc.width >= 220 && pc.x >= 0 && pc.x + pc.width <= 390 && Math.abs(pc.width - pc.height) < 2, pc ? `${Math.round(pc.width)}×${Math.round(pc.height)}` : "");
    check("phone: play is on the first screen", await page.getByTestId("deck-play").evaluate((b) => b.getBoundingClientRect().bottom < window.innerHeight - 44));
    await page.getByTestId("track-dull-knife").scrollIntoViewIfNeeded();
    check("phone: the tracklist scrolls into reach", await page.getByTestId("track-dull-knife").isVisible());
    if (axeSource) {
      await page.addScriptTag({ content: axeSource });
      const pv = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations.map((x) => `${x.id} (${x.nodes.length})`));
      check("axe: no violations on a phone, Beats open", pv.length === 0, pv.join(", "));
    }
    // all three windows open: every one has a button on the taskbar, in reach
    for (const k of ["2", "3"]) {
      await page.keyboard.press(k);
      await page.waitForTimeout(250);
    }
    // let the taskbar finish making room before measuring it
    await page.waitForTimeout(600);
    const tasks = await page.evaluate(() =>
      [...document.querySelectorAll("nav[aria-label=Taskbar] .task-btn")].map((b) => {
        const r = b.getBoundingClientRect();
        const clip = b.parentElement.getBoundingClientRect();
        return { name: b.textContent.trim(), whole: r.left >= clip.left && r.right <= clip.right + 0.5 && r.width >= 28 };
      }),
    );
    check("phone: three windows open, three taskbar buttons in reach", tasks.length === 3 && tasks.every((t) => t.whole), JSON.stringify(tasks));
    await page.getByRole("button", { name: "Close Contact" }).tap();
    await page.getByRole("button", { name: "Close Socials" }).tap();
    await page.getByRole("button", { name: "Close Beats" }).tap();
    await page.getByTestId("icon-game").tap();
    await page.waitForTimeout(1800);
    await page.getByTestId("menu-close").tap();
    await page.waitForTimeout(300);
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
    // mini-games: the title and the way out fit on one line
    await page.evaluate(() => window.__game.mini({ kind: "rhythm", mode: "cypher" }));
    await page.waitForTimeout(300);
    const leaveBox = await page.getByRole("button", { name: /^Leave/ }).boundingBox();
    check("phone: a mini-game's header fits on one line", leaveBox.height < 40);
    await page.getByTestId("rhythm-start").tap();
    await page.waitForTimeout(400);
    check("phone: the rhythm game has pads to tap", (await page.getByRole("button", { name: /pad$/ }).count()) === 4);
    await page.evaluate(() => window.__game.mini(null));
    // a fight on a phone: health where you can see it, toasts under the picture, A/B/eat
    await page.evaluate(() => window.__game.teleport("alley", 12, 6, "right"));
    await page.evaluate(() => window.__game.trouble());
    for (let i = 0; i < 25 && !(await page.getByRole("button", { name: "Fight", exact: true }).count()); i++) {
      await page.waitForTimeout(400);
      if (await page.getByTestId("game-dialog").count()) await page.getByTestId("game-dialog").tap();
    }
    await page.getByRole("button", { name: "Fight", exact: true }).tap();
    await page.waitForTimeout(400);
    check("phone: B and eat show up in a fight", (await page.getByRole("button", { name: "B: dodge" }).isVisible()) && (await page.getByRole("button", { name: "Eat", exact: true }).isVisible()));
    const heart = await page.evaluate(() => {
      const c = document.querySelector("[data-testid=game] canvas");
      const x = window.__game.state().hudX;
      return [...c.getContext("2d").getImageData(x + 6, 7, 1, 1).data];
    });
    check("phone: your health bar is on screen in a fight", heart[0] > 200 && heart[1] < 120, String(heart));
    const toastBox = await page.getByTestId("game-toast").boundingBox();
    const picBox = await page.locator("[data-testid=game] canvas").boundingBox();
    check("phone: toasts go under the picture, not over it", toastBox && toastBox.y >= picBox.y + picBox.height);
    await ctx.close();
  }

  // ---------------------------------------------------- night, similar, loop, left off
  {
    // night: from the system's dark mode until chosen, then remembered
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 800 }, colorScheme: "dark" });
    await ctx.addInitScript(() => localStorage.setItem("saeculo-intro-seen", "1"));
    let page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const look = () =>
      page.evaluate(() => ({
        theme: document.documentElement.dataset.theme,
        paper: getComputedStyle(document.querySelector(".mp")).backgroundColor,
        meta: document.querySelector('meta[name="theme-color"]')?.getAttribute("content"),
      }));
    let l = await look();
    check("night: follows the system's dark mode at first", l.theme === "night" && l.paper === "rgb(30, 28, 25)" && l.meta === "#262320", JSON.stringify(l));
    await page.getByRole("button", { name: "Clock and settings" }).click();
    await page.getByRole("menuitemcheckbox", { name: /Night/ }).click();
    l = await look();
    check("night: the clock menu turns it off (day paper)", l.theme === "day" && l.paper === "rgb(251, 248, 242)");
    await page.keyboard.press("Escape");
    await page.reload({ waitUntil: "networkidle" });
    check("night: the choice is remembered over the system's", (await page.evaluate(() => document.documentElement.dataset.theme)) === "day");
    const sw = page.getByTestId("theme-switch");
    check("night: the taskbar switch shows light", (await sw.getAttribute("aria-checked")) === "false");
    await sw.click();
    l = await look();
    check("night: the taskbar switch turns it on", l.theme === "night" && l.paper === "rgb(30, 28, 25)" && (await sw.getAttribute("aria-checked")) === "true");
    await sw.click();
    check("night: and back off", (await page.evaluate(() => document.documentElement.dataset.theme)) === "day");
    await page.keyboard.press("n");
    check("night: N switches it", (await page.evaluate(() => document.documentElement.dataset.theme)) === "night");
    if (axeSource) {
      await page.addScriptTag({ content: axeSource });
      const v = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations.map((x) => `${x.id} (${x.nodes.length})`));
      check("axe: no violations at night", v.length === 0, v.join(", "));
    }
    await ctx.close();
  }
  {
    // play similar next: the up-next row is the closest beat, and next goes there
    const { ctx, page } = await open();
    await page.getByTestId("similar").click();
    const upNextTitle = await page.getByTestId("up-next").locator("xpath=..").innerText();
    check("similar: one row says up next", (await page.getByTestId("up-next").count()) === 1, upNextTitle);
    const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem("saeculo-player")));
    check("similar: remembered, and it turns shuffle off", prefs.similar === true && prefs.shuffle === false);
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.waitForTimeout(400);
    const now = await page.getByTestId("lcd").innerText();
    check("similar: next goes to the up-next beat", now.includes(upNextTitle.split("\n")[0].trim()), upNextTitle.split("\n")[0]);
    await page.getByRole("button", { name: "Shuffle" }).click();
    check("similar: shuffle turns it off", (await page.getByTestId("similar").getAttribute("aria-pressed")) === "false" && (await page.getByTestId("up-next").count()) === 0);
    await page.getByRole("button", { name: "Shuffle" }).click();

    // loop 8 bars: a band on the waveform, and the music goes round
    if ((await audio(page)).paused) await page.getByTestId("deck-play").click();
    await page.waitForTimeout(600);
    await seekTo(page, 30);
    await page.waitForTimeout(300);
    await page.getByTestId("loop").click();
    const label = await page.getByTestId("loop").innerText();
    check("loop: the button says what's looping", /^looping \d+:\d\d–\d+:\d\d$/.test(label), label);
    const [a, b] = label.replace("looping ", "").split("–").map((x) => x.split(":").reduce((m, s) => m * 60 + Number(s), 0));
    check("loop: 8 bars on the beat's grid, from the bar the playhead is in", a <= 30 && b > 30 && b - a >= 10, `${a}–${b}`);
    // jump to just before the end of the loop and see it come round
    await page.evaluate((t) => (document.querySelector("audio").currentTime = t), b - 0.4);
    await page.waitForTimeout(1500);
    const t = (await audio(page)).t;
    check("loop: playback goes round to the start", t >= a - 0.5 && t < a + 2, t.toFixed(2));
    await page.keyboard.press("l");
    check("loop: L lets go of it", (await page.getByTestId("loop").getAttribute("aria-pressed")) === "false");

    // left off: the next visit opens on the same beat, at the same moment
    await page.getByTestId("deck-play").click();
    await page.waitForTimeout(300);
    const where = await audio(page);
    const title = await page.getByTestId("lcd").innerText();
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    const back = await audio(page);
    const title2 = await page.getByTestId("lcd").innerText();
    check("left off: same beat, same moment, paused", title2.split("\n")[1] === title.split("\n")[1] && Math.abs(back.t - Math.floor(where.t)) < 1.5 && back.paused, `${where.t.toFixed(1)} → ${back.t.toFixed(1)}`);
    await ctx.close();
  }

  // ---------------------------------------------------------------- the career: your page, artists, songs, the people who want a cut
  {
    const SAVE = { found: ["rain"], seenHelp: true, unseen: [], cash: 500, rep: 10, profile: { name: "Tester", skin: 2, hair: "short", hairColor: 0, body: "slim", top: { id: "hoodie", color: 0 }, pants: { id: "jeans", color: 0 }, shoes: { id: "sneakers", color: 0 }, hat: null, extra: null }, settings: { sfx: 0, music: 0, shake: false, hints: true, difficulty: "chill" } };
    const { ctx, page } = await open({ init: { "saeculo-game": JSON.stringify(SAVE) } });
    await page.getByTestId("icon-game").click();
    await page.waitForTimeout(1600);
    const g = (fn, ...a) => page.evaluate(([fn, a]) => window.__game[fn](...a), [fn, a]);
    const career = () => g("career");
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("saeculo-game")));
    const shut = async () => {
      for (let i = 0; i < 8 && (await page.getByTestId("game-dialog").count()); i++) {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(120);
      }
    };
    const choose = async (name) => {
      for (let i = 0; i < 8 && !(await page.getByTestId("game-dialog").getByRole("button", { name }).count()); i++) {
        await page.keyboard.press("e");
        await page.waitForTimeout(150);
      }
      const b = page.getByTestId("game-dialog").getByRole("button", { name });
      if (await b.count()) await b.first().click();
      await page.waitForTimeout(200);
    };
    const winFight = async (place) => {
      await g("weaken");
      for (let i = 0; i < 50 && (await g("fight"))?.outcome === ""; i++) {
        const f = await g("fight");
        const foe = f.foes.find((x) => x.state !== "down" && x.state !== "flee");
        if (foe) await page.evaluate(([p, x, y]) => window.__game.teleport(p, (x - 9) / 16, y / 16, "right"), [place, foe.x, foe.y]);
        await page.keyboard.press("e");
        await page.waitForTimeout(380);
      }
      await page.waitForTimeout(700);
    };
    const meetCrew = async (crew) => {
      await g("crew", crew);
      for (let i = 0; i < 40 && !(await page.getByTestId("game-dialog").count()); i++) await page.waitForTimeout(250);
    };
    await g("peace");

    check("career: followers in the top bar", (await page.getByTestId("game-fans").textContent()).includes("12"));
    await g("menu", "settings");
    await page.waitForTimeout(250);
    await page.getByTestId("menu-save").click();
    await page.waitForTimeout(150);
    check("save: a Save button in the menu, and it says so", (await page.getByTestId("game-saved").textContent()).includes("saved") && (await page.getByTestId("menu-save-note").isVisible()));
    await g("menu", null);
    await page.waitForTimeout(150);
    await page.keyboard.press("p");
    await page.waitForTimeout(300);
    check("phone: P opens your page", await page.getByTestId("phone").isVisible());
    check("phone: your followers on it", (await page.getByTestId("phone-fans").textContent()).trim() === "12");
    check("phone: nothing to post before you've made a beat", await page.getByTestId("phone-post-beat").isDisabled());
    await page.getByTestId("phone-tab-money").click();
    check("phone: the money tab", await page.getByTestId("phone-money").isVisible());
    if (axeSource) {
      // after the phone's fade in (mid-fade, colours read too dim)
      await page.waitForTimeout(500);
      await page.addScriptTag({ content: axeSource });
      const pv = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations.map((x) => `${x.id} (${x.nodes.length}): ${x.nodes.map((n) => n.target).join(" ")}`));
      check("axe: no violations on the phone", pv.length === 0, pv.join(", "));
    }
    await page.keyboard.press("p");
    await page.waitForTimeout(200);
    check("phone: P puts it away", (await page.getByTestId("phone").count()) === 0);

    // an artist: Lil Brick outside the store buys a beat, swaps numbers, makes a song
    await g("makeTape", "first tape");
    await g("teleport", "street", 23.4, 5.25, "up");
    await page.waitForTimeout(300);
    check("artist: Lil Brick's outside the store", (await page.getByTestId("game-prompt").textContent()).includes("Lil Brick"));
    const cash0 = (await saved()).cash;
    await page.keyboard.press("e");
    await choose(/Sell them “first tape”/);
    let c = await career();
    check("artist: sell him a beat: paid, followers, a post", c.leases.brick?.includes("first tape") && (await saved()).cash > cash0 && c.fans > 12 && c.posts === 1, `${cash0} → ${(await saved()).cash}, ${c.fans} followers`);
    await shut();
    await page.keyboard.press("e");
    check("artist: he won't buy the same tape twice", (await page.getByTestId("game-dialog").textContent()).length > 0 && !(await page.getByTestId("game-dialog").getByRole("button", { name: /Sell them/ }).count()));
    await choose("Swap numbers");
    check("artist: swap numbers: he's in your phone", (await career()).contacts.includes("brick"));
    await shut();
    await page.keyboard.press("e");
    await choose(/Make a song/);
    check("session: the recording session opens", await page.getByTestId("session").isVisible());
    await page.getByTestId("session-start").click();
    for (let i = 0; i < 8; i++) {
      await page.waitForTimeout(260);
      await page.keyboard.press("Space");
    }
    await page.waitForTimeout(200);
    await page.getByTestId("session-bounce").click();
    c = await career();
    check("session: a song comes out of it, with a score", (await page.getByTestId("session-score").isVisible()) && c.collabs.length === 1 && c.collabs[0].artist === "brick", JSON.stringify(c.collabs[0] ?? {}).slice(0, 120));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    // the catalogue earns on its own
    const before = await saved();
    await g("payOut", 5);
    const after = await saved();
    check("royalties: songs earn while you're out", after.stats.royalties > 0 && after.cash > before.cash && after.collabs[0].streams > 0, `+$${(after.cash - before.cash).toFixed(2)}`);

    // posting: a beat (once per tape), a fit pic
    await g("phone", "page");
    await page.waitForTimeout(200);
    const f0 = (await career()).fans;
    await page.getByTestId("phone-post-beat").click();
    await page.waitForTimeout(200);
    check("phone: post your beat: followers, and it goes up on your beat store", (await career()).fans > f0 && (await career()).posted.includes("first tape") && (await page.getByTestId("phone-post-beat").isDisabled()));
    const f1 = (await career()).fans;
    await page.getByTestId("phone-post-fit").click();
    await page.waitForTimeout(200);
    check("phone: post a fit: followers, then a wait before the next", (await career()).fans > f1 && (await page.getByTestId("phone-post-fit").isDisabled()));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    // going up: artists write in
    await g("fans", 600);
    await page.waitForTimeout(300);
    c = await career();
    check("fame: going up brings artists into your messages", c.tier === 2 && c.inbox.some((m) => m.act === "link") && (await page.getByTestId("game-phone-btn").getAttribute("aria-label")).includes("new"), `${c.fans} followers, ${c.inbox.length} messages`);
    await g("phone", "dms");
    await page.waitForTimeout(200);
    await page.getByTestId("phone-dms").getByRole("button", { name: "link up" }).first().click();
    await page.waitForTimeout(200);
    check("phone: link up from a message", (await career()).contacts.length >= 2);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    // trouble on your own street, once people know your face
    check("fame: people who know you can find you on your own street", (await g("odds", "street")).ambush > 0);

    // the Block Kings: they come asking, you say no, they come for you
    await g("fans", 1000);
    await page.waitForTimeout(300);
    check("kings: they've noticed you're getting money", (await career()).mob.kings.stage === "asked");
    await shut();
    await g("teleport", "alley", 12, 6, "right");
    await page.waitForTimeout(300);
    await meetCrew("envoy-kings");
    check("kings: Rook comes to talk", (await page.getByTestId("game-dialog").textContent()).length > 0 && (await g("crewNow")) === "envoy-kings");
    await choose("No.");
    check("kings: say no and they're after you", (await career()).mob.kings.stage === "hunted");
    await shut();
    await g("peace");
    await page.waitForTimeout(1500);
    await meetCrew("gang");
    await choose("Fight");
    check("kings: a crew of theirs, in a fight", (await g("fight"))?.foes.length === 3);
    await winFight("alley");
    check("kings: see one off and it counts", (await career()).mob.kings.squads === 1, JSON.stringify((await career()).mob.kings));
    await shut();
    await g("give", { mob: { ...(await saved()).mob, kings: { stage: "hunted", squads: 3, paid: 0 } } });
    await g("peace");
    await page.waitForTimeout(1500);
    await meetCrew("heavy-kings");
    await choose("Fight");
    check("kings: then Rook himself", (await g("fight"))?.boss === true);
    await winFight("alley");
    const done = await saved();
    check("kings: beat Rook: done with them, his bat, the goal", done.mob.kings.stage === "done" && done.weapons.includes("spiked") && done.goals.includes("kings"));
    await shut();

    // robbers want what you've got on
    await g("give", { owned: [...(await saved()).owned, "chain"], profile: { ...(await saved()).profile, neck: { id: "chain", color: 0 } } });
    await g("peace");
    await page.waitForTimeout(1500);
    await meetCrew("robbers");
    await choose(/Hand over the chain/);
    const robbed = await saved();
    check("robbers: they know your face and take your chain", !robbed.owned.includes("chain") && robbed.profile.neck === null);
    await shut();

    // Smokey's coat: weapons for sale
    await g("teleport", "alley", 21.2, 6.2, "right");
    await page.waitForTimeout(300);
    await page.keyboard.press("e");
    await choose("See what's in the coat");
    check("smokey: his coat opens like a shop", await page.getByTestId("shop").isVisible());
    await page.getByTestId("buy-pipe").getByRole("button").click();
    await page.waitForTimeout(200);
    const armed = await saved();
    check("smokey: buy a lead pipe, it's in your hand", armed.weapons.includes("pipe") && armed.weapon === "pipe");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    // a taser stuns
    await g("give", { weapons: [...(await saved()).weapons, "taser"], weapon: "taser" });
    await g("peace");
    await page.waitForTimeout(1500);
    await meetCrew("drunks");
    await choose("Fight");
    await page.waitForTimeout(300);
    let stunned = false;
    for (let i = 0; i < 12 && !stunned; i++) {
      const f = await g("fight");
      const foe = f.foes.find((x) => x.state !== "down" && x.state !== "flee");
      if (!foe) break;
      await page.evaluate(([x, y]) => window.__game.teleport("alley", (x - 9) / 16, y / 16, "right"), [foe.x, foe.y]);
      await page.keyboard.press("e");
      await page.waitForTimeout(120);
      stunned = (await g("fight")).foes.some((x) => x.state === "stagger");
      await page.waitForTimeout(700);
    }
    check("taser: it leaves them reeling", stunned);
    await winFight("alley");
    await shut();

    // Maison, at the end of the avenue
    await g("teleport", "avenue", 42.5, 3.3, "up");
    await page.waitForTimeout(200);
    await page.keyboard.down("ArrowUp");
    await page.waitForTimeout(500);
    await page.keyboard.up("ArrowUp");
    await page.waitForTimeout(700);
    check("maison: a door at the end of the avenue", (await page.getByTestId("game").getAttribute("data-place")) === "boutique");
    await g("mini", { kind: "shop", shop: "maison" });
    await page.waitForTimeout(300);
    check("maison: some pieces are only for people with a following", await page.getByTestId("buy-iced").getByRole("button").isDisabled());
    await page.getByTestId("buy-logo-tee").getByRole("button").click();
    await page.waitForTimeout(200);
    check("maison: buy a designer tee", (await saved()).owned.includes("logo-tee"));
    if (axeSource) {
      const mv = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations.map((x) => `${x.id} (${x.nodes.length}): ${x.nodes.map((n) => n.target).join(" ")}`));
      check("axe: no violations at Maison", mv.length === 0, mv.join(", "));
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    // the cups
    await g("mini", { kind: "monte" });
    await page.waitForTimeout(300);
    const m0 = (await saved()).cash;
    await page.getByTestId("monte-go").click();
    for (let i = 0; i < 40 && !(await page.getByTestId("monte-cup-1").isEnabled()); i++) await page.waitForTimeout(200);
    await page.getByTestId("monte-cup-1").click();
    await page.waitForTimeout(200);
    check("cups: find the ball (or don't): five dollars either way", Math.abs((await saved()).cash - m0) === 5, `${m0} → ${(await saved()).cash}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    // Tank's fight night
    await g("give", { seen: [...(await saved()).seen, "tank-beaten"] });
    await g("teleport", "underpass", 17.5, 8.6, "right");
    await page.waitForTimeout(300);
    await g("ring");
    await page.waitForTimeout(200);
    await shut();
    check("fight night: round one", (await g("ringRound")) === 1 && (await g("fight"))?.foes.length === 2);
    await winFight("underpass");
    const r0 = (await saved()).cash;
    await choose(/Take \$40 and go/);
    check("fight night: take the money after a round", (await saved()).cash === r0 + 40);
    await shut();
    await ctx.close();
  }

  // ---------------------------------------------------------------- charts, shows, a manager, a mixtape, Vee's beef
  {
    const SAVE = { found: ["rain"], seenHelp: true, unseen: [], cash: 300, rep: 10, fans: 900, profile: { name: "Tester", skin: 2, hair: "short", hairColor: 0, body: "slim" }, stats: { battleWins: 1, beatsSold: 1 }, settings: { sfx: 0, music: 0, shake: false, hints: true, difficulty: "chill" } };
    const { ctx, page } = await open({ init: { "saeculo-game": JSON.stringify(SAVE) } });
    await page.getByTestId("icon-game").click();
    await page.waitForTimeout(1600);
    const g = (fn, ...a) => page.evaluate(([fn, a]) => window.__game[fn](...a), [fn, a]);
    const career = () => g("career");
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("saeculo-game")));
    const shut = async () => {
      for (let i = 0; i < 8 && (await page.getByTestId("game-dialog").count()); i++) {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(120);
      }
    };
    await g("peace");
    await g("makeTape", "chart tape");
    await g("give", { contacts: ["brick"], rel: { brick: 1 } });
    await g("session", "brick", 85);
    await g("chartTick");
    let c = await career();
    check("charts: your first song goes onto the city top 10", c.chart.week === 1 && c.chart.entries.some((e) => e.mine) && c.chart.entries.some((e) => e.artist === "Vee"), JSON.stringify(c.chart.entries.map((e) => e.title)).slice(0, 160));
    await g("phone", "charts");
    await page.waitForTimeout(250);
    check("phone: the charts tab shows it", (await page.getByTestId("phone-charts").textContent()).includes(c.collabs[0].title));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    // a booking: the club, at 1,000 followers
    await g("fans", 200);
    await page.waitForTimeout(300);
    c = await career();
    check("shows: at 1,000 followers the club wants you headlining", c.inbox.some((m) => m.act === "show"));
    await g("phone", "dms");
    await page.waitForTimeout(200);
    await page.getByTestId("phone-dms").getByRole("button", { name: /headline the club/ }).first().click();
    await page.waitForTimeout(200);
    check("shows: say yes and it's booked", (await career()).show === "club");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    await g("teleport", "club", 12, 10, "up");
    for (let i = 0; i < 12 && !(await page.getByTestId("game-dialog").count()); i++) await page.waitForTimeout(200);
    for (let i = 0; i < 4 && !(await page.getByTestId("game-dialog").getByRole("button", { name: "Go on" }).count()); i++) {
      await page.keyboard.press("e");
      await page.waitForTimeout(150);
    }
    await page.getByTestId("game-dialog").getByRole("button", { name: "Go on" }).click();
    await page.waitForTimeout(300);
    check("shows: walk in and the show starts (the rhythm game, your show)", (await page.getByTestId("rhythm").isVisible()) && (await page.getByTestId("rhythm").textContent()).includes("Your show"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    const cash0 = (await saved()).cash;
    await g("showDone", "club", 80);
    c = await career();
    check("shows: door money, followers, the booking's done", c.stats.shows === 1 && c.show === null && (await saved()).cash > cash0);
    await shut();

    // a manager at 2,000
    await g("fans", 1000);
    await page.waitForTimeout(300);
    await g("phone", "dms");
    await page.waitForTimeout(200);
    await page.getByTestId("phone-dms").getByRole("button", { name: /sign with/ }).click();
    await page.waitForTimeout(200);
    c = await career();
    check("manager: sign at 2,000 followers, and they take their 10%", c.manager === "hired" && Math.abs(c.cut - 0.1) < 0.001);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    // a mixtape: five songs
    for (let i = 0; i < 4; i++) await g("session", "brick", 70);
    await g("phone", "money");
    await page.waitForTimeout(200);
    await page.getByTestId("phone-mixtape").click();
    await page.waitForTimeout(200);
    c = await career();
    check("mixtape: five songs go out as a tape", c.mixtapes.length === 1 && c.mixtapes[0].songs.length === 5 && (await page.getByTestId("phone-mixtape").isDisabled()));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    await g("teleport", "rooftop", 6, 6, "up");
    for (let i = 0; i < 10 && !(await page.getByTestId("game-dialog").count()); i++) await page.waitForTimeout(200);
    check("mixtape: a listening party on your roof", (await page.getByTestId("game-dialog").textContent()).includes("roof"));
    await shut();

    // Vee's beef
    await g("dissDone", 80);
    c = await career();
    check("beef: a diss that lands knocks Vee off the chart", c.stats.disses === 1 && !c.chart.entries.some((e) => e.artist === "Vee"));

    // the cups by keyboard
    await g("mini", { kind: "monte" });
    await page.waitForTimeout(300);
    const m0 = (await saved()).cash;
    await page.getByTestId("monte-go").click();
    for (let i = 0; i < 40 && !(await page.getByTestId("monte-cup-1").isEnabled()); i++) await page.waitForTimeout(200);
    await page.keyboard.press("2");
    await page.waitForTimeout(200);
    check("cups: 1 2 3 pick a cup", Math.abs((await saved()).cash - m0) === 5);
    await page.keyboard.press("Escape");
    await ctx.close();
  }

  // ---------------------------------------------------------------- street life, upgrades, the taxi, three more games
  {
    const SAVE = { found: ["rain"], seenHelp: true, unseen: [], cash: 3000, rep: 10, fans: 600, places: ["bedroom", "street", "avenue", "underpass", "club"], profile: { name: "Tester", skin: 2, hair: "short", hairColor: 0, body: "slim" }, settings: { sfx: 0, music: 0, shake: false, hints: true, difficulty: "chill" } };
    const { ctx, page } = await open({ init: { "saeculo-game": JSON.stringify(SAVE) } });
    await page.getByTestId("icon-game").click();
    await page.waitForTimeout(1600);
    const g = (fn, ...a) => page.evaluate(([fn, a]) => window.__game[fn](...a), [fn, a]);
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("saeculo-game")));
    const shut = async () => {
      for (let i = 0; i < 8 && (await page.getByTestId("game-dialog").count()); i++) {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(120);
      }
    };
    const choose = async (name) => {
      for (let i = 0; i < 8 && !(await page.getByTestId("game-dialog").getByRole("button", { name }).count()); i++) {
        await page.keyboard.press("e");
        await page.waitForTimeout(150);
      }
      const b = page.getByTestId("game-dialog").getByRole("button", { name });
      if (await b.count()) await b.first().click();
      await page.waitForTimeout(200);
    };
    const meetCrew = async (crew) => {
      await g("crew", crew);
      for (let i = 0; i < 40 && !(await page.getByTestId("game-dialog").count()); i++) await page.waitForTimeout(250);
    };
    const nextTo = async (place) => {
      const f = await g("fight");
      const foe = f.foes.find((x) => x.state !== "down" && x.state !== "flee");
      if (foe) await page.evaluate(([p, x, y]) => window.__game.teleport(p, (x - 9) / 16, y / 16, "right"), [place, foe.x, foe.y]);
      return foe;
    };
    await g("peace");

    // a heavy hit (R) knocks the knife out of their hand; three in a row is a combo
    await g("teleport", "alley", 12, 6, "right");
    await page.waitForTimeout(300);
    await meetCrew("drunks");
    await choose("Fight");
    await page.waitForTimeout(300);
    await g("armFoes", "knife");
    let disarmed = false;
    for (let i = 0; i < 10 && !disarmed; i++) {
      await nextTo("alley");
      await page.keyboard.press("r");
      await page.waitForTimeout(150);
      disarmed = (await g("fight")).foes.some((f) => f.arm === null);
      await page.waitForTimeout(900);
    }
    check("fight: a heavy hit (R) knocks the knife out of their hand", disarmed);
    let best = 0;
    for (let i = 0; i < 14 && best < 3 && (await g("fight"))?.outcome === ""; i++) {
      await nextTo("alley");
      await page.keyboard.press("e");
      await page.waitForTimeout(400);
      best = Math.max(best, (await g("fight"))?.combo ?? 0);
    }
    check("fight: hits in a row build a combo", best >= 2, `best run ${best}`);
    await g("weaken");
    for (let i = 0; i < 30 && (await g("fight"))?.outcome === ""; i++) {
      await nextTo("alley");
      await page.keyboard.press("e");
      await page.waitForTimeout(380);
    }
    await page.waitForTimeout(700);
    check("heat: a fight won gets noticed", (await saved()).heat >= 0.5, String((await saved()).heat));
    await shut();

    // the police: hot enough, an officer stops you
    await g("give", { heat: 3 });
    await page.waitForTimeout(200);
    check("heat: stars in the top bar", (await page.getByTestId("game-heat").textContent()).length === 3);
    await g("teleport", "avenue", 20, 4.6, "down");
    await page.waitForTimeout(300);
    await g("peace");
    await page.waitForTimeout(1500);
    await meetCrew("cops");
    await choose(/Pay the fine \(\$120\)/);
    check("police: pay the fine and the heat's gone", (await saved()).heat === 0 && (await saved()).cash <= 3000 - 120 + 200);
    await shut();

    // a corner for the Kings
    await g("give", { mob: { ...(await saved()).mob, kings: { stage: "paying", squads: 0, paid: 0 } }, turf: "underpass" });
    await g("peace");
    await g("teleport", "underpass", 4, 6.5, "right");
    for (let i = 0; i < 30 && !(await page.getByTestId("game-dialog").getByRole("button", { name: "Run them off" }).count()); i++) {
      await page.waitForTimeout(250);
      if (await page.getByTestId("game-dialog").count()) await page.keyboard.press("e");
    }
    check("turf: the Syndicate are on the Kings' corner", (await page.getByTestId("game-dialog").getByRole("button", { name: "Run them off" }).count()) === 1);
    await choose("Run them off");
    await g("weaken");
    for (let i = 0; i < 40 && (await g("fight"))?.outcome === ""; i++) {
      await nextTo("underpass");
      await page.keyboard.press("e");
      await page.waitForTimeout(380);
    }
    await page.waitForTimeout(800);
    check("turf: clear it and Rook pays", (await saved()).stats.turfWins === 1 && (await saved()).turf === null);
    await shut();

    // upgrades, bought on the phone
    await g("phone", "page");
    await page.waitForTimeout(250);
    await page.getByTestId("phone-shop").click();
    await page.waitForTimeout(250);
    check("shop online: opens from the phone", await page.getByTestId("shop").isVisible());
    for (const id of ["monitors", "booth", "scooter", "neon"]) await page.getByTestId(`buy-${id}`).getByRole("button").click();
    const ups = (await saved()).upgrades;
    check("upgrades: monitors, a booth, a scooter, a neon sign", ["monitors", "booth", "scooter", "neon"].every((id) => ups.includes(id)));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    // the scooter: free, anywhere you've been
    await g("phone", "page");
    await page.waitForTimeout(250);
    await page.getByTestId("phone-taxi").click();
    await page.waitForTimeout(250);
    const c0 = (await saved()).cash;
    await page.getByTestId("taxi-street").click();
    await page.waitForTimeout(900);
    check("scooter: off to your block, free", (await page.getByTestId("game").getAttribute("data-place")) === "street" && (await saved()).cash === c0);

    // the freestyle battle
    await shut();
    await g("mini", { kind: "freestyle", opponent: "Riz" });
    await page.waitForTimeout(300);
    await page.getByTestId("freestyle-start").click();
    for (let r = 0; r < 4; r++) {
      await page.waitForTimeout(200);
      await page.keyboard.press("1");
      await page.waitForTimeout(200);
      if (r < 3) await page.getByTestId("freestyle-next").click();
    }
    await page.waitForTimeout(300);
    check("freestyle: four rounds, a result", await page.getByTestId("freestyle-result").isVisible());
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    // pool
    await g("mini", { kind: "pool" });
    await page.waitForTimeout(300);
    await page.getByTestId("pool-start").click();
    await page.getByTestId("pool-shoot").click();
    await page.waitForTimeout(400);
    check("pool: rack them, take a shot", (await page.getByTestId("pool").textContent()).includes("5 shots left"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    // a delivery run
    await g("mini", { kind: "delivery" });
    await page.waitForTimeout(300);
    await page.getByTestId("delivery-start").click();
    await page.waitForTimeout(800);
    await page.keyboard.press("ArrowLeft");
    check("delivery: on the bike, on the road", (await page.getByTestId("delivery-start").count()) === 0 && (await page.getByTestId("delivery-road").isVisible()));
    if (axeSource) {
      await page.addScriptTag({ content: axeSource });
      const dv = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations.map((x) => `${x.id} (${x.nodes.length}): ${x.nodes.map((n) => n.target).join(" ")}`));
      check("axe: no violations on the delivery run", dv.length === 0, dv.join(", "));
    }
    await page.keyboard.press("Escape");
    await ctx.close();
  }

  // ---------------------------------------------------------------- the phone on a phone
  {
    const { ctx, page } = await open({ viewport: { width: 390, height: 844 }, mobile: true, init: { "saeculo-game": JSON.stringify({ found: [], seenHelp: true, unseen: [], profile: { name: "R", skin: 1, hair: "short", hairColor: 0, body: "slim" }, fans: 3000 }) } });
    await page.getByRole("button", { name: "Close Beats" }).tap();
    await page.getByTestId("icon-game").tap();
    await page.waitForTimeout(1600);
    await page.getByTestId("game-phone-btn").tap();
    await page.waitForTimeout(300);
    const box = await page.getByTestId("phone").boundingBox();
    check("phone on a phone: fits the screen", box && box.width <= 390 && (await page.evaluate(() => document.documentElement.scrollWidth)) <= 390);
    check("phone on a phone: the top bar shows followers", (await page.getByTestId("game-fans").textContent()).includes("3K"));
    await ctx.close();
  }

  // ---------------------------------------------------------------- accessibility
  if (axeSource) {
    const { ctx, page } = await open();
    await page.getByTestId("icon-socials").click();
    await page.getByTestId("icon-contact").click();
    // let the windows finish opening (mid-animation, colours read wrong)
    await page.waitForTimeout(800);
    await page.addScriptTag({ content: axeSource });
    const vs = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations.map((x) => ({ id: x.id, nodes: x.nodes.map((n) => [n.target, n.any?.[0]?.message]) })));
    const v = vs.map((x) => `${x.id} (${x.nodes.length})`);
    check("axe: no violations on the desktop", v.length === 0, v.join(", "));
    if (v.length) console.log(JSON.stringify(vs));
    const axeNow = () => page.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations.map((x) => `${x.id} (${x.nodes.length}): ${x.nodes.map((n) => n.target).join(" ")}`));
    await page.getByRole("button", { name: "Clock and settings" }).click();
    const mv = await axeNow();
    check("axe: no violations with the clock menu open", mv.length === 0, mv.join(", "));
    await page.getByRole("menuitem", { name: "Keyboard shortcuts" }).click();
    await page.waitForTimeout(300);
    const kv = await axeNow();
    check("axe: no violations on the shortcuts card", kv.length === 0, kv.join(", "));
    await page.keyboard.press("Escape");
    if (await page.getByTestId("shortcuts").count()) await page.getByRole("button", { name: "Close shortcuts" }).click();
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
