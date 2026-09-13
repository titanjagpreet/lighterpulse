"use client";

import { useAccountWatchlist } from "@/lib/use-account-watchlist";
import { cn } from "@/lib/utils";

/** Watch toggle for an account page. State, not emphasis — ink, never a colour. */
export function WatchAccountButton({
  index,
  address,
  className,
}: {
  index: number;
  address: string;
  className?: string;
}) {
  const { has, toggle, ready, full } = useAccountWatchlist();
  const on = ready && has(index);
  const blocked = ready && !on && full;

  return (
    <button
      type="button"
      onClick={() => toggle({ index, address })}
      disabled={blocked}
      aria-pressed={on}
      title={
        blocked
          ? "Your watchlist is full — remove an account first"
          : on
            ? "Watching — saved in this browser"
            : "Add to your watchlist"
      }
      className={cn(
        "ctl figure flex items-center gap-1.5 rounded-[3px] border px-2 py-[3px] text-[10px] disabled:opacity-40 pointer-coarse:px-3 pointer-coarse:py-2",
        on ? "border-edge bg-raised text-ink" : "border-edge text-ink-3 hover:text-ink",
        className,
      )}
    >
      <svg width="10" height="10" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M8 1.6l1.95 4.02 4.43.62-3.22 3.1.78 4.4L8 11.66l-3.94 2.08.78-4.4-3.22-3.1 4.43-.62z"
          fill={on ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
      {on ? "Watching" : "Watch"}
    </button>
  );
}
