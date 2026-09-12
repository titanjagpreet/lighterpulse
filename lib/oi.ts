import type { DailySeries } from "./lighter/types";

/**
 * Open-interest history — shapes shared by the server and the browser.
 *
 * Written by `collector/snapshot.mjs`, read by the site from Redis. Values are
 * two-sided USD, the convention used everywhere else in the product.
 */

export type OiRegime = "new-longs" | "short-covering" | "new-shorts" | "long-unwinding";

export const REGIME: Record<OiRegime, { label: string; dir: "up" | "down"; note: string }> = {
  "new-longs": { label: "New longs", dir: "up", note: "price up, open interest up" },
  "short-covering": { label: "Short covering", dir: "up", note: "price up, open interest down" },
  "new-shorts": { label: "New shorts", dir: "down", note: "price down, open interest up" },
  "long-unwinding": { label: "Long unwinding", dir: "down", note: "price down, open interest down" },
};

export interface OiLatestMarket {
  /** Current open interest, USD, both sides. */
  oi: number;
  /** Percentage changes; null where the snapshot to compare against is missing. */
  d1h: number | null;
  d4h: number | null;
  d24h: number | null;
  d7d: number | null;
  /** Mark price change over the same 24h, for the regime. */
  p24h: number | null;
  regime: OiRegime | null;
}

export interface OiLatest {
  /** Snapshot time. */
  at: string;
  /** When recording began. */
  since: string | null;
  markets: Record<string, OiLatestMarket>;
}

/** An aligned run of values: v[i] is at start + i × step. Nulls are missed snapshots. */
export interface OiSeriesPart {
  start: number;
  step: number;
  v: (number | null)[];
}

export interface OiSeries {
  at: string;
  since: string | null;
  m15: OiSeriesPart;
  h1: OiSeriesPart;
  d1: OiSeriesPart;
}

/**
 * A daily part as a gap-free series: a missed day carries the day before,
 * and days before the first reading are dropped. Null when nothing is recorded.
 */
export function partToDaily(part: OiSeriesPart | null | undefined): DailySeries | null {
  if (!part || part.v.length === 0) return null;
  const first = part.v.findIndex((v) => v != null);
  if (first < 0) return null;
  const values: number[] = [];
  let prev = part.v[first] as number;
  for (let i = first; i < part.v.length; i++) {
    const v = part.v[i];
    if (v != null) prev = v;
    values.push(prev);
  }
  return { start: part.start + first * part.step, values };
}

/** Points inside [from, to], skipping gaps. */
export function oiPoints(part: OiSeriesPart | undefined, from: number, to: number): { t: number; v: number }[] {
  if (!part || part.v.length === 0) return [];
  const out: { t: number; v: number }[] = [];
  for (let i = 0; i < part.v.length; i++) {
    const t = part.start + i * part.step;
    const v = part.v[i];
    if (v == null || t < from || t > to) continue;
    out.push({ t, v });
  }
  return out;
}
