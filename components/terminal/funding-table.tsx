"use client";

import { IntentLink } from "./intent-link";
import { useMemo, useState } from "react";
import { useMarketStats } from "@/lib/lighter/use-market-stats";
import {
  OTHER_VENUES,
  VENUE_LABEL,
  widestSpread,
  type FundingRow,
  type OtherVenue,
} from "@/lib/funding-board";
import { ASSET_CLASS_LABEL, type AssetClass } from "@/lib/lighter/types";
import { aprPct, ratePct, usdCompact } from "@/lib/format";
import { Figure, Segmented } from "./primitives";
import { TokenIcon } from "./token-icon";
import { cn } from "@/lib/utils";

type SortKey = "spread" | "lighter" | "oi" | "symbol";

/** Below this, a wide spread is usually an empty book rather than an opportunity. */
const LIQUID_OI = 1_000_000;
type Unit = "8h" | "apr";

const COLS =
  "grid-cols-[minmax(96px,1fr)_minmax(92px,0.95fr)_minmax(88px,0.9fr)_minmax(88px,0.9fr)_minmax(96px,0.95fr)_minmax(170px,1.6fr)_minmax(92px,0.9fr)]";

/**
 * Lighter against the three largest perp venues, per market.
 *
 * Lighter's own column re-prices off the live stream; the other venues are
 * the cached feed (30s). Spreads are recomputed as Lighter moves, so the
 * ranking is live even though three of the four columns are not.
 */
