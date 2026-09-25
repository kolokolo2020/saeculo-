# saeculo

An interactive promo site for saeculo's instrumentals, built as a glassy,
Vista-era blue desktop: frosted Aero windows, a glowing start orb, a
sidebar of gadgets, and a Bubbles screensaver. Click (or Tab + Enter) a
desktop icon to open it.

What's on the desktop:

- **Media Player** — plays the beats with three live visualizers (Aurora,
  Bars & Waves, Scope). Music lives in a global player, so it keeps
  playing when the window closes; the sidebar Now Playing gadget and the
  taskbar tray control it too.
- **Beat Maker** — a 16-step drum sequencer with genre presets and a
  randomizer; every sound is synthesized live.
- **Games** — a games folder with three rhythm games:
  - **Rhythm Rush** — the chosen beat plays and notes fall on its grid;
    hit D / F / J / K. Ranked S–D on accuracy.
  - **Beat Brawl** — a boss fight against a metronome that speeds up.
  - **Pad Recall** — Simon on an MPC: repeat the pad pattern
    (Q W E R / A S D F).
- **about.txt** (Notepad), **Contact** (a compose-mail form that opens the
  visitor's mail app), and a **Recycle Bin** of beats that didn't make it.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Placeholder content

Nothing in here is real yet — swap it out before launch:

- **Beats**: `src/data/tracks.ts` lists the tracks, their BPM (the rhythm
  games chart notes from it), and streaming links. The audio in
  `public/audio/*.wav` is procedurally synthesized (no samples) by
  `scripts/generate-audio.mjs` — replace those files with your real
  instrumentals and update `src/data/tracks.ts` to match, keeping each
  track's `bpm` accurate so the games stay on the beat.
- **Bio, socials, booking email**: `src/data/profile.ts`.

## Project structure

- `src/app/globals.css` — the Aero theme: glass frames, caption buttons,
  Vista push buttons, taskbar, start menu, sliders, aurora wallpaper.
- `src/components/desktop/` — the shell: boot + Welcome screen, desktop
  icons, taskbar, start menu (with search, lock, restart), sidebar gadgets,
  Bubbles screensaver.
- `src/components/window-manager/` — windows: zustand store, drag and
  resize hooks, maximize, the glass `WindowFrame`, and the app registry.
- `src/components/player/` — the global audio player store, the single
  `<audio>` element (`AudioEngine`), and the visualizer.
- `src/components/games/` + `src/lib/laneEngine.ts` — the shared engine
  behind Rhythm Rush and Beat Brawl: beat-quantized charts, an audio-clock
  timer, the canvas playfield, and the looping backing track.
- `src/components/apps/`, `src/components/lab/` — the individual apps.
- `src/components/ui/` — `AppIcon` (the glossy SVG icon set), `Glyph`
  (monochrome control glyphs — unicode ▶ ⏭ ✕ render as colour emoji on
  some platforms), and the start-orb mark.
- `src/lib/synth.ts` — real-time drum synthesis used by the Beat Maker and
  game sound effects.
- `scripts/verify.mjs` — a Playwright smoke test (37 checks: windows,
  global audio, gadgets, every game actually played, lock/restart, idle
  screensaver, mobile). Not part of the build — run it against a dev
  server on port 3210 after `npm i --no-save playwright-core`.

## Mobile

Below 768px, windows open full-screen one at a time; the sidebar hides and
games open with a single tap. Minimize or use the taskbar to get back to
the icons.

## Deploying

Static, no backend or database — deploys to Vercel or any Next.js host.
