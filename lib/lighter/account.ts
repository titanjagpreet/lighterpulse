/**
 * Per-address data. Deliberately isomorphic — this is the one Lighter module
 * that runs in the browser.
 *
 * Rate limits are enforced per IP, so letting each visitor fetch their own
 * address spends *their* quota rather than the handful of Vercel addresses
 * every server render shares. Unique-per-visitor data is also pointless to
 * cache, so there is nothing to gain by proxying it.
 */

import { n } from "../format";
import { API_BASE_PUBLIC } from "./public";

export interface Position {
  marketId: number;
  symbol: string;
  side: "long" | "short";
  /** Base units, always positive. */
  size: number;
  entryPrice: number;
  /** Exchange-implied mark for this position. */
  markPrice: number;
  valueUsd: number;
  unrealizedPnl: number;
  realizedPnl: number;
  returnPct: number;
  liquidationPrice: number;
  /** Fraction of the way from mark to liquidation, 0–1. Null when unknown. */
  liquidationDistance: number | null;
  fundingPaid: number;
  leverage: number;
  marginMode: "cross" | "isolated";
  /** Initial margin as a decimal, e.g. 0.02 for 50×. */
  initialMarginFraction: number;
  /** Margin ring-fenced to this position. Zero for cross. */
  allocatedMargin: number;
  /** True when the price was derived rather than reported by the API. */
  liquidationEstimated: boolean;
}

export interface AssetBalance {
  symbol: string;
  /** Spot balance, including anything locked in open orders. */
  balance: number;
  locked: number;
  /** The part of this asset posted as perps margin. */
  marginBalance: number;
}

/** A holding in a pool — the LLP, a public vault, or LIT staking. */
export interface PoolShare {
  poolIndex: number;
  shares: number;
  /** What went in, in the pool's own asset: LIT for staking, USDC otherwise. */
  principal: number;
  entryUsdc: number;
  /** Epoch ms; null when the API reports none. */
  entryAt: number | null;
}

export interface Account {
  index: number;
  address: string;
  status: number;
  accountType: number;
  totalValue: number;
  collateral: number;
  availableBalance: number;
  crossAssetValue: number;
  maintenanceMarginRequirement: number;
  initialMarginRequirement: number;
  /** Maintenance requirement as a share of account value, 0–1. */
  marginUsage: number | null;
  positions: Position[];
  assets: AssetBalance[];
  shares: PoolShare[];
  totalUnrealizedPnl: number;
  totalFundingPaid: number;
  totalNotional: number;
}

interface RawPosition {
  market_id: number;
  symbol: string;
  sign: number;
  position: string;
  avg_entry_price: string;
  position_value: string;
  unrealized_pnl: string;
  realized_pnl: string;
  liquidation_price: string;
  total_funding_paid_out?: string;
  margin_mode: number;
  initial_margin_fraction: string;
  allocated_margin?: string;
}

export interface RawAccount {
  account_index: number;
  l1_address: string;
  status: number;
  account_type: number;
  total_asset_value?: string | number;
  collateral?: string | number;
  available_balance?: string | number;
  cross_asset_value?: string | number;
  cross_maintenance_margin_requirement?: string | number;
  cross_initial_margin_requirement?: string | number;
  positions?: RawPosition[];
  assets?: {
    symbol: string;
    balance: string;
    locked_balance: string;
    margin_balance?: string;
  }[];
  shares?: {
    public_pool_index: number;
    shares_amount: number | string;
    entry_usdc?: string;
    principal_amount?: string;
    entry_timestamp?: number;
  }[];
}

