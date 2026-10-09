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

## Next (in order)
1. Playtest pass on desktop and phone (390×844): screenshot every new place,
   the menu, each mini-game and a whole fight; fix layout, overlap,
   readability and anything that feels off. Check the phone controls in a
   fight (A swing, B dodge, eat) and the mini-games' touch input.
2. Balance: fight difficulty per setting, cash/respect rewards, prices,
   how often trouble comes, the weapon unlock pace. Keep it fun, not grindy.
3. More life on the map: a police car rolling by with lights, thunder and
   lightning now and then (respect reduced motion), more passers-by on the
   avenue, a cat in the alley, people reacting when you win a fight.
4. More things that happen: a rival producer challenges you to a beat
   battle (the rhythm game, harder); the CD guy asks you for a beat; Dre
   gives a small "job" (deliver a tape) with a reward.
5. Subway as fast travel: board the train when the doors are open and get
   off at "your block" (the street) or the avenue.
6. Sound polish: footsteps per surface in the new places, crowd murmur in
   the club and the cypher, the train announcement.
7. README + verify.mjs kept up to date with each of the above.
