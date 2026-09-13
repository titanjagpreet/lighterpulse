"use client";

import { IntentLink } from "./intent-link";
import { useEffect, useMemo, useRef, useState } from "react";
import { TimeAgo } from "./as-of";
import { Pager, type PageSize } from "./pager";
import { Chip, Figure, Segmented } from "./primitives";
import {
  ACTIVITY_KINDS,
  activityCsv,
  fetchActivity,
  typeLabel,
  type ActivityKind,
  type ActivityRow,
} from "@/lib/lighter/activity";
import { STAKING_POOL_INDEX } from "@/lib/pools";
import { hash, num, price, usd } from "@/lib/format";
import { cn } from "@/lib/utils";

const COLS =
  "grid-cols-[92px_minmax(150px,1.2fr)_minmax(80px,0.7fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(104px,0.9fr)_minmax(132px,1fr)]";

const KIND_CHIP: Partial<
  Record<ActivityKind, { label: string; tone: "up" | "down" | "warn" | "info" }>
> = {
  liquidation: { label: "LIQ", tone: "down" },
  deposit: { label: "DEPOSIT", tone: "up" },
  withdrawal: { label: "WITHDRAW", tone: "warn" },
  stake: { label: "STAKE", tone: "info" },
  unstake: { label: "UNSTAKE", tone: "info" },
};

type Page = { rows: ActivityRow[]; received: number };

/**
 * An account's history, a page at a time, from the explorer — fetched in the
 * visitor's browser on their own rate limit. Pages already opened are kept,
 * so paging back is instant and the export covers everything seen.
 */
