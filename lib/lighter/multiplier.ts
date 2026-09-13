/**
 * Lighter's "real" and "display" units.
 *
 * Every market carries a `multiplier`. Prices and sizes on the wire are real
 * units; a reader sees display units:
 *
 *   display_price = real_price ÷ multiplier
 *   display_size  = real_size  × multiplier
 *
 * USD values (notional, open interest from the stream, volume in quote) are
 * unchanged by it. Every market in use today has a multiplier of 1 (checked
 * 12 Sep 2026), so each conversion here is currently the identity — this is
 * the guard for the day Lighter lists one that isn't.
 *
 * Isomorphic. The server converts REST data from `orderBookDetails` directly;
 * the browser learns the multipliers from the terminal layout before any
 * stream data arrives.
 */

const registry = new Map<number, number>();

/** Only the markets whose multiplier is not 1 — usually none. */
export function multipliersFrom(
  books: { market_id: number; multiplier?: string | number | null }[],
): Record<number, number> {
  const out: Record<number, number> = {};
  for (const b of books) {
    const m = Number(b.multiplier);
    if (Number.isFinite(m) && m > 0 && m !== 1) out[b.market_id] = m;
  }
  return out;
}

export function setMultipliers(map: Record<number, number>): void {
  registry.clear();
  for (const [id, m] of Object.entries(map)) {
    if (Number.isFinite(m) && m > 0 && m !== 1) registry.set(Number(id), m);
  }
}

export function multiplierOf(marketId: number | null | undefined): number {
  return marketId == null ? 1 : (registry.get(marketId) ?? 1);
}

/** A wire price as the price a reader sees. */
export function displayPrice(marketId: number | null | undefined, real: number): number {
  return real / multiplierOf(marketId);
}

/** A wire size as the size a reader sees. */
export function displaySize(marketId: number | null | undefined, real: number): number {
  return real * multiplierOf(marketId);
}
