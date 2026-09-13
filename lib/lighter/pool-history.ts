import "server-only";
import { unstable_cache } from "next/cache";
import { readJson } from "./open-interest";
import type { OiSeriesPart } from "../oi";

/**
 * Staking, burn and pool TVL history, recorded hourly by the collector.
 *
 * None of these has a history endpoint: the staking pool, the buyback account
 * and each vault report only their current balance, and the dead address only
 * its current LIT. Like open interest, the history exists only from the day
 * recording began. Each part is one reading per UTC day — the last of the day.
 */

export interface PoolHistory {
  at: string;
  since: string | null;
  /** LIT held by the staking pool. */
  staked: OiSeriesPart;
  /** LIT one staking share redeems for; its growth is the realised yield. */
  litPerShare: OiSeriesPart;
  /** LIT held by the dead address on Ethereum. */
  burned: OiSeriesPart;
  /** LIT held by the buyback account, awaiting burn. */
  held: OiSeriesPart;
  /** Pool account index → TVL, USD. The LLP and every vault over $10K. */
  tvl: Record<string, OiSeriesPart>;
}

export const getPoolHistory = unstable_cache(
  () => readJson<PoolHistory>("lp:pools:v1:history"),
  ["lp-pools-history"],
  { revalidate: 600, tags: ["lp-pools"] },
);
