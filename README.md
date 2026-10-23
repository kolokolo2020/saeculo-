# saeculo

The site for saeculo's instrumentals: an old desktop drawn flat and clean
(warm paper and hairlines, classic-Mac pinstripes on the title bars,
Windows-style buttons and taskbar), with four things on it.

- **Beats**: the MP3s, as a folder wired to one player.
- **Socials**: the real links.
- **Contact**: a short form that emails saeculo.
- **Game**: a small top-down neighbourhood where you find sounds and make a
  beat with them.

A first visit opens with a short intro that plays by itself: the block at
night, in the game's pixels. The camera goes down your building, past the
dark windows and the fire escape, to the one window that's lit, and in
through the glass (about 4 seconds). Then it stays in the room, seen from the
back of it: the bedroom from the game, a bed, a rug, the tapes, the album
cover on the wall, the lamp on, the laptop on the desk, and him in the
desk chair, side on, leaned right back with his feet up on the desk (curly
brown hair under on-ear headphones, a white tee, jeans, white socks in
slides), lighting a joint and smoking it, slowly, over and over. Once it's
lit, "press any key" (on a phone, "tap to play") comes up. A key or a tap:
he stops, takes his feet down, sits up and presses the laptop's space bar; the beat starts, "saeculo" comes up on the
screen, and the camera goes into the screen, which opens onto the desktop
with Beats open. That key is also what lets sound start, so the intro is
silent until then. A click or key on the way in hurries it to the room;
Skip or Esc skips it. It plays once per browser, and the clock menu in the
taskbar replays it. Beat pages (`/beat/<id>`) and old share links
(`/#track=<id>`) skip it. With reduced
motion or still visuals it's one still picture of the room; a key puts
"saeculo" on the screen, then a quick fade. Everything is drawn on canvas
(the building and the room once, small; each frame copies what the camera
sees and draws the person and the smoke) and the sounds are synthesized.
Code: `src/components/intro/` (`BlockIntro.tsx` runs the sequence, input
and the music; `block.ts` draws the block and the camera; `room.ts` the
room and him; `city.ts` the sounds; `block.module.css` the
styles). The earlier cigarette intro (`BootIntro.tsx`, `scene.ts`,
`sounds.ts`, `intro.module.css`) is still in the folder, unused.

## Beats

One album, one cover: the owner's artwork (`public/covers/saeculo.jpg`). The
window is a flat media player on the desktop's paper: the cover large on
the left (on top on phones), what's playing, the waveform seek bar with the
time in a small LCD face, the transport (shuffle, repeat, previous, a round
play button, next, volume) and the tracklist with key, bpm and length.
There's no visualizer. The playing row has three small bars, which stand
still with reduced motion or still visuals.

**Play similar next** (the two waves, next to shuffle): after a beat, the
player goes to the closest one by tempo (half and double time count as the
same groove) and key (round the circle of fifths, a minor key standing in
for its relative major), skipping the ones heard lately this visit, so two
close beats don't just swap back and forth. The row it'll go to says "up
next". It and shuffle turn each other off; both are remembered
(`src/lib/similar.ts`).

**loop 8 bars** (between the times, or L): loops the 8 bars from the bar the
playhead is in, on the beat's own grid (measured tempo and first beat), shown
as a band on the waveform. Seeking outside it, changing beat or L again lets
go.

**Where you left off**: the beat and the second you were at are saved every
few seconds and on leaving, and the next visit opens Beats there, paused.
Share links and beat pages win over it; a beat left in its last seconds
starts over.

**lease this** (in the status bar) opens Contact about the beat playing:
the beat shows at the top of the form and goes in the email's subject
("Leasing “care4me”"). No prices or terms are on the site.

**sample this** (in the status bar) takes the two bars playing right now
into the game's studio: cut into four two-beat pieces at the track's own
tempo and key, over a plain drum part (pattern A as played, B flipped).
One undo brings back the project you had.

Every beat plays at about the same level: the louder ones are turned down
to −10 LUFS in the player (their loudness is measured by
`scripts/analyze-tracks.mjs`), the quieter ones play as they are, and
nothing is turned up, so nothing clips. The files themselves are never
changed. iPhones play the files as they are (the player keeps Web Audio off
there, because iOS silences it when the screen locks).

