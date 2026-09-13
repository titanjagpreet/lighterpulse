"use client";

import { setMultipliers } from "@/lib/lighter/multiplier";

/**
 * Hands the markets' unit multipliers to the browser. Renders nothing.
 *
 * Set during render rather than in an effect, so the registry is filled
 * before any child subscribes to the stream. It is idempotent, so a repeat
 * render does no harm.
 */
export function MarketUnits({ multipliers }: { multipliers: Record<number, number> }) {
  if (typeof window !== "undefined") setMultipliers(multipliers);
  return null;
}
