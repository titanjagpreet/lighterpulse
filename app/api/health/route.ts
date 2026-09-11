import { NextResponse } from "next/server";
import { getMarkets } from "@/lib/lighter/markets";
import { getExplorerTotals } from "@/lib/lighter/explorer";
import { redis } from "@/lib/redis";

/**
 * Point an uptime check here. Reports upstream reachability and cache age so a
 * rate-limit problem is visible before it bites.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const probe = async <T,>(name: string, p: Promise<T>) => {
    const started = Date.now();
    try {
      const res = (await p) as { age?: number; stale?: boolean; source?: string };
      return {
        name,
        ok: true,
        ms: Date.now() - started,
        age: res.age ?? null,
        stale: res.stale ?? false,
        source: res.source ?? null,
      };
    } catch (err) {
      return {
        name,
        ok: false,
        ms: Date.now() - started,
        error: err instanceof Error ? err.message : "unknown",
      };
    }
  };

  const [markets, explorer, redisOk] = await Promise.all([
    probe("lighter:markets", getMarkets()),
    probe("explorer:totals", getExplorerTotals()),
    redis
      ? redis
          .ping()
          .then(() => true)
          .catch(() => false)
      : Promise.resolve(null),
  ]);

  const checks = [markets, explorer];
  const healthy = checks.every((c) => c.ok);

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      time: new Date().toISOString(),
      cache: redisOk === null ? "not configured" : redisOk ? "ok" : "unreachable",
      checks,
    },
    { status: healthy ? 200 : 503 },
  );
}
