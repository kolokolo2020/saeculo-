import type { MetadataRoute } from "next";
import { TRACKS } from "@/data/tracks";
import { SITE_URL } from "@/lib/siteUrl";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    // each beat's own page (/beat/<id>)
    ...TRACKS.map((t) => ({
      url: `${SITE_URL}/beat/${t.id}`,
      ...(t.added && { lastModified: t.added }),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
