// The Room, drawn by hand in SVG on a 1600 × 1000 artboard: comic-book ink
// (heavy black outlines, flat night colours, halftone shadows) lit by one
// laptop screen and the moon. The pieces that move (heads, the cat's tail,
// the lava lamp) are separate small SVGs so animating them only repaints
// their own few pixels; everything here is static.

export const W = 1600;
export const H = 1000;
/** Centre of the laptop screen: where the camera ends up. */
export const SCREEN = { x: 780, y: 373, w: 300, h: 195 };
export const EMBER = { x: 977, y: 565 };

import { TapesPoster, WarehouseFlyer } from "./posters";

const INK = "#05060a";
const RIM = "#8fe4ff"; // laptop light
const MOON = "#a8bce6";
const TYPE = { fontFamily: "var(--font-type)" } as const;

/** Halftone dots, rotated like a comic print. */
function Dots({ id, r = 1.7, gap = 9, color = "#000" }: { id: string; r?: number; gap?: number; color?: string }) {
  return (
    <pattern id={id} width={gap} height={gap} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <circle cx={gap / 2} cy={gap / 2} r={r} fill={color} />
    </pattern>
  );
}

// ---------------------------------------------------------------- back wall

const SKYLINE: [number, number, number][] = [
  [130, 52, 110],
  [182, 34, 165],
  [216, 62, 96],
  [278, 30, 196],
  [308, 72, 128],
  [380, 42, 214],
  [422, 58, 150],
  [480, 36, 118],
  [516, 34, 178],
];

