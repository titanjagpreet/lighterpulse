import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DepthChart } from "@/components/terminal/depth-chart";
import { FundingHistory } from "@/components/terminal/funding-history";
import { MarketChart } from "@/components/terminal/market-chart";
import { MarketHeader } from "@/components/terminal/market-header";
import { TradeTape } from "@/components/terminal/trade-tape";
import { WatchStar } from "@/components/terminal/watchlist";
import { LighterLink } from "@/components/terminal/lighter-link";
import {
  AsOf,
  Chip,
  Figure,
  SectionHeader,
} from "@/components/terminal/primitives";
import { getFundingRates, getMarkets } from "@/lib/lighter/markets";
import { getOiLatest, getOiSeries } from "@/lib/lighter/open-interest";
import { OTHER_VENUES, VENUE_LABEL } from "@/lib/funding-board";
import { ASSET_CLASS_LABEL, type Market } from "@/lib/lighter/types";
import { ratePct } from "@/lib/format";
import { cn } from "@/lib/utils";

export const revalidate = 60;
// Every market resolves; the busiest are built ahead of time.
export const dynamicParams = true;

/**
 * One page per market.
 *
 * The server renders only what it already caches for the whole exchange —
 * the book summary and cross-venue funding — so 233 pages cost no more
 * upstream calls than one. Price history, funding history, the live book and
 * the tape load in the visitor's browser, on their own rate limit.
 */

/**
 * Exact symbol first, then case-insensitive. Casing is normalised to the
 * canonical URL by middleware; matching loosely here means a future symbol
 * with lower-case letters still resolves instead of 404ing, and the metadata
 * below names its exact form as canonical.
 */
async function findMarket(
  symbol: string,
): Promise<{ market: Market | null; asOf: string; ttl: number; source: string }> {
  const markets = await getMarkets();
  const wanted = decodeURIComponent(symbol);
  const market =
    markets.data.find((m) => m.symbol === wanted) ??
    markets.data.find((m) => m.symbol.toLowerCase() === wanted.toLowerCase()) ??
    null;
  return { market, asOf: markets.asOf, ttl: markets.ttl, source: markets.source };
}

