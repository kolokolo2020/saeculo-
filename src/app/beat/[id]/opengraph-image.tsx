import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PROFILE } from "@/data/profile";
import { ALBUM, TRACKS } from "@/data/tracks";

// The share card for one beat: the album cover and that beat's title in a
// window on the desktop's paper, drawn at build time (one PNG per beat).
export const alt = `${PROFILE.artistName}: a beat, with the album cover`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The page's generateStaticParams does not reach this file: it is its own
// route (/beat/<id>/opengraph-image). Without these two exports it would be
// rendered on demand by a function, and for any id at all.
export const dynamicParams = false;
export function generateStaticParams() {
  return TRACKS.map((t) => ({ id: t.id }));
}

const INK = "#1c1a17";
const INK_2 = "#6b6357";
const LINE = "#2a2622";
const DUSK = "#3d5a8a";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const index = TRACKS.findIndex((t) => t.id === id);
  if (index < 0) notFound();
  const track = TRACKS[index];
  const cover = `data:image/jpeg;base64,${(await readFile(join(process.cwd(), "public", ALBUM.coverJpg))).toString("base64")}`;
  const facts = [track.key, track.bpm ? `${track.bpm} bpm` : ""].filter(Boolean).join(" · ");
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#cfc8b9", fontFamily: "sans-serif" }}>
        <div style={{ width: 1080, height: 530, display: "flex", flexDirection: "column", background: "#fbf8f2", border: `2px solid ${LINE}`, borderRadius: 18, boxShadow: "0 24px 60px rgba(42,32,18,0.3)", overflow: "hidden" }}>
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
              <div style={{ fontSize: 20, letterSpacing: 5, color: INK_2, textTransform: "uppercase" }}>
                {`${PROFILE.artistName} · ${String(index + 1).padStart(2, "0")}/${TRACKS.length}`}
              </div>
              <div style={{ fontSize: 76, color: INK, marginTop: 6, fontWeight: 300 }}>{track.title}</div>
              {facts && <div style={{ fontSize: 30, color: DUSK, marginTop: 8 }}>{facts}</div>}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
