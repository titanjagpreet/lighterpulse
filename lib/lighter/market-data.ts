import { API_BASE_PUBLIC } from "./public";
import { displayPrice, displaySize } from "./multiplier";
import { hourlyPctToEightHour, n } from "../format";

/**
 * Per-market history, fetched from the visitor's browser.
 *
 * Lighter serves these endpoints with `Access-Control-Allow-Origin: *`, and
 * its limits are per IP — so a market page costs our server nothing, however
 * many of its 233 pages get crawled or opened. The server renders the stats
 * it already holds; the charts load here.
 *
 * Prices and base sizes arrive in real units and are converted to display
 * units on the way in.
 */

const TIMEOUT_MS = 10_000;

async function get<T>(
  path: string,
  params: Record<string, string | number>,
  signal?: AbortSignal,
): Promise<T> {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  );
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener("abort", onAbort);
  try {
    const res = await fetch(`${API_BASE_PUBLIC}/api/v1/${path}?${qs}`, {
      signal: ctrl.signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as T & { code?: number; message?: string };
    // The v1 API reports errors as 200 with a code in the body.
    if (typeof json.code === "number" && json.code !== 200 && json.code !== 0) {
      throw new Error(json.message?.trim() || `code ${json.code}`);
    }
    return json;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

/** Short-lived memo, so flicking between ranges does not refetch. */
const memo = new Map<string, { at: number; p: Promise<unknown> }>();

function remember<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.p as Promise<T>;
  const p = fn().catch((err) => {
    memo.delete(key);
    throw err;
  });
  memo.set(key, { at: Date.now(), p });
  return p;
}

/* ── candles ─────────────────────────────────────────────────── */

export type Timeframe = "1d" | "7d" | "30d" | "1y" | "all";

/**
 * Resolutions chosen so every window lands between ~100 and 500 bars — the
 * endpoint's cap is 500, and `4h` is the coarsest step below a day it accepts.
 */
export const TIMEFRAMES: {
  key: Timeframe;
  label: string;
  resolution: "15m" | "1h" | "4h" | "1d";
  stepSec: number;
  bars: number;
}[] = [
  { key: "1d", label: "24H", resolution: "15m", stepSec: 900, bars: 96 },
  { key: "7d", label: "7D", resolution: "1h", stepSec: 3600, bars: 168 },
  { key: "30d", label: "30D", resolution: "4h", stepSec: 14_400, bars: 180 },
  { key: "1y", label: "1Y", resolution: "1d", stepSec: 86_400, bars: 365 },
  { key: "all", label: "ALL", resolution: "1d", stepSec: 86_400, bars: 500 },
];

export interface Candle {
  /** Bar open, epoch ms. */
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  /** Base volume. */
  v: number;
  /** Quote (USD) volume. */
  usd: number;
}

interface RawCandle {
  t: number;
  o?: number;
  h?: number;
  l?: number;
  c?: number;
  v?: number;
  V?: number;
  // `i` is a global trade-sequence counter, not open interest — ignored.
}

export function fetchCandles(marketId: number, tf: Timeframe): Promise<Candle[]> {
  const cfg = TIMEFRAMES.find((x) => x.key === tf) ?? TIMEFRAMES[1];
  return remember(`candles:${marketId}:${tf}`, 30_000, async () => {
    const end = Math.floor(Date.now() / 1000);
    const res = await get<{ c?: RawCandle[] }>("candles", {
      market_id: marketId,
      resolution: cfg.resolution,
      start_timestamp: end - cfg.stepSec * cfg.bars,
      end_timestamp: end,
      count_back: cfg.bars,
      set_timestamp_to_end: "false",
    });
    // "Zero values are omitted from the response" — default, don't NaN.
    return (res.c ?? [])
      .map((k) => ({
        t: n(k.t),
        o: displayPrice(marketId, n(k.o)),
        h: displayPrice(marketId, n(k.h)),
        l: displayPrice(marketId, n(k.l)),
        c: displayPrice(marketId, n(k.c)),
        v: displaySize(marketId, n(k.v)),
        usd: n(k.V),
      }))
      .filter((k) => k.t > 0 && k.c > 0)
      .sort((a, b) => a.t - b.t);
  });
}

/* ── funding history ─────────────────────────────────────────── */

export type FundingWindow = "1d" | "7d" | "30d";

/** `fundings` returns at most 750 hourly rows — 30 days is the ceiling. */
export const FUNDING_WINDOWS: { key: FundingWindow; label: string; hours: number }[] = [
  { key: "1d", label: "24H", hours: 24 },
  { key: "7d", label: "7D", hours: 168 },
  { key: "30d", label: "30D", hours: 720 },
];

export interface FundingPoint {
  /** Settlement time, epoch ms. */
  t: number;
  /** Signed, as an 8-hour ratio — the product-wide convention. Positive: longs pay. */
  rate: number;
  /** Signed USD paid per one unit of the asset held long, that hour. */
  perUnit: number;
}

export function fetchFundingHistory(
  marketId: number,
  window: FundingWindow,
): Promise<FundingPoint[]> {
  const hours = FUNDING_WINDOWS.find((w) => w.key === window)?.hours ?? 168;
  return remember(`fundings:${marketId}:${window}`, 60_000, async () => {
    const end = Math.floor(Date.now() / 1000);
    const res = await get<{
      fundings?: { timestamp: number; value: string; rate: string; direction: string }[];
    }>("fundings", {
      market_id: marketId,
      resolution: "1h",
      start_timestamp: end - hours * 3600,
      end_timestamp: end,
      count_back: Math.min(750, hours),
    });
    // `rate` is an unsigned percent per hour; `direction` carries the sign —
    // "long" means longs paid, "short" means shorts paid.
    return (res.fundings ?? [])
      .map((f) => {
        const sign = f.direction === "short" ? -1 : 1;
        return {
          t: n(f.timestamp) * 1000,
          rate: hourlyPctToEightHour(sign * n(f.rate)),
          // USD per real unit; a display unit is a fraction of one, so the
          // payment scales the way a price does.
          perUnit: displayPrice(marketId, sign * n(f.value)),
        };
      })
      .sort((a, b) => a.t - b.t);
  });
}

/* ── 24h sparklines ──────────────────────────────────────────── */

/** marketId → 24 hourly closes. One call covers every market. */
export function fetchPriceCharts(): Promise<Record<number, number[]>> {
  return remember("priceCharts", 60_000, async () => {
    const res = await get<{
      price_charts?: { market_id: number; prices: (string | number)[] }[];
    }>("marketPriceCharts", {});
    const out: Record<number, number[]> = {};
    for (const c of res.price_charts ?? []) {
      const prices = (c.prices ?? [])
        .map((p) => n(p))
        .filter((v) => v > 0)
        .map((v) => displayPrice(c.market_id, v));
      if (prices.length > 1) out[c.market_id] = prices;
    }
    return out;
  });
}
