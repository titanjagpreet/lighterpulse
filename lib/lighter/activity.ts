import { n } from "../format";
import { EXPLORER_BASE_PUBLIC } from "./public";

/**
 * An account's history, from the explorer's `accounts/{index}/logs`.
 *
 * The explorer answers browsers directly (`Access-Control-Allow-Origin: *`)
 * and limits per IP, so a wallet page pages through history on the visitor's
 * own quota. It cannot filter by type — trades, transfers and settings changes
 * arrive in one stream, newest first — so filters apply to what is loaded.
 *
 * The parser also runs on the server, for the buyback account's fills.
 */

export type ActivityKind =
  | "trade"
  | "liquidation"
  | "transfer"
  | "deposit"
  | "withdrawal"
  | "stake"
  | "unstake"
  | "settings"
  | "other";

export const ACTIVITY_KINDS: { key: ActivityKind; label: string }[] = [
  { key: "trade", label: "Trades" },
  { key: "liquidation", label: "Liquidations" },
  { key: "transfer", label: "Transfers" },
  { key: "deposit", label: "Deposits" },
  { key: "withdrawal", label: "Withdrawals" },
  { key: "stake", label: "Stakes" },
  { key: "unstake", label: "Unstakes" },
  { key: "settings", label: "Settings" },
  { key: "other", label: "Other" },
];

export interface RawLog {
  tx_type?: string;
  hash?: string;
  time?: string;
  pubdata?: Record<string, Record<string, unknown> | null> | null;
  pubdata_type?: string;
  status?: string | null;
}

export interface ActivityRow {
  hash: string;
  /** Epoch ms. */
  t: number;
  /** Raw transaction type, e.g. "L2CreateOrder". */
  type: string;
  kind: ActivityKind;
  marketId: number | null;
  /** This account's side of a trade. */
  side: "buy" | "sell" | null;
  role: "maker" | "taker" | null;
  price: number | null;
  size: number | null;
  /** Trade notional, or the amount moved — in `asset` units. */
  amount: number | null;
  asset: string | null;
  /** The other account involved, when there is one. */
  counterparty: number | null;
  direction: "in" | "out" | "self" | null;
  /** "perps → spot" for transfers, the route for deposits. */
  route: string | null;
  status: string | null;
}

const num = (v: unknown): number | null => {
  const x = n(v, NaN);
  return Number.isFinite(x) ? x : null;
};

const index = (v: unknown): number | null => {
  const x = n(v, NaN);
  return Number.isSafeInteger(x) ? x : null;
};

const text = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : null;

/** "L2CreateOrder" → "Create order", "InternalClaimOrder" → "Claim order". */
export function typeLabel(type: string): string {
  const bare = type.replace(/^(L1|L2|Internal)/, "");
  const words = bare.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return words ? words[0].toUpperCase() + words.slice(1) : type;
}

