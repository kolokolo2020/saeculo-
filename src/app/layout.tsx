import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Open_Sans, Press_Start_2P } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PROFILE } from "@/data/profile";
import { TRACKS } from "@/data/tracks";
import "./globals.css";

// Segoe UI is the real Vista face, but it can't be served from Google
// Fonts — it's listed first in --font-ui (see globals.css) so Windows
// visitors get it, and Open Sans is the loaded stand-in everywhere else.
const uiFont = Open_Sans({
  subsets: ["latin"],
  variable: "--nf-ui",
});

// Consolas stand-in for Notepad and numeric readouts.
const monoFont = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--nf-mono",
});

// Arcade scoreboards inside the games only — the OS chrome stays Segoe.
const pixelFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--nf-pixel",
});

const title = "saeculo — instrumentals & beats";
const description =
  "The desktop of saeculo: a glassy mid-2000s desktop where you can play the instrumentals, build a loop in the groovebox, and play Beat Deck, a card game where every hand is a beat.";
const siteUrl = "https://saeculo.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName: PROFILE.artistName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
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
    ...(t.cover ? { image: `${siteUrl}${t.cover}` } : {}),
  })),
};

export const viewport: Viewport = {
  themeColor: "#0b2a5b",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${uiFont.variable} ${monoFont.variable} ${pixelFont.variable} h-full`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="h-full overflow-clip">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
