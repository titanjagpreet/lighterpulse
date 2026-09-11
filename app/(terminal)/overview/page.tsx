import Link from "next/link";
import type { Metadata } from "next";
import { SeriesChart, Sparkline } from "@/components/terminal/charts";
import {
  AsOf,
  Chip,
  Delta,
  Figure,
  Label,
  MagnitudeBar,
  Measure,
  MetricCell,
  RangeMarker,
  SectionHeader,
} from "@/components/terminal/primitives";
import { getOverview } from "@/lib/lighter/overview";
import { ASSET_CLASS_TAG } from "@/lib/lighter/types";
import {
  addr,
  compact,
  dirOf,
  num,
  price,
  ratePct,
  usdCompact,
  usdSignedCompact,
} from "@/lib/format";

export const revalidate = 15;

export const metadata: Metadata = {
  title: "Overview",
  description:
    "Live open interest, volume, throughput and market breadth across every Lighter market.",
};

const dayLabel = (t: number) =>
  new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default async function OverviewPage() {
  const overview = await getOverview();
  const o = overview.data;

  const top = o.markets.slice(0, 7);
  const maxOi = Math.max(...top.map((m) => m.oiUsd), 1);
  const maxVol = Math.max(...top.map((m) => m.volume24h), 1);
  const { breadth } = o.summary;
  const breadthTotal = breadth.up + breadth.down + breadth.flat || 1;

  const turnover =
    o.volume24h && o.openInterest ? o.volume24h / o.openInterest : null;

  return (
    <div>
      {/* ── hero band ──────────────────────────────────────── */}
      <div className="grid border-b border-line bg-panel lg:grid-cols-[404px_minmax(0,1fr)]">
        <div className="border-line lg:border-r">
          <MetricCell
            label="Open interest"
            chip={<Chip>BOTH SIDES</Chip>}
            value={usdCompact(o.openInterest)}
            scale="hero"
            delta={o.oiChangePct}
            sub={
              o.oiChangeAbs != null
                ? `${o.oiChangeAbs >= 0 ? "+" : "−"}${usdCompact(Math.abs(o.oiChangeAbs), 1)} / 24h`
                : undefined
            }
          >
            <div className="mt-3.5">
              <Sparkline
                points={o.oiSeries.map((p) => p.v)}
                width={356}
                height={42}
                dir={dirOf(o.oiChangePct)}
              />
              <Measure width={356} className="mt-2" />
            </div>
          </MetricCell>
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
          <MetricCell
            label="Volume 24h"
            value={usdCompact(o.volume24h)}
            sub={
              o.volumeVs7dPct != null ? (
                <Delta value={o.volumeVs7dPct} className="text-[10.5px]" />
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
            label="Liquidated 24h"
            value={usdCompact(o.liquidations24h, 1)}
            tone="down"
            sub="exchange-wide"
          />
          <MetricCell
            label="Accounts"
            value={o.totalAccounts != null ? num(o.totalAccounts) : "—"}
            sub={
              o.newAccounts24h != null ? (
                <span className="text-up">+{num(o.newAccounts24h)} today</span>
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
            l="active in the last 24h"
            up
          />
        )}
        <AsOf age={overview.age} stale={overview.stale} />
      </div>

      {/* ── charts + tables ────────────────────────────────── */}
      <div className="grid lg:grid-cols-[minmax(0,1fr)_384px]">
        <div className="border-line lg:border-r">
          {/* two small multiples — never a dual axis */}
          <div className="grid border-b border-line md:grid-cols-2">
            <div className="border-line p-5 md:border-r">
              <SectionHeader
                title="Daily volume"
                note={`7-day mean ${usdCompact(
                  o.volumeSeries.length
                    ? o.volumeSeries.reduce((a, b) => a + b.v, 0) /
                        o.volumeSeries.length
                    : null,
                  2,
                )} · dashed`}
              />
              <SeriesChart
                points={o.volumeSeries}
                variant="bar"
                valueLabel="traded"
                showMean
                height={172}
                format={{ as: "usdCompact", dp: 1 }}
                xLabels={o.volumeSeries.map((p) => dayLabel(p.t))}
              />
            </div>
            <div className="p-5">
              <SectionHeader
                title="Open interest"
                note="axis is not zero-based"
              />
              <SeriesChart
                points={o.oiSeries}
                variant="area"
                tone="info"
                valueLabel="open interest, both sides"
                height={172}
                format={{ as: "usdCompact", dp: 2 }}
                xLabels={o.oiSeries.map((p) => dayLabel(p.t))}
              />
            </div>
          </div>

          {/* markets */}
          <div className="p-5">
            <SectionHeader title="Markets" note="by open interest">
              <Link
                href="/markets"
                className="figure ctl text-[11px] text-ink-3 hover:text-ink"
              >
                All {o.summary.count} →
              </Link>
            </SectionHeader>

            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                <div className="label grid grid-cols-[110px_96px_70px_112px_126px_92px_minmax(0,1fr)] items-center border-b border-edge pb-2.5">
                  <span>Market</span>
                  <span className="text-right">Mark</span>
                  <span className="text-right">24h</span>
                  <span className="text-right">Open interest</span>
                  <span className="text-right">Volume 24h</span>
                  <span className="text-right">Funding</span>
                  <span className="text-right">Day range</span>
                </div>
                {top.map((m) => (
                  <Link
                    key={m.marketId}
                    href={`/markets?symbol=${m.symbol}`}
                    className="row-hit grid grid-cols-[110px_96px_70px_112px_126px_92px_minmax(0,1fr)] items-center border-b border-hair py-2.5 last:border-0"
                  >
                    <span className="flex items-baseline gap-2">
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
                      <Figure className="text-[12.5px]">
                        {usdCompact(m.oiUsd, 1)}
                      </Figure>
                      <MagnitudeBar value={m.oiUsd} max={maxOi} width={100} />
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <Figure className="text-[12.5px] text-ink-2">
                        {usdCompact(m.volume24h, 1)}
                      </Figure>
                      <MagnitudeBar
                        value={m.volume24h}
                        max={maxVol}
                        width={114}
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
                  </Link>
                ))}
              </div>
            </div>
          </div>
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

          <div className="p-5">
            <SectionHeader title="Top traders · 24h" note="by PnL">
              <Link
                href="/leaderboard"
                className="figure ctl text-[11px] text-ink-3 hover:text-ink"
              >
                All →
              </Link>
            </SectionHeader>
            <div className="flex flex-col">
              {o.leaders.map((e) => (
                <Link
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
                </Link>
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
