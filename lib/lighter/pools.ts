import "server-only";
import { api, explorerApi } from "./client";
import { cached, type Cached } from "../cache";
import { n } from "../format";
import { parseLog, type RawLog } from "./activity";
import {
  BUYBACK_ACCOUNT_INDEX,
  LIT_SPOT_MARKET_ID,
  LLP_INDEX,
  STAKING_POOL_INDEX,
  parsePoolInfo,
  poolDetailFrom,
  type PoolDetail,
  type PublicPool,
  type RawPoolAccount,
} from "../pools";
import type { DailySeries } from "./types";

/**
 * Server reads for pools, staking and the buyback account.
 *
 * `account` weighs as much as any main-API call, and the explorer's log
 * endpoint spends 2 of the 90 weighted requests per minute that host allows
 * for the whole site, so everything here is cached — the reward history for
 * an hour, since it changes once a day.
 */

const DAY_MS = 86_400_000;

async function fetchPoolAccount(index: number): Promise<RawPoolAccount> {
  const res = await api<{ accounts?: RawPoolAccount[] }>("account", {
    by: "index",
    value: index,
  });
  const raw = res.accounts?.[0];
  if (!raw) throw new Error(`account ${index} not found`);
  return raw;
}

/* ── LLP ─────────────────────────────────────────────────────── */

export const getLlp = (): Promise<Cached<PoolDetail>> =>
  cached("pool:llp", 120, async () => poolDetailFrom(await fetchPoolAccount(LLP_INDEX)));

/* ── LIT staking ─────────────────────────────────────────────── */

export interface StakingPool {
  /** LIT held by the pool — every staker's principal plus rewards. */
  staked: number;
  totalShares: number;
  /** LIT one share redeems for today. */
  litPerShare: number | null;
  /** Lighter's figure. Dollar-denominated, so it mostly tracks LIT's price. */
  dollarApy: number | null;
  createdAt: number | null;
}

async function fetchStakingPool(): Promise<StakingPool> {
  const raw = await fetchPoolAccount(STAKING_POOL_INDEX);
  const info = parsePoolInfo(raw.pool_info);
  const staked = n(raw.assets?.find((a) => a.symbol === "LIT")?.balance);
  return {
    staked,
    totalShares: info.totalShares,
    litPerShare: info.totalShares > 0 ? staked / info.totalShares : null,
    dollarApy: info.apy,
    createdAt: raw.created_at ? raw.created_at * 1000 : null,
  };
}

export const getStakingPool = (): Promise<Cached<StakingPool>> =>
  cached("pool:staking", 300, fetchStakingPool);

export interface StakingRewards {
  /** LIT paid into the pool per UTC day. */
  daily: DailySeries;
  last: { t: number; lit: number; hash: string } | null;
  total: number;
}

/**
 * Rewards reach the pool as one LIT transfer a day, at 18:00 UTC. The pool's
 * own log holds nothing else — stakes and unstakes are recorded on each
 * staker's account — so every LIT transfer in is counted as a reward.
 */
async function fetchStakingRewards(): Promise<StakingRewards> {
  const PAGE = 50;
  const drops: { t: number; lit: number; hash: string }[] = [];
  for (let page = 0; page < 10; page++) {
    const res = await explorerApi<RawLog[]>(`accounts/${STAKING_POOL_INDEX}/logs`, {
      limit: PAGE,
      offset: page * PAGE,
    });
    const rows = Array.isArray(res) ? res : [];
    for (const r of rows) {
      const row = parseLog(r, STAKING_POOL_INDEX);
      if (!row || row.kind !== "transfer" || row.direction !== "in") continue;
      if (row.asset !== "LIT" || !(row.amount && row.amount > 0) || !row.t) continue;
      if (row.status && /fail/i.test(row.status)) continue;
      drops.push({ t: row.t, lit: row.amount, hash: row.hash });
    }
    if (rows.length < PAGE) break;
  }

  drops.sort((a, b) => a.t - b.t);
  if (drops.length === 0) return { daily: { start: 0, values: [] }, last: null, total: 0 };

  const start = Math.floor(drops[0].t / DAY_MS) * DAY_MS;
  const end = Math.floor(drops[drops.length - 1].t / DAY_MS) * DAY_MS;
  const values = new Array<number>(Math.round((end - start) / DAY_MS) + 1).fill(0);
  let total = 0;
  for (const d of drops) {
    values[Math.round((Math.floor(d.t / DAY_MS) * DAY_MS - start) / DAY_MS)] += d.lit;
    total += d.lit;
  }
  return {
    daily: { start, values: values.map((v) => Math.round(v * 100) / 100) },
    last: drops[drops.length - 1],
    total,
  };
}

