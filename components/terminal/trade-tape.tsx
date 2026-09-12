"use client";

import { useEffect, useMemo, useState } from "react";
import { useTrades } from "@/lib/lighter/use-trades";
import { Figure, SectionHeader } from "./primitives";
import { num, price, usd } from "@/lib/format";
import { cn } from "@/lib/utils";

const clockTime = (t: number) =>
  new Date(t).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

/**
 * Every print on one market, newest first. Opens on the last 50 trades from
 * the subscribe snapshot, then streams. Prints in the top tenth by size are
 * set heavier — the tape should make the large ones findable at a glance.
 */
export function TradeTape({ marketId, rows = 28 }: { marketId: number; rows?: number }) {
  const { trades, live, lastAt } = useTrades(marketId, rows);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (lastAt == null) return;
    setFlash(true);
    const id = setTimeout(() => setFlash(false), 620);
    return () => clearTimeout(id);
  }, [lastAt]);

  const bigCut = useMemo(() => {
    if (trades.length < 10) return Infinity;
    const sorted = trades.map((t) => t.usd).sort((a, b) => b - a);
    return sorted[Math.floor(sorted.length * 0.1)];
  }, [trades]);

  const buys = trades.filter((t) => t.side === "buy").reduce((s, t) => s + t.usd, 0);
  const sells = trades.filter((t) => t.side === "sell").reduce((s, t) => s + t.usd, 0);
  const buyShare = buys + sells > 0 ? (buys / (buys + sells)) * 100 : null;

  return (
    <div>
      <SectionHeader title="Trades" note={live ? "live" : "connecting"}>
        <span
          aria-hidden="true"
          className={cn("size-[5px] rounded-full", live ? "bg-brand live-halo" : "bg-ink-5")}
        />
      </SectionHeader>

      {buyShare != null && (
        <div className="mb-3">
          <div className="flex h-[5px] gap-[1.5px]" aria-hidden="true">
            <div className="rounded-l-[2px] bg-up" style={{ width: `${buyShare}%` }} />
            <div className="rounded-r-[2px] bg-down" style={{ width: `${100 - buyShare}%` }} />
          </div>
          <div className="figure mt-1.5 flex justify-between text-[10px]">
            <span className="text-up">{buyShare.toFixed(0)}% bought</span>
            <span className="text-ink-4">last {num(trades.length)} prints, by value</span>
            <span className="text-down">sold {(100 - buyShare).toFixed(0)}%</span>
          </div>
        </div>
      )}

      <div className="label grid grid-cols-[62px_38px_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 border-b border-edge pb-2">
        <span>Time</span>
        <span>Side</span>
        <span className="text-right">Price</span>
        <span className="text-right">Value</span>
      </div>

      {trades.length === 0 ? (
        <p className="py-10 text-center text-[11.5px] text-ink-3">
          {live ? "No trades yet." : "Connecting to the Lighter stream…"}
        </p>
      ) : (
        <div className="flex flex-col">
          {trades.map((t, i) => {
            const big = t.usd >= bigCut;
            return (
              <div
                key={t.id}
                className={cn(
                  "grid grid-cols-[62px_38px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-3 border-b border-hair py-[5px]",
                  i === 0 && t.fresh && flash && "tick-flash",
                )}
              >
                <Figure className="text-[10.5px] text-ink-4">{clockTime(t.t)}</Figure>
                <span className="flex items-center gap-1">
                  <Figure className={cn("text-[10px]", t.side === "buy" ? "text-up" : "text-down")}>
                    {t.side === "buy" ? "BUY" : "SELL"}
                  </Figure>
                </span>
                <Figure className="text-right text-[11.5px] text-ink-2">{price(t.price)}</Figure>
                <span className="flex items-center justify-end gap-1.5">
                  {t.liquidation && (
                    <span
                      className="figure rounded-[2px] border border-down-deep px-1 text-[8.5px] tracking-[0.06em] text-down"
                      title="A forced exit"
                    >
                      LIQ
                    </span>
                  )}
                  <Figure className={cn("text-[11.5px]", big ? "font-semibold text-ink" : "text-ink-2")}>
                    {usd(t.usd)}
                  </Figure>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
