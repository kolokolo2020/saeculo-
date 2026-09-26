import { ImageResponse } from "next/og";
import { PROFILE } from "@/data/profile";

// The preview card shown when the link is shared: the aurora desktop with
// one glass window, drawn at build time.
export const alt = `${PROFILE.artistName}: instrumentals, a beat maker and rhythm games on a glassy retro desktop`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BARS = [38, 64, 92, 70, 120, 150, 110, 84, 132, 168, 124, 96, 140, 104, 72, 118, 88, 56, 80, 44];

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "radial-gradient(ellipse at 20% 110%, rgba(64,220,170,0.55), transparent 55%), radial-gradient(ellipse at 90% -10%, rgba(80,160,255,0.55), transparent 55%), linear-gradient(160deg, #031633 0%, #06306b 45%, #0a4a8f 70%, #042455 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* the glass window */}
          <div
            style={{
              width: 900,
              display: "flex",
              flexDirection: "column",
              borderRadius: 14,
              border: "2px solid rgba(255,255,255,0.55)",
              background: "linear-gradient(to bottom, rgba(186,220,255,0.55), rgba(96,150,220,0.35))",
              boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
              padding: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", height: 44, paddingLeft: 10 }}>
              <div style={{ color: "#0b1a33", fontSize: 24, textShadow: "0 0 12px rgba(255,255,255,0.9)" }}>
                {`${PROFILE.artistName} Media Player`}
              </div>
              <div style={{ flex: 1 }} />
              <div style={{ display: "flex", gap: 2 }}>
                <div style={{ width: 44, height: 26, borderRadius: "5px 0 0 5px", background: "linear-gradient(#e8f2ff, #9fc3ea)" }} />
                <div style={{ width: 44, height: 26, background: "linear-gradient(#e8f2ff, #9fc3ea)" }} />
                <div style={{ width: 64, height: 26, borderRadius: "0 5px 5px 0", background: "linear-gradient(#f5a38f, #c42b1c)" }} />
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                borderRadius: 6,
                border: "1px solid #000",
                background: "linear-gradient(to bottom, #1b2533, #03070f)",
                padding: "36px 44px 30px",
              }}
            >
              <div style={{ display: "flex", color: "#ffffff", fontSize: 112, fontWeight: 700, letterSpacing: -3, lineHeight: 1 }}>
                {PROFILE.artistName}
              </div>
              <div style={{ display: "flex", color: "#7fe0ff", fontSize: 34, marginTop: 10 }}>{PROFILE.tagline}</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 170, marginTop: 26 }}>
                {BARS.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      width: 30,
                      height: h,
                      borderRadius: 3,
                      background: "linear-gradient(to top, #1f6fd1, #6fd7ff 70%, #d9fbff)",
                    }}
                  />
                ))}
              </div>
              <div style={{ display: "flex", color: "#9fb2c9", fontSize: 26, marginTop: 22 }}>
                play the beats · build a loop · beat the boss · find the vault
              </div>
            </div>
          </div>
        </div>
        {/* the taskbar */}
        <div
          style={{
            height: 56,
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            background: "linear-gradient(to bottom, rgba(40,52,70,0.95), rgba(4,8,14,0.98))",
            borderTop: "1px solid rgba(255,255,255,0.25)",
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              background: "radial-gradient(circle at 50% 30%, #bfe6ff, #1f6fd1 55%, #0b2a5b)",
              border: "2px solid rgba(255,255,255,0.6)",
            }}
          />
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", color: "#dbeaff", fontSize: 22 }}>saeculo.vercel.app</div>
        </div>
      </div>
    ),
    size,
  );
}
