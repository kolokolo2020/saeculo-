import type { SocialLink } from "@/lib/types";

// PLACEHOLDER CONTENT — replace with your real bio and links.
export const PROFILE = {
  artistName: "saeculo",
  tagline: "instrumentals & beats",
  bio: [
    "saeculo is a producer making instrumentals that live somewhere between late-night drives and old video game menus.",
    "Every beat starts as a small loop and grows until it feels like a place you can stay in for a while. Influences range from boom bap and trap to chiptune, ambient, and film scores.",
    "Poke around the desktop, open the beat maker, press play. If something loops in your head afterward, it worked.",
  ],
  bookingEmail: "booking@example.com",
  socials: [
    { label: "Spotify", url: "https://open.spotify.com/", handle: "saeculo" },
    { label: "SoundCloud", url: "https://soundcloud.com/", handle: "saeculo" },
    { label: "YouTube", url: "https://youtube.com/", handle: "@saeculo" },
    { label: "Instagram", url: "https://instagram.com/", handle: "@saeculo" },
  ] satisfies SocialLink[],
  /**
   * PLACEHOLDER — the next drop, shown as a "Downloading next_single.exe"
   * countdown. The bar fills from `announced` to `date`; once `date` passes
   * it flips to "Download complete" with a button to `url` (if set).
   * Set to null to hide the countdown.
   */
  nextRelease: {
    title: "untitled single",
    announced: "2026-09-20T18:00:00+02:00",
    date: "2026-11-13T18:00:00+01:00",
    url: "",
  } as { title: string; announced: string; date: string; url: string } | null,
};
