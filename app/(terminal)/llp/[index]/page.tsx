import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PoolLoader } from "@/components/terminal/pool-view";
import { getPublicPools } from "@/lib/lighter/pools";

/**
 * A public pool. The cached pool list gives the header; the account itself —
 * share-price history and book — loads in the visitor's browser.
 */

export const revalidate = 600;

async function findPool(index: string) {
  const pools = await getPublicPools().catch(() => null);
  return pools?.data.find((p) => String(p.index) === index) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ index: string }>;
}): Promise<Metadata> {
  const { index } = await params;
  const pool = await findPool(index);
  const name = pool?.name ?? `Pool #${index}`;
  return {
    title: `${name} — public pool`,
    description: `Share-price returns, drawdowns, a deposit backtest and the open positions of ${name}, a public pool on Lighter.`,
    robots: { index: false, follow: true },
  };
}

export default async function PoolPage({
  params,
}: {
  params: Promise<{ index: string }>;
}) {
  const { index } = await params;
  if (!/^\d{1,16}$/.test(index)) notFound();
  const meta = await findPool(index);
  return <PoolLoader index={Number(index)} meta={meta} />;
}
