/**
 * The leaderboard is the one terminal screen rendered per request (its
 * window and sort live in the URL), so navigating to it waits on the API.
 * Without this, a click appeared to do nothing for a second or two.
 */
export default function LeaderboardLoading() {
  return (
    <div aria-busy="true" aria-label="Loading leaderboard">
      <div className="flex flex-wrap items-end gap-x-10 gap-y-5 border-b border-line px-5 py-5">
        <div>
          <h1 className="mb-1.5 text-[24px] font-semibold tracking-[-0.02em]">Leaderboard</h1>
          <p className="figure text-[11.5px] text-ink-4">Ranking accounts…</p>
        </div>
      </div>
      <div className="px-5 pt-3.5">
        <div className="h-[18px] border-b border-edge" />
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="flex h-[45px] items-center gap-6 border-b border-hair">
            <span className="h-[9px] w-[18px] animate-pulse rounded-[2px] bg-raised" />
            <span className="h-[9px] w-[220px] animate-pulse rounded-[2px] bg-raised" />
            <span className="grow" />
            <span className="h-[9px] w-[110px] animate-pulse rounded-[2px] bg-raised" />
            <span className="hidden h-[9px] w-[110px] animate-pulse rounded-[2px] bg-raised sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
