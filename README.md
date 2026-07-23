# saeculo

An interactive promo site for saeculo's instrumentals — the whole site is a
fake retro desktop OS. Double-click (or Tab + Enter) desktop icons to open
draggable windows: a Winamp-style music player with a live audio-reactive
visualizer, an About page, a contact/booking page, and a guestbook.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Placeholder content

Nothing in here is real yet — swap it out before launch:

- **Beats**: `src/data/tracks.ts` lists the tracks and their streaming
  links. The actual audio in `public/audio/*.wav` is procedurally
  synthesized (no samples, fully original) by `scripts/generate-audio.mjs`
  — replace those files with your real instrumentals (any audio the
  `<audio>` element supports), and update `src/data/tracks.ts` to match.
  Re-run `npm run gen:audio` if you ever want to regenerate the
  placeholders.
- **Bio & socials**: `src/data/profile.ts`.
- **Booking email**: also in `src/data/profile.ts`.

## Project structure

- `src/components/window-manager/` — the draggable window system
  (zustand store, drag hook, window chrome, taskbar/start-menu registry).
- `src/components/desktop/` — the desktop shell: boot sequence, icons,
  taskbar, start menu, CRT scanline overlay.
- `src/components/apps/` — the actual "apps": `MusicPlayerApp` (player +
  canvas visualizer wired to the Web Audio API), `AboutApp`, `ContactApp`,
  `GuestbookApp` (localStorage only, no backend).
- `scripts/generate-audio.mjs` — synthesizes the placeholder beats.
- `scripts/verify.mjs` — a Playwright smoke test covering the boot
  sequence, keyboard-only app access, dragging, playback, the visualizer
  animating, and the mobile full-screen fallback. Not part of the build;
  run manually against a local dev server if you want to re-check things
  (`npm i -D playwright-core` first, it's intentionally not a saved
  dependency).

## Mobile

Below 768px, windows open full-screen one at a time instead of as
draggable floating windows — dragging doesn't make sense on a phone. Use
the taskbar or the "▾ desk" button to get back to the icon grid.

## Deploying

Static, no backend/database — deploys cleanly to Vercel or any Next.js
host: `npm run build && npm start`, or connect the repo to Vercel.
