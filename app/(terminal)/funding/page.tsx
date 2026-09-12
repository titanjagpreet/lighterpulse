import Link from "next/link";
import type { Metadata } from "next";
import { FundingClock } from "@/components/terminal/funding-clock";
import { FundingTable } from "@/components/terminal/funding-table";
import {
  AsOf,
  Figure,
  Label,
  MetricCell,
} from "@/components/terminal/primitives";
import { getFundingRates, getMarkets } from "@/lib/lighter/markets";
import {
  OTHER_VENUES,
  VENUE_LABEL,
  buildFundingRows,
  median,
  widestSpread,
} from "@/lib/funding-board";
import { aprPct, num, ratePct } from "@/lib/format";
import { cn } from "@/lib/utils";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "Funding",
  description:
    "Lighter funding rates against Binance, Bybit and Hyperliquid for every market — the widest spreads, annualised, on one 8-hour basis.",
  alternates: { canonical: "/funding" },
};

export default async function FundingPage() {
  const [ratesC, marketsC] = await Promise.all([
    getFundingRates().catch(() => null),
    getMarkets().catch(() => null),
  ]);

  const rows =
    ratesC && marketsC ? buildFundingRows(ratesC.data, marketsC.data) : [];

  const withSpread = rows
    .map((r) => ({ row: r, best: widestSpread(r.lighter, r.venues) }))
    .filter((x) => x.best != null && x.row.active);

  // The headline ignores thin books, where a wide spread is untradeable noise.
  const liquid = withSpread.filter((x) => x.row.oiUsd >= 1_000_000);
  const widest = liquid.reduce<(typeof withSpread)[number] | null>(
    (acc, x) => (!acc || Math.abs(x.best!.spread) > Math.abs(acc.best!.spread) ? x : acc),
    null,
  );

  // Where Lighter pays longs more than every venue that lists the market.
  const richest = withSpread.filter((x) =>
    OTHER_VENUES.every((v) => x.row.venues[v] == null || x.row.lighter > x.row.venues[v]!),
  ).length;

  const lighterMedian = median(rows.filter((r) => r.active).map((r) => r.lighter));
  const venueMedians = OTHER_VENUES.map((v) => ({
    venue: v,
    value: median(
      rows.map((r) => r.venues[v]).filter((x): x is number => x != null),
    ),
  }));

  const widestApr = widest ? aprPct(widest.best!.spread) : null;

  return (
    <div>
      <h1 className="sr-only">Funding rates: Lighter against Binance, Bybit and Hyperliquid</h1>

      {/* ── stat band ──────────────────────────────────────── */}
      <div className="grid border-b border-line bg-panel lg:grid-cols-[400px_minmax(0,1fr)]">
        <div className="border-line lg:border-r">
          <MetricCell
            label="Widest spread"
            value={widest ? ratePct(widest.best!.spread) : "—"}
            scale="hero"
            tone={widest ? (widest.best!.spread >= 0 ? "up" : "down") : undefined}
            sub={
              widest ? (
                <span>
                  <Link
                    href={`/markets/${widest.row.symbol}`}
                    className="-mx-1 px-1 py-1 text-ink underline decoration-edge underline-offset-4 hover:decoration-ink-3"
                  >
                    {widest.row.symbol}
                  </Link>{" "}
                  · vs {VENUE_LABEL[widest.best!.venue]} · books over $1M OI
                </span>
              ) : undefined
            }
          >
            {widestApr != null && (
              <div className="figure mt-3 border-t border-hair pt-2.5 text-[11px] text-ink-3">
                <span className={cn("text-[12px]", widestApr >= 0 ? "text-up" : "text-down")}>
                  {widestApr >= 0 ? "+" : "−"}
                  {Math.abs(widestApr).toFixed(1)}%
                </span>{" "}
                annualised, before fees, borrow and execution
              </div>
            )}
          </MetricCell>
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-4 lg:divide-y-0">
          <MetricCell
            label="Comparable"
            value={num(withSpread.length)}
            sub={`of ${num(rows.length)} Lighter markets`}
          />
          <MetricCell
            label="Lighter pays most"
            value={num(richest)}
            sub="markets above every venue"
          />
          <MetricCell
            label="Median · Lighter"
            value={lighterMedian != null ? ratePct(lighterMedian) : "—"}
            tone={lighterMedian != null && lighterMedian < 0 ? "down" : undefined}
            sub={
              <span className="flex flex-wrap gap-x-2">
                {venueMedians.map((v) => (
                  <span key={v.venue}>
                    {VENUE_LABEL[v.venue].slice(0, 3)}{" "}
                    {v.value != null ? ratePct(v.value, 4) : "—"}
                  </span>
                ))}
              </span>
            }
          />
          <div className="px-5 py-4">
            <div className="mb-2.5 flex items-baseline gap-2">
              <Label>Next settlement</Label>
              <span className="figure text-[10px] text-ink-4">Lighter · hourly</span>
            </div>
            <FundingClock className="text-[21px]" />
            {ratesC && (
              <div className="mt-2">
                <AsOf asOf={ratesC.asOf} ttl={ratesC.ttl} source={ratesC.source} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── method ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-line bg-rail px-5 py-2.5">
        <Label>Method</Label>
        <p className="max-w-[110ch] text-[11.5px] leading-relaxed text-ink-3">
          Every rate is on an <Figure className="text-ink-2">8-hour</Figure> basis —
          venues that settle hourly or every four hours are normalised by Lighter&rsquo;s
          feed, which we checked against each exchange. Positive means longs pay.
          APR is the 8-hour rate × 3 × 365. A spread is a signal, not a quote.
        </p>
      </div>

      {rows.length > 0 ? (
        <FundingTable initial={rows} />
      ) : (
        <p className="py-16 text-center text-[12.5px] text-ink-3">
          Funding rates are unavailable right now.
        </p>
      )}
    </div>
  );
}
