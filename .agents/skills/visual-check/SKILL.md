---
name: visual-check
description: Screenshot the running saeculo dev server at desktop and mobile widths and check the result against the design direction before calling any UI work done.
---

# Visual check

Run this after any change that alters what the site looks like.

1. Confirm the dev server is up:
   `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000`
   If it is not 200, start `npm run dev` in the background and wait for it.
2. Open http://localhost:3000 in Chrome. Click once to skip the boot sequence.
3. Screenshot at 1440x900. Then resize to 390x844 and screenshot again.
4. Open each window the change touched and screenshot it at both widths.
5. For every screenshot, write down what you actually see, then list any
   violation of `.Codex/rules/design.md`: raw colours, a font used outside its
   role, motion that eases rather than snaps, chrome that reads as a Windows
   pastiche, anything that looks like a generic template.
6. Check the browser console for errors while you are there.
7. Fix what you found and repeat — at most twice. Then report with the
   screenshots and any remaining gaps.

Never report a visual change as done without having done this.
