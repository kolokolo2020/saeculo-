import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PROFILE } from "@/data/profile";
import { ALBUM, TRACKS } from "@/data/tracks";

// The preview card when the link is shared: the album cover and the
// tracklist, on the player's night-blue glass, drawn at build time.
export const alt = `${PROFILE.artistName}: instrumentals & beats`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
          gap: 56,
          padding: "0 70px",
          background: "radial-gradient(ellipse at 25% 40%, #0d3a5c 0%, #050a18 55%, #04050c 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <img src={cover} width={470} height={470} alt="" style={{ borderRadius: 6, boxShadow: "0 0 0 2px rgba(255,255,255,0.25), 0 20px 60px rgba(0,0,0,0.6)" }} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontSize: 22, letterSpacing: 6, color: "#7fe0ff", textTransform: "uppercase" }}>album</div>
          <div style={{ fontSize: 76, color: "#fff", marginTop: 4 }}>{ALBUM.title}</div>
          <div style={{ fontSize: 26, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>{PROFILE.tagline}</div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 34, gap: 12 }}>
            {TRACKS.slice(0, 6).map((t, i) => (
              <div key={t.id} style={{ display: "flex", alignItems: "baseline", gap: 18, fontSize: 30, color: "#e6f3ff" }}>
                <span style={{ color: "#8f9cff", width: 34 }}>{String(i + 1).padStart(2, "0")}</span>
                <span>{t.title}</span>
                <span style={{ fontSize: 22, color: "rgba(230,243,255,0.45)" }}>{[t.key, t.bpm ? `${t.bpm} bpm` : ""].filter(Boolean).join(" · ")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
