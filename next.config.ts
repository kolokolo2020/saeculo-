import type { NextConfig } from "next";
import path from "path";
import { SITE_URL } from "./src/lib/siteUrl";

const nextConfig: NextConfig = {
  // Every corner of the viewport is desktop chrome (start orb, tray, icons,
  // clock gadget), so the dev-mode route badge would always sit on top of —
  // and eat clicks meant for — something. Compile/runtime errors still show.
  devIndicators: false,
  turbopack: {
    root: path.join(__dirname),
  },
  // the album cover is served resized; its grain needs quality 90
  images: {
    qualities: [90],
  },
  // The site lives at www.saeculobeats.com: the old vercel.app address sends
  // visitors (and search engines) there for good. Preview deployments have
  // their own addresses and are left alone.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "saeculo\\.vercel\\.app" }],
        destination: `${SITE_URL}/:path*`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
