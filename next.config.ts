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
   * Pages rendered per request — the leaderboard, wallets, vaults, explorer
   * detail — stream their title, description and canonical into <body> for
   * any client Next expects to run JavaScript, Googlebot included. Google only
   * honours a canonical in <head>, so these crawlers get blocking metadata.
   * Setting this replaces Next's default list, which is kept in full first.
   */
  htmlLimitedBots: new RegExp(
    [
      // Next's default (next/dist/shared/lib/router/utils/html-bots)
      "[\\w-]+-Google|Google-[\\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight",
      "Googlebot",
      // AI search crawlers, which read the HTML without running it
      "OAI-SearchBot|ChatGPT-User|GPTBot|PerplexityBot|ClaudeBot|Claude-SearchBot|Claude-User",
    ].join("|"),
    "i",
  ),

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
