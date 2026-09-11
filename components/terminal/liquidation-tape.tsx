"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiquidationFeed } from "@/lib/lighter/use-liquidations";
import { Figure, Label, MetricCell, SplitBar } from "./primitives";
import { ago, num, pctPlain, usd, usdCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

type Markets = { marketId: number; symbol: string }[];

/**
 * The headline 24h figure, ticking.
 *
 * The server figure is a daily bucket from `exchangeMetrics`; anything that
 * lands after this page was rendered is added on top. Because the bucket was
 * fetched before those events happened, there is no double counting.
 */
export function LiveLiquidationStat({
  markets,
  base,
  baseCount,
}: {
  markets: Markets;
  base: number | null;
  baseCount: number | null;
}) {
  const { sessionUsd, sessionCount, live, lastAt } = useLiquidationFeed(markets);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (lastAt == null) return;
    setFlash(true);
    const id = setTimeout(() => setFlash(false), 620);
    return () => clearTimeout(id);
  }, [lastAt]);

  const total = base != null ? base + sessionUsd : sessionUsd || null;
  const count = baseCount != null ? baseCount + sessionCount : sessionCount;

  return (
    <MetricCell
      label={
        <span className="flex items-center gap-2">
          Liquidated — 24h
          <span
            aria-hidden="true"
            className={cn(
              "inline-block size-[4.5px] rounded-full",
              live ? "bg-down" : "bg-ink-5",
            )}
          />
        </span>
      }
      value={
        <span className={cn("rounded-[2px] px-1", flash && "tick-flash")}>
          {usdCompact(total, 2)}
        </span>
      }
      scale="hero"
      tone="down"
      sub={
        <span>
          {count ? `${num(count)} events` : "—"}
          {sessionCount > 0 && (
            <span className="text-ink-4">
              {" · "}
              {num(sessionCount)} since you opened this page
            </span>
          )}
        </span>
      }
    />
  );
}

/**
 * The rail: a rolling tape plus what it adds up to.
 *
 * One feed drives both — the tape shows individual events, the panel beneath
 * turns them into the shape of the session.
 */
export function LiquidationTape({ markets }: { markets: Markets }) {
  const { rows, sessionUsd, sessionCount, live } = useLiquidationFeed(markets);

  const summary = useMemo(() => {
    let longUsd = 0;
    let shortUsd = 0;
    let largest = rows[0] ?? null;
    const byMarket = new Map<string, { usd: number; n: number }>();

    for (const r of rows) {
      if (r.side === "long") longUsd += r.usd;
      else shortUsd += r.usd;
      if (!largest || r.usd > largest.usd) largest = r;
      const b = byMarket.get(r.symbol) ?? { usd: 0, n: 0 };
      b.usd += r.usd;
      b.n += 1;
      byMarket.set(r.symbol, b);
    }

    const busiest = [...byMarket.entries()].sort((a, b) => b[1].n - a[1].n)[0];
    return { longUsd, shortUsd, largest, busiest };
  }, [rows]);

  const sided = summary.longUsd + summary.shortUsd;
  const longPct = sided > 0 ? (summary.longUsd / sided) * 100 : null;

  return (
    <>
      {/* ── the tape ───────────────────────────────────────── */}
      <div className="p-5">
        <div className="mb-3.5 flex items-center gap-2">
          <Label>Tape</Label>
          <span
            aria-hidden="true"
            className={cn(
              "inline-block size-[4.5px] rounded-full",
              live ? "bg-down" : "bg-ink-5",
            )}
          />
          <div className="grow" />
          <Figure className="text-[10px] text-ink-3">
            {live ? `${markets.length} markets` : "connecting…"}
          </Figure>
        </div>

        {rows.length === 0 ? (
          <p className="py-8 text-center text-[11.5px] text-ink-3">
            {live
              ? "Watching. Nothing liquidated yet."
              : "Connecting to the Lighter stream…"}
          </p>
        ) : (
          <div className="flex flex-col">
            {rows.map((r, i) => (
              <div
                key={r.id}
                className={cn(
                  "grid grid-cols-[50px_58px_minmax(0,1fr)_42px] items-center border-t border-hair py-[6.5px]",
                  i === 0 && "tick-flash",
                )}
                style={{
                  opacity: i > 8 ? Math.max(0.34, 1 - (i - 8) * 0.12) : 1,
                }}
              >
                <Figure
                  className={cn(
                    "text-[10px]",
                    r.side === "long" ? "text-down" : "text-up",
                  )}
                >
                  {r.side.toUpperCase()}
                </Figure>
                <span className="text-[11.5px] font-medium">{r.symbol}</span>
                <Figure className="text-right text-[11.5px]">
                  {usd(r.usd)}
                </Figure>
                <Figure className="text-right text-[9.5px] text-ink-4">
                  {ago(r.t)}
                </Figure>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── what the tape adds up to ───────────────────────── */}
      <div className="border-t border-line p-5">
        <div className="mb-3.5 flex items-baseline">
          <Label>This session</Label>
          <div className="grow" />
          <Figure className="text-[10px] text-ink-3">
            since you opened the page
          </Figure>
        </div>

        {sessionCount === 0 ? (
          <p className="text-[11.5px] leading-relaxed text-ink-3">
            Nothing forced out yet. Every liquidation on the{" "}
            {markets.length} deepest books lands here the moment it clears —
            side, market and size — and the 24h figure above moves with it.
          </p>
        ) : (
          <>
            <div className="mb-1.5 flex items-baseline justify-between">
              <Figure className="text-[19px] font-medium tracking-[-0.02em] text-down">
                {usd(sessionUsd)}
              </Figure>
              <Figure className="text-[11px] text-ink-3">
                {num(sessionCount)}{" "}
                {sessionCount === 1 ? "event" : "events"}
              </Figure>
            </div>

            {longPct != null && (
              <>
                <SplitBar
                  left={summary.longUsd}
                  right={summary.shortUsd}
                  className="mb-2"
                />
                <div className="mb-4 flex justify-between">
                  <Figure className="text-[10px] text-down">
                    {pctPlain(longPct)} longs
                  </Figure>
                  <Figure className="text-[10px] text-up">
                    shorts {pctPlain(100 - longPct)}
                  </Figure>
                </div>
              </>
            )}

            {summary.largest && (
              <Row
                label="Largest hit"
                value={`${summary.largest.symbol} ${usd(summary.largest.usd)}`}
              />
            )}
            {summary.busiest && (
              <Row
                label="Most active"
                value={`${summary.busiest[0]} · ${summary.busiest[1].n}`}
              />
            )}
            <Row label="Books watched" value={String(markets.length)} />
          </>
        )}
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-t border-hair py-2">
      <span className="text-[11.5px] text-ink-2">{label}</span>
      <Figure className="text-[11.5px]">{value}</Figure>
    </div>
  );
}
