import { cn } from "@/lib/utils";
import { dirOf, pct, type Dir } from "@/lib/format";

/* ══════════════════════════════════════════════════════════════
   The shared vocabulary. Every screen composes from these, so a
   change here lands everywhere — which is what stops later pages
   drifting away from the system.
   ══════════════════════════════════════════════════════════════ */

/** Uppercase micro-label. The terminal's connective tissue. */
export function Label({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("label", className)}>{children}</div>;
}

/** Any number. Tabular, so columns align on the decimal. */
export function Figure({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span className={cn("figure", className)} title={title}>
      {children}
    </span>
  );
}

/** The measure — a fine ruler scale. Sits under hero figures only. */
export function Measure({
  width,
  className,
}: {
  width?: number | string;
  className?: string;
}) {
  return (
    <div
      className={cn("measure h-[7px]", className)}
      style={{ width }}
      aria-hidden="true"
    />
  );
}

/** Directional value with a glyph, so colour is never doing the work alone. */
export function Delta({
  value,
  decimals = 2,
  className,
  glyph = true,
}: {
  value: number | null | undefined;
  decimals?: number;
  className?: string;
  glyph?: boolean;
}) {
  const d = dirOf(value);
  if (value == null || !Number.isFinite(value)) {
    return <Figure className={cn("text-ink-4", className)}>—</Figure>;
  }
  return (
    <Figure
      className={cn(
        d === "up" ? "text-up" : d === "down" ? "text-down" : "text-ink-4",
        className,
      )}
    >
      {glyph && d !== "flat" ? (d === "up" ? "▲ " : "▼ ") : ""}
      {glyph && d !== "flat"
        ? `${Math.abs(value).toFixed(decimals)}%`
        : pct(value, decimals)}
    </Figure>
  );
}

