import "server-only";
import { api } from "./client";
import { cached, type Cached } from "../cache";
import { n } from "../format";
import { OI_SIDES, type AssetClass, type FundingRate, type Market } from "./types";

export { OI_SIDES };

/**
 * Markets, built from `orderBookDetails` — a strict superset of the
 * `exchangeStats` endpoint the old site used. Asset class and icon are joined
 * in from `tokenlist`, and the current funding rate from `funding-rates`.
 */

/* ── raw upstream shapes ─────────────────────────────────────── */

export interface RawOrderBook {
  symbol: string;
  market_id: number;
  status: string;
  mark_price: string | number;
  index_price: string | number;
  last_trade_price: number;
  daily_price_change: number;
  daily_price_low: number;
  daily_price_high: number;
  daily_trades_count: number;
  daily_base_token_volume: number;
  daily_quote_token_volume: number;
  open_interest: number;
  min_initial_margin_fraction: number;
  maintenance_margin_fraction: number;
  maker_fee: string;
  taker_fee: string;
  /** Real-to-display unit factor. See lighter/multiplier. */
  multiplier?: string | number;
}

interface RawToken {
  symbol: string;
  asset_type?: string;
  categories?: string[];
  logo?: string;
  logo_extension?: string;
}


/* ── asset classification ────────────────────────────────────── */

/**
 * `tokenlist` splits assets into CRYPTO and RWA, then tags RWAs with
 * categories. There is no single field for asset class, so we derive it.
 * Six `1000*` memecoins are absent from tokenlist entirely — those fall
 * through to crypto, which is correct.
 */
function classify(token: RawToken | undefined): AssetClass {
  if (!token || token.asset_type !== "RWA") return "crypto";
  const c = new Set(token.categories ?? []);
  if (c.has("FX")) return "fx";
  if (c.has("COMMODITIES") || c.has("COMPUTE")) return "commodity";
  if (c.has("BONDS")) return "bond";
  if (c.has("ETF")) return "index";
  // STOCK, PRE_IPO, KRW, or only a NEW tag — all equities in practice.
  return "equity";
}

/** Lighter's own token icons, on the URL scheme its open-source client uses. */
const TOKEN_ICON_BASE = "https://assets.lighter.xyz/fe/token";

function tokenIcon(token: RawToken | undefined): string | null {
  return token?.logo ? `${TOKEN_ICON_BASE}/${token.logo}.${token.logo_extension || "svg"}` : null;
}

/* ── cached primitives ───────────────────────────────────────── */

async function fetchTokenList(): Promise<Record<string, RawToken>> {
  const res = await api<{ tokens: RawToken[] }>("tokenlist");
  const map: Record<string, RawToken> = {};
  for (const t of res.tokens ?? []) map[t.symbol] = t;
  return map;
}

export const getTokenList = () =>
  cached("tokenlist", 60 * 60 * 24, fetchTokenList);

async function fetchOrderBooks(): Promise<RawOrderBook[]> {
  const res = await api<{ order_book_details: RawOrderBook[] }>(
    "orderBookDetails",
  );
  return res.order_book_details ?? [];
}

export const getOrderBooks = () => cached("markets:raw", 15, fetchOrderBooks);

async function fetchFunding(): Promise<FundingRate[]> {
  const res = await api<{
    funding_rates: {
      exchange: string;
      symbol: string;
      market_id: number;
      rate: number | string;
    }[];
  }>("funding-rates");
  return (res.funding_rates ?? []).map((f) => ({
    exchange: f.exchange,
    symbol: f.symbol,
    marketId: f.market_id,
    rate: n(f.rate),
  }));
}

export const getFundingRates = () => cached("funding", 30, fetchFunding);

/**
 * Market id → symbol for perps AND spot. Account history refers to markets by
 * id only, and spot books (LIT/USDC is 2049) are absent from `getMarkets`.
 */
async function fetchMarketNames(): Promise<Record<number, string>> {
  const res = await api<{
    order_book_details?: { market_id: number; symbol: string }[];
    spot_order_book_details?: { market_id: number; symbol: string }[];
  }>("orderBookDetails");
  const out: Record<number, string> = {};
  for (const m of [...(res.order_book_details ?? []), ...(res.spot_order_book_details ?? [])]) {
    out[m.market_id] = m.symbol;
  }
  return out;
}

