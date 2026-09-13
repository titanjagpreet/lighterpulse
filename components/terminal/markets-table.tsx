"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { useMarketStats, type LiveMarket } from "@/lib/lighter/use-market-stats";
import { useWatchlist } from "@/lib/use-watchlist";
import {
  ASSET_CLASS_LABEL,
  ASSET_CLASS_TAG,
  type AssetClass,
  type Market,
} from "@/lib/lighter/types";
import {
  compact,
  dirOf,
  num,
  price,
  ratePct,
  usdCompact,
} from "@/lib/format";
import { Sparkline } from "./charts";
import { IntentLink } from "./intent-link";
import { Delta, Figure, MagnitudeBar, RangeMarker } from "./primitives";
import { WatchStar } from "./watchlist";
import { TokenIcon } from "./token-icon";
import { cn } from "@/lib/utils";

type SortKey = "oiUsd" | "oiChange" | "volume24h" | "change24h" | "trades24h" | "symbol";

/**
 * What a row draws, and all the page sends: the table ships twice, as HTML
 * and again as the data behind it.
 */
export type TableMarket = Pick<
  Market,
  | "marketId"
  | "symbol"
  | "assetClass"
  | "active"
  | "icon"
  | "markPrice"
  | "change24h"
  | "oiUsd"
  | "volume24h"
  | "trades24h"
  | "dayLow"
  | "dayHigh"
  | "rangePos"
  | "funding"
  | "maxLeverage"
>;

/** Widths of the open-interest and volume bars, px. */
const OI_BAR = 96;
const VOL_BAR = 104;

/** The live fields a row draws. A row is replaced only when one of them moves. */
const LIVE_FIELDS = [
  "markPrice",
  "change24h",
  "oiUsd",
  "volume24h",
  "dayLow",
  "dayHigh",
  "rangePos",
  "funding",
] as const;

/** The row with live values applied — or the same row, when nothing it draws moved. */
function withLive(m: TableMarket, s: LiveMarket): TableMarket {
  const dayLow = s.dayLow || m.dayLow;
  const dayHigh = s.dayHigh || m.dayHigh;
  const markPrice = s.markPrice || m.markPrice;
  const span = dayHigh - dayLow;
  const next: TableMarket = {
    ...m,
    markPrice,
    change24h: s.change24h,
    oiUsd: s.oiUsd || m.oiUsd,
    volume24h: s.volume24h || m.volume24h,
    dayLow,
    dayHigh,
    rangePos:
      span > 0 ? Math.min(1, Math.max(0, (markPrice - dayLow) / span)) : m.rangePos,
    // Already converted to an 8-hour ratio by the hook.
    funding: s.funding ?? m.funding,
  };
  return LIVE_FIELDS.every((k) => next[k] === m[k]) ? m : next;
}

/**
 * All markets, filtered and sorted in the browser.
 *
 * The rows are server-rendered first so the page is complete for crawlers and
 * on first paint; this component then takes over for interaction and subscribes
 * to `market_stats/all` — one subscription that streams every market at once.
 *
 * The stream lands about once a second. Redrawing all 150-odd rows each time
 * kept a throttled phone's main thread busy for over a quarter of every second,
 * so only rows whose figures moved re-render, and rows off screen skip layout
 * and paint (`lazy-row`) until they scroll near.
 */
