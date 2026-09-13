import "server-only";
import { Redis } from "@upstash/redis";

/**
 * Upstash client. Server-only.
 *
 * Deliberately nullable: if the credentials are absent (local dev, preview
 * without secrets) every caller degrades to fetching upstream directly rather
 * than crashing. The cache is a performance and rate-limit layer, not a
 * correctness dependency.
 */

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis: Redis | null =
  url && token ? new Redis({ url, token }) : null;

if (!redis && process.env.NODE_ENV !== "production") {
  console.warn(
    "[redis] UPSTASH_REDIS_REST_URL / _TOKEN not set — cache disabled, " +
      "every request will hit upstream directly.",
  );
}

/**
 * Sliding-window rate limiter backed by a Redis counter.
 * Used to protect the explorer host, which has a hard 90 weighted req/min
 * ceiling shared across every user of this site.
 *
 * Fails OPEN: if Redis is unavailable we allow the request rather than
 * breaking search entirely.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ ok: boolean; remaining: number }> {
  if (!redis) return { ok: true, remaining: limit };
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
    return { ok: count <= limit, remaining: Math.max(0, limit - count) };
  } catch {
    return { ok: true, remaining: limit };
  }
}
