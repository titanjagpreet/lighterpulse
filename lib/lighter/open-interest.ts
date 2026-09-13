import "server-only";
import { unstable_cache } from "next/cache";
import { redis } from "../redis";
import type { OiLatest, OiSeries } from "../oi";

/**
 * Open-interest history, as published to Redis by the collector.
 *
 * The site deliberately never reads Postgres: the collector precomputes every
 * view it needs, so page traffic cannot wake the database or spend the free
 * tier's compute hours that recording depends on. Missing keys (collector not
 * yet running, or Redis unavailable) resolve to null and the UI says so.
 */

const PREFIX = "lp:oi:v1";

/** A collector-published JSON value; null when missing or unreadable. */
export async function readJson<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const raw = await redis.get<T | string>(key);
    if (raw == null) return null;
    return typeof raw === "string" ? (JSON.parse(raw) as T) : raw;
  } catch (err) {
    console.error(`[oi] read failed for ${key}`, err);
    return null;
  }
}

/** Every market's current open interest and its 1h/4h/24h/7d change. */
export const getOiLatest = unstable_cache(
  () => readJson<OiLatest>(`${PREFIX}:latest`),
  ["lp-oi-latest"],
  { revalidate: 60, tags: ["lp-oi"] },
);

/** One market's history. Republished hourly; pages append the live value. */
export function getOiSeries(marketId: number): Promise<OiSeries | null> {
  return unstable_cache(
    () => readJson<OiSeries>(`${PREFIX}:series:${marketId}`),
    ["lp-oi-series", String(marketId)],
    { revalidate: 300, tags: ["lp-oi"] },
  )();
}

export interface CollectorMeta {
  lastRunAt: string;
  bucket: string;
  since: string | null;
  markets: number;
  seriesAt: string | null;
  /** When staking, burn and pool TVL were last recorded. */
  poolsAt?: string | null;
}

/** For the health check: when the collector last ran. */
export function getCollectorMeta(): Promise<CollectorMeta | null> {
  return readJson<CollectorMeta>(`${PREFIX}:meta`);
}
