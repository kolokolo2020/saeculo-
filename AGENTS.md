<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# How to work on saeculo

Read `README.md` and `docs/aura-plan.md` first: the README describes every
feature and where it lives, the plan is the roadmap.

- **Branches and PRs:** branch from `main`, commit and push after each
  step, and open a **draft PR**. Only merge when the owner explicitly says
  "merge".
- **Before every commit:** `npx tsc --noEmit`, `npm run lint` and
  `npm run build`, then the browser checks:
  1. `npx next dev -p 3210`
  2. `npm i --no-save playwright-core axe-core sharp`
  3. `node scripts/verify.mjs` (all checks must pass; axe must stay clean)

  Extend `verify.mjs` for every new feature. Windows open with a CRT
  animation in Tape/Midnight, so let it settle (~700 ms) before measuring
  a window.
- **Look at the result:** take Playwright screenshots at 1366×800 (desktop)
  and 390×844 (phone) and check them. Chromium is at
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
- **Style:** effects subtle by default, stronger in Midnight; respect
  reduced motion; nothing may block clicks or focus; must work on phones.
- **Content still to come from the owner:** the bio and next release in
  `src/data/profile.ts`, the vault snippets and letter in
  `src/data/secrets.ts`. Don't invent real-looking replacements.
- The sandbox proxy blocks vercel.app; use the GitHub and Vercel MCP tools.
- Don't run two sessions on the same branch at once.