export function BackArt() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="absolute inset-0" aria-hidden>
      <defs>
        <Dots id="rb-dots" />
        <radialGradient id="rb-wall" cx="0.57" cy="0.47" r="0.62">
          <stop offset="0" stopColor="#233049" />
          <stop offset="0.55" stopColor="#151c2b" />
          <stop offset="1" stopColor="#0a0d14" />
        </radialGradient>
        <radialGradient id="rb-shadowmask" cx="0.57" cy="0.47" r="0.7">
          <stop offset="0.35" stopColor="#000" />
          <stop offset="1" stopColor="#fff" />
        </radialGradient>
        <mask id="rb-shadow">
          <rect width={W} height={H} fill="url(#rb-shadowmask)" />
        </mask>
        <linearGradient id="rb-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#070d22" />
          <stop offset="0.7" stopColor="#15244a" />
          <stop offset="1" stopColor="#2a2340" />
        </linearGradient>
        <radialGradient id="rb-moonglow">
          <stop offset="0" stopColor="#d9e4ff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#d9e4ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rb-lava">
          <stop offset="0" stopColor="#ff5a2a" stopOpacity="0.3" />
          <stop offset="1" stopColor="#ff5a2a" stopOpacity="0" />
        </radialGradient>
        <clipPath id="rb-glass">
          <rect x="130" y="100" width="420" height="420" />
        </clipPath>
      </defs>

      {/* wall, with halftone creeping in from the corners */}
      <rect width={W} height={H} fill="url(#rb-wall)" />
      <rect width={W} height={H} fill="url(#rb-dots)" mask="url(#rb-shadow)" opacity="0.6" />
      <circle cx="1500" cy="520" r="330" fill="url(#rb-lava)" />
      {/* moonlight thrown across the wall */}
      <polygon points="575,110 930,250 930,640 575,545" fill={MOON} opacity="0.045" />

      {/* the window */}
      <g clipPath="url(#rb-glass)">
        <rect x="130" y="100" width="420" height="420" fill="url(#rb-sky)" />
        <circle cx="455" cy="195" r="130" fill="url(#rb-moonglow)" />
        <circle cx="455" cy="195" r="44" fill="#e8eefc" />
        <circle cx="440" cy="183" r="9" fill="#cdd7ef" />
        <circle cx="470" cy="210" r="6" fill="#cdd7ef" />
        <circle cx="448" cy="215" r="4" fill="#cdd7ef" />
        {SKYLINE.map(([x, w, h], i) => (
          <g key={i}>
            <rect x={x} y={520 - h} width={w} height={h} fill="#05080f" />
            {Array.from({ length: Math.floor(h / 22) }, (_, r) =>
              Array.from({ length: Math.floor(w / 14) }, (_, c) =>
                (i * 7 + r * 3 + c * 5) % 6 === 0 ? (
                  <rect key={`${r}-${c}`} x={x + 5 + c * 14} y={520 - h + 10 + r * 22} width="5" height="8" fill="#ffd27a" opacity={0.55 + ((r + c) % 3) * 0.15} />
                ) : null,
              ),
            )}
          </g>
        ))}
        {/* an antenna with a red light, for the uneasy feeling */}
        <line x1="399" y1="306" x2="399" y2="262" stroke="#05080f" strokeWidth="3" />
      </g>
      {/* frame: mullions, sill */}
      <rect x="130" y="100" width="420" height="420" fill="none" stroke={INK} strokeWidth="6" />
      <rect x="334" y="100" width="12" height="420" fill="#0b0f18" stroke={INK} strokeWidth="4" />
      <rect x="130" y="304" width="420" height="12" fill="#0b0f18" stroke={INK} strokeWidth="4" />
      <rect x="112" y="82" width="456" height="456" fill="none" stroke="#0b0f18" strokeWidth="18" />
      <rect x="103" y="73" width="474" height="474" fill="none" stroke={INK} strokeWidth="5" />
      <rect x="94" y="538" width="492" height="22" fill="#10151f" stroke={INK} strokeWidth="5" />
      <path d="M103 73 L577 73" stroke={MOON} strokeWidth="2" opacity="0.4" />

      {/* shelf: records, tapes, a skull, a plant */}
      <g>
        {Array.from({ length: 17 }, (_, i) => {
          const x = 612 + i * 11 + (i > 8 ? 6 : 0);
          const h = 76 + ((i * 7) % 5) * 4;
          const colors = ["#2b1f38", "#4a1a1a", "#1b3040", "#151515", "#3d3322", "#23212b"];
          return <rect key={i} x={x} y={262 - h} width="10" height={h} fill={colors[i % colors.length]} stroke={INK} strokeWidth="2" />;
        })}
        <rect x="628" y="200" width="10" height="62" fill="#c9a23a" stroke={INK} strokeWidth="2" opacity="0.8" />
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <rect x={816} y={246 - i * 17} width="58" height="16" fill={i % 2 ? "#e0d6c0" : "#1d1f24"} stroke={INK} strokeWidth="2.5" />
            <rect x={826} y={250 - i * 17} width="38" height="7" fill={i % 2 ? "#b33" : "#d9ceb2"} opacity="0.8" />
          </g>
        ))}
        {/* the skull */}
        <g transform="translate(893 215)">
          <path d="M0 22 C-2 4 10 -6 22 -6 C34 -6 46 4 44 22 C44 30 38 34 36 36 L36 46 L8 46 L8 36 C6 34 0 30 0 22 Z" fill="#ddd3bd" stroke={INK} strokeWidth="3" />
          <ellipse cx="13" cy="21" rx="6" ry="7" fill={INK} />
          <ellipse cx="31" cy="21" rx="6" ry="7" fill={INK} />
          <path d="M20 30 L22 26 L24 30 Z" fill={INK} />
          <path d="M12 40 L32 40 M16 36 L16 46 M22 36 L22 46 M28 36 L28 46" stroke={INK} strokeWidth="2" />
        </g>
        {/* plant */}
        <g transform="translate(950 262)">
          <path d="M-14 0 L-10 -30 L10 -30 L14 0 Z" fill="#3a2418" stroke={INK} strokeWidth="3" />
          {[-60, -30, -5, 20, 45].map((a, i) => (
            <ellipse key={i} cx="0" cy="-54" rx="7" ry="24" fill="#1d3a26" stroke={INK} strokeWidth="2.5" transform={`rotate(${a} 0 -30)`} />
          ))}
        </g>
        <rect x="596" y="262" width="400" height="14" fill="#2a1d15" stroke={INK} strokeWidth="4" />
        <path d="M620 276 L620 300 L646 276 M970 276 L970 300 L944 276" stroke={INK} strokeWidth="5" fill="none" />
      </g>

      {/* flyer: a warehouse show, photocopied too many times */}
      <g transform="translate(1000 124) rotate(-5)">
        <WarehouseFlyer dots="rb-dots" />
      </g>

      {/* the poster: a horror film that doesn't exist */}
      <g transform="translate(1180 106) rotate(2.5)">
        <TapesPoster dots="rb-dots" />
      </g>

      {/* a line of light under the door, far right */}
      <rect x="1560" y="760" width="40" height="3" fill="#ffd27a" opacity="0.35" />
    </svg>
  );
}

