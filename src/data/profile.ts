import type { SocialLink } from "@/lib/types";

// Everything here is real and shown on the site. Change it here.
export const PROFILE = {
  artistName: "saeculo",
  tagline: "instrumentals & beats",
  bookingEmail: "saeculo888@gmail.com",
  socials: [
    { label: "Instagram", url: "https://www.instagram.com/saeculo/", handle: "@saeculo" },
    { label: "YouTube", url: "https://www.youtube.com/@saeculo", handle: "@saeculo" },
    { label: "YouTube Music", url: "https://music.youtube.com/channel/UCkgqDWFGKKeNR9NPca4Yrlg?si=BcQ4l9shjKIGHkN7", handle: "saeculo" },
    { label: "Spotify", url: "https://open.spotify.com/artist/20rwZAautzWKkxjkYA9sfg", handle: "saeculo" },
    { label: "SoundCloud", url: "https://soundcloud.com/saeculo", handle: "saeculo" },
    { label: "Apple Music", url: "https://music.apple.com/de/artist/saeculo/1636915474", handle: "saeculo" },
    { label: "Amazon Music", url: "https://amazon.de/music/player/artists/B0B7S87TBV/saeculo?marketplaceId=A1PA6795UKMFR9&musicTerritory=DE&ref=dm_sh_TAakbyMK0PjK16QakniFTDMcy", handle: "saeculo" },
    { label: "TIDAL", url: "https://tidal.com/artist/33455199", handle: "saeculo" },
  ] satisfies SocialLink[],
  /**
   * One YouTube video to feature in Socials, as its 11-character id (the
   * part after `watch?v=`). It loads only when a visitor clicks it.
   * null = no video section.
   */
  featuredVideo: null as { id: string; title: string } | null,
};
