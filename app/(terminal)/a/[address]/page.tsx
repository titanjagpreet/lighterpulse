import type { Metadata } from "next";
import { AddressDashboard } from "@/components/terminal/address-dashboard";
import { getMarketNames, getMarkets } from "@/lib/lighter/markets";
import { addr } from "@/lib/format";

/**
 * Per-address data is Class C: unique per visitor and pointless to cache, so
 * it is fetched in the browser on the visitor's own IP quota rather than ours.
 *
 * What *is* worth sending down is shared and cached: each market's maintenance
 * margin fraction, which lets the client derive a liquidation price when the
 * API reports none, and market names — account history refers to markets, spot
 * books included, by id alone.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ address: string }>;
}): Promise<Metadata> {
  const { address } = await params;
  const short = addr(decodeURIComponent(address), 8, 6);
  return {
    title: `${short} — account`,
    description: `Live positions, holdings, activity, funding cost and distance to liquidation for ${short} on Lighter.`,
    robots: { index: false, follow: true },
  };
}

export default async function AddressPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;

  const [markets, names] = await Promise.all([
    getMarkets().catch(() => null),
    getMarketNames().catch(() => null),
  ]);
  const maintenanceMargins: Record<number, number> = {};
  const marketNames: Record<number, string> = { ...(names?.data ?? {}) };
  for (const m of markets?.data ?? []) {
    maintenanceMargins[m.marketId] = m.maintenanceMarginFraction;
    marketNames[m.marketId] ??= m.symbol;
  }

  return (
    <AddressDashboard
      query={decodeURIComponent(address)}
      maintenanceMargins={maintenanceMargins}
      marketNames={marketNames}
    />
  );
}