// ---------------------------------------------------------------- the desk

function Speaker({ x }: { x: number }) {
  return (
    <g>
      <rect x={x} y="448" width="122" height="204" rx="9" fill="#111317" stroke={INK} strokeWidth="5" />
      <rect x={x + 6} y="454" width="110" height="192" rx="6" fill="none" stroke="#1d2026" strokeWidth="2" />
      <circle cx={x + 61} cy="496" r="17" fill="#07080a" stroke="#2a2e36" strokeWidth="4" />
      <circle cx={x + 61} cy="496" r="6" fill="#1b1e24" />
      <circle cx={x + 61} cy="585" r="44" fill="#07080a" stroke="#2a2e36" strokeWidth="5" />
      <circle cx={x + 61} cy="585" r="8" fill="#1b0404" />
      <circle cx={x + 102} cy="632" r="3" fill="#39a6ff" />
    </g>
  );
}

export const WOOFERS = [
  { x: 456 + 61, y: 585 },
  { x: 1334 + 61, y: 585 },
];

function Keyboard() {
  const keys = [];
  for (let r = 0; r < 4; r++) {
    const y = 595 + r * 9;
    const t = r / 3;
    const x0 = 760 - t * 30;
    const x1 = 1100 + t * 30;
    const n = 14;
    const w = (x1 - x0) / n;
    for (let c = 0; c < n; c++) keys.push(<rect key={`${r}-${c}`} x={x0 + c * w + 1} y={y} width={w - 2.5} height="6.5" rx="1" fill="#26292f" />);
  }
  return <g>{keys}</g>;
}

