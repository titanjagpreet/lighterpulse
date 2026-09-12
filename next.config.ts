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
