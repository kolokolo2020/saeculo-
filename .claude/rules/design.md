---
paths:
  - "src/components/**/*.tsx"
  - "src/app/**/*.tsx"
  - "src/app/globals.css"
---

# saeculo design direction

The site is a bootleg tape deck / camcorder OS. Not Windows 95, not a neon
vaporwave poster, not a generic "retro website". If a change would look at home
on a template, it is wrong.

## Fixed — do not relitigate

- Ground is near-black warmed toward olive (`--color-void #0b0c09`). Never
  neutral grey, never blue-black.
- One accent: camcorder REC amber (`--color-signal #ff9a2e`). Cyan
  (`--color-bleed #4fd6c4`) appears only as chroma bleed and ghosting, never as
  a second UI colour.
- Chrome is plastic and brushed metal — `.deck-panel`, `.deck-panel-recessed`,
  `.deck-button`. Never grey bevels or navy titlebars.
- Type roles are fixed. Press Start 2P (`font-pixel`) for OS chrome identity
  only: window titles, icon labels, taskbar, start menu, wallpaper tagline.
  VT323 (`font-readout`) for live readouts: counters, bpm, timestamps, the
  now-playing marquee. Bricolage Grotesque (`font-display`) for display type.
  Manrope (`font-body`) for prose. Do not mix these roles.
- Texture is static grain plus faint scanlines, always on, barely there. No
  animated CRT effects.

## The bar for anything new

It should feel like a thing that plausibly shipped on a cheap piece of consumer
electronics in 1997 and was later cracked open. Physical metaphors over
software ones: tape counters, VU meters, lens brackets, sticker labels, jog
wheels, a tracking knob, a battery gauge. Not: modals, toasts, gradient
buttons, glassmorphism, emoji, drop shadows on cards.

## Interaction

Controls feel mechanical. A press moves 1px. A switch snaps. Nothing eases in
over 300ms. Sound is welcome but must be synthesized in `src/lib/synth.ts` —
never sampled.

## Already tried and rejected — do not propose again

- A Windows-95 pastiche with grey bevels and navy titlebars. Too generic.
- A scrolling landing page with Nav / Hero / Beats / Lab / About sections. The
  OS *is* the product; scrolling throws that away.

## Before calling any visual change done

Run the `visual-check` skill. Screenshots, not assertions.
