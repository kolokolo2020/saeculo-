import { ImageResponse } from "next/og";
import { PROFILE } from "@/data/profile";

// Shared social card for opengraph-image and twitter-image. Rendered by
// next/og (satori), which supports a flexbox subset only — no CSS variables,
// no pseudo-elements, no background-image filters. Colours are therefore
// literal copies of the tokens in globals.css; keep them in sync by hand.
const VOID = "#0b0c09";
const INK = "#f1ead9";
const SIGNAL = "#ff9a2e";
const PAPER = "#ece3ce";
const PAPER_INK = "#24201a";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${PROFILE.artistName} — ${PROFILE.tagline}`;

// Viewfinder corner brackets. Satori throws on an undefined style value, so
// every corner passes a fully-populated style object rather than one built
// from optional fields.
const RULE = `4px solid ${SIGNAL}`;
const CORNER = { position: "absolute", display: "flex", width: 56, height: 56, opacity: 0.55 } as const;

// Inlined at the call site rather than returned from a component: satori
// flattens a fragment into the flex flow and drops the absolute positioning.

export function renderCard() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: VOID,
          position: "relative",
        }}
      >
        <div style={{ ...CORNER, top: 48, left: 48, borderTop: RULE, borderLeft: RULE }} />
        <div style={{ ...CORNER, top: 48, right: 48, borderTop: RULE, borderRight: RULE }} />
        <div style={{ ...CORNER, bottom: 48, left: 48, borderBottom: RULE, borderLeft: RULE }} />
        <div style={{ ...CORNER, bottom: 48, right: 48, borderBottom: RULE, borderRight: RULE }} />

        <div
          style={{
            position: "absolute",
            top: 66,
            left: 128,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", width: 16, height: 16, borderRadius: 8, background: SIGNAL }} />
          <div style={{ display: "flex", color: SIGNAL, fontSize: 26, letterSpacing: 6 }}>REC</div>
        </div>

        <div
          style={{
            display: "flex",
            color: INK,
            fontSize: 168,
            fontWeight: 700,
            letterSpacing: -6,
            lineHeight: 1,
          }}
        >
          {PROFILE.artistName}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 34,
            padding: "14px 28px",
            background: PAPER,
            color: PAPER_INK,
            fontSize: 30,
            letterSpacing: 4,
            transform: "rotate(-1deg)",
          }}
        >
          {PROFILE.tagline.toUpperCase()}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 66,
            right: 128,
            display: "flex",
            color: SIGNAL,
            fontSize: 26,
            letterSpacing: 4,
            opacity: 0.75,
          }}
        >
          00:00:00
        </div>
      </div>
    ),
    { ...size },
  );
}
