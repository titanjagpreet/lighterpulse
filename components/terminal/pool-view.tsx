"use client";

import { IntentLink } from "./intent-link";
import { useEffect, useMemo, useState } from "react";
import { AsOf } from "./as-of";
import { Backtest } from "./backtest";
import { PositionsBook } from "./positions-book";
import { RangeNote, RangeScope, RangeToggle, RangedChart, useRange } from "./range";
import { SectionNav } from "./section-nav";
import { LighterLink } from "./lighter-link";
import { Chip, Empty, Figure, Label, MetricCell } from "./primitives";
import {
  MIN_APR_TVL,
  ZERO_ADDRESS,
  annualised,
  fetchPoolDetail,
  periodReturn,
  type PoolDetail,
  type PublicPool,
} from "@/lib/pools";
import { daysOf } from "@/lib/series";
import type { DailySeries } from "@/lib/lighter/types";
import { addr, dayLabel, num, usd, usdCompact, usdSigned } from "@/lib/format";
import { cn } from "@/lib/utils";

const DAY_MS = 86_400_000;

export const POOL_SECTIONS = [
  { id: "performance", label: "Performance" },
  { id: "backtest", label: "Backtest" },
  { id: "holdings", label: "Holdings" },
];

function aprOver(s: DailySeries, days: number | null): number | null {
  const r = periodReturn(s, days);
  return r ? annualised(r.ratio, r.days) : null;
}

const signedPct = (v: number | null, dp = 1) =>
  v == null ? "—" : `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(dp)}%`;

const toneOf = (v: number | null) => (v == null ? undefined : v >= 0 ? "up" : "down");

/**
 * Everything a pool's share-price history and book can say: returns, a
 * backtest and what it holds. The LLP page renders it from the server; a
 * vault's page loads it in the browser.
 */
