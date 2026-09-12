"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMarketStats } from "@/lib/lighter/use-market-stats";
import type { Account } from "@/lib/lighter/account";
import {
  LLP_INDEX,
  LLP_USDC_PER_STAKED_LIT,
  STAKING_POOL_INDEX,
  fetchPoolDetail,
  type PoolDetail,
} from "@/lib/pools";
import { Figure, Label } from "./primitives";
import { num, usdCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Collateral assets are valued at par; everything else at its live perp mark. */
const PAR = new Set(["USDC", "USDG"]);

interface PoolHolding {
  key: number;
  name: string;
  href: string;
  /** For staking, LIT; otherwise null. */
  lit: number | null;
  principalLit: number | null;
  usd: number | null;
}

/**
 * What an account holds beyond its positions: spot balances, perps margin, and
 * shares in the LLP, vaults and LIT staking — each valued in the browser from
 * the pool's own account.
 */
export function AccountHoldings({ account }: { account: Account }) {
  const { stats } = useMarketStats();
  const [pools, setPools] = useState<Map<number, PoolDetail | null>>(new Map());

  const priceOf = useMemo(() => {
    const marks = new Map<string, number>();
    for (const s of stats.values()) {
      if (s.symbol && s.markPrice > 0 && !marks.has(s.symbol)) marks.set(s.symbol, s.markPrice);
    }
    return (symbol: string): number | null => (PAR.has(symbol) ? 1 : marks.get(symbol) ?? null);
  }, [stats]);

  const poolKey = [...new Set(account.shares.map((s) => s.poolIndex))].sort().join(",");
  useEffect(() => {
    if (!poolKey) {
      setPools(new Map());
      return;
    }
    const ctrl = new AbortController();
    Promise.all(
      poolKey.split(",").map((i) =>
        fetchPoolDetail(Number(i), ctrl.signal)
          .then((d) => [Number(i), d] as const)
          .catch(() => [Number(i), null] as const),
      ),
    ).then((entries) => {
      if (!ctrl.signal.aborted) setPools(new Map(entries));
    });
    return () => ctrl.abort();
  }, [poolKey]);

  const assets = account.assets.map((x) => {
    const px = priceOf(x.symbol);
    return { ...x, px, usd: px != null ? (x.balance + x.marginBalance) * px : null };
  });
  const spotUsd = assets.reduce((s, x) => s + (x.px != null ? x.balance * x.px : 0), 0);
  const marginUsd = assets.reduce((s, x) => s + (x.px != null ? x.marginBalance * x.px : 0), 0);
  const unpriced = assets.filter((x) => x.px == null).length;

  const holdings: PoolHolding[] = account.shares.map((s) => {
    const d = pools.get(s.poolIndex) ?? null;
    if (s.poolIndex === STAKING_POOL_INDEX) {
      const lit = d?.assets.find((a) => a.symbol === "LIT")?.balance ?? null;
      const perShare = d && lit && d.info.totalShares > 0 ? lit / d.info.totalShares : null;
      const value = perShare != null ? s.shares * perShare : null;
      const litPx = priceOf("LIT");
      return {
        key: s.poolIndex,
        name: "LIT staking",
        href: "/lit#staking",
        lit: value,
        principalLit: s.principal || null,
        usd: value != null && litPx != null ? value * litPx : null,
      };
    }
    const prices = d?.info.sharePrice.values ?? [];
    const sharePrice =
      prices.length > 0
        ? prices[prices.length - 1]
        : d && d.info.totalShares > 0
          ? d.tvl / d.info.totalShares
          : null;
    return {
      key: s.poolIndex,
      name: s.poolIndex === LLP_INDEX ? "LLP" : d?.name ?? `Pool #${s.poolIndex}`,
      href: s.poolIndex === LLP_INDEX ? "/llp" : `/llp/${s.poolIndex}`,
      lit: null,
      principalLit: null,
      usd: sharePrice != null ? s.shares * sharePrice : null,
    };
  });
  const staking = holdings.find((h) => h.key === STAKING_POOL_INDEX);

  return (
    <div>
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="text-[13px] font-semibold tracking-[-0.005em]">Holdings</h2>
        <span className="figure text-[10.5px] text-ink-3">spot · perps margin · pools</span>
      </div>

      {assets.length === 0 ? (
        <p className="py-3 text-[11.5px] text-ink-3">No balances.</p>
      ) : (
        <div className="flex flex-col">
          <div className="label grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,1fr)] gap-2 pb-1.5">
            <span>Asset</span>
            <span className="text-right">Spot · margin</span>
            <span className="text-right">Value</span>
          </div>
          {assets.map((x) => (
            <div
              key={x.symbol}
              className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,1fr)] items-baseline gap-2 border-t border-hair py-2"
            >
              <span className="text-[12px] font-medium">{x.symbol}</span>
              <span className="flex flex-col items-end">
                <Figure className="text-[11.5px]">
                  {num(x.balance, Math.abs(x.balance) < 100 ? 4 : 2)}
                </Figure>
                {(x.marginBalance !== 0 || x.locked !== 0) && (
                  <Figure className="text-[9.5px] text-ink-4">
                    {x.marginBalance !== 0 && `${num(x.marginBalance, 2)} margin`}
                    {x.marginBalance !== 0 && x.locked !== 0 && " · "}
                    {x.locked !== 0 && `${num(x.locked, 2)} in orders`}
                  </Figure>
                )}
              </span>
              <Figure className="text-right text-[11.5px] text-ink-2">
                {x.usd != null ? usdCompact(x.usd, 2) : "—"}
              </Figure>
            </div>
          ))}
          <div className="figure mt-1 flex justify-between border-t border-line pt-2 text-[10.5px] text-ink-3">
            <span>
              spot <span className="text-ink-2">{usdCompact(spotUsd, 2)}</span>
            </span>
            <span>
              margin <span className="text-ink-2">{usdCompact(marginUsd, 2)}</span>
            </span>
          </div>
          {unpriced > 0 && (
            <p className="mt-1.5 text-[10.5px] text-ink-4">
              {unpriced} asset{unpriced === 1 ? "" : "s"} without a live price left out of the
              totals.
            </p>
          )}
        </div>
      )}

      {holdings.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <Label className="mb-2">Pools &amp; staking</Label>
          {holdings.map((h) => (
            <div key={h.key} className="flex items-baseline justify-between gap-3 border-t border-hair py-2">
              <span className="min-w-0">
                <Link
                  href={h.href}
                  className="block truncate text-[12px] font-medium hover:underline hover:decoration-edge hover:underline-offset-4"
                >
                  {h.name}
                </Link>
                {h.lit != null && h.principalLit != null && (
                  <Figure className="block text-[9.5px] text-ink-4">
                    {num(h.principalLit, 0)} staked ·{" "}
                    <span className={cn(h.lit >= h.principalLit ? "text-up" : "text-down")}>
                      {h.lit >= h.principalLit ? "+" : "−"}
                      {num(Math.abs(h.lit - h.principalLit), 0)} earned
                    </span>
                  </Figure>
                )}
              </span>
              <span className="flex shrink-0 flex-col items-end">
                <Figure className="text-[11.5px]">
                  {h.lit != null ? `${num(h.lit, 0)} LIT` : h.usd != null ? usdCompact(h.usd, 2) : "…"}
                </Figure>
                {h.lit != null && h.usd != null && (
                  <Figure className="text-[9.5px] text-ink-4">{usdCompact(h.usd, 2)}</Figure>
                )}
              </span>
            </div>
          ))}
          {staking?.lit != null && (
            <p className="mt-2 text-[10.5px] leading-relaxed text-ink-4">
              Staked LIT allows up to{" "}
              <span className="figure text-ink-3">
                {usdCompact(staking.lit * LLP_USDC_PER_STAKED_LIT, 2)}
              </span>{" "}
              of LLP deposits ({LLP_USDC_PER_STAKED_LIT} USDC per LIT).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
