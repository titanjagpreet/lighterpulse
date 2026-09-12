import { n } from "./format";
import { API_BASE_PUBLIC } from "./lighter/public";
import {
  normaliseAccount,
  type AssetBalance,
  type Position,
  type RawAccount,
} from "./lighter/account";
import type { DailySeries } from "./lighter/types";

/**
 * Pools — the LLP, public vaults and LIT staking.
 *
 * Every pool is an ordinary Lighter account carrying a `pool_info` block: a
 * share count, a daily share-price history and daily returns. Shapes and maths
 * live here, isomorphic, because the LLP page renders on the server while a
 * vault's page loads in the visitor's browser.
 */

export const LLP_INDEX = 281474976710654;
export const STAKING_POOL_INDEX = 281474976624800;
/** Buys LIT on the spot book with trading fees, and holds it until it is burned. */
export const BUYBACK_ACCOUNT_INDEX = 0;
export const LIT_SPOT_MARKET_ID = 2049;

/** Lighter docs, LIT Utility: each LIT staked allows up to 10 USDC in the LLP. */
export const LLP_USDC_PER_STAKED_LIT = 10;
/** Lighter docs, LIT Utility: unstaking is subject to a 3-day lockup. */
export const UNSTAKE_LOCKUP_DAYS = 3;
/** Lighter docs, LIT Utility: stakers currently earn a fixed 6% APR. */
export const DOCUMENTED_STAKING_APR = 6;

const DAY_MS = 86_400_000;

/* ── raw shapes ──────────────────────────────────────────────── */

export interface RawPoolInfo {
  status?: number;
  operator_fee?: string;
  min_operator_share_rate?: string;
  total_shares?: number | string;
  operator_shares?: number | string;
  annual_percentage_yield?: number;
  sharpe_ratio?: number;
  daily_returns?: { timestamp: number; daily_return: number }[];
  share_prices?: { timestamp: number; share_price: number }[];
  strategies?: ({ collateral?: string } | null)[];
}

export interface RawPoolAccount extends RawAccount {
  name?: string;
  description?: string;
  created_at?: number;
  pool_info?: RawPoolInfo;
}

/* ── normalised ──────────────────────────────────────────────── */

export interface PoolInfo {
  status: number;
  /** Share of profits the operator keeps, in percent. */
  operatorFee: number;
  totalShares: number;
  operatorShares: number;
  /**
   * Lighter's own annualised figure. It is measured in dollars, so for the
   * staking pool it mostly reflects LIT's price, not the staking yield.
   */
  apy: number | null;
  sharpe: number | null;
  /** USD per share, one bucket per UTC day, from the first non-zero price. */
  sharePrice: DailySeries;
  /** Daily return as a ratio, aligned to the share-price days. */
  dailyReturns: DailySeries;
  /** Collateral per strategy, USD. The API does not name them. */
  strategies: number[];
}

export interface PoolDetail {
  index: number;
  name: string;
  description: string;
  /** Operator's L1 address; the zero address for protocol pools. */
  operator: string;
  createdAt: number | null;
  tvl: number;
  collateral: number;
  available: number;
  info: PoolInfo;
  positions: Position[];
  assets: AssetBalance[];
  unrealizedPnl: number;
  notional: number;
}

export interface PublicPool {
  index: number;
  name: string;
  /** 2 = public pool, 3 = protocol pool such as the LLP. */
  type: number;
  operator: string;
  createdAt: number | null;
  tvl: number;
  apy: number | null;
  sharpe: number | null;
  operatorFee: number;
  totalShares: number;
  status: number;
}

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/* ── parsing ─────────────────────────────────────────────────── */

const finite = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/**
 * One bucket per UTC day. Lighter stamps pool history at 16:00 New York time,
 * which falls on the same UTC day all year round.
 */
function daily<T>(
  rows: T[] | undefined,
  time: (r: T) => number,
  value: (r: T) => number,
  fill: "carry" | "zero",
  from?: number,
): DailySeries {
  const byDay = new Map<number, number>();
  for (const r of rows ?? []) {
    const t = time(r) * 1000;
    const v = value(r);
    if (!Number.isFinite(t) || !Number.isFinite(v)) continue;
    byDay.set(Math.floor(t / DAY_MS) * DAY_MS, v);
  }
  const days = [...byDay.keys()].sort((a, b) => a - b).filter((d) => from == null || d >= from);
  if (days.length === 0) return { start: 0, values: [] };

  const start = days[0];
  const end = days[days.length - 1];
  const values: number[] = [];
  let prev = 0;
  for (let d = start; d <= end; d += DAY_MS) {
    const v = byDay.get(d);
    if (v != null) prev = v;
    values.push(v ?? (fill === "carry" ? prev : 0));
  }
  return { start, values };
}

