"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useOrderBook, type Level } from "@/lib/lighter/use-order-book";
import { Figure, Label, SectionHeader, Segmented } from "./primitives";
import { price, usdCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ══════════════════════════════════════════════════════════════
   Resting liquidity around the mid: how much size the book can absorb
   before price has to move. Cumulative USD notional per side, as steps,
   within a band either side of mid. Updated four times a second from
   the live book — this is what is quoted now, not a forecast.
   ══════════════════════════════════════════════════════════════ */

const BANDS = [
  { key: "0.5", label: "±0.5%", pct: 0.005 },
  { key: "2", label: "±2%", pct: 0.02 },
  { key: "5", label: "±5%", pct: 0.05 },
] as const;
type BandKey = (typeof BANDS)[number]["key"];

const AXIS_W = 52;
const H = 196;
const X_H = 22;
const VB = 1000;

/** Cumulative notional walking out from the touch until `limit` is crossed. */
function walk(levels: Level[], limit: number, side: "bid" | "ask") {
  const out: { price: number; cum: number }[] = [];
  let cum = 0;
  for (const l of levels) {
    if (side === "bid" ? l.price < limit : l.price > limit) break;
    cum += l.price * l.size;
    out.push({ price: l.price, cum });
  }
  return out;
}

function notionalWithin(levels: Level[], mid: number, pct: number, side: "bid" | "ask") {
  const limit = side === "bid" ? mid * (1 - pct) : mid * (1 + pct);
  return walk(levels, limit, side).at(-1)?.cum ?? 0;
}

export function DepthChart({ marketId }: { marketId: number }) {
  const book = useOrderBook(marketId);
  const [band, setBand] = useState<BandKey>("2");
  const [hoverFrac, setHoverFrac] = useState<number | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const pct = BANDS.find((b) => b.key === band)!.pct;

  const g = useMemo(() => {
    if (book.mid == null || book.bids.length === 0 || book.asks.length === 0) return null;
    const mid = book.mid;
    const lo = mid * (1 - pct);
    const hi = mid * (1 + pct);
    const bids = walk(book.bids, lo, "bid");
    const asks = walk(book.asks, hi, "ask");
    const yMax = Math.max(bids.at(-1)?.cum ?? 0, asks.at(-1)?.cum ?? 0, 1) * 1.08;
    const fx = (p: number) => (p - lo) / (hi - lo);
    const y = (v: number) => H - (v / yMax) * H;
    return { mid, lo, hi, bids, asks, yMax, fx, y };
  }, [book, pct]);

  const onMove = useCallback((clientX: number) => {
    const el = plotRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const f = (clientX - rect.left - AXIS_W) / (rect.width - AXIS_W);
    setHoverFrac(f < 0 || f > 1 ? null : f);
  }, []);

  const stats = useMemo(() => {
    if (book.mid == null) return null;
    const mid = book.mid;
    const rows = [0.005, 0.01, 0.02].map((p) => ({
      p,
      bid: notionalWithin(book.bids, mid, p, "bid"),
      ask: notionalWithin(book.asks, mid, p, "ask"),
    }));
    const one = rows[1];
    const imbalance = one.bid + one.ask > 0 ? (one.bid / (one.bid + one.ask)) * 100 : null;
    return { rows, imbalance };
  }, [book]);

  const atFrac = (f: number) => `calc(${AXIS_W}px + (100% - ${AXIS_W}px) * ${f})`;

  // Steps drawn outward from mid: flat to the touch, then up at each level.
  const stepPath = (pts: { price: number; cum: number }[], side: "bid" | "ask") => {
    if (!g || pts.length === 0) return "";
    const edge = side === "bid" ? 0 : VB;
    let d = `M${g.fx(g.mid) * VB},${H}`;
    let prevY = H;
    for (const pt of pts) {
      const x = g.fx(pt.price) * VB;
      d += ` L${x.toFixed(1)},${prevY.toFixed(1)} L${x.toFixed(1)},${g.y(pt.cum).toFixed(1)}`;
      prevY = g.y(pt.cum);
    }
    d += ` L${edge},${prevY.toFixed(1)} L${edge},${H} Z`;
    return d;
  };

  const hover = useMemo(() => {
    if (!g || hoverFrac == null) return null;
    const p = g.lo + hoverFrac * (g.hi - g.lo);
    const side = p < g.mid ? "bid" : "ask";
    const pts = side === "bid" ? g.bids : g.asks;
    let cum = 0;
    for (const pt of pts) {
      if (side === "bid" ? pt.price >= p : pt.price <= p) cum = pt.cum;
      else break;
    }
    return { p, side, cum, dist: ((p - g.mid) / g.mid) * 100 };
  }, [g, hoverFrac]);

  return (
    <div>
      <SectionHeader
        title="Order book depth"
        note={book.spread != null ? `spread ${(book.spread * 10_000).toFixed(2)} bps` : undefined}
      >
        <span
          aria-hidden="true"
          className={cn("size-[5px] rounded-full", book.live ? "bg-brand live-halo" : "bg-ink-5")}
        />
        <Segmented
          options={BANDS.map((b) => ({ key: b.key, label: b.label }))}
          value={band}
          onChange={setBand}
        />
      </SectionHeader>

      {!g ? (
        <div className="flex items-center justify-center rounded-[3px] bg-panel text-[11.5px] text-ink-3" style={{ height: H + X_H }}>
          {book.live ? "The book is empty on one side." : "Connecting to the live book…"}
        </div>
      ) : (
        <>
          <div
            ref={plotRef}
            className="relative"
            style={{ height: H }}
            onMouseMove={(e) => onMove(e.clientX)}
            onMouseLeave={() => setHoverFrac(null)}
            onTouchStart={(e) => onMove(e.touches[0].clientX)}
            onTouchMove={(e) => onMove(e.touches[0].clientX)}
            onTouchEnd={() => setHoverFrac(null)}
          >
            {[0, 1, 2, 3].map((i) => {
              const v = (g.yMax * (3 - i)) / 3;
              return (
                <div key={i}>
                  <div aria-hidden="true" className={cn("absolute right-0 h-px", i === 3 ? "bg-edge" : "bg-hair")} style={{ left: AXIS_W, top: g.y(v) }} />
                  <div className="figure absolute text-right text-[9.5px] text-ink-4" style={{ left: 0, width: AXIS_W - 10, top: g.y(v), transform: "translateY(-50%)" }}>
                    {usdCompact(v, 1)}
                  </div>
                </div>
              );
            })}

            <svg
              viewBox={`0 0 ${VB} ${H}`}
              preserveAspectRatio="none"
              className="absolute top-0 h-full"
              style={{ left: AXIS_W, width: `calc(100% - ${AXIS_W}px)` }}
              role="img"
              aria-label="Cumulative order book depth"
            >
              <path d={stepPath(g.bids, "bid")} fill="var(--color-up)" fillOpacity="0.16" stroke="var(--color-up)" strokeWidth="1.3" vectorEffect="non-scaling-stroke" />
              <path d={stepPath(g.asks, "ask")} fill="var(--color-down)" fillOpacity="0.16" stroke="var(--color-down)" strokeWidth="1.3" vectorEffect="non-scaling-stroke" />
            </svg>

            {/* mid rule */}
            <div aria-hidden="true" className="pointer-events-none absolute top-0 w-px bg-ink-4" style={{ left: atFrac(0.5), height: H, opacity: 0.6 }} />

            {hover && (
              <>
                <div aria-hidden="true" className="pointer-events-none absolute top-0 w-px bg-ink-3" style={{ left: atFrac(hoverFrac!), height: H }} />
                <div
                  role="status"
                  className="pointer-events-none absolute top-2 z-10 rounded-[4px] border border-edge bg-raised px-2.5 py-1.5 whitespace-nowrap shadow-lg"
                  style={{
                    left: atFrac(hoverFrac!),
                    transform: hoverFrac! < 0.2 ? "translateX(-4px)" : hoverFrac! > 0.8 ? "translateX(calc(-100% + 4px))" : "translateX(-50%)",
                  }}
                >
                  <div className="figure text-[9.5px] tracking-[0.06em] text-ink-3 uppercase">
                    {hover.side === "bid" ? "bids down to" : "asks up to"} {price(hover.p)}
                  </div>
                  <Figure className={cn("text-[13px] font-medium", hover.side === "bid" ? "text-up" : "text-down")}>
                    {usdCompact(hover.cum, 2)}
                  </Figure>
                  <div className="figure text-[9.5px] text-ink-4">
                    {hover.dist >= 0 ? "+" : "−"}
                    {Math.abs(hover.dist).toFixed(2)}% from mid
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="figure relative text-[9.5px]" style={{ height: X_H }} aria-hidden="true">
            {[0, 0.25, 0.5, 0.75, 1].map((f, k, arr) => (
              <span
                key={f}
                className={cn("absolute top-2 whitespace-nowrap", f === 0.5 ? "text-ink-2" : "text-ink-4")}
                style={{ left: atFrac(f), transform: k === 0 ? "none" : k === arr.length - 1 ? "translateX(-100%)" : "translateX(-50%)" }}
              >
                {price(g.lo + f * (g.hi - g.lo))}
              </span>
            ))}
          </div>
        </>
      )}

      {/* liquidity within bands */}
      {stats && (
        <div className="mt-3">
          <div className="label grid grid-cols-[60px_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 border-b border-edge pb-2">
            <span>Within</span>
            <span className="text-right">Bids</span>
            <span className="text-right">Asks</span>
          </div>
          {stats.rows.map((r) => (
            <div key={r.p} className="grid grid-cols-[60px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-3 border-b border-hair py-1.5">
              <Figure className="text-[11px] text-ink-3">±{(r.p * 100).toFixed(1)}%</Figure>
              <Figure className="text-right text-[11.5px] text-up">{usdCompact(r.bid, 2)}</Figure>
              <Figure className="text-right text-[11.5px] text-down">{usdCompact(r.ask, 2)}</Figure>
            </div>
          ))}
          {stats.imbalance != null && (
            <div className="mt-2.5 flex items-center gap-3">
              <Label>Imbalance ±1%</Label>
              <div className="flex h-[5px] grow gap-[1.5px]" aria-hidden="true">
                <div className="rounded-l-[2px] bg-up" style={{ width: `${stats.imbalance}%` }} />
                <div className="rounded-r-[2px] bg-down" style={{ width: `${100 - stats.imbalance}%` }} />
              </div>
              <Figure className="text-[10.5px] text-ink-2">{stats.imbalance.toFixed(0)}% bid</Figure>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
