import "server-only";
import { api } from "./client";
import { cached, type Cached } from "../cache";
import type { DailySeries, MetricKind, MetricPeriod, MetricPoint } from "./types";

/**
 * `exchangeMetrics` — the endpoint that replaces the entire Dune dependency
 * and both dead Railway microservices. Seventeen metric kinds, daily buckets
 * back to mainnet genesis (17 Jan 2025) when period is `all`.
 *
 * Period support is not uniform: `tps` accepts h/d/w only, every other kind
 * accepts w/m/q/y/all. Asking for the wrong pair returns code 20001.
 */

const TPS_PERIODS: MetricPeriod[] = ["h", "d", "w"];
const STANDARD_PERIODS: MetricPeriod[] = ["w", "m", "q", "y", "all"];

export function supportsPeriod(kind: MetricKind, period: MetricPeriod): boolean {
  return (kind === "tps" ? TPS_PERIODS : STANDARD_PERIODS).includes(period);
}

async function fetchMetric(
  kind: MetricKind,
  period: MetricPeriod,
): Promise<MetricPoint[]> {
  const res = await api<{ metrics: { timestamp: number; data: number }[] }>(
    "exchangeMetrics",
    { kind, period },
  );
  return (res.metrics ?? []).map((p) => ({
    // Most kinds emit seconds; tps emits milliseconds.
    t: p.timestamp > 1e12 ? p.timestamp : p.timestamp * 1000,
    v: p.data,
  }));
}

export function getMetric(
  kind: MetricKind,
  period: MetricPeriod,
): Promise<Cached<MetricPoint[]>> {
  if (!supportsPeriod(kind, period)) {
    throw new Error(`exchangeMetrics: ${kind} does not support period "${period}"`);
  }
  // tps moves every 10s; the rest are daily buckets and can sit longer.
  const ttl = kind === "tps" ? 20 : 300;
  return cached(`metric:${kind}:${period}`, ttl, () => fetchMetric(kind, period));
}

/**
 * The whole daily history of a kind, compacted for the wire. Every range a
 * chart offers is a slice of this one cached call — `w`, `m`, `q` and `y` are
 * verified to be exact tails of `all`, so fetching them separately would only
 * spend rate limit on bytes we already hold.
 */
export async function getDaily(
  kind: Exclude<MetricKind, "tps">,
  dp = 2,
): Promise<Cached<DailySeries>> {
  const c = await getMetric(kind, "all");
  return { ...c, data: toDaily(c.data, dp) };
}

const DAY_MS = 86_400_000;

/**
 * Compact a daily series. Buckets are gap-free today (checked across every
 * kind); should one ever go missing, it is filled with zero rather than
 * silently shifting every later date by a day.
 */
export function toDaily(points: MetricPoint[], dp = 2): DailySeries {
  if (points.length === 0) return { start: 0, values: [] };
  const f = 10 ** dp;
  const start = points[0].t;
  const values: number[] = [];
  for (const p of points) {
    const i = Math.round((p.t - start) / DAY_MS);
    while (values.length < i) values.push(0);
    values[i] = Math.round(p.v * f) / f;
  }
  return { start, values };
}

/* ── helpers over a series ───────────────────────────────────── */

export const last = (s: MetricPoint[]): number | null =>
  s.length ? s[s.length - 1].v : null;

export const sum = (s: MetricPoint[]): number =>
  s.reduce((acc, p) => acc + p.v, 0);

export const mean = (s: MetricPoint[]): number =>
  s.length ? sum(s) / s.length : 0;

/** Percentage change between the last two points. */
export function changePct(s: MetricPoint[]): number | null {
  if (s.length < 2) return null;
  const prev = s[s.length - 2].v;
  const curr = s[s.length - 1].v;
  if (!prev) return null;
  return ((curr - prev) / prev) * 100;
}

/** Absolute change between the last two points. */
export function changeAbs(s: MetricPoint[]): number | null {
  if (s.length < 2) return null;
  return s[s.length - 1].v - s[s.length - 2].v;
}

/**
 * Current throughput. The tps series is 10-second samples across the last
 * hour; a short trailing mean is far steadier than the final sample.
 */
export function currentTps(s: MetricPoint[], window = 6): number | null {
  if (!s.length) return null;
  const tail = s.slice(-window);
  return Math.round(mean(tail));
}
