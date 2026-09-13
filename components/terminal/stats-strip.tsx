"use client";

import { IntentLink } from "./intent-link";
import { usePathname } from "next/navigation";
import { Figure } from "./primitives";
import { compact, num, usdCompact } from "@/lib/format";

export interface StripStats {
  openInterest: number | null;
  volume24h: number | null;
  tps: number | null;
  activeAccounts: number | null;
  staked: number | null;
  /** Staked as a share of circulating supply net of burns, in percent. */
  stakedShare: number | null;
}

/**
 * The exchange at a glance, under the top bar. Overview leads with the same
 * figures in its hero, so the strip steps aside there.
 */
export function StatsStrip({ stats }: { stats: StripStats }) {
  const pathname = usePathname();
  if (pathname === "/overview") return null;

  const items: { href: string; label: string; value: string; sub?: string }[] = [
    {
      href: "/overview",
      label: "Open interest",
      value: usdCompact(stats.openInterest, 2),
    },
    { href: "/markets", label: "Volume 24h", value: usdCompact(stats.volume24h, 2) },
    { href: "/explorer", label: "TPS", value: stats.tps != null ? num(stats.tps) : "—" },
    {
      href: "/overview",
      label: "Active accounts",
      value: stats.activeAccounts != null ? num(stats.activeAccounts) : "—",
      sub: "last full day",
    },
    {
      href: "/lit#staking",
      label: "LIT staked",
      value: stats.staked != null ? compact(stats.staked) : "—",
      sub: stats.stakedShare != null ? `${stats.stakedShare.toFixed(1)}% of circ.` : undefined,
    },
  ];

  return (
    <div
      aria-label="Exchange summary"
      className="flex h-8 items-center gap-6 overflow-x-auto border-b border-line bg-rail px-4 whitespace-nowrap sm:px-5"
    >
      {items.map((it) => (
        <IntentLink
          key={it.label}
          href={it.href}
          className="ctl flex shrink-0 items-baseline gap-1.5 text-ink-3 hover:text-ink-2"
        >
          <span className="label text-[9px]">{it.label}</span>
          <Figure className="text-[11.5px] text-ink">{it.value}</Figure>
          {it.sub && <Figure className="text-[10px] text-ink-4">{it.sub}</Figure>}
        </IntentLink>
      ))}
    </div>
  );
}
