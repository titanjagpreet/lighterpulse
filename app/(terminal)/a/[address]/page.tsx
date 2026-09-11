import type { Metadata } from "next";
import { AddressDashboard } from "@/components/terminal/address-dashboard";
import { getMarkets } from "@/lib/lighter/markets";
import { addr } from "@/lib/format";

/**
 * Per-address data is Class C: unique per visitor and pointless to cache, so
 * it is fetched in the browser on the visitor's own IP quota rather than ours.
 *
 * The one thing that *is* worth sending down is each market's maintenance
 * margin fraction — it is shared, cached, and lets the client derive a
 * liquidation price when the API reports none.
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
    description: `Live positions, collateral, funding cost and distance to liquidation for ${short} on Lighter.`,
    robots: { index: false, follow: true },
  };
}

export default async function AddressPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;

  const markets = await getMarkets().catch(() => null);
  const maintenanceMargins: Record<number, number> = {};
  for (const m of markets?.data ?? []) {
    maintenanceMargins[m.marketId] = m.maintenanceMarginFraction;
  }

  return (
    <AddressDashboard
      query={decodeURIComponent(address)}
      maintenanceMargins={maintenanceMargins}
    />
  );
}
