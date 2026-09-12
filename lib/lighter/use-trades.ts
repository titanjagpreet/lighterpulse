"use client";

import { useEffect, useRef, useState } from "react";
import { lighterSocket } from "./ws";
import { n } from "../format";

/**
 * Prints for one market, from `trade/{id}`.
 *
 * Subscribing replays the last 50 trades, so the tape is full on arrival;
 * live updates follow. Side is the taker's: a maker resting on the ask means
 * the taker bought.
 */

export interface TapeTrade {
  id: string;
  price: number;
  size: number;
  usd: number;
  side: "buy" | "sell";
  t: number;
  /** Arrived live rather than in the subscribe snapshot. */
  fresh: boolean;
  liquidation: boolean;
}

export function useTrades(
  marketId: number | null,
  maxRows = 40,
): { trades: TapeTrade[]; live: boolean; lastAt: number | null } {
  const [trades, setTrades] = useState<TapeTrade[]>([]);
  const [live, setLive] = useState(false);
  const [lastAt, setLastAt] = useState<number | null>(null);
  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (marketId == null) return;
    const sock = lighterSocket();
    seen.current = new Set();
    setTrades([]);
    const offStatus = sock.onStatus((s) => setLive(s === "open"));

    const off = sock.subscribe(`trade/${marketId}`, (msg) => {
      const list = Array.isArray(msg.trades) ? (msg.trades as Record<string, unknown>[]) : [];
      const liqs = Array.isArray(msg.liquidation_trades)
        ? (msg.liquidation_trades as Record<string, unknown>[])
        : [];
      if (list.length === 0 && liqs.length === 0) return;

      const fresh = String(msg.type ?? "").startsWith("update");
      const liqIds = new Set(liqs.map((l) => String(l.trade_id_str ?? l.trade_id ?? "")));
      const incoming: TapeTrade[] = [];

      for (const raw of [...list, ...liqs]) {
        const id = String(raw.trade_id_str ?? raw.trade_id ?? "");
        if (!id || seen.current.has(id)) continue;
        seen.current.add(id);
        incoming.push({
          id,
          price: n(raw.price),
          size: n(raw.size),
          usd: n(raw.usd_amount),
          side: raw.is_maker_ask === true ? "buy" : "sell",
          t: n(raw.timestamp, Date.now()),
          fresh,
          liquidation: liqIds.has(id),
        });
      }
      if (incoming.length === 0) return;

      setTrades((prev) =>
        [...incoming, ...prev].sort((a, b) => b.t - a.t).slice(0, maxRows),
      );
      if (fresh) setLastAt(Date.now());
      if (seen.current.size > 5000) seen.current = new Set();
    });

    return () => {
      off();
      offStatus();
    };
  }, [marketId, maxRows]);

  return { trades, live, lastAt };
}
