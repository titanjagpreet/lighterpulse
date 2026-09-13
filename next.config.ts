import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },

  /**
   * How long a CDN may keep serving a page past its revalidate window while a
   * fresh copy regenerates. Next's default is a year — for a live terminal
   * that lets a quiet page be served hours old. An hour is the ceiling.
   */
  expireTime: 60 * 60,

  /**
   * Token icons come from Lighter's CDN as full-size PNGs — some near 1 MB —
   * drawn at 16px. Through the image optimiser each is a WebP of about a
   * kilobyte. They rarely change, so a month's cache keeps re-optimising, and
   * Vercel's image quota, negligible.
   */
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.lighter.xyz", pathname: "/fe/token/**" },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },

  /**
   * The revamp renamed several routes. These keep old links, bookmarks and
   * search results working instead of dropping them on a 404.
   */
  async redirects() {
    return [
      { source: "/dashboard/:address", destination: "/a/:address", permanent: true },
      { source: "/dashboard", destination: "/overview", permanent: true },
      { source: "/exchange-stats", destination: "/markets", permanent: true },
      { source: "/funding-comparison", destination: "/funding", permanent: true },
      { source: "/announcements", destination: "/overview", permanent: true },
      { source: "/support", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
