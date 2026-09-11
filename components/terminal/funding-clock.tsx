"use client";

import { useEffect, useState } from "react";
import { clock, secondsToNextFunding } from "@/lib/format";
import { Figure } from "./primitives";
import { cn } from "@/lib/utils";

/**
 * Countdown to the next 8h funding boundary (00:00, 08:00, 16:00 UTC).
 *
 * Rendered empty on the server and filled on mount — a server-rendered
 * countdown would be wrong the moment it was cached.
 */
export function FundingClock({ className }: { className?: string }) {
  const [secs, setSecs] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setSecs(secondsToNextFunding());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Figure
      className={cn(
        "text-[28px] leading-none font-medium tracking-[-0.028em]",
        secs != null && secs < 300 ? "text-warn" : "text-ink",
        className,
      )}
    >
      {secs != null ? clock(secs) : "--:--:--"}
    </Figure>
  );
}
