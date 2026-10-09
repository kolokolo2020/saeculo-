// Draws the album cover: "saeculo" lit up on a spectrum analyser, over a
// night-blue aurora, with its reflection on the glass below. Writes
// public/covers/saeculo.svg (used on the site) and saeculo.jpg (share
// cards, lock screens). Run after changing the wordmark:
//   npm i --no-save sharp
//   node --experimental-strip-types scripts/make-cover.mjs
import { writeFileSync } from "fs";
import { createRequire } from "module";
import { restLevel, segColor, wordGrid } from "../src/components/beats/wordmark.ts";

const S = 1200;
const grid = wordGrid();
const PITCH = 23; // column pitch
const SEG_W = 19;
const SEG_H = 8;
const SEG_PITCH = 11;
const HEADROOM = 8; // ghost segments above the letters
const TOTAL = grid.segs + HEADROOM;
const x0 = (S - grid.cols * PITCH) / 2 + (PITCH - SEG_W) / 2;
const BASE = 680;

const hash = (n) => {
  const v = Math.sin(n * 91.7 + 13.1) * 43758.5453;
  return v - Math.floor(v);
};
const segRect = (col, seg, fill, extra = "") =>
  `<rect x="${x0 + col * PITCH}" y="${BASE - (seg + 1) * SEG_PITCH + 3}" width="${SEG_W}" height="${SEG_H}" rx="2" fill="${fill}"${extra}/>`;

let ghosts = "";
let peaks = "";
let lit = "";
let shine = "";
for (let c = 0; c < grid.cols; c++) {
  const level = Math.round(restLevel(c, grid.cols) * TOTAL * 0.82);
  const top = Math.max(level, grid.top[c]);
  for (let s = 0; s < TOTAL; s++) {
    if (grid.lit[c][s]) {
      lit += segRect(c, s, segColor(s / (grid.segs - 1)));
      shine += `<rect x="${x0 + c * PITCH + 2}" y="${BASE - (s + 1) * SEG_PITCH + 4}" width="${SEG_W - 4}" height="2" rx="1" fill="#fff" opacity="0.38"/>`;
    } else if (s < level) ghosts += segRect(c, s, segColor(s / (TOTAL - 1), (0.07 + 0.04 * hash(c * 31 + s)) * (grid.top[c] >= 0 && s <= grid.top[c] ? 0.55 : 1)));
  }
  const peak = Math.min(TOTAL - 1, top + 1 + Math.floor(hash(c) * 3));
  if (hash(c + 7) > 0.35) peaks += segRect(c, peak, segColor(peak / (TOTAL - 1), 0.42));
}

let dust = "";
for (let i = 0; i < 90; i++) {
  const x = hash(i) * S;
  const y = hash(i + 300) * S * 0.55;
  dust += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.6 + hash(i + 900) * 1.3).toFixed(2)}" fill="#dfe8ff" opacity="${(0.12 + hash(i + 600) * 0.4).toFixed(2)}"/>`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
<defs>
  <filter id="blur-xl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="90"/></filter>
  <filter id="blur-md" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>
  <filter id="blur-sm" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0"/></filter>
  <radialGradient id="vignette" cx="0.5" cy="0.48" r="0.75">
    <stop offset="0.45" stop-color="#000" stop-opacity="0"/>
    <stop offset="1" stop-color="#000" stop-opacity="0.72"/>
  </radialGradient>
  <linearGradient id="ribbon" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#7ff3ff" stop-opacity="0"/>
    <stop offset="0.45" stop-color="#bfe9ff" stop-opacity="0.9"/>
    <stop offset="1" stop-color="#b48cff" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="fade" x1="0" y1="${BASE}" x2="0" y2="${BASE + 170}" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#fff" stop-opacity="0.42"/>
    <stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <mask id="reflect" maskUnits="userSpaceOnUse" x="0" y="${BASE}" width="${S}" height="200"><rect x="0" y="${BASE}" width="${S}" height="200" fill="url(#fade)"/></mask>
  <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#0b1430" stop-opacity="0.9"/>
    <stop offset="1" stop-color="#04050c" stop-opacity="0"/>
  </linearGradient>
</defs>
<rect width="${S}" height="${S}" fill="#04050c"/>
<g filter="url(#blur-xl)">
  <ellipse cx="380" cy="360" rx="560" ry="170" fill="#12b8ff" opacity="0.30" transform="rotate(-14 380 360)"/>
  <ellipse cx="860" cy="880" rx="600" ry="190" fill="#6a4cff" opacity="0.34" transform="rotate(-14 860 880)"/>
  <ellipse cx="1000" cy="300" rx="300" ry="120" fill="#c84dff" opacity="0.16"/>
  <ellipse cx="600" cy="${BASE - 80}" rx="420" ry="110" fill="#2fe6ff" opacity="0.10"/>
</g>
${dust}
<path d="M -60 520 C 300 360, 720 660, 1260 420" fill="none" stroke="url(#ribbon)" stroke-width="38" opacity="0.10" filter="url(#blur-md)"/>
<path d="M -60 520 C 300 360, 720 660, 1260 420" fill="none" stroke="url(#ribbon)" stroke-width="1.6" opacity="0.55"/>
<path d="M -60 560 C 340 420, 760 700, 1260 470" fill="none" stroke="url(#ribbon)" stroke-width="1" opacity="0.3"/>
<path d="M -60 960 C 380 820, 820 1060, 1260 880" fill="none" stroke="url(#ribbon)" stroke-width="1.2" opacity="0.28"/>
<rect x="0" y="${BASE + 4}" width="${S}" height="260" fill="url(#floor)"/>
<g>${ghosts}${peaks}</g>
<g filter="url(#blur-md)" opacity="0.95">${lit}</g>
<g>${lit}${shine}</g>
<rect x="${x0 - 30}" y="${BASE + 1}" width="${grid.cols * PITCH + 60 - (PITCH - SEG_W)}" height="2" fill="#5fe9ff" opacity="0.55"/>
<rect x="${x0 - 30}" y="${BASE - 2}" width="${grid.cols * PITCH + 60 - (PITCH - SEG_W)}" height="8" fill="#5fe9ff" opacity="0.4" filter="url(#blur-sm)"/>
<g mask="url(#reflect)"><g transform="translate(0 ${2 * BASE + 8}) scale(1 -1)">${ghosts}<g filter="url(#blur-sm)">${lit}</g></g></g>
<rect width="${S}" height="${S}" fill="url(#vignette)"/>
<rect width="${S}" height="${S}" filter="url(#grain)" opacity="0.07"/>
</svg>
`;

writeFileSync(new URL("../public/covers/saeculo.svg", import.meta.url), svg);
const sharp = createRequire(import.meta.url)("sharp");
await sharp(Buffer.from(svg)).resize(1200).jpeg({ quality: 88, mozjpeg: true }).toFile(new URL("../public/covers/saeculo.jpg", import.meta.url).pathname);
console.log("wrote public/covers/saeculo.svg and saeculo.jpg");
