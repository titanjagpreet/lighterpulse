"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { lighterSocket } from "@/lib/lighter/ws";
import { useMarketStats } from "@/lib/lighter/use-market-stats";
import {
  fetchAccount,
  fetchSubAccounts,
  reprice,
  withPositions,
  withLiquidationPrice,
  AccountNotFound,
  type Account,
  type SubAccount,
} from "@/lib/lighter/account";
import { AccountActivity } from "./account-activity";
import { AccountHoldings } from "./account-holdings";
import { CopyButton } from "./copy-button";
import { ShareCardButton } from "./share-card";
import { WatchAccountButton } from "./watch-account";
import {
  AsOf,
  Chip,
  Delta,
  Empty,
  Figure,
  Label,
  MagnitudeBar,
  SectionHeader,
} from "./primitives";
import {
  addr,
  num,
  pctPlain,
  price,
  usd,
  usdCompact,
  usdSigned,
} from "@/lib/format";
import { cn } from "@/lib/utils";

const COLS =
  "grid-cols-[minmax(118px,1.1fr)_54px_minmax(92px,1.05fr)_minmax(80px,0.95fr)_minmax(80px,0.95fr)_minmax(88px,1fr)_minmax(146px,1.5fr)_minmax(72px,0.8fr)_minmax(94px,1.05fr)_28px]";

type Tab = "positions" | "activity";

const TABS: { key: Tab; label: string }[] = [
  { key: "positions", label: "Positions & holdings" },
  { key: "activity", label: "Activity" },
];