export function DeskArt() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="absolute inset-0" aria-hidden>
      <defs>
        <Dots id="rd-dots" r={2} gap={8} />
        <linearGradient id="rd-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2d1f16" />
          <stop offset="1" stopColor="#1d130d" />
        </linearGradient>
        <radialGradient id="rd-spill" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={RIM} stopOpacity="0.32" />
          <stop offset="1" stopColor={RIM} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="rd-lamp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb24a" />
          <stop offset="0.6" stopColor="#e2461f" />
          <stop offset="1" stopColor="#7a1a0e" />
        </linearGradient>
      </defs>

      {/* cables down the back of the desk */}
      <path d="M560 640 C600 700 700 690 740 648" stroke={INK} strokeWidth="6" fill="none" />
      <path d="M1160 646 C1240 700 1320 690 1350 646" stroke={INK} strokeWidth="6" fill="none" />

      {/* desk top and front */}
      <polygon points="36,648 1564,648 1600,716 0,716" fill="url(#rd-top)" stroke={INK} strokeWidth="5" />
      {[662, 676, 694].map((y, i) => (
        <path key={i} d={`M${60 + i * 40} ${y} C500 ${y + 4} 1100 ${y - 3} ${1540 - i * 30} ${y + 2}`} stroke="#150d08" strokeWidth="2" fill="none" />
      ))}
      <ellipse cx="930" cy="664" rx="420" ry="46" fill="url(#rd-spill)" />
      <rect x="0" y="716" width={W} height={H - 716} fill="#110b07" stroke={INK} strokeWidth="5" />
      <rect x="0" y="716" width={W} height={H - 716} fill="url(#rd-dots)" opacity="0.7" />

      <Speaker x={456} />
      <Speaker x={1334} />
      <path d="M578 452 L578 648" stroke={RIM} strokeWidth="2.5" opacity="0.5" />
      <path d="M1336 452 L1336 648" stroke={RIM} strokeWidth="2.5" opacity="0.5" />

      {/* the drum pad */}
      <polygon points="560,618 728,618 746,656 542,656" fill="#17191e" stroke={INK} strokeWidth="4" />
      {Array.from({ length: 8 }, (_, i) => {
        const r = Math.floor(i / 4);
        const c = i % 4;
        const y = 624 + r * 15;
        const x = 566 - r * 7 + c * 42 + r * 0;
        return <polygon key={i} points={`${x},${y} ${x + 34},${y} ${x + 37},${y + 11} ${x + 2},${y + 11}`} fill={["#3a2a14", "#1f2b3a", "#3a1a26", "#1f3a2a"][c]} stroke={INK} strokeWidth="1.5" />;
      })}

      {/* the laptop */}
      <rect x="764" y="357" width="332" height="229" rx="10" fill="#1a1c21" stroke={INK} strokeWidth="5" />
      <rect x={SCREEN.x} y={SCREEN.y} width={SCREEN.w} height={SCREEN.h} fill="#04060a" />
      <circle cx="930" cy="366" r="2.5" fill="#2b2f37" />
      <polygon points="734,586 1126,586 1178,654 682,654" fill="#24272d" stroke={INK} strokeWidth="5" />
      <Keyboard />
      <polygon points="880,638 980,638 987,650 873,650" fill="#1c1e23" stroke="#101216" strokeWidth="1.5" />
      <polygon points="760,592 1100,592 1135,634 725,634" fill={RIM} opacity="0.08" />

      {/* ashtray, mug */}
      <ellipse cx="1236" cy="668" rx="36" ry="10" fill="#2a2d33" stroke={INK} strokeWidth="3" />
      <ellipse cx="1236" cy="665" rx="24" ry="5" fill="#101114" />
      <path d="M1222 664 L1248 660" stroke="#d9d2c0" strokeWidth="5" strokeLinecap="round" />
      <path d="M1248 660 L1252 659" stroke="#555" strokeWidth="5" strokeLinecap="round" />
      <rect x="376" y="596" width="46" height="56" rx="4" fill="#2c1616" stroke={INK} strokeWidth="4" />
      <path d="M422 608 C446 610 446 638 422 640" stroke={INK} strokeWidth="5" fill="none" />
      <ellipse cx="399" cy="598" rx="23" ry="5" fill="#120a08" stroke={INK} strokeWidth="2" />
      <text x="399" y="632" textAnchor="middle" fontSize="9" fill="#d9ceb2" style={TYPE}>
        3AM
      </text>

      {/* lava lamp (the blobs move in their own layer) */}
      <path d="M1478 646 L1540 646 L1530 600 L1488 600 Z" fill="#2a2d33" stroke={INK} strokeWidth="4" />
      <path d="M1488 600 L1530 600 L1546 480 L1522 392 L1496 392 L1472 480 Z" fill="url(#rd-lamp)" stroke={INK} strokeWidth="4" opacity="0.92" />
      <path d="M1496 392 L1522 392 L1516 370 L1502 370 Z" fill="#2a2d33" stroke={INK} strokeWidth="4" />

      {/* the cat's body; head and tail are separate so they can move */}
      <path
        d="M1176 470 C1216 470 1246 520 1261 570 C1286 585 1301 615 1293 648 L1150 650 C1135 640 1130 610 1138 580 C1132 540 1140 500 1176 470 Z"
        fill="#0b0b0f"
        stroke={INK}
        strokeWidth="5"
      />
      <path d="M1143 522 C1136 560 1140 600 1152 642 L1178 642 C1172 600 1170 560 1173 512 C1163 507 1151 510 1143 522 Z" fill="#e8e4da" stroke={INK} strokeWidth="2.5" />
      <path d="M1250 590 C1270 610 1276 635 1268 648" stroke="#23232b" strokeWidth="3" fill="none" />
      <ellipse cx="1153" cy="649" rx="15" ry="7" fill="#e8e4da" stroke={INK} strokeWidth="2.5" />
      <ellipse cx="1181" cy="650" rx="14" ry="7" fill="#e8e4da" stroke={INK} strokeWidth="2.5" />
      <path d="M1176 472 C1152 486 1139 520 1139 578" stroke={RIM} strokeWidth="3" fill="none" opacity="0.7" />
    </svg>
  );
}

