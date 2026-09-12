"use client";

import { useEffect, useState } from "react";
import { lighterSocket } from "./ws";
import { hourlyPctToEightHour, n } from "../format";
import { OI_SIDES } from "./types";

/** Live market state is applied to the page at most this often. */
const FLUSH_MS = 1000;

/**
 * Live market state for every market, from one `market_stats/all`
 * subscription.
 *
 * This is the heartbeat the whole terminal reads from. Anything whose value
 * moves with price — a position's unrealised PnL, a distance to liquidation,
 * a day-range marker — must derive from here rather than from a per-account
 * channel, because `account_all` only fires when the *account* changes. An
 * idle position would otherwise sit frozen while the market moved under it.
 *
 * Units differ from REST in two places, and both are normalised here so no
 * consumer ever has to know:
 *   · open_interest — the stream sends USD, REST sends base units
 *   · funding — the stream sends a signed percent PER HOUR ("0.0012");
 *     the product's convention is an 8-hour ratio (0.000096), which is what
 *     `funding-rates` returns. Merging the raw value used to inflate the
 *     funding column 12.5× the moment the socket connected.
 */

export interface LiveMarket {
  marketId: number;
  symbol: string;
  markPrice: number;
  indexPrice: number;
  lastPrice: number;
  midPrice: number;
  bestBid: number;
  bestAsk: number;
  change24h: number;
  /** Two-sided USD, matching the REST convention. */
  oiUsd: number;
  volume24h: number;
  volume24hBase: number;
  dayLow: number;
  dayHigh: number;
  /** Rate accruing for the current hour, as an 8-hour ratio. */
  funding: number | null;
  /** Epoch ms of the most recent hourly settlement. */
  lastFundingAt: number | null;
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

    // The stream sends several messages a second. Rendering on each one kept
    // the markets table re-rendering so often that a click on a row started a
    // navigation that never got the idle moment it needed to commit. Messages
    // are buffered and applied together, at most once per FLUSH_MS; the first
    // batch — the snapshot — is applied at once.
    let pending: Record<string, Record<string, unknown>>[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;
    let first = true;

    const flush = () => {
      timer = null;
      const batch = pending;
      pending = [];
      if (batch.length === 0) return;

      setStats((prev) => {
        const next = new Map(prev);
        // In arrival order, so the latest value for a field wins.
        for (const raw of batch) {
          for (const [id, s] of Object.entries(raw)) {
            const marketId = n(s.market_id, Number(id));
            const e = next.get(marketId);
            next.set(marketId, {
              marketId,
              symbol: typeof s.symbol === "string" ? s.symbol : (e?.symbol ?? ""),
              markPrice: n(s.mark_price, e?.markPrice ?? 0),
              indexPrice: n(s.index_price, e?.indexPrice ?? 0),
              lastPrice: n(s.last_trade_price, e?.lastPrice ?? 0),
              midPrice: n(s.mid_price, e?.midPrice ?? 0),
              bestBid: n(s.best_bid_price, e?.bestBid ?? 0),
              bestAsk: n(s.best_ask_price, e?.bestAsk ?? 0),
              change24h: n(s.daily_price_change, e?.change24h ?? 0),
              oiUsd:
                s.open_interest != null
                  ? n(s.open_interest) * OI_SIDES
                  : (e?.oiUsd ?? 0),
              volume24h: n(s.daily_quote_token_volume, e?.volume24h ?? 0),
              volume24hBase: n(s.daily_base_token_volume, e?.volume24hBase ?? 0),
              dayLow: n(s.daily_price_low, e?.dayLow ?? 0),
              dayHigh: n(s.daily_price_high, e?.dayHigh ?? 0),
              funding:
                s.current_funding_rate != null
                  ? hourlyPctToEightHour(n(s.current_funding_rate))
                  : (e?.funding ?? null),
              lastFundingAt:
                s.funding_timestamp != null
                  ? n(s.funding_timestamp)
                  : (e?.lastFundingAt ?? null),
            });
          }
        }
        return next;
      });
      setTick((t) => t + 1);
    };

    const off = sock.subscribe("market_stats/all", (msg) => {
      const raw = msg.market_stats as
        | Record<string, Record<string, unknown>>
        | undefined;
      if (!raw) return;
      pending.push(raw);
      if (timer == null) {
        timer = setTimeout(flush, first ? 0 : FLUSH_MS);
        first = false;
      }
    });

    return () => {
      off();
      offStatus();
      if (timer != null) clearTimeout(timer);
    };
  }, []);

  return { stats, live, tick };
}