export function AddressDashboard({
  query,
  maintenanceMargins = {},
  marketNames = {},
}: {
  query: string;
  /** marketId → maintenance margin in basis points, for the liq fallback. */
  maintenanceMargins?: Record<number, number>;
  /** marketId → symbol, spot books included, for account history. */
  marketNames?: Record<number, string>;
}) {
  const [account, setAccount] = useState<Account | null>(null);
  const [subs, setSubs] = useState<SubAccount[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [error, setError] = useState<"notfound" | "failed" | null>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number>(Date.now());
  const [tab, setTabState] = useState<Tab>("positions");
  const { stats, live: pricesLive } = useMarketStats();

  // The tab lives in the URL so a link can open straight onto Activity.
  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get("tab") === "activity") {
        setTabState("activity");
      }
    } catch {
      /* no URL access — keep the default */
    }
  }, []);

  const setTab = (t: Tab) => {
    setTabState(t);
    try {
      const url = new URL(window.location.href);
      if (t === "positions") url.searchParams.delete("tab");
      else url.searchParams.set("tab", t);
      window.history.replaceState(window.history.state, "", url);
    } catch {
      /* history blocked — the tab still switches */
    }
  };

  /**
   * The book, revalued against live marks.
   *
   * `account_all` only fires when the account changes, so an idle position
   * would sit frozen while the market moved. Everything price-dependent —
   * PnL, notional, distance to liquidation — is derived here instead.
   */
  const view = useMemo(() => {
    if (!account) return null;
    const positions = account.positions.map((p) => {
      const priced = reprice(p, stats.get(p.marketId)?.markPrice ?? p.markPrice);
      return withLiquidationPrice(priced, maintenanceMargins[p.marketId] ?? 0);
    });
    return withPositions(account, positions);
  }, [account, stats, maintenanceMargins]);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const acc = await fetchAccount(q);
      setAccount(acc);
      setActiveIndex(acc.index);
      setUpdatedAt(Date.now());
      if (acc.address) fetchSubAccounts(acc.address).then(setSubs);
    } catch (err) {
      setError(err instanceof AccountNotFound ? "notfound" : "failed");
      setAccount(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(query);
  }, [query, load]);

  useEffect(() => {
    if (activeIndex == null || activeIndex === account?.index) return;
    void load(String(activeIndex));
  }, [activeIndex, account?.index, load]);

  // Structural changes — new positions, deposits, orders filling.
  useEffect(() => {
    if (account?.index == null) return;
    const sock = lighterSocket();
    const offStatus = sock.onStatus((s) => setLive(s === "open"));
    const off = sock.subscribe(`account_all/${account.index}`, () => {
      setUpdatedAt(Date.now());
      void fetchAccount(String(account.index))
        .then(setAccount)
        .catch(() => {});
    });
    return () => {
      off();
      offStatus();
    };
  }, [account?.index]);

  if (loading && !account) {
    return (
      <div className="px-5 py-20 text-center">
        <Figure className="text-[12.5px] text-ink-3">Loading account…</Figure>
      </div>
    );
  }

  if (error === "notfound") {
    return (
      <div className="px-5 py-20 text-center">
        <p className="mb-2 text-[15px] font-medium">No Lighter account found</p>
        <p className="figure mb-6 text-[12.5px] text-ink-3">
          {addr(query, 12, 10)}
        </p>
        <p className="mx-auto max-w-[46ch] text-[12.5px] leading-relaxed text-ink-3">
          That address has never traded on Lighter, or the index does not exist.
          Try an address from the{" "}
          <Link
            href="/leaderboard"
            className="text-ink underline decoration-edge underline-offset-4"
          >
            leaderboard
          </Link>
          .
        </p>
      </div>
    );
  }

  if (error === "failed" || !account || !view) {
    return (
      <div className="px-5 py-20 text-center">
        <p className="mb-2 text-[15px] font-medium">
          Could not load that account
        </p>
        <p className="text-[12.5px] text-ink-3">
          Lighter&rsquo;s API is unreachable right now. Try again in a moment.
        </p>
      </div>
    );
  }

  const a = view;
  const shareLabel = account.address ? addr(account.address, 6, 4) : `#${account.index}`;

  // Cross-margin health only means something when there is cross exposure. A
  // fully isolated book reports a zero cross requirement, which would
  // otherwise render as a misleading "0.0% used".
  const crossCount = a.positions.filter((p) => p.marginMode === "cross").length;
  const hasCross = a.maintenanceMarginRequirement > 0 || crossCount > 0;
  const marginPct =
    hasCross && a.marginUsage != null ? a.marginUsage * 100 : null;
  const isolatedMargin = a.positions
    .filter((p) => p.marginMode === "isolated")
    .reduce((s, p) => s + p.allocatedMargin, 0);

  return (
    <div>
      {/* ── identity ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3.5 border-b border-line bg-panel px-5 py-3.5">
        <h1 className="figure text-[15px] font-medium" title={account.address ?? undefined}>
          {account.address ? addr(account.address, 10, 8) : `#${account.index}`}
        </h1>

        {account.address && <CopyButton value={account.address} label="Copy address" />}

        {(live || pricesLive) && (
          <span className="flex items-center gap-1.5 rounded-[3px] border border-up-deep px-2 py-[3px]">
            <span className="size-[4.5px] rounded-full bg-brand live-halo" />
            <Figure className="text-[10px] text-brand">streaming</Figure>
          </span>
        )}

        <Chip>#{account.index}</Chip>
        <WatchAccountButton index={account.index} address={account.address} />
        <AsOf asOf={new Date(updatedAt).toISOString()} />

        <div className="grow" />

        {subs.length > 1 && (
          <div className="flex flex-wrap gap-0.5">
            {subs.map((s, i) => (
              <button
                key={s.index}
                type="button"
                onClick={() => setActiveIndex(s.index)}
                aria-pressed={s.index === account.index}
                className={cn(
                  "figure ctl rounded-[3px] px-2.5 py-1 text-[10.5px]",
                  s.index === account.index
                    ? "bg-active text-ink"
                    : "text-ink-2 hover:bg-raised hover:text-ink",
                )}
              >
                {i === 0 ? "Main" : `Sub ${i}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── KPI band ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 divide-x divide-y divide-line border-b border-line bg-panel sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
        <Kpi label="Account value" value={usd(a.totalValue, 2)} scale="hero" />
        <Kpi
          label="Unrealised PnL"
          value={usdSigned(a.totalUnrealizedPnl, 2)}
          tone={a.totalUnrealizedPnl >= 0 ? "up" : "down"}
          sub={`across ${a.positions.length} position${a.positions.length === 1 ? "" : "s"}`}
        />
        <Kpi
          label="Funding paid"
          value={usdSigned(-a.totalFundingPaid, 2)}
          tone={a.totalFundingPaid > 0 ? "down" : "up"}
          sub="lifetime, open positions"
        />
        <Kpi
          label="Notional"
          value={usdCompact(a.totalNotional)}
          sub="total position value"
        />
        <Kpi
          label={hasCross ? "Cross margin used" : "Isolated margin"}
          value={
            hasCross
              ? marginPct != null
                ? pctPlain(marginPct)
                : "—"
              : usd(isolatedMargin, 2)
          }
          tone={
            hasCross && marginPct != null
              ? marginPct > 70
                ? "down"
                : marginPct > 40
                  ? "warn"
                  : "up"
              : undefined
          }
          sub={hasCross ? "maintenance ÷ value" : "ring-fenced to positions"}
        />
      </div>

      {/* ── views ──────────────────────────────────────────── */}
      <div role="tablist" aria-label="Account views" className="flex gap-0.5 border-b border-line px-5 py-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            id={`tab-${t.key}`}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            aria-controls={`panel-${t.key}`}
            onClick={() => setTab(t.key)}
            className={cn(
              "figure ctl rounded-[3px] px-3 py-1.5 text-[11.5px] pointer-coarse:py-2.5",
              tab === t.key
                ? "bg-active text-ink"
                : "text-ink-3 hover:bg-raised hover:text-ink-2",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "activity" ? (
        <div id="panel-activity" role="tabpanel" aria-labelledby="tab-activity" className="p-5">
          <AccountActivity index={account.index} marketNames={marketNames} />
        </div>
      ) : (
        <div
          id="panel-positions"
          role="tabpanel"
          aria-labelledby="tab-positions"
          className="grid lg:grid-cols-[minmax(0,1fr)_360px]"
        >
          <div className="min-w-0 border-line p-5 lg:border-r">
            <SectionHeader
              title="Open positions"
              note={String(a.positions.length)}
            >
              <Figure className="text-[11px] text-ink-3">
                Notional {usdCompact(a.totalNotional)}
              </Figure>
            </SectionHeader>

            {a.positions.length === 0 ? (
              <Empty>No open positions on this account.</Empty>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[1000px] pr-1">
                  <div
                    className={cn(
                      "label grid items-center gap-x-4 border-b border-edge pt-1 pb-3",
                      COLS,
                    )}
                  >
                    <span>Market</span>
                    <span>Side</span>
                    <span className="text-right">Size / value</span>
                    <span className="text-right">Entry</span>
                    <span className="text-right">Mark</span>
                    <span className="text-right">Liq. price</span>
                    <span className="text-right">Distance to liquidation</span>
                    <span className="text-right">Funding</span>
                    <span className="text-right">PnL</span>
                    <span className="sr-only">Share</span>
                  </div>

                  {a.positions.map((p) => {
                    const d = p.liquidationDistance;
                    const tone =
                      d == null
                        ? "neutral"
                        : d < 0.15
                          ? "down"
                          : d < 0.3
                            ? "warn"
                            : "up";
                    const dText =
                      d == null
                        ? "text-ink-4"
                        : d < 0.15
                          ? "text-down"
                          : d < 0.3
                            ? "text-warn"
                            : "text-up";
                    return (
                      <div
                        key={`${p.marketId}-${p.symbol}`}
                        className={cn(
                          "row-hit grid items-center gap-x-4 border-b border-hair py-3",
                          COLS,
                        )}
                      >
                        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className="text-[13px] font-semibold">
                            {p.symbol}
                          </span>
                          {p.leverage > 0 && (
                            <Figure className="text-[9.5px] text-ink-3">
                              {p.leverage.toFixed(p.leverage < 10 ? 1 : 0)}×
                            </Figure>
                          )}
                          <Chip
                            tone={p.marginMode === "isolated" ? "warn" : "neutral"}
                          >
                            {p.marginMode === "isolated" ? "ISO" : "CROSS"}
                          </Chip>
                        </span>

                        <Figure
                          className={cn(
                            "text-[10.5px]",
                            p.side === "long" ? "text-up" : "text-down",
                          )}
                        >
                          {p.side.toUpperCase()}
                        </Figure>

                        <span className="flex flex-col items-end">
                          <Figure className="text-[12px]">
                            {num(p.size, p.size < 10 ? 4 : 2)}
                          </Figure>
                          <Figure className="text-[10.5px] text-ink-3">
                            {usd(p.valueUsd)}
                          </Figure>
                        </span>

                        <Figure className="text-right text-[12px] text-ink-2">
                          {price(p.entryPrice)}
                        </Figure>
                        <Figure className="text-right text-[12px]">
                          {price(p.markPrice)}
                        </Figure>

                        <span className="flex flex-col items-end">
                          <Figure
                            className={cn(
                              "text-[12px]",
                              p.liquidationPrice > 0 ? "text-warn" : "text-ink-4",
                            )}
                          >
                            {p.liquidationPrice > 0
                              ? price(p.liquidationPrice)
                              : "—"}
                          </Figure>
                          {p.liquidationEstimated && (
                            <Figure
                              className="text-[9px] text-ink-4"
                              title="Derived from entry price and margin fractions — the API did not report one"
                            >
                              est.
                            </Figure>
                          )}
                        </span>

                        <span className="flex items-center justify-end gap-2.5">
                          <MagnitudeBar
                            value={d != null ? Math.sqrt(Math.min(1, d / 0.5)) : 0}
                            max={1}
                            width={84}
                            height={4}
                            tone={tone}
                          />
                          <Figure
                            className={cn(
                              "w-[40px] text-right text-[11px]",
                              dText,
                            )}
                          >
                            {d != null ? pctPlain(d * 100) : "—"}
                          </Figure>
                        </span>

                        <Figure
                          className={cn(
                            "text-right text-[11.5px]",
                            p.fundingPaid > 0
                              ? "text-down"
                              : p.fundingPaid < 0
                                ? "text-up"
                                : "text-ink-4",
                          )}
                        >
                          {p.fundingPaid === 0
                            ? "—"
                            : usdSigned(-p.fundingPaid, 2)}
                        </Figure>

                        <span className="flex flex-col items-end">
                          <Figure
                            className={cn(
                              "text-[12.5px] font-medium",
                              p.unrealizedPnl >= 0 ? "text-up" : "text-down",
                            )}
                          >
                            {usdSigned(p.unrealizedPnl, 2)}
                          </Figure>
                          <Delta
                            value={p.returnPct}
                            glyph={false}
                            className="text-[10px]"
                          />
                        </span>

                        {/* padded so the button's enlarged hit area stays inside the row */}
                        <span className="flex justify-end pr-1.5">
                          <ShareCardButton position={p} account={shareLabel} />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── rail ─────────────────────────────────────────── */}
          <aside className="bg-rail p-5">
            <AccountHoldings account={a} />

            <div className="mt-5 border-t border-line pt-4">
              <Label className="mb-3">Margin health</Label>
              {marginPct != null ? (
                <>
                  <div className="relative mb-2 h-2 rounded-[2px] bg-hair">
                    <span
                      className={cn(
                        "block h-2 rounded-[2px]",
                        marginPct > 70
                          ? "bg-down"
                          : marginPct > 40
                            ? "bg-warn"
                            : "bg-up",
                      )}
                      style={{ width: `${Math.min(100, marginPct)}%` }}
                    />
                    <span
                      className="absolute top-[-3px] h-[14px] w-px bg-warn"
                      style={{ left: "70%" }}
                    />
                    <span
                      className="absolute top-[-3px] h-[14px] w-px bg-down"
                      style={{ left: "88%" }}
                    />
                  </div>
                  <div className="figure mb-4 flex justify-between text-[10px]">
                    <span className={marginPct > 70 ? "text-down" : "text-up"}>
                      {pctPlain(marginPct)} used
                    </span>
                    <span className="text-ink-4">warn 70 · liq 88</span>
                  </div>
                </>
              ) : (
                <p className="mb-4 text-[11.5px] leading-relaxed text-ink-3">
                  {a.positions.length === 0
                    ? "No open positions, so there is no margin in use."
                    : "Every position is isolated, so there is no account-level margin to track — risk sits per position, in distance to liquidation."}
                </p>
              )}

              <Rail label="Collateral" value={usd(a.collateral, 2)} />
              <Rail label="Available" value={usd(a.availableBalance, 2)} />
              {isolatedMargin > 0 && (
                <Rail label="Isolated margin" value={usd(isolatedMargin, 2)} />
              )}
              <Rail
                label="Maintenance req."
                value={usd(a.maintenanceMarginRequirement, 2)}
              />
              <Rail
                label="Initial req."
                value={usd(a.initialMarginRequirement, 2)}
              />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone,
  scale = "sm",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "up" | "down" | "warn";
  scale?: "hero" | "sm";
}) {
  return (
    <div className="px-5 py-4">
      <Label className="mb-2.5">{label}</Label>
      <Figure
        className={cn(
          "font-medium tracking-[-0.025em]",
          scale === "hero"
            ? "text-[26px] leading-none"
            : "text-[20px] leading-none",
          tone === "up"
            ? "text-up"
            : tone === "down"
              ? "text-down"
              : tone === "warn"
                ? "text-warn"
                : "text-ink",
        )}
      >
        {value}
      </Figure>
      {sub && <div className="figure mt-2 text-[10px] text-ink-3">{sub}</div>}
    </div>
  );
}

function Rail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-t border-hair py-2">
      <span className="text-[11.5px] text-ink-2">{label}</span>
      <Figure className="text-[11.5px]">{value}</Figure>
    </div>
  );
}
