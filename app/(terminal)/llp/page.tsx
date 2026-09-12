import type { Metadata } from "next";
import { SeriesChart } from "@/components/terminal/charts";
import { PoolView } from "@/components/terminal/pool-view";
import { PoolsTable } from "@/components/terminal/pools-table";
import {
  RangeNote,
  RangeScope,
  RangeToggle,
  RangedChart,
  RangedFigure,
} from "@/components/terminal/range";
import { SectionNav } from "@/components/terminal/section-nav";
import { LighterLink } from "@/components/terminal/lighter-link";
import {
  AsOf,
  Chip,
  Empty,
  Figure,
  Label,
  MagnitudeBar,
} from "@/components/terminal/primitives";
import { getLlp, getPublicPools } from "@/lib/lighter/pools";
import { getDaily } from "@/lib/lighter/metrics";
import { getPoolHistory } from "@/lib/lighter/pool-history";
import { partToDaily } from "@/lib/oi";
import { LLP_INDEX, LLP_USDC_PER_STAKED_LIT } from "@/lib/pools";
import { DAY_MS, lastDays } from "@/lib/series";
import { dayLabel, usdCompact } from "@/lib/format";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "LLP & vaults",
  description:
    "Lighter's Liquidity Provider — TVL, share-price returns, Sharpe, drawdowns, what it holds and the liquidation fees behind it — plus every public vault ranked by TVL.",
  alternates: { canonical: "/llp" },
};

const SECTIONS = [
  { id: "performance", label: "Performance" },
  { id: "backtest", label: "Backtest" },
  { id: "holdings", label: "Holdings" },
  { id: "liquidation-fees", label: "Liquidation fees" },
  { id: "vaults", label: "Vaults" },
];

