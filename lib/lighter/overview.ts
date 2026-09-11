import "server-only";
import { cached, type Cached } from "../cache";
import { getMarkets, summarise, type MarketSummary } from "./markets";
import { getMetric, currentTps, last, sum, mean } from "./metrics";
import { getExplorerTotals } from "./explorer";
import { getLeaderboard } from "./leaderboard";
import type { LeaderboardEntry, Market, MetricPoint } from "./types";

/**
 * The composite the Landing and Overview both render from. Assembling it here
 * means a page does one pass instead of six, and every part degrades on its
 * own — a failed sub-fetch leaves that field null rather than blanking the page.
 */

export interface SinceGenesis {
  volume: number | null;
  revenue: number | null;
  trades: number | null;
  accounts: number | null;
  activeAccounts: number | null;
}

export interface OverviewData {
  markets: Market[];
  summary: MarketSummary;

  openInterest: number | null;
  oiChangePct: number | null;
  oiChangeAbs: number | null;
  oiSeries: MetricPoint[];

  volume24h: number | null;
  volumeVs7dPct: number | null;
  volumeSeries: MetricPoint[];

  tps: number | null;
  liquidations24h: number | null;

  totalAccounts: number | null;
  newAccounts24h: number | null;

  leaders: LeaderboardEntry[];
  genesis: SinceGenesis;
}

/** Sum an "all"-period series once and hold it — these barely move. */
async function genesisTotals(): Promise<SinceGenesis> {
  const grab = async (kind: Parameters<typeof getMetric>[0]) => {
    try {
      return (await getMetric(kind, "all")).data;
    } catch {
      return null;
    }
  };

  const [volume, maker, taker, liq, trades, accounts, active] =
    await Promise.all([
      grab("volume"),
      grab("maker_fee"),
      grab("taker_fee"),
      grab("liquidation_fee"),
      grab("trade_count"),
      grab("account_count"),
      grab("active_account_count"),
    ]);

  const fees =
    maker || taker || liq
      ? sum(maker ?? []) + sum(taker ?? []) + sum(liq ?? [])
      : null;

  return {
    volume: volume ? sum(volume) : null,
    revenue: fees,
    trades: trades ? sum(trades) : null,
    // account_count is new accounts per day; the running total is the sum.
    accounts: accounts ? sum(accounts) : null,
    activeAccounts: active ? last(active) : null,
  };
}

export const getGenesisTotals = () =>
  cached("genesis", 60 * 60, genesisTotals);

/** Assemble the composite from its parts. Only runs on a cache miss. */
async function buildOverview(): Promise<OverviewData> {
  const settle = async <T>(p: Promise<T>): Promise<T | null> => {
    try {
      return await p;
    } catch (err) {
      console.error("[overview] sub-fetch failed", err);
      return null;
    }
  };

  const [marketsC, oiC, volC, tpsC, liqC, totalsC, leadersC, genesisC] =
    await Promise.all([
      getMarkets(),
      settle(getMetric("open_interest", "w")),
      settle(getMetric("volume", "w")),
      settle(getMetric("tps", "h")),
      settle(getMetric("liquidation_volume", "w")),
      settle(getExplorerTotals()),
      settle(getLeaderboard("24h", "pnl", 5)),
      settle(getGenesisTotals()),
    ]);

  // Daily new-account counts; the last bucket is "signed up today".
  const newAccounts = await settle(getMetric("account_count", "w"));

  const markets = marketsC.data;
  const summary = summarise(markets);

  const oiSeries = oiC?.data ?? [];
  const volSeries = volC?.data ?? [];

  // Prefer the exchange's own open-interest figure; fall back to summing the
  // book if the metric call failed. Both use the two-sided convention.
  const openInterest = last(oiSeries) ?? summary.totalOi;

  const oiPrev = oiSeries.length >= 2 ? oiSeries[oiSeries.length - 2].v : null;
  const oiChangeAbs = oiPrev != null ? openInterest - oiPrev : null;
  const oiChangePct =
    oiPrev && oiPrev !== 0 ? ((openInterest - oiPrev) / oiPrev) * 100 : null;

  // The live 24h figure from the book is fresher than the daily metric bucket.
  const volume24h = summary.totalVolume || last(volSeries);
  const vol7dMean = volSeries.length ? mean(volSeries) : null;
  const volumeVs7dPct =
    vol7dMean && vol7dMean !== 0 && volume24h != null
      ? ((volume24h - vol7dMean) / vol7dMean) * 100
      : null;

  return {
    markets,
    summary,

    openInterest,
    oiChangePct,
    oiChangeAbs,
    oiSeries,

    volume24h,
    volumeVs7dPct,
    volumeSeries: volSeries,

    tps: tpsC ? currentTps(tpsC.data) : null,
    liquidations24h: liqC ? last(liqC.data) : null,

    totalAccounts: totalsC?.data.accounts ?? null,
    newAccounts24h: newAccounts ? last(newAccounts.data) : null,

    leaders: leadersC?.data.entries ?? [],
    genesis:
      genesisC?.data ??
      {
        volume: null,
        revenue: null,
        trades: null,
        accounts: null,
        activeAccounts: null,
      },
  };
}

/**
 * One Redis read for the whole screen.
 *
 * Assembling this from ten individual keys on every render meant ten Upstash
 * round trips per request, which dominated response time. The composite is
 * built once per TTL and read back in a single GET.
 */
export const getOverview = (): Promise<Cached<OverviewData>> =>
  cached("overview", 15, buildOverview);
