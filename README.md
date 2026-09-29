# saeculo

The site for saeculo's instrumentals: an old Windows desktop found late at
night, with four things on it.

- **Beats**: the MP3s, as a folder wired to one player.
- **Socials**: the real links.
- **Contact**: a short form that emails saeculo.
- **Game**: a small top-down neighbourhood where you find sounds and make a
  beat with them.

A first visit opens with a short intro: a title card, then the room (rain,
the laptop, the cat), and the camera goes into the laptop screen, which
becomes the desktop. It's skippable (Skip or Esc), plays once per browser,
and the clock menu in the taskbar replays it. Share links (`/#track=<id>`)
skip it.

## Beats

The folder lists every track with its cover, key, tempo and length; the
active one is highlighted. The player has play/pause, previous/next,
repeat-one, shuffle, elapsed/total time, volume and mute, and a seek bar
drawn as the track's own waveform (hover for the time, click or drag to
seek, arrow keys step five seconds; tracks without analysis get a plain
slider). Music lives in one `<audio>`
element for the whole visit, so it keeps playing while you close windows,
open others or minimise the player; the taskbar keeps a compact player
(cover, title, progress, play/pause, next) visible at all times.

The visualizer analyses the playing audio (Web Audio `AnalyserNode`). The
cover sits dimmed underneath and the spectrum reveals it at full brightness,
column by column, log-spaced so the kick and the hats both register; the low
end breathes the image and lifts a glow in the cover's own colour, which is
pulled from the artwork in the browser. The visuals button cycles
**reveal** (that), **scan** (the cover cut into scanlines that drift and
brighten with their band) and **still** (the plain cover, also in the
clock menu); it starts still for
visitors with reduced motion. On iPhones, where routing audio through Web
Audio would stop it on lock, the visualizer follows the measured tempo
instead.

**sample this** (in the status bar) takes the two bars playing right now
into the game's studio: cut into four two-beat pieces at the track's own
tempo and key, over a plain drum part (pattern A as played, B flipped).
One undo brings back the project you had.

States: "LOADING…" while a file buffers; "FILE UNAVAILABLE" (and the row
marked) if a file fails, with next/previous still working and play retrying;
an empty-folder message if there are no tracks. Nothing is decoded ahead of
time: only the current file streams, and the folder reads lengths from file
headers.

### Adding a beat

1. Put the MP3 in `public/audio/` and a square cover (JPG or PNG) in
   `public/covers/`.
2. Add an entry at the top of `TRACKS` in `src/data/tracks.ts`. Only `id`,
   `title` and `src` are required; `cover`, `bpm`, `key` and `added`
   (`"YYYY-MM-DD"`, shows a "new" tag for 30 days) are optional.
3. Optional: `node scripts/analyze-tracks.mjs` (needs
   `npm i --no-save playwright-core sharp`) measures the exact tempo and
   first beat for tracks that list a `bpm`.

## Keyboard

On the desktop: Space play/pause, ←/→ five seconds back/forward,
Shift+←/→ previous/next beat, M mute, 1–4 open Beats / Socials / Contact /
Game, ? lists them (also in the clock menu). They never fire while typing
or while the intro or the game is open. Double-click a title bar (or use
□) to maximise a window; windows reopen where you left them.

## Socials

Links and handles live in `src/data/profile.ts`. To feature one YouTube
video, set `featuredVideo: { id: "<11-char id>", title: "…" }` there: it
shows as a thumbnail and only loads YouTube when clicked. It's `null` for
now, since no video was picked.

## Contact

Name and message, checked in the browser (`src/lib/contact.ts`). **Send**
opens the visitor's own email app with a new email to the booking address
in `src/data/profile.ts`, subject and message already filled in; they press
send there, and replies go to the address they wrote from. Nothing runs on
a server and nothing needs configuring. The address is also shown (and
copyable) for anyone without an email app set up.

## Game

Open **Game** and the laptop lid comes down over the site: you're standing
at the desk in the bedroom. Using the laptop again (or **Back to the site**,
or Esc, at any time) lifts the lid back onto the site.

- **Bedroom**: the laptop, a window, a shelf for tapes, a bed, records.
- **Street**: rain, a flickering lamp, a bench, a payphone that rings, a
  cat, and something at the far end that isn't always there. Three
  friends hang round a boombox outside the corner store, drinking and
  smoking, nodding to what's playing (give them your tape and they play
  your beat, louder and clearer as you walk up). A dog walker does laps
  with their dog. Cars pass with their headlights on and stop and honk if
  you stand in the road; cyclists ring their bells.
- **Corner store**: the clerk.
- **Studio** (the basement door with the red light): the sampler, quiet
  music on the monitors, and three on the couch (a styrofoam cup of
  something purple, a joint going round, headphones on), all bopping.
  Ask the one with headphones and they'll play your beat.
- **The park** (walk off the left end of the street): kids shooting
  hoops (take a shot), pigeons that scatter, an old man on a bench,
  swings, a fountain.
