"use client";

import { useEffect, useState } from "react";
import { useLiquidationFeed } from "@/lib/lighter/use-liquidations";
import { Figure, Label, MetricCell, SplitBar } from "./primitives";
import { TimeAgo } from "./as-of";
import { num, pctPlain, usd, usdCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

type Markets = { marketId: number; symbol: string }[];

function useFlash(trigger: number | null) {
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (trigger == null) return;
    setFlash(true);
    const id = setTimeout(() => setFlash(false), 620);
    return () => clearTimeout(id);
  }, [trigger]);
  return flash;
}

/**
 * The headline, plus what has happened since.
 *
 * `exchangeMetrics` only publishes completed UTC days, so the headline is the
 * last full day — labelled as such. What lands while the page is open ticks
 * beneath it rather than being added on top, which would blend two different
 * windows into one number that describes neither.
 */
export function LiveLiquidationStat({
  markets,
  base,
  baseCount,
  baseDay,
}: {
  markets: Markets;
  base: number | null;
  baseCount: number | null;
  /** Label for the day `base` covers, e.g. "Sep 10". */
  baseDay: string | null;
}) {
  const { session, live, lastAt } = useLiquidationFeed(markets);
  const flash = useFlash(lastAt);

  return (
    <MetricCell
      label={
        <span className="flex items-center gap-2">
          Liquidated · last full day
          {baseDay && <span className="text-ink-4">{baseDay} UTC</span>}
        </span>
      }
      value={usdCompact(base, 2)}
      scale="hero"
      tone="down"
      sub={baseCount != null ? `${num(baseCount)} events` : undefined}
    >
      <div className="mt-3 flex items-center gap-2 border-t border-hair pt-2.5">
        <span
          aria-hidden="true"
          className={cn(
            "inline-block size-[4.5px] shrink-0 rounded-full",
            live ? "bg-down" : "bg-ink-5",
          )}
        />
        <span
          className={cn(
            "figure rounded-[2px] px-1 text-[12px]",
            session.count > 0 ? "text-down" : "text-ink-3",
            flash && "tick-flash",
          )}
        >
          {session.count > 0 ? `+${usd(session.usd)}` : live ? "$0" : "—"}
        </span>
        <span className="figure text-[10.5px] text-ink-3">
          {session.count > 0
            ? `${num(session.count)} ${session.count === 1 ? "event" : "events"} since you opened this page`
            : live
              ? "since you opened this page"
              : "connecting to the stream"}
        </span>
      </div>
    </MetricCell>
  );
}

/**
 * The rail: a rolling tape plus what the session adds up to.
 *
 * The tape opens with each market's recent history, so it is never blank;
 * the session panel counts only what arrives live.
 */
export function LiquidationTape({ markets }: { markets: Markets }) {
  const { rows, session, live, lastAt } = useLiquidationFeed(markets);
  const flash = useFlash(lastAt);

  const sided = session.longUsd + session.shortUsd;
  const longPct = sided > 0 ? (session.longUsd / sided) * 100 : null;

  return (
    <>
      {/* ── the tape ───────────────────────────────────────── */}
      <div className="p-5">
        <div className="mb-3.5 flex items-center gap-2">
          <Label>Tape</Label>
          <span
            aria-hidden="true"
            className={cn(
              "inline-block size-[4.5px] rounded-full",
              live ? "bg-down" : "bg-ink-5",
            )}
          />
          <div className="grow" />
          <Figure className="text-[10px] text-ink-3">
            {live ? `latest across ${markets.length} markets` : "connecting"}
          </Figure>
        </div>

        {rows.length === 0 ? (
          <p className="py-8 text-center text-[11.5px] text-ink-3">
            {live
              ? "Watching. Nothing liquidated recently."
              : "Connecting to the Lighter stream."}
          </p>
        ) : (
          <div className="flex flex-col">
            {rows.map((r, i) => (
              <div
                key={r.id}
                className={cn(
                  "grid grid-cols-[50px_58px_minmax(0,1fr)_42px] items-center border-t border-hair py-[6.5px]",
                  i === 0 && r.fresh && flash && "tick-flash",
                )}
                style={{
                  opacity: i > 8 ? Math.max(0.34, 1 - (i - 8) * 0.12) : 1,
                }}
              >
                <Figure
                  className={cn(
                    "text-[10px]",
                    r.side === "long" ? "text-down" : "text-up",
                  )}
                >
                  {r.side.toUpperCase()}
                </Figure>
                <span className="text-[11.5px] font-medium">{r.symbol}</span>
                <Figure className="text-right text-[11.5px]">{usd(r.usd)}</Figure>
                <Figure
                  className={cn(
                    "text-right text-[9.5px]",
                    r.fresh ? "text-ink-2" : "text-ink-4",
                  )}
                  title={new Date(r.t).toLocaleString()}
                >
                  <TimeAgo t={r.t} />
                </Figure>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── what the session adds up to ────────────────────── */}
      <div className="border-t border-line p-5">
        <div className="mb-3.5 flex items-baseline">
          <Label>This session</Label>
          <div className="grow" />
          <Figure className="text-[10px] text-ink-3">
            since you opened the page
          </Figure>
        </div>

        {session.count === 0 ? (
          <p className="text-[11.5px] leading-relaxed text-ink-3">
            Nothing forced out yet. Every liquidation on the {markets.length}{" "}
            deepest books lands here the moment it clears — side, market and
            size, split between longs and shorts.
          </p>
        ) : (
          <>
            <div className="mb-1.5 flex items-baseline justify-between">
              <Figure className="text-[19px] font-medium tracking-[-0.02em] text-down">
                {usd(session.usd)}
              </Figure>
              <Figure className="text-[11px] text-ink-3">
                {num(session.count)} {session.count === 1 ? "event" : "events"}
              </Figure>
            </div>

            {longPct != null && (
              <>
                <SplitBar
                  left={session.longUsd}
                  right={session.shortUsd}
                  className="mb-2"
                />
                <div className="mb-4 flex justify-between">
                  <Figure className="text-[10px] text-down">
                    {pctPlain(longPct)} longs
                  </Figure>
                  <Figure className="text-[10px] text-up">
                    shorts {pctPlain(100 - longPct)}
                  </Figure>
                </div>
              </>
            )}

            {session.largest && (
              <Row
                label="Largest hit"
                value={`${session.largest.symbol} ${usd(session.largest.usd)}`}
              />
            )}
            {session.busiest && (
              <Row
                label="Most active"
                value={`${session.busiest.symbol} · ${session.busiest.count}`}
              />
            )}
            <Row label="Books watched" value={String(markets.length)} />
          </>
        )}
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-t border-hair py-2">
      <span className="text-[11.5px] text-ink-2">{label}</span>
      <Figure className="text-[11.5px]">{value}</Figure>
    </div>
  );
}
