import type { MetadataRoute } from "next";

import { publicSiteUrl } from "@/lib/site-url-public";

/** Only the public pages are worth indexing; everything else needs a login. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/$", "/pricing", "/login", "/signup"], disallow: "/" },
    sitemap: `${publicSiteUrl()}/sitemap.xml`,
  };
}
