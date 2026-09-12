"use client";

import { useCallback, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { dateTick, dayLabel, num, ratePct, usdCompact } from "@/lib/format";
import type { MetricPoint } from "@/lib/lighter/types";

/* ══════════════════════════════════════════════════════════════
   Rules held throughout:
     · one scale, labelled — every axis tick names a real value
     · never a second y-axis; two measures become two charts
     · a non-zero baseline is allowed but must SAY it is non-zero
     · thin marks, recessive grid, selective annotation
     · a hover layer by default — reading a chart should not mean
       estimating against a gridline

   The plot stretches to its container via preserveAspectRatio="none",
   which is right for the marks and WRONG for anything with a shape of
   its own. Text, grid rules and point markers are therefore HTML,
   positioned over the plot — inside the SVG they would be squashed
   horizontally by the same transform.
   ══════════════════════════════════════════════════════════════ */

/**
 * How to render a value on the axis and in the tooltip.
 *
 * Deliberately data, not a function: `SeriesChart` is a client component and
 * server components cannot hand functions across the boundary.
 */
export type ChartFormat =
  | { as: "usdCompact"; dp?: number }
  | { as: "usdSigned"; dp?: number }
  | { as: "usdPrice"; dp?: number }
  | { as: "count" }
  | { as: "compact" }
  | { as: "thousands"; suffix?: string }
  | { as: "ratePct"; dp?: number };

export function fmt(v: number, f: ChartFormat): string {
  switch (f.as) {
    case "usdCompact":
      return usdCompact(v, f.dp ?? 2);
    case "usdSigned":
      if (v === 0) return "$0";
      return `${v > 0 ? "+" : "−"}${usdCompact(Math.abs(v), f.dp ?? 1)}`;
    case "usdPrice":
      return `$${v.toFixed(f.dp ?? 2)}`;
    case "count":
      return num(Math.round(v));
    case "compact": {
      const a = Math.abs(v);
      if (a >= 1e6) return `${(v / 1e6).toFixed(a >= 1e7 ? 1 : 2)}M`;
      if (a >= 1e3) return `${(v / 1e3).toFixed(a >= 1e4 ? 0 : 1)}K`;
      return num(Math.round(v));
    }
    case "thousands":
      return `${(v / 1000).toFixed(0)}${f.suffix ?? "K"}`;
    case "ratePct":
      return ratePct(v, f.dp ?? 4);
  }
}

interface Scale {
  min: number;
  max: number;
  y: (v: number) => number;
}

function makeScale(
  values: number[],
  height: number,
  baseline: "zero" | "fit" | "diverging",
  pad = 0.08,
): Scale {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  let min: number;
  let max: number;
  if (baseline === "diverging") {
    const span = Math.max(Math.abs(Math.min(0, lo)), Math.max(0, hi)) || 1;
    min = Math.min(0, lo) - span * pad;
    max = Math.max(0, hi) + span * pad;
  } else {
    // Padding must not invent negative values for a series that has none —
    // a count axis reading "−348" is wrong, not merely untidy.
    min =
      baseline === "zero"
        ? 0
        : lo >= 0
          ? Math.max(0, lo - (hi - lo) * pad)
          : lo - (hi - lo) * pad;
    max = hi + (hi - lo) * pad;
  }
  if (min === max) {
    min = baseline === "zero" ? 0 : min * 0.95;
    max = max * 1.05 || 1;
  }
  return {
    min,
    max,
    y: (v) => height - ((v - min) / (max - min)) * height,
  };
}

/** Tiny inline trend. No axes — it lives inside a table row. */
export function Sparkline({
  points,
  width = 56,
  height = 18,
  dir,
  className,
}: {
  points: number[];
  width?: number;
  height?: number;
  dir?: "up" | "down" | "flat";
  className?: string;
}) {
  if (points.length < 2) {
    return (
      <span className={cn("inline-block", className)} style={{ width, height }} />
    );
  }
  const s = makeScale(points, height - 3, "fit", 0.12);
  const step = width / (points.length - 1);
  const d = points
    .map(
      (v, i) =>
        `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(s.y(v) + 1.5).toFixed(1)}`,
    )
    .join(" ");
  const stroke =
    dir === "up"
      ? "var(--color-up)"
      : dir === "down"
        ? "var(--color-down)"
        : "var(--color-ink-4)";
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A secondary figure shown in the tooltip beside the plotted value. */
export interface ChartDetail {
  label: string;
  /** Aligned index-for-index with `points`. */
  values: number[];
  format?: ChartFormat;
  tone?: "up" | "down";
}

interface SeriesProps {
  points: MetricPoint[];
  height?: number;
  /**
   * Bars for a flow (volume), area for a level (open interest), diverging
   * bars for a signed flow (net deposits) — positive up, negative down.
   */
  variant?: "bar" | "area" | "diverging";
  /** Volume starts at zero. A level series may not — and then says so. */
  zeroBased?: boolean;
  tone?: "brand" | "info";
  /** Dashed reference line at the series mean. */
  showMean?: boolean;
  /** How to render axis ticks and the tooltip value. */
  format: ChartFormat;
  /** Optional per-point labels; the tooltip heading. Dates are derived otherwise. */
  xLabels?: string[];
  /** Shorter per-point text for axis ticks, when headings are too long to repeat. */
  tickLabels?: string[];
  /** What the value represents, shown under the tooltip figure. */
  valueLabel?: string;
  /** Extra rows for the tooltip. */
  details?: ChartDetail[];
  className?: string;
}

const AXIS_MIN = 52;
const X_LABEL_H = 22;
const MAX_TICKS = 6;

/** Evenly spaced indices for x-axis labels — every point when there are few. */
function tickIndices(n: number): number[] {
  if (n <= MAX_TICKS + 2) return Array.from({ length: n }, (_, i) => i);
  const out: number[] = [];
  for (let k = 0; k < MAX_TICKS; k++) {
    out.push(Math.round((k * (n - 1)) / (MAX_TICKS - 1)));
  }
  return out;
}

export function SeriesChart({
  points,
  height = 172,
  variant = "area",
  zeroBased = variant === "bar",
  tone = "brand",
  showMean = false,
  format,
  xLabels,
  tickLabels,
  valueLabel,
  details,
  className,
}: SeriesProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  // Two charts with the same tone and variant used to share a gradient id —
  // invalid HTML, and the second chart's fill could resolve to the first's.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const barLike = variant !== "area";

  const onMove = useCallback(
    (clientX: number) => {
      const el = plotRef.current;
      if (!el || points.length === 0) return;
      const rect = el.getBoundingClientRect();
      const axis = Number(el.dataset.axis) || AXIS_MIN;
      const inner = rect.width - axis;
      if (inner <= 0) return;
      const frac = (clientX - rect.left - axis) / inner;
      if (frac < -0.02 || frac > 1.02) {
        setHover(null);
        return;
      }
      const i = barLike
        ? Math.floor(frac * points.length)
        : Math.round(frac * (points.length - 1));
      setHover(Math.max(0, Math.min(points.length - 1, i)));
    },
    [points.length, barLike],
  );

  if (points.length < 2) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-[12px] text-ink-4",
          className,
        )}
        style={{ height }}
      >
        Not enough data
      </div>
    );
  }

  const n = points.length;
  const plotH = height - X_LABEL_H;
  const VB = 1000; // plot viewBox width; stretches to the container
  const values = points.map((p) => p.v);
  const s = makeScale(
    values,
    plotH,
    variant === "diverging" ? "diverging" : zeroBased ? "zero" : "fit",
  );

  const stroke = tone === "brand" ? "var(--color-brand)" : "var(--color-info)";
  const fillId = `grad-${tone}-${uid}`;

  const ticks =
    variant === "diverging" && s.min < 0 && s.max > 0
      ? [s.max, 0, s.min]
      : [0, 1, 2, 3].map((i) => s.min + ((s.max - s.min) * (3 - i)) / 3);
  // The axis is as wide as its longest label — rate labels such as
  // "+0.0104%" would otherwise run into the plot.
  const axisW = Math.max(
    AXIS_MIN,
    Math.ceil(Math.max(...ticks.map((t) => fmt(t, format).length)) * 5.9) + 12,
  );
  const baselineTick = variant === "diverging" ? 0 : ticks[ticks.length - 1];

  const maxIdx = values.indexOf(Math.max(...values));
  const minIdx = values.indexOf(Math.min(...values));
  const meanV = values.reduce((a, b) => a + b, 0) / n;

  const spanMs = points[n - 1].t - points[0].t;
  const longSpan = spanMs > 300 * 86_400_000;

  // Horizontal placement as a fraction of the plot, so HTML overlays land in
  // the same place the stretched SVG puts their marks.
  const centreFrac = (i: number) => (barLike ? (i + 0.5) / n : i / (n - 1));
  const step = VB / (barLike ? n : n - 1);
  const x = (i: number) => i * step;
  // Dense histories close the gaps between bars, or they dissolve into lines.
  const barW = step * (n > 120 ? 0.94 : n > 45 ? 0.8 : 0.64);

  const areaPath =
    variant === "area"
      ? points
          .map(
            (p, i) =>
              `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${s.y(p.v).toFixed(1)}`,
          )
          .join(" ")
      : "";

  /** Anchor an overlay at a fraction of the plot's inner width. */
  const atFrac = (f: number) =>
    `calc(${axisW}px + (100% - ${axisW}px) * ${f})`;

  const hoverPoint = hover != null ? points[hover] : null;
  const hoverFrac = hover != null ? centreFrac(hover) : 0;
  const heading = (i: number) => xLabels?.[i] ?? dayLabel(points[i].t, longSpan);
  const tickText = (i: number) =>
    tickLabels?.[i] ?? xLabels?.[i] ?? dateTick(points[i].t, spanMs);
  const xTicks = tickIndices(n);

  const zeroY = s.y(0);

  return (
    <div className={className}>
      <div
        ref={plotRef}
        data-axis={axisW}
        className="relative"
        style={{ height: plotH }}
        onMouseMove={(e) => onMove(e.clientX)}
        onMouseLeave={() => setHover(null)}
        onTouchStart={(e) => onMove(e.touches[0].clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
        onTouchEnd={() => setHover(null)}
      >
        {/* grid — HTML, so rules stay exactly 1px at any width */}
        {ticks.map((t, i) => (
          <div
            key={`g${i}`}
            aria-hidden="true"
            className={cn(
              "absolute right-0 h-px",
              t === baselineTick ? "bg-edge" : "bg-hair",
            )}
            style={{ left: axisW, top: s.y(t) }}
          />
        ))}

        {/* y-axis labels — HTML, so they are never squashed */}
        {ticks.map((t, i) => (
          <div
            key={`t${i}`}
            className="figure absolute text-[9.5px] text-ink-4"
            style={{
              left: 0,
              width: axisW - 10,
              top: s.y(t),
              transform: "translateY(-50%)",
              textAlign: "right",
            }}
          >
            {fmt(t, format)}
          </div>
        ))}

        {showMean && (
          <div
            aria-hidden="true"
            className="absolute right-0 h-px"
            style={{
              left: axisW,
              top: s.y(meanV),
              backgroundImage:
                "repeating-linear-gradient(to right, var(--color-ink-3) 0 3px, transparent 3px 6px)",
            }}
          />
        )}

        {/* the marks themselves — the only thing that should stretch */}
        <svg
          viewBox={`0 0 ${VB} ${plotH}`}
          preserveAspectRatio="none"
          className="absolute top-0 h-full"
          style={{ left: axisW, width: `calc(100% - ${axisW}px)` }}
          role="img"
          aria-label={valueLabel}
        >
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.17" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>

          {variant === "bar" &&
            points.map((p, i) => {
              const y = s.y(p.v);
              const emphasis = i === n - 1 || i === maxIdx;
              const active = hover === i;
              return (
                <rect
                  key={i}
                  x={x(i) + (step - barW) / 2}
                  y={y}
                  width={barW}
                  height={Math.max(1, plotH - y)}
                  fill={active || emphasis ? stroke : "var(--color-up-dim)"}
                  opacity={hover != null && !active ? 0.55 : 1}
                />
              );
            })}

          {variant === "diverging" &&
            points.map((p, i) => {
              const y = s.y(p.v);
              const up = p.v >= 0;
              const active = hover === i;
              return (
                <rect
                  key={i}
                  x={x(i) + (step - barW) / 2}
                  y={up ? y : zeroY}
                  width={barW}
                  height={Math.max(1, Math.abs(zeroY - y))}
                  fill={
                    up
                      ? active
                        ? "var(--color-up)"
                        : "var(--color-up-dim)"
                      : active
                        ? "var(--color-down)"
                        : "var(--color-down-dim)"
                  }
                  opacity={hover != null && !active ? 0.55 : 1}
                />
              );
            })}

          {variant === "area" && (
            <>
              <path
                d={`${areaPath} L${VB},${plotH} L0,${plotH} Z`}
                fill={`url(#${fillId})`}
              />
              <path
                d={areaPath}
                fill="none"
                stroke={stroke}
                strokeWidth="1.9"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}
        </svg>

        {/* crosshair */}
        {hover != null && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 w-px bg-ink-4"
            style={{ left: atFrac(hoverFrac), height: plotH }}
          />
        )}

        {/* endpoint marker — HTML, or the stretch turns it into an ellipse */}
        {variant === "area" && hover == null && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute size-[7px] rounded-full ring-2 ring-surface"
            style={{
              left: `calc(${atFrac(centreFrac(n - 1))} - 3.5px)`,
              top: s.y(values[n - 1]) - 3.5,
              background: stroke,
            }}
          />
        )}

        {/* hovered point on the line */}
        {variant === "area" && hoverPoint && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute size-[9px] rounded-full ring-2 ring-surface"
            style={{
              left: `calc(${atFrac(hoverFrac)} - 4.5px)`,
              top: s.y(hoverPoint.v) - 4.5,
              background: stroke,
            }}
          />
        )}

        {/* annotate the extremes — hidden while hovering, to avoid collisions */}
        {/* dense diverging series: extremes are visible, labels only collide */}
        {barLike && hover == null && !(variant === "diverging" && n > 45) && (
          <>
            <Annotation
              axis={axisW}
              frac={centreFrac(maxIdx)}
              top={s.y(values[maxIdx]) - 15}
              className="text-ink"
            >
              {fmt(values[maxIdx], format)}
            </Annotation>
            {minIdx !== maxIdx && (variant === "bar" || values[minIdx] < 0) && (
              <Annotation
              axis={axisW}
                frac={centreFrac(minIdx)}
                top={
                  variant === "diverging"
                    ? s.y(values[minIdx]) + 3
                    : s.y(values[minIdx]) - 15
                }
                className="text-ink-3"
              >
                {fmt(values[minIdx], format)}
              </Annotation>
            )}
          </>
        )}

        {/* tooltip */}
        {hoverPoint && hover != null && (
          <div
            role="status"
            className="pointer-events-none absolute z-10 rounded-[4px] border border-edge bg-raised px-2.5 py-1.5 whitespace-nowrap shadow-lg"
            style={{
              left: atFrac(hoverFrac),
              top: Math.max(2, Math.min(plotH - 40, s.y(hoverPoint.v) - 52)),
              transform:
                hoverFrac < 0.16
                  ? "translateX(-4px)"
                  : hoverFrac > 0.84
                    ? "translateX(calc(-100% + 4px))"
                    : "translateX(-50%)",
            }}
          >
            <div className="figure text-[9.5px] tracking-[0.06em] text-ink-3 uppercase">
              {heading(hover)}
            </div>
            <div
              className={cn(
                "figure text-[13px] font-medium",
                variant === "diverging"
                  ? hoverPoint.v >= 0
                    ? "text-up"
                    : "text-down"
                  : "text-ink",
              )}
            >
              {fmt(hoverPoint.v, format)}
            </div>
            {valueLabel && (
              <div className="figure text-[9.5px] text-ink-4">{valueLabel}</div>
            )}
            {details && details.length > 0 && (
              <div className="mt-1 flex flex-col gap-0.5 border-t border-hair pt-1">
                {details.map((d) => (
                  <div key={d.label} className="flex justify-between gap-4">
                    <span className="figure text-[9.5px] text-ink-3">
                      {d.label}
                    </span>
                    <span
                      className={cn(
                        "figure text-[10.5px]",
                        d.tone === "up"
                          ? "text-up"
                          : d.tone === "down"
                            ? "text-down"
                            : "text-ink-2",
                      )}
                    >
                      {d.values[hover] != null
                        ? fmt(d.values[hover], d.format ?? format)
                        : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* x-axis — thinned to a handful of dates, placed where their marks sit */}
      <div
        className="figure relative text-[9.5px]"
        style={{ height: X_LABEL_H }}
        aria-hidden="true"
      >
        {xTicks.map((i, k) => {
          const edge = k === 0 ? "first" : k === xTicks.length - 1 ? "last" : null;
          // A line's first and last points sit on the plot edges, so their
          // labels align inward; a bar's sit half a slot in and can centre.
          const transform =
            !barLike && edge === "first"
              ? "none"
              : !barLike && edge === "last"
                ? "translateX(-100%)"
                : "translateX(-50%)";
          return (
            <span
              key={i}
              className={cn(
                "absolute top-2 whitespace-nowrap",
                hover === i ? "text-ink" : "text-ink-4",
              )}
              style={{ left: atFrac(centreFrac(i)), transform }}
            >
              {tickText(i)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Annotation({
  axis,
  frac,
  top,
  children,
  className,
}: {
  axis: number;
  frac: number;
  top: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "figure pointer-events-none absolute -translate-x-1/2 text-[9.5px] whitespace-nowrap",
        className,
      )}
      style={{
        left: `calc(${axis}px + (100% - ${axis}px) * ${frac})`,
        top,
      }}
    >
      {children}
    </div>
  );
}
