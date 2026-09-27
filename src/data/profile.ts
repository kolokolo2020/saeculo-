import type { SocialLink } from "@/lib/types";

// The bio is a neutral PLACEHOLDER until saeculo writes one; the email and
// links are real.
export const PROFILE = {
  artistName: "saeculo",
  tagline: "instrumentals & beats",
  bio: [
    "saeculo makes instrumentals.",
    "This desktop is where they live. Press play, build a loop in the Beat Maker, and see how far you get in Beat Deck.",
    "Bookings, collabs and licensing: open Contact.",
  ],
  bookingEmail: "saeculo888@gmail.com",
  socials: [
    { label: "Spotify", url: "https://open.spotify.com/artist/20rwZAautzWKkxjkYA9sfg", handle: "saeculo" },
    { label: "SoundCloud", url: "https://soundcloud.com/saeculo", handle: "saeculo" },
    { label: "YouTube", url: "https://www.youtube.com/@saeculo", handle: "@saeculo" },
    { label: "Instagram", url: "https://www.instagram.com/saeculo/", handle: "@saeculo" },
    { label: "Linktree", url: "https://linktr.ee/saeculo", handle: "linktr.ee/saeculo" },
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
