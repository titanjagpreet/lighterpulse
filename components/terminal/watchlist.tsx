"use client";

import { IntentLink } from "./intent-link";
import { useEffect, useState } from "react";
import { useWatchlist } from "@/lib/use-watchlist";
import { useMarketStats } from "@/lib/lighter/use-market-stats";
import { fetchPriceCharts } from "@/lib/lighter/market-data";
import { Sparkline } from "./charts";
import { Delta, Figure, Label } from "./primitives";
import { dirOf, price } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Star toggle. State, not emphasis — ink, never a colour. */
export function WatchStar({
  marketId,
  symbol,
  className,
}: {
  marketId: number;
  symbol: string;
  className?: string;
}) {
  const { has, toggle, ready } = useWatchlist();
  const on = ready && has(marketId);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(marketId);
      }}
      aria-pressed={on}
      aria-label={on ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
      title={on ? "Watching — saved in this browser" : "Watch this market"}
      className={cn(
        // Sits above a row-wide link overlay, so starring never navigates.
        "ctl relative z-[2] -m-1 grid size-6 shrink-0 place-items-center rounded-[3px]",
        on ? "text-ink-2 hover:text-ink" : "text-ink-5 hover:text-ink-3",
        className,
      )}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M8 1.6l1.95 4.02 4.43.62-3.22 3.1.78 4.4L8 11.66l-3.94 2.08.78-4.4-3.22-3.1 4.43-.62z"
          fill={on ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export interface StripMarket {
  marketId: number;
  symbol: string;
  markPrice: number;
  change24h: number;
}

/**
 * The overview's pinned row. Reads the browser's watchlist, prices it off the
 * live stream, and fetches sparklines straight from Lighter only when there
 * is something to draw — an empty watchlist costs nothing.
 */
export function WatchlistStrip({ markets }: { markets: StripMarket[] }) {
  const { ids, ready } = useWatchlist();
  const { stats } = useMarketStats();
  const [sparks, setSparks] = useState<Record<number, number[]>>({});

  const hasAny = ready && ids.length > 0;
  useEffect(() => {
    if (!hasAny) return;
    let alive = true;
    fetchPriceCharts()
      .then((s) => alive && setSparks(s))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [hasAny]);

  const byId = new Map(markets.map((m) => [m.marketId, m]));
  const rows = ids
    .map((id) => {
      const base = byId.get(id);
      const live = stats.get(id);
      if (!base && !live) return null;
      return {
        marketId: id,
        symbol: live?.symbol || base?.symbol || `#${id}`,
        price: live?.markPrice || base?.markPrice || 0,
        change: live ? live.change24h : (base?.change24h ?? 0),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <div className="flex min-h-[58px] items-stretch border-b border-line bg-rail">
      <div className="flex shrink-0 flex-col justify-center border-r border-line px-5">
        <Label>Watchlist</Label>
        <span className="figure text-[9px] text-ink-5">this browser</span>
      </div>

      {!ready ? (
        <div className="grow" />
      ) : rows.length === 0 ? (
        <p className="flex items-center px-5 text-[11.5px] text-ink-3">
          Star markets on the{" "}
          <IntentLink
            href="/markets"
            className="mx-1 text-ink-2 underline decoration-edge underline-offset-4 hover:text-ink"
          >
            Markets
          </IntentLink>{" "}
          page to pin them here.
        </p>
      ) : (
        <div className="flex min-w-0 grow overflow-x-auto">
          {rows.map((r) => (
            <IntentLink
              key={r.marketId}
              href={`/markets/${r.symbol}`}
              className="row-hit flex shrink-0 items-center gap-3.5 border-r border-line px-5 py-2.5"
            >
              <span className="flex flex-col">
                <span className="text-[12px] font-semibold">{r.symbol}</span>
                <Delta value={r.change} glyph={false} className="text-[10.5px]" />
              </span>
              <Figure className="text-[12.5px]">{price(r.price)}</Figure>
              <Sparkline
                points={sparks[r.marketId] ?? []}
                width={64}
                height={22}
                dir={dirOf(r.change)}
              />
            </IntentLink>
          ))}
        </div>
      )}
    </div>
  );
}
