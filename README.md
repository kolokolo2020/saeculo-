# saeculo

An interactive promo site for saeculo's instrumentals, built as a glassy,
Vista-era blue desktop: frosted Aero windows, a glowing start orb, a
sidebar of gadgets, and a Bubbles screensaver. Click (or Tab + Enter) a
desktop icon to open it.

**The way in: the Room.** A first visit opens on a silent-film title card.
Click to enter a hand-drawn, comic-ink scene: 3 am, rain on the window, a man
at his laptop making a beat with a joint in his hand, and a black-and-white
cat on the desk who sometimes turns to look at you. His music leaks muffled
from his headphones. Click again (or wait) and the camera rises over his
shoulder into the laptop screen, which is showing the boot screen. The desktop
takes over and the same song opens up and keeps playing. It plays once per
visit and is skippable; links to a beat or a track bypass it, and the Start
menu has "Return to the room". Drawn in SVG in `src/components/room/`.

**Atmosphere.** Film grain, faint scanlines, a vignette and the odd tape
dropout sit over everything (Personalize → Atmosphere: Clean, Tape or
Midnight). Between midnight and 4 am, Tape turns into Midnight and the
desktop's light goes dark red. The rain icon in the tray switches on room
tone: rain, vinyl crackle and hum, synthesized live.

What's on the desktop:

- **Welcome Center** — opens once per visit after boot: the latest
  tracks one click from playing, where to start, and the socials. Untick
  "Show at startup" to stop it; share links skip it.
- **Media Player** — plays the beats with live visualizers. The
  default, **Cover Art**, rebuilds the track's cover out of dots that pulse
  on the measured beat. **Projector** throws the cover onto a dark wall as a
  worn 16 mm print (gate weave, dust, scratches, burnt edges, a lamp that
  flares on the beat) and is the default after dark; Aurora, Bars and Scope
  follow, and **Film** plays a track's video if it has one. The **Tape**
  button plays any of them off a VHS: colour slip, a tracking band that
  tears on bass hits, head-switching noise and a PLAY / tape-counter
  display. It's on by default when the desktop is on Tape or Midnight. Each track has its
  own palette (pulled from its cover) that tints the whole window, a
  waveform seek bar drawn from the real audio (with bar ticks, drag, hover
  time and arrow-key seeking), a beat LED synced to the measured tempo, and
  a fullscreen mode. Music lives in a global player, so it keeps playing
  when the window closes; the sidebar Now Playing gadget, the taskbar tray
  and the taskbar hover preview control or show it too.
- **Beat Maker** — an 8-lane groovebox (kick, snare, clap, hat, open hat,
  rim, 808, keys). Every step is off, on or accented; the 808 and keys
  follow a four-bar chord progression in any minor key, so any pattern
  (and every Randomize) stays musical. Swing, a resonant master filter and
  tempo sit on rotary knobs, with tap tempo, mute/solo, an LCD that lights
  the progression bar by bar, and a live output scope. Drag to paint,
  right-click / Shift-click / long-press for accents, Ctrl+Z to undo.
  **Share link** copies a URL that opens the site with that exact groove
  loaded (older four-lane links still load), and **Export .wav** renders
  the four bars offline and downloads them.
