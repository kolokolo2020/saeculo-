import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Manrope, VT323 } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PROFILE } from "@/data/profile";
import "./globals.css";

const displayFont = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

const monoFont = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
});

// The camcorder HUD readout — REC indicator, tape counter, corner labels —
// gets its own genuine CRT-terminal face, used nowhere else on the page.
const readoutFont = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-readout",
});

const title = "saeculo — instrumentals & beats";
const description =
  "The desktop of saeculo: a bootleg retro OS where you can play instrumentals, build a loop in the beat maker, and dig through the beats.";
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
};

export const viewport: Viewport = {
  themeColor: "#0b0c09",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} ${readoutFont.variable} h-full`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="h-full overflow-hidden">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