export function FundingTable({ initial }: { initial: FundingRow[] }) {
  const { stats, live } = useMarketStats();
  const [query, setQuery] = useState("");
  const [cls, setCls] = useState<AssetClass | "all">("all");
  const [sort, setSort] = useState<SortKey>("spread");
  const [unit, setUnit] = useState<Unit>("8h");
  const [comparableOnly, setComparableOnly] = useState(true);
  const [liquidOnly, setLiquidOnly] = useState(true);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const merged = initial.map((r) => {
      const liveRate = stats.get(r.marketId)?.funding;
      const lighter = liveRate ?? r.lighter;
      return {
        ...r,
        lighter,
        oiUsd: stats.get(r.marketId)?.oiUsd || r.oiUsd,
        best: widestSpread(lighter, r.venues),
      };
    });
    const filtered = merged.filter(
      (r) =>
        (cls === "all" || r.assetClass === cls) &&
        (!comparableOnly || r.best != null) &&
        (!liquidOnly || r.oiUsd >= LIQUID_OI) &&
        (!q || r.symbol.toLowerCase().includes(q)),
    );
    return filtered.sort((a, b) => {
      switch (sort) {
        case "symbol":
          return a.symbol.localeCompare(b.symbol);
        case "lighter":
          return Math.abs(b.lighter) - Math.abs(a.lighter);
        case "oi":
          return b.oiUsd - a.oiUsd;
        default:
          return Math.abs(b.best?.spread ?? 0) - Math.abs(a.best?.spread ?? 0);
      }
    });
  }, [initial, stats, query, cls, sort, comparableOnly, liquidOnly]);

  const classes = useMemo(() => {
    const c = new Map<AssetClass, number>();
    for (const r of initial) c.set(r.assetClass, (c.get(r.assetClass) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  }, [initial]);

  // Scale bars to the 90th percentile so one outlier cannot flatten the rest.
  const spreads = rows.map((r) => Math.abs(r.best?.spread ?? 0)).sort((a, b) => a - b);
  const maxSpread = Math.max(spreads[Math.floor(spreads.length * 0.9)] ?? 0, 1e-9);
  const show = (v: number | null) => {
    if (v == null) return "—";
    if (unit === "8h") return ratePct(v);
    const apr = aprPct(v)!;
    return `${apr >= 0 ? "+" : "−"}${Math.abs(apr).toFixed(1)}%`;
  };
  const tone = (v: number | null) =>
    v == null ? "text-ink-5" : v > 0 ? "text-up" : v < 0 ? "text-down" : "text-ink-3";

  return (
    <div>
      {/* controls */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-b border-line px-5 py-3">
        <div className="flex flex-wrap gap-0.5">
          <FilterTab on={cls === "all"} onClick={() => setCls("all")}>
            All <span className="text-ink-4">{initial.length}</span>
          </FilterTab>
          {classes.map(([k, n]) => (
            <FilterTab key={k} on={cls === k} onClick={() => setCls(k)}>
              {ASSET_CLASS_LABEL[k]} <span className="text-ink-4">{n}</span>
            </FilterTab>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setComparableOnly((v) => !v)}
          aria-pressed={comparableOnly}
          title="Hide markets no other venue lists"
          className={cn(
            "figure ctl rounded-[3px] border border-edge px-2.5 py-1 text-[11px] pointer-coarse:py-2",
            comparableOnly ? "bg-active text-ink" : "text-ink-2 hover:text-ink",
          )}
        >
          Listed elsewhere
        </button>
        <button
          type="button"
          onClick={() => setLiquidOnly((v) => !v)}
          aria-pressed={liquidOnly}
          title="Hide books with under $1M open interest on Lighter"
          className={cn(
            "figure ctl rounded-[3px] border border-edge px-2.5 py-1 text-[11px] pointer-coarse:py-2",
            liquidOnly ? "bg-active text-ink" : "text-ink-2 hover:text-ink",
          )}
        >
          OI ≥ $1M
        </button>

        <div className="grow" />

        {live && (
          <span className="flex items-center gap-1.5">
            <span className="size-[5px] rounded-full bg-brand live-halo" />
            <span className="figure text-[10px] text-ink-3">Lighter live</span>
          </span>
        )}

        <div role="group" aria-label="Rate unit">
          <Segmented
            options={[
              { key: "8h", label: "8H RATE" },
              { key: "apr", label: "APR" },
            ]}
            value={unit}
            onChange={setUnit}
          />
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter symbol"
          aria-label="Filter by symbol"
          spellCheck={false}
          className="figure h-[30px] w-full rounded-[4px] border border-edge bg-panel px-2.5 text-[11px] text-ink placeholder:text-ink-3 focus:border-ink-4 focus:outline-none sm:w-[152px]"
        />
      </div>

      {/* table */}
      <div className="overflow-x-auto px-5">
        <div className="min-w-[980px] [--row-h:54px]">
          <div
            className={cn("label grid items-center gap-x-4 border-b border-edge pt-3.5 pb-3", COLS)}
          >
            <SortHead k="symbol" sort={sort} set={setSort} align="left">
              Market
            </SortHead>
            <SortHead k="lighter" sort={sort} set={setSort}>
              Lighter
            </SortHead>
            {OTHER_VENUES.map((v) => (
              <span key={v} className="text-right">
                {VENUE_LABEL[v]}
              </span>
            ))}
            <SortHead k="spread" sort={sort} set={setSort}>
              Widest spread
            </SortHead>
            <SortHead k="oi" sort={sort} set={setSort}>
              Open interest
            </SortHead>
          </div>

          {rows.map((r) => {
            const spread = r.best?.spread ?? null;
            const width = spread != null ? Math.min(50, (Math.abs(spread) / maxSpread) * 50) : 0;
            return (
              <div
                key={r.marketId}
                className={cn(
                  "row-hit lazy-row relative isolate grid items-center gap-x-4 border-b border-hair py-2.5",
                  COLS,
                  !r.active && "opacity-55",
                )}
              >
                {/* the symbol's overlay makes the whole row the link */}
                <IntentLink
                  href={`/markets/${r.symbol}`}
                  className="flex min-w-0 items-center gap-2 text-[13px] font-semibold after:absolute after:inset-0 after:z-[1] hover:underline hover:decoration-edge hover:underline-offset-4"
                >
                  <TokenIcon src={r.icon} symbol={r.symbol} size={16} />
                  <span className="truncate">{r.symbol}</span>
                </IntentLink>

                <Figure className={cn("text-right text-[12.5px] font-medium", tone(r.lighter))}>
                  {show(r.lighter)}
                </Figure>

                {OTHER_VENUES.map((v: OtherVenue) => (
                  <Figure
                    key={v}
                    className={cn(
                      "rounded-[2px] px-1 py-0.5 text-right text-[12px]",
                      tone(r.venues[v]),
                      r.best?.venue === v && "bg-raised",
                    )}
                  >
                    {show(r.venues[v])}
                  </Figure>
                ))}

                {spread != null && r.best ? (
                  <span className="flex items-center justify-end gap-3">
                    {/* diverging bar around a centre rule */}
                    <span className="relative h-[5px] w-[64px] shrink-0" aria-hidden="true">
                      <span className="absolute top-[-2px] left-1/2 h-[9px] w-px bg-edge" />
                      <span
                        className={cn(
                          "absolute top-0 h-[5px] rounded-[1px]",
                          spread >= 0 ? "left-1/2 bg-up-dim" : "right-1/2 bg-down-dim",
                        )}
                        style={{ width: `${width}%` }}
                      />
                    </span>
                    <span className="flex flex-col items-end">
                      <Figure className={cn("text-[12px]", tone(spread))}>{show(spread)}</Figure>
                      <Figure className="text-[9.5px] text-ink-4">
                        vs {VENUE_LABEL[r.best.venue]}
                      </Figure>
                    </span>
                  </span>
                ) : (
                  <Figure className="text-right text-[11px] text-ink-5">Lighter only</Figure>
                )}

                <Figure className="text-right text-[12px] text-ink-2">
                  {usdCompact(r.oiUsd, 1)}
                </Figure>
              </div>
            );
          })}

          {rows.length === 0 && (
            <p className="py-12 text-center text-[12.5px] text-ink-3">
              No markets match that filter.
            </p>
          )}
        </div>
      </div>

      <p className="figure px-5 py-4 text-[10.5px] text-ink-4">
        {rows.length} markets · spread is Lighter minus the venue · highlighted cell marks
        the venue it is measured against
      </p>
    </div>
  );
}

function FilterTab({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "figure ctl rounded-[3px] px-3 py-1.5 text-[11px] pointer-coarse:py-2.5",
        on ? "bg-active text-ink" : "text-ink-2 hover:bg-raised hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function SortHead({
  k,
  sort,
  set,
  align = "right",
  children,
}: {
  k: SortKey;
  sort: SortKey;
  set: (k: SortKey) => void;
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  const active = sort === k;
  return (
    <button
      type="button"
      onClick={() => set(k)}
      aria-pressed={active}
      className={cn(
        "ctl label -my-2 py-2 hover:text-ink-2",
        align === "right" ? "text-right" : "text-left",
        active && "text-ink-2",
      )}
    >
      {children}
      <span aria-hidden="true" className={active ? "" : "opacity-0"}>
        {" "}▾
      </span>
    </button>
  );
}
