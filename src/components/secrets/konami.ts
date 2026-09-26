// The Konami code: ↑ ↑ ↓ ↓ ← → ← → B A.
const SEQUENCE = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];

/** Feed it every keydown; returns true on the key that completes the code. */
export function createKonamiListener() {
  let progress = 0;
  return (key: string) => {
    const k = key.toLowerCase();
    if (k === SEQUENCE[progress]) progress += 1;
    // a wrong key restarts; an extra ↑ still counts as the start of the code
    else if (k === "arrowup") progress = progress === 2 ? 2 : 1;
    else progress = 0;
    if (progress === SEQUENCE.length) {
      progress = 0;
      return true;
    }
    return false;
  };
}

/** The code typed out as words or arrows, e.g. "up up down down left right left right b a". */
export function isKonamiPhrase(text: string) {
  const t = text
    .toLowerCase()
    .replace(/↑/g, "up")
    .replace(/↓/g, "down")
    .replace(/←/g, "left")
    .replace(/→/g, "right")
    .replace(/[^a-z]/g, "");
  return t === "upupdowndownleftrightleftrightba";
}
