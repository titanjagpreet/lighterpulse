import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Per-address pages are unique per visitor and endless — no value in
      // having them crawled, and they would dilute the pages that matter.
      disallow: ["/api/", "/a/"],
    },
    sitemap: "https://lighterpulse.xyz/sitemap.xml",
  };
}
