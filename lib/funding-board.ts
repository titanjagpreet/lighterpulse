import type { AssetClass, FundingRate, Market } from "./lighter/types";

/**
 * Cross-venue funding, joined per Lighter market.
 *
 * Every rate is an 8-hour ratio. Lighter's `funding-rates` feed normalises
 * venues with other intervals before we see them — checked against each
 * source: Hyperliquid's hourly rate × 8, Binance's 4-hour symbols × 2, and
 * Bybit and Binance 8-hour symbols unchanged. So columns compare directly.
 *
 * Isomorphic: the server builds the rows, the browser re-derives spreads as
 * Lighter's live rate moves.
 */

export const OTHER_VENUES = ["binance", "bybit", "hyperliquid"] as const;
export type OtherVenue = (typeof OTHER_VENUES)[number];

export const VENUE_LABEL: Record<OtherVenue | "lighter", string> = {
  lighter: "Lighter",
  binance: "Binance",
  bybit: "Bybit",
  hyperliquid: "Hyperliquid",
};

export interface FundingRow {
  marketId: number;
  symbol: string;
  assetClass: AssetClass;
  active: boolean;
  oiUsd: number;
  lighter: number;
  venues: Record<OtherVenue, number | null>;
}

export interface Spread {
  venue: OtherVenue;
  /** Lighter minus venue, 8-hour ratio. Positive: Lighter pays longs more to hold. */
  spread: number;
}

export function buildFundingRows(rates: FundingRate[], markets: Market[]): FundingRow[] {
  const byMarket = new Map<number, Partial<Record<string, number>>>();
  for (const r of rates) {
    const entry = byMarket.get(r.marketId) ?? {};
    entry[r.exchange] = r.rate;
    byMarket.set(r.marketId, entry);
  }

  const rows: FundingRow[] = [];
  for (const m of markets) {
    const entry = byMarket.get(m.marketId);
    const lighter = entry?.lighter;
    if (lighter == null || !Number.isFinite(lighter)) continue;
    rows.push({
      marketId: m.marketId,
      symbol: m.symbol,
      assetClass: m.assetClass,
      active: m.active,
      oiUsd: m.oiUsd,
      lighter,
      venues: {
        binance: entry?.binance ?? null,
        bybit: entry?.bybit ?? null,
        hyperliquid: entry?.hyperliquid ?? null,
      },
    });
  }
  return rows;
}

/** The venue furthest from Lighter's rate — the widest available spread. */
export function widestSpread(
  lighter: number,
  venues: Record<OtherVenue, number | null>,
): Spread | null {
  let best: Spread | null = null;
  for (const v of OTHER_VENUES) {
    const rate = venues[v];
    if (rate == null) continue;
    const spread = lighter - rate;
    if (!best || Math.abs(spread) > Math.abs(best.spread)) best = { venue: v, spread };
  }
  return best;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
