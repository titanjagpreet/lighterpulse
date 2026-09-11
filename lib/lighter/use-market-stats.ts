"use client";

import { useEffect, useState } from "react";
import { lighterSocket } from "./ws";
import { n } from "../format";
import { OI_SIDES } from "./types";

/**
 * Live market state for every market, from one `market_stats/all`
 * subscription.
 *
 * This is the heartbeat the whole terminal reads from. Anything whose value
 * moves with price — a position's unrealised PnL, a distance to liquidation,
 * a day-range marker — must derive from here rather than from a per-account
 * channel, because `account_all` only fires when the *account* changes. An
 * idle position would otherwise sit frozen while the market moved under it.
 */

export interface LiveMarket {
  marketId: number;
  symbol: string;
  markPrice: number;
  indexPrice: number;
  lastPrice: number;
  change24h: number;
  /** Two-sided USD, matching the REST convention. */
  oiUsd: number;
  volume24h: number;
  volume24hBase: number;
  dayLow: number;
  dayHigh: number;
  funding: number | null;
}

export function useMarketStats(): {
  stats: Map<number, LiveMarket>;
  live: boolean;
  tick: number;
} {
  const [stats, setStats] = useState<Map<number, LiveMarket>>(new Map());
  const [live, setLive] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const sock = lighterSocket();
    const offStatus = sock.onStatus((s) => setLive(s === "open"));

    const off = sock.subscribe("market_stats/all", (msg) => {
      const raw = msg.market_stats as
        | Record<string, Record<string, unknown>>
        | undefined;
      if (!raw) return;

      setStats((prev) => {
        const next = new Map(prev);
        for (const [id, s] of Object.entries(raw)) {
          const marketId = n(s.market_id, Number(id));
          const existing = next.get(marketId);
          next.set(marketId, {
            marketId,
            symbol: typeof s.symbol === "string" ? s.symbol : (existing?.symbol ?? ""),
            markPrice: n(s.mark_price, existing?.markPrice ?? 0),
            indexPrice: n(s.index_price, existing?.indexPrice ?? 0),
            lastPrice: n(s.last_trade_price, existing?.lastPrice ?? 0),
            change24h: n(s.daily_price_change, existing?.change24h ?? 0),
            // The stream reports open interest already in USD; REST reports it
            // in base units. Only the two-sided convention is applied here.
            oiUsd:
              s.open_interest != null
                ? n(s.open_interest) * OI_SIDES
                : (existing?.oiUsd ?? 0),
            volume24h: n(s.daily_quote_token_volume, existing?.volume24h ?? 0),
            volume24hBase: n(
              s.daily_base_token_volume,
              existing?.volume24hBase ?? 0,
            ),
            dayLow: n(s.daily_price_low, existing?.dayLow ?? 0),
            dayHigh: n(s.daily_price_high, existing?.dayHigh ?? 0),
            funding:
              s.current_funding_rate != null
                ? n(s.current_funding_rate)
                : (existing?.funding ?? null),
          });
        }
        return next;
      });
      setTick((t) => t + 1);
    });

    return () => {
      off();
      offStatus();
    };
  }, []);

  return { stats, live, tick };
}
