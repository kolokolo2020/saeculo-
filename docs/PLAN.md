# The plan (handoff between sessions)

Branch `claude/kind-goldberg-6x74gw`, draft PR #17. Don't merge until the
owner says "merge". Follow AGENTS.md for every step (checks, screenshots,
commit + push after each step, extend scripts/verify.mjs).

## Done
1. Intro: Vista-style boot (BIOS → loading bar → light streaks into a
   record + startup chord → welcome screen). `src/components/intro/`
2. Beats: one album cover (`scripts/make-cover.mjs`), night-blue glass
   media player, a separate LED wordmark visualizer (led / wave / still).
3. Game, first pass: character creator + wardrobe, 7 new places,
   drunk-guy encounters and real-time fights (weapons, health, knockout,
   Tank boss), cash/respect, selling beats, rhythm games (cypher, DJ set),
   dice, crates, hoops, tagging, shops, 16 goals, menu + settings.

4. Playtest pass (`scripts/playtest.mjs`): on phones your health bar is
   back on screen in a fight, toasts sit under the picture instead of over
   it, mini-game and menu headers fit on one line, Hoops shoots the moment
   a finger lands, touch screens see A/B/eat instead of key names; no
   "talk" prompt mid-fight.

5. Balance (tuned with a headless fight simulation of a casual and a decent
   player): foes stagger, then shrug hits off for a moment, so they get
   swings in; they hit harder and come again sooner. Difficulty scales
   damage, health, wind-up and rest. Drunks stay easy (normal: ~10 health
   lost), a rowdy group costs ~25, Tank with a bat ~50 (hard: often a loss
   without dodging). Club sets paid $60 per 20 seconds: now $15–$52 the
   first time in three minutes, a third after that; respect for a set only
   the first time or for beating your best. Trouble comes less often and
   leaves a minute's breather. Bike chain at 4 wins, knuckles at 7.

6. More life: a police car on the street and the avenue (light bar, a
   short siren as it nears; trouble walking up to you backs off), people
   passing through on the avenue, a cat in the alley (wanders between
   spots, bolts if you rush it, can be petted), a storm every minute or
   two outdoors (flash, then thunder, nearer = sooner and louder; no flash
   with reduced motion), and bystanders hop and cheer when you win a fight,
   with a line from whoever's nearest. Also: verify.mjs waits for windows
   to finish opening before the axe audit (it flaked mid-animation).

7. Things that happen: Vee, a rival producer at the underpass (shows up
   after your first sale or cypher), challenges you to a beat battle: a
   "battle" rhythm mode (drill beat, hats on you too at eighths, tighter
   windows, faster fall), $20 stake, her score rises with each of your
   wins. The CD guy asks for a beat under 90 BPM for track four ($25). Dre
   hands out delivery jobs in turn (busker, record shop, bar once you can
   get in), paid on return; the job shows in the menu. Two new goals
   (18). A fight you've won is cleared when you walk out of the place.

8. The subway as fast travel: at the avenue station, the platform edge
   offers "Get on: your block" while the doors are open; on your street,
   new stairs on the far pavement (green globe, SUBWAY sign) take you one
   stop to the avenue. Between stops, a couple of seconds in the carriage
   (tunnel lights going past, still with reduced motion; a door chime;
   the rumble; "next stop" on the board, centred so a phone sees it).
   Rides are counted (stats.rides).

9. Sound polish: five new step sounds (wet road on the street and the
   avenue, grit in the alley, the platform's metal strip, the club floor,
   concrete with an echo under the bridge); a crowd murmur bed (six
   noise "voices" through wandering vowel bands at syllable speed) for the
   club, the cypher (by distance) and the club queue, muted during rhythm
   games; a station announcement (three-note chime, a garbled tannoy
   voice) as each train comes in, captioned once per visit, and a short
   one when you board.

10. README and verify.mjs kept up to date with each step (verify.mjs:
    181 checks then, 221 now; `scripts/playtest.mjs` for screenshots). README: stale
    studio controls/code paragraph and the old `room/` folder removed,
    `sharp` added to the dev install line.

11. The owner's redesign request (session 2, partly reviewed; see below):
    - **Cover**: the owner's artwork, `public/covers/saeculo.jpg`.
    - **Beats**: the visualizer removed (screen, led/wave/still switch,
      siteStore vis state); the cover is the large hero of the player.
    - **Theme**: flat retro: warm paper windows, hairline borders, small
      radii, soft shadows, classic-Mac pinstripes on active title bars,
      Windows-style window buttons and taskbar, no bevels or glass. Tokens
      in the @theme block of globals.css; fonts IBM Plex Sans, Jersey 10,
      VT323.
    - **Intro**: replaced the Vista boot with the cigarette intro: dark
      archival gate with "saeculo" (click/key to enter), a cigarette smoked
      to the filter with falling ash and crackle, an exhale, smoke blowing in
      from the side revealing a bright "saeculo", then the dark blown away
      to the desktop. Phases on the dialog's data-phase: gate, burn, exhale,
      reveal, out. Reduced motion: name and a quick fade.
    - **Game**: Vee picks a different starter beat each battle and names it;
      carrying Dre's tape brings trouble sooner and more often, they ask
      about the tape, and a knockout loses it (job stage "lost", Dre says so,
      no pay); pet the alley cat 3 times in a visit and it follows you
      ~15 s.
    - Checks at handoff: tsc, lint, build clean; verify.mjs 207/207.

