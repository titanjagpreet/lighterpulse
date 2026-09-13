import type { Metadata } from "next";
import {
  MarketsTable,
  type TableMarket,
} from "@/components/terminal/markets-table";
import { FundingClock } from "@/components/terminal/funding-clock";
import { IntentLink } from "@/components/terminal/intent-link";
import { Movers } from "@/components/terminal/movers";
import {
  AsOf,
  Figure,
  Label,
  MagnitudeBar,
} from "@/components/terminal/primitives";
import { getMarkets, summarise } from "@/lib/lighter/markets";
import { getPriceCharts } from "@/lib/lighter/charts";
import { getOiLatest } from "@/lib/lighter/open-interest";
import { ASSET_CLASS_LABEL } from "@/lib/lighter/types";
import { num, usdCompact } from "@/lib/format";

export const revalidate = 15;

export const metadata: Metadata = {
  title: "Markets",
  description:
    "Every Lighter market — open interest, mark against index, day range, funding and max leverage, with the day's biggest movers. Crypto, equities, indices, commodities and FX.",
  alternates: { canonical: "/markets" },
};

export default async function MarketsPage() {
  const [cached, sparks, oiLatest] = await Promise.all([
    getMarkets(),
    getPriceCharts().catch(() => null),
    getOiLatest().catch(() => null),
  ]);
  const markets = cached.data;
  const s = summarise(markets);

  // The table ships twice — as HTML and again as the data behind it — so it
  // gets only the fields it draws, rounded to what it can show.
  const tableRows: TableMarket[] = markets.map((m) => ({
    marketId: m.marketId,
    symbol: m.symbol,
    assetClass: m.assetClass,
    active: m.active,
    icon: m.icon,
    markPrice: m.markPrice,
    change24h: m.change24h,
    oiUsd: Math.round(m.oiUsd),
    volume24h: Math.round(m.volume24h),
    trades24h: m.trades24h,
    dayLow: m.dayLow,
    dayHigh: m.dayHigh,
    rangePos: m.rangePos == null ? null : Math.round(m.rangePos * 1000) / 1000,
    funding: m.funding == null ? null : Math.round(m.funding * 1e8) / 1e8,
    maxLeverage: m.maxLeverage,
  }));
  // A 20px-tall line cannot show more than five significant figures.
  const trends: Record<number, number[]> = {};
  for (const [id, closes] of Object.entries(sparks?.data ?? {})) {
    trends[Number(id)] = closes.map((v) => Number(v.toPrecision(5)));
  }
  const oiChanges: Record<number, number | null> = {};
  for (const [id, v] of Object.entries(oiLatest?.markets ?? {})) {
    oiChanges[Number(id)] = v.d24h == null ? null : Math.round(v.d24h * 100) / 100;
  }

  return (
    <div>
      <h1 className="sr-only">Lighter markets</h1>

      {/* ── summary band ───────────────────────────────────── */}
      <div className="grid border-b border-line bg-panel lg:grid-cols-[300px_minmax(0,1fr)_300px]">
        <div className="border-line px-5 py-4 lg:border-r">
          <Label className="mb-2.5">Volume 24h</Label>
          <Figure className="text-[28px] leading-none font-medium tracking-[-0.028em]">
            {usdCompact(s.totalVolume)}
          </Figure>
          <div className="figure mt-2 text-[10.5px] text-ink-3">
            {num(s.totalTrades)} trades
          </div>
        </div>

        <div className="border-line px-5 py-4 lg:border-r">
          <div className="mb-3 flex items-baseline">
            <Label>By asset class</Label>
            <div className="grow" />
            <span className="figure text-[10px] text-ink-3">
              {s.activeCount} of {s.count} active
            </span>
          </div>
          <div className="mb-2.5 flex h-2 gap-[1.5px]">
            {s.byClass.map((c, i) => (
              <div
                key={c.key}
                className={
                  [
                    "bg-brand",
                    "bg-info",
                    "bg-warn",
                    "bg-ink-3",
                    "bg-ink-4",
                    "bg-ink-5",
                  ][i] ?? "bg-ink-5"
                }
                style={{
                  width: `${(c.volume / (s.totalVolume || 1)) * 100}%`,
                  borderRadius:
                    i === 0
                      ? "2px 0 0 2px"
                      : i === s.byClass.length - 1
                        ? "0 2px 2px 0"
                        : undefined,
                }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            {s.byClass.map((c, i) => (
              <span key={c.key} className="flex items-center gap-1.5">
                <span
                  className={`size-[7px] rounded-[2px] ${
                    [
                      "bg-brand",
                      "bg-info",
                      "bg-warn",
                      "bg-ink-3",
                      "bg-ink-4",
                      "bg-ink-5",
                    ][i] ?? "bg-ink-5"
                  }`}
                  aria-hidden="true"
                />
                <span className="figure text-[10.5px] text-ink-2">
                  {ASSET_CLASS_LABEL[c.key]} {usdCompact(c.volume, 1)}
                </span>
              </span>
            ))}
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="mb-2.5 flex items-baseline gap-3">
            <Label>Next funding</Label>
            <span className="figure text-[10px] text-ink-4">settles hourly</span>
          </div>
          <FundingClock />
          <div className="mt-2">
            <AsOf asOf={cached.asOf} ttl={cached.ttl} source={cached.source} />
          </div>
        </div>
      </div>

      {/* ── movers ─────────────────────────────────────────── */}
      <Movers
        markets={markets.map((m) => ({
          marketId: m.marketId,
          symbol: m.symbol,
          markPrice: m.markPrice,
          change24h: m.change24h,
          volume24h: m.volume24h,
          active: m.active,
          icon: m.icon,
        }))}
      />

      {/* ── open interest distribution ─────────────────────── */}
      <div className="border-b border-line px-5 py-3.5">
        <div className="mb-2.5 flex items-baseline gap-3">
          <Label>Open interest</Label>
          <Figure className="text-[13px] font-medium">
            {usdCompact(s.totalOi)}
          </Figure>
          <span className="figure text-[10px] text-ink-4">
            both sides · top 12 markets
          </span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {markets.slice(0, 12).map((m) => (
            <IntentLink
              key={m.marketId}
              href={`/markets/${m.symbol}`}
              className="ctl -my-1 flex items-center gap-2 py-1 hover:text-ink"
            >
              <span className="text-[11.5px] font-medium">{m.symbol}</span>
              <MagnitudeBar
                value={m.oiUsd}
                max={markets[0]?.oiUsd ?? 1}
                width={44}
                height={3}
                align="left"
              />
              <Figure className="text-[10.5px] text-ink-3">
                {usdCompact(m.oiUsd, 1)}
              </Figure>
            </IntentLink>
          ))}
        </div>
      </div>

      <MarketsTable initial={tableRows} sparks={trends} oiChanges={oiChanges} />
    </div>
  );
}
