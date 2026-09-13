import { IntentLink } from "@/components/terminal/intent-link";
import type { Metadata } from "next";
import { Sparkline } from "@/components/terminal/charts";
import {
  RangeNote,
  RangeScope,
  RangeToggle,
  RangedChart,
  RangedFigure,
} from "@/components/terminal/range";
import { WatchlistStrip } from "@/components/terminal/watchlist";
import { TokenIcon } from "@/components/terminal/token-icon";
import {
  AsOf,
  Chip,
  Delta,
  Figure,
  Label,
  MagnitudeBar,
  Measure,
  MetricCell,
  ProportionBar,
  RangeMarker,
  SEGMENT_FILL,
  SectionHeader,
} from "@/components/terminal/primitives";
import { getOverview, getOverviewSeries } from "@/lib/lighter/overview";
import { getOiLatest } from "@/lib/lighter/open-interest";
import { REGIME } from "@/lib/oi";
import { ASSET_CLASS_TAG } from "@/lib/lighter/types";
import {
  addr,
  compact,
  dayLabel,
  dirOf,
  num,
  price,
  ratePct,
  usdCompact,
  usdSignedCompact,
} from "@/lib/format";
import { PageHead } from "@/components/terminal/page-head";

export const revalidate = 15;

export const metadata: Metadata = {
  title: "Lighter Exchange Stats — Volume, Open Interest & Fees",
  description:
    "Lighter exchange stats — live open interest, 24h volume, fees, capital flows, account growth, market share and breadth across every market.",
  alternates: { canonical: "/overview" },
};

const MARKET_COLS =
  "grid-cols-[minmax(104px,1.1fr)_minmax(84px,0.95fr)_minmax(62px,0.7fr)_minmax(108px,1.15fr)_minmax(120px,1.25fr)_minmax(80px,0.85fr)_minmax(150px,1.5fr)]";

/** Market-share identity colours, in fixed order. The rest fold into Other. */
const SHARE_TONES = ["brand", "info", "warn", "neutral"] as const;

