// Desktop icons drawn on a 32 × 32 pixel grid (crisp at 2×) in the
// desktop's warm palette, and the monochrome control glyphs: filled for
// the transport, thin lines for the window buttons and toggles. Glyphs are
// SVG because unicode ▶ ⏭ render as colour emoji on some platforms.

type P = { size?: number; className?: string };

/** Rows of a pixel icon: one char per pixel, looked up in `pal`. */
function Pix({ rows, pal, size = 48 }: { rows: string[]; pal: Record<string, string>; size?: number }) {
  const rects: React.ReactElement[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      let w = 1;
      while (x + w < row.length && row[x + w] === c) w++;
      if (pal[c]) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={w} height={1} fill={pal[c]} />);
      x += w;
    }
  });
  return (
    <svg viewBox={`0 0 ${rows[0].length} ${rows.length}`} width={size} height={size} shapeRendering="crispEdges" aria-hidden>
      {rects}
    </svg>
  );
}

const FOLDER = [
  "................................",
  "................................",
  "................................",
  "...kkkkkkkk.....................",
  "..kyyyyyyyyk....................",
  "..kyYYYYYYYykkkkkkkkkkkkkkkk....",
  "..kyYYYYYYYYYYYYYYYYYYYYYYYyk...",
  "..kyYYYYYYYYYYYYYYYYYYYYYYYyk...",
  "..kyYYYYYYYYYYYYYYYYYYYYYYYyk...",
  "..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..",
  "..kwwwwwwwwwwwwwwwwwwwwwwwwwwk..",
  "..kwYYYYYYYYYYYYYYYYYYYYYYYYyk..",
  "..kwYYYYYYYYYYYYYkkkkYYYYYYYyk..",
  "..kwYYYYYYYYYYYYYkYYkkkYYYYYyk..",
  "..kwYYYYYYYYYYYYYkYYYYkYYYYYyk..",
  "..kwYYYYYYYYYYYYYkYYYYYYYYYYyk..",
  "..kwYYYYYYYYYYYYYkYYYYYYYYYYyk..",
  "..kwYYYYYYYYYYYYYkYYYYYYYYYYyk..",
  "..kwYYYYYYYYYYYkkkYYYYYYYYYYyk..",
  "..kwYYYYYYYYYYkkkkYYYYYYYYYYyk..",
  "..kwYYYYYYYYYYkkkkYYYYYYYYYYyk..",
  "..kwYYYYYYYYYYYkkYYYYYYYYYYYyk..",
  "..kwYYYYYYYYYYYYYYYYYYYYYYYYyk..",
  "..kwYYYYYYYYYYYYYYYYYYYYYYYYyk..",
  "..kwyyyyyyyyyyyyyyyyyyyyyyyyyk..",
  "..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..",
  "................................",
];
export function BeatsIcon({ size }: P) {
  return <Pix rows={FOLDER} size={size} pal={{ k: "#2a2622", y: "#c99a3c", Y: "#ecc66a", w: "#f8e3a6" }} />;
}

const GLOBE = [
  "................................",
  "................................",
  "...........kkkkkkkkk............",
  ".........kkbbbgggbbbkk..........",
  "........kbbbggggggbbbbk.........",
  ".......kbbgggggggbbbbbbk........",
  "......kbbbgggggbbbbbbbbbk.......",
  "......kbbbbgggbbbbbbgggbk.......",
  ".....kbbbbbbggbbbbbggggbbk......",
  ".....kbbbbbbbgbbbbggggggbk......",
  ".....kbbbbbbbbbbbbbgggggbk......",
  ".....kbbbbbbbbbbbbbbgggbbk......",
  ".....kbbbbgggbbbbbbbbbbbbk......",
  ".....kbbbggggggbbbbbbbbbbk......",
  ".....kbbbgggggggbbbbbbbbbk......",
  "......kbbbgggggbbbbbbbbbk.......",
  "......kbbbbgggbbbbbbbbbbk.......",
  ".......kbbbbggbbbbbbbbbk........",
  "........kbbbbbbbbbbbbbk.........",
  ".........kkbbbbbbbbbkk..........",
  "...........kkkkkkkkk............",
  "...............kk...............",
  "...............kk...............",
  "..........kkkkkkkkkkkk..........",
  "..........kssssssssssk..........",
  "..........kkkkkkkkkkkk..........",
  "................................",
];
export function SocialsIcon({ size }: P) {
  return <Pix rows={GLOBE} size={size} pal={{ k: "#2a2622", b: "#7fa7c9", g: "#a5cf98", s: "#b9b09f" }} />;
}