- **The roof** (up the fire escape): the skyline, wind chimes on the
  antenna, a water tank, a pigeon coop, someone sitting on the ledge.

The loop: find a sound → take it to the studio → make a beat → save it
→ it's a tape on your shelf, and something to play for people. They
remember what you played them (the crew, the couch, the old man in the
park, who asks to hear it and says what he makes of its tempo, and the
girl on the roof, where the city's windows come on with your tape). The
clerk's radio finds one of the real tracks between stations. A few
things happen once, quietly: the payphone rings again and it's your
beat down the line; a tape you didn't make turns up on your shelf. Six
sounds are hidden around the neighbourhood (the window, the payphone,
the store, the bench, the court, the roof); each turns up in the studio
under **Found**. People and animals are drawn from a few pixel templates
(`game/people.ts`), live in `game/life.ts` and are drawn in
`game/actors.ts`.

### The studio

The sampler in the basement opens a small DAW. **Go to the studio** in
the game's top bar (or on the first-visit card) jumps straight there.

- **Sounds:** 55 synthesized sounds (8 kicks, 6 snares, claps and a snap,
  8 hats, 10 percussion, 808s and bass, rhodes, piano, organ, music box,
  bell, pad, strings, choir, pluck, lead, flute), 24 **chops** sliced on
  the beat from care4me, elbtunnel and dull knife (each track loads the
  first time one of its chops is used), four sounds you find around the
  block, and your own samples. Browse by category or search; click to
  hear, **+** to add a channel, **swap** to change the selected one.
- **Channel rack:** up to 16 channels, each with mute/solo and volume.
  Drums get a 16- or 32-step grid (Shift-click or right-click for a soft
  hit); melodic sounds show their notes and open the piano roll.
- **Playing live:** the on-screen keyboard, or the computer's home row
  (A S D F…, W E T Y U for the black keys, Z/X octave), plays the selected
  channel over the loop; **rec** writes it into the pattern on the nearest
  step. First visits get one line of hints that crosses itself off.
- **Piano roll:** two octaves (shift with oct −/+), out-of-key rows
  shaded, click or drag to draw notes, drag a note's edge to stretch it,
  click to delete. **Chord: triad / 7th** stamps a chord from the key on
  the clicked root; **in key** snaps clicks to the scale.
- **Patterns and song:** four patterns (A–D, copy/clear) and a 16-slot
  song; play the loop or the whole song.
- **Mixer:** per channel volume, pan, tuning, tone (low-pass), reverb
  and delay sends; master volume, filter, tape drive, reverb and delay.
- **Project:** tempo, swing, key, scale, 1 or 2 bars; four starters
  (late-night boom bap, rainy lofi, cold trap, night drill) or empty;
  eight save slots in the browser (the project also autosaves); undo
  (Ctrl/⌘+Z); **bounce to WAV** (a pattern or the whole song).

Everything plays through one mixer and is scheduled ahead on the audio
clock; the WAV export renders the same graph offline. Saved projects show
up as tapes on the bedroom shelf and play there. Code:
`src/components/game/studio/`.

#### Adding your own samples

Put short WAV or MP3 one-shots in `public/samples/` and list them in
`src/data/samples.ts` (`{ id, name, file }`). They appear under **Your
samples** and load only when used.

Audio never piles up: entering the game pauses the site's music and
remembers where it was; it picks up again when you go back. The studio
ducks the room tone and stops when you leave it; tapes stop when you
leave the bedroom.

Controls: WASD or arrows to walk, E / Space / Enter to use and talk, Esc to
leave. On touch screens, a pad and an A button. Reduced motion (or still
visuals) turns off the rain, the flicker and the haze.

Code: `src/components/game/`: `Game.tsx` (loop, input, dialogue, the lid),
`world.ts` (the four maps and their painting), `render.ts` (sprites, lights,
rain), `studio/` (the DAW: `voices.ts` sounds, `engine.ts` mixer and
sequencer, `project.ts` model and saves, `presets.ts` starters, and the
panels), `sfx.ts` (room tone and cues), `save.ts`.

## Project structure

- `src/app/`: layout (fonts, and a tiny script that decides before the
  first paint whether to show the intro), page, share image.
- `src/components/site/`: the desktop, windows, taskbar, icons, Socials,
  Contact, and the site store.
- `src/components/beats/`: the Beats window, the visualizer, the palette.
- `src/components/player/`: the global player store and `<audio>` element.
- `src/components/room/`: the intro, drawn in SVG.
- `src/components/game/`: the game.
- `src/data/`: tracks and profile. Change content here.

The intro and the game are split out and only download when needed.

## Development

```bash
npm install
npm run dev
```

Before committing: `npx tsc --noEmit`, `npm run lint`, `npm run build`,
then the browser checks against a dev server on port 3210:

```bash
npm i --no-save playwright-core axe-core
npx next dev -p 3210
node scripts/verify.mjs
```

The earlier version of the site (the Vista desktop, Beat Deck, Night
Radio, the vault) is in the git history before this redesign.
