"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** Copy a value to the clipboard. The icon turns into "copied" for a moment. */
export function CopyButton({
  value,
  label = "Copy",
  className,
}: {
  value: string;
  /** Accessible name, e.g. "Copy address". */
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — nothing to do */
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      title={label}
      className={cn(
        "ctl -m-2 grid size-8 shrink-0 place-items-center text-ink-3 hover:text-ink",
        className,
      )}
    >
      {copied ? (
        <span className="figure text-[10px] text-up" role="status">
          copied
        </span>
      ) : (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M10.5 5.5V3.5A1.5 1.5 0 0 0 9 2H3.5A1.5 1.5 0 0 0 2 3.5V9a1.5 1.5 0 0 0 1.5 1.5h2"
            stroke="currentColor"
            strokeWidth="1.4"
          />
        </svg>
      )}
    </button>
  );
}
