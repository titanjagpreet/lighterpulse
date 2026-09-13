"use client";

import { useEffect, useState } from "react";
import { lighterSocket } from "./ws";
import { displayPrice, displaySize } from "./multiplier";
import { hourlyPctToEightHour, n } from "../format";
import { OI_SIDES } from "./types";

/** Live market state is applied to the page at most this often. */
const FLUSH_MS = 1000;
/** The server is asked to batch its updates to the same rhythm. */
const SERVER_FLUSH_MS = 1000;

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
 * Prices and base sizes are also converted from real to display units.
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

    // The stream can send several messages a second. Rendering on each one
    // kept the markets table re-rendering so often that a click on a row
    // started a navigation that never got the idle moment it needed to
    // commit. The server batches to about one message a second; messages are
    // also buffered here and applied at most once per FLUSH_MS, the first at
    // once, so a server that ignores the batching cannot bring the stall back.
    let pending: Record<string, Record<string, unknown>>[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastFlush = 0;

    const flush = () => {
      timer = null;
      lastFlush = Date.now();
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
            const px = (v: unknown, prev: number | undefined) => {
              const x = n(v, NaN);
              return Number.isFinite(x) ? displayPrice(marketId, x) : (prev ?? 0);
            };
            const sz = (v: unknown, prev: number | undefined) => {
              const x = n(v, NaN);
              return Number.isFinite(x) ? displaySize(marketId, x) : (prev ?? 0);
            };
            next.set(marketId, {
              marketId,
              symbol: typeof s.symbol === "string" ? s.symbol : (e?.symbol ?? ""),
              markPrice: px(s.mark_price, e?.markPrice),
              indexPrice: px(s.index_price, e?.indexPrice),
              lastPrice: px(s.last_trade_price, e?.lastPrice),
              midPrice: px(s.mid_price, e?.midPrice),
              bestBid: px(s.best_bid_price, e?.bestBid),
              bestAsk: px(s.best_ask_price, e?.bestAsk),
              change24h: n(s.daily_price_change, e?.change24h ?? 0),
              oiUsd:
                s.open_interest != null
                  ? n(s.open_interest) * OI_SIDES
                  : (e?.oiUsd ?? 0),
              volume24h: n(s.daily_quote_token_volume, e?.volume24h ?? 0),
              volume24hBase: sz(s.daily_base_token_volume, e?.volume24hBase),
              dayLow: px(s.daily_price_low, e?.dayLow),
              dayHigh: px(s.daily_price_high, e?.dayHigh),
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

    const off = sock.subscribe(
      "market_stats/all",
      (msg) => {
        const raw = msg.market_stats as
          | Record<string, Record<string, unknown>>
          | undefined;
        if (!raw) return;
        pending.push(raw);
        if (timer == null) {
          timer = setTimeout(flush, Math.max(0, lastFlush + FLUSH_MS - Date.now()));
        }
      },
      { flushInterval: SERVER_FLUSH_MS },
    );

    return () => {
      off();
      offStatus();
      if (timer != null) clearTimeout(timer);
    };
  }, []);

  return { stats, live, tick };
}
