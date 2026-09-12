"use client";

import { useEffect, useRef, useState } from "react";
import { useMarketStats } from "@/lib/lighter/use-market-stats";
import { FundingClock } from "./funding-clock";
import { Chip, Delta, Figure, Label, MetricCell } from "./primitives";
import { REGIME, type OiRegime } from "@/lib/oi";
import { aprPct, num, price, ratePct, usdCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface HeaderMarket {
  marketId: number;
  symbol: string;
  markPrice: number;
  indexPrice: number;
  change24h: number;
  oiUsd: number;
  volume24h: number;
  trades24h: number;
  dayLow: number;
  dayHigh: number;
  funding: number | null;
  maxLeverage: number;
  /** Basis points. */
  maintenanceMarginFraction: number;
}

/**
 * The market's live band. Server-rendered from the cached book so it is
 * complete for crawlers, then re-priced from `market_stats/all`.
 */
export function MarketHeader({
  market: m,
  oi,
}: {
  market: HeaderMarket;
  /** From recorded history; null until a full day has been recorded. */
  oi?: { d24h: number | null; regime: OiRegime | null } | null;
}) {
  const { stats, live } = useMarketStats();
  const s = stats.get(m.marketId);

  const mark = s?.markPrice || m.markPrice;
  const index = s?.indexPrice || m.indexPrice;
  const change = s ? s.change24h : m.change24h;
  const low = s?.dayLow || m.dayLow;
  const high = s?.dayHigh || m.dayHigh;
  const funding = s?.funding ?? m.funding;
  const premiumBps = index ? ((mark - index) / index) * 10_000 : null;
  const pos = high > low ? Math.min(1, Math.max(0, (mark - low) / (high - low))) : null;
  const apr = aprPct(funding);

  // One quiet ink flash when the mark moves — never colour.
  const [flash, setFlash] = useState(false);
  const prev = useRef(mark);
  useEffect(() => {
    if (mark === prev.current) return;
    prev.current = mark;
    setFlash(true);
    const id = setTimeout(() => setFlash(false), 620);
    return () => clearTimeout(id);
  }, [mark]);

  return (
    <div className="grid border-b border-line bg-panel lg:grid-cols-[420px_minmax(0,1fr)]">
      <div className="border-b border-line px-5 py-4 lg:border-r lg:border-b-0">
        <div className="mb-2.5 flex items-center gap-2">
          <Label>Mark price</Label>
          <span
            aria-hidden="true"
            className={cn("size-[5px] rounded-full", live ? "bg-brand live-halo" : "bg-ink-5")}
          />
        </div>
        <div className="flex items-end gap-3">
          <Figure
            className={cn(
              "rounded-[2px] text-[40px] leading-[0.92] font-medium tracking-[-0.03em]",
              flash && "tick-flash",
            )}
          >
            {price(mark)}
          </Figure>
          <div className="pb-1">
            <Delta value={change} className="text-[12px]" />
          </div>
        </div>
        <div className="figure mt-2 flex flex-wrap gap-x-4 text-[10.5px] text-ink-3">
          <span>
            index <span className="text-ink-2">{price(index)}</span>
          </span>
          {premiumBps != null && (
            <span>
              premium{" "}
              <span className={premiumBps >= 0 ? "text-up" : "text-down"}>
                {premiumBps >= 0 ? "+" : "−"}
                {Math.abs(premiumBps).toFixed(1)} bps
              </span>
            </span>
          )}
          {oi?.regime && (
            <span title={`Last 24 hours: ${REGIME[oi.regime].note}`}>
              <Chip tone={REGIME[oi.regime].dir}>{REGIME[oi.regime].label.toUpperCase()}</Chip>
            </span>
          )}
        </div>

        {/* the day's range, with mark placed in it */}
        <div className="mt-4">
          <div className="relative h-[4px] rounded-[2px] bg-hair" aria-hidden="true">
            {pos != null && (
              <span
                className={cn(
                  "absolute top-[-3px] h-[10px] w-[2px] rounded-[1px]",
                  change >= 0 ? "bg-up" : "bg-down",
                )}
                style={{ left: `calc(${pos * 100}% - 1px)` }}
              />
            )}
          </div>
          <div className="figure mt-1.5 flex justify-between text-[10px] text-ink-4">
            <span>24h low {price(low)}</span>
            <span>
              {pos != null ? `${(pos * 100).toFixed(0)}% of range` : "no range"}
            </span>
            <span>high {price(high)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-4 lg:divide-y-0">
        <MetricCell
          label="Open interest"
          value={usdCompact(s?.oiUsd || m.oiUsd)}
          sub={
            oi?.d24h != null
              ? `${oi.d24h >= 0 ? "+" : "−"}${Math.abs(oi.d24h).toFixed(1)}% in 24h · both sides`
              : "both sides"
          }
        />
        <MetricCell
          label="Volume 24h"
          value={usdCompact(s?.volume24h || m.volume24h)}
          sub={`${num(m.trades24h)} trades`}
        />
        <MetricCell
          label="Funding · 8h"
          value={funding != null ? ratePct(funding) : "—"}
          tone={funding == null ? undefined : funding >= 0 ? "up" : "down"}
          sub={
            apr != null
              ? `${apr >= 0 ? "+" : "−"}${Math.abs(apr).toFixed(1)}% APR · ${funding! >= 0 ? "longs pay" : "shorts pay"}`
              : undefined
          }
        />
        <div className="px-5 py-4">
          <div className="mb-2.5 flex items-baseline gap-2">
            <Label>Next funding</Label>
            <span className="figure text-[10px] text-ink-4">hourly</span>
          </div>
          <FundingClock className="text-[21px]" />
          <div className="figure mt-1.5 text-[10.5px] text-ink-3">
            {m.maxLeverage}× max · maint. {(m.maintenanceMarginFraction / 100).toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  );
}
