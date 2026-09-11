import type { Metadata } from "next";
import { SeriesChart, Sparkline } from "@/components/terminal/charts";
import {
  AsOf,
  Chip,
  Figure,
  Label,
  Measure,
  MetricCell,
  SectionHeader,
} from "@/components/terminal/primitives";
import { getLitStats } from "@/lib/lighter/token";
import { getMarkets } from "@/lib/lighter/markets";
import { getMetric, sum } from "@/lib/lighter/metrics";
import { getGenesisTotals } from "@/lib/lighter/overview";
import { num, price, usd, usdCompact } from "@/lib/format";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "LIT",
  description:
    "LIT price, market cap, protocol revenue and the buyback programme — how much LIT Lighter has repurchased, at what average price.",
};

const dayLabel = (t: number) =>
  new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default async function LitPage() {
  const settle = async <T,>(p: Promise<T>) => p.catch(() => null);

  const [lit, marketsC, buyWeek, usdcWeek, buyAll, usdcAll, genesis] =
    await Promise.all([
      settle(getLitStats()),
      settle(getMarkets()),
      settle(getMetric("buyback", "w")),
      settle(getMetric("buyback_usdc", "w")),
      settle(getMetric("buyback", "all")),
      settle(getMetric("buyback_usdc", "all")),
      settle(getGenesisTotals()),
    ]);

  const litMarket = marketsC?.data.find((m) => m.symbol === "LIT") ?? null;

  const totalLit = buyAll ? sum(buyAll.data) : null;
  const totalUsdc = usdcAll ? sum(usdcAll.data) : null;
  const avgPrice = totalLit && totalUsdc ? totalUsdc / totalLit : null;
  const spot = lit?.data.price ?? litMarket?.markPrice ?? null;
  const unrealised =
    totalLit != null && totalUsdc != null && spot != null
      ? totalLit * spot - totalUsdc
      : null;

  // Average buyback price per day = USDC spent ÷ LIT bought.
  const priceSeries =
    buyWeek && usdcWeek
      ? buyWeek.data
          .map((p, i) => {
            const spent = usdcWeek.data[i]?.v;
            return spent && p.v ? { t: p.t, v: spent / p.v } : null;
          })
          .filter((x): x is { t: number; v: number } => x !== null)
      : [];

  const revenue = genesis?.data.revenue ?? null;
  const recycled =
    revenue && totalUsdc ? (totalUsdc / revenue) * 100 : null;

  return (
    <div>
      {/* ── hero ───────────────────────────────────────────── */}
      <div className="grid border-b border-line bg-panel lg:grid-cols-[348px_minmax(0,1fr)]">
        <div className="border-line lg:border-r">
          <MetricCell
            label="LIT"
            chip={litMarket ? <Chip>PERP · MKT {litMarket.marketId}</Chip> : undefined}
            value={spot != null ? `$${price(spot)}` : "—"}
            scale="hero"
            delta={lit?.data.change24h ?? litMarket?.change24h ?? null}
          >
            {litMarket && (
              <div className="mt-3.5">
                <Sparkline
                  points={priceSeries.map((p) => p.v)}
                  width={300}
                  height={40}
                  dir={(litMarket.change24h ?? 0) >= 0 ? "up" : "down"}
                />
                <Measure width={300} className="mt-2" />
              </div>
            )}
          </MetricCell>
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
          <MetricCell
            label="Market cap"
            value={usdCompact(lit?.data.marketCap ?? null)}
            sub="fully diluted"
          />
          <MetricCell
            label="Open interest"
            value={usdCompact(litMarket?.oiUsd ?? null)}
            sub={litMarket ? `${num(litMarket.trades24h)} trades 24h` : undefined}
          />
          <MetricCell
            label="Volume 24h"
            value={usdCompact(litMarket?.volume24h ?? null)}
            sub="on Lighter"
          />
          <MetricCell
            label="Protocol revenue"
            value={usdCompact(revenue)}
            sub="since genesis"
          />
          <MetricCell
            label="Revenue recycled"
            value={recycled != null ? `${recycled.toFixed(1)}%` : "—"}
            sub="spent on buybacks"
          />
        </div>
      </div>

      {/* ── buybacks ───────────────────────────────────────── */}
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_360px]">
        <div className="border-line p-5 lg:border-r">
          <SectionHeader
            title="Daily buyback"
            note="LIT purchased"
          />
          {buyWeek && buyWeek.data.length > 1 ? (
            <SeriesChart
              points={buyWeek.data}
              variant="bar"
              valueLabel="LIT purchased"
              height={168}
              format={{ as: "thousands" }}
              xLabels={buyWeek.data.map((p) => dayLabel(p.t))}
            />
          ) : (
            <p className="py-12 text-center text-[12.5px] text-ink-3">
              Buyback history is unavailable right now.
            </p>
          )}
        </div>

        <div className="border-line p-5 lg:border-r">
          <SectionHeader
            title="Average buyback price"
            note="USDC per LIT · axis is not zero-based"
          />
          {priceSeries.length > 1 ? (
            <SeriesChart
              points={priceSeries}
              variant="area"
              tone="info"
              valueLabel="average price paid"
              height={168}
              format={{ as: "usdPrice", dp: 2 }}
              xLabels={priceSeries.map((p) => dayLabel(p.t))}
            />
          ) : (
            <p className="py-12 text-center text-[12.5px] text-ink-3">
              Not enough buyback data yet.
            </p>
          )}
        </div>

        <aside className="bg-rail p-5">
          <Label className="mb-3.5">Buyback programme</Label>

          <Figure className="mb-1.5 block text-[26px] leading-none font-medium tracking-[-0.028em]">
            {totalLit != null ? `${(totalLit / 1e6).toFixed(2)}M` : "—"}{" "}
            <span className="text-[15px] text-ink-2">LIT</span>
          </Figure>
          <div className="figure mb-4 text-[11px] text-ink-3">
            repurchased since the programme began
          </div>

          <Row label="USDC spent" value={usd(totalUsdc)} />
          <Row
            label="Lifetime avg price"
            value={avgPrice != null ? `$${avgPrice.toFixed(3)}` : "—"}
          />
          <Row
            label="Unrealised on buybacks"
            value={unrealised != null ? usdCompact(unrealised) : "—"}
            tone={unrealised != null && unrealised >= 0 ? "up" : "down"}
          />
          <Row
            label="Spot vs. avg"
            value={
              avgPrice && spot ? `${(spot / avgPrice).toFixed(2)}×` : "—"
            }
          />

          <div className="mt-5 border-t border-line pt-4">
            <Label className="mb-2.5">Not yet live</Label>
            <p className="text-[11.5px] leading-relaxed text-ink-3">
              Burn events, top LIT balances, LLP and staking need the indexer —
              none is served by a public endpoint. They land with Phase&nbsp;4.
            </p>
          </div>

          {buyAll && (
            <div className="mt-4">
              <AsOf age={buyAll.age} stale={buyAll.stale} />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="flex justify-between border-t border-hair py-2">
      <span className="text-[11.5px] text-ink-2">{label}</span>
      <Figure
        className={`text-[11.5px] ${tone === "up" ? "text-up" : tone === "down" ? "text-down" : ""}`}
      >
        {value}
      </Figure>
    </div>
  );
}
