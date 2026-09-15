import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { runSnapshot } from "@/collector/snapshot.mjs";

/**
 * Runs the history collector. An external scheduler calls this every 15
 * minutes with `Authorization: Bearer <CRON_SECRET>`.
 *
 * GitHub's scheduled workflow, the only trigger before, is best-effort and ran
 * every 2–7 hours instead of every 15 minutes. That left open-interest history
 * in pieces and the markets table's 24h change empty, since a 24h change needs
 * a snapshot from around 24 hours earlier.
 *
 * Only a caller holding the secret reaches the database, so page traffic still
 * never wakes it.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function handle(req: Request) {
  if (!authorised(req)) {
    return NextResponse.json({ ok: false, error: "unauthorised" }, { status: 401 });
  }
  try {
    const result = await runSnapshot({
      databaseUrl: process.env.DATABASE_URL,
      redisUrl: process.env.UPSTASH_REDIS_REST_URL,
      redisToken: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    // Pages read the published values through a short cache; show this run now.
    revalidateTag("lp-oi");
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[collector] run failed", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "collector failed" },
      { status: 500 },
    );
  }
}

export const GET = handle;
export const POST = handle;
