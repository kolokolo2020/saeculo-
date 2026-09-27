// The film poster and the show flyers pinned up in the Room. They live
// apart from the rest of the scene so the desktop's Pictures window can show
// them without loading the Room. Each is drawn at its own origin; pass the id
// of a halftone <pattern> defined in the surrounding <svg>.

const INK = "#05060a";
const FILM = { fontFamily: "var(--font-film)" } as const;
const TYPE = { fontFamily: "var(--font-type)" } as const;

export const POSTER_SIZE = { w: 244, h: 336 };
export const FLYER_SIZE = { w: 150, h: 206 };

/** THE SAECULO TAPES: a horror film that doesn't exist. */
export function TapesPoster({ dots }: { dots: string }) {
  return (
    <>
      <rect width="244" height="336" fill="#cbbf9f" stroke={INK} strokeWidth="4" />
      <rect x="12" y="12" width="220" height="312" fill="#120808" />
      <rect x="12" y="12" width="220" height="312" fill={`url(#${dots})`} opacity="0.5" />
      <ellipse cx="122" cy="128" rx="72" ry="34" fill="#e7dcc3" stroke={INK} strokeWidth="3" />
      <circle cx="122" cy="128" r="27" fill="#7e1414" stroke={INK} strokeWidth="3" />
      <circle cx="122" cy="128" r="11" fill="#000" />
      <circle cx="114" cy="120" r="5" fill="#fff" opacity="0.8" />
      {Array.from({ length: 9 }, (_, i) => {
        const x = 60 + i * 15.5;
        return <line key={i} x1={x} y1={98 - Math.sin((i / 8) * Math.PI) * 8} x2={x - 4 + i} y2={78 - Math.sin((i / 8) * Math.PI) * 14} stroke="#e7dcc3" strokeWidth="3" />;
      })}
      <path d="M104 160 C106 176 100 196 104 214 C108 196 104 178 112 162 Z M136 160 C140 170 138 184 141 196 C144 184 142 170 146 160 Z" fill="#8e1b1b" />
      <text x="122" y="244" textAnchor="middle" fontSize="27" fill="#e7dcc3" style={FILM}>
        THE SAECULO
      </text>
      <text x="122" y="280" textAnchor="middle" fontSize="40" fill="#e7dcc3" style={FILM}>
        TAPES
      </text>
      <text x="122" y="302" textAnchor="middle" fontSize="10.5" fill="#c43b3b" letterSpacing="3" style={TYPE}>
        NOBODY SLEEPS ON TAPE
      </text>
      <text x="122" y="316" textAnchor="middle" fontSize="8" fill="#8a7d63" letterSpacing="2" style={TYPE}>
        IN COLOR · 1987 · RATED X
      </text>
      {/* torn corner */}
      <polygon points="244,296 244,336 204,336" fill="#10141d" />
      <polygon points="244,296 204,336 214,300" fill="#a3967a" stroke={INK} strokeWidth="2" />
      <rect x="-8" y="-6" width="44" height="16" fill="#e6dcb8" opacity="0.7" transform="rotate(-20 14 2)" />
      <rect x="208" y="-6" width="44" height="16" fill="#e6dcb8" opacity="0.7" transform="rotate(18 230 2)" />
        </>
  );
}

/** A warehouse show, photocopied too many times. */
export function WarehouseFlyer({ dots }: { dots: string }) {
  return (
    <>
      <rect width="150" height="206" fill="#e9e3d2" stroke={INK} strokeWidth="3" />
      <rect x="12" y="12" width="126" height="70" fill={`url(#${dots})`} />
      <rect x="12" y="12" width="126" height="70" fill="none" stroke={INK} strokeWidth="2" />
      <text x="75" y="108" textAnchor="middle" fontSize="21" fill={INK} style={{ ...TYPE, fontWeight: 700 }}>
        WAREHOUSE
      </text>
      <text x="75" y="130" textAnchor="middle" fontSize="13" fill={INK} style={TYPE}>
        SAT · 3 AM
      </text>
      <text x="75" y="152" textAnchor="middle" fontSize="13" fill="#8e1b1b" style={TYPE}>
        saeculo (live)
      </text>
      <text x="75" y="172" textAnchor="middle" fontSize="11" fill={INK} style={TYPE}>
        + tape swap
      </text>
      <text x="75" y="192" textAnchor="middle" fontSize="11" fill={INK} style={TYPE}>
        no phones. no names.
      </text>
      <rect x="58" y="-8" width="34" height="14" fill="#e6dcb8" opacity="0.7" transform="rotate(4 75 0)" />
        </>
  );
}

