"use client";

import { Segmented } from "./primitives";
import { cn } from "@/lib/utils";

export const PAGE_SIZES = [25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

/**
 * Previous / next paging with a page-size choice. Built for sources that do
 * not report a total — the explorer does not — so it offers "next" only while
 * the last page came back full.
 */
export function Pager({
  page,
  pageSize,
  hasMore,
  loading = false,
  onPage,
  onPageSize,
  className,
}: {
  /** Zero-based. */
  page: number;
  pageSize: PageSize;
  hasMore: boolean;
  loading?: boolean;
  onPage: (page: number) => void;
  onPageSize?: (size: PageSize) => void;
  className?: string;
}) {
  const btn =
    "ctl figure rounded-[3px] border border-edge px-2.5 py-1 text-[10.5px] text-ink-2 hover:text-ink disabled:pointer-events-none disabled:opacity-40 pointer-coarse:px-3.5 pointer-coarse:py-2";
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {onPageSize && (
        <div className="flex items-center gap-2">
          <span className="label">Rows</span>
          <Segmented
            options={PAGE_SIZES.map((s) => ({ key: String(s), label: s }))}
            value={String(pageSize)}
            onChange={(k) => onPageSize(Number(k) as PageSize)}
          />
        </div>
      )}
      <div className="grow" />
      <button
        type="button"
        className={btn}
        disabled={page === 0 || loading}
        onClick={() => onPage(page - 1)}
      >
        ‹ Newer
      </button>
      <span className="figure text-[10.5px] text-ink-3" aria-live="polite">
        {loading ? "loading…" : `page ${page + 1}`}
      </span>
      <button
        type="button"
        className={btn}
        disabled={!hasMore || loading}
        onClick={() => onPage(page + 1)}
      >
        Older ›
      </button>
    </div>
  );
}
