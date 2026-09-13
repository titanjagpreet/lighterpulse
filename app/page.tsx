import { IntentLink } from "@/components/terminal/intent-link";
import type { Metadata } from "next";
import { Wordmark } from "@/components/terminal/mark";
import { CommandSearch } from "@/components/terminal/command-search";
import { LiveHeight } from "@/components/terminal/live-height";
import {
  MarketField,
  MarketFieldLegend,
} from "@/components/terminal/market-field";
import { SeriesChart } from "@/components/terminal/charts";
import { TokenIcon } from "@/components/terminal/token-icon";
import { SiteFooter } from "@/components/terminal/site-footer";
import { XLogo } from "@/components/terminal/x-logo";
import { JsonLd } from "@/components/json-ld";
import { SITE_X, siteSchema } from "@/lib/site";
import {
  Delta,
  Figure,
  Label,
  MagnitudeBar,
  Measure,
} from "@/components/terminal/primitives";
import { getOverview } from "@/lib/lighter/overview";
import { getMetric } from "@/lib/lighter/metrics";
import { ASSET_CLASS_TAG } from "@/lib/lighter/types";
import {
  addr,
  compact,
  num,
  price,
  usd,
  usdCompact,
  usdSigned,
  dirOf,
} from "@/lib/format";

export const revalidate = 15;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const NAV = [
  { href: "/markets", label: "Markets" },
  { href: "/funding", label: "Funding" },
  { href: "/liquidations", label: "Liquidations" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/explorer", label: "Explorer" },
];

export default async function LandingPage() {
  const [overview, liqSeries] = await Promise.all([
    getOverview(),
    getMetric("liquidation_volume", "w").catch(() => null),
  ]);

  const o = overview.data;
  const topMarkets = o.markets.slice(0, 5);
  const maxVol = Math.max(...topMarkets.map((m) => m.volume24h), 1);
  const leaders = o.leaders.slice(0, 5);
  const exampleAddress = leaders[0]?.address;
  const liq = liqSeries?.data ?? [];

  return (
    <div className="min-h-screen bg-surface">
      {/* ── header ─────────────────────────────────────────── */}
      <header className="flex h-14 items-center gap-8 border-b border-line px-6 sm:px-11">
        <Wordmark size={16} />
        <div className="grow" />
        <nav className="hidden items-center gap-6 md:flex" aria-label="Sections">
          {NAV.map((n) => (
            <IntentLink
              key={n.href}
              href={n.href}
              className="ctl text-[12.5px] text-ink-2 hover:text-ink"
            >
              {n.label}
            </IntentLink>
          ))}
        </nav>
        <a
          href={SITE_X.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`LighterPulse on X, ${SITE_X.handle}`}
          // Hidden on phones, where it pushed "Open terminal" onto two lines;
          // the footer carries it there.
          className="ctl -mx-1 hidden items-center gap-2 px-1 py-1 text-[12.5px] text-ink-2 hover:text-ink sm:flex"
        >
          <XLogo size={13} />
          <span className="hidden md:inline">{SITE_X.handle}</span>
        </a>
        <IntentLink
          href="/overview"
          className="ctl figure rounded-[3px] border border-edge px-3.5 py-1.5 text-[11.5px] text-ink hover:border-ink-4"
        >
          Open terminal →
        </IntentLink>
      </header>

      {/* ── hero ───────────────────────────────────────────── */}
      <section className="px-6 pt-14 sm:px-11 sm:pt-[72px]">
        <div className="grid items-center gap-13 lg:grid-cols-[minmax(0,1fr)_604px]">
          <div>
            <div className="mb-7 flex flex-wrap items-center gap-2.5">
              <LiveHeight />
              <span className="figure text-[10px] tracking-[0.13em] text-ink-3 uppercase">
                Lighter mainnet
              </span>
            </div>

            <h1 className="display mb-6 text-[clamp(2.75rem,7vw,4.625rem)]">
              Read the whole exchange.
            </h1>

            <p className="mb-10 max-w-[54ch] text-[16.5px] leading-[1.6] text-ink-2">
              Live market data, liquidations, funding across venues, trader
              leaderboards and a full block explorer for Lighter — in one terminal.
            </p>

            <div className="mb-7 flex flex-wrap items-stretch gap-2.5">
              <CommandSearch
                size="lg"
                placeholder="Track any address, transaction or block"
                className="w-full max-w-[470px]"
              />
              <IntentLink
                href="/overview"
                className="figure ctl flex h-[46px] items-center rounded-[4px] bg-ink px-6 text-[13px] font-medium text-surface hover:bg-white"
              >
                Open terminal
              </IntentLink>
            </div>

            <Measure className="max-w-[640px]" />
          </div>

          {/* the exchange, as an object */}
          <div className="flex flex-col gap-3.5">
            <MarketField markets={o.markets} />
            <MarketFieldLegend count={o.summary.count} />
          </div>
        </div>
      </section>

      {/* ── live band ──────────────────────────────────────── */}
      <section className="mt-11 grid grid-cols-2 divide-x divide-line border-y border-line bg-panel sm:grid-cols-3 lg:grid-cols-5">
        <LandingStat
          label="Open interest"
          value={usdCompact(o.openInterest)}
          delta={o.oiChangePct}
        />
        <LandingStat
          label="Volume 24h"
          value={usdCompact(o.volume24h)}
          delta={o.volumeVs7dPct}
        />
        <LandingStat
          label="Throughput"
          value={o.tps != null ? num(o.tps) : "—"}
          unit="tps"
        />
        <LandingStat
          label="Markets"
          value={num(o.summary.count)}
          unit="perp"
        />
        <LandingStat
          label="Accounts"
          value={o.totalAccounts != null ? num(o.totalAccounts) : "—"}
          sub={
            o.newAccounts24h != null
              ? `+${num(o.newAccounts24h)} today`
              : undefined
          }
        />
      </section>

      {/* ── 01 markets ─────────────────────────────────────── */}
      <Section
        n="01"
        eyebrow="Markets"
        title={`${o.summary.count} markets, and no longer just crypto.`}
        copy="Equities, indices, metals and FX now trade beside perps. Open interest, mark against index, day range, funding and max leverage on every one."
        cta={{ href: "/markets", label: "Open markets" }}
      >
        <div className="overflow-x-auto">
        <div className="min-w-[520px]">
        <div className="label grid grid-cols-[92px_88px_66px_96px_minmax(0,1fr)] items-center border-b border-edge pb-2.5">
          <span>Market</span>
          <span className="text-right">Mark</span>
          <span className="text-right">24h</span>
          <span className="text-right">Open int.</span>
          <span className="text-right">Volume 24h</span>
        </div>
        {topMarkets.map((m) => {
          const tag = ASSET_CLASS_TAG[m.assetClass];
          return (
            <IntentLink
              key={m.marketId}
              href={`/markets/${m.symbol}`}
              className="row-hit grid grid-cols-[92px_88px_66px_96px_minmax(0,1fr)] items-center border-b border-hair py-3 last:border-0"
            >
              <span className="flex items-center gap-2">
                <TokenIcon src={m.icon} symbol={m.symbol} size={16} />
                <span className="text-[13px] font-semibold">{m.symbol}</span>
                {tag && (
                  <span
                    className={`figure text-[8.5px] tracking-[0.07em] ${
                      m.assetClass === "commodity"
                        ? "text-warn"
                        : m.assetClass === "index"
                          ? "text-info"
                          : "text-ink-3"
                    }`}
                  >
                    {tag}
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
              <Figure className="text-right text-[12.5px]">
                {usdCompact(m.oiUsd, 1)}
              </Figure>
              <span className="flex flex-col items-end gap-1.5">
                <Figure className="text-[12.5px] text-ink-2">
                  {usdCompact(m.volume24h, 1)}
                </Figure>
                <MagnitudeBar
                  value={m.volume24h}
                  max={maxVol}
                  width={128}
                  tone="up"
                />
              </span>
            </IntentLink>
          );
        })}
        </div>
        </div>
      </Section>

      {/* ── 02 liquidations ────────────────────────────────── */}
      <Section
        n="02"
        eyebrow="Liquidations"
        title="See the wall before you hit it."
        copy="Daily liquidation volume back to genesis, and a live tape of every forced exit on the exchange as it clears."
        cta={{ href: "/liquidations", label: "Open liquidations" }}
      >
        <div className="mb-4 flex items-baseline gap-3">
          <Label>Liquidated per day</Label>
          <span className="figure text-[10.5px] text-ink-3">last 7 sessions</span>
          <div className="grow" />
          <Figure className="text-[15px] font-medium text-down">
            {usdCompact(o.liquidations24h, 2)}
          </Figure>
          <span className="figure text-[10.5px] text-ink-3">last full day</span>
        </div>
        {liq.length > 1 ? (
          <SeriesChart
            points={liq}
            variant="bar"
            valueLabel="liquidated"
            height={168}
            tone="brand"
            format={{ as: "usdCompact", dp: 1 }}
            xLabels={liq.map((p) =>
              new Date(p.t).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
            )}
          />
        ) : (
          <p className="py-8 text-center text-[12.5px] text-ink-3">
            Liquidation history is unavailable right now.
          </p>
        )}
      </Section>

      {/* ── 03 traders ─────────────────────────────────────── */}
      <Section
        n="03"
        eyebrow="Traders"
        title={`All ${o.totalAccounts ? num(o.totalAccounts) : ""} accounts, ranked.`}
        copy="PnL, return and volume over 24 hours, a week, a month or all time. Every row opens the full book behind it."
        cta={{ href: "/leaderboard", label: "Open leaderboard" }}
      >
        <div className="overflow-x-auto">
        <div className="min-w-[520px]">
        <div className="label grid grid-cols-[36px_minmax(0,1fr)_116px_116px_78px] items-center border-b border-edge pb-2.5">
          <span>#</span>
          <span>Account</span>
          <span className="text-right">Account value</span>
          <span className="text-right">PnL 24h</span>
          <span className="text-right">Return</span>
        </div>
        {leaders.map((e) => (
          <IntentLink
            key={e.address}
            href={`/a/${e.address}`}
            className="row-hit grid grid-cols-[36px_minmax(0,1fr)_116px_116px_78px] items-center border-b border-hair py-3 last:border-0"
          >
            <Figure className="text-[12px] text-ink-3">{e.rank}</Figure>
            <Figure className="text-[12.5px]">{addr(e.address)}</Figure>
            <Figure className="text-right text-[12.5px]">
              {usd(e.accountValue)}
            </Figure>
            <Figure
              className={`text-right text-[12.5px] font-medium ${
                dirOf(e.pnl) === "down" ? "text-down" : "text-up"
              }`}
            >
              {usdSigned(e.pnl)}
            </Figure>
            <Delta
              value={e.roi}
              glyph={false}
              className="text-right text-[12.5px]"
            />
          </IntentLink>
        ))}
        </div>
        </div>
      </Section>

      {/* ── 04 your book ───────────────────────────────────── */}
      <Section
        n="04"
        eyebrow="Your book"
        title="Paste an address. Watch it move."
        copy="Positions, funding cost and distance to liquidation — repriced live over WebSocket. No wallet connection, no signature, no account."
      >
        <div className="flex flex-col gap-5">
          <CommandSearch
            size="lg"
            placeholder="0x… any Lighter address"
            className="max-w-[470px]"
          />
          {exampleAddress && (
            <p className="text-[12.5px] text-ink-3">
              Or try the top trader:{" "}
              <IntentLink
                href={`/a/${exampleAddress}`}
                className="figure text-ink underline decoration-edge underline-offset-4 hover:decoration-ink-3"
              >
                {addr(exampleAddress)}
              </IntentLink>
            </p>
          )}
          <div className="mt-1 grid gap-px border-t border-hair pt-5 sm:grid-cols-3">
            {[
              ["Live positions", "Size, entry, mark and PnL, updating tick by tick."],
              ["Distance to liquidation", "A bar per position that tightens as risk builds."],
              ["True cost of carry", "Funding paid and received, per position."],
            ].map(([h, s]) => (
              <div key={h} className="pr-6">
                <div className="mb-1.5 text-[12.5px] font-medium">{h}</div>
                <p className="text-[12px] leading-[1.55] text-ink-3">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── since genesis ──────────────────────────────────── */}
      <section className="flex flex-wrap items-center gap-x-8 gap-y-4 border-y border-line bg-panel px-6 py-6 sm:px-11">
        <div className="border-r border-line pr-8">
          <Label className="mb-1">Since genesis</Label>
          <div className="figure text-[10px] text-ink-4">17 Jan 2025</div>
        </div>
        <GenesisStat value={usdCompact(o.genesis.volume, 2)} label="traded" />
        <GenesisStat
          value={usdCompact(o.genesis.revenue, 2)}
          label="protocol revenue"
        />
        <GenesisStat value={compact(o.genesis.trades, 2)} label="trades" />
        <div className="grow" />
        {o.genesis.activeAccounts != null && (
          <GenesisStat
            value={num(o.genesis.activeAccounts)}
            label="active in the last 24h"
            tone="up"
          />
        )}
      </section>

      {/* ── footer ─────────────────────────────────────────── */}
      <JsonLd data={siteSchema()} />
      <SiteFooter markets={o.markets.slice(0, 8).map((m) => m.symbol)} />
    </div>
  );
}

/* ── local pieces ─────────────────────────────────────────── */

function LandingStat({
  label,
  value,
  delta,
  unit,
  sub,
}: {
  label: string;
  value: string;
  delta?: number | null;
  unit?: string;
  sub?: string;
}) {
  return (
    <div className="px-5 py-5 sm:px-7">
      <Label className="mb-2.5">{label}</Label>
      <div className="flex items-baseline gap-2.5">
        <Figure className="text-[clamp(1.15rem,2vw,1.5625rem)] font-medium tracking-[-0.028em]">
          {value}
        </Figure>
        {unit && <span className="figure text-[11px] text-ink-3">{unit}</span>}
        {delta != null && <Delta value={delta} className="text-[11px]" />}
      </div>
      {sub && <div className="figure mt-1 text-[10.5px] text-up">{sub}</div>}
    </div>
  );
}

function GenesisStat({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone?: "up";
}) {
  return (
    <div className="flex items-baseline gap-2.5">
      <Figure
        className={`text-[18px] font-medium tracking-[-0.024em] ${
          tone === "up" ? "text-up" : ""
        }`}
      >
        {value}
      </Figure>
      <span className="text-[12px] text-ink-3">{label}</span>
    </div>
  );
}

function Section({
  n,
  eyebrow,
  title,
  copy,
  cta,
  children,
}: {
  n: string;
  eyebrow: string;
  title: string;
  copy: string;
  cta?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-10 border-b border-line px-6 py-14 sm:px-11 lg:grid-cols-[372px_minmax(0,1fr)] lg:gap-16">
      <div>
        <div className="mb-5 flex items-baseline gap-3">
          <Figure className="text-[11px] font-semibold tracking-[0.1em] text-brand">
            {n}
          </Figure>
          <Label>{eyebrow}</Label>
        </div>
        <h2 className="mb-4 text-[30px] leading-[1.12] font-semibold tracking-[-0.028em] text-balance">
          {title}
        </h2>
        <p className="mb-6 text-[14px] leading-[1.62] text-ink-2">{copy}</p>
        {cta && (
          <IntentLink
            href={cta.href}
            className="figure ctl -mt-1.5 inline-block border-b border-edge pt-1.5 pb-1 text-[12px] text-ink-2 hover:border-ink-3 hover:text-ink"
          >
            {cta.label} →
          </IntentLink>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}