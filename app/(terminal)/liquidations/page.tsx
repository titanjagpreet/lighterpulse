import type { Metadata } from "next";
import {
  LiquidationTape,
  LiveLiquidationStat,
} from "@/components/terminal/liquidation-tape";
import {
  RangeScope,
  RangeToggle,
  RangedChart,
  RangedFigure,
  RangeNote,
} from "@/components/terminal/range";
import {
  AsOf,
  MetricCell,
  SectionHeader,
} from "@/components/terminal/primitives";
import { getDaily } from "@/lib/lighter/metrics";
import { getMarkets } from "@/lib/lighter/markets";
import { DAY_MS, sumDays } from "@/lib/series";
import { dayLabel, num, usdCompact } from "@/lib/format";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "Liquidations",
  description:
    "Liquidation volume and counts across Lighter since genesis, plus a live tape of every forced exit as it happens.",
  alternates: { canonical: "/liquidations" },
};

export default async function LiquidationsPage() {
  const settle = async <T,>(p: Promise<T>) => p.catch(() => null);

  const [volC, cntC, feeC, marketsC] = await Promise.all([
    settle(getDaily("liquidation_volume", 0)),
    settle(getDaily("liquidation_count", 0)),
    settle(getDaily("liquidation_fee", 2)),
    settle(getMarkets()),
  ]);

  // The tape subscribes per market; the deepest books produce almost all of
  // the liquidation flow, and 40 subscriptions stays well inside the
  // 500-per-connection limit.
  const tapeMarkets = (marketsC?.data ?? [])
    .filter((m) => m.active)
    .slice(0, 40)
    .map((m) => ({ marketId: m.marketId, symbol: m.symbol }));

  const vol = volC?.data ?? null;
  const cnt = cntC?.data ?? null;
  const lastIdx = vol ? vol.values.length - 1 : -1;

  const lastDay = vol && lastIdx >= 0 ? vol.values[lastIdx] : null;
  const lastDayCount = cnt?.values.length ? cnt.values[cnt.values.length - 1] : null;
  const lastDayLabel =
    vol && lastIdx >= 0 ? dayLabel(vol.start + lastIdx * DAY_MS) : null;

  const v7 = vol ? sumDays(vol, "7d") : null;
  const c7 = cnt ? sumDays(cnt, "7d") : null;
  const vAll = vol ? sumDays(vol, "all") : null;
  const cAll = cnt ? sumDays(cnt, "all") : null;
  const feesAll = feeC ? sumDays(feeC.data, "all") : null;
  const avgSize = lastDay && lastDayCount ? lastDay / lastDayCount : null;

  return (
    <div>
      <h1 className="sr-only">Liquidations on Lighter</h1>

      {/* ── stat band ──────────────────────────────────────── */}
      <div className="grid border-b border-line bg-panel lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="border-line lg:border-r">
          <LiveLiquidationStat
            markets={tapeMarkets}
            base={lastDay}
            baseCount={lastDayCount}
            baseDay={lastDayLabel}
          />
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
            sub="per liquidation, last full day"
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
        <div className="min-w-0 border-line lg:border-r">
          {vol && cnt && vol.values.length > 1 ? (
            <RangeScope length={vol.values.length} initial="30d">
              <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
                <RangeNote prefix="Daily, UTC" />
                <div className="grow" />
                {volC && <AsOf asOf={volC.asOf} ttl={volC.ttl} source={volC.source} />}
                <RangeToggle />
              </div>

              <div className="border-b border-line p-5">
                <SectionHeader title="Liquidated per day" note="dashed line is the mean">
                  <span className="figure text-[11px] text-ink-3">
                    total{" "}
                    <RangedFigure
                      series={vol}
                      stat="sum"
                      format={{ as: "usdCompact", dp: 2 }}
                      className="text-ink"
                    />
                  </span>
                </SectionHeader>
                <RangedChart
                  series={vol}
                  variant="bar"
                  valueLabel="liquidated"
                  height={196}
                  showMean
                  format={{ as: "usdCompact", dp: 1 }}
                  details={[
                    { label: "events", series: cnt, format: { as: "count" } },
                  ]}
                />
              </div>

              <div className="p-5">
                <SectionHeader title="Events per day" note="count, not value">
                  <span className="figure text-[11px] text-ink-3">
                    total{" "}
                    <RangedFigure
                      series={cnt}
                      stat="sum"
                      format={{ as: "count" }}
                      className="text-ink"
                    />
                  </span>
                </SectionHeader>
                <RangedChart
                  series={cnt}
                  variant="area"
                  tone="info"
                  valueLabel="liquidation events"
                  height={176}
                  format={{ as: "compact" }}
                />
              </div>
            </RangeScope>
          ) : (
            <p className="py-16 text-center text-[12.5px] text-ink-3">
              Liquidation history is unavailable right now.
            </p>
          )}
        </div>

        <aside className="bg-rail">
          <LiquidationTape markets={tapeMarkets} />
        </aside>
      </div>
    </div>
  );
}
