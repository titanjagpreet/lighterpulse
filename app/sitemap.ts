import type { MetadataRoute } from "next";
import { getMarkets } from "@/lib/lighter/markets";

const BASE = "https://lighterpulse.xyz";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${BASE}/overview`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE}/markets`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE}/funding`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE}/liquidations`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE}/leaderboard`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE}/lit`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE}/llp`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE}/explorer`, lastModified: now, changeFrequency: "hourly", priority: 0.7 },
  ];

  // One page per market. A failed fetch still yields the core sitemap.
  const markets = await getMarkets().catch(() => null);
  for (const m of markets?.data ?? []) {
    if (!m.active) continue;
    pages.push({
      url: `${BASE}/markets/${m.symbol}`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.6,
    });
  }
  return pages;
}