function normalisePosition(p: RawPosition): Position {
  const size = Math.abs(n(p.position));
  const valueUsd = Math.abs(n(p.position_value));
  const entryPrice = n(p.avg_entry_price);
  const unrealizedPnl = n(p.unrealized_pnl);
  const liquidationPrice = n(p.liquidation_price);
  const side: "long" | "short" = p.sign >= 0 ? "long" : "short";

  // The exchange's own mark for this position, implied by value ÷ size.
  const markPrice = size > 0 ? valueUsd / size : 0;

  // How far price must move before this position is liquidated.
  let liquidationDistance: number | null = null;
  if (markPrice > 0 && liquidationPrice > 0) {
    const gap =
      side === "long"
        ? (markPrice - liquidationPrice) / markPrice
        : (liquidationPrice - markPrice) / markPrice;
    liquidationDistance = Math.max(0, Math.min(1, gap));
  }

  // initial_margin_fraction arrives as a percentage string, e.g. "2.00".
  const imfPct = n(p.initial_margin_fraction);
  const leverage = imfPct > 0 ? 100 / imfPct : 0;

  return {
    marketId: p.market_id,
    symbol: p.symbol,
    side,
    size,
    entryPrice,
    markPrice,
    valueUsd,
    unrealizedPnl,
    realizedPnl: n(p.realized_pnl),
    returnPct: valueUsd > 0 ? (unrealizedPnl / valueUsd) * 100 : 0,
    liquidationPrice,
    liquidationDistance,
    fundingPaid: n(p.total_funding_paid_out),
    leverage,
    marginMode: p.margin_mode === 1 ? "isolated" : "cross",
    initialMarginFraction: imfPct / 100,
    allocatedMargin: n(p.allocated_margin),
    liquidationEstimated: false,
  };
}

export function normaliseAccount(a: RawAccount): Account {
  const positions = (a.positions ?? [])
    .filter((p) => Math.abs(n(p.position)) > 0)
    .map(normalisePosition)
    .sort((x, y) => y.valueUsd - x.valueUsd);

  const totalValue = n(a.total_asset_value);
  const maintenance = n(a.cross_maintenance_margin_requirement);

  return {
    index: a.account_index,
    address: a.l1_address,
    status: a.status,
    accountType: a.account_type,
    totalValue,
    collateral: n(a.collateral),
    availableBalance: n(a.available_balance),
    crossAssetValue: n(a.cross_asset_value),
    maintenanceMarginRequirement: maintenance,
    initialMarginRequirement: n(a.cross_initial_margin_requirement),
    marginUsage: totalValue > 0 ? maintenance / totalValue : null,
    positions,
    assets: (a.assets ?? [])
      .map((x) => ({
        symbol: x.symbol,
        balance: n(x.balance),
        locked: n(x.locked_balance),
        marginBalance: n(x.margin_balance),
      }))
      .filter((x) => x.balance !== 0 || x.locked !== 0 || x.marginBalance !== 0),
    shares: (a.shares ?? [])
      .map((s) => ({
        poolIndex: n(s.public_pool_index),
        shares: n(s.shares_amount),
        principal: n(s.principal_amount),
        entryUsdc: n(s.entry_usdc),
        entryAt: s.entry_timestamp ? n(s.entry_timestamp) * 1000 : null,
      }))
      .filter((s) => s.shares > 0),
    totalUnrealizedPnl: positions.reduce((s, p) => s + p.unrealizedPnl, 0),
    totalFundingPaid: positions.reduce((s, p) => s + p.fundingPaid, 0),
    totalNotional: positions.reduce((s, p) => s + p.valueUsd, 0),
  };
}

export class AccountNotFound extends Error {
  constructor(readonly query: string) {
    super(`No Lighter account for ${query}`);
    this.name = "AccountNotFound";
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_PUBLIC}/api/v1/${path}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as T & { code?: number; message?: string };
  if (json?.code && json.code !== 200 && json.code !== 0) {
    throw new Error(json.message ?? `api code ${json.code}`);
  }
  return json;
}

/** Look an account up by L1 address or by account index. */
export async function fetchAccount(query: string): Promise<Account> {
  const isAddress = /^0x[a-fA-F0-9]{40}$/.test(query);
  const by = isAddress ? "l1_address" : "index";
  const res = await get<{ accounts?: RawAccount[] }>(
    `account?by=${by}&value=${encodeURIComponent(query)}`,
  ).catch(() => null);

  const raw = res?.accounts?.[0];
  if (!raw) throw new AccountNotFound(query);
  return normaliseAccount(raw);
}

