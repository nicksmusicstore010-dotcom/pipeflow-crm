import type { MetadataRoute } from "next";

import { publicSiteUrl } from "@/lib/site-url-public";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = publicSiteUrl();
  return [
    { url: `${base}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/pricing`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/signup`, changeFrequency: "yearly", priority: 0.5 },
  ];
}
