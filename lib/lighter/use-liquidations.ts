"use client";

import { useEffect, useRef, useState } from "react";
import { lighterSocket } from "./ws";
import { displayPrice, displaySize } from "./multiplier";
import { n } from "../format";

/**
 * Live forced exits, from the `trade` channels' separate
 * `liquidation_trades` array.
 *
 * Subscribing replays history: the first message on each channel carries the
 * last 50 liquidations for that market, often hours old. Those are shown on
 * the tape as context but must never count toward "since you opened" — doing
 * so inflated the session total by every market's backlog on page load.
 * An event is fresh when it arrives as a live update, or (after a reconnect
 * re-snapshot) when it happened after the page was opened.
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
  /** Happened while this page was open. */
  fresh: boolean;
}

export interface LiquidationSession {
  usd: number;
  count: number;
  longUsd: number;
  shortUsd: number;
  largest: Liq | null;
  busiest: { symbol: string; count: number } | null;
}

export interface LiquidationFeed {
  rows: Liq[];
  session: LiquidationSession;
  live: boolean;
  /** When the most recent fresh event landed, for a flash cue. */
  lastAt: number | null;
}

const EMPTY: LiquidationSession = {
  usd: 0,
  count: 0,
  longUsd: 0,
  shortUsd: 0,
  largest: null,
  busiest: null,
};

export function useLiquidationFeed(
  markets: { marketId: number; symbol: string }[],
  maxRows = 14,
): LiquidationFeed {
  const [rows, setRows] = useState<Liq[]>([]);
  const [session, setSession] = useState<LiquidationSession>(EMPTY);
  const [lastAt, setLastAt] = useState<number | null>(null);
  const [live, setLive] = useState(false);
  const seen = useRef(new Set<string>());
  const perMarket = useRef(new Map<string, number>());

  // Re-subscribing on every render of a new array identity would thrash the
  // socket, so the effect keys on the market ids rather than the array.
  const key = markets.map((m) => m.marketId).join(",");

  useEffect(() => {
    if (markets.length === 0) return;
    const openedAt = Date.now();
    const sock = lighterSocket();
    const offStatus = sock.onStatus((s) => setLive(s === "open"));
    const symbols = new Map(markets.map((m) => [m.marketId, m.symbol]));

    const offs = markets.map((m) =>
      sock.subscribe(`trade/${m.marketId}`, (msg) => {
        const list = msg.liquidation_trades;
        if (!Array.isArray(list) || list.length === 0) return;
        const isUpdate = String(msg.type ?? "").startsWith("update");

        const incoming: Liq[] = [];
        for (const raw of list as Record<string, unknown>[]) {
          const id = String(raw.trade_id_str ?? raw.trade_id ?? "");
          if (!id || seen.current.has(id)) continue;
          seen.current.add(id);

          const marketId = n(raw.market_id, m.marketId);
          const t = n(raw.timestamp, Date.now());
          incoming.push({
            id,
            marketId,
            symbol: symbols.get(marketId) ?? `#${marketId}`,
            // The liquidated party is always the taker. If the maker sat on
            // the ask, the taker was buying — a short being closed out.
            side: raw.is_maker_ask === true ? "short" : "long",
            usd: n(raw.usd_amount),
            price: displayPrice(marketId, n(raw.price)),
            size: displaySize(marketId, n(raw.size)),
            t,
            fresh: isUpdate || t >= openedAt,
          });
        }
        if (incoming.length === 0) return;

        setRows((prev) =>
          [...incoming, ...prev].sort((a, b) => b.t - a.t).slice(0, maxRows),
        );

        const fresh = incoming.filter((l) => l.fresh);
        if (fresh.length === 0) return;

        for (const l of fresh) {
          perMarket.current.set(l.symbol, (perMarket.current.get(l.symbol) ?? 0) + 1);
        }
        let busiest: LiquidationSession["busiest"] = null;
        for (const [symbol, count] of perMarket.current) {
          if (!busiest || count > busiest.count) busiest = { symbol, count };
        }

        setSession((s) => {
          let largest = s.largest;
          let longUsd = s.longUsd;
          let shortUsd = s.shortUsd;
          for (const l of fresh) {
            if (l.side === "long") longUsd += l.usd;
            else shortUsd += l.usd;
            if (!largest || l.usd > largest.usd) largest = l;
          }
          return {
            usd: s.usd + fresh.reduce((sum, l) => sum + l.usd, 0),
            count: s.count + fresh.length,
            longUsd,
            shortUsd,
            largest,
            busiest,
          };
        });
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

  return { rows, session, live, lastAt };
}
