"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { num, usdCompact } from "@/lib/format";
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
  | { as: "usdPrice"; dp?: number }
  | { as: "count" }
  | { as: "thousands"; suffix?: string };

function fmt(v: number, f: ChartFormat): string {
  switch (f.as) {
    case "usdCompact":
      return usdCompact(v, f.dp ?? 2);
    case "usdPrice":
      return `$${v.toFixed(f.dp ?? 2)}`;
    case "count":
      return num(Math.round(v));
    case "thousands":
      return `${(v / 1000).toFixed(0)}${f.suffix ?? "K"}`;
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
  zeroBased: boolean,
  pad = 0.08,
): Scale {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  let min = zeroBased ? 0 : lo - (hi - lo) * pad;
  let max = hi + (hi - lo) * pad;
  if (min === max) {
    min = zeroBased ? 0 : min * 0.95;
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
  const s = makeScale(points, height - 3, false, 0.12);
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

interface SeriesProps {
  points: MetricPoint[];
  height?: number;
  /** Bars for flow (volume); area for a level (open interest). */
  variant?: "bar" | "area";
  /** Volume starts at zero. A level series may not — and then says so. */
  zeroBased?: boolean;
  tone?: "brand" | "info";
  /** Dashed reference line at the series mean. */
  showMean?: boolean;
  /** How to render axis ticks and the tooltip value. */
  format: ChartFormat;
  /** x-axis labels, evenly spaced. Also the tooltip's heading. */
  xLabels?: string[];
  /** What the value represents, shown under the tooltip figure. */
  valueLabel?: string;
  className?: string;
}

const AXIS_W = 52;
const X_LABEL_H = 22;

export function SeriesChart({
  points,
  height = 172,
  variant = "area",
  zeroBased = variant === "bar",
  tone = "brand",
  showMean = false,
  format,
  xLabels,
  valueLabel,
  className,
}: SeriesProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const onMove = useCallback(
    (clientX: number) => {
      const el = plotRef.current;
      if (!el || points.length === 0) return;
      const rect = el.getBoundingClientRect();
      const inner = rect.width - AXIS_W;
      if (inner <= 0) return;
      const frac = (clientX - rect.left - AXIS_W) / inner;
      if (frac < -0.02 || frac > 1.02) {
        setHover(null);
        return;
      }
      const i =
        variant === "bar"
          ? Math.floor(frac * points.length)
          : Math.round(frac * (points.length - 1));
      setHover(Math.max(0, Math.min(points.length - 1, i)));
    },
    [points.length, variant],
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

  const plotH = height - X_LABEL_H;
  const VB = 1000; // plot viewBox width; stretches to the container
  const values = points.map((p) => p.v);
  const s = makeScale(values, plotH, zeroBased);

  const stroke = tone === "brand" ? "var(--color-brand)" : "var(--color-info)";
  const fillId = `grad-${tone}-${variant}`;

  const ticks = [0, 1, 2, 3].map((i) => s.min + ((s.max - s.min) * (3 - i)) / 3);

  const maxIdx = values.indexOf(Math.max(...values));
  const minIdx = values.indexOf(Math.min(...values));
  const meanV = values.reduce((a, b) => a + b, 0) / values.length;

  // Horizontal placement as a fraction of the plot, so HTML overlays land in
  // the same place the stretched SVG puts their marks.
  const barSlot = 1 / points.length;
  const centreFrac = (i: number) =>
    variant === "bar" ? (i + 0.5) * barSlot : i / (points.length - 1);

  const step = VB / (variant === "bar" ? points.length : points.length - 1);
  const x = (i: number) => i * step;

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
    `calc(${AXIS_W}px + (100% - ${AXIS_W}px) * ${f})`;

  const hoverPoint = hover != null ? points[hover] : null;
  const hoverFrac = hover != null ? centreFrac(hover) : 0;
  const dateLabel = (p: MetricPoint, i: number) =>
    xLabels?.[i] ??
    new Date(p.t).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  return (
    <div className={className}>
      <div
        ref={plotRef}
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
              i === 3 ? "bg-edge" : "bg-hair",
            )}
            style={{ left: AXIS_W, top: s.y(t) }}
          />
        ))}

        {/* y-axis labels — HTML, so they are never squashed */}
        {ticks.map((t, i) => (
          <div
            key={`t${i}`}
            className="figure absolute text-[9.5px] text-ink-4"
            style={{
              left: 0,
              width: AXIS_W - 10,
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
              left: AXIS_W,
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
          style={{ left: AXIS_W, width: `calc(100% - ${AXIS_W}px)` }}
          role="img"
        >
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.17" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>

          {variant === "bar" ? (
            points.map((p, i) => {
              const barW = step * 0.64;
              const y = s.y(p.v);
              const emphasis = i === points.length - 1 || i === maxIdx;
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
            })
          ) : (
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
              left: `calc(${atFrac(centreFrac(points.length - 1))} - 3.5px)`,
              top: s.y(values[values.length - 1]) - 3.5,
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
        {variant === "bar" && hover == null && (
          <>
            <Annotation
              frac={centreFrac(maxIdx)}
              top={s.y(values[maxIdx]) - 15}
              className="text-ink"
            >
              {fmt(values[maxIdx], format)}
            </Annotation>
            {minIdx !== maxIdx && (
              <Annotation
                frac={centreFrac(minIdx)}
                top={s.y(values[minIdx]) - 15}
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
            className="pointer-events-none absolute z-10 rounded-[4px] border border-edge bg-raised px-2.5 py-1.5 shadow-lg"
            style={{
              left: atFrac(hoverFrac),
              top: Math.max(2, s.y(hoverPoint.v) - 52),
              transform:
                hoverFrac < 0.16
                  ? "translateX(-4px)"
                  : hoverFrac > 0.84
                    ? "translateX(calc(-100% + 4px))"
                    : "translateX(-50%)",
            }}
          >
            <div className="figure text-[9.5px] tracking-[0.06em] text-ink-3 uppercase">
              {dateLabel(hoverPoint, hover)}
            </div>
            <div className="figure text-[13px] font-medium text-ink">
              {fmt(hoverPoint.v, format)}
            </div>
            {valueLabel && (
              <div className="figure text-[9.5px] text-ink-4">{valueLabel}</div>
            )}
          </div>
        )}
      </div>

      {xLabels && xLabels.length > 0 && (
        <div
          className="figure flex justify-between text-[9.5px]"
          style={{ paddingLeft: AXIS_W, height: X_LABEL_H, paddingTop: 8 }}
        >
          {xLabels.map((l, i) => (
            <span
              key={i}
              className={hover === i ? "text-ink" : "text-ink-4"}
            >
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Annotation({
  frac,
  top,
  children,
  className,
}: {
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
        left: `calc(${AXIS_W}px + (100% - ${AXIS_W}px) * ${frac})`,
        top,
      }}
    >
      {children}
    </div>
  );
}
