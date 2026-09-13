"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useWatchlist } from "@/lib/use-watchlist";
import {
  MAX_WATCHED_ACCOUNTS,
  useAccountWatchlist,
  type WatchedAccount,
} from "@/lib/use-account-watchlist";
import { useMarketStats, type LiveMarket } from "@/lib/lighter/use-market-stats";
import {
  AccountNotFound,
  fetchAccount,
  reprice,
  withPositions,
  type Account,
} from "@/lib/lighter/account";
import { WatchStar } from "./watchlist";
import { TokenIcon } from "./token-icon";
import { Delta, Figure, SectionHeader } from "./primitives";
import { addr, pctPlain, price, ratePct, usd, usdCompact, usdSigned } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface BoardMarket {
  marketId: number;
  symbol: string;
  markPrice: number;
  change24h: number;
  volume24h: number;
  oiUsd: number;
  funding: number | null;
  icon: string | null;
}

const MARKET_COLS =
  "grid-cols-[28px_minmax(110px,1fr)_minmax(96px,1fr)_minmax(64px,0.6fr)_minmax(96px,0.9fr)_minmax(96px,0.9fr)_minmax(84px,0.8fr)]";
const ACCOUNT_COLS =
  "grid-cols-[minmax(150px,1.3fr)_minmax(104px,1fr)_minmax(104px,1fr)_minmax(96px,0.9fr)_minmax(64px,0.5fr)_minmax(84px,0.7fr)_32px]";

/**
 * Markets and accounts the reader follows, from this browser's storage.
 * Prices come off the shared stream once, here, and are handed to every row —
 * a subscription per row would resubscribe the channel once per account.
 */
