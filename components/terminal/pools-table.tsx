"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Chip, Figure, MagnitudeBar, Segmented } from "./primitives";
import { LLP_INDEX, MIN_APR_TVL, ZERO_ADDRESS, type PublicPool } from "@/lib/pools";
import { addr, dayLabel, num, usdCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

type SortKey = "tvl" | "apy" | "sharpe" | "created";

/** Vaults below this are mostly abandoned; they stay one click away. */
const FUNDED = 10_000;
const PAGE = 25;
const COLS =
  "grid-cols-[30px_minmax(200px,2fr)_minmax(120px,1fr)_minmax(80px,0.7fr)_minmax(64px,0.55fr)_minmax(52px,0.45fr)_minmax(96px,0.8fr)_minmax(120px,1fr)]";

export const poolHref = (index: number) => (index === LLP_INDEX ? "/llp" : `/llp/${index}`);

/** Lighter's app shows no APR for a pool under $1K — a few dollars' swing reads as hundreds of percent. */
const apyOf = (p: PublicPool) => (p.tvl < MIN_APR_TVL ? null : p.apy);

export function PoolsTable({ pools }: { pools: PublicPool[] }) {
  const [scope, setScope] = useState<"funded" | "all">("funded");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "tvl", dir: -1 });
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);

  const fundedCount = useMemo(() => pools.filter((p) => p.tvl >= FUNDED).length, [pools]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = pools.filter(
      (p) =>
        (scope === "all" || p.tvl >= FUNDED) &&
        (!q || p.name.toLowerCase().includes(q) || String(p.index).includes(q)),
    );
    const key = (p: PublicPool): number | null =>
      sort.key === "tvl"
        ? p.tvl
        : sort.key === "apy"
          ? apyOf(p)
          : sort.key === "sharpe"
            ? p.sharpe
            : p.createdAt;
    return [...list].sort((a, b) => {
      const x = key(a);
      const y = key(b);
      // Missing values sink, whichever way the column is sorted.
      if (x == null) return y == null ? 0 : 1;
      if (y == null) return -1;
      return (x - y) * sort.dir;
    });
  }, [pools, scope, query, sort]);

  const maxTvl = Math.max(...rows.map((p) => p.tvl), 1);

  const head = (k: SortKey, label: string) => {
    const on = sort.key === k;
    return (
      <button
        type="button"
        onClick={() => setSort(on ? { key: k, dir: sort.dir === 1 ? -1 : 1 } : { key: k, dir: -1 })}
        className={cn(
          "label ctl flex items-center justify-end gap-1 hover:text-ink-2",
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
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Segmented
          options={[
            { key: "funded", label: `Over $10K · ${fundedCount}` },
            { key: "all", label: `All · ${pools.length}` },
          ]}
          value={scope}
          onChange={(k: "funded" | "all") => {
            setScope(k);
            setShown(PAGE);
          }}
        />
        <div className="grow" />
        <label className="flex w-full items-center gap-2 rounded-[3px] border border-edge bg-raised px-2.5 focus-within:border-ink-4 sm:w-[240px]">
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-ink-4">
            <circle cx="7" cy="7" r="4.8" stroke="currentColor" strokeWidth="1.5" />
            <path d="m10.6 10.6 3.4 3.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShown(PAGE);
            }}
            placeholder="Pool name or index"
            aria-label="Filter pools"
            className="w-full bg-transparent py-1.5 text-[12px] text-ink outline-none placeholder:text-ink-4 pointer-coarse:py-2.5"
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[900px] pr-1">
          <div className={cn("grid items-center gap-x-4 border-b border-edge pt-1 pb-2.5", COLS)}>
            <span className="label">#</span>
            <span className="label">Pool</span>
            {head("tvl", "TVL")}
            {head("apy", "APY")}
            {head("sharpe", "Sharpe")}
            <span className="label text-right">Fee</span>
            {head("created", "Created")}
            <span className="label">Operator</span>
          </div>

          {rows.length === 0 ? (
            <p className="py-8 text-center text-[12px] text-ink-3">No pools match.</p>
          ) : (
            rows.slice(0, shown).map((p, i) => {
              const apy = apyOf(p);
              return (
                <div
                  key={p.index}
                  className={cn(
                    "row-hit relative isolate grid items-center gap-x-4 border-b border-hair py-2.5",
                    COLS,
                  )}
                >
                  <Figure className="text-[10.5px] text-ink-4">{i + 1}</Figure>
                  <span className="flex min-w-0 items-baseline gap-2">
                    {/* the name's overlay makes the whole row the link */}
                    <Link
                      href={poolHref(p.index)}
                      className="truncate text-[12.5px] font-medium after:absolute after:inset-0 after:z-[1] hover:underline hover:decoration-edge hover:underline-offset-4"
                      title={p.name}
                    >
                      {p.name}
                    </Link>
                    {p.index === LLP_INDEX ? (
                      <Chip tone="brand">LLP</Chip>
                    ) : p.type === 3 ? (
                      <Chip>PROTOCOL</Chip>
                    ) : null}
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <Figure className="text-[12px]">{usdCompact(p.tvl, 2)}</Figure>
                    <MagnitudeBar value={p.tvl} max={maxTvl} width={96} />
                  </span>
                  <Figure
                    className={cn(
                      "text-right text-[12px]",
                      apy == null ? "text-ink-4" : apy >= 0 ? "text-up" : "text-down",
                    )}
                    title={
                      p.apy != null && apy == null
                        ? "Not shown under $1K TVL, as in Lighter's app"
                        : undefined
                    }
                  >
                    {apy == null
                      ? "—"
                      : `${apy >= 0 ? "+" : "−"}${Math.abs(apy) >= 1000 ? num(Math.abs(apy)) : Math.abs(apy).toFixed(1)}%`}
                  </Figure>
                  <Figure className="text-right text-[12px] text-ink-2">
                    {p.sharpe == null ? "—" : p.sharpe.toFixed(2)}
                  </Figure>
                  <Figure className="text-right text-[11.5px] text-ink-3">
                    {p.operatorFee ? `${p.operatorFee.toFixed(0)}%` : "0%"}
                  </Figure>
                  <Figure className="text-right text-[11px] text-ink-3">
                    {p.createdAt ? dayLabel(p.createdAt, true) : "—"}
                  </Figure>
                  {p.operator && p.operator !== ZERO_ADDRESS ? (
                    <Link
                      href={`/a/${p.operator}`}
                      className="figure relative z-[2] truncate text-[11px] text-ink-3 hover:text-ink"
                    >
                      {addr(p.operator, 6, 4)}
                    </Link>
                  ) : (
                    <span className="figure text-[11px] text-ink-4">protocol</span>
                  )}
                </div>
              );
            })
          )}
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
      <p className="mt-3 text-[11px] leading-relaxed text-ink-4">
        TVL is the pool&rsquo;s perps account plus its spot holdings. APY and Sharpe are
        Lighter&rsquo;s own figures from each pool&rsquo;s share price; as in Lighter&rsquo;s app, APY
        is not shown under $1K TVL. The fee is the operator&rsquo;s cut of profits.
      </p>
    </div>
  );
}
