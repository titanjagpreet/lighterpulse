/**
 * Number formatting for financial display.
 *
 * House rules:
 *  - Direction is carried by glyph AND colour, never colour alone.
 *  - Compact notation switches at 1e3 / 1e6 / 1e9 / 1e12.
 *  - Price decimals adapt to magnitude so $0.004644 and $78,446.70 both read.
 */

const nf = (min: number, max: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });

/** 1234567 → "1,234,567" */
export function num(v: number | null | undefined, decimals = 0): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return nf(decimals, decimals).format(v);
}

/** 1123249097 → "1.12B" */
export function compact(v: number | null | undefined, decimals = 2): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  if (a >= 1e12) return `${sign}${(a / 1e12).toFixed(decimals)}T`;
  if (a >= 1e9) return `${sign}${(a / 1e9).toFixed(decimals)}B`;
  if (a >= 1e6) return `${sign}${(a / 1e6).toFixed(decimals)}M`;
  if (a >= 1e3) return `${sign}${(a / 1e3).toFixed(1)}K`;
  return `${sign}${a.toFixed(decimals)}`;
}

/** 1123249097 → "$1.123B" — the headline form */
export function usdCompact(v: number | null | undefined, decimals = 3): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  if (a >= 1e12) return `${sign}$${(a / 1e12).toFixed(decimals)}T`;
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(decimals)}B`;
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(a >= 1e8 ? 1 : 2)}M`;
  if (a >= 1e3) return `${sign}$${(a / 1e3).toFixed(1)}K`;
  return `${sign}$${a.toFixed(2)}`;
}

/** 45736823.8 → "$45,736,823" */
export function usd(v: number | null | undefined, decimals = 0): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v < 0 ? "−" : "";
  return `${sign}$${nf(decimals, decimals).format(Math.abs(v))}`;
}

/** Signed money, for PnL columns. 800224 → "+$800,224" */
export function usdSigned(v: number | null | undefined, decimals = 0): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v < 0 ? "−" : "+";
  return `${sign}$${nf(decimals, decimals).format(Math.abs(v))}`;
}

/** Signed compact money. 2545789 → "+$2.55M" */
export function usdSignedCompact(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v < 0 ? "−" : "+";
  return `${sign}${usdCompact(Math.abs(v), 2).replace("$", "$")}`;
}

/**
 * Adaptive price. Large numbers get 2 decimals; sub-dollar keeps significant
 * digits so a memecoin at $0.004644 doesn't collapse to $0.00.
 */
export function price(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a === 0) return "0";
  if (a >= 1000) return nf(2, 2).format(v);
  if (a >= 1) return nf(2, 4).format(v);
  if (a >= 0.01) return nf(4, 4).format(v);
  if (a >= 0.0001) return nf(6, 6).format(v);
  return v.toPrecision(3);
}

/** Already a percentage, not a ratio. 0.42 → "+0.42%" */
export function pct(v: number | null | undefined, decimals = 2): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v < 0 ? "−" : "+";
  return `${sign}${Math.abs(v).toFixed(decimals)}%`;
}

/** Unsigned percentage. 31.4 → "31.4%" */
export function pctPlain(v: number | null | undefined, decimals = 1): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${v.toFixed(decimals)}%`;
}

/** Funding rates arrive as ratios: 0.000011 → "+0.0011%" */
export function ratePct(v: number | null | undefined, decimals = 4): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const p = v * 100;
  if (p === 0) return "0.0000%";
  const sign = p < 0 ? "−" : "+";
  return `${sign}${Math.abs(p).toFixed(decimals)}%`;
}

/** 0xF47c66568C46315800308b30760D76D1915EEE70 → "0xF47c6656…1915EEE70" */
export function addr(a: string | null | undefined, head = 10, tail = 8): string {
  if (!a) return "—";
  if (a.length <= head + tail + 1) return a;
  return `${a.slice(0, head)}…${a.slice(-tail)}`;
}

/** Transaction hashes are long hex without 0x — shorten from both ends. */
export function hash(h: string | null | undefined, head = 8, tail = 8): string {
  if (!h) return "—";
  if (h.length <= head + tail + 1) return h;
  return `${h.slice(0, head)}…${h.slice(-tail)}`;
}

/** Seconds-since-epoch, ms, ISO string or Date → "4s" / "2m" / "3h" / "5d" */
export function ago(ts: number | string | Date | null | undefined): string {
  if (ts == null) return "—";
  const t =
    ts instanceof Date
      ? ts.getTime()
      : typeof ts === "string"
        ? new Date(ts).getTime()
        : ts < 1e12
          ? ts * 1000
          : ts;
  if (!Number.isFinite(t)) return "—";
  const s = Math.floor(Math.max(0, Date.now() - t) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/** 195180ms → "3m 15s" — cascade durations */
export function duration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return rem ? `${m}m ${rem}s` : `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** Seconds → "00:38:12" — funding countdowns */
export function clock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

export type Dir = "up" | "down" | "flat";

export function dirOf(v: number | null | undefined): Dir {
  if (v == null || !Number.isFinite(v) || v === 0) return "flat";
  return v > 0 ? "up" : "down";
}

/** Tailwind text colour for a direction. */
export const dirText: Record<Dir, string> = {
  up: "text-up",
  down: "text-down",
  flat: "text-ink-4",
};

/** Seconds until the next 8h funding boundary (00:00, 08:00, 16:00 UTC). */
export function secondsToNextFunding(now = new Date()): number {
  const next = new Date(now);
  next.setUTCHours(Math.floor(now.getUTCHours() / 8) * 8 + 8, 0, 0, 0);
  return Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));
}

/** Safe numeric coercion for string-typed API fields. */
export function n(v: unknown, fallback = 0): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
  if (typeof v === "string") {
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}
