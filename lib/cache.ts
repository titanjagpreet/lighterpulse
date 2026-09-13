import "server-only";
import { unstable_cache } from "next/cache";
import { redis } from "./redis";

/**
 * Two-layer cache.
 *
 * Layer 1 — Next's Data Cache (`unstable_cache`). Shared across instances and
 * regions on Vercel, and critically it forms a *cache boundary*: the
 * `no-store` upstream fetches inside it no longer opt the route out of static
 * generation, so pages stay ISR and the CDN serves them.
 *
 * Layer 2 — Upstash Redis. Survives deployments, coordinates refreshes across
 * regions with a lock, and holds a last-known-good copy so an upstream outage
 * degrades to real-but-old numbers instead of an error page.
 *
 * Freshness is always recomputed at render time from `asOf`, never cached —
 * otherwise the "12s ago" stamp would itself go stale.
 */

export type Source = "fresh" | "cache" | "stale" | "direct";

export interface Cached<T> {
  data: T;
  /** ISO timestamp of when upstream produced this payload. */
  asOf: string;
  /** Seconds since that timestamp, computed on read. */
  age: number;
  /** True when serving a last-good payload past its TTL. */
  stale: boolean;
  source: Source;
  /** The TTL this value is cached under, in seconds. */
  ttl: number;
}

/** What gets stored; `age` is derived, so it is deliberately absent. */
interface Snapshot<T> {
  data: T;
  asOf: string;
  stale: boolean;
  source: Source;
}

interface Envelope<T> {
  v: T;
  t: number; // epoch ms
}

const KEY = (k: string) => `lp:v1:${k}`;
const STALE = (k: string) => `lp:stale:${k}`;
const LOCK = (k: string) => `lp:lock:${k}`;

const LOCK_TTL = 10;
/** Last-good copies live a week — long enough to ride out a real outage. */
const STALE_TTL = 60 * 60 * 24 * 7;

function parse<T>(raw: unknown): Envelope<T> | null {
  if (raw == null) return null;
  try {
    // Upstash may return an already-deserialised object or a JSON string.
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (obj && typeof obj === "object" && "v" in obj && "t" in obj) {
      return obj as Envelope<T>;
    }
    return null;
  } catch {
    return null;
  }
}

async function write<T>(key: string, data: T, ttl: number): Promise<void> {
  if (!redis) return;
  const payload = JSON.stringify({ v: data, t: Date.now() } satisfies Envelope<T>);
  try {
    await Promise.all([
      redis.set(KEY(key), payload, { ex: ttl }),
      redis.set(STALE(key), payload, { ex: STALE_TTL }),
    ]);
  } catch (err) {
    console.error(`[cache] write failed for ${key}`, err);
  }
}

async function readStale<T>(key: string): Promise<Snapshot<T> | null> {
  if (!redis) return null;
  try {
    const env = parse<T>(await redis.get(STALE(key)));
    if (!env) return null;
    return {
      data: env.v,
      asOf: new Date(env.t).toISOString(),
      stale: true,
      source: "stale",
    };
  } catch {
    return null;
  }
}

/** Refresh behind the request. Never awaited by the render path. */
function refresh<T>(key: string, ttl: number, fetcher: () => Promise<T>): void {
  if (!redis) return;
  void (async () => {
    try {
      // SET NX — only one instance refreshes a given key at a time.
      const got = await redis.set(LOCK(key), "1", { nx: true, ex: LOCK_TTL });
      if (!got) return;
      await write(key, await fetcher(), ttl);
    } catch (err) {
      console.error(`[cache] background refresh failed for ${key}`, err);
    } finally {
      try {
        await redis.del(LOCK(key));
      } catch {
        /* the TTL clears it */
      }
    }
  })();
}

/** Layer 2 on its own: Redis with stale-while-revalidate. */
async function viaRedis<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>,
): Promise<Snapshot<T>> {
  const now = () => new Date().toISOString();

  if (!redis) {
    return { data: await fetcher(), asOf: now(), stale: false, source: "direct" };
  }

  let hit: Envelope<T> | null = null;
  try {
    hit = parse<T>(await redis.get(KEY(key)));
  } catch (err) {
    console.error(`[cache] read failed for ${key}`, err);
  }

  if (hit) {
    const age = (Date.now() - hit.t) / 1000;
    // Past TTL but present: serve it now, refresh behind the request.
    if (age > ttl) refresh(key, ttl, fetcher);
    return {
      data: hit.v,
      asOf: new Date(hit.t).toISOString(),
      stale: age > ttl,
      source: "cache",
    };
  }

  // Cold. Try to be the one that fills it.
  let holdsLock = false;
  try {
    holdsLock = Boolean(await redis.set(LOCK(key), "1", { nx: true, ex: LOCK_TTL }));
  } catch {
    holdsLock = true; // Redis unhappy — just fetch.
  }

  if (!holdsLock) {
    // Someone else is filling it. Prefer last-good over waiting.
    const stale = await readStale<T>(key);
    if (stale) return stale;
  }

  try {
    const data = await fetcher();
    await write(key, data, ttl);
    return { data, asOf: now(), stale: false, source: "fresh" };
  } catch (err) {
    console.error(`[cache] upstream failed for ${key}`, err);
    const stale = await readStale<T>(key);
    if (stale) return stale;
    throw err;
  } finally {
    if (holdsLock) {
      try {
        await redis.del(LOCK(key));
      } catch {
        /* TTL clears it */
      }
    }
  }
}

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<Cached<T>> {
  const snapshot = await unstable_cache(
    () => viaRedis(key, ttlSeconds, fetcher),
    ["lp", key],
    { revalidate: ttlSeconds, tags: ["lp", `lp:${key}`] },
  )();

  const age = Math.max(
    0,
    Math.round((Date.now() - new Date(snapshot.asOf).getTime()) / 1000),
  );

  return {
    ...snapshot,
    age,
    stale: snapshot.stale || age > ttlSeconds * 3,
    ttl: ttlSeconds,
  };
}

/** Drop a key so the next read refetches. Used by the revalidate route. */
export async function invalidate(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(KEY(key));
  } catch (err) {
    console.error(`[cache] invalidate failed for ${key}`, err);
  }
}

/** Shape every API route returns, so the UI can always show freshness. */
export function meta<T>(c: Cached<T>) {
  return { asOf: c.asOf, age: c.age, stale: c.stale, source: c.source };
}
