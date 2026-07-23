import type { SocialLink } from "@/lib/types";

// PLACEHOLDER CONTENT — replace with your real bio and links.
export const PROFILE = {
  artistName: "saeculo",
  tagline: "instrumentals & beats",
  bio: [
    "saeculo is a producer making instrumentals that live somewhere between late-night drives and old video game menus.",
    "Every beat starts as a small loop and grows until it feels like a place you can stay in for a while. Influences range from boom bap and trap to chiptune, ambient, and film scores.",
    "This site is my desktop — poke around, open things, play the beats. If something loops in your head afterward, it worked.",
  ],
  bookingEmail: "booking@example.com",
  socials: [
    { label: "Spotify", url: "https://open.spotify.com/", handle: "saeculo" },
    { label: "SoundCloud", url: "https://soundcloud.com/", handle: "saeculo" },
    { label: "YouTube", url: "https://youtube.com/", handle: "@saeculo" },
    { label: "Instagram", url: "https://instagram.com/", handle: "@saeculo" },
  ] satisfies SocialLink[],
};