export default async function LlpPage() {
  const settle = async <T,>(p: Promise<T>) => p.catch(() => null);
  const [llpC, poolsC, liqC, history] = await Promise.all([
    settle(getLlp()),
    settle(getPublicPools()),
    settle(getDaily("liquidation_fee", 0)),
    settle(getPoolHistory()),
  ]);

  const llp = llpC?.data ?? null;
  const pools = poolsC?.data ?? [];
  const funded = pools.filter((p) => p.tvl >= 10_000).length;
  const liq = liqC?.data ?? null;
  const tvlHist = partToDaily(history?.tvl?.[String(LLP_INDEX)]);

  let liqTotal = 0;
  let peak: { t: number; v: number } | null = null;
  if (liq) {
    for (let i = 0; i < liq.values.length; i++) {
      const v = liq.values[i];
      liqTotal += v;
      if (!peak || v > peak.v) peak = { t: liq.start + i * DAY_MS, v };
    }
  }

  const strategies = llp?.info.strategies ?? [];
  const strategyTotal = strategies.reduce((a, b) => a + b, 0);
  const strategyMax = Math.max(...strategies, 1);

  const rail = llp ? (
    <>
      <Label className="mb-3">Strategies</Label>
      <div className="flex flex-col">
        {strategies.map((c, i) => (
          <div
            key={i}
            className="grid grid-cols-[70px_minmax(0,1fr)_60px_38px] items-center gap-2.5 border-t border-hair py-1.5"
          >
            <span className="text-[11.5px] text-ink-2">Strategy {i + 1}</span>
            <MagnitudeBar value={c} max={strategyMax} height={4} align="left" tone="neutral" />
            <Figure className="text-right text-[11px]">{usdCompact(c, 1)}</Figure>
            <Figure className="text-right text-[10.5px] text-ink-3">
              {strategyTotal ? `${((c / strategyTotal) * 100).toFixed(0)}%` : "—"}
            </Figure>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-[11px] leading-relaxed text-ink-4">
        Collateral per strategy, as the API reports it. Lighter does not name them.
      </p>

      <div className="mt-5 border-t border-line pt-4">
        <Label className="mb-2.5">TVL over time</Label>
        {tvlHist && tvlHist.values.length > 1 ? (
          <SeriesChart
            points={lastDays(tvlHist, "all")}
            variant="area"
            tone="info"
            height={132}
            valueLabel="LLP TVL"
            format={{ as: "usdCompact", dp: 1 }}
          />
        ) : (
          <p className="text-[11.5px] leading-relaxed text-ink-3">
            {history?.since
              ? `Lighter reports only today's TVL, so it is recorded hourly — since ${dayLabel(Date.parse(history.since), true)}. The chart appears once two days are in.`
              : "Lighter reports only today's TVL, so it is recorded hourly. The chart appears once two days are in."}
          </p>
        )}
      </div>
    </>
  ) : null;

  return (
    <div>
      {/* ── identity ───────────────────────────────────────── */}
      <div className="border-b border-line bg-panel px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-[17px] font-semibold tracking-[-0.015em]">
            Lighter Liquidity Provider
          </h1>
          <Chip tone="brand">LLP</Chip>
          <Chip>#{LLP_INDEX}</Chip>
          <div className="grow" />
          {llpC && <AsOf asOf={llpC.asOf} ttl={llpC.ttl} source={llpC.source} />}
          <LighterLink path={`/public-pools/${LLP_INDEX}`}>Deposit on Lighter</LighterLink>
        </div>
        {llp?.description && (
          <p className="mt-2 max-w-[82ch] text-[12px] leading-relaxed text-ink-3">
            {llp.description}
          </p>
        )}
        <p className="figure mt-1.5 text-[10.5px] text-ink-4">
          Depositing needs staked LIT: up to {LLP_USDC_PER_STAKED_LIT} USDC per LIT staked.
        </p>
      </div>

      <SectionNav sections={SECTIONS} />

      {llp ? (
        <PoolView
          detail={llp}
          rail={rail}
          backtestNote={`Deposits need ${1 / LLP_USDC_PER_STAKED_LIT} LIT staked per USDC; that cost is not modelled.`}
        />
      ) : (
        <Empty className="border-b border-line">The LLP is unavailable right now.</Empty>
      )}

      {/* ── liquidation fees ───────────────────────────────── */}
      <section
        id="liquidation-fees"
        aria-labelledby="liq-title"
        className="scroll-mt-[88px] border-b border-line"
      >
        {liq && liq.values.length > 1 ? (
          <RangeScope param="fees" length={liq.values.length} initial="90d">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-3">
              <h2 id="liq-title" className="text-[13px] font-semibold tracking-[-0.005em]">
                Liquidation fees
              </h2>
              <span className="figure text-[10.5px] text-ink-3">
                charged on liquidations, exchange-wide · the LLP handles liquidations
              </span>
              <div className="grow" />
              <RangeNote />
              <RangeToggle />
            </div>
            <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="min-w-0 border-b border-line p-5 lg:border-r lg:border-b-0">
                <RangedChart
                  series={liq}
                  variant="bar"
                  showMean
                  valueLabel="liquidation fees"
                  height={196}
                  format={{ as: "usdCompact", dp: 1 }}
                />
              </div>
              <aside className="bg-rail p-5">
                <Label className="mb-2">In this range</Label>
                <Stat label="Total">
                  <RangedFigure series={liq} stat="sum" format={{ as: "usdCompact", dp: 2 }} />
                </Stat>
                <Stat label="Daily average">
                  <RangedFigure series={liq} stat="mean" format={{ as: "usdCompact", dp: 2 }} />
                </Stat>
                <Label className="mt-5 mb-2">Since genesis</Label>
                <Stat label="Total">{usdCompact(liqTotal, 2)}</Stat>
                {peak && (
                  <Stat label={`Peak day · ${dayLabel(peak.t, true)}`}>
                    {usdCompact(peak.v, 2)}
                  </Stat>
                )}
                {liqC && (
                  <div className="mt-4">
                    <AsOf asOf={liqC.asOf} ttl={liqC.ttl} source={liqC.source} />
                  </div>
                )}
              </aside>
            </div>
          </RangeScope>
        ) : (
          <>
            <h2 id="liq-title" className="sr-only">
              Liquidation fees
            </h2>
            <Empty>Liquidation fee history is unavailable right now.</Empty>
          </>
        )}
      </section>

      {/* ── vaults ─────────────────────────────────────────── */}
      <section id="vaults" aria-labelledby="vaults-title" className="scroll-mt-[88px]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-3">
          <h2 id="vaults-title" className="text-[13px] font-semibold tracking-[-0.005em]">
            Public pools
          </h2>
          <span className="figure text-[10.5px] text-ink-3">
            {funded} over $10K · {pools.length} in all · run by traders, who keep a cut of profits
          </span>
          <div className="grow" />
          {poolsC && <AsOf asOf={poolsC.asOf} ttl={poolsC.ttl} source={poolsC.source} />}
        </div>
        <div className="p-5">
          {pools.length > 0 ? (
            <PoolsTable pools={pools} />
          ) : (
            <Empty>The pool list is unavailable right now.</Empty>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-hair py-2">
      <span className="text-[11.5px] text-ink-2">{label}</span>
      <Figure className="text-[12px]">{children}</Figure>
    </div>
  );
}