Every beat has its own page, `/beat/<id>` (built from `tracks.ts`, so a new
beat gets one by itself): the same desktop with that beat ready in Beats,
its own title, and its own preview card when the link is shared (the cover,
the title, key and bpm; `src/app/beat/[id]/`). **copy link** gives that
address. The sitemap lists them all, and an unknown id is a 404.

States: "LOADING…" while a file buffers; "FILE UNAVAILABLE" (and the row
marked) if a file fails, with next/previous still working and play retrying;
an empty-folder message if there are no tracks. Nothing is decoded ahead of
time: only the current file streams, and the folder reads lengths from file
headers.

### Adding a beat

1. Put the MP3 in `public/audio/`.
2. Add an entry to `TRACKS` (the top one plays first) in `src/data/tracks.ts`. Only `id`,
   `title` and `src` are required. `src` is the file name exactly as it is
   on disk, in `audioFile(…)`: `src: audioFile("care4me (21.07.26).mp3")`.
   `bpm`, `key` and `added` (`"YYYY-MM-DD"`, shows a "new" tag for 30
   days) are optional.
3. Optional: `node scripts/analyze-tracks.mjs` (needs
   `npm i --no-save playwright-core`) measures the exact tempo, first
   beat and loudness for tracks that list a `bpm` (`trackAnalysis.json`), and
   draws the waveform (`trackWaveforms.json`, loaded after the page). Without it a new beat
   plays at its own level.

The cover is served resized (Next's image optimisation). If you ever
replace `public/covers/saeculo.jpg`, give the new file a new name and
point `ALBUM` in `tracks.ts` at it: resized copies of the old one can be
cached for a few hours.

## Keyboard

On the desktop: Space play/pause, ←/→ five seconds back/forward,
Shift+←/→ previous/next beat, M mute, L loop 8 bars, N night/day, 1–4 open Beats / Socials / Contact /
Game, ? lists them (also in the clock menu). They never fire while typing
or while the intro or the game is open. Double-click a title bar (or use
□) to maximise a window; windows reopen where you left them.

## Night

The day/night switch in the taskbar (next to the clock), the clock menu's
**Night**, or N puts the desktop in its night colours,
taken from the intro's sky: a navy desk, warm dark windows, cream text and a
lighter dusk blue. Until a visitor picks, it follows their system's dark
mode (live). The choice is set on `<html data-theme>` before first paint and
only touches the desktop: the intro and the game keep their own look. The
colours are Tailwind theme variables (`@theme` in `globals.css`, not inlined),
redefined under `html[data-theme="night"]`.

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
  and a bouncer who wants 30 respect, 6 style or 2,000 followers), Maison
  (designer), and the subway stairs.
- **The alley**: a fire in a barrel, street dice with Jay, a wall for
  your name. **The record shop**: dig the crates, a listening station,
  an owner who buys tapes. **The club**: the floor, the bar, the decks.
  **The subway**: trains in and out; get on when the doors are open and
  ride one stop to your block (the stairs on the far pavement of your
  street, which also take you back to the avenue). **The underpass**: the cypher, Dre
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

**Things that happen**: once you've sold a beat or played the cypher, Vee
(another producer) comes over at the underpass and challenges you to a
**beat battle**: $20 in, her beat, both of you play it live (the hard
rhythm game: faster, tighter, the hats on you too); beat her score and you
get $40 back, and she gets better each time you win. The CD guy, once
you've bought his CD, wants a slow beat (under 90 BPM) for track four.
Dre, once you've sold him something, has **jobs**: take a tape to the
busker, the record shop or the bar, bring back what they give you, get
paid. The current job is in the menu under goals. Carrying the tape makes
trouble come sooner and likelier, and they ask what's on it; get knocked out
and the tape's gone and the job with it. Vee plays a different beat each
battle and names it. Pet the alley cat three times in a visit and it
follows you about for a while.

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

