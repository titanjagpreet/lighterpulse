"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useMarketStats } from "@/lib/lighter/use-market-stats";
import { Figure, MagnitudeBar } from "./primitives";
import { TokenIcon } from "./token-icon";
import { price, usdCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface MoverMarket {
  marketId: number;
  symbol: string;
  markPrice: number;
  change24h: number;
  volume24h: number;
  active: boolean;
  icon: string | null;
}

/** A 40% move on a book nobody trades is noise, not news. */
const MIN_VOLUME = 250_000;
const COUNT = 5;
const COLS = "grid-cols-[minmax(0,1fr)_minmax(84px,auto)_minmax(64px,110px)_64px]";

/** The day's biggest moves each way, repriced from the live stream. */
export function Movers({ markets }: { markets: MoverMarket[] }) {
  const { stats } = useMarketStats();

  const { gainers, losers, max } = useMemo(() => {
    const live = markets
      .filter((m) => m.active)
      .map((m) => {
        const s = stats.get(m.marketId);
        return {
          ...m,
          markPrice: s?.markPrice || m.markPrice,
          change24h: s ? s.change24h : m.change24h,
          volume24h: s?.volume24h || m.volume24h,
        };
      })
      .filter((m) => m.volume24h >= MIN_VOLUME && Number.isFinite(m.change24h));
    const gainers = live
      .filter((m) => m.change24h > 0)
      .sort((a, b) => b.change24h - a.change24h)
      .slice(0, COUNT);
    const losers = live
      .filter((m) => m.change24h < 0)
      .sort((a, b) => a.change24h - b.change24h)
      .slice(0, COUNT);
    const max = Math.max(...[...gainers, ...losers].map((m) => Math.abs(m.change24h)), 0.01);
    return { gainers, losers, max };
  }, [markets, stats]);

  const column = (title: string, rows: typeof gainers, dir: "up" | "down") => (
    <div className="min-w-0 p-5">
      <div className="mb-2.5 flex items-baseline gap-3">
        <h2 className="text-[13px] font-semibold tracking-[-0.005em]">{title}</h2>
        <span className="figure text-[10.5px] text-ink-3">
          24h · books over {usdCompact(MIN_VOLUME, 0)} volume
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="py-4 text-[11.5px] text-ink-3">
          {dir === "up" ? "Nothing is up on the day." : "Nothing is down on the day."}
        </p>
      ) : (
        rows.map((m) => (
          <Link
            key={m.marketId}
            href={`/markets/${m.symbol}`}
            className={cn("row-hit grid items-center gap-x-3 border-t border-hair py-1.5", COLS)}
          >
            <span className="flex min-w-0 items-center gap-2">
              <TokenIcon src={m.icon} symbol={m.symbol} size={15} />
              <span className="truncate text-[12.5px] font-semibold">{m.symbol}</span>
              <Figure className="text-[10px] text-ink-4">{usdCompact(m.volume24h, 1)}</Figure>
            </span>
            <Figure className="text-right text-[12px] text-ink-2">{price(m.markPrice)}</Figure>
            <MagnitudeBar
              value={Math.abs(m.change24h)}
              max={max}
              height={4}
              align="left"
              tone={dir}
            />
            <Figure className={cn("text-right text-[12px]", dir === "up" ? "text-up" : "text-down")}>
              {dir === "up" ? "+" : "−"}
              {Math.abs(m.change24h).toFixed(2)}%
            </Figure>
          </Link>
        ))
      )}
    </div>
  );

  return (
    <div className="grid border-b border-line md:grid-cols-2">
      <div className="border-b border-line md:border-r md:border-b-0">
        {column("Gainers", gainers, "up")}
      </div>
      {column("Losers", losers, "down")}
    </div>
  );
}
