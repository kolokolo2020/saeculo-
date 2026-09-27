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
  randomizer; every sound is synthesized live. **Share link** copies a URL
  that opens the site with that exact loop loaded (`#beat=<bpm>-<hex>`),
  and **Export .wav** renders 4 bars offline and downloads them.
- **Beat Deck** — the game: a roguelike deckbuilder where every hand is a
  beat. Cards are one-bar patterns (kicks, hats, 808s, chords, chops from
  saeculo's tracks); play up to 5 as a take and the loop actually plays
  while it scores. The roles you cover set the beat type (Sketch … Banger);
  score = groove × hype. Eight rounds of clients with requests and bosses
  with rules (the A&R, the Label, the Algorithm, the Neighbour, Writer's
  Block, and Metro Nome). Between rounds a shop sells gear that bends the
  rules, new sounds, studio time (level up a beat type) and card removal.
  Runs save after every move; there's a Daily Run with the same shuffle
  for everyone; the best take of a run exports as a WAV.
- **about.txt** (Notepad), **Contact** (a compose-mail form that opens the
  visitor's mail app), and a **Recycle Bin** of beats that didn't make it.
- **Right-click the desktop** for a context menu, including **Personalize**:
  six glass colors, four wallpapers, and a transparency toggle, saved in
  the browser.
- **next_single.exe** — the countdown to the next release, as a download
  dialog that's taking its time (also a sidebar gadget).
- **The vault** — `vault.zip` sits in the Recycle Bin and can't be deleted.
  It opens with three hidden words, one each from about.txt (white-on-white
  text, revealed by selecting it), beating the first boss in Beat Deck, and the Konami code
  (↑ ↑ ↓ ↓ ← → ← → B A, or typed out in Start Search on phones). Inside:
  unreleased snippets and a note. Progress is saved in the browser.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Content

Real: the three tracks (`public/audio/*.mp3`) and their cover art
(`public/covers/`), the booking email, and the social links.

- **Tracks**: `src/data/tracks.ts`. `bpm` is what visitors see; `tempo` and
  `beatOffset` are measured from the audio file (the rhythm games chart
  notes from them), so re-measure them if a file is replaced. Tracks above
  125 BPM are charted on the half-time grid.
- **Bio, socials, booking email, next release date**: `src/data/profile.ts`.
  The bio and the next release are still placeholders.
- **Vault words, password and unreleased snippets**: `src/data/secrets.ts`.
  The snippets and the letter are still placeholders (the snippets reuse
  the synthesized demo loops in `public/audio/*.wav`, made by
  `scripts/generate-audio.mjs`).
- **Link preview image**: generated from the profile by
  `src/app/opengraph-image.tsx`.

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
- `src/lib/beatdeck/` — Beat Deck's rules as pure TypeScript (no DOM):
  cards, gear, clients and bosses, the scoring engine, and the run's state
  transitions, all seeded so a run replays from its seed. Balanced by
  simulating a few hundred bot runs per change (the bot wins about a third).
- `src/components/apps/BeatDeckApp/` — the game's UI and its sound: card
  voices, chops sliced from the tracks and re-pitched to the run's key, and
  the take playback that times every score pop off the audio clock.
- `src/components/apps/`, `src/components/lab/` — the individual apps.
- `src/components/ui/` — `AppIcon` (the glossy SVG icon set), `Glyph`
  (monochrome control glyphs — unicode ▶ ⏭ ✕ render as colour emoji on
  some platforms), and the start-orb mark.
- `src/lib/synth.ts` — real-time drum synthesis used by the Beat Maker and
  Beat Deck.
- `src/lib/beatCode.ts` — share-link encoding and the offline WAV render.
- `src/components/desktop/personalizeStore.ts` — the saved look; the CSS
  variables it switches live at the top of `globals.css`.
- `scripts/verify.mjs` — a Playwright smoke test (68 checks: windows,
  global audio, gadgets, Beat Deck played, the secret hunt, lock/restart,
  idle screensaver, mobile, iPhone playback). Not part of the build — run it against a dev
  server on port 3210 after `npm i --no-save playwright-core`.

## Mobile

Below 768px, windows open full-screen one at a time and the sidebar hides.
Beat Deck is turn-based, so it plays the same with taps. Minimize or use the taskbar to get back to
the icons.

## Deploying

Static, no backend or database — deploys to Vercel or any Next.js host.
