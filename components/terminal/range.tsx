"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { SeriesChart, fmt, type ChartFormat } from "./charts";
import { Segmented } from "./primitives";
import {
  DAY_MS,
  RANGE_LABEL,
  RANGES,
  cumulative,
  daysOf,
  isRangeKey,
  lastDays,
  rangesFor,
  type RangeKey,
} from "@/lib/series";
import type { DailySeries } from "@/lib/lighter/types";
import { cn } from "@/lib/utils";

/* ══════════════════════════════════════════════════════════════
   Time ranges.

   The server sends each series' whole daily history once; changing
   the range slices it in the browser. No request, no loading state,
   and the page stays statically generated — a `?range=` read on the
   server would have made every chart page dynamic.

   The choice is mirrored into the URL (replaceState, no navigation)
   so a range survives a reload and can be shared.
   ══════════════════════════════════════════════════════════════ */

interface RangeState {
  range: RangeKey;
  setRange: (r: RangeKey) => void;
  options: RangeKey[];
}

const RangeContext = createContext<RangeState | null>(null);

function useRangeState(): RangeState {
  const ctx = useContext(RangeContext);
  if (!ctx) throw new Error("Range components must sit inside <RangeScope>");
  return ctx;
}

export function RangeScope({
  param = "range",
  initial = "30d",
  length,
  children,
}: {
  /** URL parameter this scope reads and writes. Distinct per scope on a page. */
  param?: string;
  initial?: RangeKey;
  /** Days of history available — ranges that cover all of it collapse into ALL. */
  length: number;
  children: React.ReactNode;
}) {
  const options = useMemo(() => rangesFor(length), [length]);
  const fallback = options.includes(initial) ? initial : "all";
  const [range, setRangeState] = useState<RangeKey>(fallback);

  useEffect(() => {
    try {
      const v = new URLSearchParams(window.location.search).get(param);
      if (isRangeKey(v) && options.includes(v)) setRangeState(v);
    } catch {
      /* no URL access — keep the default */
    }
  }, [param, options]);

  const setRange = useCallback(
    (r: RangeKey) => {
      setRangeState(r);
      try {
        const url = new URL(window.location.href);
        if (r === fallback) url.searchParams.delete(param);
        else url.searchParams.set(param, r);
        window.history.replaceState(window.history.state, "", url);
      } catch {
        /* history blocked — the range still applies for this view */
      }
    },
    [param, fallback],
  );

  return (
    <RangeContext.Provider value={{ range, setRange, options }}>
      {children}
    </RangeContext.Provider>
  );
}

/** The range the reader has chosen, for figures a page computes itself. */
export function useRange(): RangeKey {
  return useRangeState().range;
}

export function RangeToggle({ className }: { className?: string }) {
  const { range, setRange, options } = useRangeState();
  return (
    <div role="group" aria-label="Time range" className={className}>
      <Segmented
        options={RANGES.filter((r) => options.includes(r.key)).map((r) => ({
          key: r.key,
          label: r.label,
        }))}
        value={range}
        onChange={setRange}
      />
    </div>
  );
}

/** "last 30 days", "all time" — for notes beside a title. */
export function RangeNote({
  prefix,
  className,
}: {
  prefix?: string;
  className?: string;
}) {
  const { range } = useRangeState();
  const text = range === "all" ? RANGE_LABEL.all : `last ${RANGE_LABEL[range]}`;
  return (
    <span className={cn("figure text-[10.5px] text-ink-3", className)}>
      {prefix ? `${prefix} · ${text}` : text}
    </span>
  );
}

/** A secondary series shown in the tooltip, aligned by date. */
export interface RangedDetail {
  label: string;
  series: DailySeries;
  format?: ChartFormat;
  tone?: "up" | "down";
}

export function RangedChart({
  series,
  mode = "daily",
  details,
  ...chart
}: {
  series: DailySeries;
  /** `cumulative` plots running totals, so any window shows lifetime levels. */
  mode?: "daily" | "cumulative";
  details?: RangedDetail[];
  variant?: "bar" | "area" | "diverging";
  height?: number;
  zeroBased?: boolean;
  tone?: "brand" | "info";
  showMean?: boolean;
  format: ChartFormat;
  valueLabel?: string;
  className?: string;
}) {
  const { range } = useRangeState();

  const points = useMemo(
    () => lastDays(mode === "cumulative" ? cumulative(series) : series, range),
    [series, mode, range],
  );

  const aligned = useMemo(
    () =>
      details?.map((d) => ({
        label: d.label,
        format: d.format,
        tone: d.tone,
        values: points.map(
          (p) => d.series.values[Math.round((p.t - d.series.start) / DAY_MS)] ?? NaN,
        ),
      })),
    [details, points],
  );

  return <SeriesChart points={points} details={aligned} {...chart} />;
}

/**
 * A figure that follows the range: the total, the average or the change
 * across whatever window the reader has chosen.
 */
export function RangedFigure({
  series,
  stat,
  format,
  className,
  signed = false,
}: {
  series: DailySeries;
  stat: "sum" | "mean" | "last";
  format: ChartFormat;
  className?: string;
  /** Colour the figure by sign. */
  signed?: boolean;
}) {
  const { range } = useRangeState();
  const value = useMemo(() => {
    const days = daysOf(range);
    const from = days == null ? 0 : Math.max(0, series.values.length - days);
    const slice = series.values.slice(from);
    if (slice.length === 0) return null;
    if (stat === "last") return slice[slice.length - 1];
    const total = slice.reduce((a, b) => a + b, 0);
    return stat === "sum" ? total : total / slice.length;
  }, [series, stat, range]);

  return (
    <span
      className={cn(
        "figure",
        signed && value != null && (value >= 0 ? "text-up" : "text-down"),
        className,
      )}
    >
      {value == null ? "—" : fmt(value, format)}
    </span>
  );
}
