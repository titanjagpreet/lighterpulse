"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  TIMEFRAMES,
  fetchCandles,
  type Candle,
  type Timeframe,
} from "@/lib/lighter/market-data";
import { lighterSocket } from "@/lib/lighter/ws";
import { OI_SIDES } from "@/lib/lighter/types";
import { oiPoints, type OiSeries } from "@/lib/oi";
import { Delta, Figure, Segmented } from "./primitives";
import { n, price, usdCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ══════════════════════════════════════════════════════════════
   Price over volume — two panels, one time axis, one y-scale each.

   Deliberately not candlesticks: this is an analytics page, and the
   question it answers is "what happened, and on how much volume",
   not "where do I enter". x is TIME, not bar index, so a market
   that did not trade for an hour shows the gap rather than hiding it.
   Text and markers are HTML over a stretched SVG, as everywhere else.
   ══════════════════════════════════════════════════════════════ */

const AXIS_W = 64;
const PRICE_H = 214;
const VOL_H = 64;
const OI_H = 58;
const GAP = 10;
const VOL_BOTTOM = PRICE_H + GAP + VOL_H;
const OI_TOP = VOL_BOTTOM + GAP;
const TOTAL_H = OI_TOP + OI_H;
const X_H = 22;
const VB = 1000;

/** Refresh cadence per window — roughly one new bar's worth of time. */
const REFRESH_MS: Record<Timeframe, number> = {
  "1d": 60_000,
  "7d": 120_000,
  "30d": 300_000,
  "1y": 900_000,
  all: 900_000,
};

function timeLabel(t: number, tf: Timeframe, long = false): string {
  const d = new Date(t);
  if (tf === "1d" || (long && tf !== "1y" && tf !== "all")) {
    return d.toLocaleString("en-US", {
      month: long ? "short" : undefined,
      day: long ? "numeric" : undefined,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    });
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: tf === "all" || (long && tf === "1y") ? "2-digit" : undefined,
    timeZone: "UTC",
  });
}

