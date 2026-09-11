import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },

  /**
   * The revamp renamed several routes. These keep old links, bookmarks and
   * search results working instead of dropping them on a 404.
   */
  async redirects() {
    return [
      { source: "/dashboard/:address", destination: "/a/:address", permanent: true },
      { source: "/dashboard", destination: "/overview", permanent: true },
      { source: "/exchange-stats", destination: "/markets", permanent: true },
      { source: "/funding-comparison", destination: "/markets", permanent: true },
      { source: "/announcements", destination: "/overview", permanent: true },
      { source: "/support", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
