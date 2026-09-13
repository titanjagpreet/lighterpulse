import type { MetadataRoute } from "next";
import { getMarkets } from "@/lib/lighter/markets";
import { siteUrl } from "@/lib/site";

export const revalidate = 3600;

/**
 * No `lastModified`: every page here changes by the second, and a date that
 * always reads "now" only teaches search engines to ignore the field.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: siteUrl("/"), changeFrequency: "hourly", priority: 1 },
    { url: siteUrl("/overview"), changeFrequency: "hourly", priority: 0.9 },
    { url: siteUrl("/markets"), changeFrequency: "hourly", priority: 0.9 },
    { url: siteUrl("/funding"), changeFrequency: "hourly", priority: 0.8 },
    { url: siteUrl("/liquidations"), changeFrequency: "hourly", priority: 0.8 },
    { url: siteUrl("/leaderboard"), changeFrequency: "hourly", priority: 0.8 },
    { url: siteUrl("/lit"), changeFrequency: "hourly", priority: 0.8 },
    { url: siteUrl("/llp"), changeFrequency: "hourly", priority: 0.8 },
    { url: siteUrl("/explorer"), changeFrequency: "hourly", priority: 0.7 },
  ];

  // One page per market. A failed fetch still yields the core sitemap.
  const markets = await getMarkets().catch(() => null);
  for (const m of markets?.data ?? []) {
    if (!m.active) continue;
    pages.push({
      url: siteUrl(`/markets/${m.symbol}`),
      changeFrequency: "hourly",
      priority: 0.6,
    });
  }
  return pages;
}
