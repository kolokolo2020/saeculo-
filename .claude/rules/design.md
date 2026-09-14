# saeculo design direction

The site is a bootleg Windows Vista–style desktop OS: Aero glass chrome over
a dark Aurora-glow desktop. Not Windows 95, not a flat modern web app, not a
neon vaporwave poster. If a change would look at home on a template, it is
wrong.

## Fixed — do not relitigate

- Ground is a deep midnight blue-black (`--color-void #050b16`), never
  neutral grey, never olive/warm-black.
- Chrome (window frames, taskbar, start menu, buttons) is light frosted
  glass — `.deck-panel`, `.deck-panel-recessed`, `.deck-button` — with a
  backdrop blur, a bright top sheen, and soft blurred elevation shadows.
  Never a hard-offset "pop-out" shadow, never flat opaque grey.
  `.deck-panel-recessed` is the bright near-white content surface inside a
  window; text sitting on it uses the dark `ink` token, not `paper`.
- One accent: Aero glass blue (`--color-signal #2f8ceb`) for focus, glow,
  glossy buttons and the focused titlebar. A secondary green
  (`--color-bleed #3fae56`, a nod to the Vista shield icon) appears only for
  links and small confirm accents, never as a second chrome colour.
- Corners are rounded (chrome radius lives in `.deck-panel` /
  `.deck-button` in `globals.css`, not sprinkled as `rounded-lg` in
  components) — except the taskbar and the bottom edge of the start menu,
  which stay flush with the screen edge.
- Type roles are fixed. `font-chrome` (Inter) for OS chrome identity:
  window titles, icon labels, taskbar, start menu, wallpaper tagline —
  the Segoe UI role. `font-readout` (the mono stack, tabular numbers) for
  live readouts: counters, bpm, timestamps, the now-playing marquee.
  Bricolage Grotesque (`font-display`) for display type. Manrope
  (`font-body`) for prose. Do not mix these roles.
- The desktop wallpaper is `.aero-glow` (a soft blue/green Aurora-style
  radial bloom) plus `.aero-sheen` (a faint diagonal glass reflection),
  always on. This is an original mood, not a reproduction of Microsoft's
  Aurora artwork — never import or trace the real wallpaper image.

## The bar for anything new

It should feel like Explorer chrome from 2007: glossy, glassy, a little
over-designed, self-consciously "next generation" at the time. Physical
metaphors are glass and light, not plastic and tape: reflections, glow,
translucency, rounded glossy buttons, a soft drop shadow under every
floating surface. Not: pixel fonts, scanlines, film grain, cassette
stickers, tape counters as a visual motif (the *readout* role can still
show a counter — just render it clean, not CRT-styled).

## Interaction

Aero chrome is glassy, not mechanical: hover brightens a button, focus adds
a soft blue glow, a press nudges 1px down with a slightly deeper inset
shadow. Short eases (~120ms) are fine here — this is glass responding to
light, not a switch snapping. Sound is welcome but must be synthesized in
`src/lib/synth.ts` — never sampled.

## Already tried and rejected — do not propose again

- The original bootleg tape-deck / camcorder OS: dark olive-black chrome,
  amber REC accent, flat plastic bevels, Press Start 2P pixel font, CRT
  scanlines and film grain, cassette-label stickers. Superseded by this
  Vista pivot — do not revert to it or mix its cues back in.
- A Windows-95 pastiche with grey bevels and navy titlebars. Too generic,
  and visually the opposite of the glassy Aero look this direction wants.
- A scrolling landing page with Nav / Hero / Beats / Lab / About sections.
  The OS *is* the product; scrolling throws that away.

## Before calling any visual change done

Run the `visual-check` skill. Screenshots, not assertions.