export function MarketsTable({
  initial,
  sparks,
  oiChanges = {},
}: {
  initial: TableMarket[];
  /** marketId → 24 hourly closes. */
  sparks: Record<number, number[]>;
  /** marketId → 24h open-interest change, %, from recorded history. */
  oiChanges?: Record<number, number | null>;
}) {
  const [markets, setMarkets] = useState(initial);
  const [cls, setCls] = useState<AssetClass | "all">("all");
  const [query, setQuery] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [watchOnly, setWatchOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("oiUsd");
  const { stats, live } = useMarketStats();
  const watch = useWatchlist();

  // Server data wins on navigation.
  useEffect(() => setMarkets(initial), [initial]);

  // Merge live prices over the server-rendered rows, keeping every row that
  // did not move — and the array itself when none did.
  useEffect(() => {
    if (stats.size === 0) return;
    setMarkets((prev) => {
      let moved = false;
      const next = prev.map((m) => {
        const s = stats.get(m.marketId);
        const row = s ? withLive(m, s) : m;
        if (row !== m) moved = true;
        return row;
      });
      return moved ? next : prev;
    });
  }, [stats]);

  const counts = useMemo(() => {
    const c = new Map<AssetClass, number>();
    for (const m of markets) c.set(m.assetClass, (c.get(m.assetClass) ?? 0) + 1);
    return c;
  }, [markets]);

  const watchedCount = watch.ready ? watch.ids.length : 0;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const watched = new Set(watch.ids);
    const filtered = markets.filter(
      (m) =>
        (cls === "all" || m.assetClass === cls) &&
        (!activeOnly || m.active) &&
        (!watchOnly || watched.has(m.marketId)) &&
        (!q || m.symbol.toLowerCase().includes(q)),
    );
    const dir = sort === "symbol" ? 1 : -1;
    // Markets without a recorded change sort last either way.
    const oiKey = (m: TableMarket) => oiChanges[m.marketId] ?? -1e9;
    return filtered.sort((a, b) =>
      sort === "symbol"
        ? a.symbol.localeCompare(b.symbol) * dir
        : sort === "oiChange"
          ? (oiKey(a) - oiKey(b)) * dir
          : (a[sort] - b[sort]) * dir,
    );
  }, [markets, cls, query, activeOnly, watchOnly, watch.ids, sort, oiChanges]);

  const maxOi = Math.max(...rows.map((m) => m.oiUsd), 1);
  const maxVol = Math.max(...rows.map((m) => m.volume24h), 1);

  const tabs: { key: AssetClass | "all"; label: string; n: number }[] = [
    { key: "all", label: "All", n: markets.length },
    ...([...counts.entries()] as [AssetClass, number][])
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => ({ key: k, label: ASSET_CLASS_LABEL[k], n: v })),
  ];

  const toggleClass = (on: boolean) =>
    cn(
      "figure ctl rounded-[3px] border px-2.5 py-1 text-[11px] pointer-coarse:py-2",
      on ? "border-edge bg-active text-ink" : "border-edge text-ink-2 hover:text-ink",
    );

  return (
    <div>
      {/* filters */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-b border-line px-5 py-3">
        <div className="flex flex-wrap gap-0.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setCls(t.key)}
              aria-pressed={cls === t.key}
              className={cn(
                "figure ctl rounded-[3px] px-3 py-1.5 text-[11px] pointer-coarse:py-2.5",
                cls === t.key
                  ? "bg-active text-ink"
                  : "text-ink-2 hover:bg-raised hover:text-ink",
              )}
            >
              {t.label} <span className="text-ink-4">{t.n}</span>
            </button>
          ))}
        </div>

        <span className="hidden h-4 w-px bg-edge sm:block" />

        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setActiveOnly((v) => !v)}
            aria-pressed={activeOnly}
            className={toggleClass(activeOnly)}
          >
            Active only
          </button>
          <button
            type="button"
            onClick={() => setWatchOnly((v) => !v)}
            aria-pressed={watchOnly}
            className={toggleClass(watchOnly)}
            title="Starred markets, saved in this browser"
          >
            Watchlist <span className="text-ink-4">{watchedCount}</span>
          </button>
        </div>

        <div className="grow" />

        {live && (
          <span className="flex items-center gap-1.5">
            <span className="size-[5px] rounded-full bg-brand live-halo" />
            <span className="figure text-[10px] text-ink-3">streaming</span>
          </span>
        )}

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter symbol"
          aria-label="Filter by symbol"
          spellCheck={false}
          className="figure h-[30px] w-full rounded-[4px] border border-edge bg-panel px-2.5 text-[11px] text-ink placeholder:text-ink-3 focus:border-ink-4 focus:outline-none sm:w-[168px]"
        />
      </div>

      {/* table */}
      <div className="overflow-x-auto px-5">
        <div className="min-w-[1230px]">
          <div className="label markets-cols grid items-center gap-x-4 border-b border-edge pt-3.5 pb-3">
            {/* sr-only is absolutely positioned; wrapping it keeps the grid cell */}
            <span>
              <span className="sr-only">Watch</span>
            </span>
            <SortHead k="symbol" sort={sort} set={setSort} align="left">
              Market
            </SortHead>
            <span className="text-right">Mark</span>
            <SortHead k="change24h" sort={sort} set={setSort}>
              24h
            </SortHead>
            <span className="text-right">Trend</span>
            <SortHead k="oiUsd" sort={sort} set={setSort}>
              Open interest
            </SortHead>
            <SortHead k="oiChange" sort={sort} set={setSort}>
              OI 24h
            </SortHead>
            <SortHead k="volume24h" sort={sort} set={setSort}>
              Volume 24h
            </SortHead>
            <span className="text-right">Funding 8h</span>
            <SortHead k="trades24h" sort={sort} set={setSort}>
              Trades
            </SortHead>
            <span className="text-right">Max lev</span>
            <span className="text-right">Day range</span>
          </div>

          {rows.map((m) => (
            <MarketRow
              key={m.marketId}
              m={m}
              spark={sparks[m.marketId]}
              oiChange={oiChanges[m.marketId] ?? null}
              oiFill={Math.round((m.oiUsd / maxOi) * OI_BAR)}
              volFill={Math.round((m.volume24h / maxVol) * VOL_BAR)}
            />
          ))}

          {rows.length === 0 && (
            <p className="py-12 text-center text-[12.5px] text-ink-3">
              {watchOnly && watchedCount === 0
                ? "Your watchlist is empty. Star a market to add it."
                : "No markets match that filter."}
            </p>
          )}
        </div>
      </div>

      <div className="figure px-5 py-4 text-[10.5px] text-ink-4">
        {rows.length} of {markets.length} markets · trend is the last 24 hours,
        hourly
      </div>
    </div>
  );
}

