// Small monochrome UI glyphs drawn as SVG. Unicode symbols like ▶ ⏭ ✕
// render as full-colour emoji on some platforms regardless of CSS color,
// so every control glyph goes through here instead.
export type GlyphName =
  | "play"
  | "pause"
  | "stop"
  | "prev"
  | "next"
  | "repeat"
  | "volume"
  | "mute"
  | "close"
  | "minimize"
  | "maximize"
  | "restore"
  | "search"
  | "power"
  | "arrow"
  | "shuffle";

const PATHS: Record<GlyphName, React.ReactNode> = {
  play: <path d="M5 3.5v9l8-4.5z" fill="currentColor" />,
  pause: (
    <>
      <rect x="4" y="3.5" width="3" height="9" rx="0.5" fill="currentColor" />
      <rect x="9" y="3.5" width="3" height="9" rx="0.5" fill="currentColor" />
    </>
  ),
  stop: <rect x="4" y="4" width="8" height="8" rx="1" fill="currentColor" />,
  prev: (
    <>
      <rect x="3" y="4" width="2" height="8" fill="currentColor" />
      <path d="M13 4v8L6 8z" fill="currentColor" />
    </>
  ),
  next: (
    <>
      <rect x="11" y="4" width="2" height="8" fill="currentColor" />
      <path d="M3 4v8l7-4z" fill="currentColor" />
    </>
  ),
  repeat: (
    <path
      d="M4 6.5V6a2 2 0 0 1 2-2h5.5M12 9.5v.5a2 2 0 0 1-2 2H4.5M10 2l2 2-2 2M6 10l-2 2 2 2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  shuffle: (
    <path
      d="M2 4.5h2.5l6 7H13M2 11.5h2.5l1.8-2.1M9.7 6.6l.8-.9 2.5-1.2M11 3l2 1.5-2 1.5M11 10l2 1.5-2 1.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  volume: (
    <>
      <path d="M2.5 6h2.5l3.5-3v10L5 10H2.5z" fill="currentColor" />
      <path d="M10.5 5.5a3.5 3.5 0 0 1 0 5M12 3.8a6 6 0 0 1 0 8.4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),
  mute: (
    <>
      <path d="M2.5 6h2.5l3.5-3v10L5 10H2.5z" fill="currentColor" />
      <path d="M10.5 6l3 4M13.5 6l-3 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  close: <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
  minimize: <rect x="4" y="10" width="8" height="2" rx="0.5" fill="currentColor" />,
  maximize: <rect x="3.5" y="4" width="9" height="8" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1.6" />,
  restore: (
    <>
      <rect x="3" y="6" width="7" height="6" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 6V4h7v6h-3" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </>
  ),
  search: (
    <>
      <circle cx="7" cy="7" r="3.8" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  power: (
    <>
      <path d="M5 4.3a5 5 0 1 0 6 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M8 2.5v5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </>
  ),
  arrow: <path d="M6 3.5l4.5 4.5L6 12.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />,
};

export default function Glyph({
  name,
  size = 16,
  className,
}: {
  name: GlyphName;
  size?: number;
  className?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden className={className}>
      {PATHS[name]}
    </svg>
  );
}