const MAIL = [
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "...kkkkkkkkkkkkkkkkkkkkkkkkkk...",
  "...kwkwwwwwwwwwwwwwwwwwwwwkwk...",
  "...kwwkwwwwwwwwwwwwwwwwwwkwwk...",
  "...kwwwkwwwwwwwwwwwwwwwwkwwwk...",
  "...kwwwwkwwwwwwwwwwwwwwkwwwwk...",
  "...kwwwwwkwwwwwwwwwwwwkwwwwwk...",
  "...kwwwwwwkwwwwwwwwwwkwwwwwwk...",
  "...kwwwwwwwkwwwwwwwwkwwwwwwwk...",
  "...kwwwwwwwwkwwrrwwkwwwwwwwwk...",
  "...kwwwwwwwwwkrrrrkwwwwwwwwwk...",
  "...kwwwwwwwwkwkrrkwkwwwwwwwwk...",
  "...kwwwwwwwkwwwkkwwwkwwwwwwwk...",
  "...kwwwwwwkwwwwwwwwwwkwwwwwwk...",
  "...kwwwwwkwwwwwwwwwwwwkwwwwwk...",
  "...kwwwwkwwwwwwwwwwwwwwkwwwwk...",
  "...kwwwkwwwwwwwwwwwwwwwwkwwwk...",
  "...kwwkwwwwwwwwwwwwwwwwwwkwwk...",
  "...kwkssssssssssssssssssssksk...",
  "...kkkkkkkkkkkkkkkkkkkkkkkkkk...",
  "................................",
];
export function ContactIcon({ size }: P) {
  return <Pix rows={MAIL} size={size} pal={{ k: "#2a2622", w: "#fbf8f2", s: "#d6cfc1", r: "#c0573f" }} />;
}

const HOUSE = [
  "................................",
  "................................",
  "..................kk............",
  "...............kkkkkk...........",
  "............kkkrrrrrrkk.........",
  ".........kkkrrrrrrrrrrrkk.......",
  "......kkkrrrrrrrrrrrrrrrrkk.....",
  "....kkrrrrrrrrrrrrrrrrrrrrrkk...",
  "...kkkkkkkkkkkkkkkkkkkkkkkkkkk..",
  ".....kssssssssssssssssssssssk...",
  ".....kssssssssssssssssssssssk...",
  ".....ksskkkkkksssssskkkkkkssk...",
  ".....ksskyyyyksssssskbbbbkssk...",
  ".....ksskyyyyksssssskbbbbkssk...",
  ".....ksskyyyyksssssskbbbbkssk...",
  ".....ksskkkkkksssssskkkkkkssk...",
  ".....kssssssssssssssssssssssk...",
  ".....ksssssssskkkkkkssssssssk...",
  ".....ksssssssskddddkssssssssk...",
  ".....ksssssssskddddkssssssssk...",
  ".....ksssssssskddydkssssssssk...",
  ".....ksssssssskddddkssssssssk...",
  ".....ksssssssskddddkssssssssk...",
  "..kkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
  "..ggggggggggggggggggggggggggggg.",
  "................................",
];
export function GameIcon({ size }: P) {
  return <Pix rows={HOUSE} size={size} pal={{ k: "#2a2622", r: "#5d79a6", s: "#efe7d6", y: "#f2c66a", b: "#7fa7c9", d: "#8a6a4a", g: "#9db48a" }} />;
}

// ---------------------------------------------------------------- glyphs

