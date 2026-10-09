# saeculo

The site for saeculo's instrumentals: an old Windows desktop found late at
night, with four things on it.

- **Beats**: the MP3s, as a folder wired to one player.
- **Socials**: the real links.
- **Contact**: a short form that emails saeculo.
- **Game**: a small top-down neighbourhood where you find sounds and make a
  beat with them.

A first visit opens with a short intro: an old machine booting up. A BIOS
check of the studio waits for a key (that click is what lets sound start),
then a 2007-style loading bar, four streaks of light meeting in a spinning
record with a startup chord in the key of the beat about to play, and a
blue welcome screen while the beat comes up out of the machine. It's
skippable (Skip or Esc; any key hurries it along), plays once per browser,
and the clock menu in the taskbar replays it. Share links (`/#track=<id>`)
skip it. Code: `src/components/intro/`.

## Beats

One album, one cover: "saeculo" lit up on a spectrum analyser, drawn by
`scripts/make-cover.mjs` (from `src/components/beats/wordmark.ts`) into
`public/covers/saeculo.svg` and `.jpg`. The window is a 2007 media player
in night-blue glass: the cover, what's playing, a visualizer screen, the
waveform seek bar, the transport (shuffle, repeat, previous, a big round
play button, next, volume) and the tracklist with key, bpm and length.
The visualizer is never on the cover: it's the wordmark on its own screen,
with the real spectrum moving through and around the letters (**led**), or
a mirrored trace of the waveform over the dimmed wordmark (**wave**), or
**still** (also in the clock menu; the default with reduced motion). On
iPhones it follows the measured tempo instead of the audio.

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

Open **Game** and the laptop lid comes down over the site. The first time,
you're at the mirror: a name, skin, hair style and colour, build. Then the
neighbourhood:

- **Your street**: your room, the corner store (food for later), the
  studio in the basement, the park, the roof, the payphone, the crew
  round the boombox.
- **The avenue** (off the end of your street): the thrift shop (clothes,
  a mirror), the alley, the record shop, a laundromat, the club (a queue
  and a bouncer who wants 30 respect or 6 style), and the subway stairs.
- **The alley**: a fire in a barrel, street dice with Jay, a wall for
  your name. **The record shop**: dig the crates, a listening station,
  an owner who buys tapes. **The club**: the floor, the bar, the decks.
  **The subway**: trains in and out. **The underpass**: the cypher, Dre
  (buys beats), and Tank.

Life on the block: cars, bikes and now and then a police car rolling by
with its lights going (trouble walking up to you thinks better of it);
people walking through on the avenue; a cat in the alley that moves when
it feels like it; a storm that comes over now and then, lightning and then
thunder (no flash with reduced motion or still visuals). Win a fight and
whoever saw it reacts.

Things to do: make beats and **sell** them (Dre, the record shop; each tape
sells once, priced by what's in it), **the cypher** and **a set at the club**
(rhythm games: the kick, snare and keys drop out and you play them, D F J K;
the first set in a while pays, a second straight after pays a third),
**dice**, **crate digging**, **hoops**, **tagging** the wall, buying clothes.
Twelve sounds hide around the map for the studio's **Found** tab.

**Trouble**: now and then, in the rougher places, a group of drunks walks up
to you. Fight, pay them off, play them your beat, or walk away. Fights are
real-time: E/Space swings (watch for the “!”, that's a swing coming),
Shift dodges, Q eats something. A hit staggers them, but then they shrug
hits off for a moment and swing back, so mashing alone won't do: dodge the
“!”. Chill, normal and hard change how hard they hit, how much they take,
how long they wind up and how soon they come again. Win and they leave cash
behind; wins unlock weapons (bat at 1, bike chain at 4, brass knuckles at 7,
crowbar at 10) and the leather jacket; Tank at the underpass gives up a mic
stand. After trouble the block leaves you alone for a minute or so. Go down and you wake
up at home with a quarter of your cash gone. A door is always a way out.

**The menu** (M, or the button up top): you, your wardrobe (25 pieces,
most bought or earned), weapons and food, goals (16, each pays out),
settings (sound and music levels, fight difficulty, shake, hints, start
over). Cash, respect, health and everything else save in the browser.

Controls: WASD or arrows, E / Space to use and talk, M for the menu, Esc
back to the site. On touch screens, a pad, A (and B and eat in a fight).
Reduced motion (or still visuals) turns off the rain, flicker and shake.

Code: `src/components/game/`: `Game.tsx` (loop, input, dialogue, fights),
`world.ts` and `places/` (the maps), `life.ts` (people), `people.ts`
(sprites), `character.ts` (looks, clothes), `combat.ts`, `weapons.ts`,
`goals.ts`, `scripts.ts` (what the newer places' people say and do),
`Menu.tsx`, `minigames/`, `render.ts`, `sfx.ts`, `save.ts`, `studio/`.

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

`node scripts/playtest.mjs <dir> [desk|phone]` takes screenshots of every
place, each menu tab, each mini-game and a whole fight, on a desktop and a
phone, for checking by eye.

The earlier version of the site (the Vista desktop, Beat Deck, Night
Radio, the vault) is in the git history before this redesign.
