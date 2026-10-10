import type { MetadataRoute } from "next";
import { PROFILE } from "@/data/profile";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${PROFILE.artistName} — ${PROFILE.tagline}`,
    short_name: PROFILE.artistName,
    description: "Instrumentals by saeculo.",
    start_url: "/",
    display: "standalone",
    background_color: "#cfc8b9",
    theme_color: "#f3eee4",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