/** Small bordered tag. Classification and state, never emphasis. */
export function Chip({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "up" | "down" | "warn" | "info" | "brand";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "text-ink-3 border-edge",
    up: "text-up border-up-deep",
    down: "text-down border-down-deep",
    warn: "text-warn border-warn-dim",
    info: "text-info border-info-dim",
    brand: "text-brand border-up-deep",
  };
  return (
    <span
      className={cn(
        "figure inline-flex items-center rounded-[3px] border px-1.5 py-px text-[9px] tracking-[0.07em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Live indicator. Haloes on a slow cycle. */
export function LiveDot({
  tone = "brand",
  className,
}: {
  tone?: "brand" | "down";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-[5px] shrink-0 rounded-full",
        tone === "brand" ? "bg-brand live-halo" : "bg-down",
        className,
      )}
    />
  );
}

/**
 * A metric in the hero band. `scale` drives the whole hierarchy:
 * one primary at 42px, secondaries at 20px. Never six equal boxes.
 */
export function MetricCell({
  label,
  value,
  sub,
  delta,
  scale = "sm",
  tone,
  chip,
  children,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  delta?: number | null;
  scale?: "hero" | "lg" | "sm";
  tone?: "up" | "down" | "warn" | "default";
  chip?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const sizes = {
    hero: "text-[42px] leading-[0.92] tracking-[-0.03em] font-medium",
    lg: "text-[28px] leading-none tracking-[-0.028em] font-medium",
    sm: "text-[21px] leading-none tracking-[-0.022em] font-medium",
  };
  const tones = {
    up: "text-up",
    down: "text-down",
    warn: "text-warn",
    default: "text-ink",
  };
  return (
    <div className={cn("px-5 py-4", className)}>
      <div className="mb-2.5 flex items-center gap-2">
        <Label>{label}</Label>
        {chip}
      </div>
      <div className="flex items-end gap-3">
        <Figure className={cn(sizes[scale], tones[tone ?? "default"])}>
          {value}
        </Figure>
        {delta != null && (
          <div className="pb-1">
            <Delta value={delta} className="text-[12px]" />
          </div>
        )}
      </div>
      {sub && (
        <div className="figure mt-1.5 text-[10.5px] text-ink-3">{sub}</div>
      )}
      {children}
    </div>
  );
}

/** Hairline-separated row of metrics. The band under every page header. */
export function StatBand({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid divide-x divide-line border-b border-line bg-panel",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Section heading inside a panel. */
export function SectionHeader({
  title,
  note,
  children,
  className,
}: {
  title: React.ReactNode;
  note?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-baseline gap-3", className)}>
      <h2 className="text-[13px] font-semibold tracking-[-0.005em]">{title}</h2>
      {note && <span className="figure text-[10.5px] text-ink-3">{note}</span>}
      <div className="grow" />
      {children}
    </div>
  );
}

/** Segmented control. Selection is a raised surface, never a coloured pill. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "sm",
  className,
}: {
  options: { key: T; label: React.ReactNode }[];
  value: T;
  onChange?: (key: T) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  // Touch screens get a full-size target; a mouse keeps the dense terminal row.
  const pad =
    size === "md"
      ? "px-3 py-1.5 text-[11.5px] pointer-coarse:py-2.5"
      : "px-2.5 py-[3px] text-[10px] pointer-coarse:px-3 pointer-coarse:py-2";
  return (
    <div className={cn("flex gap-0.5", className)}>
      {options.map((o) => {
        const active = o.key === value;
        const cls = cn(
          "figure ctl rounded-[3px]",
          pad,
          active
            ? "bg-active text-ink"
            : "text-ink-3 hover:text-ink-2 hover:bg-raised",
        );
        return onChange ? (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            aria-pressed={active}
            className={cls}
          >
            {o.label}
          </button>
        ) : (
          <span key={o.key} className={cls}>
            {o.label}
          </span>
        );
      })}
    </div>
  );
}

/** Proportional bar. Magnitude at a glance without reading digits. */
export function MagnitudeBar({
  value,
  max,
  tone = "up",
  width,
  height = 2.5,
  align = "right",
  className,
}: {
  value: number;
  max: number;
  tone?: "up" | "down" | "neutral" | "warn";
  width?: number | string;
  height?: number;
  align?: "left" | "right";
  className?: string;
}) {
  const w = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const fills = {
    up: "bg-up-dim",
    down: "bg-down-dim",
    neutral: "bg-edge",
    warn: "bg-warn-dim",
  };
  return (
    <span
      className={cn("block rounded-[2px] bg-hair", className)}
      style={{ width, height }}
      aria-hidden="true"
    >
      <span
        className={cn("block rounded-[2px]", fills[tone])}
        style={{
          width: `${w}%`,
          height,
          marginLeft: align === "right" ? "auto" : undefined,
        }}
      />
    </span>
  );
}

/**
 * Where a price sits between the day's low and high. A tick on a rail —
 * cheaper to read than two numbers and a subtraction.
 */
export function RangeMarker({
  pos,
  dir = "flat",
  width = 62,
  className,
}: {
  pos: number | null;
  dir?: Dir;
  width?: number;
  className?: string;
}) {
  if (pos == null) {
    return <span className={cn("figure text-[10px] text-ink-5", className)}>—</span>;
  }
  const tone =
    dir === "up" ? "bg-up" : dir === "down" ? "bg-down" : "bg-ink-3";
  return (
    <span
      className={cn("relative block h-[3px] rounded-[2px] bg-hair", className)}
      style={{ width }}
      aria-hidden="true"
    >
      <span
        className={cn("absolute top-[-2.5px] h-[8px] w-[2px] rounded-[1px]", tone)}
        style={{ left: `${Math.min(98, Math.max(0, pos * 100))}%` }}
      />
    </span>
  );
}

/** Two-sided proportion bar — long/short, in/out, up/down. */
export function SplitBar({
  left,
  right,
  height = 6,
  className,
}: {
  left: number;
  right: number;
  height?: number;
  className?: string;
}) {
  const total = left + right || 1;
  return (
    <div className={cn("flex gap-[1.5px]", className)} style={{ height }} aria-hidden="true">
      <div
        className="rounded-l-[2px] bg-up"
        style={{ width: `${(left / total) * 100}%` }}
      />
      <div
        className="rounded-r-[2px] bg-down"
        style={{ width: `${(right / total) * 100}%` }}
      />
    </div>
  );
}

export const SEGMENT_FILL = {
  up: "bg-up",
  down: "bg-down",
  warn: "bg-warn",
  info: "bg-info",
  brand: "bg-brand",
  neutral: "bg-ink-3",
  faint: "bg-edge",
} as const;

export type SegmentTone = keyof typeof SEGMENT_FILL;

/**
 * Parts of a whole on one rail. A legend always sits beside it, so identity
 * never rests on colour alone.
 */
export function ProportionBar({
  segments,
  height = 8,
  legend = true,
  className,
}: {
  segments: { key: string; label: string; value: number; tone: SegmentTone; note?: string }[];
  height?: number;
  legend?: boolean;
  className?: string;
}) {
  const parts = segments.filter((s) => s.value > 0);
  const total = parts.reduce((sum, s) => sum + s.value, 0) || 1;
  return (
    <div className={className}>
      <div className="flex gap-[2px]" style={{ height }} aria-hidden="true">
        {parts.map((s, i) => (
          <div
            key={s.key}
            className={cn(
              SEGMENT_FILL[s.tone],
              i === 0 && "rounded-l-[2px]",
              i === parts.length - 1 && "rounded-r-[2px]",
            )}
            style={{ width: `${(s.value / total) * 100}%`, minWidth: 2 }}
          />
        ))}
      </div>
      {legend && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
          {segments.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span
                className={cn("size-[7px] shrink-0 rounded-[2px]", SEGMENT_FILL[s.tone])}
                aria-hidden="true"
              />
              <span className="text-[11px] text-ink-2">{s.label}</span>
              <span className="figure text-[10.5px] text-ink-3">
                {s.note ?? `${((s.value / total) * 100).toFixed(1)}%`}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** A link out to the source that proves a figure. */
export function ProofLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "figure ctl inline-flex items-center gap-1 text-[10.5px] text-ink-3 underline decoration-edge underline-offset-4 hover:text-ink",
        className,
      )}
    >
      {children}
      <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M4 2h6v6M10 2 3 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

/**
 * Freshness stamp. Lives in a client component because an age rendered into
 * cached HTML goes stale while the page sits on a CDN.
 */
export { AsOf } from "./as-of";

/** Empty state. Quiet, never a shrug. */
export function Empty({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("py-10 text-center text-[12.5px] text-ink-3", className)}>
      {children}
    </div>
  );
}