export const getMarketNames = () =>
  cached("markets:names", 60 * 60, fetchMarketNames);

/* ── composed ────────────────────────────────────────────────── */

export async function getMarkets(): Promise<Cached<Market[]>> {
  const [books, tokens, funding] = await Promise.all([
    getOrderBooks(),
    getTokenList().catch(() => null),
    getFundingRates().catch(() => null),
  ]);

  const tokenMap = tokens?.data ?? {};
  const lighterFunding = new Map<number, number>();
  for (const f of funding?.data ?? []) {
    if (f.exchange === "lighter") lighterFunding.set(f.marketId, f.rate);
  }

  const markets: Market[] = books.data.map((m) => {
    const token = tokenMap[m.symbol];
    // Prices and sizes arrive in real units. Every market today has a
    // multiplier of 1; converting anyway keeps a future one readable.
    const multiplier = Number(m.multiplier) > 0 ? Number(m.multiplier) : 1;
    const price = (v: unknown) => n(v) / multiplier;
    const size = (v: unknown) => n(v) * multiplier;

    const markPrice = price(m.mark_price);
    const oiBase = size(m.open_interest);
    const dayLow = price(m.daily_price_low);
    const dayHigh = price(m.daily_price_high);
    const span = dayHigh - dayLow;

    return {
      symbol: m.symbol,
      marketId: m.market_id,
      status: m.status,
      active: m.status === "active",
      assetClass: classify(token),

      markPrice,
      indexPrice: price(m.index_price),
      lastPrice: price(m.last_trade_price),
      change24h: n(m.daily_price_change),

      oiBase,
      // Size × price — the multiplier cancels, so this is USD either way.
      oiUsd: oiBase * markPrice * OI_SIDES,

      volume24h: n(m.daily_quote_token_volume),
      volume24hBase: size(m.daily_base_token_volume),
      trades24h: n(m.daily_trades_count),

      dayLow,
      dayHigh,
      rangePos:
        span > 0 ? Math.min(1, Math.max(0, (markPrice - dayLow) / span)) : null,

      // Margin fractions are basis points: 200 → 2% → 50×.
      maxLeverage:
        m.min_initial_margin_fraction > 0
          ? Math.round(10_000 / m.min_initial_margin_fraction)
          : 1,
      makerFee: n(m.maker_fee),
      takerFee: n(m.taker_fee),
      maintenanceMarginFraction: n(m.maintenance_margin_fraction),

      funding: lighterFunding.get(m.market_id) ?? null,

      multiplier,
      icon: tokenIcon(token),
    };
  });

  markets.sort((a, b) => b.oiUsd - a.oiUsd);

  return { ...books, data: markets };
}

/* ── derived aggregates ──────────────────────────────────────── */

export interface MarketSummary {
  count: number;
  activeCount: number;
  totalOi: number;
  totalVolume: number;
  totalTrades: number;
  byClass: { key: AssetClass; count: number; volume: number; oi: number }[];
  breadth: { up: number; down: number; flat: number };
}

export function summarise(markets: Market[]): MarketSummary {
  const byClass = new Map<
    AssetClass,
    { key: AssetClass; count: number; volume: number; oi: number }
  >();
  let totalOi = 0;
  let totalVolume = 0;
  let totalTrades = 0;
  const breadth = { up: 0, down: 0, flat: 0 };

  for (const m of markets) {
    totalOi += m.oiUsd;
    totalVolume += m.volume24h;
    totalTrades += m.trades24h;

    if (m.change24h > 0) breadth.up++;
    else if (m.change24h < 0) breadth.down++;
    else breadth.flat++;

    const bucket = byClass.get(m.assetClass) ?? {
      key: m.assetClass,
      count: 0,
      volume: 0,
      oi: 0,
    };
    bucket.count++;
    bucket.volume += m.volume24h;
    bucket.oi += m.oiUsd;
    byClass.set(m.assetClass, bucket);
  }

  return {
    count: markets.length,
    activeCount: markets.filter((m) => m.active).length,
    totalOi,
    totalVolume,
    totalTrades,
    byClass: [...byClass.values()].sort((a, b) => b.volume - a.volume),
    breadth,
  };
}
