"use client";

import { useEffect, useRef, useState } from "react";
import { lighterSocket } from "./ws";
import { displayPrice, displaySize } from "./multiplier";
import { n } from "../format";

/**
 * A live order book, maintained from `order_book/{id}`.
 *
 * The server sends the full book on subscribe (well over a thousand levels a
 * side on the deep markets), then batched deltas every 50ms. A delta whose
 * `begin_nonce` is not the previous `nonce` means one was lost; the book is
 * then wrong in a way nothing downstream could notice, so it is discarded
 * and re-snapshotted rather than patched.
 *
 * Deltas land in plain Maps; React state is refreshed on a throttle, because
 * re-rendering a depth chart twenty times a second buys nothing a reader sees.
 */

export interface Level {
  price: number;
  size: number;
}

export interface BookView {
  /** Best first: bids descending, asks ascending. Trimmed to `depth` levels. */
  bids: Level[];
  asks: Level[];
  bestBid: number | null;
  bestAsk: number | null;
  mid: number | null;
  /** Relative spread, as a fraction of mid. */
  spread: number | null;
  updatedAt: number | null;
  live: boolean;
}

const EMPTY: BookView = {
  bids: [],
  asks: [],
  bestBid: null,
  bestAsk: null,
  mid: null,
  spread: null,
  updatedAt: null,
  live: false,
};

type RawLevel = { price: string | number; size: string | number };

export function useOrderBook(
  marketId: number | null,
  { depth = 400, throttleMs = 250 }: { depth?: number; throttleMs?: number } = {},
): BookView {
  const [view, setView] = useState<BookView>(EMPTY);
  const bids = useRef(new Map<number, number>());
  const asks = useRef(new Map<number, number>());
  const nonce = useRef<number | null>(null);
  const dirty = useRef(false);
  const live = useRef(false);

  useEffect(() => {
    if (marketId == null) return;
    const id = marketId;
    const channel = `order_book/${id}`;
    const sock = lighterSocket();
    bids.current.clear();
    asks.current.clear();
    nonce.current = null;
    setView(EMPTY);

    const apply = (side: Map<number, number>, levels: RawLevel[] | undefined) => {
      for (const l of levels ?? []) {
        const price = displayPrice(id, n(l.price));
        const size = displaySize(id, n(l.size));
        if (price <= 0) continue;
        if (size <= 0) side.delete(price);
        else side.set(price, size);
      }
    };

    const offStatus = sock.onStatus((s) => {
      live.current = s === "open";
      // A dropped socket re-subscribes on reconnect and gets a new snapshot;
      // until then the local book is unknown.
      if (s !== "open") nonce.current = null;
      dirty.current = true;
    });

    const off = sock.subscribe(channel, (msg) => {
      const ob = msg.order_book as
        | { asks?: RawLevel[]; bids?: RawLevel[]; nonce?: number; begin_nonce?: number }
        | undefined;
      if (!ob) return; // subscribe/unsubscribe acknowledgements

      if (String(msg.type ?? "").startsWith("subscribed")) {
        bids.current.clear();
        asks.current.clear();
        apply(bids.current, ob.bids);
        apply(asks.current, ob.asks);
        nonce.current = n(ob.nonce);
        dirty.current = true;
        return;
      }

      if (nonce.current == null) return; // waiting for a snapshot
      if (n(ob.begin_nonce) !== nonce.current) {
        nonce.current = null;
        sock.resubscribe(channel);
        return;
      }
      apply(bids.current, ob.bids);
      apply(asks.current, ob.asks);
      nonce.current = n(ob.nonce);
      dirty.current = true;
    });

    const timer = setInterval(() => {
      if (!dirty.current) return;
      dirty.current = false;
      const b = [...bids.current]
        .sort((x, y) => y[0] - x[0])
        .slice(0, depth)
        .map(([price, size]) => ({ price, size }));
      const a = [...asks.current]
        .sort((x, y) => x[0] - y[0])
        .slice(0, depth)
        .map(([price, size]) => ({ price, size }));
      const bestBid = b[0]?.price ?? null;
      const bestAsk = a[0]?.price ?? null;
      const mid = bestBid != null && bestAsk != null ? (bestBid + bestAsk) / 2 : null;
      setView({
        bids: b,
        asks: a,
        bestBid,
        bestAsk,
        mid,
        spread: mid && bestBid != null && bestAsk != null ? (bestAsk - bestBid) / mid : null,
        updatedAt: nonce.current != null ? Date.now() : null,
        live: live.current && nonce.current != null,
      });
    }, throttleMs);

    return () => {
      clearInterval(timer);
      off();
      offStatus();
    };
  }, [marketId, depth, throttleMs]);

  return view;
}
