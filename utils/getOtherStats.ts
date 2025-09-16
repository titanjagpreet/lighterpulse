// lib/dune-metrics.ts
import { DuneClient } from "@duneanalytics/client-sdk";

const DUNE_API_KEY = process.env.DUNE_API_KEY;
if (!DUNE_API_KEY) {
  // fail loudly in server logs if key missing
  console.error("DUNE_API_KEY not set in environment");
}

const dune = new DuneClient(DUNE_API_KEY as string);

/* Types */
export interface MetricQuery {
  id: number;
  field: string;
}

export interface Metrics {
  tvl: number | null;
  users: number | null;
  tvlShare: number | null;
  retention: number | null;
  weeklyTvl: number | null;
}

const queries: Record<string, MetricQuery> = {
  tvl: { id: 5785742, field: "TVL" },
  users: { id: 5785745, field: "Dintinct_Depositors" },
  deposited: { id: 5785806, field: "tvl_share_percent" }, // only tvl_share_percent
  retention: { id: 5785796, field: "wallets_more_than_once" },
  weeklyTvl: { id: 5785790, field: "TVL" },
};

async function fetchMetric(queryId: number, field: string): Promise<number | null> {
  try {
    const result = await dune.getLatestResult({ queryId });
    const rows = result.result?.rows ?? [];
    const row = rows[0];
    if (!row) return null;

    const key = Object.keys(row).find((k) => k.toLowerCase() === field.toLowerCase());
    if (!key) return null;

    const raw = row[key] as unknown;
    if (typeof raw === "number") return raw;
    if (typeof raw === "string") {
      const n = Number(raw);
      return Number.isNaN(n) ? null : n;
    }
    return null;
  } catch (err) {
    console.error(`fetchMetric error (queryId=${queryId}):`, err);
    return null;
  }
}

export async function main(): Promise<Metrics> {
  const tvl = await fetchMetric(queries.tvl.id, queries.tvl.field);
  const users = await fetchMetric(queries.users.id, queries.users.field);
  const tvlShare = await fetchMetric(queries.deposited.id, queries.deposited.field);
  const retention = await fetchMetric(queries.retention.id, queries.retention.field);
  const weeklyTvl = await fetchMetric(queries.weeklyTvl.id, queries.weeklyTvl.field);

  return {
    tvl,
    users,
    tvlShare,
    retention,
    weeklyTvl,
  };
}