import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, VT323 } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PROFILE } from "@/data/profile";
import { ALBUM, TRACKS } from "@/data/tracks";
import "./globals.css";

// Tahoma leads --font-ui (see globals.css) for the old-Windows feel where
// it's installed; Plex Sans is the loaded stand-in everywhere else.
const uiFont = IBM_Plex_Sans({ weight: ["300", "400", "500", "700"], subsets: ["latin"], variable: "--nf-ui" });
const monoFont = IBM_Plex_Mono({ weight: ["400", "500"], subsets: ["latin"], variable: "--nf-mono" });
// the boot screen, the player's display and the game's text
const lcdFont = VT323({ weight: "400", subsets: ["latin"], variable: "--nf-lcd" });

const title = "saeculo — instrumentals & beats";
const description = "Instrumentals by saeculo. Listen to the beats, find the socials, get in touch, or walk around the neighbourhood and make a beat.";
const siteUrl = "https://saeculo.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: { title, description, url: siteUrl, siteName: PROFILE.artistName, type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "MusicGroup",
  name: PROFILE.artistName,
  url: siteUrl,
  description,
  email: PROFILE.bookingEmail,
  sameAs: PROFILE.socials.map((social) => social.url),
  track: TRACKS.map((t) => ({
    "@type": "MusicRecording",
    name: t.title,
    url: `${siteUrl}/#track=${t.id}`,
    byArtist: { "@type": "MusicGroup", name: PROFILE.artistName },
    inAlbum: { "@type": "MusicAlbum", name: ALBUM.title },
    image: `${siteUrl}${ALBUM.coverJpg}`,
  })),
};

// Runs before first paint: returning visitors and share links skip the
// intro, and the visitor's "calm visuals" choice applies immediately.
const bootScript = `try{var s=localStorage;if(s.getItem("saeculo-intro-seen")==="1"||/track=/.test(location.hash))document.documentElement.dataset.intro="skip";if(s.getItem("saeculo-calm")==="1")document.documentElement.dataset.calm="true"}catch(e){}`;

export const viewport: Viewport = {
  themeColor: "#0c0d0d",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${uiFont.variable} ${monoFont.variable} ${lcdFont.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body className="h-full overflow-hidden">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
