"use client";

import { IntentLink } from "./intent-link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "./mark";
import { CommandSearch } from "./command-search";
import { LiveHeight } from "./live-height";
import { Delta, Figure } from "./primitives";
import { price } from "@/lib/format";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/overview", label: "Overview" },
  { href: "/markets", label: "Markets" },
  { href: "/funding", label: "Funding" },
  { href: "/liquidations", label: "Liquidations" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/lit", label: "LIT" },
  { href: "/llp", label: "LLP" },
  { href: "/explorer", label: "Explorer" },
] as const;

/**
 * The shell chrome every terminal page inherits. 44px, monochrome —
 * selection is a raised surface with a hairline accent rule, never a
 * coloured pill, so colour stays reserved for data.
 *
 * Eight sections and a search do not fit a phone or a narrow laptop, so
 * below `xl` the search (and below `lg` the sections too) move into a
 * panel under the bar rather than being squeezed or cut off.
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
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on navigation and on Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const watching = isActive("/watchlist");

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-panel">
      <div className="flex h-11 items-center gap-4 px-4 sm:px-5 lg:gap-5">
        <IntentLink href="/" className="flex h-full shrink-0 items-center" aria-label="LighterPulse home">
          <Wordmark size={15} />
        </IntentLink>

        <nav className="hidden h-full items-stretch lg:flex" aria-label="Terminal">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <IntentLink
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "ctl flex items-center border-b-2 px-2.5 text-[12px] whitespace-nowrap xl:px-3.5",
                  active
                    ? "border-brand bg-raised font-medium text-ink"
                    : "border-transparent text-ink-2 hover:text-ink",
                )}
              >
                {item.label}
              </IntentLink>
            );
          })}
        </nav>

        <div className="grow" />

        <CommandSearch className="hidden w-[248px] xl:block" />

        <IntentLink
          href="/watchlist"
          aria-label="Watchlist"
          aria-current={watching ? "page" : undefined}
          title="Watchlist — markets and accounts saved in this browser"
          className={cn(
            "ctl grid size-7 shrink-0 place-items-center rounded-[3px] pointer-coarse:size-9",
            watching ? "bg-raised text-ink" : "text-ink-3 hover:text-ink",
          )}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M8 1.6l1.95 4.02 4.43.62-3.22 3.1.78 4.4L8 11.66l-3.94 2.08.78-4.4-3.22-3.1 4.43-.62z"
              fill={watching ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
          </svg>
        </IntentLink>

        {litPrice != null && (
          <IntentLink
            href="/lit"
            className="hidden items-baseline gap-2 border-l border-edge pl-4 2xl:flex"
          >
            <span className="label">LIT</span>
            <Figure className="text-[12.5px] font-medium">{price(litPrice)}</Figure>
            {litChange != null && <Delta value={litChange} className="text-[11px]" />}
          </IntentLink>
        )}

        <LiveHeight initial={initialHeight} />

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="terminal-menu"
          className="ctl figure flex h-7 items-center gap-2 rounded-[3px] border border-edge px-2.5 text-[11px] text-ink-2 hover:text-ink xl:hidden"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            {open ? (
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            ) : (
              <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            )}
          </svg>
          <span className="lg:hidden">Menu</span>
          <span className="hidden lg:inline">Search</span>
        </button>
      </div>

      {open && (
        <div
          id="terminal-menu"
          ref={panelRef}
          className="border-t border-line bg-panel px-4 pt-3 pb-4 shadow-lg sm:px-5 xl:hidden"
        >
          <CommandSearch size="lg" className="mb-3" autoFocus />
          <nav aria-label="Terminal sections" className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line sm:grid-cols-4 lg:hidden">
            {NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <IntentLink
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "ctl px-3.5 py-2.5 text-[12.5px]",
                    active ? "bg-raised font-medium text-ink" : "bg-panel text-ink-2 hover:text-ink",
                  )}
                >
                  {item.label}
                </IntentLink>
              );
            })}
          </nav>
          {litPrice != null && (
            <IntentLink href="/lit" className="mt-3 flex items-baseline gap-2 2xl:hidden">
              <span className="label">LIT</span>
              <Figure className="text-[12.5px] font-medium">{price(litPrice)}</Figure>
              {litChange != null && <Delta value={litChange} className="text-[11px]" />}
            </IntentLink>
          )}
        </div>
      )}
    </header>
  );
}
