"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FUNDING_WINDOWS,
  fetchFundingHistory,
  type FundingPoint,
  type FundingWindow,
} from "@/lib/lighter/market-data";
import { SeriesChart } from "./charts";
import { Figure, SectionHeader, Segmented } from "./primitives";
import { aprPct, ratePct } from "@/lib/format";
import { cn } from "@/lib/utils";

const hourLabel = (t: number) =>
  new Date(t).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });

const tick = (t: number, window: FundingWindow) =>
  window === "1d"
    ? new Date(t).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "UTC",
      })
    : new Date(t).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });

/**
 * Who has been paying to hold this market, hour by hour.
 *
 * Bars diverge around zero: up when longs paid shorts, down when shorts paid
 * longs. Loaded from the visitor's browser — `fundings` caps at 750 rows, so
 * 30 days of hourly settlements is the deepest window one call can serve.
 */
export function FundingHistory({ marketId }: { marketId: number }) {
  const [window, setWindow] = useState<FundingWindow>("7d");
  const [data, setData] = useState<FundingPoint[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    fetchFundingHistory(marketId, window)
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [marketId, window]);

  const summary = useMemo(() => {
    if (!data || data.length === 0) return null;
    const mean = data.reduce((s, p) => s + p.rate, 0) / data.length;
    const longsPaid = data.filter((p) => p.rate > 0).length;
    return { mean, longsShare: (longsPaid / data.length) * 100 };
  }, [data]);

  const apr = summary ? aprPct(summary.mean) : null;

  return (
    <div>
      <SectionHeader title="Funding" note="hourly settlements · 8h basis">
        <Segmented
          options={FUNDING_WINDOWS.map((w) => ({ key: w.key, label: w.label }))}
          value={window}
          onChange={setWindow}
        />
      </SectionHeader>

      <div className="mb-3 flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <span className="flex items-baseline gap-2">
          <span className="text-[11px] text-ink-3">mean</span>
          <Figure
            className={cn(
              "text-[15px] font-medium",
              summary == null ? "text-ink-4" : summary.mean >= 0 ? "text-up" : "text-down",
            )}
          >
            {summary ? ratePct(summary.mean) : "—"}
          </Figure>
        </span>
        <span className="flex items-baseline gap-2">
          <span className="text-[11px] text-ink-3">annualised</span>
          <Figure className="text-[12px] text-ink-2">
            {apr != null ? `${apr >= 0 ? "+" : "−"}${Math.abs(apr).toFixed(2)}%` : "—"}
          </Figure>
        </span>
        <span className="flex items-baseline gap-2">
          <span className="text-[11px] text-ink-3">longs paid</span>
          <Figure className="text-[12px] text-ink-2">
            {summary ? `${summary.longsShare.toFixed(0)}% of hours` : "—"}
          </Figure>
        </span>
      </div>

      {failed ? (
        <p className="flex h-[176px] items-center justify-center text-[12px] text-ink-3">
          Funding history could not be loaded.
        </p>
      ) : !data ? (
        <div className="h-[176px] animate-pulse rounded-[3px] bg-panel" aria-label="Loading" />
      ) : data.length < 2 ? (
        <p className="flex h-[176px] items-center justify-center text-[12px] text-ink-3">
          No funding settlements in this window yet.
        </p>
      ) : (
        <SeriesChart
          points={data.map((p) => ({ t: p.t, v: p.rate }))}
          variant="diverging"
          height={176}
          format={{ as: "ratePct", dp: 4 }}
          valueLabel="funding rate, 8h basis"
          xLabels={data.map((p) => `${hourLabel(p.t)} UTC`)}
          tickLabels={data.map((p) => tick(p.t, window))}
          details={[
            {
              label: "settled that hour",
              values: data.map((p) => p.rate / 8),
              format: { as: "ratePct", dp: 5 },
            },
          ]}
        />
      )}
    </div>
  );
}