**Your career**: you start with a dozen followers. Selling beats, making
songs, a good set, a fight someone films, a post: they all bring people to
your page. Your **phone** (P, or the button up top) is that page: followers,
the level you're at (nobody yet, local, buzzing, rising, hot right now,
famous, a star), your posts as a grid, **post a beat** (your newest tape,
once; it then sells leases from your page on its own) and **post a fit**
(better clothes, more followers), each with a short wait before the next;
**messages** (fans, artists who want to link up, brands with a deal, and
people who want a cut); and **money** (what your songs and the beat store
bring in a minute, every song with its streams, your contacts, protection).

- **The artists**: Lil Brick outside the corner store, Kaya in the park, Mo
  Dread in the alley, Juno Vale in the club, Saint Ojay under the bridge;
  Big Halo (on your roof) and Nova Reign (at Maison) only turn up once
  you're big. Each works with people above a number of followers; below it
  they brush you off. Sell them your newest tape (each buys a tape once; the
  more famous you are, the more it's worth), swap numbers, and once they've
  bought from you, **make a song**: a recording session (punch in their
  takes when the level's in the green, then mix three faders by ear). The
  song pays something up front, brings their fans to you, and keeps earning
  while you walk about, fading but never to nothing. Going up a level brings
  messages from the next artists, and brand deals at 10K and 50K.
- **The charts** (phone → charts): a city top 10, a new week every three
  minutes of play. Your songs go in by what they earn and how good they are
  (the session, and how full the beat was); the higher up, the more they
  play (number one pays two and a half times as much). Vee's songs are on
  it too, and she keeps pace with your best, less so with every battle you
  win. When she's charting she messages you; **answer with a diss** (a
  session on your own) that lands and she drops off the chart, or falls
  flat and costs you followers.
- **Shows**: venues message you a booking at 1,000 followers (the club),
  5,000 (the underpass) and 20,000 (your roof). Say yes, walk in, and play
  your show (the rhythm game, longer, on the venue's beat). Door money goes
  by the crowd (a share of your followers, as many as the place holds) and
  how well you played; more bookings come round after.
- **Mixtapes** (phone → money): five songs not on a tape go out together:
  money up front, a crowd of new followers, the songs earn more for longer,
  and a listening party on your roof next time you go up.
- **A manager**: at 2,000 followers Dee Mills offers to manage you. 10% of
  your music money, for artists paying more, shows paying more and brands
  calling every few weeks. Let them go (or call back) on your phone.
- **Being known**: from 500 followers people know your face anywhere outside
  (not on your own roof), and some of the trouble is people after what
  you've got on (the more it cost, the more often). Take a picture with them
  (it works more the more famous you are), pay, hand over the chain, fight
  or walk. Lose to them and they take more, and the priciest thing you had
  on. People shout your name across the road.
- **The Block Kings** (at 1,500 followers) and **the Syndicate** (at 25,000)
  come and ask for a share of what your music makes, 15% and 25%: pay and
  the wrong people mostly leave you alone; say no and their crews come for
  you, everywhere outside, more often. See off three crews and the heavy
  comes himself (Rook, Kade); beat him and they're done with you for good
  (and his weapon's yours). You can stop paying, or buy peace, on your phone.
- **Tank's fight night** (once you've beaten him): $25 in, three rounds back
  to back, $150 if you're standing at the end; take what you've got after
  any round. Lose and it's just the concrete, not your pockets.
- **Smokey** in the alley sells weapons out of his coat: pepper spray and a
  taser (they stun, whatever their guard), a lead pipe, a switchblade (fast),
  a golf club (long), nunchucks, a machete, a sledgehammer (slow, huge).
- **Maison**, the boutique at the end of the avenue: designer tees, jerseys,
  tech fleece, shark hoodies, a monogram jacket, a fur coat, camo and
  stacked jeans, leather pants, retro high-tops, red-sole sneakers, a ski
  mask, bandanas, grillz, an iced watch, a crossbody bag, and round your
  neck (its own slot now) a cuban link and an iced-out chain. Some of it is
  only sold to people with a following.
- **The cups**: Slick outside the laundromat; find the ball (click, or 1 2
  3), even money, faster hands the more you bet.

**The menu** (M, or the button up top): you, your wardrobe (48 pieces,
most bought or earned), weapons and food, goals (36, each pays out),
settings (sound and music levels, fight difficulty, shake, hints, start
over). Cash, respect, health and everything else save in the browser by
themselves, the moment they change: a small "saved ✓" shows under the top
bar, the menu has a **Save** button, and the mirror's button is "Save and
start". If the browser won't keep it (a private window, storage blocked) the
game says so once. Saves belong to that browser at that address, so another
device or a preview link starts fresh.

Sound: footsteps change with what's underfoot (wood, tiles, wet road,
grit in the alley, the ridged strip on the platform, the club floor,
concrete under the bridge with its echo); people talking in the club, round
the cypher and in the queue outside the club; the station chime and a
voice through a bad speaker as each train comes in (captioned on screen
the first time each visit).

Controls: WASD or arrows, E / Space to use and talk, M for the menu, P for
your phone, Esc back to the site. On touch screens, a pad, A (and B and eat in a fight).
Reduced motion (or still visuals) turns off the rain, flicker, haze, shake
and the lightning flash.

Code: `src/components/game/`: `Game.tsx` (loop, input, dialogue, fights),
`hud.tsx` (the top bar, prompts, dialogue box, help, notices, touch pad,
knocked-out screen), `tuning.ts` (speed, keys, place names, trouble odds),
`lines.ts` (what people say),
`world.ts` and `places/` (the maps, the subway ride), `life.ts` (people,
traffic, the cat), `actors.ts` (drawing them), `people.ts` (sprites), `character.ts` (looks, clothes), `combat.ts`, `weapons.ts`,
`goals.ts`, `scripts.ts` (what the newer places' people say and do),
`career.ts` (followers, artists, songs, posts, messages, the mobs, what the
catalogue earns), `Phone.tsx`, `Menu.tsx`, `minigames/` (including the
session and the cups), `render.ts`, `sfx.ts`, `save.ts`, `studio/`.

### The studio

The sampler in the basement opens a small DAW. **Go to the studio** in
the game's top bar (or on the first-visit card) jumps straight there.

- **Sounds:** 55 synthesized sounds (8 kicks, 6 snares, claps and a snap,
  8 hats, 10 percussion, 808s and bass, rhodes, piano, organ, music box,
  bell, pad, strings, choir, pluck, lead, flute), eight **chops** sliced
  on the beat from each of the beats in the Beats folder (each track loads
  the first time one of its chops is used), four sounds you find around the
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

Code: `src/components/game/studio/` (the DAW: `voices.ts` sounds,
`engine.ts` mixer and sequencer, `project.ts` model and saves, `presets.ts`
starters, and the panels).

## Visitor stats

Vercel Web Analytics (`<Analytics />` in `src/app/layout.tsx`) counts page
views: visitors, countries, referrers, devices, and which beat pages people
land on. It uses no cookies. It only records once Web Analytics is switched
on for the project in the Vercel dashboard (saeculo → Analytics → Enable),
and never in development.

## Project structure

- `src/app/`: layout (fonts, and a tiny script that decides before the
  first paint whether to show the intro), page, share image.
- `src/components/site/`: the desktop, windows, taskbar, icons, Socials,
  Contact, and the site store. Theme tokens are in the `@theme` block of
  `src/app/globals.css` (cream, stone, line, dusk…); fonts: IBM Plex Sans,
  Jersey 10 for window titles, VT323 for the clock and the player's time.
- `src/components/beats/`: the Beats window and the waveform seek bar
  (`Visualizer.tsx` and `wordmark.ts` are no longer used).
- `src/components/player/`: the global player store and `<audio>` element.
- `src/components/intro/`: the intro.
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
npm i --no-save playwright-core axe-core sharp
npx next dev -p 3210
node scripts/verify.mjs
```

`node scripts/playtest.mjs <dir> [desk|phone]` takes screenshots of every
place, each menu tab, each mini-game and a whole fight, on a desktop and a
phone, for checking by eye.

The earlier version of the site (the Vista desktop, Beat Deck, Night
Radio, the vault) is in the git history before this redesign.
