import type { MetadataRoute } from "next";

const BASE = "https://lighterpulse.xyz";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: BASE, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${BASE}/overview`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE}/markets`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE}/liquidations`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE}/leaderboard`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE}/lit`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE}/explorer`, lastModified: now, changeFrequency: "hourly", priority: 0.7 },
  ];
}