export function parsePoolInfo(raw: RawPoolInfo | undefined): PoolInfo {
  const p = raw ?? {};

  // A pool can publish zero prices before it goes live; history starts at the
  // first real one, and returns are trimmed to match.
  const firstPriced = (p.share_prices ?? [])
    .filter((x) => n(x.share_price) > 0)
    .reduce((min, x) => Math.min(min, x.timestamp), Infinity);
  const from = Number.isFinite(firstPriced)
    ? Math.floor((firstPriced * 1000) / DAY_MS) * DAY_MS
    : undefined;

  return {
    status: n(p.status),
    operatorFee: n(p.operator_fee),
    totalShares: n(p.total_shares),
    operatorShares: n(p.operator_shares),
    apy: finite(p.annual_percentage_yield),
    sharpe: finite(p.sharpe_ratio),
    sharePrice:
      from == null
        ? { start: 0, values: [] }
        : daily(p.share_prices, (x) => x.timestamp, (x) => n(x.share_price), "carry", from),
    dailyReturns:
      from == null
        ? { start: 0, values: [] }
        : daily(p.daily_returns, (x) => x.timestamp, (x) => n(x.daily_return), "zero", from),
    strategies: (p.strategies ?? []).map((s) => n(s?.collateral)),
  };
}

export function poolDetailFrom(raw: RawPoolAccount): PoolDetail {
  const account = normaliseAccount(raw);
  return {
    index: account.index,
    name: raw.name?.trim() || `Pool #${account.index}`,
    description: raw.description?.trim() ?? "",
    operator: account.address,
    createdAt: raw.created_at ? raw.created_at * 1000 : null,
    tvl: account.totalValue,
    collateral: account.collateral,
    available: account.availableBalance,
    info: parsePoolInfo(raw.pool_info),
    positions: account.positions,
    assets: account.assets,
    unrealizedPnl: account.totalUnrealizedPnl,
    notional: account.totalNotional,
  };
}

/** A pool's account, from the visitor's browser. Null when it is not a pool. */
export async function fetchPoolDetail(
  index: number,
  signal?: AbortSignal,
): Promise<PoolDetail | null> {
  const res = await fetch(`${API_BASE_PUBLIC}/api/v1/account?by=index&value=${index}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { accounts?: RawPoolAccount[] };
  const raw = json.accounts?.[0];
  return raw?.pool_info ? poolDetailFrom(raw) : null;
}

/* ── maths over a share-price series ─────────────────────────── */

/** Growth over the last `days` days, or the whole history when null. */
export function periodReturn(
  s: DailySeries,
  days: number | null,
): { ratio: number; days: number } | null {
  const len = s.values.length;
  if (len < 2) return null;
  const from = days == null ? 0 : len - 1 - days;
  // A window longer than the history would quietly report a shorter one.
  if (from < 0) return null;
  const a = s.values[from];
  const b = s.values[len - 1];
  if (!(a > 0) || !(b > 0)) return null;
  return { ratio: b / a - 1, days: len - 1 - from };
}

/** A return over `days`, annualised without compounding — an APR in percent. */
export function annualised(ratio: number, days: number): number | null {
  return days > 0 && Number.isFinite(ratio) ? ratio * (365 / days) * 100 : null;
}

export interface Drawdown {
  /** Negative percentage, e.g. −4.2. Zero when the series never fell. */
  pct: number;
  peakT: number;
  troughT: number;
}

/** The deepest fall from a running peak, starting at index `from`. */
export function maxDrawdown(s: DailySeries, from = 0): Drawdown | null {
  let peak = -Infinity;
  let peakI = from;
  let worst = 0;
  let worstPeak = from;
  let worstTrough = from;
  for (let i = from; i < s.values.length; i++) {
    const v = s.values[i];
    if (!(v > 0)) continue;
    if (v > peak) {
      peak = v;
      peakI = i;
    }
    const dd = v / peak - 1;
    if (dd < worst) {
      worst = dd;
      worstPeak = peakI;
      worstTrough = i;
    }
  }
  if (!Number.isFinite(peak)) return null;
  return {
    pct: worst * 100,
    peakT: s.start + worstPeak * DAY_MS,
    troughT: s.start + worstTrough * DAY_MS,
  };
}

export interface BacktestResult {
  start: number;
  end: number;
  days: number;
  deposit: number;
  value: number;
  gain: number;
  returnPct: number;
  aprPct: number | null;
  drawdown: Drawdown | null;
}

/**
 * What `deposit` placed on `startT` would be worth at the latest share price.
 * Fees on entry and exit are not modelled; share price is already net of the
 * operator's cut.
 */
export function backtest(
  s: DailySeries,
  deposit: number,
  startT: number,
): BacktestResult | null {
  const last = s.values.length - 1;
  if (last < 1 || !(deposit > 0)) return null;
  const i = Math.max(0, Math.min(last, Math.round((startT - s.start) / DAY_MS)));
  const entry = s.values[i];
  const exit = s.values[last];
  if (!(entry > 0) || !(exit > 0) || i >= last) return null;
  const ratio = exit / entry - 1;
  return {
    start: s.start + i * DAY_MS,
    end: s.start + last * DAY_MS,
    days: last - i,
    deposit,
    value: deposit * (1 + ratio),
    gain: deposit * ratio,
    returnPct: ratio * 100,
    aprPct: annualised(ratio, last - i),
    drawdown: maxDrawdown(s, i),
  };
}