export interface SubAccount {
  index: number;
  type: number;
}

/** Every account tied to one L1 address — master plus sub-accounts. */
export async function fetchSubAccounts(address: string): Promise<SubAccount[]> {
  try {
    const res = await get<{
      sub_accounts?: { index: number; account_type: number }[];
    }>(`accountsByL1Address?l1_address=${encodeURIComponent(address)}`);
    return (res.sub_accounts ?? []).map((s) => ({
      index: s.index,
      type: s.account_type,
    }));
  } catch {
    return [];
  }
}

/**
 * Recompute a position against a live mark price.
 *
 * Unrealised PnL, position value and distance to liquidation all move with
 * the market, not with account activity — so they are derived on every price
 * tick rather than waiting for `account_all` to fire.
 */
export function reprice(p: Position, markPrice: number): Position {
  if (!Number.isFinite(markPrice) || markPrice <= 0) return p;

  const valueUsd = p.size * markPrice;
  const unrealizedPnl =
    p.side === "long"
      ? p.size * (markPrice - p.entryPrice)
      : p.size * (p.entryPrice - markPrice);

  let liquidationDistance: number | null = null;
  if (p.liquidationPrice > 0) {
    const gap =
      p.side === "long"
        ? (markPrice - p.liquidationPrice) / markPrice
        : (p.liquidationPrice - markPrice) / markPrice;
    liquidationDistance = Math.max(0, Math.min(1, gap));
  }

  return {
    ...p,
    markPrice,
    valueUsd,
    unrealizedPnl,
    returnPct: valueUsd > 0 ? (unrealizedPnl / valueUsd) * 100 : 0,
    liquidationDistance,
  };
}

/** Roll position-level figures back up to the account. */
export function withPositions(account: Account, positions: Position[]): Account {
  const totalUnrealizedPnl = positions.reduce((s, p) => s + p.unrealizedPnl, 0);
  const totalNotional = positions.reduce((s, p) => s + p.valueUsd, 0);
  // Account value moves with unrealised PnL; collateral is the fixed part.
  const pnlDelta = totalUnrealizedPnl - account.totalUnrealizedPnl;
  const totalValue = account.totalValue + pnlDelta;

  return {
    ...account,
    positions,
    totalUnrealizedPnl,
    totalNotional,
    totalValue,
    marginUsage:
      totalValue > 0 ? account.maintenanceMarginRequirement / totalValue : null,
  };
}

/**
 * Derive a liquidation price when the API reports none.
 *
 * Standard margin maths: a position liquidates once its loss eats the initial
 * margin down to the maintenance requirement.
 *
 *   long   liq = entry × (1 − imf + mmf)
 *   short  liq = entry × (1 + imf − mmf)
 *
 * Checked against a live isolated 50× BTC short: this reproduces the API's
 * figure to within 0.005%, the gap being accrued fees and funding.
 *
 * For cross-margin positions the true trigger depends on the whole account,
 * so a derived value is an approximation and is flagged as estimated.
 */
export function computeLiquidationPrice(
  p: Position,
  maintenanceMarginBps: number,
): number | null {
  if (!p.entryPrice || !p.initialMarginFraction) return null;
  const mmf = maintenanceMarginBps / 10_000;
  const imf = p.initialMarginFraction;
  if (imf <= mmf) return null;
  const liq =
    p.side === "long"
      ? p.entryPrice * (1 - imf + mmf)
      : p.entryPrice * (1 + imf - mmf);
  return liq > 0 ? liq : null;
}

/** Fill in a missing liquidation price, marking it as derived. */
export function withLiquidationPrice(
  p: Position,
  maintenanceMarginBps: number,
): Position {
  if (p.liquidationPrice > 0) return p;
  const liq = computeLiquidationPrice(p, maintenanceMarginBps);
  if (liq == null) return p;
  return { ...p, liquidationPrice: liq, liquidationEstimated: true };
}
