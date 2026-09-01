import type { MetadataRoute } from "next";
import { PROFILE } from "@/data/profile";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${PROFILE.artistName} — ${PROFILE.tagline}`,
    short_name: PROFILE.artistName,
    description:
      "saeculo makes instrumentals for late-night drives and old video game menus. Listen to the beats, build a loop, test your ear.",
    start_url: "/",
    display: "standalone",
    background_color: "#0e0d12",
    theme_color: "#0e0d12",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