- **Beat Deck** — the game: a roguelike deckbuilder where every hand is a
  beat. Cards are one-bar patterns (kicks, hats, 808s, chords, chops from
  saeculo's tracks); play up to 5 as a take and the loop actually plays
  while it scores. The roles you cover set the beat type (Sketch … Banger);
  score = groove × hype. Eight rounds of clients with requests and bosses
  with rules (the A&R, the Label, the Algorithm, the Neighbour, Writer's
  Block, and Metro Nome). Between rounds a shop sells gear that bends the
  rules, new sounds, studio time (level up a beat type) and card removal.
  Runs save after every move; there's a Daily Run with the same shuffle
  for everyone; the best take of a run exports as a WAV. Winning a run
  unlocks the next **certification**, a difficulty ladder from Demo through
  Mixtape, EP, Album and Gold to Platinum, each adding a rule (higher
  targets, fewer redraws, leaner pay, pricier shop, a smaller hand).
- **about.txt** (Notepad), **Contact** (a compose-mail form that opens the
  visitor's mail app), and a **Recycle Bin** of beats that didn't make it.
- **Right-click the desktop** for a context menu, including **Personalize**:
  six glass colors, five wallpapers, and a transparency toggle, saved in
  the browser. **DreamScene** is a live wallpaper: it takes the playing
  track's cover palette and its aurora sways with the low end and
  brightens on every beat. In Midnight it's projected too: it flickers,
  and dust and scratches cross it.
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

- **Tracks**: `src/data/tracks.ts`. `bpm` is what visitors see. Everything
  measured from the audio lives in `src/data/trackAnalysis.json`: the exact
  tempo and first-beat offset (Beat Deck's chops and the player's beat
  sync use them), the waveform peaks, and the palette from the cover. After
  adding or replacing a track or cover, regenerate it with
  `node scripts/analyze-tracks.mjs` (needs `playwright-core` and `sharp`).
- **Bio, socials, booking email, next release date**: `src/data/profile.ts`.
  The bio and the next release are still placeholders.
- **Vault words, password and unreleased snippets**: `src/data/secrets.ts`.
  The snippets and the letter are still placeholders (the snippets reuse
  the synthesized demo loops in `public/audio/*.wav`, made by
  `scripts/generate-audio.mjs`).
- **Link preview image**: generated from the profile by
  `src/app/opengraph-image.tsx`.
- **Track videos (optional)**: add `video: "/video/<id>.mp4"` to a track in
  `src/data/tracks.ts` and put the file in `public/video/`. The Film
  visualizer shows up for that track: muted, looping, cropped to fill,
  with the projector treatment, and paused with the music. Use MP4 (H.264)
  or WebM, a 10–20 s seamless loop, 720p, under ~6 MB.
  `docs/aura-plan.md` (section 7) has prompts for a video generator.

## Project structure

- `src/app/globals.css` — the Aero theme: glass frames, caption buttons,
  Vista push buttons, taskbar, start menu, sliders, aurora wallpaper.
- `src/components/desktop/` — the shell: boot + Welcome screen, desktop
  icons, taskbar, start menu (with search, lock, restart), sidebar gadgets,
  Bubbles screensaver.
- `src/components/window-manager/` — windows: zustand store, drag and
  resize hooks, maximize, the glass `WindowFrame`, and the app registry.
- `src/components/player/` — the global audio player store, the single
  `<audio>` element (`AudioEngine`), the visualizers, the waveform seek
  bar and the beat clock (`spectrum.ts`).
- `scripts/analyze-tracks.mjs` — decodes each track in Chromium to measure
  tempo, phase and the waveform, and k-means-clusters each cover for its
  palette; writes `src/data/trackAnalysis.json`.
- `src/lib/beatdeck/` — Beat Deck's rules as pure TypeScript (no DOM):
  cards, gear, clients and bosses, the scoring engine, and the run's state
  transitions, all seeded so a run replays from its seed. Balanced by
  simulating a few hundred bot runs per change (the bot wins about a third
  at Demo, under a tenth at Platinum).
- `src/components/apps/BeatDeckApp/` — the game's UI and its sound: card
  voices, chops sliced from the tracks and re-pitched to the run's key, and
  the take playback that times every score pop off the audio clock.
- `src/components/apps/`, `src/components/lab/` — the individual apps.
- `src/components/ui/` — `AppIcon` (the glossy SVG icon set), `Glyph`
  (monochrome control glyphs — unicode ▶ ⏭ ✕ render as colour emoji on
  some platforms), and the start-orb mark.
- `src/lib/synth.ts`, `src/lib/voices.ts` — real-time synthesis (drums,
  noise bursts, enveloped tones, a driven 808) shared by the Beat Maker
  and Beat Deck; `src/lib/wav.ts` encodes the WAV exports.
- `src/lib/groove.ts` — the Beat Maker's model: lanes, keys, chord
  progressions, step scheduling, the offline render and share codes.
- `src/components/desktop/personalizeStore.ts` — the saved look; the CSS
  variables it switches live at the top of `globals.css`.
- `scripts/verify.mjs` — a Playwright smoke test (101 checks: the Room intro, windows,
  global audio, the player and its Projector / Tape looks, gadgets, the Beat Maker, Beat Deck played, the
  secret hunt, lock/restart, idle screensaver, an axe accessibility audit,
  mobile, iPhone playback). Not part of the build: run it against a dev
  server on port 3210 after `npm i --no-save playwright-core axe-core`.

## Mobile

Below 768px, windows open full-screen one at a time, and the sidebar gives
way to home-screen widgets: Now Playing (cover, play, progress, live bars)
and the release countdown. Beat Deck is turn-based, so it plays the same
with taps, and its hand folds into two rows of four. Minimize or use the taskbar to get back to
the icons.

## Deploying

Static, no backend or database — deploys to Vercel or any Next.js host.
