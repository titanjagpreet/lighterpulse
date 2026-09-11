"use client";

import { useEffect, useRef, useState } from "react";
import { lighterSocket } from "./ws";
import { n } from "../format";

/**
 * Live forced exits, from the `trade` channels' separate
 * `liquidation_trades` array.
 *
 * Returns both the rolling tape and a running session total, so the headline
 * figure moves as events land rather than waiting for the next revalidation.
 * Persisting this stream is what eventually produces cascades and the
 * liquidation map — neither of which any Lighter endpoint returns.
 */

export interface Liq {
  id: string;
  marketId: number;
  symbol: string;
  side: "long" | "short";
  usd: number;
  price: number;
  size: number;
  t: number;
}

export interface LiquidationFeed {
  rows: Liq[];
  /** USD liquidated since this page was opened. */
  sessionUsd: number;
  sessionCount: number;
  live: boolean;
  /** Timestamp of the most recent event, for a flash cue. */
  lastAt: number | null;
}

export function useLiquidationFeed(
  markets: { marketId: number; symbol: string }[],
  maxRows = 14,
): LiquidationFeed {
  const [rows, setRows] = useState<Liq[]>([]);
  const [sessionUsd, setSessionUsd] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [lastAt, setLastAt] = useState<number | null>(null);
  const [live, setLive] = useState(false);
  const seen = useRef(new Set<string>());

  // Re-subscribing on every render of a new array identity would thrash the
  // socket, so the effect keys on the market ids rather than the array.
  const key = markets.map((m) => m.marketId).join(",");

  useEffect(() => {
    if (markets.length === 0) return;
    const sock = lighterSocket();
    const offStatus = sock.onStatus((s) => setLive(s === "open"));
    const symbols = new Map(markets.map((m) => [m.marketId, m.symbol]));

    const offs = markets.map((m) =>
      sock.subscribe(`trade/${m.marketId}`, (msg) => {
        const list = msg.liquidation_trades;
        if (!Array.isArray(list) || list.length === 0) return;

        const fresh: Liq[] = [];
        for (const raw of list as Record<string, unknown>[]) {
          const id = String(raw.trade_id_str ?? raw.trade_id ?? "");
          if (!id || seen.current.has(id)) continue;
          seen.current.add(id);

          const marketId = n(raw.market_id, m.marketId);
          fresh.push({
            id,
            marketId,
            symbol: symbols.get(marketId) ?? `#${marketId}`,
            // The liquidated party is always the taker. If the maker sat on
            // the ask, the taker was buying — a short being closed out.
            side: raw.is_maker_ask === true ? "short" : "long",
            usd: n(raw.usd_amount),
            price: n(raw.price),
            size: n(raw.size),
            t: n(raw.timestamp, Date.now()),
          });
        }
        if (fresh.length === 0) return;

        setRows((prev) =>
          [...fresh, ...prev].sort((a, b) => b.t - a.t).slice(0, maxRows),
        );
        setSessionUsd((v) => v + fresh.reduce((s, x) => s + x.usd, 0));
        setSessionCount((c) => c + fresh.length);
        setLastAt(Date.now());

        // Keep the dedupe set from growing without bound.
        if (seen.current.size > 4000) seen.current = new Set();
      }),
    );

    return () => {
      offs.forEach((off) => off());
      offStatus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, maxRows]);

  return { rows, sessionUsd, sessionCount, live, lastAt };
}