export async function generateStaticParams() {
  const markets = await getMarkets().catch(() => null);
  return (markets?.data ?? [])
    .filter((m) => m.active)
    .slice(0, 60)
    .map((m) => ({ symbol: m.symbol }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}): Promise<Metadata> {
  const { symbol } = await params;
  const { market } = await findMarket(symbol).catch(() => ({ market: null }));
  if (!market) return { title: "Market not found" };
  const cls = ASSET_CLASS_LABEL[market.assetClass].toLowerCase();
  return {
    title: `${market.symbol} perpetual`,
    description: `${market.symbol} on Lighter — live mark price, open interest, funding against Binance, Bybit and Hyperliquid, order book depth and every trade. A ${cls} perpetual with up to ${market.maxLeverage}× leverage.`,
    alternates: { canonical: `/markets/${market.symbol}` },
  };
}

export default async function MarketPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const [found, ratesC, oiLatest] = await Promise.all([
    findMarket(symbol),
    getFundingRates().catch(() => null),
    getOiLatest().catch(() => null),
  ]);

  const m = found.market;
  if (!m) notFound();
  const oiSeries = await getOiSeries(m.marketId).catch(() => null);
  const oiNow = oiLatest?.markets[m.marketId] ?? null;

  const venueRates = new Map<string, number>();
  for (const r of ratesC?.data ?? []) {
    if (r.marketId === m.marketId) venueRates.set(r.exchange, r.rate);
  }
  const lighterRate = venueRates.get("lighter") ?? m.funding;

  return (
    <div>
      {/* ── identity ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-5 py-3">
        <nav aria-label="Breadcrumb" className="figure flex items-center gap-2 text-[11px] text-ink-3">
          <Link href="/markets" className="ctl -my-1.5 py-1.5 hover:text-ink">
            Markets
          </Link>
          <span className="text-ink-5">/</span>
        </nav>
        <h1 className="text-[20px] leading-none font-semibold tracking-[-0.02em]">{m.symbol}</h1>
        <WatchStar marketId={m.marketId} symbol={m.symbol} />
        <Chip>{ASSET_CLASS_LABEL[m.assetClass].toUpperCase()}</Chip>
        <Chip>PERP · MKT {m.marketId}</Chip>
        {!m.active && <Chip tone="warn">INACTIVE</Chip>}
        <div className="grow" />
        <AsOf asOf={found.asOf} ttl={found.ttl} source={found.source} />
        {/* nothing to trade on an inactive book */}
        {m.active && <LighterLink path={`/trade/${m.symbol}`}>Trade on Lighter</LighterLink>}
      </div>

      {!m.active && (
        <div className="border-b border-warn-dim bg-panel px-5 py-2.5 text-[12px] text-warn">
          Trading is not active on this market. Figures below are the last reported values.
        </div>
      )}

      <MarketHeader
        oi={oiNow ? { d24h: oiNow.d24h, regime: oiNow.regime } : null}
        market={{
          marketId: m.marketId,
          symbol: m.symbol,
          markPrice: m.markPrice,
          indexPrice: m.indexPrice,
          change24h: m.change24h,
          oiUsd: m.oiUsd,
          volume24h: m.volume24h,
          trades24h: m.trades24h,
          dayLow: m.dayLow,
          dayHigh: m.dayHigh,
          funding: m.funding,
          maxLeverage: m.maxLeverage,
          maintenanceMarginFraction: m.maintenanceMarginFraction,
        }}
      />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_384px]">
        <div className="min-w-0 border-line lg:border-r">
          <div className="border-b border-line p-5">
            <MarketChart marketId={m.marketId} oi={oiSeries} />
          </div>
          <div className="grid xl:grid-cols-2">
            <div className="min-w-0 border-b border-line p-5 xl:border-r">
              <FundingHistory marketId={m.marketId} />
            </div>
            <div className="min-w-0 border-b border-line p-5">
              <DepthChart marketId={m.marketId} />
            </div>
          </div>
        </div>

        <aside className="bg-rail">
          <div className="border-b border-line p-5">
            <SectionHeader title="Funding elsewhere" note="8h basis">
              <Link href="/funding" className="figure ctl -my-1.5 py-1.5 text-[11px] text-ink-3 hover:text-ink">
                All markets →
              </Link>
            </SectionHeader>
            <VenueRow label="Lighter" rate={lighterRate ?? null} strong />
            {OTHER_VENUES.map((v) => {
              const rate = venueRates.get(v) ?? null;
              const spread = rate != null && lighterRate != null ? lighterRate - rate : null;
              return (
                <VenueRow
                  key={v}
                  label={VENUE_LABEL[v]}
                  rate={rate}
                  note={spread != null ? `${spread >= 0 ? "Lighter +" : "Lighter −"}${ratePct(Math.abs(spread)).replace(/^[+−]/, "")}` : "not listed"}
                />
              );
            })}
          </div>
          <div className="p-5">
            <TradeTape marketId={m.marketId} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function VenueRow({
  label,
  rate,
  note,
  strong,
}: {
  label: string;
  rate: number | null;
  note?: string;
  strong?: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 border-t border-hair py-2">
      <span className={cn("text-[12px]", strong ? "font-medium text-ink" : "text-ink-2")}>{label}</span>
      <Figure
        className={cn(
          "text-right text-[12px]",
          rate == null ? "text-ink-5" : rate >= 0 ? "text-up" : "text-down",
          strong && "font-medium",
        )}
      >
        {rate != null ? ratePct(rate) : "—"}
      </Figure>
      {note && <span className="figure col-span-2 text-[9.5px] text-ink-4">{note}</span>}
    </div>
  );
}
