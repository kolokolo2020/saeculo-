// Desktop icons drawn on a 32 × 32 pixel grid (crisp at 2×), and the
// monochrome control glyphs. Glyphs are SVG because unicode ▶ ⏭ render as
// colour emoji on some platforms.

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
  return <Pix rows={FOLDER} size={size} pal={{ k: "#1a140c", y: "#a8812e", Y: "#e4b95a", w: "#f7dc98" }} />;
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
  return <Pix rows={GLOBE} size={size} pal={{ k: "#10151a", b: "#4f7d99", g: "#8fb37a", s: "#c9c2b3" }} />;
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
  return <Pix rows={MAIL} size={size} pal={{ k: "#1c1a17", w: "#efe7d6", s: "#b9b0a0", r: "#a4452f" }} />;
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
  return <Pix rows={HOUSE} size={size} pal={{ k: "#16120e", r: "#6e1f18", s: "#8d8676", y: "#f2b45a", b: "#26303a", d: "#3b2a1c", g: "#2f3a2a" }} />;
}

// ---------------------------------------------------------------- glyphs

function G({ size = 14, className, children }: P & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} fill="currentColor" aria-hidden>
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
    <rect x="3.5" y="2.5" width="3.2" height="11" />
    <rect x="9.3" y="2.5" width="3.2" height="11" />
  </G>
);
export const PrevGlyph = (p: P) => (
  <G {...p}>
    <rect x="2.5" y="3" width="2" height="10" />
    <path d="M13.5 3v10L5 8z" />
  </G>
);
export const NextGlyph = (p: P) => (
  <G {...p}>
    <rect x="11.5" y="3" width="2" height="10" />
    <path d="M2.5 3v10L11 8z" />
  </G>
);
export const VolumeGlyph = ({ muted, ...p }: P & { muted?: boolean }) => (
  <G {...p}>
    <path d="M2 6h3l4-3.5v11L5 10H2z" />
    {muted ? (
      <path d="M11 5.5l4 5M15 5.5l-4 5" stroke="currentColor" strokeWidth="1.6" />
    ) : (
      <path d="M11 5.5c1.2 1.4 1.2 3.6 0 5M13 4c2 2.3 2 5.7 0 8" stroke="currentColor" strokeWidth="1.4" fill="none" />
    )}
  </G>
);
export const CloseGlyph = (p: P) => (
  <G {...p}>
    <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="2" />
  </G>
);
export const MinGlyph = (p: P) => (
  <G {...p}>
    <rect x="3" y="11" width="8" height="2" />
  </G>
);
export const MaxGlyph = (p: P) => (
  <G {...p}>
    <path d="M3 3h10v10H3z M4.5 6h7v5.5h-7z" fillRule="evenodd" />
  </G>
);
export const RestoreGlyph = (p: P) => (
  <G {...p}>
    <path d="M5 2.5h8.5V10H12V4H5z M2.5 5.5H11V13H2.5z M4 8h5.5v3.5H4z" fillRule="evenodd" />
  </G>
);
export const RepeatGlyph = (p: P) => (
  <G {...p}>
    <path d="M3 6.5V5a1.5 1.5 0 0 1 1.5-1.5H11V1.5L14 4.5 11 7.5V5.5H5V6.5z M13 9.5V11a1.5 1.5 0 0 1-1.5 1.5H5v2L2 11.5 5 8.5v2h6V9.5z" />
  </G>
);
export const ShuffleGlyph = (p: P) => (
  <G {...p}>
    <path d="M1.5 4h3l6 8h2v-2l2.5 3-2.5 3v-2h-2.8l-6-8H1.5z M1.5 12h3l1.6-2.1 1.2 1.6L5.3 14H1.5z M10.5 4h2V2l2.5 3-2.5 3V6h-1.8L9.3 7.8 8.1 6.2z" />
  </G>
);
export const StopGlyph = (p: P) => (
  <G {...p}>
    <rect x="3.5" y="3.5" width="9" height="9" />
  </G>
);
