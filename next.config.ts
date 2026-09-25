import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Every corner of the viewport is desktop chrome (start orb, tray, icons,
  // clock gadget), so the dev-mode route badge would always sit on top of —
  // and eat clicks meant for — something. Compile/runtime errors still show.
  devIndicators: false,
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
