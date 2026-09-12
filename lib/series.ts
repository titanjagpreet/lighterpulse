import type { DailySeries, MetricPoint } from "./lighter/types";

/**
 * Range arithmetic over daily series. Isomorphic — the server slices for
 * headline figures, the browser slices when a reader changes the range.
 */

export const DAY_MS = 86_400_000;

export type RangeKey = "7d" | "30d" | "90d" | "1y" | "all";

export const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: "7d", label: "7D", days: 7 },
  { key: "30d", label: "30D", days: 30 },
  { key: "90d", label: "90D", days: 90 },
  { key: "1y", label: "1Y", days: 365 },
  { key: "all", label: "ALL", days: null },
];

export const RANGE_LABEL: Record<RangeKey, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
  "1y": "1 year",
  all: "all time",
};

export function isRangeKey(v: unknown): v is RangeKey {
  return typeof v === "string" && RANGES.some((r) => r.key === v);
}

export function daysOf(key: RangeKey): number | null {
  return RANGES.find((r) => r.key === key)?.days ?? null;
}

/**
 * Ranges worth offering for a history `length` days long. A window that
 * already spans the whole history is ALL under another name — offering both
 * is a button that does nothing.
 */
export function rangesFor(length: number): RangeKey[] {
  return RANGES.filter((r) => r.days == null || r.days < length).map((r) => r.key);
}

/** The last N buckets as points; the whole series for ALL. */
export function lastDays(s: DailySeries, key: RangeKey): MetricPoint[] {
  const days = daysOf(key);
  const from = days == null ? 0 : Math.max(0, s.values.length - days);
  const out: MetricPoint[] = [];
  for (let i = from; i < s.values.length; i++) {
    out.push({ t: s.start + i * DAY_MS, v: s.values[i] });
  }
  return out;
}

export function sumDays(s: DailySeries, key: RangeKey): number {
  const days = daysOf(key);
  const from = days == null ? 0 : Math.max(0, s.values.length - days);
  let total = 0;
  for (let i = from; i < s.values.length; i++) total += s.values[i];
  return total;
}

/** Running total — so a sliced window still shows real lifetime levels. */
export function cumulative(s: DailySeries): DailySeries {
  let run = 0;
  return { start: s.start, values: s.values.map((v) => (run += v)) };
}

/**
 * Combine two daily series bucket by bucket, over the dates they share.
 * `fn` returning null drops that day (e.g. a ratio with a zero denominator).
 */
export function combine(
  a: DailySeries,
  b: DailySeries,
  fn: (x: number, y: number) => number | null,
): MetricPoint[] {
  const start = Math.max(a.start, b.start);
  const end = Math.min(
    a.start + (a.values.length - 1) * DAY_MS,
    b.start + (b.values.length - 1) * DAY_MS,
  );
  const out: MetricPoint[] = [];
  for (let t = start; t <= end; t += DAY_MS) {
    const x = a.values[Math.round((t - a.start) / DAY_MS)];
    const y = b.values[Math.round((t - b.start) / DAY_MS)];
    if (x == null || y == null) continue;
    const v = fn(x, y);
    if (v != null && Number.isFinite(v)) out.push({ t, v });
  }
  return out;
}

/** Points back to a compact series (assumes daily spacing, as produced above). */
export function toSeries(points: MetricPoint[]): DailySeries {
  return { start: points[0]?.t ?? 0, values: points.map((p) => p.v) };
}
