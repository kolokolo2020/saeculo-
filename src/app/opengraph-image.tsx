import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PROFILE } from "@/data/profile";
import { TRACKS } from "@/data/tracks";
import { paletteFor } from "@/components/player/analysis";

// The preview card shown when the link is shared: the aurora desktop with
// one glass window holding the name and the real cover art, drawn at
// build time.
export const alt = `${PROFILE.artistName}: instrumentals, a groovebox and a beatmaking card game on a glassy retro desktop`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BARS = [22, 38, 54, 42, 70, 88, 64, 50, 78, 96, 72, 56, 82, 60, 42, 68, 52, 34];

export default async function Image() {
  const covers = await Promise.all(
    TRACKS.map(async (t) => {
      if (!t.cover) return null;
      const data = await readFile(join(process.cwd(), "public", t.cover));
      return `data:image/jpeg;base64,${data.toString("base64")}`;
    }),
  );
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            // vertical only: rows of one colour compress to almost nothing in
            // a PNG, keeping the card small enough for every chat app's preview
            "linear-gradient(to bottom, #031633 0%, #06306b 45%, #0a4a8f 75%, #0b5a8f 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* the glass window */}
          <div
            style={{
              width: 1060,
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
                padding: "34px 40px 28px",
              }}
            >
              <div style={{ display: "flex", gap: 40 }}>
                <div style={{ display: "flex", flexDirection: "column", width: 420 }}>
                  <div style={{ display: "flex", color: "#ffffff", fontSize: 104, fontWeight: 700, letterSpacing: -3, lineHeight: 1 }}>
                    {PROFILE.artistName}
                  </div>
                  <div style={{ display: "flex", color: "#7fe0ff", fontSize: 32, marginTop: 10 }}>{PROFILE.tagline}</div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100, marginTop: 30 }}>
                    {BARS.map((h, i) => (
                      <div
                        key={i}
                        style={{ width: 17, height: h, borderRadius: 2, background: "linear-gradient(to top, #1f6fd1, #6fd7ff 70%, #d9fbff)" }}
                      />
                    ))}
                  </div>
                </div>
                {/* the tracks, as the Welcome Center shows them */}
                <div style={{ display: "flex", gap: 18, alignItems: "flex-start", marginTop: 6 }}>
                  {TRACKS.map((t, i) => (
                    <div key={t.id} style={{ display: "flex", flexDirection: "column", width: 150 }}>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          borderRadius: 6,
                          overflow: "hidden",
                          border: "1px solid rgba(255,255,255,0.25)",
                          boxShadow: "0 10px 24px rgba(0,0,0,0.6)",
                        }}
                      >
                        {covers[i] ? (
                          // eslint-disable-next-line @next/next/no-img-element -- rendered by ImageResponse, not the browser
                          <img src={covers[i]!} width={150} height={150} alt="" style={{ objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: 150, height: 150, background: "#0b2a5b" }} />
                        )}
                        <div style={{ height: 6, background: paletteFor(t.id).accent }} />
                      </div>
                      <div style={{ display: "flex", color: "#ffffff", fontSize: 22, fontWeight: 700, marginTop: 10 }}>{t.title}</div>
                      <div style={{ display: "flex", color: "#9fb2c9", fontSize: 17, marginTop: 2 }}>{`${t.bpm} bpm`}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", color: "#9fb2c9", fontSize: 25, marginTop: 26 }}>
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