/** The cat's head: in profile watching the screen, or turned to look at you. */
export function CatHead({ looking }: { looking: boolean }) {
  return (
    <svg viewBox="0 0 140 140" width="140" height="140" aria-hidden className="overflow-visible">
      {/* profile */}
      <g style={{ opacity: looking ? 0 : 1, transition: "opacity 0.35s" }}>
        <path d="M64 50 L56 12 L86 42 Z" fill="#0b0b0f" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <path d="M60 44 L58 22 L76 40 Z" fill="#3a2226" />
        <path d="M90 48 L104 16 L110 54 Z" fill="#0b0b0f" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <path d="M112 78 C112 104 92 118 70 118 C52 118 38 110 30 100 C20 98 14 90 16 82 C18 72 26 64 34 58 C44 48 58 44 72 44 C96 44 112 58 112 78 Z" fill="#0b0b0f" stroke={INK} strokeWidth="4" />
        <path d="M16 84 C22 100 36 108 52 108 C46 96 38 88 30 84 C26 82 20 82 16 84 Z" fill="#e8e4da" stroke={INK} strokeWidth="2" />
        <ellipse cx="17" cy="82" rx="4" ry="3" fill="#d98a9a" />
        <g className="room-blink">
          <path d="M40 70 C46 64 56 64 60 70 C56 76 46 76 40 70 Z" fill="#8cff6e" stroke={INK} strokeWidth="2" />
          <ellipse cx="50" cy="70" rx="1.6" ry="5" fill={INK} />
        </g>
        <path d="M24 90 L-18 84 M24 94 L-16 96 M26 98 L-10 108" stroke="#d8d4ca" strokeWidth="1.3" />
        <path d="M34 58 C46 48 60 44 72 44" stroke={RIM} strokeWidth="2.5" fill="none" opacity="0.7" />
      </g>
      {/* looking at you */}
      <g style={{ opacity: looking ? 1 : 0, transition: "opacity 0.35s" }}>
        <path d="M34 54 L30 14 L62 42 Z" fill="#0b0b0f" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <path d="M106 54 L110 14 L78 42 Z" fill="#0b0b0f" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <ellipse cx="70" cy="80" rx="46" ry="38" fill="#0b0b0f" stroke={INK} strokeWidth="4" />
        <path d="M70 52 C62 70 52 96 44 110 C58 118 82 118 96 110 C88 96 78 70 70 52 Z" fill="#e8e4da" stroke={INK} strokeWidth="2" />
        <g className="room-blink">
          <ellipse cx="50" cy="76" rx="10" ry="8" fill="#8cff6e" stroke={INK} strokeWidth="2" />
          <ellipse cx="90" cy="76" rx="10" ry="8" fill="#8cff6e" stroke={INK} strokeWidth="2" />
          <ellipse cx="50" cy="76" rx="1.8" ry="7" fill={INK} />
          <ellipse cx="90" cy="76" rx="1.8" ry="7" fill={INK} />
          <circle cx="50" cy="76" r="15" fill="#8cff6e" opacity="0.18" />
          <circle cx="90" cy="76" r="15" fill="#8cff6e" opacity="0.18" />
        </g>
        <path d="M65 92 L75 92 L70 98 Z" fill="#d98a9a" stroke={INK} strokeWidth="1.5" />
        <path d="M58 96 L14 88 M58 100 L16 104 M82 96 L126 88 M82 100 L124 104" stroke="#d8d4ca" strokeWidth="1.3" />
      </g>
    </svg>
  );
}

