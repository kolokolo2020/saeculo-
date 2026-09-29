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
active one is highlighted. The player has play/pause, previous/next, a seek
bar, elapsed/total time, volume and mute. Music lives in one `<audio>`
element for the whole visit, so it keeps playing while you close windows,
open others or minimise the player; the taskbar keeps a compact player
(cover, title, progress, play/pause, next) visible at all times.

The visualizer analyses the playing audio (Web Audio `AnalyserNode`). The
cover sits dimmed underneath and the spectrum reveals it at full brightness,
column by column, log-spaced so the kick and the hats both register; the low
end breathes the image and lifts a glow in the cover's own colour, which is
pulled from the artwork in the browser. **Visuals: still** (on the player,
or in the clock menu) turns it into the plain cover; it starts still for
visitors with reduced motion. On iPhones, where routing audio through Web
Audio would stop it on lock, the visualizer follows the measured tempo
instead.

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

## Socials

Links and handles live in `src/data/profile.ts`. To feature one YouTube
video, set `featuredVideo: { id: "<11-char id>", title: "…" }` there: it
shows as a thumbnail and only loads YouTube when clicked. It's `null` for
now, since no video was picked.

## Contact

Name, email and message, validated in the browser and again on the server
(`src/lib/contact.ts`), sent by `src/app/api/contact/route.ts` through
[Resend](https://resend.com)'s HTTP API. The key never reaches the browser.
Set these in Vercel → Project → Settings → Environment Variables:

| Variable | |
| --- | --- |
| `RESEND_API_KEY` | **Required.** Without it the form tells visitors the message was *not* sent and gives them the address instead. |
| `CONTACT_FROM_EMAIL` | A sender on a domain verified in Resend, e.g. `saeculo site <contact@saeculobeats.com>`. Without it, Resend's test sender is used, which only delivers to the Resend account's own address. |
| `CONTACT_TO_EMAIL` | Optional. Defaults to the booking email in `profile.ts`. |

Replies go straight to the visitor (the email's reply-to is theirs). A
hidden field catches simple bots, and one address can send five messages
per ten minutes.

## Game

Open **Game** and the laptop lid comes down over the site: you're standing
at the desk in the bedroom. Using the laptop again (or **Back to the site**,
or Esc, at any time) lifts the lid back onto the site.

- **Bedroom**: the laptop, a window, a shelf for tapes, a bed, records.
- **Street**: rain, a flickering lamp, a bench, a payphone that rings, a
  cat, and something at the far end that isn't always there.
- **Corner store**: the clerk.
- **Studio** (the basement door with the red light): the sampler.

The loop: find a sound → take it to the sampler → make a beat → save it
to tape → it's on your shelf. Three sounds are hidden around the block
(the window, the payphone, the store), each a variation for one lane.

The sampler is four lanes (kick, snare, hat, keys) × sixteen steps, with a
starter groove, tempo, swing, a sound picker per lane, and four tape slots
saved in the browser. Everything plays in F minor over a four-bar
progression, and the kick carries a sub on each chord's root, so any
pattern sounds musical. Hits are scheduled ahead on the audio clock, so the
timing holds while the page is busy. All sounds are synthesized
(`src/components/game/kit.ts`).

Audio never piles up: entering the game pauses the site's music and
remembers where it was; it picks up again when you go back. The sampler
ducks the street's room tone, and tapes stop when you leave the room.

Controls: WASD or arrows to walk, E / Space / Enter to use and talk, Esc to
leave. On touch screens, a pad and an A button. Reduced motion (or still
visuals) turns off the rain, the flicker and the haze.

Code: `src/components/game/`: `Game.tsx` (loop, input, dialogue, the lid),
`world.ts` (the four maps and their painting), `render.ts` (sprites, lights,
rain), `Studio.tsx` + `sequencer.ts` + `kit.ts` (the sampler), `sfx.ts`
(room tone and cues), `save.ts`.

## Project structure

- `src/app/`: layout (fonts, and a tiny script that decides before the
  first paint whether to show the intro), page, `api/contact`, share image.
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
