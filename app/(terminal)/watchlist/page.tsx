import type { Metadata } from "next";
import { WatchlistBoard } from "@/components/terminal/watchlist-board";
import { getMarkets } from "@/lib/lighter/markets";

/**
 * The watchlist itself lives in the visitor's browser; the server only sends
 * the market list, so a starred market has a price before the stream connects.
 */

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Watchlist",
  description: "Markets and accounts you follow on Lighter, saved in this browser.",
  alternates: { canonical: "/watchlist" },
  robots: { index: false, follow: true },
};

export default async function WatchlistPage() {
  const markets = await getMarkets().catch(() => null);
  return (
    <WatchlistBoard
      markets={(markets?.data ?? []).map((m) => ({
        marketId: m.marketId,
        symbol: m.symbol,
        markPrice: m.markPrice,
        change24h: m.change24h,
        volume24h: m.volume24h,
        oiUsd: m.oiUsd,
        funding: m.funding,
        icon: m.icon,
      }))}
    />
  );
}
