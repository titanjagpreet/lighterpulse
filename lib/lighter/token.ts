import "server-only";
import { external } from "./client";
import { cached, type Cached } from "../cache";
import { n } from "../format";

/**
 * LIT market data. Lighter's own API prices the LIT perp, but market cap and
 * circulating supply only exist off-platform. The join key — `gecko_id` —
 * ships inside Lighter's own `tokenlist`, which is a nice touch.
 */

export interface TokenStats {
  price: number | null;
  marketCap: number | null;
  volume24h: number | null;
  change24h: number | null;
}

const COINGECKO =
  "https://api.coingecko.com/api/v3/simple/price" +
  "?ids=lighter&vs_currencies=usd&include_market_cap=true" +
  "&include_24hr_vol=true&include_24hr_change=true";

async function fetchLit(): Promise<TokenStats> {
  const key = process.env.COINGECKO_API_KEY;
  const url = key ? `${COINGECKO}&x_cg_demo_api_key=${key}` : COINGECKO;
  const res = await external<{
    lighter?: {
      usd?: number;
      usd_market_cap?: number;
      usd_24h_vol?: number;
      usd_24h_change?: number;
    };
  }>(url, "coingecko/lit");

  const d = res.lighter;
  if (!d) return { price: null, marketCap: null, volume24h: null, change24h: null };

  return {
    price: d.usd != null ? n(d.usd) : null,
    marketCap: d.usd_market_cap != null ? n(d.usd_market_cap) : null,
    volume24h: d.usd_24h_vol != null ? n(d.usd_24h_vol) : null,
    change24h: d.usd_24h_change != null ? n(d.usd_24h_change) : null,
  };
}

export const getLitStats = (): Promise<Cached<TokenStats>> =>
  cached("coingecko:lit", 60, fetchLit);