export default async function OverviewPage() {
  const [overview, seriesC, oiLatest] = await Promise.all([
    getOverview(),
    getOverviewSeries().catch(() => null),
    getOiLatest().catch(() => null),
  ]);
  const o = overview.data;
  const series = seriesC?.data ?? null;

  const top = o.markets.slice(0, 7);

  // Biggest 24h open-interest moves among books that matter (≥ $1M).
  const symbolOf = new Map(o.markets.map((m) => [m.marketId, m.symbol]));
  const oiRanked = Object.entries(oiLatest?.markets ?? {})
    .filter(([, v]) => v.d24h != null && v.oi >= 1_000_000)
    .map(([id, v]) => ({ id: Number(id), symbol: symbolOf.get(Number(id)) ?? `#${id}`, ...v, d24h: v.d24h as number }));
  const oiRising = [...oiRanked].filter((x) => x.d24h > 0).sort((a, b) => b.d24h - a.d24h).slice(0, 5);
  const oiFalling = [...oiRanked].filter((x) => x.d24h < 0).sort((a, b) => a.d24h - b.d24h).slice(0, 5);
  const maxOi = Math.max(...top.map((m) => m.oiUsd), 1);
  const maxVol = Math.max(...top.map((m) => m.volume24h), 1);
  const { breadth } = o.summary;
  const breadthTotal = breadth.up + breadth.down + breadth.flat || 1;

  const turnover =
    o.volume24h && o.openInterest ? o.volume24h / o.openInterest : null;

  const strip = o.markets.map((m) => ({
    marketId: m.marketId,
    symbol: m.symbol,
    markPrice: m.markPrice,
    change24h: m.change24h,
  }));

  // Market share: the four biggest books by volume, the same four in both bars.
  const volTotal = o.summary.totalVolume;
  const oiTotal = o.summary.totalOi;
  const shareLeaders = [...o.markets].sort((a, b) => b.volume24h - a.volume24h).slice(0, 4);
  const shareRows = [
    ...shareLeaders.map((m, i) => ({
      key: m.symbol,
      label: m.symbol,
      href: `/markets/${m.symbol}` as string | null,
      vol: m.volume24h,
      oi: m.oiUsd,
      tone: SHARE_TONES[i] as (typeof SHARE_TONES)[number] | "faint",
    })),
    {
      key: "other",
      label: `Other ${Math.max(0, o.markets.length - shareLeaders.length)}`,
      href: null,
      vol: Math.max(0, volTotal - shareLeaders.reduce((s, m) => s + m.volume24h, 0)),
      oi: Math.max(0, oiTotal - shareLeaders.reduce((s, m) => s + m.oiUsd, 0)),
      tone: "faint" as const,
    },
  ];

  const vol = series?.volume;
  const oi = series?.openInterest;
  const net = series?.netFlow;
  const inflow = series?.inflow;
  const outflow = series?.outflow;
  const active = series?.activeAccounts;
  const fresh = series?.newAccounts;
  const fees = series?.fees ?? null;
  const makerFees = series?.makerFees ?? null;
  const takerFees = series?.takerFees ?? null;

  return (
    <div>
      <PageHead
        title="Lighter exchange overview"
        note="Open interest, volume, fees, capital flows and account growth across every market."
      />

      {/* ── hero band ──────────────────────────────────────── */}
      <div className="grid border-b border-line bg-panel lg:grid-cols-[404px_minmax(0,1fr)]">
        <div className="min-w-0 border-line lg:border-r">
          <MetricCell
            label="Open interest"
            chip={<Chip>BOTH SIDES</Chip>}
            value={usdCompact(o.openInterest)}
            scale="hero"
            delta={o.oiChangePct}
            sub={
              o.oiChangeAbs != null
                ? `${o.oiChangeAbs >= 0 ? "+" : "−"}${usdCompact(Math.abs(o.oiChangeAbs), 1)} on the prior day`
                : undefined
            }
          >
            <div className="mt-3.5">
              <Sparkline
                points={o.oiSeries.map((p) => p.v)}
                width={356}
                height={42}
                dir={dirOf(o.oiChangePct)}
                className="h-auto max-w-full"
              />
              <Measure width={356} className="mt-2 max-w-full" />
            </div>
          </MetricCell>
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
          <MetricCell
            label="Volume 24h"
            value={usdCompact(o.volume24h)}
            sub={
              o.volumeVs7dPct != null ? (
                <span className="flex items-center gap-1.5">
                  <Delta value={o.volumeVs7dPct} className="text-[10.5px]" />
                  <span>vs 7-day mean</span>
                </span>
              ) : undefined
            }
          />
          <MetricCell
            label="Turnover"
            value={turnover != null ? `${turnover.toFixed(2)}×` : "—"}
            sub="volume ÷ open int."
          />
          <MetricCell
            label="Throughput"
            value={o.tps != null ? num(o.tps) : "—"}
            sub="transactions / second"
          />
          <MetricCell
            label="Liquidated"
            value={usdCompact(o.liquidations24h, 1)}
            tone="down"
            sub="last full day, UTC"
          />
          <MetricCell
            label="Accounts"
            value={o.totalAccounts != null ? num(o.totalAccounts) : "—"}
            sub={
              o.newAccounts24h != null ? (
                <span className="text-up">+{num(o.newAccounts24h)} last full day</span>
              ) : undefined
            }
          />
        </div>
      </div>

      {/* ── since genesis ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-7 gap-y-3 border-b border-line bg-rail px-5 py-3">
        <div className="border-r border-line pr-6">
          <Label>Since genesis</Label>
          <div className="figure text-[9px] text-ink-5">17 Jan 2025</div>
        </div>
        <GenesisFig v={usdCompact(o.genesis.volume, 2)} l="traded" />
        <GenesisFig v={usdCompact(o.genesis.revenue, 2)} l="protocol revenue" />
        <GenesisFig v={compact(o.genesis.trades, 2)} l="trades" />
        <GenesisFig v={num(o.summary.count)} l="markets" />
        <div className="grow" />
        {o.genesis.activeAccounts != null && (
          <GenesisFig
            v={num(o.genesis.activeAccounts)}
            l="active on the last full day"
            up
          />
        )}
        <AsOf asOf={overview.asOf} ttl={overview.ttl} source={overview.source} />
      </div>

      <WatchlistStrip markets={strip} />

      {/* ── charts + tables ────────────────────────────────── */}
      <div className="grid lg:grid-cols-[minmax(0,1fr)_384px]">
        <div className="min-w-0 border-line lg:border-r">
          {vol && oi && vol.values.length > 1 ? (
            <RangeScope param="range" length={vol.values.length} initial="30d">
              <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
                <h2 className="text-[13px] font-semibold tracking-[-0.005em]">
                  Activity
                </h2>
                <RangeNote prefix="daily, UTC" />
                <div className="grow" />
                <RangeToggle />
              </div>
              {/* small multiples — never a dual axis */}
              <div className="grid border-b border-line md:grid-cols-2 xl:grid-cols-3">
                <div className="min-w-0 border-b border-line p-5 md:border-r md:border-b-0">
                  <SectionHeader title="Daily volume" note="dashed line is the mean">
                    <span className="figure text-[11px] text-ink-3">
                      avg{" "}
                      <RangedFigure
                        series={vol}
                        stat="mean"
                        format={{ as: "usdCompact", dp: 2 }}
                        className="text-ink"
                      />
                    </span>
                  </SectionHeader>
                  <RangedChart
                    series={vol}
                    variant="bar"
                    valueLabel="traded"
                    showMean
                    height={172}
                    format={{ as: "usdCompact", dp: 1 }}
                  />
                </div>
                <div className="min-w-0 border-line p-5 xl:border-r">
                  <SectionHeader title="Open interest" note="axis is not zero-based" />
                  <RangedChart
                    series={oi}
                    variant="area"
                    tone="info"
                    valueLabel="open interest, both sides"
                    height={172}
                    format={{ as: "usdCompact", dp: 2 }}
                  />
                </div>
                {fees && makerFees && takerFees ? (
                  <div className="min-w-0 border-t border-line p-5 md:col-span-2 xl:col-span-1 xl:border-t-0">
                    <SectionHeader title="Daily fees" note="maker + taker">
                      <span className="figure text-[11px] text-ink-3">
                        total{" "}
                        <RangedFigure
                          series={fees}
                          stat="sum"
                          format={{ as: "usdCompact", dp: 2 }}
                          className="text-ink"
                        />
                      </span>
                    </SectionHeader>
                    <RangedChart
                      series={fees}
                      variant="bar"
                      valueLabel="trading fees"
                      height={172}
                      format={{ as: "usdCompact", dp: 1 }}
                      details={[
                        { label: "taker", series: takerFees, format: { as: "usdCompact", dp: 2 } },
                        { label: "maker", series: makerFees, format: { as: "usdCompact", dp: 2 } },
                      ]}
                    />
                  </div>
                ) : null}
              </div>
            </RangeScope>
          ) : (
            <p className="border-b border-line py-14 text-center text-[12.5px] text-ink-3">
              Exchange history is unavailable right now.
            </p>
          )}

          {/* markets */}
          <div className="border-b border-line p-5">
            <SectionHeader title="Markets" note="by open interest">
              <IntentLink
                href="/markets"
                className="figure ctl -my-1.5 py-1.5 text-[11px] text-ink-3 hover:text-ink"
              >
                All {o.summary.count} →
              </IntentLink>
            </SectionHeader>

            <div className="overflow-x-auto">
              <div className="min-w-[780px]">
                <div
                  className={`label grid items-center gap-x-4 border-b border-edge pb-2.5 ${MARKET_COLS}`}
                >
                  <span>Market</span>
                  <span className="text-right">Mark</span>
                  <span className="text-right">24h</span>
                  <span className="text-right">Open interest</span>
                  <span className="text-right">Volume 24h</span>
                  <span className="text-right">Funding 8h</span>
                  <span className="text-right">Day range</span>
                </div>
                {top.map((m) => (
                  <IntentLink
                    key={m.marketId}
                    href={`/markets/${m.symbol}`}
                    className={`row-hit grid items-center gap-x-4 border-b border-hair py-2.5 last:border-0 ${MARKET_COLS}`}
                  >
                    <span className="flex items-center gap-2">
                      <TokenIcon src={m.icon} symbol={m.symbol} size={16} />
                      <span className="text-[13px] font-semibold">{m.symbol}</span>
                      {ASSET_CLASS_TAG[m.assetClass] && (
                        <span className="figure text-[8.5px] tracking-[0.07em] text-ink-3">
                          {ASSET_CLASS_TAG[m.assetClass]}
                        </span>
                      )}
                    </span>
                    <Figure className="text-right text-[12.5px]">
                      {price(m.markPrice)}
                    </Figure>
                    <Delta
                      value={m.change24h}
                      glyph={false}
                      className="text-right text-[12.5px]"
                    />
                    <span className="flex flex-col items-end gap-1">
                      <Figure className="text-[12.5px]">{usdCompact(m.oiUsd, 1)}</Figure>
                      <MagnitudeBar value={m.oiUsd} max={maxOi} width={96} />
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <Figure className="text-[12.5px] text-ink-2">
                        {usdCompact(m.volume24h, 1)}
                      </Figure>
                      <MagnitudeBar
                        value={m.volume24h}
                        max={maxVol}
                        width={108}
                        tone="neutral"
                      />
                    </span>
                    <Figure
                      className={`text-right text-[12px] ${
                        m.funding == null
                          ? "text-ink-4"
                          : m.funding >= 0
                            ? "text-up"
                            : "text-down"
                      }`}
                    >
                      {m.funding == null ? "—" : ratePct(m.funding)}
                    </Figure>
                    <span className="flex items-center justify-end gap-2.5">
                      <Figure className="text-[10px] text-ink-4">
                        {compact(m.dayLow, 1)}
                      </Figure>
                      <RangeMarker pos={m.rangePos} dir={dirOf(m.change24h)} />
                      <Figure className="text-[10px] text-ink-4">
                        {compact(m.dayHigh, 1)}
                      </Figure>
                    </span>
                  </IntentLink>
                ))}
              </div>
            </div>
          </div>

          {/* capital & accounts */}
          {net && inflow && outflow && active && fresh && net.values.length > 1 ? (
            <RangeScope param="flow" length={net.values.length} initial="30d">
              <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
                <h2 className="text-[13px] font-semibold tracking-[-0.005em]">
                  Capital &amp; accounts
                </h2>
                <RangeNote prefix="daily, UTC" />
                <div className="grow" />
                <RangeToggle />
              </div>
              <div className="grid xl:grid-cols-3">
                <div className="min-w-0 border-b border-line p-5 xl:border-r xl:border-b-0">
                  <SectionHeader title="Net deposits" note="in − out">
                    <RangedFigure
                      series={net}
                      stat="sum"
                      signed
                      format={{ as: "usdSigned", dp: 2 }}
                      className="text-[12px]"
                    />
                  </SectionHeader>
                  <RangedChart
                    series={net}
                    variant="diverging"
                    valueLabel="net deposits"
                    height={168}
                    format={{ as: "usdSigned", dp: 1 }}
                    details={[
                      {
                        label: "deposited",
                        series: inflow,
                        format: { as: "usdCompact", dp: 2 },
                        tone: "up",
                      },
                      {
                        label: "withdrawn",
                        series: outflow,
                        format: { as: "usdCompact", dp: 2 },
                        tone: "down",
                      },
                    ]}
                  />
                  <div className="figure mt-2 flex justify-between text-[10px] text-ink-3">
                    <span>
                      in{" "}
                      <RangedFigure
                        series={inflow}
                        stat="sum"
                        format={{ as: "usdCompact", dp: 1 }}
                        className="text-ink-2"
                      />
                    </span>
                    <span>
                      out{" "}
                      <RangedFigure
                        series={outflow}
                        stat="sum"
                        format={{ as: "usdCompact", dp: 1 }}
                        className="text-ink-2"
                      />
                    </span>
                  </div>
                </div>

                <div className="min-w-0 border-b border-line p-5 xl:border-r xl:border-b-0">
                  <SectionHeader title="Active accounts" note="traded that day">
                    <span className="figure text-[11px] text-ink-3">
                      avg{" "}
                      <RangedFigure
                        series={active}
                        stat="mean"
                        format={{ as: "compact" }}
                        className="text-ink"
                      />
                    </span>
                  </SectionHeader>
                  <RangedChart
                    series={active}
                    variant="area"
                    tone="info"
                    valueLabel="active accounts"
                    height={168}
                    format={{ as: "compact" }}
                  />
                </div>

                <div className="min-w-0 p-5">
                  <SectionHeader title="New accounts" note="created that day">
                    <span className="figure text-[11px] text-ink-3">
                      total{" "}
                      <RangedFigure
                        series={fresh}
                        stat="sum"
                        format={{ as: "compact" }}
                        className="text-ink"
                      />
                    </span>
                  </SectionHeader>
                  <RangedChart
                    series={fresh}
                    variant="bar"
                    valueLabel="new accounts"
                    height={168}
                    format={{ as: "compact" }}
                  />
                </div>
              </div>
            </RangeScope>
          ) : null}
        </div>

        {/* ── right rail ───────────────────────────────────── */}
        <aside className="bg-rail">
          <div className="border-b border-line p-5">
            <SectionHeader title="Market breadth" note={`${o.summary.count} markets`} />
            <div className="mb-2.5 flex h-[22px] gap-[1.5px]">
              <div
                className="flex items-center rounded-l-[2px] bg-up-deep pl-2"
                style={{ width: `${(breadth.up / breadthTotal) * 100}%` }}
              >
                <Figure className="text-[10.5px] text-up">{breadth.up}</Figure>
              </div>
              <div
                className="bg-edge"
                style={{ width: `${(breadth.flat / breadthTotal) * 100}%` }}
              />
              <div
                className="flex items-center justify-end rounded-r-[2px] bg-down-deep pr-2"
                style={{ width: `${(breadth.down / breadthTotal) * 100}%` }}
              >
                <Figure className="text-[10.5px] text-down">{breadth.down}</Figure>
              </div>
            </div>
            <div className="figure flex justify-between text-[10px] text-ink-3">
              <span>advancing</span>
              <span>{breadth.flat} flat</span>
              <span>declining</span>
            </div>
          </div>

          <div className="border-b border-line p-5">
            <SectionHeader title="Market share" note="24h volume · open interest" />
            {volTotal > 0 && oiTotal > 0 ? (
              <>
                <Label className="mb-1.5">Volume</Label>
                <ProportionBar
                  legend={false}
                  segments={shareRows.map((r) => ({ key: r.key, label: r.label, value: r.vol, tone: r.tone }))}
                />
                <Label className="mt-3 mb-1.5">Open interest</Label>
                <ProportionBar
                  legend={false}
                  segments={shareRows.map((r) => ({ key: r.key, label: r.label, value: r.oi, tone: r.tone }))}
                />
                <div className="mt-3.5 flex flex-col">
                  <div className="label grid grid-cols-[minmax(0,1fr)_64px_64px] gap-2 pb-1.5">
                    <span>Market</span>
                    <span className="text-right">Volume</span>
                    <span className="text-right">Open int.</span>
                  </div>
                  {shareRows.map((r) => (
                    <div
                      key={r.key}
                      className="grid grid-cols-[minmax(0,1fr)_64px_64px] items-center gap-2 border-t border-hair py-1.5"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className={`size-[7px] shrink-0 rounded-[2px] ${SEGMENT_FILL[r.tone]}`}
                          aria-hidden="true"
                        />
                        {r.href ? (
                          <IntentLink
                            href={r.href}
                            className="truncate text-[12px] font-semibold hover:underline hover:decoration-edge hover:underline-offset-4"
                          >
                            {r.label}
                          </IntentLink>
                        ) : (
                          <span className="truncate text-[12px] text-ink-3">{r.label}</span>
                        )}
                      </span>
                      <Figure className="text-right text-[11.5px]">
                        {((r.vol / volTotal) * 100).toFixed(1)}%
                      </Figure>
                      <Figure className="text-right text-[11.5px] text-ink-2">
                        {((r.oi / oiTotal) * 100).toFixed(1)}%
                      </Figure>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-[11.5px] text-ink-3">Market share is unavailable right now.</p>
            )}
          </div>

          <div className="border-b border-line p-5">
            <SectionHeader title="By asset class" note="24h volume" />
            <div className="flex flex-col gap-2.5">
              {o.summary.byClass.map((c) => (
                <div key={c.key} className="flex items-center gap-3">
                  <span className="w-[74px] text-[12px] capitalize">{c.key}</span>
                  <MagnitudeBar
                    value={c.volume}
                    max={o.summary.byClass[0]?.volume || 1}
                    className="grow"
                    height={4}
                    align="left"
                  />
                  <Figure className="w-[62px] text-right text-[11.5px] text-ink-2">
                    {usdCompact(c.volume, 1)}
                  </Figure>
                  <Figure className="w-[34px] text-right text-[10.5px] text-ink-4">
                    {c.count}
                  </Figure>
                </div>
              ))}
            </div>
          </div>

          <div className="border-b border-line p-5">
            <SectionHeader title="Open interest moves" note="24h · books over $1M" />
            {oiRising.length + oiFalling.length > 0 ? (
              <div className="flex flex-col gap-4">
                {([
                  ["Rising", oiRising],
                  ["Falling", oiFalling],
                ] as const).map(([label, list]) =>
                  list.length === 0 ? null : (
                    <div key={label}>
                      <Label className="mb-1.5">{label}</Label>
                      {list.map((x) => (
                        <IntentLink
                          key={x.id}
                          href={`/markets/${x.symbol}`}
                          className="row-hit grid grid-cols-[minmax(0,1fr)_64px_56px] items-baseline gap-x-2 border-t border-hair py-1.5"
                        >
                          <span className="flex min-w-0 items-baseline gap-2">
                            <span className="text-[12px] font-semibold">{x.symbol}</span>
                            {x.regime && (
                              <span className="figure truncate text-[9.5px] text-ink-4">
                                {REGIME[x.regime].label.toLowerCase()}
                              </span>
                            )}
                          </span>
                          <Figure className="text-right text-[11px] text-ink-3">{usdCompact(x.oi, 1)}</Figure>
                          <Delta value={x.d24h} glyph={false} decimals={1} className="text-right text-[11.5px]" />
                        </IntentLink>
                      ))}
                    </div>
                  ),
                )}
              </div>
            ) : (
              <p className="text-[11.5px] leading-relaxed text-ink-3">
                {oiLatest?.since
                  ? `Recording since ${dayLabel(Date.parse(oiLatest.since))}. The day's biggest moves appear once a full 24 hours is in.`
                  : "Open interest is being recorded per market. The day's biggest moves appear here once a full 24 hours is in."}
              </p>
            )}
          </div>

          <div className="p-5">
            <SectionHeader title="Top traders · 24h" note="by PnL">
              <IntentLink
                href="/leaderboard"
                className="figure ctl -my-1.5 py-1.5 text-[11px] text-ink-3 hover:text-ink"
              >
                All →
              </IntentLink>
            </SectionHeader>
            <div className="flex flex-col">
              {o.leaders.map((e) => (
                <IntentLink
                  key={e.address}
                  href={`/a/${e.address}`}
                  className="row-hit grid grid-cols-[18px_minmax(0,1fr)_84px_52px] items-center border-t border-hair py-2"
                >
                  <Figure className="text-[10.5px] text-ink-3">{e.rank}</Figure>
                  <Figure className="text-[11px]">{addr(e.address, 6, 4)}</Figure>
                  <Figure
                    className={`text-right text-[11.5px] ${
                      e.pnl >= 0 ? "text-up" : "text-down"
                    }`}
                  >
                    {usdSignedCompact(e.pnl)}
                  </Figure>
                  <Delta
                    value={e.roi}
                    glyph={false}
                    decimals={1}
                    className="text-right text-[10.5px]"
                  />
                </IntentLink>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function GenesisFig({ v, l, up }: { v: string; l: string; up?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <Figure
        className={`text-[15px] font-medium tracking-[-0.02em] ${up ? "text-up" : ""}`}
      >
        {v}
      </Figure>
      <span className="text-[11px] text-ink-3">{l}</span>
    </div>
  );
}
