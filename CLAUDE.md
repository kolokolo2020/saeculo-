@AGENTS.md

# saeculo

A promo site for the producer saeculo. The whole site is one page: a fake retro
tape-deck OS with draggable windows. Next.js 16 App Router, React 19, Tailwind
v4, zustand for window state. No backend, no database, fully static.

## Commands

- `npm run dev` — dev server on :3000. Keep it running; screenshot it to check
  any visual work.
- `npm run build` — must pass before every commit.
- `npm run lint`
- `npm run typecheck` — run this, not `npx tsc`, which resolves to an
  unrelated package when devDependencies aren't installed.
- `npm run verify` — Playwright smoke test. Needs a dev server already
  running, and uses your installed Chrome rather than a downloaded browser.
- `npm run gen:audio` — regenerates the synthesized placeholder instrumentals.

## Rules that keep getting broken

- IMPORTANT: Next.js 16, React 19 and Tailwind v4 are all newer than your
  training data. Check `node_modules/next/dist/docs/` before using a Next API.
  There is no `tailwind.config.js` in v4 — config lives in the `@theme` block
  in `src/app/globals.css`.
- Colour, type and chrome come from the tokens in `globals.css` only. Never
  write a raw hex, a default Tailwind colour (`bg-gray-800`), or `rounded-lg`
  into a component. Use `void / panel / panel-2 / ink / mute / signal / bleed /
  paper` and the `.deck-panel` / `.deck-button` classes.
- A new app window means four things, not one: the component, an entry in
  `src/components/window-manager/windowRegistry.ts`, a desktop icon, and a
  start-menu entry.
- All audio goes through `src/lib/synth.ts` and the shared AudioContext in
  `src/lib/audio.ts`. Never create a second AudioContext.
- Anything that will be replaced with real material lives in `src/data/`. Never
  hardcode a track title, bio line, email or social URL in a component.
- Anything that animates must respect `prefers-reduced-motion`. The hook
  already exists: `src/hooks/usePrefersReducedMotion.ts`.
- Below 768px windows open full-screen, one at a time. Check both widths.

## Definition of done

Not done until `npm run build` passes, `npm run typecheck` is clean, and — for
any visible change — you have screenshotted the result at 1440px and 390px and
described what you see. Show me the evidence; do not assert success.

## Git

- Branch from `main`. `main` is the default branch. Never target
  `feature/retro-os-site`.
- One concern per PR.

## Known placeholders — not bugs

`src/data/profile.ts` and `src/data/tracks.ts` still hold placeholder bio,
booking address, social URLs and streaming links, and `public/audio/*` are
synthesized stand-ins. Leave them alone unless asked to change them.