12. Review of item 11 (session 3), with screenshots at 1366x800 and
    390x844 and the diffs read:
    - theme: at 1366px Beats now opens clear of the right-hand column
      (x 122, Socials and Contact right-aligned at 952 / 912), so the three
      windows no longer overlap; a phone held sideways gets a tighter hero
      (120px cover, smaller title, waveform and play button) so the
      tracklist's header and first row show above the fold. Clock menu,
      focus rings on Socials and Contact, phone Beats: fine.
    - intro: every phase checked on desktop, phone and reduced motion, and
      the replay; it ends on Beats on both. Reveal frame time ~30 ms in
      headless software rendering: no single cause (the name's filter ~5
      ms, the smoke ~4 ms, mask and grain nothing measurable), so left as
      is; worth a look on a real slow phone.
    - game: Vee's four beats all have four lanes and playable charts
      (4.5–6.1 hits/s), and she names the next one; carrying, the group asks
      about the tape, a knockout loses it, Dre says so and the job is off.
      Fixed: the cat's first spot is on the dumpster, so the dumpster
      always took the E prompt and it couldn't be petted there; a cat right
      in front of you now comes first. It also ran off after one pet, so
      three meant chasing it: it now stays put for 8 s after each pet.
      `__game.peace()` now holds for the whole test (walking into a rough
      place could re-arm an ambush), the subway test waits a whole train
      cycle, and `__game.cat(trail, [x, y])` can sit the cat at a spot.
    - verify.mjs: 221 checks (Vee's beats, the tape, the cat, window
      placement, sideways phone). playtest.mjs adds Vee's battle, the tape
      lost in a knockout and Dre's line, the cat following and scared off.

## Handoff: what's next (in order)

The work in item 11 was done by parallel agents. The theme and intro tracks
finished their build step; the game track was stopped near the end of its
build; none of the three got their planned independent review or fix
round. So:

1. ~~**Review the three tracks with fresh eyes**~~ (done, item 12) (desktop 1366x800 and
   phone 390x844 screenshots, read the diffs):
   - theme: desktop with all windows open, clock menu, Socials and Contact
     focus rings, phone Beats, phone held sideways (the tracklist is below
     the fold there), all three windows open at 1366px (Socials and
     Contact overlap Beats' right edge);
   - intro: every phase on desktop and phone, the reduced-motion version,
     replay from the clock menu; frame time on the reveal (~30 ms in
     headless software rendering);
   - game: Vee's battle line names the beat and each battle uses another
     starter with a playable chart; a group asking about the tape; a
     knockout while carrying (job lost, Dre's line); the cat following
     and going home when you leave or trouble comes. Add screenshots to
     `scripts/playtest.mjs` for these.
2. **Things only a person can check**: listen to the intro (lighter,
   crackle, exhale) and the game sounds; try the intro on a real iPhone
   (the music starts at the reveal, ~4 s after the click, from the
   animation loop; the click starts and pauses the player to unlock audio:
   untested on iOS Safari); try touch controls on a real phone.
3. **Cleanup, only with the owner's OK** (the owner's rule is never to
   delete files): now-unused `src/components/beats/Visualizer.tsx`,
   `beats/wordmark.ts`, `player/spectrum.ts`, `public/covers/saeculo.svg`,
   the old per-track covers (`care4me.jpg`, `elbtunnel.jpg`,
   `dull-knife.jpg`), the dead `.boot-*` rules and `--font-vista` in
   globals.css, the player's unread AnalyserNode. **`scripts/make-cover.mjs`
   would overwrite the owner's cover** if run: retire it or point it
   elsewhere.
4. Small polish: `.intro-cover` in globals.css could use the intro's
   near-black (#0b0a09) instead of #000.
5. Update PR #17's description for item 11, then wait for the owner to say
   "merge".

Notes:
- Fight tuning was done with a headless simulation (combat.ts through jiti,
  a bot that swings in reach and dodges a share of wind-ups).
- The machine can run out of memory with the dev server, a build and the
  verify browser at once: run them one after another. With 4 CPUs only two
  workflow agents run at a time.
