import type { Metadata } from "next";
import Link from "next/link";
import { SeriesChart, Sparkline } from "@/components/terminal/charts";
import {
  RangeNote,
  RangeScope,
  RangeToggle,
  RangedChart,
  RangedFigure,
} from "@/components/terminal/range";
import { SectionNav } from "@/components/terminal/section-nav";
import { LighterLink } from "@/components/terminal/lighter-link";
import { LIGHTER_DOCS } from "@/lib/links";
import { TimeAgo } from "@/components/terminal/as-of";
import {
  AsOf,
  Chip,
  Empty,
  Figure,
  Label,
  MagnitudeBar,
  Measure,
  MetricCell,
  ProofLink,
  ProportionBar,
  SectionHeader,
} from "@/components/terminal/primitives";
import { getLitStats } from "@/lib/lighter/token";
import { getMarkets } from "@/lib/lighter/markets";
import { getDaily } from "@/lib/lighter/metrics";
import { getGenesisTotals } from "@/lib/lighter/overview";
import {
  getBuybackAccount,
  getBuybackFills,
  getStakingPool,
  getStakingRewards,
} from "@/lib/lighter/pools";
import { getPoolHistory } from "@/lib/lighter/pool-history";
import { BURN_PROOF_URL, getLitSupply } from "@/lib/chain/lit-token";
import { partToDaily } from "@/lib/oi";
import {
  BUYBACK_ACCOUNT_INDEX,
  DOCUMENTED_STAKING_APR,
  LLP_USDC_PER_STAKED_LIT,
  STAKING_POOL_INDEX,
  UNSTAKE_LOCKUP_DAYS,
} from "@/lib/pools";
import { DAY_MS, lastDays, sumDays, type RangeKey } from "@/lib/series";
import type { DailySeries } from "@/lib/lighter/types";
import { compact, dayLabel, hash, num, price, usd, usdCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "LIT",
  description:
    "LIT price, staking, buybacks and burns — how much LIT is staked and what it earns, how much Lighter has repurchased and at what price, and how much has been burned on Ethereum.",
  alternates: { canonical: "/lit" },
};

const SECTIONS = [
  { id: "price", label: "Price" },
  { id: "staking", label: "Staking" },
  { id: "buyback", label: "Buyback" },
  { id: "burn", label: "Burn" },
];

const FILL_COLS =
  "grid-cols-[84px_minmax(84px,1fr)_minmax(84px,1fr)_minmax(96px,1fr)_56px_minmax(128px,1.2fr)]";

/**
 * Average price paid per day = USDC spent ÷ LIT bought, aligned by date.
 * A day with no purchase carries the previous average rather than dropping,
 * so the series stays one bucket per day.
 */
function averagePrice(lit: DailySeries, usdc: DailySeries): DailySeries {
  const values: number[] = [];
  let prev = 0;
  for (let i = 0; i < lit.values.length; i++) {
    const t = lit.start + i * DAY_MS;
    const spent = usdc.values[Math.round((t - usdc.start) / DAY_MS)];
    const bought = lit.values[i];
    const v = bought > 0 && spent != null ? spent / bought : prev;
    values.push(Math.round(v * 10_000) / 10_000);
    prev = v;
  }
  return { start: lit.start, values };
}