export const getStakingRewards = (): Promise<Cached<StakingRewards>> =>
  cached("staking:rewards", 3600, fetchStakingRewards);

/* ── public pools ────────────────────────────────────────────── */

interface RawPoolMeta {
  account_index: number;
  created_at?: number;
  account_type?: number;
  name?: string;
  l1_address?: string;
  annual_percentage_yield?: number;
  sharpe_ratio?: number;
  status?: number;
  operator_fee?: string;
  total_asset_value?: string;
  total_shares?: number;
}

const finite = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/**
 * `publicPools` is closed, but `publicPoolsMetadata` is public when paged
 * down from a high index: each page starts one below the index given. Paged
 * from index 0 it returns nothing, which makes it look closed too.
 */
async function fetchPublicPools(): Promise<PublicPool[]> {
  const PAGE = 100;
  const out: PublicPool[] = [];
  let cursor = LLP_INDEX + 1;
  for (let page = 0; page < 20; page++) {
    const res = await api<{ public_pools?: RawPoolMeta[] }>("publicPoolsMetadata", {
      index: cursor,
      limit: PAGE,
      filter: "all",
    });
    const rows = res.public_pools ?? [];
    for (const r of rows) {
      out.push({
        index: n(r.account_index),
        name: r.name?.trim() || `Pool #${r.account_index}`,
        type: n(r.account_type),
        operator: r.l1_address ?? "",
        createdAt: r.created_at ? r.created_at * 1000 : null,
        tvl: n(r.total_asset_value),
        apy: finite(r.annual_percentage_yield),
        sharpe: finite(r.sharpe_ratio),
        operatorFee: n(r.operator_fee),
        totalShares: n(r.total_shares),
        status: n(r.status),
      });
    }
    if (rows.length < PAGE) break;
    cursor = n(rows[rows.length - 1].account_index);
  }
  return out.sort((a, b) => b.tvl - a.tvl);
}

export const getPublicPools = (): Promise<Cached<PublicPool[]>> =>
  cached("pools:public", 600, fetchPublicPools);

/* ── buyback account ─────────────────────────────────────────── */

export interface BuybackAccount {
  /** LIT bought back and not yet sent to the dead address. */
  litHeld: number;
  usdc: number;
  /** USDC committed to resting buy orders. */
  usdcLocked: number;
}

async function fetchBuybackAccount(): Promise<BuybackAccount> {
  const raw = await fetchPoolAccount(BUYBACK_ACCOUNT_INDEX);
  const asset = (s: string) => raw.assets?.find((a) => a.symbol === s);
  return {
    litHeld: n(asset("LIT")?.balance),
    usdc: n(asset("USDC")?.balance),
    usdcLocked: n(asset("USDC")?.locked_balance),
  };
}

export const getBuybackAccount = (): Promise<Cached<BuybackAccount>> =>
  cached("buyback:account", 120, fetchBuybackAccount);

export interface BuybackFill {
  hash: string;
  t: number;
  price: number;
  lit: number;
  usdc: number;
  role: "maker" | "taker";
}

/** The latest LIT purchases on the spot book, from account #0's log. */
async function fetchBuybackFills(): Promise<BuybackFill[]> {
  const res = await explorerApi<RawLog[]>(`accounts/${BUYBACK_ACCOUNT_INDEX}/logs`, {
    limit: 100,
    offset: 0,
  });
  const fills: BuybackFill[] = [];
  for (const r of Array.isArray(res) ? res : []) {
    const row = parseLog(r, BUYBACK_ACCOUNT_INDEX);
    if (!row || row.kind !== "trade" || row.side !== "buy") continue;
    if (row.marketId !== LIT_SPOT_MARKET_ID || !row.price || !row.size || !row.role) continue;
    fills.push({
      hash: row.hash,
      t: row.t,
      price: row.price,
      lit: row.size,
      usdc: row.price * row.size,
      role: row.role,
    });
  }
  return fills;
}

export const getBuybackFills = (): Promise<Cached<BuybackFill[]>> =>
  cached("buyback:fills", 60, fetchBuybackFills);
