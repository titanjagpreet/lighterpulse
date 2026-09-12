"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMarketStats } from "@/lib/lighter/use-market-stats";
import { reprice, type Position } from "@/lib/lighter/account";
import {
  Chip,
  Delta,
  Empty,
  Figure,
  SectionHeader,
  Segmented,
  SplitBar,
} from "./primitives";
import { num, price, usdCompact, usdSigned, usdSignedCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

type SortKey = "market" | "value" | "entry" | "pnl" | "funding";
type Side = "all" | "long" | "short";

const COLS =
  "grid-cols-[minmax(128px,1.2fr)_52px_minmax(104px,1fr)_minmax(88px,0.9fr)_minmax(88px,0.9fr)_minmax(112px,1fr)_minmax(88px,0.8fr)]";
const PAGE = 25;

/**
 * A pool's book, repriced on every tick of the live stream — a pool's own
 * account only updates when it trades, so idle positions would otherwise sit
 * frozen while the market moves.
 */
export function PositionsBook({
  positions,
  title = "Open positions",
  emptyText = "No open positions.",
}: {
  positions: Position[];
  title?: string;
  emptyText?: string;
}) {
  const { stats } = useMarketStats();
  const [side, setSide] = useState<Side>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "value", dir: -1 });
  const [shown, setShown] = useState(PAGE);

  const priced = useMemo(
    () =>
      positions.map((p) => reprice(p, stats.get(p.marketId)?.markPrice ?? p.markPrice)),
    [positions, stats],
  );

  const totals = useMemo(() => {
    let long = 0;
    let short = 0;
    let pnl = 0;
    for (const p of priced) {
      if (p.side === "long") long += p.valueUsd;
      else short += p.valueUsd;
      pnl += p.unrealizedPnl;
    }
    return { long, short, pnl };
  }, [priced]);

  const rows = useMemo(() => {
    const list = priced.filter((p) => side === "all" || p.side === side);
    const key = (p: Position): number =>
      sort.key === "entry"
        ? p.entryPrice
        : sort.key === "pnl"
          ? p.unrealizedPnl
          : sort.key === "funding"
            ? -p.fundingPaid
            : p.valueUsd;
    return [...list].sort((a, b) =>
      sort.key === "market"
        ? a.symbol.localeCompare(b.symbol) * sort.dir
        : (key(a) - key(b)) * sort.dir,
    );
  }, [priced, side, sort]);

  const head = (k: SortKey, label: string, right = true) => {
    const on = sort.key === k;
    return (
      <button
        type="button"
        onClick={() =>
          setSort(on ? { key: k, dir: sort.dir === 1 ? -1 : 1 } : { key: k, dir: k === "market" ? 1 : -1 })
        }
        className={cn(
          "label ctl flex items-center gap-1 hover:text-ink-2",
          right && "justify-end",
          on && "text-ink-2",
        )}
      >
        {label}
        {on && <span aria-hidden="true">{sort.dir === -1 ? "↓" : "↑"}</span>}
        {on && <span className="sr-only">{sort.dir === -1 ? ", descending" : ", ascending"}</span>}
      </button>
    );
  };

  return (
    <div>
      <SectionHeader title={title} note={num(positions.length)}>
        {positions.length > 0 && (
          <Segmented
            options={[
              { key: "all", label: "All" },
              { key: "long", label: "Long" },
              { key: "short", label: "Short" },
            ]}
            value={side}
            onChange={(k: Side) => {
              setSide(k);
              setShown(PAGE);
            }}
          />
        )}
      </SectionHeader>

      {positions.length === 0 ? (
        <Empty>{emptyText}</Empty>
      ) : (
        <>
          <div className="mb-4 grid items-end gap-x-8 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <SplitBar left={totals.long} right={totals.short} height={6} />
              <div className="figure mt-1.5 flex flex-wrap justify-between gap-x-3 text-[10.5px]">
                <span className="text-up">long {usdCompact(totals.long)}</span>
                <span className="text-ink-3">
                  net {usdSignedCompact(totals.long - totals.short)}
                </span>
                <span className="text-down">short {usdCompact(totals.short)}</span>
              </div>
            </div>
            <div className="sm:text-right">
              <div className="label mb-1">Unrealised PnL</div>
              <Figure
                className={cn(
                  "text-[15px] font-medium",
                  totals.pnl >= 0 ? "text-up" : "text-down",
                )}
              >
                {usdSigned(totals.pnl)}
              </Figure>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[820px] pr-1">
              <div
                className={cn(
                  "grid items-center gap-x-4 border-b border-edge pt-1 pb-2.5",
                  COLS,
                )}
              >
                {head("market", "Market", false)}
                <span className="label">Side</span>
                {head("value", "Value / size")}
                {head("entry", "Entry")}
                <span className="label text-right">Mark</span>
                {head("pnl", "PnL")}
                {head("funding", "Funding")}
              </div>

              {rows.slice(0, shown).map((p) => (
                <div
                  key={p.marketId}
                  className={cn(
                    "row-hit relative isolate grid items-center gap-x-4 border-b border-hair py-2.5",
                    COLS,
                  )}
                >
                  <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    {/* the symbol's overlay makes the whole row the link */}
                    <Link
                      href={`/markets/${p.symbol}`}
                      className="text-[12.5px] font-semibold after:absolute after:inset-0 after:z-[1] hover:underline hover:decoration-edge hover:underline-offset-4"
                    >
                      {p.symbol}
                    </Link>
                    {p.leverage > 0 && (
                      <Figure className="text-[9.5px] text-ink-3">
                        {p.leverage.toFixed(p.leverage < 10 ? 1 : 0)}×
                      </Figure>
                    )}
                    {p.marginMode === "isolated" && <Chip tone="warn">ISO</Chip>}
                  </span>
                  <Figure
                    className={cn("text-[10.5px]", p.side === "long" ? "text-up" : "text-down")}
                  >
                    {p.side.toUpperCase()}
                  </Figure>
                  <span className="flex flex-col items-end">
                    <Figure className="text-[12px]">{usdCompact(p.valueUsd, 2)}</Figure>
                    <Figure className="text-[10px] text-ink-3">
                      {num(p.size, p.size < 10 ? 4 : 2)}
                    </Figure>
                  </span>
                  <Figure className="text-right text-[12px] text-ink-2">
                    {price(p.entryPrice)}
                  </Figure>
                  <Figure className="text-right text-[12px]">{price(p.markPrice)}</Figure>
                  <span className="flex flex-col items-end">
                    <Figure
                      className={cn(
                        "text-[12px] font-medium",
                        p.unrealizedPnl >= 0 ? "text-up" : "text-down",
                      )}
                    >
                      {usdSigned(p.unrealizedPnl)}
                    </Figure>
                    <Delta value={p.returnPct} glyph={false} className="text-[10px]" />
                  </span>
                  <Figure
                    className={cn(
                      "text-right text-[11.5px]",
                      p.fundingPaid > 0
                        ? "text-down"
                        : p.fundingPaid < 0
                          ? "text-up"
                          : "text-ink-4",
                    )}
                  >
                    {p.fundingPaid === 0 ? "—" : usdSigned(-p.fundingPaid)}
                  </Figure>
                </div>
              ))}
            </div>
          </div>

          {rows.length > shown && (
            <button
              type="button"
              onClick={() => setShown((s) => s + PAGE * 2)}
              className="ctl figure mt-3 rounded-[3px] border border-edge px-3 py-1.5 text-[11px] text-ink-2 hover:text-ink pointer-coarse:py-2.5"
            >
              Show {Math.min(PAGE * 2, rows.length - shown)} more · {rows.length - shown} not shown
            </button>
          )}
        </>
      )}
    </div>
  );
}
