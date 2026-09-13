import { IntentLink } from "@/components/terminal/intent-link";
import type { Metadata } from "next";
import {
  AsOf,
  Delta,
  Figure,
  Label,
} from "@/components/terminal/primitives";
import {
  getLeaderboard,
  isSort,
  isWindow,
  LEADER_SORTS,
  LEADER_WINDOWS,
  type LeaderSort,
  type LeaderWindow,
} from "@/lib/lighter/leaderboard";
import { getExplorerTotals } from "@/lib/lighter/explorer";
import { addr, num, usd, usdSigned } from "@/lib/format";
import { cn } from "@/lib/utils";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Lighter Leaderboard — Top Traders by PnL",
  description:
    "The Lighter leaderboard: every account ranked by PnL, return, volume or account value — over 24 hours, a week, a month or all time.",
  alternates: { canonical: "/leaderboard" },
};

const WINDOW_LABEL: Record<LeaderWindow, string> = {
  "24h": "24h",
  "7d": "7d",
  "30d": "30d",
  all: "All",
};

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const window: LeaderWindow =
    sp.window && isWindow(sp.window) ? sp.window : "24h";
  const sort: LeaderSort = sp.sort && isSort(sp.sort) ? sp.sort : "pnl";

  const [board, totals] = await Promise.all([
    getLeaderboard(window, sort, 100),
    getExplorerTotals().catch(() => null),
  ]);

  const entries = board.data.entries;
  const href = (w: LeaderWindow, s: LeaderSort) =>
    `/leaderboard?window=${w}&sort=${s}`;

  return (
    <div>
      {/* ── controls ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-x-10 gap-y-5 border-b border-line px-5 py-5">
        <div>
          <h1 className="mb-1.5 text-[24px] font-semibold tracking-[-0.02em]">
            Leaderboard
          </h1>
          <p className="figure flex items-center gap-2.5 text-[11.5px] text-ink-3">
            {totals?.data.accounts != null
              ? `${num(totals.data.accounts)} accounts ranked`
              : "Accounts ranked"}
            <span className="text-ink-5">·</span>
            <AsOf asOf={board.asOf} ttl={board.ttl} source={board.source} />
          </p>
        </div>

        <div className="grow" />

        <div className="flex flex-col gap-2">
          <Label>Window</Label>
          <div className="flex gap-1">
            {LEADER_WINDOWS.map((w) => (
              <IntentLink
                key={w}
                href={href(w, sort)}
                aria-current={w === window ? "true" : undefined}
                className={cn(
                  "figure ctl rounded-[3px] border px-3.5 py-1.5 text-[11.5px]",
                  w === window
                    ? "border-edge bg-active font-medium text-ink"
                    : "border-edge text-ink-2 hover:text-ink",
                )}
              >
                {WINDOW_LABEL[w]}
              </IntentLink>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Rank by</Label>
          <div className="flex gap-1">
            {LEADER_SORTS.map((s) => (
              <IntentLink
                key={s.key}
                href={href(window, s.key)}
                aria-current={s.key === sort ? "true" : undefined}
                className={cn(
                  "figure ctl rounded-[3px] border px-3.5 py-1.5 text-[11.5px]",
                  s.key === sort
                    ? "border-edge bg-active font-medium text-ink"
                    : "border-edge text-ink-2 hover:text-ink",
                )}
              >
                {s.label}
              </IntentLink>
            ))}
          </div>
        </div>
      </div>

      {/* ── table ──────────────────────────────────────────── */}
      <div className="overflow-x-auto px-5">
        <div className="min-w-[880px]">
          <div className="label grid grid-cols-[56px_minmax(0,1fr)_168px_168px_116px_168px] items-center border-b border-edge pt-3.5 pb-2.5">
            <span>Rank</span>
            <span>Account</span>
            <span className="text-right">Account value</span>
            <span className="text-right">PnL {WINDOW_LABEL[window]}</span>
            <span className="text-right">Return</span>
            <span className="text-right">Volume</span>
          </div>

          {entries.map((e) => (
            <IntentLink
              key={`${e.rank}-${e.address}`}
              href={`/a/${e.address}`}
              className={cn(
                "row-hit grid grid-cols-[56px_minmax(0,1fr)_168px_168px_116px_168px] items-center border-b border-hair py-3",
                e.rank === 1 && "bg-panel",
              )}
            >
              <Figure
                className={cn(
                  "text-[13px]",
                  e.rank === 1 ? "font-bold text-ink" : "text-ink-3",
                )}
              >
                {e.rank}
              </Figure>
              <Figure className="text-[13px]">{addr(e.address)}</Figure>
              <Figure className="text-right text-[13px]">
                {usd(e.accountValue)}
              </Figure>
              <Figure
                className={cn(
                  "text-right text-[13.5px] font-medium",
                  e.pnl >= 0 ? "text-up" : "text-down",
                )}
              >
                {usdSigned(e.pnl)}
              </Figure>
              <Delta
                value={e.roi}
                glyph={false}
                className="text-right text-[13px]"
              />
              <Figure className="text-right text-[13px] text-ink-2">
                {usd(e.volume)}
              </Figure>
            </IntentLink>
          ))}

          {entries.length === 0 && (
            <p className="py-14 text-center text-[12.5px] text-ink-3">
              The leaderboard is unavailable right now.
            </p>
          )}
        </div>
      </div>

      <p className="figure px-5 py-5 text-[10.5px] text-ink-4">
        Showing {entries.length}
        {board.data.total ? ` of ${num(board.data.total)}` : ""} · click any row
        for the full book
      </p>
    </div>
  );
}
