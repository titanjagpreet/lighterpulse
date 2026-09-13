"use client";

import { useEffect, useRef, useState } from "react";
import { lighterSocket, type WsStatus } from "@/lib/lighter/ws";
import { num } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The pulse, made literal: block height ticking in the top bar.
 *
 * Server-renders the last known height so there is never an empty slot, then
 * the socket takes over. A changed value gets one quiet ink flash — never a
 * colour flash, because colour means direction everywhere else.
 */
export function LiveHeight({
  initial,
  className,
}: {
  initial?: number | null;
  className?: string;
}) {
  const [height, setHeight] = useState<number | null>(initial ?? null);
  const [status, setStatus] = useState<WsStatus>("closed");
  const [flash, setFlash] = useState(false);
  const prev = useRef<number | null>(initial ?? null);

  useEffect(() => {
    const sock = lighterSocket();
    const offStatus = sock.onStatus(setStatus);
    const off = sock.subscribe("height", (msg) => {
      const h = typeof msg.height === "number" ? msg.height : null;
      if (h == null || h === prev.current) return;
      prev.current = h;
      setHeight(h);
      setFlash(true);
      setTimeout(() => setFlash(false), 620);
    });
    return () => {
      off();
      offStatus();
    };
  }, []);

  const live = status === "open";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "inline-block size-[5px] shrink-0 rounded-full",
          live ? "bg-brand live-halo" : "bg-ink-5",
        )}
      />
      <span
        className={cn(
          "figure rounded-[2px] px-1 text-[10.5px] text-ink-3 tabular-nums",
          flash && "tick-flash",
        )}
        title={live ? "Live block height" : "Reconnecting to the Lighter stream"}
      >
        {height != null ? num(height) : "—"}
      </span>
    </div>
  );
}
