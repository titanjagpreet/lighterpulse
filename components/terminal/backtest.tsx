"use client";

import { useMemo, useState } from "react";
import { SeriesChart } from "./charts";
import { Empty, Figure, Label, SectionHeader, Segmented } from "./primitives";
import { backtest } from "@/lib/pools";
import type { DailySeries } from "@/lib/lighter/types";
import { dayLabel, usd, usdSigned } from "@/lib/format";
import { cn } from "@/lib/utils";

const DAY_MS = 86_400_000;

const PRESETS = [
  { key: "30d", label: "30D", days: 30 },
  { key: "90d", label: "90D", days: 90 },
  { key: "1y", label: "1Y", days: 365 },
  { key: "all", label: "Launch", days: null },
] as const;

const isoDay = (t: number) => new Date(t).toISOString().slice(0, 10);

/**
 * What a deposit would be worth today, from the pool's own share-price history.
 * Runs entirely in the browser — the history is already on the page.
 */
export function Backtest({
  series,
  note,
}: {
  /** USD per share, one bucket per UTC day. */
  series: DailySeries;
  note?: string;
}) {
  const last = series.values.length - 1;
  const endT = series.start + last * DAY_MS;
  const presets = PRESETS.filter((p) => p.days == null || p.days < last);

  const [amountText, setAmountText] = useState("10,000");
  const [startT, setStartT] = useState(() =>
    last > 90 ? endT - 90 * DAY_MS : series.start,
  );

  const amount = Number(amountText.replace(/[^0-9.]/g, ""));
  const result = useMemo(
    () => backtest(series, amount, startT),
    [series, amount, startT],
  );

  const points = useMemo(() => {
    if (!result) return [];
    const from = Math.round((result.start - series.start) / DAY_MS);
    const base = series.values[from];
    return series.values
      .slice(from)
      .map((v, k) => ({ t: result.start + k * DAY_MS, v: (amount * v) / base }));
  }, [result, series, amount]);

  if (last < 2) {
    return <Empty>Not enough share-price history to backtest yet.</Empty>;
  }

  const presetStart = (days: number | null) =>
    days == null ? series.start : endT - days * DAY_MS;
  const active = presets.find((p) => presetStart(p.days) === startT)?.key ?? "custom";

  return (
    <div className="grid lg:grid-cols-[340px_minmax(0,1fr)]">
      <div className="border-b border-line p-5 lg:border-r lg:border-b-0">
        <SectionHeader title="If you had deposited" note="backtest on share price" />

        <label className="mb-4 block">
          <span className="label mb-1.5 block">Amount</span>
          <span className="flex items-center gap-2 rounded-[3px] border border-edge bg-raised px-2.5 focus-within:border-ink-4">
            <span className="figure text-[12px] text-ink-3" aria-hidden="true">
              $
            </span>
            <input
              inputMode="decimal"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              onBlur={() => amount > 0 && setAmountText(amount.toLocaleString("en-US"))}
              aria-label="Deposit amount in USD"
              className="figure w-full bg-transparent py-1.5 text-[13px] text-ink outline-none pointer-coarse:py-2.5"
            />
          </span>
        </label>

        <div className="mb-4">
          <span className="label mb-1.5 block">From</span>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              options={presets.map((p) => ({ key: p.key as string, label: p.label }))}
              value={active}
              onChange={(k) => {
                const p = presets.find((x) => x.key === k);
                if (p) setStartT(presetStart(p.days));
              }}
            />
            <input
              type="date"
              value={isoDay(startT)}
              min={isoDay(series.start)}
              max={isoDay(endT - DAY_MS)}
              onChange={(e) => {
                const t = Date.parse(`${e.target.value}T00:00:00Z`);
                if (Number.isFinite(t)) {
                  setStartT(Math.max(series.start, Math.min(endT - DAY_MS, t)));
                }
              }}
              aria-label="Deposit date"
              className="figure rounded-[3px] border border-edge bg-raised px-2 py-1 text-[11px] text-ink-2 [color-scheme:dark] focus:border-ink-4 pointer-coarse:py-2"
            />
          </div>
        </div>

        {result ? (
          <div className="flex flex-col">
            <Row label="Deposited" value={usd(result.deposit)} sub={dayLabel(result.start, true)} />
            <Row label="Worth today" value={usd(result.value)} sub={dayLabel(result.end, true)} strong />
            <Row
              label="Gain"
              value={usdSigned(result.gain)}
              sub={`${result.returnPct >= 0 ? "+" : "−"}${Math.abs(result.returnPct).toFixed(2)}% over ${result.days} days`}
              tone={result.gain >= 0 ? "up" : "down"}
            />
            <Row
              label="Annualised"
              value={
                result.aprPct != null
                  ? `${result.aprPct >= 0 ? "+" : "−"}${Math.abs(result.aprPct).toFixed(1)}%`
                  : "—"
              }
              sub="simple APR"
              tone={result.aprPct != null && result.aprPct < 0 ? "down" : "up"}
            />
            <Row
              label="Worst drawdown"
              value={result.drawdown ? `${result.drawdown.pct.toFixed(2)}%` : "—"}
              sub={
                result.drawdown && result.drawdown.pct < 0
                  ? `${dayLabel(result.drawdown.peakT)} → ${dayLabel(result.drawdown.troughT)}`
                  : "never below a prior high"
              }
              tone={result.drawdown && result.drawdown.pct < 0 ? "down" : undefined}
            />
          </div>
        ) : (
          <p className="text-[11.5px] text-ink-3">Enter an amount to see the result.</p>
        )}

        <p className="mt-4 text-[11px] leading-relaxed text-ink-4">
          Past share price, not a forecast.{note ? ` ${note}` : ""}
        </p>
      </div>

      <div className="min-w-0 p-5">
        <SectionHeader
          title="Value of the deposit"
          note={result ? `${dayLabel(result.start, true)} → ${dayLabel(result.end, true)}` : undefined}
        />
        {points.length > 1 ? (
          <SeriesChart
            points={points}
            variant="area"
            height={236}
            valueLabel="deposit value"
            format={{ as: "usdCompact", dp: 2 }}
          />
        ) : (
          <Empty>Pick an amount and a start date.</Empty>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  sub,
  tone,
  strong,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "up" | "down";
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-hair py-2">
      <span>
        <Label className="text-ink-3">{label}</Label>
        {sub && <span className="figure block text-[10px] text-ink-4">{sub}</span>}
      </span>
      <Figure
        className={cn(
          strong ? "text-[16px] font-medium" : "text-[12.5px]",
          tone === "up" && "text-up",
          tone === "down" && "text-down",
        )}
      >
        {value}
      </Figure>
    </div>
  );
}
