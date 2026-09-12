"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Freshness, computed where it is read.
 *
 * Static pages are served from a CDN well after they were rendered, so an age
 * baked into the HTML ("12s ago") can be hours wrong by the time someone reads
 * it. These components count from an absolute time, in the browser.
 *
 * Before mount there is no clock the server and the hydrating client agree on,
 * so both render the same thing — the absolute UTC time — and the relative
 * form takes over once mounted. Reading "now" during render made the two
 * disagree whenever a second ticked between them or a stamp crossed its
 * staleness threshold, and a changed text node cannot be suppressed: it broke
 * hydration outright.
 */

function useNow(intervalMs: number): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function toMs(t: string | number): number {
  if (typeof t === "number") return t < 1e12 ? t * 1000 : t;
  return Date.parse(t);
}

/** 42 → "42s", 150 → "2m", 7200 → "2h", 259200 → "3d" */
function span(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86_400)}d`;
}

/** "07:04:31" — identical on server and client, whatever their clocks say. */
const utcClock = (ms: number) => new Date(ms).toISOString().slice(11, 19);

/** Freshness stamp. Every panel can say how old its data is — truthfully. */
export function AsOf({
  asOf,
  ttl,
  source,
  className,
}: {
  /** ISO time the data was produced upstream. */
  asOf: string;
  /** Cache TTL in seconds; past three of these the stamp turns amber. */
  ttl?: number;
  /** "stale" when the cache is serving a last-known-good copy. */
  source?: string;
  className?: string;
}) {
  const now = useNow(5_000);
  const at = toMs(asOf);
  if (!Number.isFinite(at)) return null;

  const age = now == null ? null : Math.max(0, Math.round((now - at) / 1000));
  const stale = source === "stale" || (ttl != null && age != null && age > ttl * 3);
  const text =
    age == null
      ? `as of ${utcClock(at)} UTC`
      : `${stale ? "stale · " : ""}${span(age)} ago`;

  return (
    <span
      className={cn("figure text-[10px]", stale ? "text-warn" : "text-ink-4", className)}
      title={
        stale
          ? "Older than expected — upstream may be unreachable, showing the last known good data"
          : new Date(at).toISOString()
      }
    >
      {text}
    </span>
  );
}

/** A relative time that keeps counting: "4s", "2m", "3h". */
export function TimeAgo({
  t,
  suffix = "",
  className,
}: {
  t: string | number;
  suffix?: string;
  className?: string;
}) {
  const now = useNow(10_000);
  const ms = toMs(t);
  if (!Number.isFinite(ms)) return <span className={className}>—</span>;
  const text =
    now == null
      ? utcClock(ms)
      : `${span(Math.max(0, Math.floor((now - ms) / 1000)))}${suffix}`;
  return (
    <span className={className} title={new Date(ms).toISOString()}>
      {text}
    </span>
  );
}