export function PoolView({
  detail,
  rail,
  backtestNote,
}: {
  detail: PoolDetail;
  /** Extra content for the holdings rail, under the account figures. */
  rail?: React.ReactNode;
  backtestNote?: string;
}) {
  const s = detail.info.sharePrice;
  const r = detail.info.dailyReturns;
  const hasHistory = s.values.length > 1;
  // As in Lighter's app, a pool this small gets no annualised figures — a few
  // dollars' swing would read as hundreds of percent.
  const tiny = detail.tvl < MIN_APR_TVL;

  const apr30 = tiny ? null : aprOver(s, 30);
  const aprAll = tiny ? null : aprOver(s, null);
  const lastReturn = r.values.length ? r.values[r.values.length - 1] * 100 : null;
  const leverage = detail.tvl > 0 ? detail.notional / detail.tvl : null;

  // Share prices are tiny numbers of no meaning on their own; the growth of $1
  // deposited on the first day reads directly.
  const growth = useMemo<DailySeries>(
    () => ({ start: s.start, values: s.values.map((v) => v / (s.values[0] || 1)) }),
    [s],
  );

  return (
    <>
      <div className="grid grid-cols-2 divide-x divide-y divide-line border-b border-line bg-panel sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
        <MetricCell
          label="TVL"
          value={usdCompact(detail.tvl)}
          sub={`${num(detail.positions.length)} open positions`}
        />
        <MetricCell
          label="APR · 30 days"
          value={signedPct(apr30)}
          tone={toneOf(apr30)}
          sub={tiny ? "not shown under $1K TVL" : "share-price growth, annualised"}
        />
        <MetricCell
          label="APR · all time"
          value={signedPct(aprAll)}
          tone={toneOf(aprAll)}
          sub={
            tiny
              ? "not shown under $1K TVL"
              : hasHistory
                ? `since ${dayLabel(s.start, true)}`
                : undefined
          }
        />
        <MetricCell
          label="Sharpe"
          value={detail.info.sharpe != null ? detail.info.sharpe.toFixed(2) : "—"}
          sub={
            detail.info.apy != null && !tiny
              ? `Lighter lists ${signedPct(detail.info.apy)} APY`
              : "Lighter's figure"
          }
        />
        <MetricCell
          label="Last day"
          value={signedPct(lastReturn, 2)}
          tone={toneOf(lastReturn)}
          sub={r.values.length ? dayLabel(r.start + (r.values.length - 1) * DAY_MS, true) : undefined}
        />
      </div>

      {/* ── performance ─────────────────────────────────────── */}
      <section
        id="performance"
        aria-labelledby="performance-title"
        className="scroll-mt-[88px] border-b border-line"
      >
        {hasHistory ? (
          <RangeScope param="range" length={s.values.length} initial="all">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-3">
              <h2 id="performance-title" className="text-[13px] font-semibold tracking-[-0.005em]">
                Performance
              </h2>
              <RangeNote prefix="daily, UTC" />
              <div className="grow" />
              <RangeReturn series={s} withApr={!tiny} />
              <RangeToggle />
            </div>
            <div className="grid md:grid-cols-2">
              <div className="min-w-0 border-b border-line p-5 md:border-r md:border-b-0">
                <div className="mb-3 flex items-baseline gap-3">
                  <h3 className="text-[13px] font-semibold tracking-[-0.005em]">Growth of $1</h3>
                  <span className="figure text-[10.5px] text-ink-3">
                    deposited {dayLabel(s.start, true)} · axis is not zero-based
                  </span>
                </div>
                <RangedChart
                  series={growth}
                  variant="area"
                  valueLabel="value of $1"
                  height={196}
                  format={{ as: "usdPrice", dp: 3 }}
                  details={[{ label: "share price", series: s, format: { as: "usdPrice", dp: 6 } }]}
                />
              </div>
              <div className="min-w-0 p-5">
                <div className="mb-3 flex items-baseline gap-3">
                  <h3 className="text-[13px] font-semibold tracking-[-0.005em]">Daily return</h3>
                  <span className="figure text-[10.5px] text-ink-3">as Lighter reports it</span>
                </div>
                <RangedChart
                  series={r}
                  variant="diverging"
                  valueLabel="return that day"
                  height={196}
                  format={{ as: "ratePct", dp: 2 }}
                />
              </div>
            </div>
          </RangeScope>
        ) : (
          <>
            <h2 id="performance-title" className="sr-only">
              Performance
            </h2>
            <Empty>Not enough share-price history yet.</Empty>
          </>
        )}
      </section>

      {/* ── backtest ────────────────────────────────────────── */}
      <section id="backtest" aria-label="Backtest" className="scroll-mt-[88px] border-b border-line">
        <Backtest series={s} note={backtestNote} />
      </section>

      {/* ── holdings ────────────────────────────────────────── */}
      <section
        id="holdings"
        aria-label="Holdings"
        className="grid scroll-mt-[88px] border-b border-line lg:grid-cols-[minmax(0,1fr)_360px]"
      >
        <div className="min-w-0 border-line p-5 lg:border-r">
          <PositionsBook positions={detail.positions} />
        </div>
        <aside className="bg-rail p-5">
          <Label className="mb-3">Pool</Label>
          <Rail label="Pool value" value={usd(detail.tvl)} />
          <Rail label="Perps account" value={usd(detail.perpsValue)} />
          {detail.spotValue > 0 && <Rail label="Spot holdings" value={usd(detail.spotValue)} />}
          <Rail label="Collateral" value={usd(detail.collateral)} />
          <Rail label="Available" value={usd(detail.available)} />
          <Rail label="Open notional" value={usdCompact(detail.notional)} />
          <Rail
            label="Unrealised PnL"
            value={usdSigned(detail.unrealizedPnl)}
            tone={detail.unrealizedPnl >= 0 ? "up" : "down"}
          />
          <Rail
            label="Gross leverage"
            value={leverage != null ? `${leverage.toFixed(2)}×` : "—"}
          />
          {rail && <div className="mt-5 border-t border-line pt-4">{rail}</div>}
        </aside>
      </section>
    </>
  );
}

/** Return over the chosen range, beside the range toggle. */
function RangeReturn({ series, withApr }: { series: DailySeries; withApr: boolean }) {
  const range = useRange();
  const r = periodReturn(series, daysOf(range));
  if (!r) return null;
  const apr = withApr ? annualised(r.ratio, r.days) : null;
  return (
    <span className="figure text-[11px] text-ink-3">
      <span className={r.ratio >= 0 ? "text-up" : "text-down"}>{signedPct(r.ratio * 100, 2)}</span>
      {apr != null && ` · ${signedPct(apr)} APR`}
    </span>
  );
}

