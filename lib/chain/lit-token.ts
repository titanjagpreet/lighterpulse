import "server-only";
import { cached, type Cached } from "../cache";
import { external } from "../lighter/client";

/**
 * LIT on Ethereum. Burns are transfers to the dead address, so the amount
 * burned is simply that address's balance — one `eth_call`, no indexer. The
 * list of individual burn transactions would need historical log queries,
 * which free public nodes refuse.
 */

export const LIT_TOKEN = "0x232ce3bd40fcd6f80f3d55a522d03f25df784ee2";
export const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";

/** Etherscan's view of LIT held by the dead address — the proof of burn. */
export const BURN_PROOF_URL = `https://etherscan.io/token/${LIT_TOKEN}?a=${DEAD_ADDRESS}`;

const RPCS = [
  process.env.ETH_RPC_URL,
  "https://ethereum-rpc.publicnode.com",
  "https://eth.llamarpc.com",
].filter((u): u is string => Boolean(u));

/** LIT has 18 decimals; 10^12 keeps six of them through the Number conversion. */
const toTokens = (wei: bigint) => Number(wei / BigInt("1000000000000")) / 1e6;

async function ethCall(data: string): Promise<bigint> {
  let lastError: unknown = new Error("no RPC configured");
  for (const url of RPCS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_call",
          params: [{ to: LIT_TOKEN, data }, "latest"],
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
      const json = (await res.json()) as { result?: string; error?: { message?: string } };
      if (typeof json.result === "string" && /^0x[0-9a-f]+$/i.test(json.result)) {
        return BigInt(json.result);
      }
      lastError = new Error(json.error?.message ?? `bad eth_call result from ${url}`);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

export interface LitSupply {
  totalSupply: number;
  burned: number;
  /** CoinGecko's circulating figure, which does not subtract burns. */
  circulatingReported: number | null;
  /** Reported circulating minus burned. */
  circulating: number | null;
}

async function fetchChainSupply(): Promise<{ totalSupply: number; burned: number }> {
  const holder = DEAD_ADDRESS.slice(2).toLowerCase().padStart(64, "0");
  const [total, burned] = await Promise.all([
    ethCall("0x18160ddd"), // totalSupply()
    ethCall(`0x70a08231${holder}`), // balanceOf(dead)
  ]);
  return { totalSupply: toTokens(total), burned: toTokens(burned) };
}

async function fetchCirculating(): Promise<number | null> {
  const key = process.env.COINGECKO_API_KEY;
  const url =
    "https://api.coingecko.com/api/v3/coins/lighter?localization=false&tickers=false" +
    "&market_data=true&community_data=false&developer_data=false&sparkline=false" +
    (key ? `&x_cg_demo_api_key=${key}` : "");
  const res = await external<{ market_data?: { circulating_supply?: number } }>(
    url,
    "coingecko/lit-supply",
  );
  const v = res.market_data?.circulating_supply;
  return typeof v === "number" && v > 0 ? v : null;
}

export async function getLitSupply(): Promise<Cached<LitSupply>> {
  const [chain, circulating] = await Promise.all([
    cached("lit:supply", 300, fetchChainSupply),
    cached("coingecko:lit:circulating", 3600, fetchCirculating).catch(() => null),
  ]);
  const reported = circulating?.data ?? null;
  return {
    ...chain,
    data: {
      ...chain.data,
      circulatingReported: reported,
      circulating: reported != null ? Math.max(0, reported - chain.data.burned) : null,
    },
  };
}
