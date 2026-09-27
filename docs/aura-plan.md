# saeculo: "Aura" plan

Goal: keep the Vista desktop, but make it feel like a late-night underground
artist's machine you've stumbled into. Mysterious and a little haunted,
with a vintage horror-film and VHS feel, built on modern web tech.
Everything below is built in code (SVG, canvas, Web Audio, CSS), so it
loads fast, scales to any screen, and needs no stock assets.

**What I can't make here:** AI-generated videos or images. There's no
generator in this environment. Instead I'll build slots for them: drop an
MP4/WebM next to a track and the player uses it as a visualizer (Phase 3).
Section 7 has prompts you can paste into a video generator to make them.

---

## 0. Design language (applies to everything)

| Idea | How it shows up |
| --- | --- |
| **Night** | Deep ink blues and blacks, a single light source (the laptop / CRT glow), cold moonlight, one warm accent (a joint's ember, a lamp). |
| **Comic ink** | Bold black outlines, flat fills, halftone-dot shading, a slightly wobbly hand-drawn line (an SVG turbulence filter). |
| **Old film / horror** | Film grain, gate weave (the frame drifts a hair), dust and scratches, flicker, vignette, silent-film title cards ("REEL ONE"), a typewriter face. |
| **Tape / VHS** | Scanlines, chroma bleed, tracking-error bars, a "PLAY ▶" OSD in the corner, timestamps. |
| **Restraint** | Effects are subtle by default and stronger in "Midnight" mode. Nothing blocks reading or clicking. Reduced-motion users get stills. |

Fonts to add (Google Fonts via next/font): **Special Elite** for typewriter
cards, notes and captions, and **IM Fell English SC** for old film title
cards. The Vista UI keeps Segoe / Open Sans.

---

## Phase 1: Foundations (a shared FX and sound layer)

1. **`AuraLayer` component**: one full-screen, pointer-transparent overlay
   drawn with CSS and a small canvas:
   - animated film grain (a pre-rendered noise tile, shifted each frame)
   - vignette
   - faint scanlines (tape mode)
   - a rare "signal drop": a horizontal tearing bar and a flash of static
     that rolls down the screen every few minutes
   - it pauses when the tab is hidden and goes static for reduced motion.
2. **Atmosphere setting** in Personalize, saved like the other options:
   - **Clean**: today's look
   - **Tape**: grain, scanlines, rare glitches (the new default)
   - **Midnight**: heavier grain, red-shifted wallpaper, more frequent
     "events" (Phase 2).
   The desktop also switches to Midnight on its own between 00:00 and
   04:00 local time, unless the visitor chose Clean.
3. **Ambience engine** (`lib/ambience.ts`): room tone built from Web Audio
   noise (rain on glass, vinyl crackle, a low hum), with a quiet on/off
   switch in the tray next to the volume. It never autoplays: it starts
   only after the first click, as browsers require.
4. **Fonts and tokens**: the new faces, plus CSS variables for ink, ember,
   moon and CRT colours.

**Done when:** you can switch atmosphere live, it costs nothing measurable
when idle, the tests pass, and axe still finds no problems.

---

## Phase 2: The Room (the intro)

The entrance to the site: a comic-style, animated scene.

**The scene, drawn in layered SVG, from back to front:**
1. **Window:** night city with a few lit windows, a moon behind drifting
   cloud, rain streaks on the glass, and car headlights now and then that
   sweep across the ceiling.
2. **Wall:** a peeling horror-film poster (an invented film, e.g. *"THE
   SAECULO TAPES"*), a flyer for a warehouse show, a shelf of records and
   cassettes, and a crack of light under the door.
3. **Desk:** laptop (its screen is the light source for the whole scene),
   a MIDI drum pad, headphones, an ashtray, a mug, tangled cables, a
   lava-lamp glow.
4. **The artist:** a mid-20s man, seen from behind and slightly above
   (over-the-shoulder, which suits the camera move). Hoodie up or hair
   out, headphones on, one hand tapping pads, the other holding a joint.
   - The ember brightens when he draws on it, and smoke curls up through
     a turbulence filter.
   - His head nods on the beat.
5. **The cat:** black and white (tuxedo), sitting on the desk beside the
   laptop. Its tail sways, it blinks slowly, an ear flicks, and now and
   then it turns to look at the viewer, a slightly uncanny beat.
6. **Film layer:** grain, vignette, halftone shading, a frame counter and
   a "REEL ONE" card.

**Motion and sound:**
- **Idle loop (about 12 s, never obviously repeating):**
  - rain
  - smoke
  - tail sway
  - head nod locked to a muffled beat bleeding from his headphones, which
    is one of your tracks through a low-pass filter
  - screen flicker
  - an occasional headlight sweep
- **The mouse moves the scene:** layers shift at different speeds, so it
  feels 3-D.
- **Title card on arrival:** "saeculo · instrumentals" in old film type,
  then "click to enter". That click is also what browsers need to allow
  sound.
- **The camera move:**
  1. The shot pushes slowly toward the laptop, rising behind and above
     him and over his shoulder.
  2. His shoulder and the cat blur as they pass the lens.
  3. The laptop screen fills the frame; the scanlines grow and the
     picture bends like an old CRT.
  4. A flash, and you're on the Vista boot screen, which is already what
     the laptop was showing, so the handoff is seamless.
  - It lasts about 4 s, and the camera move and the ambience are timed
    together.
- **Your choices are respected:**
  - "Skip intro" is always visible, and after the first visit it's a
    short version.
  - Deep links (share links, track links) skip it entirely.
  - "Return to the room" in the Start menu replays it.
  - Reduced motion gets a still frame with a fade.
- **Phones:** portrait gets a tighter, vertical crop centred on him, the
  laptop and the cat, and the push-in still works.

**Build steps:**
1. Scene geometry: artboard, layers, palette, the ink outline filter, the
   halftone pattern.
2. Draw the room, the window and the desk props.
3. Draw the artist (back view) and the cat.
4. Idle animations: CSS and SMIL for the simple ones, one small rAF loop
   for parallax, smoke and nod.
5. Muffled track and room tone, with the nod synced to the track's
   measured beat.
6. Title card and the click to enter.
7. The camera push, the CRT bend and the handoff to the boot screen.
8. Skip, remember, deep-link bypass, "Return to the room", reduced motion.
9. Mobile framing.
10. Tests: the intro shows, skip works, the push lands on the desktop,
    deep links bypass it.

**Done when:** the first visit plays the whole sequence smoothly on a
laptop and a phone, with no layout jumps or console errors, and skipping
takes one click or tap.

---

## Phase 3: Media, visualizers and AI video slots

1. **"Projector" visualizer** (new default in Midnight). The cover is
   thrown onto the screen like a worn 16 mm print: gate weave, dust,
   scratches, burn-in edges and an exposure flicker that hits on the
   beat.
2. **"Tape" mode for any visualizer**: a VHS overlay with chroma shift,
   tracking noise on bass hits, and a "▶ PLAY SP 0:42" on-screen readout.
3. **Video slot for AI visuals.** A `video` field per track in
   `tracks.ts`.
   - If it's set, a muted, looping video becomes a visualizer mode
     ("Film").
   - It's cropped to fit, shown through the same projector/tape
     treatment, and pauses with the music.
   - The README explains the format (MP4/H.264 or WebM, ~10–20 s seamless
     loop, 720p, under ~6 MB).
4. **Cover-matched desktop**: in Midnight, the DreamScene wallpaper takes
   on the projector grain.

---

## Phase 4: Mystique across the desktop

1. **Events** (rare; more often in Midnight):
   - a window title briefly changes ("don't turn around")
   - the clock gadget ticks backwards for a second
   - the cat walks along the taskbar and leaves
   - a new file flickers into the Recycle Bin and disappears
   - the next_single.exe download jumps and apologises
   - the screensaver shows the Room's window from outside
   Each happens at most once per visit. None of them blocks anything.
2. **Windows feel like tube screens:** they open like a CRT switching on
   (a line expands into the picture) and close by collapsing to a dot,
   with soft relay clicks. This is shown in Tape and Midnight; Clean keeps
   the Vista animations.
3. **Cursor and icons:** hovered icons ghost slightly (a quick
   chromatic split), and a faint cursor trail follows the pointer in
   Midnight.
4. **Lore**:
   - Notepad gets a second file, `found_footage.txt`, with typewriter log
     entries from "the night the tapes were made".
   - The film poster in the Room is clickable later, from the desktop, as
     a "poster.jpg" in a new Pictures window. That window also holds show
     flyers.
5. **Boot and lock screens:** a Tape-mode boot with a VHS "PLAY" OSD and
   a tracking-line wipe.

---

## Phase 5: Pirate radio (a new app, underground-scene flavour)

- **"Night Radio":** an old portable receiver window.
  - **Tuning:** drag or scroll the dial. Between stations it's static,
    made live with Web Audio.
  - **Stations:** each track is a station with a call sign and a typed DJ
    intro line, e.g. "you're listening to 88.3, it's 3 am, this one's
    elbtunnel".
  - **Hidden frequency:** plays something from the vault and gives a
    fourth clue.
- It plays through the global player, so the gadgets and widgets still
  work.

---

## Phase 6: Finish

- **Performance:**
  - the intro stays under about 60 KB of code
  - effects are GPU-friendly (transform and opacity)
  - the intro only loads for people who see it
  - check first paint again.
- **Accessibility:** axe clean; intro and effects respect reduced motion;
  skip is keyboard-reachable; the ambience is labelled.
- **Tests:** the verify script gains checks for the intro, the
  atmosphere modes, the Projector visualizer, Night Radio and the events
  (forced through a debug hook).
- **README** gets a section per feature, and a guide for adding AI
  videos.
- **The PR:** one branch, commits phase by phase. Your "merge it" merges
  it.

---

## 7. Prompts for AI video visualizers (optional, for you)

Loop-friendly prompts you could use in a video generator (Runway, Pika,
Kling, Sora, etc.). Export ~15 s, 16:9, seamless loop.
- *care4me*: "grainy 16mm film, a black and white cat sitting on a
  windowsill at night, city lights bokeh, slow push-in, melancholic,
  lo-fi, film scratches, seamless loop"
- *elbtunnel*: "VHS footage driving through a long tunnel at night,
  sodium lights streaking overhead, chromatic aberration, tracking
  noise, hypnotic, seamless loop"
- *dull knife*: "dark comic-ink animation, flickering fluorescent
  hallway, shadow passing a doorway, halftone shading, vintage horror
  film title-card aesthetic, seamless loop"

---

## Order of work

1 → 2 → 3 → 4 → 5 → 6. After each phase: type-check, lint, build, the
browser tests, screenshots reviewed, commit, push.