export function MarketChart({
  marketId,
  oi = null,
}: {
  marketId: number;
  /** Recorded open-interest history; null until the collector has published. */
  oi?: OiSeries | null;
}) {
  const [tf, setTf] = useState<Timeframe>("7d");
  const [candles, setCandles] = useState<Candle[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const fillId = `mc-fill-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  // The recorded series is republished hourly; the live value closes the gap
  // to now. Sampled into state every 15s rather than on every socket message —
  // the chart has hundreds of marks and need not redraw at the stream's pace.
  const liveRef = useRef<number | null>(null);
  const [liveOi, setLiveOi] = useState<number | null>(null);
  useEffect(() => {
    liveRef.current = null;
    setLiveOi(null);
    const off = lighterSocket().subscribe(`market_stats/${marketId}`, (msg) => {
      const s = msg.market_stats as Record<string, unknown> | undefined;
      if (s?.open_interest == null) return;
      const first = liveRef.current == null;
      // The stream reports one side in USD; the product counts both.
      liveRef.current = n(s.open_interest) * OI_SIDES;
      if (first) setLiveOi(liveRef.current);
    });
    const id = setInterval(() => {
      if (liveRef.current != null) setLiveOi(liveRef.current);
    }, 15_000);
    return () => {
      off();
      clearInterval(id);
    };
  }, [marketId]);

  useEffect(() => {
    let alive = true;
    setCandles(null);
    setFailed(false);
    const load = () =>
      fetchCandles(marketId, tf)
        .then((c) => alive && setCandles(c))
        .catch(() => alive && setFailed(true));
    void load();
    const id = setInterval(load, REFRESH_MS[tf]);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [marketId, tf]);

  const geo = useMemo(() => {
    if (!candles || candles.length < 2) return null;
    const t0 = candles[0].t;
    const step = candles[1].t - candles[0].t || 1;
    const t1 = candles[candles.length - 1].t + step;
    const span = t1 - t0;
    const lo = Math.min(...candles.map((c) => c.l || c.c));
    const hi = Math.max(...candles.map((c) => c.h || c.c));
    const pad = (hi - lo) * 0.08 || hi * 0.01 || 1;
    const pMin = lo - pad;
    const pMax = hi + pad;
    const vMax = Math.max(...candles.map((c) => c.usd), 1);
    const fx = (t: number) => (t - t0) / span; // 0..1
    const py = (p: number) => PRICE_H - ((p - pMin) / (pMax - pMin)) * PRICE_H;
    const vy = (v: number) => VOL_H - (v / vMax) * VOL_H;
    return { t0, t1, step, span, pMin, pMax, vMax, fx, py, vy };
  }, [candles]);

  const onMove = useCallback(
    (clientX: number) => {
      const el = plotRef.current;
      if (!el || !candles || !geo) return;
      const rect = el.getBoundingClientRect();
      const frac = (clientX - rect.left - AXIS_W) / (rect.width - AXIS_W);
      if (frac < 0 || frac > 1) return setHover(null);
      const t = geo.t0 + frac * geo.span;
      // Nearest bar by time — bars can be missing in thin markets.
      let best = 0;
      for (let i = 1; i < candles.length; i++) {
        if (Math.abs(candles[i].t + geo.step / 2 - t) < Math.abs(candles[best].t + geo.step / 2 - t)) best = i;
      }
      setHover(best);
    },
    [candles, geo],
  );

  const summary = useMemo(() => {
    if (!candles || candles.length < 2) return null;
    const first = candles[0].o || candles[0].c;
    const last = candles[candles.length - 1].c;
    return {
      last,
      change: first ? ((last - first) / first) * 100 : null,
      high: Math.max(...candles.map((c) => c.h || c.c)),
      low: Math.min(...candles.map((c) => c.l || c.c)),
      volume: candles.reduce((s, c) => s + c.usd, 0),
    };
  }, [candles]);

  // Open interest for the visible window, at the finest resolution recorded for it.
  const oiLine = useMemo(() => {
    if (!geo || !oi) return null;
    const part = tf === "1d" ? oi.m15 : tf === "7d" || tf === "30d" ? oi.h1 : oi.d1;
    const pts = oiPoints(part, geo.t0, geo.t1);
    if (liveOi != null && liveOi > 0) pts.push({ t: Math.min(Date.now(), geo.t1), v: liveOi });
    if (pts.length < 2) return { pts, lo: 0, hi: 0, step: part.step };
    const values = pts.map((p) => p.v);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const pad = (hi - lo) * 0.1 || hi * 0.01 || 1;
    return { pts, lo: lo - pad, hi: hi + pad, step: part.step };
  }, [oi, geo, tf, liveOi]);

  const hasOi = !!oiLine && oiLine.pts.length >= 2;
  const oiY = (v: number) =>
    oiLine && oiLine.hi > oiLine.lo
      ? OI_TOP + OI_H - ((v - oiLine.lo) / (oiLine.hi - oiLine.lo)) * OI_H
      : OI_TOP + OI_H / 2;
  const oiPath =
    hasOi && geo
      ? oiLine!.pts
          .map((p, i, all) => {
            // A missed snapshot is a gap, not a straight line across it — except
            // the live point, which always joins the last recorded one.
            const isLive = liveOi != null && i === all.length - 1;
            const broken = i > 0 && !isLive && p.t - all[i - 1].t > oiLine!.step * 2.5;
            return `${i === 0 || broken ? "M" : "L"}${(geo.fx(p.t) * VB).toFixed(1)},${oiY(p.v).toFixed(1)}`;
          })
          .join(" ")
      : "";
  const nearestOi = (t: number): number | null => {
    if (!hasOi || !geo) return null;
    let best: { t: number; v: number } | null = null;
    let gap = Infinity;
    for (const p of oiLine!.pts) {
      const d = Math.abs(p.t - t);
      if (d < gap) {
        gap = d;
        best = p;
      }
    }
    return best && gap <= Math.max(oiLine!.step, geo.step) * 1.5 ? best.v : null;
  };
  const oiChange =
    hasOi && oiLine!.pts[0].v > 0
      ? ((oiLine!.pts[oiLine!.pts.length - 1].v - oiLine!.pts[0].v) / oiLine!.pts[0].v) * 100
      : null;

  const atFrac = (f: number) => `calc(${AXIS_W}px + (100% - ${AXIS_W}px) * ${f})`;
  const up = (summary?.change ?? 0) >= 0;
  const stroke = up ? "var(--color-up)" : "var(--color-down)";
  const total = TOTAL_H;

  return (
    <div>
      {/* header */}
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <h2 className="text-[13px] font-semibold tracking-[-0.005em]">Price, volume &amp; open interest</h2>
        {summary && (
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="flex items-baseline gap-1.5">
              <span className="text-[11px] text-ink-3">change</span>
              <Delta value={summary.change} className="text-[12px]" />
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className="text-[11px] text-ink-3">range</span>
              <Figure className="text-[11.5px] text-ink-2">
                {price(summary.low)} – {price(summary.high)}
              </Figure>
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className="text-[11px] text-ink-3">volume</span>
              <Figure className="text-[11.5px] text-ink-2">{usdCompact(summary.volume, 2)}</Figure>
            </span>
            {oiChange != null && (
              <span className="flex items-baseline gap-1.5">
                <span className="text-[11px] text-ink-3">open interest</span>
                <Delta value={oiChange} className="text-[12px]" />
              </span>
            )}
          </div>
        )}
        <div className="grow" />
        <Segmented
          options={TIMEFRAMES.map((x) => ({ key: x.key, label: x.label }))}
          value={tf}
          onChange={setTf}
        />
      </div>

      {failed ? (
        <p className="flex items-center justify-center text-[12px] text-ink-3" style={{ height: total + X_H }}>
          Price history could not be loaded from Lighter.
        </p>
      ) : !candles || !geo ? (
        <div className="animate-pulse rounded-[3px] bg-panel" style={{ height: total + X_H }} aria-label="Loading price history" />
      ) : (
        <>
          <div
            ref={plotRef}
            className="relative"
            style={{ height: total }}
            onMouseMove={(e) => onMove(e.clientX)}
            onMouseLeave={() => setHover(null)}
            onTouchStart={(e) => onMove(e.touches[0].clientX)}
            onTouchMove={(e) => onMove(e.touches[0].clientX)}
            onTouchEnd={() => setHover(null)}
          >
            {/* price grid + labels */}
            {[0, 1, 2, 3].map((i) => {
              const p = geo.pMin + ((geo.pMax - geo.pMin) * (3 - i)) / 3;
              return (
                <div key={i}>
                  <div
                    aria-hidden="true"
                    className={cn("absolute right-0 h-px", i === 3 ? "bg-edge" : "bg-hair")}
                    style={{ left: AXIS_W, top: geo.py(p) }}
                  />
                  <div
                    className="figure absolute text-right text-[9.5px] text-ink-4"
                    style={{ left: 0, width: AXIS_W - 10, top: geo.py(p), transform: "translateY(-50%)" }}
                  >
                    {price(p)}
                  </div>
                </div>
              );
            })}

            {/* volume baseline + max label */}
            <div aria-hidden="true" className="absolute right-0 h-px bg-edge" style={{ left: AXIS_W, top: VOL_BOTTOM }} />
            <div
              className="figure absolute text-right text-[9.5px] text-ink-4"
              style={{ left: 0, width: AXIS_W - 10, top: PRICE_H + GAP, transform: "translateY(-2px)" }}
            >
              {usdCompact(geo.vMax, 1)}
            </div>

            {/* open interest — its own scale, never a second axis on the price */}
            <div aria-hidden="true" className="absolute right-0 h-px bg-edge" style={{ left: AXIS_W, top: TOTAL_H }} />
            {hasOi ? (
              <>
                <div
                  className="figure absolute text-right text-[9.5px] text-ink-4"
                  style={{ left: 0, width: AXIS_W - 10, top: OI_TOP, transform: "translateY(-2px)" }}
                >
                  {usdCompact(oiLine!.hi, 1)}
                </div>
                <div
                  className="figure absolute text-right text-[9.5px] text-ink-4"
                  style={{ left: 0, width: AXIS_W - 10, top: TOTAL_H, transform: "translateY(-100%)" }}
                >
                  {usdCompact(oiLine!.lo, 1)}
                </div>
                <div className="label pointer-events-none absolute" style={{ left: AXIS_W + 6, top: OI_TOP }}>
                  Open interest
                </div>
              </>
            ) : (
              <div
                className="figure absolute flex items-center text-[10.5px] text-ink-4"
                style={{ left: AXIS_W + 8, right: 0, top: OI_TOP, height: OI_H }}
              >
                {oi?.since
                  ? `Open interest recorded since ${new Date(oi.since).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} — not enough history for this range yet`
                  : "Open interest history is being recorded — it fills in here as it builds up"}
              </div>
            )}

            <svg
              viewBox={`0 0 ${VB} ${total}`}
              preserveAspectRatio="none"
              className="absolute top-0 h-full"
              style={{ left: AXIS_W, width: `calc(100% - ${AXIS_W}px)` }}
              role="img"
              aria-label="Price and volume history"
            >
              <defs>
                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity="0.14" />
                  <stop offset="100%" stopColor={stroke} stopOpacity="0" />
                </linearGradient>
              </defs>
              {(() => {
                const pts = candles.map((c) => [geo.fx(c.t + geo.step / 2) * VB, geo.py(c.c)] as const);
                const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
                return (
                  <>
                    <path d={`${line} L${pts[pts.length - 1][0]},${PRICE_H} L${pts[0][0]},${PRICE_H} Z`} fill={`url(#${fillId})`} />
                    <path d={line} fill="none" stroke={stroke} strokeWidth="1.7" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                  </>
                );
              })()}
              {candles.map((c, i) => {
                const w = (geo.step / geo.span) * VB * 0.72;
                const x = geo.fx(c.t) * VB + ((geo.step / geo.span) * VB - w) / 2;
                const y = geo.vy(c.usd);
                const rising = c.c >= (c.o || c.c);
                const active = hover === i;
                return (
                  <rect
                    key={c.t}
                    x={x}
                    y={PRICE_H + GAP + y}
                    width={Math.max(w, 0.5)}
                    height={Math.max(0.5, VOL_H - y)}
                    fill={active ? "var(--color-ink-2)" : rising ? "var(--color-up-dim)" : "var(--color-down-dim)"}
                    opacity={hover != null && !active ? 0.6 : 1}
                  />
                );
              })}
              {hasOi && (
                <path
                  d={oiPath}
                  fill="none"
                  stroke="var(--color-info)"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>

            {/* endpoint + hover marks */}
            {hover == null ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute size-[7px] rounded-full ring-2 ring-surface"
                style={{
                  left: `calc(${atFrac(geo.fx(candles[candles.length - 1].t + geo.step / 2))} - 3.5px)`,
                  top: geo.py(candles[candles.length - 1].c) - 3.5,
                  background: stroke,
                }}
              />
            ) : (
              (() => {
                const c = candles[hover];
                const f = geo.fx(c.t + geo.step / 2);
                const prev = hover > 0 ? candles[hover - 1].c : c.o;
                const chg = prev ? ((c.c - prev) / prev) * 100 : null;
                const oiHere = nearestOi(c.t + geo.step / 2);
                return (
                  <>
                    <div aria-hidden="true" className="pointer-events-none absolute top-0 w-px bg-ink-4" style={{ left: atFrac(f), height: total }} />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute size-[9px] rounded-full ring-2 ring-surface"
                      style={{ left: `calc(${atFrac(f)} - 4.5px)`, top: geo.py(c.c) - 4.5, background: stroke }}
                    />
                    <div
                      role="status"
                      className="pointer-events-none absolute z-10 rounded-[4px] border border-edge bg-raised px-2.5 py-1.5 whitespace-nowrap shadow-lg"
                      style={{
                        left: atFrac(f),
                        top: Math.max(2, Math.min(PRICE_H - 96, geo.py(c.c) - 104)),
                        transform: f < 0.18 ? "translateX(-4px)" : f > 0.82 ? "translateX(calc(-100% + 4px))" : "translateX(-50%)",
                      }}
                    >
                      <div className="figure text-[9.5px] tracking-[0.06em] text-ink-3 uppercase">
                        {timeLabel(c.t, tf, true)} UTC
                      </div>
                      <div className="flex items-baseline gap-2">
                        <Figure className="text-[13px] font-medium">{price(c.c)}</Figure>
                        <Delta value={chg} glyph={false} className="text-[10.5px]" />
                      </div>
                      <div className="figure mt-1 grid grid-cols-[auto_auto] gap-x-3 border-t border-hair pt-1 text-[10px]">
                        <span className="text-ink-3">open</span><span className="text-right text-ink-2">{price(c.o)}</span>
                        <span className="text-ink-3">high</span><span className="text-right text-ink-2">{price(c.h)}</span>
                        <span className="text-ink-3">low</span><span className="text-right text-ink-2">{price(c.l)}</span>
                        <span className="text-ink-3">volume</span><span className="text-right text-ink-2">{usdCompact(c.usd, 2)}</span>
                        {oiHere != null && (
                          <>
                            <span className="text-ink-3">open int.</span>
                            <span className="text-right text-ink-2">{usdCompact(oiHere, 2)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()
            )}
          </div>

          {/* shared time axis */}
          <div className="figure relative text-[9.5px]" style={{ height: X_H }} aria-hidden="true">
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((f, k, arr) => (
              <span
                key={f}
                className="absolute top-2 whitespace-nowrap text-ink-4"
                style={{
                  left: atFrac(f),
                  transform: k === 0 ? "none" : k === arr.length - 1 ? "translateX(-100%)" : "translateX(-50%)",
                }}
              >
                {timeLabel(geo.t0 + f * geo.span, tf)}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
