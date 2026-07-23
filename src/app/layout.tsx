import type { Metadata, Viewport } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";

const pixelFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
});

const bodyFont = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-retro-body",
});

const title = "saeculo — instrumentals & beats";
const description =
  "The desktop of saeculo: an interactive retro OS where you can play instrumentals, watch the visualizer, and dig through the beats.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#008080",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${pixelFont.variable} ${bodyFont.variable} h-full`}>
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
