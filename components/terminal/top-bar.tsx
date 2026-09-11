"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "./mark";
import { CommandSearch } from "./command-search";
import { LiveHeight } from "./live-height";
import { Delta, Figure } from "./primitives";
import { price } from "@/lib/format";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/overview", label: "Overview" },
  { href: "/markets", label: "Markets" },
  { href: "/liquidations", label: "Liquidations" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/lit", label: "LIT" },
  { href: "/explorer", label: "Explorer" },
] as const;

/**
 * The shell chrome every terminal page inherits. 44px, monochrome —
 * selection is a raised surface with a hairline accent rule, never a
 * coloured pill, so colour stays reserved for data.
 */
export function TopBar({
  litPrice,
  litChange,
  initialHeight,
}: {
  litPrice?: number | null;
  litChange?: number | null;
  initialHeight?: number | null;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 flex h-11 items-center gap-6 border-b border-line bg-panel px-5">
      <Link href="/" className="shrink-0" aria-label="LighterPulse home">
        <Wordmark size={15} />
      </Link>

      <nav className="flex h-full items-stretch" aria-label="Terminal">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "ctl flex items-center border-b-2 px-3.5 text-[12px] whitespace-nowrap",
                active
                  ? "border-brand bg-raised font-medium text-ink"
                  : "border-transparent text-ink-2 hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="grow" />

      <CommandSearch className="hidden w-[268px] lg:block" />

      {litPrice != null && (
        <Link
          href="/lit"
          className="hidden items-baseline gap-2 border-l border-edge pl-4 xl:flex"
        >
          <span className="label">LIT</span>
          <Figure className="text-[12.5px] font-medium">{price(litPrice)}</Figure>
          {litChange != null && <Delta value={litChange} className="text-[11px]" />}
        </Link>
      )}

      <LiveHeight initial={initialHeight} />
    </header>
  );
}