export function WatchlistBoard({ markets }: { markets: BoardMarket[] }) {
  const { ids, ready } = useWatchlist();
  const { accounts, remove, toggle, full, ready: accountsReady } = useAccountWatchlist();
  const { stats, live } = useMarketStats();
  const [nonce, setNonce] = useState(0);

  const byId = useMemo(() => new Map(markets.map((m) => [m.marketId, m])), [markets]);
  const marketRows = ids
    .map((id) => {
      const base = byId.get(id);
      const s = stats.get(id);
      if (!base && !s) return null;
      return {
        marketId: id,
        symbol: s?.symbol || base?.symbol || `#${id}`,
        markPrice: s?.markPrice || base?.markPrice || 0,
        change24h: s ? s.change24h : base?.change24h ?? 0,
        oiUsd: s?.oiUsd || base?.oiUsd || 0,
        volume24h: s?.volume24h || base?.volume24h || 0,
        funding: s?.funding ?? base?.funding ?? null,
        icon: base?.icon ?? null,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-panel px-5 py-4">
        <h1 className="text-[17px] font-semibold tracking-[-0.015em]">Watchlist</h1>
        {live && (
          <span className="flex items-center gap-1.5 rounded-[3px] border border-up-deep px-2 py-[3px]">
            <span className="size-[4.5px] rounded-full bg-brand live-halo" aria-hidden="true" />
            <Figure className="text-[10px] text-brand">live prices</Figure>
          </span>
        )}
        <p className="basis-full text-[12px] text-ink-3">
          Markets and accounts you follow. Saved in this browser only — there is no sign-in.
        </p>
      </div>

      {/* ── markets ────────────────────────────────────────── */}
      <section aria-labelledby="wl-markets" className="border-b border-line p-5">
        <SectionHeader title={<span id="wl-markets">Markets</span>} note={ready ? String(marketRows.length) : undefined} />
        {!ready ? (
          <div className="h-16" />
        ) : marketRows.length === 0 ? (
          <p className="py-6 text-[12px] text-ink-3">
            Star markets on the{" "}
            <Link href="/markets" className="text-ink-2 underline decoration-edge underline-offset-4 hover:text-ink">
              Markets
            </Link>{" "}
            page to follow them here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              <div className={cn("label grid items-center gap-x-4 border-b border-edge pt-1 pb-2.5", MARKET_COLS)}>
                <span />
                <span>Market</span>
                <span className="text-right">Mark</span>
                <span className="text-right">24h</span>
                <span className="text-right">Open interest</span>
                <span className="text-right">Volume 24h</span>
                <span className="text-right">Funding 8h</span>
              </div>
              {marketRows.map((m) => (
                <div
                  key={m.marketId}
                  className={cn(
                    "row-hit relative isolate grid items-center gap-x-4 border-b border-hair py-2.5",
                    MARKET_COLS,
                  )}
                >
                  <WatchStar marketId={m.marketId} symbol={m.symbol} />
                  {/* the symbol's overlay makes the whole row the link; the star sits above it */}
                  <Link
                    href={`/markets/${m.symbol}`}
                    className="flex min-w-0 items-center gap-2 text-[13px] font-semibold after:absolute after:inset-0 after:z-[1] hover:underline hover:decoration-edge hover:underline-offset-4"
                  >
                    <TokenIcon src={m.icon} symbol={m.symbol} size={16} />
                    <span className="truncate">{m.symbol}</span>
                  </Link>
                  <Figure className="text-right text-[12.5px]">{price(m.markPrice)}</Figure>
                  <Delta value={m.change24h} glyph={false} className="text-right text-[12px]" />
                  <Figure className="text-right text-[12px]">{usdCompact(m.oiUsd, 1)}</Figure>
                  <Figure className="text-right text-[12px] text-ink-2">{usdCompact(m.volume24h, 1)}</Figure>
                  <Figure
                    className={cn(
                      "text-right text-[12px]",
                      m.funding == null ? "text-ink-4" : m.funding >= 0 ? "text-up" : "text-down",
                    )}
                  >
                    {m.funding == null ? "—" : ratePct(m.funding)}
                  </Figure>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── accounts ───────────────────────────────────────── */}
      <section aria-labelledby="wl-accounts" className="p-5">
        <SectionHeader
          title={<span id="wl-accounts">Accounts</span>}
          note={accountsReady ? `${accounts.length} of ${MAX_WATCHED_ACCOUNTS}` : undefined}
        >
          {accounts.length > 0 && (
            <button
              type="button"
              onClick={() => setNonce((n) => n + 1)}
              className="ctl figure rounded-[3px] border border-edge px-2.5 py-1 text-[10.5px] text-ink-2 hover:text-ink"
            >
              Refresh
            </button>
          )}
        </SectionHeader>

        <AddAccount disabled={full} onAdd={(entry) => toggle(entry)} existing={accounts} />

        {!accountsReady ? (
          <div className="h-16" />
        ) : accounts.length === 0 ? (
          <p className="py-6 text-[12px] text-ink-3">
            Open any account and press Watch, or add one above by address or index.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <div className="min-w-[760px]">
              <div className={cn("label grid items-center gap-x-4 border-b border-edge pt-1 pb-2.5", ACCOUNT_COLS)}>
                <span>Account</span>
                <span className="text-right">Value</span>
                <span className="text-right">Unrealised PnL</span>
                <span className="text-right">Notional</span>
                <span className="text-right">Positions</span>
                <span className="text-right">Margin used</span>
                <span />
              </div>
              {accounts.map((entry, i) => (
                <AccountRow
                  key={entry.index}
                  entry={entry}
                  order={i}
                  nonce={nonce}
                  stats={stats}
                  onRemove={() => remove(entry.index)}
                />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function AddAccount({
  disabled,
  existing,
  onAdd,
}: {
  disabled: boolean;
  existing: WatchedAccount[];
  onAdd: (entry: WatchedAccount) => void;
}) {
  const [q, setQ] = useState("");
  const [state, setState] = useState<"idle" | "checking" | "invalid" | "notfound" | "failed" | "exists">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    if (!/^(0x[a-fA-F0-9]{40}|\d{1,16})$/.test(v)) return setState("invalid");
    setState("checking");
    try {
      const account = await fetchAccount(v);
      if (existing.some((a) => a.index === account.index)) return setState("exists");
      onAdd({ index: account.index, address: account.address });
      setQ("");
      setState("idle");
    } catch (err) {
      setState(err instanceof AccountNotFound ? "notfound" : "failed");
    }
  };

  const message = {
    idle: null,
    checking: "Looking it up…",
    invalid: "Enter a 0x address or an account index.",
    notfound: "No Lighter account found for that.",
    failed: "Lighter's API did not answer. Try again.",
    exists: "Already on your watchlist.",
  }[state];

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <label className="flex w-full items-center rounded-[3px] border border-edge bg-raised px-2.5 focus-within:border-ink-4 sm:w-[380px]">
        <span className="sr-only">Account address or index</span>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (state !== "checking") setState("idle");
          }}
          placeholder="0x address or account index"
          disabled={disabled}
          className="figure w-full bg-transparent py-1.5 text-[12px] text-ink outline-none placeholder:text-ink-4 disabled:opacity-50 pointer-coarse:py-2.5"
        />
      </label>
      <button
        type="submit"
        disabled={disabled || state === "checking" || !q.trim()}
        className="ctl figure rounded-[3px] border border-edge px-3 py-1.5 text-[11px] text-ink-2 hover:text-ink disabled:pointer-events-none disabled:opacity-40 pointer-coarse:py-2.5"
      >
        Add account
      </button>
      <span role="status" className="figure text-[10.5px] text-ink-3">
        {disabled ? `Your watchlist holds up to ${MAX_WATCHED_ACCOUNTS} accounts.` : message}
      </span>
    </form>
  );
}

function AccountRow({
  entry,
  order,
  nonce,
  stats,
  onRemove,
}: {
  entry: WatchedAccount;
  order: number;
  nonce: number;
  stats: Map<number, LiveMarket>;
  onRemove: () => void;
}) {
  const [account, setAccount] = useState<Account | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    let alive = true;
    setState((s) => (s === "ready" ? s : "loading"));
    // Stagger the lookups so a full list does not land as one burst.
    const timer = setTimeout(() => {
      fetchAccount(String(entry.index))
        .then((a) => {
          if (!alive) return;
          setAccount(a);
          setState("ready");
        })
        .catch(() => alive && setState("failed"));
    }, order * 150);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [entry.index, nonce, order]);

  const view = useMemo(
    () =>
      account
        ? withPositions(
            account,
            account.positions.map((p) => reprice(p, stats.get(p.marketId)?.markPrice ?? p.markPrice)),
          )
        : null,
    [account, stats],
  );

  const label = entry.address ? addr(entry.address, 8, 6) : `#${entry.index}`;
  const margin = view?.marginUsage != null && view.maintenanceMarginRequirement > 0 ? view.marginUsage * 100 : null;

  return (
    <div className={cn("row-hit grid items-center gap-x-4 border-b border-hair py-2.5", ACCOUNT_COLS)}>
      <span className="flex min-w-0 flex-col">
        <Link
          href={`/a/${entry.address || entry.index}`}
          className="figure truncate text-[12px] hover:underline hover:decoration-edge hover:underline-offset-4"
        >
          {label}
        </Link>
        <Figure className="text-[9.5px] text-ink-4">#{entry.index}</Figure>
      </span>
      {view ? (
        <>
          <Figure className="text-right text-[12.5px]">{usd(view.totalValue, 0)}</Figure>
          <Figure
            className={cn(
              "text-right text-[12px]",
              view.totalUnrealizedPnl >= 0 ? "text-up" : "text-down",
            )}
          >
            {usdSigned(view.totalUnrealizedPnl)}
          </Figure>
          <Figure className="text-right text-[12px] text-ink-2">{usdCompact(view.totalNotional, 1)}</Figure>
          <Figure className="text-right text-[12px] text-ink-2">{view.positions.length}</Figure>
          <Figure
            className={cn(
              "text-right text-[12px]",
              margin == null ? "text-ink-4" : margin > 70 ? "text-down" : margin > 40 ? "text-warn" : "text-ink-2",
            )}
          >
            {margin == null ? "—" : pctPlain(margin)}
          </Figure>
        </>
      ) : (
        <Figure className="col-span-5 text-right text-[11px] text-ink-3">
          {state === "failed" ? "could not load" : "loading…"}
        </Figure>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Stop watching ${label}`}
        title="Remove"
        className="ctl -m-1 grid size-7 place-items-center justify-self-end rounded-[3px] text-ink-4 hover:bg-raised hover:text-ink pointer-coarse:size-9"
      >
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