function G({ size = 14, className, children }: P & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} fill="currentColor" aria-hidden>
      {children}
    </svg>
  );
}
/** Line glyphs: window buttons, toggles, the volume. */
function L({ size = 14, className, children }: P & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const PlayGlyph = (p: P) => (
  <G {...p}>
    <path d="M4 2.5v11l9.5-5.5z" />
  </G>
);
export const PauseGlyph = (p: P) => (
  <G {...p}>
    <rect x="3.5" y="2.5" width="3.2" height="11" rx="0.8" />
    <rect x="9.3" y="2.5" width="3.2" height="11" rx="0.8" />
  </G>
);
export const PrevGlyph = (p: P) => (
  <G {...p}>
    <rect x="2.5" y="3" width="2" height="10" rx="0.6" />
    <path d="M13.5 3.6v8.8a.6.6 0 0 1-.92.5L5.6 8.5a.6.6 0 0 1 0-1l6.98-4.4a.6.6 0 0 1 .92.5z" />
  </G>
);
export const NextGlyph = (p: P) => (
  <G {...p}>
    <rect x="11.5" y="3" width="2" height="10" rx="0.6" />
    <path d="M2.5 3.6v8.8a.6.6 0 0 0 .92.5L10.4 8.5a.6.6 0 0 0 0-1L3.42 3.1a.6.6 0 0 0-.92.5z" />
  </G>
);
export const VolumeGlyph = ({ muted, ...p }: P & { muted?: boolean }) => (
  <L {...p}>
    <path d="M2.5 6.2h2.3L8 3.4v9.2L4.8 9.8H2.5z" fill="currentColor" />
    {muted ? <path d="M10.8 6l3.5 4M14.3 6l-3.5 4" /> : <path d="M10.6 5.8c.9 1.2.9 3.2 0 4.4M12.6 4.2c1.8 2.1 1.8 5.5 0 7.6" />}
  </L>
);
/** The game's close button (studio): heavy. */
export const CloseGlyph = (p: P) => (
  <G {...p}>
    <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="2" />
  </G>
);
/** The desktop's close button: a thin ×. */
export const XGlyph = (p: P) => (
  <L {...p}>
    <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
  </L>
);
export const MinGlyph = (p: P) => (
  <L {...p}>
    <path d="M4 11.5h8" />
  </L>
);
export const MaxGlyph = (p: P) => (
  <L {...p}>
    <rect x="3.5" y="3.5" width="9" height="9" rx="1.2" />
    <path d="M3.5 6h9" />
  </L>
);
export const RestoreGlyph = (p: P) => (
  <L {...p}>
    <rect x="2.75" y="5.75" width="7.5" height="7.5" rx="1.2" />
    <path d="M5.75 3.5c0-.5.3-.75.75-.75h6c.45 0 .75.3.75.75v6c0 .45-.3.75-.75.75h-1" />
  </L>
);
export const RepeatGlyph = (p: P) => (
  <L {...p}>
    <path d="M2.75 7.5V6.25A2 2 0 0 1 4.75 4.25h8M10.75 2.25l2 2-2 2M13.25 8.5v1.25a2 2 0 0 1-2 2h-8M5.25 13.75l-2-2 2-2" />
  </L>
);
export const ShuffleGlyph = (p: P) => (
  <L {...p}>
    <path d="M2.25 4.75h2.2c1 0 1.9.5 2.45 1.3l2.2 3.9c.55.8 1.45 1.3 2.45 1.3h2.2M12 9.5l1.75 1.75L12 13M2.25 11.25h2.2c.8 0 1.5-.3 2-.85M9.55 5.6c.5-.55 1.2-.85 2-.85h2.2M12 3l1.75 1.75L12 6.5" />
  </L>
);
export const StopGlyph = (p: P) => (
  <G {...p}>
    <rect x="3.5" y="3.5" width="9" height="9" />
  </G>
);
export const ChevronUpGlyph = (p: P) => (
  <L {...p}>
    <path d="M4.5 10l3.5-3.5 3.5 3.5" />
  </L>
);
