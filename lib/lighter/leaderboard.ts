import "server-only";
import { api } from "./client";
import { cached, type Cached } from "../cache";
import { n } from "../format";
import type { LeaderboardEntry } from "./types";

export type LeaderWindow = "24h" | "7d" | "30d" | "all";
export type LeaderSort = "pnl" | "roi" | "volume" | "account_value";

export const LEADER_WINDOWS: LeaderWindow[] = ["24h", "7d", "30d", "all"];
export const LEADER_SORTS: { key: LeaderSort; label: string }[] = [
  { key: "pnl", label: "PnL" },
  { key: "roi", label: "Return" },
  { key: "volume", label: "Volume" },
  { key: "account_value", label: "Value" },
];

export function isWindow(v: string): v is LeaderWindow {
  return (LEADER_WINDOWS as string[]).includes(v);
}
export function isSort(v: string): v is LeaderSort {
  return LEADER_SORTS.some((s) => s.key === v);
}

interface RawEntry {
  rank: number;
  l1_address: string;
  account_value: number | string;
  pnl: number | string;
  roi: number | string;
  volume: number | string;
}

export interface Leaderboard {
  entries: LeaderboardEntry[];
  total: number;
  updatedAt: number | null;
}

async function fetchLeaderboard(
  window: LeaderWindow,
  sort: LeaderSort,
  limit: number,
  index: number,
): Promise<Leaderboard> {
  const res = await api<{
    entries: RawEntry[];
    total?: number;
    updated_at?: number;
  }>("pnlLeaderboard", {
    time_window: window,
    sort_by: sort,
    sort_dir: "desc",
    index,
    limit,
  });

  return {
    entries: (res.entries ?? []).map((e) => ({
      rank: e.rank,
      address: e.l1_address,
      accountValue: n(e.account_value),
      pnl: n(e.pnl),
      // The API reports ROI as a percentage already.
      roi: n(e.roi),
      volume: n(e.volume),
    })),
    total: n(res.total),
    updatedAt: res.updated_at ? n(res.updated_at) : null,
  };
}

export function getLeaderboard(
  window: LeaderWindow = "24h",
  sort: LeaderSort = "pnl",
  limit = 50,
  index = 0,
): Promise<Cached<Leaderboard>> {
  // The default view is what the landing and overview read, so it stays hot;
  // the other fifteen combinations are browsed rarely and can sit longer.
  const hot = window === "24h" && sort === "pnl" && index === 0;
  return cached(
    `leaderboard:${window}:${sort}:${index}:${limit}`,
    hot ? 60 : 300,
    () => fetchLeaderboard(window, sort, limit, index),
  );
}
