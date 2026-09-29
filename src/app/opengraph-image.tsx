import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PROFILE } from "@/data/profile";
import { TRACKS } from "@/data/tracks";

// The preview card when the link is shared: the real covers on the dark
// desktop, in an old window, drawn at build time.
export const alt = `${PROFILE.artistName}: instrumentals & beats`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const covers = (
    await Promise.all(
      TRACKS.slice(0, 3).map(async (t) => {
        if (!t.cover) return null;
        const data = await readFile(join(process.cwd(), "public", t.cover));
        const type = t.cover.endsWith(".png") ? "png" : "jpeg";
        return { title: t.title, src: `data:image/${type};base64,${data.toString("base64")}` };
      }),
    )
  ).filter((c): c is { title: string; src: string } => c !== null);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0c0d0d", fontFamily: "sans-serif" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: 5,
            background: "#c9c2b3",
            boxShadow: "inset -2px -2px 0 #2b2824, inset 2px 2px 0 #efe9dc",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", height: 44, padding: "0 16px", color: "#fff", fontSize: 24, fontWeight: 700, background: "linear-gradient(90deg, #4a120d, #6e1f18 45%, #a4452f)" }}>
            {`C:\\music\\beats`}
          </div>
          <div style={{ display: "flex", gap: 22, padding: 26, background: "#171615" }}>
            {covers.map((c) => (
              <div key={c.title} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <img src={c.src} width={300} height={300} alt="" style={{ objectFit: "cover" }} />
                <div style={{ color: "#f2b45a", fontSize: 28, fontFamily: "monospace" }}>{c.title}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", fontSize: 24, color: "#1c1a17" }}>
            <span>{PROFILE.artistName}</span>
            <span style={{ color: "#5d574c" }}>{PROFILE.tagline}</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
