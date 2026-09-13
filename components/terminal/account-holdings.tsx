"use client";

import { IntentLink } from "./intent-link";
import { useEffect, useMemo, useState } from "react";
import { useMarketStats } from "@/lib/lighter/use-market-stats";
import type { Account } from "@/lib/lighter/account";
import {
  LLP_INDEX,
  LLP_USDC_PER_STAKED_LIT,
  STAKING_POOL_INDEX,
  UNSTAKE_LOCKUP_DAYS,
  fetchPoolMeta,
  shareEquity,
  stakedLit,
  type PublicPool,
} from "@/lib/pools";
import { Figure, Label } from "./primitives";
import { num, usdCompact, usdSigned } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Collateral assets are valued at par; everything else at its live perp mark. */
const PAR = new Set(["USDC", "USDG"]);

interface PoolHolding {
  key: number;
  name: string;
  href: string;
  staking: boolean;
  /** What the shares are worth now — LIT for staking, USD otherwise. */
  value: number | null;
  /** What went in, in the same unit. */
  principal: number;
}

/**
 * What an account holds beyond its positions: spot balances, perps margin,
 * LIT unstaking, and shares in the LLP, vaults and LIT staking.
 *
 * Pool shares are valued the way Lighter's own app values them: shares ÷ all
 * shares × the pool's value (perps account plus spot holdings), with the
 * return being that less the principal paid in. Each pool's metadata row is
 * one small request from the visitor's browser.
 */
export function AccountHoldings({ account }: { account: Account }) {
  const { stats } = useMarketStats();
  const [pools, setPools] = useState<Map<number, PublicPool | null>>(new Map());

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
        fetchPoolMeta(Number(i), ctrl.signal)
          .then((p) => [Number(i), p] as const)
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
  const litPx = priceOf("LIT");

  const holdings: PoolHolding[] = account.shares.map((s) => {
    const pool = pools.get(s.poolIndex) ?? null;
    if (s.poolIndex === STAKING_POOL_INDEX) {
      return {
        key: s.poolIndex,
        name: "LIT staking",
        href: "/lit#staking",
        staking: true,
        value: pool ? stakedLit(s.shares, pool) : null,
        principal: s.principal,
      };
    }
    return {
      key: s.poolIndex,
      name: s.poolIndex === LLP_INDEX ? "LLP" : (pool?.name ?? `Pool #${s.poolIndex}`),
      href: s.poolIndex === LLP_INDEX ? "/llp" : `/llp/${s.poolIndex}`,
      staking: false,
      value: pool ? shareEquity(s.shares, pool) : null,
      principal: s.principal,
    };
  });
  const staking = holdings.find((h) => h.staking);
  const showPools = holdings.length > 0 || account.pendingUnstake > 0;

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

      {showPools && (
        <div className="mt-5 border-t border-line pt-4">
          <Label className="mb-2">Pools &amp; staking</Label>

          {holdings.map((h) => {
            const gain = h.value != null ? h.value - h.principal : null;
            const gainPct = gain != null && h.principal > 0 ? (gain / h.principal) * 100 : null;
            return (
              <div key={h.key} className="border-t border-hair py-2">
                <div className="flex items-baseline justify-between gap-3">
                  <IntentLink
                    href={h.href}
                    className="min-w-0 truncate text-[12px] font-medium hover:underline hover:decoration-edge hover:underline-offset-4"
                  >
                    {h.name}
                  </IntentLink>
                  <Figure
                    className="shrink-0 text-[11.5px]"
                    title={
                      h.staking && h.value != null && litPx != null
                        ? `≈ ${usdCompact(h.value * litPx, 2)}`
                        : undefined
                    }
                  >
                    {h.value == null
                      ? "…"
                      : h.staking
                        ? `${num(h.value, 0)} LIT`
                        : usdCompact(h.value, 2)}
                  </Figure>
                </div>
                {gain != null && h.principal > 0 && (
                  <div className="figure mt-0.5 flex justify-between gap-3 text-[9.5px] text-ink-4">
                    <span>
                      {h.staking
                        ? `${num(h.principal, 0)} LIT staked`
                        : `${usdCompact(h.principal, 2)} deposited`}
                    </span>
                    <span className={cn(gain >= 0 ? "text-up" : "text-down")}>
                      {h.staking
                        ? `${gain >= 0 ? "+" : "−"}${num(Math.abs(gain), 0)} LIT earned`
                        : `${usdSigned(gain)} return`}
                      {gainPct != null && ` (${gainPct >= 0 ? "+" : "−"}${Math.abs(gainPct).toFixed(1)}%)`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {account.pendingUnstake > 0 && (
            <div className="flex items-baseline justify-between gap-3 border-t border-hair py-2">
              <span>
                <span className="block text-[12px] font-medium">Unstaking</span>
                <Figure className="block text-[9.5px] text-ink-4">
                  {UNSTAKE_LOCKUP_DAYS}-day lockup before it can be withdrawn
                </Figure>
              </span>
              <span className="flex shrink-0 flex-col items-end">
                <Figure className="text-[11.5px] text-warn">
                  {num(account.pendingUnstake, 0)} LIT
                </Figure>
                {litPx != null && (
                  <Figure className="text-[9.5px] text-ink-4">
                    {usdCompact(account.pendingUnstake * litPx, 2)}
                  </Figure>
                )}
              </span>
            </div>
          )}

          {staking?.value != null && (
            <p className="mt-2 text-[10.5px] leading-relaxed text-ink-4">
              Staked LIT allows up to{" "}
              <span className="figure text-ink-3">
                {usdCompact(staking.value * LLP_USDC_PER_STAKED_LIT, 2)}
              </span>{" "}
              of LLP deposits ({LLP_USDC_PER_STAKED_LIT} USDC per LIT).
            </p>
          )}
          {holdings.some((h) => !h.staking) && (
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-ink-4">
              Valued as Lighter&rsquo;s app does: your shares ÷ all shares × the pool&rsquo;s
              value, perps and spot.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