/** A tape swap in a basement: white ink on black, xeroxed crooked. */
export function TapeSwapFlyer({ dots }: { dots: string }) {
  return (
    <>
      <rect width="150" height="206" fill="#111114" stroke={INK} strokeWidth="3" />
      <rect x="8" y="8" width="134" height="190" fill={`url(#${dots})`} opacity="0.18" />
      <text x="75" y="42" textAnchor="middle" fontSize="27" fill="#ece6d6" style={FILM}>
        TAPE
      </text>
      <text x="75" y="70" textAnchor="middle" fontSize="27" fill="#ece6d6" style={FILM}>
        SWAP
      </text>
      {/* a cassette */}
      <g transform="translate(30 82)">
        <rect width="90" height="56" rx="5" fill="#ece6d6" stroke={INK} strokeWidth="2" />
        <rect x="10" y="8" width="70" height="22" fill="#b33" opacity="0.85" />
        <circle cx="28" cy="38" r="8" fill="#111114" />
        <circle cx="62" cy="38" r="8" fill="#111114" />
        <circle cx="28" cy="38" r="3" fill="#ece6d6" />
        <circle cx="62" cy="38" r="3" fill="#ece6d6" />
        <path d="M18 56 L24 46 L66 46 L72 56" fill="none" stroke={INK} strokeWidth="2" />
      </g>
      <text x="75" y="160" textAnchor="middle" fontSize="11" fill="#ece6d6" style={TYPE}>
        the basement, under
      </text>
      <text x="75" y="173" textAnchor="middle" fontSize="11" fill="#ece6d6" style={TYPE}>
        the laundromat
      </text>
      <text x="75" y="192" textAnchor="middle" fontSize="10" fill="#d45050" style={TYPE}>
        bring blanks. leave copies.
      </text>
    </>
  );
}

/** A pirate station's flyer on pink newsprint. */
export function NightRadioFlyer({ dots }: { dots: string }) {
  return (
    <>
      <rect width="150" height="206" fill="#e7b9b4" stroke={INK} strokeWidth="3" />
      <rect x="0" y="0" width="150" height="206" fill={`url(#${dots})`} opacity="0.12" />
      <text x="75" y="36" textAnchor="middle" fontSize="23" fill={INK} style={FILM}>
        NIGHT
      </text>
      <text x="75" y="62" textAnchor="middle" fontSize="23" fill={INK} style={FILM}>
        RADIO
      </text>
      {/* a tuning dial */}
      <g transform="translate(15 74)">
        <rect width="120" height="34" rx="3" fill="#1b1512" stroke={INK} strokeWidth="2" />
        {Array.from({ length: 13 }, (_, i) => (
          <line key={i} x1={10 + i * 8.3} y1="6" x2={10 + i * 8.3} y2={i % 2 ? 12 : 16} stroke="#e8c98a" strokeWidth="1.2" />
        ))}
        <text x="10" y="28" fontSize="7" fill="#e8c98a" style={TYPE}>
          88
        </text>
        <text x="58" y="28" fontSize="7" fill="#e8c98a" style={TYPE}>
          98
        </text>
        <text x="100" y="28" fontSize="7" fill="#e8c98a" style={TYPE}>
          108
        </text>
        <line x1="113" y1="3" x2="113" y2="31" stroke="#e0402e" strokeWidth="2" />
      </g>
      <text x="75" y="130" textAnchor="middle" fontSize="11" fill={INK} style={TYPE}>
        3 AM till the tape
      </text>
      <text x="75" y="143" textAnchor="middle" fontSize="11" fill={INK} style={TYPE}>
        runs out
      </text>
      <text x="75" y="165" textAnchor="middle" fontSize="10" fill={INK} style={TYPE}>
        no names. no ads.
      </text>
      <text x="75" y="190" textAnchor="middle" fontSize="9.5" fill="#8e1b1b" style={TYPE}>
        keep turning past the end
      </text>
    </>
  );
}
