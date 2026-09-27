import type { MetadataRoute } from "next";
import { PROFILE } from "@/data/profile";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${PROFILE.artistName} — ${PROFILE.tagline}`,
    short_name: PROFILE.artistName,
    description:
      "saeculo makes instrumentals for late-night drives and old video game menus. Listen to the beats, build a loop, play Beat Deck.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b2a5b",
    theme_color: "#0b2a5b",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