export function AccountActivity({
  index,
  marketNames,
}: {
  index: number;
  marketNames: Record<number, string>;
}) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [kind, setKind] = useState<ActivityKind | "all">("all");
  const [current, setCurrent] = useState<(Page & { key: string }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const cache = useRef(new Map<string, Page>());

  const key = `${index}:${pageSize}:${page}`;

  useEffect(() => {
    const hit = cache.current.get(key);
    if (hit) {
      setCurrent({ key, ...hit });
      setError(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    setError(false);
    fetchActivity(index, pageSize, page * pageSize, ctrl.signal)
      .then((res) => {
        cache.current.set(key, res);
        setCurrent({ key, ...res });
        setLoading(false);
      })
      .catch(() => {
        if (ctrl.signal.aborted) return;
        setError(true);
        setLoading(false);
      });
    return () => ctrl.abort();
  }, [index, key, page, pageSize, attempt]);

  // Changing account starts from the newest page.
  useEffect(() => {
    setPage(0);
    setKind("all");
  }, [index]);

  const rows = current?.key === key ? current.rows : [];
  const visible = kind === "all" ? rows : rows.filter((r) => r.kind === kind);
  const hasMore = current?.key === key && current.received === pageSize;

  const seenKinds = useMemo(() => {
    const counts = new Map<ActivityKind, number>();
    for (const r of rows) counts.set(r.kind, (counts.get(r.kind) ?? 0) + 1);
    return counts;
    // `current` changes whenever the page does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const kindOptions = [
    { key: "all" as const, label: `All ${rows.length}` },
    ...ACTIVITY_KINDS.filter((k) => seenKinds.has(k.key) || k.key === kind).map((k) => ({
      key: k.key,
      label: `${k.label} ${seenKinds.get(k.key) ?? 0}`,
    })),
  ];

  const loaded = () => {
    const prefix = `${index}:${pageSize}:`;
    const seen = new Set<string>();
    const all: ActivityRow[] = [];
    for (const [k, v] of cache.current) {
      if (!k.startsWith(prefix)) continue;
      for (const r of v.rows) {
        const id = `${r.hash}:${r.type}:${r.t}:${r.size ?? ""}:${r.amount ?? ""}`;
        if (seen.has(id)) continue;
        seen.add(id);
        all.push(r);
      }
    }
    return all.sort((a, b) => b.t - a.t);
  };

  const exportCsv = () => {
    const all = loaded().filter((r) => kind === "all" || r.kind === kind);
    if (all.length === 0) return;
    const csv = activityCsv(all, (id) => marketNames[id] ?? `#${id}`);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `lighter-account-${index}-activity.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const loadedCount = cache.current.size ? loaded().length : 0;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="text-[13px] font-semibold tracking-[-0.005em]">Activity</h2>
        <span className="figure text-[10.5px] text-ink-3">newest first · from the explorer</span>
        <div className="grow" />
        <button
          type="button"
          onClick={exportCsv}
          disabled={loadedCount === 0}
          className="ctl figure rounded-[3px] border border-edge px-2.5 py-1 text-[10.5px] text-ink-2 hover:text-ink disabled:pointer-events-none disabled:opacity-40 pointer-coarse:py-2"
        >
          Export CSV · {loadedCount} rows
        </button>
      </div>

      {rows.length > 0 && (
        <div className="mb-3 overflow-x-auto">
          <Segmented
            options={kindOptions}
            value={kind}
            onChange={(k: ActivityKind | "all") => setKind(k)}
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-[980px] pr-1">
          <div className={cn("label grid items-center gap-x-4 border-b border-edge pt-1 pb-2.5", COLS)}>
            <span>Time</span>
            <span>Type</span>
            <span>Market</span>
            <span>Side · route</span>
            <span className="text-right">Size @ price</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Counterparty · tx</span>
          </div>

          {error ? (
            <div className="py-10 text-center">
              <p className="mb-3 text-[12.5px] text-ink-3">
                The explorer did not answer. It limits requests per visitor — wait a
                moment and retry.
              </p>
              <button
                type="button"
                onClick={() => setAttempt((a) => a + 1)}
                className="ctl figure rounded-[3px] border border-edge px-3 py-1.5 text-[11px] text-ink-2 hover:text-ink"
              >
                Retry
              </button>
            </div>
          ) : loading && rows.length === 0 ? (
            <p className="py-10 text-center text-[12.5px] text-ink-3">Loading activity…</p>
          ) : visible.length === 0 ? (
            <p className="py-10 text-center text-[12.5px] text-ink-3">
              {rows.length === 0
                ? page === 0
                  ? "No activity on this account yet."
                  : "No older activity."
                : "Nothing of that type on this page — try an older one."}
            </p>
          ) : (
            visible.map((r, i) => {
              const symbol =
                r.marketId != null ? marketNames[r.marketId] ?? `#${r.marketId}` : null;
              const chip = KIND_CHIP[r.kind];
              return (
                <div
                  key={`${r.hash}-${i}`}
                  className={cn(
                    "row-hit grid items-center gap-x-4 border-b border-hair py-2",
                    COLS,
                    loading && "opacity-60",
                  )}
                >
                  <span className="flex flex-col">
                    <TimeAgo t={r.t} suffix=" ago" className="figure text-[11px] text-ink-2" />
                    <span className="figure text-[9.5px] text-ink-4">
                      {r.t ? new Date(r.t).toISOString().slice(5, 16).replace("T", " ") : ""}
                    </span>
                  </span>

                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-[12px]">{typeLabel(r.type)}</span>
                    {chip && <Chip tone={chip.tone}>{chip.label}</Chip>}
                  </span>

                  <span className="truncate text-[12px] font-medium">
                    {symbol == null ? (
                      <span className="text-ink-4">—</span>
                    ) : symbol.includes("/") || symbol.startsWith("#") ? (
                      symbol
                    ) : (
                      <IntentLink href={`/markets/${symbol}`} className="hover:underline hover:decoration-edge hover:underline-offset-4">
                        {symbol}
                      </IntentLink>
                    )}
                  </span>

                  <SideCell r={r} />

                  <Figure className="text-right text-[11.5px] text-ink-2">
                    {r.size != null && r.price != null
                      ? `${num(r.size, r.size < 10 ? 4 : 2)} @ ${price(r.price)}`
                      : "—"}
                  </Figure>

                  <Figure className="text-right text-[12px]">{amountText(r)}</Figure>

                  <span className="flex min-w-0 items-center justify-end gap-3">
                    {r.counterparty != null &&
                      (r.counterparty === STAKING_POOL_INDEX ? (
                        <IntentLink href="/lit#staking" className="figure truncate text-[10.5px] text-ink-3 hover:text-ink">
                          staking pool
                        </IntentLink>
                      ) : (
                        <IntentLink
                          href={`/a/${r.counterparty}`}
                          className="figure truncate text-[10.5px] text-ink-3 hover:text-ink"
                        >
                          #{r.counterparty}
                        </IntentLink>
                      ))}
                    <IntentLink
                      href={`/explorer/tx/${r.hash}`}
                      title={r.hash}
                      className="figure shrink-0 text-[10.5px] text-ink-3 hover:text-ink"
                    >
                      {hash(r.hash, 6, 4)}
                    </IntentLink>
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <Pager
        className="mt-3"
        page={page}
        pageSize={pageSize}
        hasMore={hasMore}
        loading={loading}
        onPage={setPage}
        onPageSize={(s) => {
          setPageSize(s);
          setPage(0);
        }}
      />

      <p className="mt-3 text-[11px] leading-relaxed text-ink-4">
        The explorer cannot filter by type, so a filter applies to the page loaded. The
        export includes every page opened here, in UTC.
      </p>
    </div>
  );
}

function SideCell({ r }: { r: ActivityRow }) {
  if (r.side) {
    return (
      <span className="flex items-baseline gap-2">
        <Figure className={cn("text-[10.5px]", r.side === "buy" ? "text-up" : "text-down")}>
          {r.side.toUpperCase()}
        </Figure>
        {r.role && <Figure className="text-[10px] text-ink-4">{r.role}</Figure>}
      </span>
    );
  }
  const direction =
    r.direction === "in"
      ? "in"
      : r.direction === "out"
        ? "out"
        : r.direction === "self"
          ? "own balances"
          : null;
  if (!direction && !r.route) return <Figure className="text-[11px] text-ink-4">—</Figure>;
  return (
    <span className="flex min-w-0 flex-col">
      {direction && (
        <Figure
          className={cn(
            "text-[10.5px]",
            r.direction === "in" ? "text-up" : r.direction === "out" ? "text-down" : "text-ink-3",
          )}
        >
          {direction}
        </Figure>
      )}
      {r.route && <Figure className="truncate text-[10px] text-ink-4">{r.route}</Figure>}
    </span>
  );
}

function amountText(r: ActivityRow): string {
  if (r.amount == null) return "—";
  if (r.kind === "trade" || r.kind === "liquidation") return usd(r.amount, 2);
  return `${num(r.amount, Math.abs(r.amount) < 10 ? 4 : 2)} ${r.asset ?? ""}`.trim();
}
