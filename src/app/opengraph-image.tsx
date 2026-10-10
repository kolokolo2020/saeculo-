import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PROFILE } from "@/data/profile";
import { ALBUM, TRACKS } from "@/data/tracks";

// The preview card when the link is shared: the album cover and the
// tracklist in a window on the desktop's paper, drawn at build time.
export const alt = `${PROFILE.artistName}: instrumentals & beats`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#1c1a17";
const INK_2 = "#6b6357";
const LINE = "#2a2622";
const RULE = "#ddd6c8";
const DUSK = "#3d5a8a";

export default async function Image() {
  const cover = `data:image/jpeg;base64,${(await readFile(join(process.cwd(), "public", ALBUM.coverJpg))).toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#cfc8b9",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: 1080,
            height: 530,
            display: "flex",
            flexDirection: "column",
            background: "#fbf8f2",
            border: `2px solid ${LINE}`,
            borderRadius: 18,
            boxShadow: "0 24px 60px rgba(42,32,18,0.3)",
            overflow: "hidden",
          }}
        >
          {/* the title bar, with the old pinstripes */}
          <div style={{ height: 56, display: "flex", alignItems: "center", gap: 18, padding: "0 22px", background: "#f3eee4", borderBottom: `2px solid ${LINE}` }}>
            <div style={{ fontSize: 26, color: INK, fontWeight: 700 }}>Beats</div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{ height: 2, background: LINE, opacity: 0.4 }} />
              ))}
            </div>
            <div style={{ width: 30, height: 30, border: `2px solid ${LINE}`, borderRadius: 8 }} />
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 48, padding: "0 44px" }}>
            <img src={cover} width={400} height={400} alt="" style={{ borderRadius: 10, border: `2px solid ${LINE}` }} />
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ fontSize: 20, letterSpacing: 5, color: INK_2, textTransform: "uppercase" }}>album</div>
              <div style={{ fontSize: 76, color: INK, marginTop: 2, fontWeight: 300 }}>{ALBUM.title}</div>
              <div style={{ fontSize: 26, color: INK_2, marginTop: 2 }}>{PROFILE.tagline}</div>
              <div style={{ display: "flex", flexDirection: "column", marginTop: 26 }}>
                {TRACKS.slice(0, 5).map((t, i) => (
                  <div key={t.id} style={{ display: "flex", alignItems: "baseline", gap: 18, fontSize: 28, color: INK, padding: "9px 0", borderTop: `2px solid ${RULE}` }}>
                    <span style={{ color: DUSK, width: 34 }}>{String(i + 1).padStart(2, "0")}</span>
                    <span>{t.title}</span>
                    <span style={{ fontSize: 20, color: INK_2 }}>{[t.key, t.bpm ? `${t.bpm} bpm` : ""].filter(Boolean).join(" · ")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
