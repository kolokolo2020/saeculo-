<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# How to work on saeculo

Read `README.md` first: it describes every part of the site and where it
lives.

- **Branches and PRs:** branch from `main`, commit and push after each
  step, and open a **draft PR**. Only merge when the owner explicitly says
  "merge".
- **Before every commit:** `npx tsc --noEmit`, `npm run lint` and
  `npm run build`, then the browser checks:
  1. `npx next dev -p 3210`
  2. `npm i --no-save playwright-core axe-core sharp`
  3. `node scripts/verify.mjs` (all checks must pass; axe must stay clean)

  Extend `verify.mjs` for every new feature. In the dev server the game
  exposes `window.__game` (state, teleport, kit levels) for these tests.
- **Look at the result:** take Playwright screenshots at 1366×800 (desktop)
  and 390×844 (phone) and check them. Chromium is at
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
- **Style:** quiet and restrained; four destinations only (Beats, Socials,
  Contact, Game); respect reduced motion and the still-visuals setting;
  nothing may block clicks or focus; must work on phones.
- **Content:** only real content. Tracks and covers in `src/data/tracks.ts`,
  links and the optional featured video in `src/data/profile.ts`. Don't
  invent tracks, links, lore or artwork.
- The sandbox proxy blocks vercel.app; use the GitHub and Vercel MCP tools.
- Don't run two sessions on the same branch at once.