/**
 * One market. Memoised on its row, its sparkline (which never changes after
 * load) and its bar fills in whole pixels — so a move in the biggest book,
 * which rescales every bar, does not redraw rows whose bars stay put.
 */
const MarketRow = memo(function MarketRow({
  m,
  spark,
  oiChange,
  oiFill,
  volFill,
}: {
  m: TableMarket;
  spark: number[] | undefined;
  oiChange: number | null;
  /** Open-interest bar fill, px of OI_BAR. */
  oiFill: number;
  /** Volume bar fill, px of VOL_BAR. */
  volFill: number;
}) {
  const tag = ASSET_CLASS_TAG[m.assetClass];
  // The last hourly close, then the live mark — so the line ends now.
  const trend = spark ? [...spark, m.markPrice] : [];
  return (
    <div
      className={cn(
        "row-hit lazy-row markets-cols relative isolate grid items-center gap-x-4 border-b border-hair py-2.5",
        !m.active && "opacity-55",
      )}
    >
      <WatchStar marketId={m.marketId} symbol={m.symbol} />

      {/* The symbol is the row's link. Its overlay makes the whole row
          clickable — middle-click and "open in new tab" included —
          while the star sits above it as its own button. */}
      <IntentLink
        href={`/markets/${m.symbol}`}
        className="flex items-center gap-2 after:absolute after:inset-0 after:z-[1] hover:underline hover:decoration-edge hover:underline-offset-4"
      >
        <TokenIcon src={m.icon} symbol={m.symbol} size={16} />
        <span className="text-[13px] font-semibold">{m.symbol}</span>
        {tag && (
          <span
            className={cn(
              "figure text-[8.5px] tracking-[0.07em]",
              m.assetClass === "commodity"
                ? "text-warn"
                : m.assetClass === "index"
                  ? "text-info"
                  : "text-ink-3",
            )}
          >
            {tag}
          </span>
        )}
      </IntentLink>

      <Figure className="text-right text-[12.5px]">{price(m.markPrice)}</Figure>

      <Delta value={m.change24h} glyph={false} className="text-right text-[12.5px]" />

      <span className="flex justify-end">
        <Sparkline points={trend} width={64} height={20} dir={dirOf(m.change24h)} />
      </span>

      <span className="flex flex-col items-end gap-1">
        <Figure className="text-[12.5px]">{usdCompact(m.oiUsd, 1)}</Figure>
        <MagnitudeBar value={oiFill} max={OI_BAR} width={OI_BAR} />
      </span>

      <Delta
        value={oiChange}
        glyph={false}
        decimals={1}
        className="text-right text-[12px]"
      />

      <span className="flex flex-col items-end gap-1">
        <Figure className="text-[12.5px] text-ink-2">{usdCompact(m.volume24h, 1)}</Figure>
        <MagnitudeBar value={volFill} max={VOL_BAR} width={VOL_BAR} tone="neutral" />
      </span>

      <Figure
        className={cn(
          "text-right text-[12px]",
          m.funding == null ? "text-ink-4" : m.funding >= 0 ? "text-up" : "text-down",
        )}
      >
        {m.funding == null ? "—" : ratePct(m.funding)}
      </Figure>

      <Figure className="text-right text-[12px] text-ink-2">{num(m.trades24h)}</Figure>

      <Figure className="text-right text-[12px] text-ink-3">{m.maxLeverage}×</Figure>

      {m.active ? (
        <span className="flex items-center justify-end gap-2.5">
          <Figure className="text-[10px] text-ink-4">{compact(m.dayLow, 1)}</Figure>
          <RangeMarker pos={m.rangePos} dir={dirOf(m.change24h)} />
          <Figure className="text-[10px] text-ink-4">{compact(m.dayHigh, 1)}</Figure>
        </span>
      ) : (
        <span className="flex items-center justify-end gap-2">
          <span className="size-[5px] rounded-full bg-warn" />
          <Figure className="text-[10.5px] text-warn">Inactive</Figure>
        </span>
      )}
    </div>
  );
});

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