export default async function LitPage() {
  const settle = async <T,>(p: Promise<T>) => p.catch(() => null);

  const [
    lit,
    marketsC,
    buyC,
    usdcC,
    genesis,
    supplyC,
    poolC,
    rewardsC,
    buybackC,
    fillsC,
    history,
  ] = await Promise.all([
    settle(getLitStats()),
    settle(getMarkets()),
    settle(getDaily("buyback", 2)),
    settle(getDaily("buyback_usdc", 2)),
    settle(getGenesisTotals()),
    settle(getLitSupply()),
    settle(getStakingPool()),
    settle(getStakingRewards()),
    settle(getBuybackAccount()),
    settle(getBuybackFills()),
    settle(getPoolHistory()),
  ]);

  const litMarket = marketsC?.data.find((m) => m.symbol === "LIT") ?? null;
  const buy = buyC?.data ?? null;
  const usdc = usdcC?.data ?? null;
  const hasHistory = !!buy && !!usdc && buy.values.length > 1;

  const totalLit = buy ? sumDays(buy, "all") : null;
  const totalUsdc = usdc ? sumDays(usdc, "all") : null;
  const avgPrice = totalLit && totalUsdc ? totalUsdc / totalLit : null;
  const spot = lit?.data.price ?? litMarket?.markPrice ?? null;
  const unrealised =
    totalLit != null && totalUsdc != null && spot != null
      ? totalLit * spot - totalUsdc
      : null;

  const priceSeries = hasHistory ? averagePrice(buy, usdc) : null;
  const days = buy?.values.length ?? 0;
  const began = buy ? dayLabel(buy.start, true) : null;

  // The pace of the programme: LIT per day over trailing windows.
  const pace = (key: RangeKey, span: number) =>
    buy && usdc
      ? {
          lit: sumDays(buy, key) / Math.min(span, days),
          usdc: sumDays(usdc, key) / Math.min(span, days),
        }
      : null;
  const paceRows: { label: string; v: ReturnType<typeof pace> }[] = [
    { label: "Last 7 days", v: pace("7d", 7) },
    { label: "Last 30 days", v: pace("30d", 30) },
    { label: "Last 90 days", v: pace("90d", 90) },
    { label: "Lifetime", v: pace("all", days) },
  ];
  const lifetimePace = paceRows[3].v?.lit ?? null;
  const weekPace = paceRows[0].v?.lit ?? null;
  const paceChange =
    lifetimePace && weekPace != null
      ? ((weekPace - lifetimePace) / lifetimePace) * 100
      : null;
  const paceMax = Math.max(...paceRows.map((r) => r.v?.lit ?? 0), 1);

  const revenue = genesis?.data.revenue ?? null;
  const recycled = revenue && totalUsdc ? (totalUsdc / revenue) * 100 : null;

  /* ── staking ── */
  const pool = poolC?.data ?? null;
  const supply = supplyC?.data ?? null;
  const rewards = rewardsC?.data ?? null;
  const circulating = supply?.circulating ?? null;
  const stakedUsd = pool && spot != null ? pool.staked * spot : null;
  const stakedShare = pool && circulating ? (pool.staked / circulating) * 100 : null;
  const lastDrop = rewards?.last ?? null;
  // Rewards are paid in LIT, so this rate is in LIT — LIT's price cannot move it.
  const rewardApr =
    lastDrop && pool?.staked ? ((lastDrop.lit * 365) / pool.staked) * 100 : null;
  const rewardDays = rewards?.daily.values.length ?? 0;
  const capacity = pool ? pool.staked * LLP_USDC_PER_STAKED_LIT : null;
  const stakedHist = partToDaily(history?.staked);

  /* ── burn ── */
  const held = buybackC?.data.litHeld ?? null;
  const burnedHist = partToDaily(history?.burned);
  const burnedOfBought = supply && totalLit ? (supply.burned / totalLit) * 100 : null;
  const unaccounted =
    supply && totalLit != null && held != null ? supply.burned + held - totalLit : null;

  const fills = (fillsC?.data ?? []).slice(0, 12);

  return (
    <div>
      <h1 className="sr-only">LIT: price, staking, buybacks and burns</h1>

      {/* ── hero ───────────────────────────────────────────── */}
      <div
        id="price"
        className="grid scroll-mt-[88px] border-b border-line bg-panel lg:grid-cols-[348px_minmax(0,1fr)]"
      >
        <div className="border-line lg:border-r">
          <MetricCell
            label="LIT"
            chip={
              litMarket ? <Chip>PERP · MKT {litMarket.marketId}</Chip> : undefined
            }
            value={spot != null ? `$${price(spot)}` : "—"}
            scale="hero"
            delta={lit?.data.change24h ?? litMarket?.change24h ?? null}
          >
            {priceSeries && (
              <div className="mt-3.5">
                <Sparkline
                  points={priceSeries.values.slice(-30)}
                  width={300}
                  height={40}
                  dir={(litMarket?.change24h ?? 0) >= 0 ? "up" : "down"}
                  className="h-auto max-w-full"
                />
                <div className="figure mt-1 text-[9.5px] text-ink-4">
                  average buyback price, last 30 days
                </div>
                <Measure width={300} className="mt-2 max-w-full" />
              </div>
            )}
          </MetricCell>
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
          <MetricCell
            label="Market cap"
            value={usdCompact(lit?.data.marketCap ?? null)}
            sub="CoinGecko, circulating"
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

      <SectionNav sections={SECTIONS} />

      {/* ── staking ────────────────────────────────────────── */}
      <section
        id="staking"
        aria-labelledby="staking-title"
        className="scroll-mt-[88px] border-b border-line"
      >
        <SectionBar
          id="staking-title"
          title="Staking"
          note="LIT locked in Lighter's staking pool · rewards paid daily, in LIT"
        >
          {poolC && <AsOf asOf={poolC.asOf} ttl={poolC.ttl} source={poolC.source} />}
          <ProofLink href={LIGHTER_DOCS.litUtility}>Staking docs</ProofLink>
          <LighterLink path="/staking">Stake on Lighter</LighterLink>
        </SectionBar>

        {pool ? (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 border-line lg:border-r">
              <div className="grid grid-cols-2 divide-x divide-y divide-line border-b border-line sm:grid-cols-4 sm:divide-y-0">
                <MetricCell
                  label="LIT staked"
                  value={compact(pool.staked)}
                  sub={stakedUsd != null ? `${usdCompact(stakedUsd)} at spot` : "LIT"}
                />
                <MetricCell
                  label="Of circulating"
                  value={stakedShare != null ? `${stakedShare.toFixed(1)}%` : "—"}
                  sub={
                    circulating != null
                      ? `of ${compact(circulating)}, net of burns`
                      : "circulating supply unavailable"
                  }
                />
                <MetricCell
                  label="Staking APR"
                  value={rewardApr != null ? `${rewardApr.toFixed(2)}%` : "—"}
                  tone={rewardApr != null ? "up" : undefined}
                  sub={`in LIT · docs: fixed ${DOCUMENTED_STAKING_APR}%`}
                />
                <MetricCell
                  label="Rewards paid"
                  value={rewards ? compact(rewards.total) : "—"}
                  sub={rewardDays ? `LIT over ${num(rewardDays)} days` : undefined}
                />
              </div>

              {rewards && rewardDays > 1 ? (
                <RangeScope param="rewards" length={rewardDays} initial="90d">
                  <div className="p-5">
                    <SectionHeader title="Daily rewards" note="LIT paid into the pool, UTC">
                      <RangeToggle />
                    </SectionHeader>
                    <RangedChart
                      series={rewards.daily}
                      variant="bar"
                      valueLabel="LIT paid to stakers"
                      height={188}
                      format={{ as: "compact" }}
                    />
                    <div className="figure mt-2 text-[10px] text-ink-3">
                      <RangedFigure
                        series={rewards.daily}
                        stat="sum"
                        format={{ as: "compact" }}
                        className="text-ink-2"
                      />{" "}
                      LIT paid · <RangeNote className="text-[10px]" />
                    </div>
                  </div>
                </RangeScope>
              ) : (
                <Empty>Reward history is unavailable right now.</Empty>
              )}

              <div className="border-t border-line p-5">
                <SectionHeader title="Staked over time" note="recorded daily" />
                {stakedHist && stakedHist.values.length > 1 ? (
                  <SeriesChart
                    points={lastDays(stakedHist, "all")}
                    variant="area"
                    tone="info"
                    height={156}
                    valueLabel="LIT staked"
                    format={{ as: "compact" }}
                  />
                ) : (
                  <p className="max-w-[68ch] text-[11.5px] leading-relaxed text-ink-3">
                    {recordingNote(
                      history?.since,
                      "The pool reports only its current balance, so the total is recorded hourly.",
                    )}
                  </p>
                )}
              </div>
            </div>

            <aside className="bg-rail p-5">
              <Label className="mb-3">Pool</Label>
              <Row
                label="Latest reward"
                value={lastDrop ? `${num(lastDrop.lit)} LIT` : "—"}
              />
              {lastDrop && (
                <Row
                  label="Paid"
                  value={
                    <Link
                      href={`/explorer/tx/${lastDrop.hash}`}
                      className="underline decoration-edge underline-offset-4 hover:text-ink"
                    >
                      <TimeAgo t={lastDrop.t} suffix=" ago" />
                    </Link>
                  }
                />
              )}
              <Row
                label="LLP deposits unlocked"
                value={capacity != null ? usdCompact(capacity) : "—"}
              />
              <Row label="Unstaking lockup" value={`${UNSTAKE_LOCKUP_DAYS} days`} />
              <Row
                label="Pool account"
                value={
                  <Link
                    href={`/a/${STAKING_POOL_INDEX}`}
                    className="underline decoration-edge underline-offset-4 hover:text-ink"
                  >
                    #{STAKING_POOL_INDEX}
                  </Link>
                }
              />

              <Note title="Method">
                Rewards arrive as one LIT transfer into the pool each day, around
                18:00 UTC. The APR is the latest transfer ÷ LIT staked × 365. Lighter
                documents a fixed {DOCUMENTED_STAKING_APR}%, and every LIT staked
                unlocks up to {LLP_USDC_PER_STAKED_LIT} USDC of LLP deposits.
              </Note>

              {pool.dollarApy != null && (
                <Note title="Not the staking yield">
                  Lighter&rsquo;s API lists this pool at{" "}
                  <span className="figure text-ink-2">{num(pool.dollarApy, 0)}% APY</span>.
                  That figure is measured in dollars, so it mostly follows LIT&rsquo;s
                  price — it is not what staking pays.
                </Note>
              )}
            </aside>
          </div>
        ) : (
          <Empty>Staking data is unavailable right now.</Empty>
        )}
      </section>

      {/* ── buyback ────────────────────────────────────────── */}
      <section
        id="buyback"
        aria-labelledby="buyback-title"
        className="scroll-mt-[88px] border-b border-line"
      >
        {hasHistory && priceSeries ? (
          <RangeScope length={days} initial="all">
            <SectionBar
              id="buyback-title"
              title="Buyback"
              note={`daily 24-hour TWAPs from trading fees · since ${began}`}
            >
              <RangeNote />
              <RangeToggle />
            </SectionBar>

            <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_360px]">
              {/* daily */}
              <div className="min-w-0 border-b border-line p-5 lg:border-r">
                <SectionHeader title="Daily buyback" note="LIT repurchased">
                  <span className="figure text-[11px] text-ink-3">
                    <RangedFigure
                      series={buy}
                      stat="sum"
                      format={{ as: "compact" }}
                      className="text-ink"
                    />{" "}
                    LIT
                  </span>
                </SectionHeader>
                <RangedChart
                  series={buy}
                  variant="bar"
                  valueLabel="LIT repurchased"
                  height={188}
                  format={{ as: "compact" }}
                  details={[
                    {
                      label: "USDC spent",
                      series: usdc,
                      format: { as: "usdCompact", dp: 2 },
                    },
                    {
                      label: "avg price",
                      series: priceSeries,
                      format: { as: "usdPrice", dp: 3 },
                    },
                  ]}
                />
              </div>

              {/* cumulative */}
              <div className="min-w-0 border-b border-line p-5 lg:border-r">
                <SectionHeader
                  title="Repurchased to date"
                  note="running total · axis is not zero-based"
                >
                  <span className="figure text-[11px] text-ink-3">
                    <RangedFigure
                      series={{ start: buy.start, values: cumulativeValues(buy) }}
                      stat="last"
                      format={{ as: "compact" }}
                      className="text-ink"
                    />{" "}
                    LIT
                  </span>
                </SectionHeader>
                <RangedChart
                  series={buy}
                  mode="cumulative"
                  variant="area"
                  valueLabel="LIT repurchased since launch"
                  height={188}
                  format={{ as: "compact" }}
                />
              </div>

              {/* rail — spans both rows on wide screens */}
              <aside className="bg-rail p-5 lg:row-span-2">
                <Label className="mb-3.5">Programme totals</Label>

                <Figure className="mb-1.5 block text-[26px] leading-none font-medium tracking-[-0.028em]">
                  {totalLit != null ? `${(totalLit / 1e6).toFixed(2)}M` : "—"}{" "}
                  <span className="text-[15px] text-ink-2">LIT</span>
                </Figure>
                <div className="figure mb-4 text-[11px] text-ink-3">
                  repurchased over {num(days)} days
                </div>

                <Row label="USDC spent" value={usd(totalUsdc)} />
                <Row
                  label="Lifetime avg price"
                  value={avgPrice != null ? `$${avgPrice.toFixed(4)}` : "—"}
                />
                <Row
                  label="Value at spot"
                  value={
                    totalLit != null && spot != null ? usdCompact(totalLit * spot) : "—"
                  }
                />
                <Row
                  label="Unrealised on buybacks"
                  value={
                    unrealised != null
                      ? `${unrealised >= 0 ? "+" : "−"}${usdCompact(Math.abs(unrealised))}`
                      : "—"
                  }
                  tone={unrealised != null && unrealised >= 0 ? "up" : "down"}
                />
                <Row
                  label="Spot vs. avg"
                  value={avgPrice && spot ? `${(spot / avgPrice).toFixed(2)}×` : "—"}
                />

                <Note title="Method">
                  Daily buckets from Lighter&rsquo;s{" "}
                  <span className="figure text-ink-2">exchangeMetrics</span>, UTC. LIT
                  here is <em>repurchased</em>; how much of it has since been burned is
                  under Burn, read from Ethereum.
                </Note>

                {buyC && (
                  <div className="mt-4">
                    <AsOf asOf={buyC.asOf} ttl={buyC.ttl} source={buyC.source} />
                  </div>
                )}
              </aside>

              {/* average price */}
              <div className="min-w-0 border-b border-line p-5 lg:border-r lg:border-b-0">
                <SectionHeader
                  title="Average price paid"
                  note="USDC per LIT · axis is not zero-based"
                >
                  <span className="figure text-[11px] text-ink-3">
                    mean{" "}
                    <RangedFigure
                      series={priceSeries}
                      stat="mean"
                      format={{ as: "usdPrice", dp: 3 }}
                      className="text-ink"
                    />
                  </span>
                </SectionHeader>
                <RangedChart
                  series={priceSeries}
                  variant="area"
                  tone="info"
                  valueLabel="average price paid"
                  height={188}
                  format={{ as: "usdPrice", dp: 2 }}
                />
              </div>

              {/* pace */}
              <div className="min-w-0 border-b border-line p-5 lg:border-r lg:border-b-0">
                <SectionHeader title="Pace" note="LIT repurchased per day" />
                {paceChange != null && (
                  <div className="mb-4 flex items-baseline gap-2.5">
                    <Figure
                      className={cn(
                        "text-[28px] leading-none font-medium tracking-[-0.028em]",
                        paceChange >= 0 ? "text-up" : "text-down",
                      )}
                    >
                      {paceChange >= 0 ? "+" : "−"}
                      {Math.abs(paceChange).toFixed(0)}%
                    </Figure>
                    <span className="text-[11.5px] text-ink-3">
                      last 7 days against the lifetime average
                    </span>
                  </div>
                )}
                <div className="flex flex-col">
                  <div className="label grid grid-cols-[92px_minmax(0,1fr)_78px_78px] items-center gap-x-3 border-b border-edge pb-2">
                    <span>Window</span>
                    <span />
                    <span className="text-right">LIT / day</span>
                    <span className="text-right">USDC / day</span>
                  </div>
                  {paceRows.map((r) => (
                    <div
                      key={r.label}
                      className="grid grid-cols-[92px_minmax(0,1fr)_78px_78px] items-center gap-x-3 border-b border-hair py-2.5 last:border-0"
                    >
                      <span
                        className={cn(
                          "text-[12px]",
                          r.label === "Lifetime" ? "text-ink-2" : "text-ink",
                        )}
                      >
                        {r.label}
                      </span>
                      <MagnitudeBar
                        value={r.v?.lit ?? 0}
                        max={paceMax}
                        height={4}
                        align="left"
                        tone={r.label === "Lifetime" ? "neutral" : "up"}
                      />
                      <Figure className="text-right text-[12px]">
                        {r.v ? num(r.v.lit) : "—"}
                      </Figure>
                      <Figure className="text-right text-[11.5px] text-ink-2">
                        {r.v ? usdCompact(r.v.usdc, 1) : "—"}
                      </Figure>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </RangeScope>
        ) : (
          <>
            <SectionBar id="buyback-title" title="Buyback" />
            <Empty>Buyback history is unavailable right now.</Empty>
          </>
        )}

        {fills.length > 0 && (
          <div className="border-t border-line p-5">
            <SectionHeader
              title="Latest fills"
              note={`LIT/USDC spot book · account #${BUYBACK_ACCOUNT_INDEX}`}
            >
              {fillsC && <AsOf asOf={fillsC.asOf} ttl={fillsC.ttl} source={fillsC.source} />}
            </SectionHeader>
            <div className="overflow-x-auto">
              <div className="min-w-[620px]">
                <div
                  className={cn(
                    "label grid items-center gap-x-4 border-b border-edge pt-1 pb-2.5",
                    FILL_COLS,
                  )}
                >
                  <span>Time</span>
                  <span className="text-right">Price</span>
                  <span className="text-right">LIT bought</span>
                  <span className="text-right">USDC</span>
                  <span>Role</span>
                  <span>Transaction</span>
                </div>
                {fills.map((f) => (
                  <Link
                    key={f.hash}
                    href={`/explorer/tx/${f.hash}`}
                    className={cn(
                      "row-hit grid items-center gap-x-4 border-b border-hair py-2 last:border-0",
                      FILL_COLS,
                    )}
                  >
                    <TimeAgo t={f.t} suffix=" ago" className="figure text-[11px] text-ink-3" />
                    <Figure className="text-right text-[12px]">${price(f.price)}</Figure>
                    <Figure className="text-right text-[12px]">{num(f.lit, 2)}</Figure>
                    <Figure className="text-right text-[12px] text-ink-2">
                      {usd(f.usdc, 2)}
                    </Figure>
                    <Figure className="text-[10.5px] text-ink-3">{f.role}</Figure>
                    <Figure className="truncate text-[11px] text-ink-3">
                      {hash(f.hash, 8, 6)}
                    </Figure>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── burn ───────────────────────────────────────────── */}
      <section
        id="burn"
        aria-labelledby="burn-title"
        className="scroll-mt-[88px] border-b border-line"
      >
        <SectionBar
          id="burn-title"
          title="Burn"
          note="LIT sent to the Ethereum dead address, where no one can spend it"
        >
          <ProofLink href={BURN_PROOF_URL}>Verify on Etherscan</ProofLink>
          {supplyC && (
            <AsOf asOf={supplyC.asOf} ttl={supplyC.ttl} source={supplyC.source} />
          )}
        </SectionBar>

        {supply ? (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 border-line lg:border-r">
              <div className="grid grid-cols-2 divide-x divide-y divide-line border-b border-line sm:grid-cols-4 sm:divide-y-0">
                <MetricCell
                  label="LIT burned"
                  value={compact(supply.burned)}
                  sub={
                    supply.totalSupply > 0
                      ? `${((supply.burned / supply.totalSupply) * 100).toFixed(2)}% of total supply`
                      : undefined
                  }
                />
                <MetricCell
                  label="Value at spot"
                  value={spot != null ? usdCompact(supply.burned * spot) : "—"}
                  sub="at today's price"
                />
                <MetricCell
                  label="Buybacks burned"
                  value={burnedOfBought != null ? `${burnedOfBought.toFixed(1)}%` : "—"}
                  sub={totalLit ? `of ${compact(totalLit)} LIT bought back` : undefined}
                />
                <MetricCell
                  label="Awaiting burn"
                  value={held != null ? compact(held) : "—"}
                  tone={held ? "warn" : undefined}
                  sub={`in buyback account #${BUYBACK_ACCOUNT_INDEX}`}
                />
              </div>

              {totalLit != null && held != null && (
                <div className="border-b border-line p-5">
                  <SectionHeader title="Where bought-back LIT sits" note="today" />
                  <ProportionBar
                    height={10}
                    segments={[
                      {
                        key: "burned",
                        label: "Burned",
                        value: supply.burned,
                        tone: "brand",
                        note: `${compact(supply.burned)} LIT`,
                      },
                      {
                        key: "held",
                        label: "In the buyback account",
                        value: held,
                        tone: "warn",
                        note: `${compact(held)} LIT`,
                      },
                    ]}
                  />
                  {unaccounted != null && (
                    <p className="mt-3 max-w-[68ch] text-[11.5px] leading-relaxed text-ink-3">
                      {Math.abs(unaccounted) < totalLit * 0.002
                        ? `Burned plus held matches the ${compact(totalLit)} LIT bought back.`
                        : unaccounted > 0
                          ? `Burned plus held is ${compact(unaccounted)} LIT more than the ${compact(totalLit)} bought back — the account may hold LIT that did not come from buybacks, or today's purchases are not yet in the daily total.`
                          : `${compact(-unaccounted)} of the ${compact(totalLit)} LIT bought back is in neither place today.`}
                    </p>
                  )}
                </div>
              )}

              <div className="p-5">
                <SectionHeader title="Burned over time" note="recorded daily" />
                {burnedHist && burnedHist.values.length > 1 ? (
                  <SeriesChart
                    points={lastDays(burnedHist, "all")}
                    variant="area"
                    height={172}
                    valueLabel="LIT burned"
                    format={{ as: "compact" }}
                  />
                ) : (
                  <p className="max-w-[68ch] text-[11.5px] leading-relaxed text-ink-3">
                    {recordingNote(
                      history?.since,
                      "Ethereum reports only the current balance without archive access, so the total is recorded hourly.",
                    )}
                  </p>
                )}
              </div>
            </div>

            <aside className="bg-rail p-5">
              <Label className="mb-3">Supply</Label>
              <Row label="Total supply" value={num(supply.totalSupply)} />
              <Row label="Burned" value={num(supply.burned)} />
              <Row
                label="Circulating, reported"
                value={
                  supply.circulatingReported != null ? num(supply.circulatingReported) : "—"
                }
              />
              <Row
                label="Circulating, net of burns"
                value={supply.circulating != null ? num(supply.circulating) : "—"}
              />
              {pool && <Row label="Staked" value={num(pool.staked)} />}

              <Note title="Method">
                Burned is the LIT balance of the dead address on Ethereum, read live.
                Circulating supply is CoinGecko&rsquo;s figure, which does not subtract
                burns, so it is shown both ways. Lighter&rsquo;s docs describe buybacks
                but not burns; the Etherscan link shows the balance itself.
              </Note>
              <Note title="Not shown">
                A dated list of individual burns needs archive log queries, which free
                Ethereum nodes refuse. The totals above are exact.
              </Note>
            </aside>
          </div>
        ) : (
          <Empty>Burn data is unavailable right now.</Empty>
        )}
      </section>
    </div>
  );
}

function recordingNote(since: string | null | undefined, what: string): string {
  return since
    ? `${what} Recording since ${dayLabel(Date.parse(since), true)}; the chart appears once two days are in.`
    : `${what} The chart appears once two days are recorded.`;
}

function cumulativeValues(s: DailySeries): number[] {
  let run = 0;
  return s.values.map((v) => (run += v));
}

function SectionBar({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-3">
      <h2 id={id} className="text-[13px] font-semibold tracking-[-0.005em]">
        {title}
      </h2>
      {note && <span className="figure text-[10.5px] text-ink-3">{note}</span>}
      <div className="grow" />
      {children}
    </div>
  );
}

function Note({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 border-t border-line pt-4">
      <Label className="mb-2.5">{title}</Label>
      <p className="text-[11.5px] leading-relaxed text-ink-3">{children}</p>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "up" | "down";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-hair py-2">
      <span className="text-[11.5px] text-ink-2">{label}</span>
      <Figure
        className={cn(
          "min-w-0 truncate text-right text-[11.5px]",
          tone === "up" && "text-up",
          tone === "down" && "text-down",
        )}
      >
        {value}
      </Figure>
    </div>
  );
}
