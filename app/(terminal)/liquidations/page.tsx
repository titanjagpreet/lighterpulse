import type { Metadata } from "next";
import { SeriesChart } from "@/components/terminal/charts";
import {
  LiquidationTape,
  LiveLiquidationStat,
} from "@/components/terminal/liquidation-tape";
import {
  AsOf,
  MetricCell,
  SectionHeader,
} from "@/components/terminal/primitives";
import { getMetric, last, sum } from "@/lib/lighter/metrics";
import { getMarkets } from "@/lib/lighter/markets";
import { num, usdCompact } from "@/lib/format";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "Liquidations",
  description:
    "Liquidation volume and counts across Lighter, plus a live tape of every forced exit as it happens.",
};

const dayLabel = (t: number) =>
  new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default async function LiquidationsPage() {
  const settle = async <T,>(p: Promise<T>) => p.catch(() => null);

  const [volWeek, cntWeek, volAll, cntAll, feeAll, marketsC] = await Promise.all([
    settle(getMetric("liquidation_volume", "w")),
    settle(getMetric("liquidation_count", "w")),
    settle(getMetric("liquidation_volume", "all")),
    settle(getMetric("liquidation_count", "all")),
    settle(getMetric("liquidation_fee", "all")),
    settle(getMarkets()),
  ]);

  // The tape subscribes per market; the deepest books produce almost all of
  // the liquidation flow, and 40 subscriptions stays well inside the
  // 500-per-connection limit.
  const tapeMarkets = (marketsC?.data ?? [])
    .filter((m) => m.active)
    .slice(0, 40)
    .map((m) => ({ marketId: m.marketId, symbol: m.symbol }));

  const v24 = volWeek ? last(volWeek.data) : null;
  const c24 = cntWeek ? last(cntWeek.data) : null;
  const v7 = volWeek ? sum(volWeek.data) : null;
  const c7 = cntWeek ? sum(cntWeek.data) : null;
  const vAll = volAll ? sum(volAll.data) : null;
  const cAll = cntAll ? sum(cntAll.data) : null;
  const feesAll = feeAll ? sum(feeAll.data) : null;

  const avgSize = v24 && c24 ? v24 / c24 : null;

  return (
    <div>
      {/* ── stat band ──────────────────────────────────────── */}
      <div className="grid border-b border-line bg-panel lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="border-line lg:border-r">
          <LiveLiquidationStat markets={tapeMarkets} base={v24} baseCount={c24} />
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-4 lg:divide-y-0">
          <MetricCell
            label="7 days"
            value={usdCompact(v7, 2)}
            sub={c7 != null ? `${num(c7)} events` : undefined}
          />
          <MetricCell
            label="Since genesis"
            value={usdCompact(vAll, 2)}
            sub={cAll != null ? `${num(cAll)} events` : undefined}
          />
          <MetricCell
            label="Average size"
            value={usdCompact(avgSize, 1)}
            sub="per liquidation, 24h"
          />
          <MetricCell
            label="Liquidation fees"
            value={usdCompact(feesAll, 2)}
            sub="to the protocol, all time"
          />
        </div>
      </div>

      {/* ── charts + tape ──────────────────────────────────── */}
      <div className="grid lg:grid-cols-[minmax(0,1fr)_384px]">
        <div className="border-line lg:border-r">
          <div className="border-b border-line p-5">
            <SectionHeader
              title="Liquidated per day"
              note="last 7 sessions"
            >
              {volWeek && <AsOf age={volWeek.age} stale={volWeek.stale} />}
            </SectionHeader>
            {volWeek && volWeek.data.length > 1 ? (
              <SeriesChart
                points={volWeek.data}
                variant="bar"
                valueLabel="liquidated"
                height={180}
                showMean
                format={{ as: "usdCompact", dp: 1 }}
                xLabels={volWeek.data.map((p) => dayLabel(p.t))}
              />
            ) : (
              <p className="py-12 text-center text-[12.5px] text-ink-3">
                Liquidation history is unavailable right now.
              </p>
            )}
          </div>

          <div className="p-5">
            <SectionHeader title="Events per day" note="count, not value" />
            {cntWeek && cntWeek.data.length > 1 ? (
              <SeriesChart
                points={cntWeek.data}
                variant="area"
                tone="info"
                valueLabel="liquidation events"
                height={170}
                format={{ as: "count" }}
                xLabels={cntWeek.data.map((p) => dayLabel(p.t))}
              />
            ) : (
              <p className="py-12 text-center text-[12.5px] text-ink-3">
                Event counts are unavailable right now.
              </p>
            )}
          </div>
        </div>

        <aside className="bg-rail">
          <LiquidationTape markets={tapeMarkets} />
        </aside>
      </div>
    </div>
  );
}
