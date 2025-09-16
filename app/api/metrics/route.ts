// app/api/metrics/route.ts
import { NextResponse } from "next/server";
import { main as fetchMetrics } from "@/utils/getOtherStats";
import { redis } from "@/lib/redis";

const CACHE_KEY = "lighterpulse:metrics";
const CACHE_DURATION_SECONDS = 60 * 60 * 1; 

export async function GET() {
  try {
    // 1) Try to read cached value
    const cached = await redis.get(CACHE_KEY);

    if (cached) {
      // Upstash stores strings. Try parse; if value is object, it's safe.
      try {
        const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
        return NextResponse.json({ data: parsed, source: "cache" });
      } catch (e) {
        // parsing failed — we'll fetch fresh
        console.warn("Failed to parse cached metrics, fetching fresh", e);
      }
    }

    // 2) No cache or parse error → fetch fresh from Dune
    const data = await fetchMetrics();

    // 3) Save to Redis (store as JSON string so typed retrieval is predictable)
    try {
      await redis.set(CACHE_KEY, JSON.stringify(data), { ex: CACHE_DURATION_SECONDS });
    } catch (err) {
      console.error("Failed to write metrics to Redis:", err);
      // Not fatal — we still return fresh data
    }

    return NextResponse.json({ data, source: "fresh" });
  } catch (err) {
    console.error("GET /api/metrics failed:", err);

    // return stale cache if available
    try {
      const stale = await redis.get(CACHE_KEY);
      if (stale) {
        const parsed = typeof stale === "string" ? JSON.parse(stale) : stale;
        return NextResponse.json({ data: parsed, source: "stale" });
      }
    } catch (e) {
      console.warn("Failed to return stale cache:", e);
    }

    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 });
  }
}