function Rail({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-hair py-2">
      <span className="text-[11.5px] text-ink-2">{label}</span>
      <Figure
        className={cn("text-[11.5px]", tone === "up" && "text-up", tone === "down" && "text-down")}
      >
        {value}
      </Figure>
    </div>
  );
}

/**
 * A vault's page. The header renders at once from the cached pool list; the
 * account — history and book — loads from the visitor's browser, so 300-odd
 * vault pages cost the server nothing however often they are opened.
 */
export function PoolLoader({ index, meta }: { index: number; meta: PublicPool | null }) {
  const [detail, setDetail] = useState<PoolDetail | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "failed">("loading");
  const [loadedAt, setLoadedAt] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setState("loading");
    fetchPoolDetail(index, ctrl.signal)
      .then((d) => {
        if (!d) return setState("missing");
        setDetail(d);
        setLoadedAt(new Date().toISOString());
        setState("ready");
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setState("failed");
      });
    return () => ctrl.abort();
  }, [index, attempt]);

  const name = detail?.name ?? meta?.name ?? `Pool #${index}`;
  const operator = detail?.operator ?? meta?.operator ?? "";
  const createdAt = detail?.createdAt ?? meta?.createdAt ?? null;
  const fee = detail?.info.operatorFee ?? meta?.operatorFee ?? null;

  return (
    <div>
      <div className="border-b border-line bg-panel px-5 py-4">
        <IntentLink href="/llp#vaults" className="figure ctl mb-2 inline-block text-[10.5px] text-ink-3 hover:text-ink">
          ← All pools
        </IntentLink>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="min-w-0 text-[17px] font-semibold tracking-[-0.015em] break-words">{name}</h1>
          <Chip>{meta?.type === 3 ? "PROTOCOL POOL" : "PUBLIC POOL"}</Chip>
          <Chip>#{index}</Chip>
          <div className="grow" />
          {loadedAt && <AsOf asOf={loadedAt} />}
          <LighterLink path={`/public-pools/${index}`}>Open on Lighter</LighterLink>
        </div>
        <div className="figure mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[10.5px] text-ink-3">
          {operator && operator !== ZERO_ADDRESS && (
            <span>
              operator{" "}
              <IntentLink href={`/a/${operator}`} className="text-ink-2 hover:text-ink">
                {addr(operator, 8, 6)}
              </IntentLink>
            </span>
          )}
          {fee != null && (
            <span>
              operator fee <span className="text-ink-2">{fee.toFixed(0)}% of profits</span>
            </span>
          )}
          {createdAt && (
            <span>
              created <span className="text-ink-2">{dayLabel(createdAt, true)}</span>
            </span>
          )}
        </div>
        {detail?.description && (
          <p className="mt-2 max-w-[80ch] text-[12px] leading-relaxed break-words text-ink-3">
            {detail.description}
          </p>
        )}
      </div>

      {state === "ready" && detail ? (
        <>
          <SectionNav sections={POOL_SECTIONS} />
          <PoolView detail={detail} />
        </>
      ) : state === "loading" ? (
        <div className="px-5 py-20 text-center">
          <Figure className="text-[12.5px] text-ink-3">Loading pool…</Figure>
        </div>
      ) : state === "missing" ? (
        <div className="px-5 py-20 text-center">
          <p className="mb-2 text-[15px] font-medium">Not a pool</p>
          <p className="text-[12.5px] text-ink-3">
            Account #{index} has no pool history.{" "}
            <IntentLink href={`/a/${index}`} className="text-ink underline decoration-edge underline-offset-4">
              View it as an account
            </IntentLink>
            .
          </p>
        </div>
      ) : (
        <div className="px-5 py-20 text-center">
          <p className="mb-2 text-[15px] font-medium">Could not load this pool</p>
          <p className="mb-4 text-[12.5px] text-ink-3">
            Lighter&rsquo;s API did not answer. Try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => setAttempt((a) => a + 1)}
            className="ctl figure rounded-[3px] border border-edge px-3 py-1.5 text-[11px] text-ink-2 hover:text-ink"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
