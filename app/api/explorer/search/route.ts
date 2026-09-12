import { NextResponse } from "next/server";
import { searchExplorer } from "@/lib/lighter/explorer";
import { getMarkets } from "@/lib/lighter/markets";
import { rateLimit } from "@/lib/redis";

/**
 * Explorer search proxy.
 *
 * The explorer host allows 90 WEIGHTED requests per minute across every
 * visitor to this site, and `search` weighs 3 — so thirty uncached searches a
 * minute would exhaust the whole budget and take the block list down with it.
 * Hence: results cached for 120s, and a hard 10/min per IP on top.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SearchHit {
  type?: string;
  block?: { block_number?: number };
  batch?: { batch_number?: number };
  transaction?: { hash?: string; tx_hash?: string };
  account?: { l1_address?: string; account_index?: number };
}

/** Turn a typed hit into a route on this site. */
function hrefFor(hit: SearchHit): string | null {
  switch (hit.type) {
    case "block": {
      const n = hit.block?.block_number;
      return n != null ? `/explorer/block/${n}` : null;
    }
    case "batch":
      // No batch detail page yet — fall through to the next hit rather than
      // linking somewhere that 404s.
      return null;
    case "transaction":
    case "tx": {
      const h = hit.transaction?.hash ?? hit.transaction?.tx_hash;
      return h ? `/explorer/tx/${h.replace(/^0x/, "")}` : null;
    }
    case "account": {
      const a = hit.account?.l1_address;
      return a ? `/a/${a}` : null;
    }
    default:
      return null;
  }
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "anon";
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (!q || q.length > 96) {
    return NextResponse.json({ error: "bad query" }, { status: 400 });
  }

  // A market symbol resolves from the cached market list — no explorer call,
  // and no charge against the per-IP search quota below.
  if (/^[A-Za-z0-9]{1,16}$/.test(q) && !/^\d+$/.test(q)) {
    const markets = await getMarkets().catch(() => null);
    const market = markets?.data.find((m) => m.symbol.toLowerCase() === q.toLowerCase());
    if (market) {
      return NextResponse.json({ href: `/markets/${market.symbol}`, type: "market" });
    }
  }

  const limit = await rateLimit(`lp:rl:search:${clientIp(req)}`, 10, 60);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate limited" },
      { status: 429, headers: { "retry-after": "60" } },
    );
  }

  try {
    const res = await searchExplorer(q);
    const raw = res.data as unknown;
    const hits: SearchHit[] = Array.isArray(raw) ? (raw as SearchHit[]) : [];

    for (const hit of hits) {
      const href = hrefFor(hit);
      if (href) {
        return NextResponse.json({
          href,
          type: hit.type,
          meta: { age: res.age, stale: res.stale },
        });
      }
    }

    return NextResponse.json({ error: "not found" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "search failed" }, { status: 502 });
  }
}