export function parseLog(raw: RawLog, account: number): ActivityRow | null {
  if (!raw?.hash) return null;
  const type = raw.tx_type ?? "Unknown";
  const time = raw.time ? Date.parse(raw.time) : NaN;
  const [key, body] = Object.entries(raw.pubdata ?? {})[0] ?? ["", null];
  const b = body ?? {};

  const row: ActivityRow = {
    hash: raw.hash,
    t: Number.isFinite(time) ? time : 0,
    type,
    kind: "other",
    marketId: null,
    side: null,
    role: null,
    price: null,
    size: null,
    amount: null,
    asset: null,
    counterparty: null,
    direction: null,
    route: null,
    status: raw.status ?? null,
  };

  if (key === "trade_pubdata") {
    const taker = index(b.taker_account_index);
    const maker = index(b.maker_account_index);
    const takerSold = n(b.is_taker_ask) === 1;
    row.role = taker === account ? "taker" : maker === account ? "maker" : null;
    row.side =
      row.role === "taker"
        ? takerSold ? "sell" : "buy"
        : row.role === "maker"
          ? takerSold ? "buy" : "sell"
          : null;
    row.counterparty = row.role === "taker" ? maker : row.role === "maker" ? taker : null;
    row.marketId = index(b.market_index);
    row.price = num(b.price);
    row.size = num(b.size);
    row.amount = row.price != null && row.size != null ? row.price * row.size : null;
    row.asset = "USDC";
    row.kind = /liquidat|deleverag/i.test(type) ? "liquidation" : "trade";
    return row;
  }

  if (/unstake/i.test(type) || /unstake/i.test(key)) {
    row.kind = "unstake";
    row.amount = num(b.lit_amount ?? b.amount);
    row.asset = "LIT";
    row.counterparty = index(b.staking_pool_index);
    row.direction = "in";
    return row;
  }

  if (/stake/i.test(type) || /stake/i.test(key)) {
    row.kind = "stake";
    row.amount = num(b.lit_amount ?? b.amount);
    row.asset = "LIT";
    row.counterparty = index(b.staking_pool_index);
    row.direction = "out";
    return row;
  }

  if (key.startsWith("l2_transfer")) {
    const from = index(b.from_account_index);
    const to = index(b.to_account_index);
    row.kind = "transfer";
    row.direction = from === to ? "self" : to === account ? "in" : "out";
    row.counterparty =
      row.direction === "in" ? from : row.direction === "out" ? to : null;
    row.amount = num(b.amount);
    row.asset = text(b.asset_index);
    const fromRoute = text(b.from_route_type);
    const toRoute = text(b.to_route_type);
    if (fromRoute || toRoute) {
      row.route = `${(fromRoute ?? "?").toLowerCase()} → ${(toRoute ?? "?").toLowerCase()}`;
    }
    return row;
  }

  if (key.startsWith("l1_deposit") || /deposit/i.test(type)) {
    row.kind = "deposit";
    row.direction = "in";
    row.amount = num(b.accepted_amount ?? b.amount);
    row.asset = text(b.asset_index) ?? "USDC";
    row.route = text(b.route_type)?.toLowerCase() ?? null;
    return row;
  }

  if (/withdraw/i.test(type) || /withdraw/i.test(key)) {
    row.kind = "withdrawal";
    row.direction = "out";
    row.amount = num(b.amount ?? b.usdc_amount ?? b.accepted_amount);
    row.asset = text(b.asset_index) ?? "USDC";
    return row;
  }

  if (/leverage|margin|apikey|pubkey|subaccount|referral|tier/i.test(type)) {
    row.kind = "settings";
    row.marketId = index(b.market_index);
    return row;
  }

  return row;
}

/** One page of an account's history, newest first. */
export async function fetchActivity(
  account: number,
  limit: number,
  offset: number,
  signal?: AbortSignal,
): Promise<{ rows: ActivityRow[]; received: number }> {
  const res = await fetch(
    `${EXPLORER_BASE_PUBLIC}/api/accounts/${account}/logs?limit=${limit}&offset=${offset}`,
    { headers: { accept: "application/json" }, cache: "no-store", signal },
  );
  // A fresh account with no history answers 404 — that is an empty page.
  if (res.status === 404) return { rows: [], received: 0 };
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json: unknown = await res.json();
  const raw = Array.isArray(json) ? (json as RawLog[]) : [];
  return {
    rows: raw
      .map((r) => parseLog(r, account))
      .filter((r): r is ActivityRow => r !== null),
    received: raw.length,
  };
}

/** The loaded rows as CSV, times in UTC. */
export function activityCsv(
  rows: ActivityRow[],
  symbolOf: (marketId: number) => string,
): string {
  const head = [
    "time_utc",
    "type",
    "kind",
    "market",
    "side",
    "role",
    "price",
    "size",
    "amount",
    "asset",
    "direction",
    "counterparty",
    "route",
    "status",
    "hash",
  ];
  const cell = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((r) =>
    [
      r.t ? new Date(r.t).toISOString() : "",
      r.type,
      r.kind,
      r.marketId != null ? symbolOf(r.marketId) : "",
      r.side,
      r.role,
      r.price,
      r.size,
      r.amount,
      r.asset,
      r.direction,
      r.counterparty,
      r.route,
      r.status,
      r.hash,
    ]
      .map(cell)
      .join(","),
  );
  return [head.join(","), ...lines].join("\n");
}
