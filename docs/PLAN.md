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

## Next (in order)
7. README + verify.mjs kept up to date with each of the above.
