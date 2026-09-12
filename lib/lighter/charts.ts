import "server-only";
import { api } from "./client";
import { cached, type Cached } from "../cache";
import { n } from "../format";

/**
 * 24 hourly closes for every market, in one call — the sparkline source.
 *
 * `orderBookDetails.daily_chart` looks like the same thing but ships empty on
 * every market. `marketPriceCharts` accepts a `resolution` parameter and
 * ignores it: the answer is always 1h × 24.
 */

/** marketId → hourly closes, oldest first. */
export type PriceCharts = Record<number, number[]>;

async function fetchPriceCharts(): Promise<PriceCharts> {
  const res = await api<{
    price_charts: { market_id: number; prices: (string | number)[] }[];
  }>("marketPriceCharts");

  const out: PriceCharts = {};
  for (const c of res.price_charts ?? []) {
    const prices = (c.prices ?? [])
      .map((p) => n(p))
      .filter((v) => v > 0)
      // Six significant digits is invisible at sparkline scale and trims the
      // payload every markets page carries.
      .map((v) => Number(v.toPrecision(6)));
    if (prices.length > 1) out[c.market_id] = prices;
  }
  return out;
}

export const getPriceCharts = (): Promise<Cached<PriceCharts>> =>
  cached("charts:24h", 60, fetchPriceCharts);
