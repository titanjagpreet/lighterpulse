/** Shared shapes for the Lighter API layer. Safe to import anywhere. */

export type AssetClass =
  | "crypto"
  | "equity"
  | "index"
  | "commodity"
  | "fx"
  | "bond";

export const ASSET_CLASS_LABEL: Record<AssetClass, string> = {
  crypto: "Crypto",
  equity: "Equity",
  index: "Index",
  commodity: "Commodity",
  fx: "FX",
  bond: "Bonds",
};

/** Short tag shown beside non-crypto symbols in tables. */
export const ASSET_CLASS_TAG: Partial<Record<AssetClass, string>> = {
  equity: "EQUITY",
  index: "INDEX",
  commodity: "CMDTY",
  fx: "FX",
  bond: "BOND",
};

/**
 * `exchangeMetrics?kind=open_interest` and every competitor report open
 * interest counting BOTH sides of each contract. Summing per-market OI gives
 * half that, so we scale by this and say so in the UI.
 */
export const OI_SIDES = 2;

export interface Market {
  symbol: string;
  marketId: number;
  /** "active" | "inactive" — 17 of 233 are inactive today. */
  status: string;
  active: boolean;
  assetClass: AssetClass;

  markPrice: number;
  indexPrice: number;
  lastPrice: number;
  /** Already a percentage, e.g. -0.108 means −0.108%. */
  change24h: number;

  /** Open interest in base units, as the API reports it. */
  oiBase: number;
  /** Two-sided USD open interest — the convention the whole product uses. */
  oiUsd: number;

  volume24h: number; // quote (USD)
  volume24hBase: number;
  trades24h: number;

  dayLow: number;
  dayHigh: number;
  /** Where mark sits in the day's range, 0–1. Null when there is no range. */
  rangePos: number | null;

  maxLeverage: number;
  makerFee: number;
  takerFee: number;
  /** Basis points, e.g. 120 = 1.2%. Used to derive a liquidation price. */
  maintenanceMarginFraction: number;

  /** Current 8h funding rate as a ratio, merged from funding-rates. */
  funding: number | null;
}

export interface MetricPoint {
  /** Epoch ms. */
  t: number;
  v: number;
}

/**
 * A contiguous daily series, compacted for the wire. Every `exchangeMetrics`
 * kind is gap-free at one bucket per UTC day, so a start and a list of values
 * carry the same information as 600 `{t, v}` objects at a fifth of the bytes.
 */
export interface DailySeries {
  /** Epoch ms of the first bucket, 00:00 UTC. */
  start: number;
  values: number[];
}

export interface LeaderboardEntry {
  rank: number;
  address: string;
  accountValue: number;
  pnl: number;
  roi: number;
  volume: number;
}

export interface ExplorerTotals {
  blocks: number;
  batches: number;
  accounts: number;
  txs: number;
}

export interface ExplorerBlock {
  height: number;
  updatedAt: string;
  size: number;
  batchStatus: string | null;
}

export interface ExplorerBatch {
  number: number;
  updatedAt: string;
  size: number;
  /** null while pending; "nothing_to_execute" and friends once settled. */
  status: string | null;
  commitTx: string | null;
  verifyTx: string | null;
  executeTx: string | null;
}

export interface FundingRate {
  exchange: string;
  symbol: string;
  marketId: number;
  /** 8h rate as a ratio. */
  rate: number;
}

export type MetricKind =
  | "volume"
  | "open_interest"
  | "trade_count"
  | "account_count"
  | "active_account_count"
  | "liquidation_volume"
  | "liquidation_count"
  | "liquidation_fee"
  | "maker_fee"
  | "taker_fee"
  | "inflow"
  | "outflow"
  | "transfer_fee"
  | "withdraw_fee"
  | "tps"
  | "buyback"
  | "buyback_usdc";

/** Periods the API accepts. `tps` only supports h/d/w; everything else w and up. */
export type MetricPeriod = "h" | "d" | "w" | "m" | "q" | "y" | "all";
