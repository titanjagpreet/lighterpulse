import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Wallet pages are not blocked: they carry `noindex`, and a crawler has
      // to fetch a page to read that. Blocking them only let their URLs be
      // indexed bare, from the links on the leaderboard.
      disallow: ["/api/"],
    },
    sitemap: siteUrl("/sitemap.xml"),
  };
}
