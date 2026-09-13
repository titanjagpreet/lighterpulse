import { Fragment } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { DepthChart } from "@/components/terminal/depth-chart";
import { FundingHistory } from "@/components/terminal/funding-history";
import { IntentLink } from "@/components/terminal/intent-link";
import { MarketChart } from "@/components/terminal/market-chart";
import { MarketHeader } from "@/components/terminal/market-header";
import { TradeTape } from "@/components/terminal/trade-tape";
import { WatchStar } from "@/components/terminal/watchlist";
import { LighterLink } from "@/components/terminal/lighter-link";
import { TokenIcon } from "@/components/terminal/token-icon";
import {
  AsOf,
  Chip,
  Figure,
  Label,
  SectionHeader,
} from "@/components/terminal/primitives";
import { getFundingRates, getMarkets } from "@/lib/lighter/markets";
import { getOiLatest, getOiSeries } from "@/lib/lighter/open-interest";
import { OTHER_VENUES, VENUE_LABEL } from "@/lib/funding-board";
import {
  ASSET_CLASS_LABEL,
  type AssetClass,
  type Market,
} from "@/lib/lighter/types";
import { aprPct, num, ratePct, usdCompact } from "@/lib/format";
import { breadcrumbs } from "@/lib/site";
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
 *
 * The "About" section is written from the same cached data, so the page says
 * what the market is — and links to its neighbours — before any script runs.
 */

/** How each asset class reads in a sentence, article included. */
const CLASS_PHRASE: Record<AssetClass, string> = {
  crypto: "a crypto",
  equity: "an equity",
  index: "an index",
  commodity: "a commodity",
  fx: "an FX",
  bond: "a bond",
};

const listFormat = new Intl.ListFormat("en", { style: "long", type: "conjunction" });

/**
 * Exact symbol first, then case-insensitive. Casing is normalised to the
 * canonical URL by middleware; matching loosely here means a future symbol
 * with lower-case letters still resolves instead of 404ing, and the metadata
 * below names its exact form as canonical.
 */
