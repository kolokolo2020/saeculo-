import type { SocialLink } from "@/lib/types";

// Everything here is real and shown on the site. Change it here.
export const PROFILE = {
  artistName: "saeculo",
  tagline: "instrumentals & beats",
  bookingEmail: "saeculo888@gmail.com",
  socials: [
    { label: "Spotify", url: "https://open.spotify.com/artist/20rwZAautzWKkxjkYA9sfg", handle: "saeculo" },
    { label: "SoundCloud", url: "https://soundcloud.com/saeculo", handle: "saeculo" },
    { label: "YouTube", url: "https://www.youtube.com/@saeculo", handle: "@saeculo" },
    { label: "Instagram", url: "https://www.instagram.com/saeculo/", handle: "@saeculo" },
    { label: "Linktree", url: "https://linktr.ee/saeculo", handle: "linktr.ee/saeculo" },
  ] satisfies SocialLink[],
  /**
   * One YouTube video to feature in Socials, as its 11-character id (the
   * part after `watch?v=`). It loads only when a visitor clicks it.
   * null = no video section.
   */
  featuredVideo: null as { id: string; title: string } | null,
};