/** The tail, hanging over the front edge of the desk. Sways from its base (38, 20). */
export function CatTail() {
  return (
    <svg viewBox="0 0 150 300" width="150" height="300" aria-hidden className="overflow-visible">
      <path d="M38 20 C60 60 92 110 74 170 C62 212 70 250 100 272" stroke={INK} strokeWidth="24" fill="none" strokeLinecap="round" />
      <path d="M38 20 C60 60 92 110 74 170 C62 212 70 250 100 272" stroke="#0b0b0f" strokeWidth="16" fill="none" strokeLinecap="round" />
      <path d="M44 30 C62 64 88 108 76 150" stroke={RIM} strokeWidth="2" fill="none" opacity="0.45" />
    </svg>
  );
}

/** Blobs rising and falling inside the lava lamp. */
export function LavaBlobs() {
  return (
    <svg viewBox="1460 380 100 230" width="100" height="230" aria-hidden>
      <defs>
        <clipPath id="rl-glass">
          <path d="M1488 600 L1530 600 L1546 480 L1522 392 L1496 392 L1472 480 Z" />
        </clipPath>
      </defs>
      <g clipPath="url(#rl-glass)">
        <ellipse className="room-lava-a" cx="1508" cy="560" rx="16" ry="20" fill="#ffd36b" opacity="0.85" />
        <ellipse className="room-lava-b" cx="1520" cy="470" rx="11" ry="14" fill="#ffc04a" opacity="0.8" />
        <ellipse className="room-lava-c" cx="1500" cy="430" rx="8" ry="10" fill="#ffe08a" opacity="0.8" />
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------- the artist

export function ArtistArt() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="absolute inset-0" aria-hidden>
      <defs>
        <Dots id="ra-dots" r={2.1} gap={8} />
        <clipPath id="ra-torso">
          <path d="M600 655 C640 630 760 628 810 652 C860 672 890 700 905 760 L930 1000 L500 1000 L520 770 C530 705 560 672 600 655 Z" />
        </clipPath>
        <linearGradient id="ra-shade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.55" stopColor="#000" />
        </linearGradient>
        <mask id="ra-shademask">
          <rect x="480" y="600" width="480" height="400" fill="url(#ra-shade)" />
        </mask>
      </defs>

      {/* hoodie */}
      <path d="M600 655 C640 630 760 628 810 652 C860 672 890 700 905 760 L930 1000 L500 1000 L520 770 C530 705 560 672 600 655 Z" fill="#1d232b" stroke={INK} strokeWidth="5" />
      <g clipPath="url(#ra-torso)">
        <rect x="480" y="600" width="480" height="400" fill="url(#ra-dots)" mask="url(#ra-shademask)" opacity="0.8" />
        <path d="M700 660 C696 720 702 780 700 860" stroke="#151a20" strokeWidth="3" fill="none" />
      </g>
      {/* neck and the hood lying on his back */}
      <path d="M678 612 L722 612 L726 652 L674 652 Z" fill="#4f3a31" stroke={INK} strokeWidth="3" />
      <path d="M632 648 C640 706 760 712 774 648 C752 670 656 672 632 648 Z" fill="#2a313b" stroke={INK} strokeWidth="4" />
      <path d="M650 660 C668 690 738 692 756 660" stroke="#161b22" strokeWidth="3" fill="none" />
      {/* backlight from the screen, moonlight from the window */}
      <path d="M602 654 C642 631 760 629 810 652" stroke={RIM} strokeWidth="3.5" fill="none" opacity="0.6" />
      <path d="M520 770 C530 705 560 672 600 655" stroke={MOON} strokeWidth="3" fill="none" opacity="0.35" />

      {/* left arm, reaching for the pads */}
      <path d="M566 690 C592 690 620 670 644 650 L658 662 C632 690 602 714 574 724 Z" fill="#1d232b" stroke={INK} strokeWidth="4" />
      <path d="M640 648 C646 638 660 636 668 644 C672 652 666 660 656 662 Z" fill="#5c4438" stroke={INK} strokeWidth="3" />

      {/* right arm, raised, holding the joint */}
      <path d="M800 660 C852 664 902 702 932 770 L906 798 C880 760 850 732 800 714 Z" fill="#1d232b" stroke={INK} strokeWidth="4" />
      <path d="M906 798 L932 770 C956 720 952 662 930 614 L900 617 C916 662 913 732 906 798 Z" fill="#232a33" stroke={INK} strokeWidth="4" />
      <path d="M930 616 C950 664 954 720 932 770" stroke={RIM} strokeWidth="2.5" fill="none" opacity="0.55" />
      <path d="M898 612 L934 608 L936 624 L900 628 Z" fill="#151a20" stroke={INK} strokeWidth="3" />
      <path d="M898 614 C890 598 896 584 910 579 C926 574 940 584 942 598 C944 610 934 620 918 622 Z" fill="#6a4e41" stroke={INK} strokeWidth="3" />
      <path d="M912 590 L928 588 M914 600 L932 598" stroke="#3d2b24" strokeWidth="2" />
      {/* the joint */}
      <path d="M934 588 L975 567" stroke={INK} strokeWidth="9" strokeLinecap="round" />
      <path d="M934 588 L975 567" stroke="#ece6d8" strokeWidth="5.5" strokeLinecap="round" />
      <path d="M966 571 L975 567" stroke="#5a5550" strokeWidth="5.5" strokeLinecap="round" />

      {/* the chair back, between us and him */}
      <path d="M544 792 C544 762 570 748 602 746 L828 746 C862 748 886 762 886 792 L892 1000 L538 1000 Z" fill="#0b0d11" stroke={INK} strokeWidth="6" />
      <path d="M566 790 C566 772 582 764 604 764 L826 764 C848 764 864 772 864 790 L868 1000" stroke="#1b1f27" strokeWidth="3" strokeDasharray="7 7" fill="none" />
      <path d="M602 746 L828 746" stroke={RIM} strokeWidth="2.5" opacity="0.35" />
    </svg>
  );
}