async function findMarket(symbol: string): Promise<{
  market: Market | null;
  markets: Market[];
  asOf: string;
  ttl: number;
  source: string;
}> {
  const markets = await getMarkets();
  const wanted = decodeURIComponent(symbol);
  const market =
    markets.data.find((m) => m.symbol === wanted) ??
    markets.data.find((m) => m.symbol.toLowerCase() === wanted.toLowerCase()) ??
    null;
  return {
    market,
    markets: markets.data,
    asOf: markets.asOf,
    ttl: markets.ttl,
    source: markets.source,
  };
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
  const phrase = CLASS_PHRASE[market.assetClass];
  return {
    title: `${market.symbol} Perp on Lighter — Price, Funding Rate & OI`,
    description: `${market.symbol} perpetual on Lighter — live price, funding rate against Binance, Bybit and Hyperliquid, open interest, order book depth and every trade. ${phrase.charAt(0).toUpperCase()}${phrase.slice(1)} perp with up to ${market.maxLeverage}× leverage.`,
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

  /* ── about ── */
  const maintenance = (m.maintenanceMarginFraction / 100).toFixed(2);
  const specs: [string, string][] = [
    ["Market", `#${m.marketId}`],
    ["Asset class", ASSET_CLASS_LABEL[m.assetClass]],
    ["Max leverage", `${m.maxLeverage}×`],
    ["Maintenance margin", `${maintenance}%`],
    ["Funding", "Hourly"],
    ["Status", m.active ? "Active" : "Inactive"],
  ];

  const apr = aprPct(lighterRate ?? null);
  const listed = OTHER_VENUES.filter((v) => venueRates.has(v));
  const unlisted = OTHER_VENUES.filter((v) => !venueRates.has(v));
  const fundingNote =
    lighterRate == null
      ? null
      : [
          `Funding settles every hour. The current rate is ${ratePct(lighterRate)} per 8 hours${
            apr != null ? ` (${apr >= 0 ? "+" : "−"}${Math.abs(apr).toFixed(1)}% annualised)` : ""
          }, so ${lighterRate > 0 ? "longs pay shorts" : lighterRate < 0 ? "shorts pay longs" : "neither side pays"}.`,
          listed.length > 0 &&
            `On the same basis it is ${listFormat.format(
              listed.map((v) => `${ratePct(venueRates.get(v)!)} on ${VENUE_LABEL[v]}`),
            )}.`,
          unlisted.length > 0 &&
            `${listFormat.format(unlisted.map((v) => VENUE_LABEL[v]))} ${
              unlisted.length === 1 ? "does" : "do"
            } not list ${m.symbol}.`,
        ]
          .filter(Boolean)
          .join(" ");

  // Other books of the same kind, deepest first: where a reader goes next,
  // and how a crawler finds the rest of the markets.
  const related = found.markets
    .filter((x) => x.active && x.assetClass === m.assetClass && x.marketId !== m.marketId)
    .sort((a, b) => b.oiUsd - a.oiUsd)
    .slice(0, 8);

  return (
    <div>
      <JsonLd
        data={breadcrumbs([
          ["Markets", "/markets"],
          [m.symbol, `/markets/${m.symbol}`],
        ])}
      />

      {/* ── identity ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-5 py-3">
        <nav aria-label="Breadcrumb" className="figure flex items-center gap-2 text-[11px] text-ink-3">
          <IntentLink href="/markets" className="ctl -my-1.5 py-1.5 hover:text-ink">
            Markets
          </IntentLink>
          <span className="text-ink-5">/</span>
        </nav>
        <TokenIcon src={m.icon} symbol={m.symbol} size={22} />
        <h1 className="flex items-baseline gap-2 text-[20px] leading-none font-semibold tracking-[-0.02em]">
          {m.symbol}
          <span className="text-[13px] font-normal tracking-normal text-ink-3">
            perpetual on Lighter
          </span>
        </h1>
        <WatchStar marketId={m.marketId} symbol={m.symbol} />
        <Chip>{ASSET_CLASS_LABEL[m.assetClass].toUpperCase()}</Chip>
        <Chip>MKT {m.marketId}</Chip>
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

          {/* ── about ──────────────────────────────────────────── */}
          <section className="border-b border-line p-5">
            <SectionHeader title={`About the ${m.symbol} perpetual`} />
            <div className="grid gap-x-10 gap-y-5 xl:grid-cols-[minmax(0,1fr)_248px]">
              <div className="flex max-w-[72ch] flex-col gap-3 text-[12.5px] leading-relaxed text-ink-2">
                <p>
                  {m.symbol} is {CLASS_PHRASE[m.assetClass]} perpetual future on Lighter, traded
                  with up to {m.maxLeverage}× leverage and a maintenance margin of {maintenance}%
                  of position value.{" "}
                  {m.active
                    ? `Over the last 24 hours it traded ${usdCompact(m.volume24h, 1)} in ${num(m.trades24h)} trades, with ${usdCompact(m.oiUsd, 1)} of open interest across both sides.`
                    : "Trading is not active; the figures on this page are the last reported values."}
                </p>
                {fundingNote && <p>{fundingNote}</p>}
              </div>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 self-start text-[12px]">
                {specs.map(([term, value]) => (
                  <Fragment key={term}>
                    <dt className="border-t border-hair py-1.5 text-ink-3">{term}</dt>
                    <dd className="figure border-t border-hair py-1.5 text-right">{value}</dd>
                  </Fragment>
                ))}
              </dl>
            </div>
            {related.length > 0 && (
              <nav
                aria-label={`Other ${ASSET_CLASS_LABEL[m.assetClass]} markets`}
                className="mt-5 flex flex-wrap items-center gap-2 border-t border-hair pt-4"
              >
                <Label className="mr-1.5">Other {ASSET_CLASS_LABEL[m.assetClass]} markets</Label>
                {related.map((x) => (
                  <IntentLink
                    key={x.marketId}
                    href={`/markets/${x.symbol}`}
                    className="figure ctl rounded-[3px] border border-edge px-2 py-1 text-[11px] text-ink-2 hover:border-ink-4 hover:text-ink"
                  >
                    {x.symbol}
                  </IntentLink>
                ))}
              </nav>
            )}
          </section>
        </div>

        <aside className="bg-rail">
          <div className="border-b border-line p-5">
            <SectionHeader title="Funding elsewhere" note="8h basis">
              <IntentLink href="/funding" className="figure ctl -my-1.5 py-1.5 text-[11px] text-ink-3 hover:text-ink">
                All markets →
              </IntentLink>
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
