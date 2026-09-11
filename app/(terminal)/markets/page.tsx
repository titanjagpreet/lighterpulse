import type { Metadata } from "next";
import { MarketsTable } from "@/components/terminal/markets-table";
import { FundingClock } from "@/components/terminal/funding-clock";
import {
  AsOf,
  Figure,
  Label,
  MagnitudeBar,
} from "@/components/terminal/primitives";
import { getMarkets, summarise } from "@/lib/lighter/markets";
import { ASSET_CLASS_LABEL } from "@/lib/lighter/types";
import { num, usdCompact } from "@/lib/format";

export const revalidate = 15;

export const metadata: Metadata = {
  title: "Markets",
  description:
    "Every Lighter market — open interest, mark against index, day range, funding and max leverage. Crypto, equities, indices, commodities and FX.",
};

export default async function MarketsPage() {
  const cached = await getMarkets();
  const markets = cached.data;
  const s = summarise(markets);

  return (
    <div>
      {/* ── summary band ───────────────────────────────────── */}
      <div className="grid border-b border-line bg-panel lg:grid-cols-[300px_minmax(0,1fr)_300px]">
        <div className="border-line px-5 py-4 lg:border-r">
          <Label className="mb-2.5">Volume 24h</Label>
          <Figure className="text-[28px] leading-none font-medium tracking-[-0.028em]">
            {usdCompact(s.totalVolume)}
          </Figure>
          <div className="figure mt-2 text-[10.5px] text-ink-3">
            {num(s.totalTrades)} trades
          </div>
        </div>

        <div className="border-line px-5 py-4 lg:border-r">
          <div className="mb-3 flex items-baseline">
            <Label>By asset class</Label>
            <div className="grow" />
            <span className="figure text-[10px] text-ink-3">
              {s.activeCount} of {s.count} active
            </span>
          </div>
          <div className="mb-2.5 flex h-2 gap-[1.5px]">
            {s.byClass.map((c, i) => (
              <div
                key={c.key}
                className={
                  [
                    "bg-brand",
                    "bg-info",
                    "bg-warn",
                    "bg-ink-3",
                    "bg-ink-4",
                    "bg-ink-5",
                  ][i] ?? "bg-ink-5"
                }
                style={{
                  width: `${(c.volume / (s.totalVolume || 1)) * 100}%`,
                  borderRadius:
                    i === 0
                      ? "2px 0 0 2px"
                      : i === s.byClass.length - 1
                        ? "0 2px 2px 0"
                        : undefined,
                }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            {s.byClass.map((c, i) => (
              <span key={c.key} className="flex items-center gap-1.5">
                <span
                  className={`size-[7px] rounded-[2px] ${
                    [
                      "bg-brand",
                      "bg-info",
                      "bg-warn",
                      "bg-ink-3",
                      "bg-ink-4",
                      "bg-ink-5",
                    ][i] ?? "bg-ink-5"
                  }`}
                  aria-hidden="true"
                />
                <span className="figure text-[10.5px] text-ink-2">
                  {ASSET_CLASS_LABEL[c.key]} {usdCompact(c.volume, 1)}
                </span>
              </span>
            ))}
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="mb-2.5 flex items-baseline gap-3">
            <Label>Next funding</Label>
            <span className="figure text-[10px] text-ink-4">8h cycle</span>
          </div>
          <FundingClock />
          <div className="mt-2">
            <AsOf age={cached.age} stale={cached.stale} />
          </div>
        </div>
      </div>

      {/* ── open interest distribution ─────────────────────── */}
      <div className="border-b border-line px-5 py-3.5">
        <div className="mb-2.5 flex items-baseline gap-3">
          <Label>Open interest</Label>
          <Figure className="text-[13px] font-medium">
            {usdCompact(s.totalOi)}
          </Figure>
          <span className="figure text-[10px] text-ink-4">
            both sides · top 12 markets
          </span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {markets.slice(0, 12).map((m) => (
            <span key={m.marketId} className="flex items-center gap-2">
              <span className="text-[11.5px] font-medium">{m.symbol}</span>
              <MagnitudeBar
                value={m.oiUsd}
                max={markets[0]?.oiUsd ?? 1}
                width={44}
                height={3}
                align="left"
              />
              <Figure className="text-[10.5px] text-ink-3">
                {usdCompact(m.oiUsd, 1)}
              </Figure>
            </span>
          ))}
        </div>
      </div>

      <MarketsTable initial={markets} />
    </div>
  );
}