/** His head from behind: messy hair and headphones. Nods from the neck (90, 150). */
export function ArtistHead() {
  return (
    <svg viewBox="0 0 190 180" width="190" height="180" aria-hidden className="overflow-visible">
      <path d="M30 80 C34 18 146 18 150 80" stroke={INK} strokeWidth="20" fill="none" strokeLinecap="round" />
      <path
        d="M30 94 C22 52 55 18 92 18 C132 18 160 50 156 94 C160 122 140 144 120 152 L62 152 C42 142 30 122 30 94 Z"
        fill="#0d0f14"
        stroke={INK}
        strokeWidth="4"
      />
      {/* hair: tufts and strands */}
      <path d="M48 42 L36 22 L60 34 M80 22 L76 2 L94 20 M112 24 L126 6 L126 30 M138 44 L158 36 L146 56" fill="#0d0f14" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M60 60 C80 50 100 52 120 62 M52 90 C70 80 110 80 130 94 M64 124 C80 116 104 116 118 126" stroke="#1b1f29" strokeWidth="3" fill="none" />
      {/* headband */}
      <path d="M30 80 C34 18 146 18 150 80" stroke="#262a32" strokeWidth="12" fill="none" strokeLinecap="round" />
      <path d="M44 44 C70 18 112 18 138 44" stroke={RIM} strokeWidth="2" fill="none" opacity="0.5" />
      {/* ear cups */}
      <ellipse cx="28" cy="100" rx="20" ry="31" fill="#17191f" stroke={INK} strokeWidth="4" />
      <ellipse cx="152" cy="100" rx="20" ry="31" fill="#17191f" stroke={INK} strokeWidth="4" />
      <ellipse cx="152" cy="100" rx="9" ry="16" fill="#0b0c10" />
      <path d="M168 78 C176 92 176 110 168 124" stroke={RIM} strokeWidth="3" fill="none" opacity="0.8" />
      <path d="M12 82 C6 96 6 110 12 122" stroke={MOON} strokeWidth="2.5" fill="none" opacity="0.4" />
      {/* backlit hair */}
      <path d="M94 20 C132 20 158 50 158 90" stroke={RIM} strokeWidth="3" fill="none" opacity="0.65" />
    </svg>
  );
}
