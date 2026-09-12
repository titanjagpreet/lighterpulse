"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface Section {
  id: string;
  label: string;
}

/**
 * In-page jump links for long pages. Sticks under the top bar and marks the
 * section being read. Plain anchors, so it works before hydration and a
 * section can be linked to directly.
 *
 * Sections need `scroll-mt-[88px]` so a jump does not land under the bars.
 */
export function SectionNav({
  sections,
  className,
}: {
  sections: Section[];
  className?: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const ids = sections.map((s) => s.id).join("|");

  useEffect(() => {
    const els = ids
      .split("|")
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // The band just under the sticky bars decides which section is current.
      { rootMargin: "-90px 0px -65% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids]);

  return (
    <nav
      aria-label="On this page"
      className={cn(
        "sticky top-11 z-40 flex h-9 items-stretch gap-0.5 overflow-x-auto border-b border-line bg-panel px-3 sm:px-4",
        className,
      )}
    >
      {sections.map((s) => {
        const on = active === s.id;
        return (
          <a
            key={s.id}
            href={`#${s.id}`}
            aria-current={on ? "location" : undefined}
            className={cn(
              "ctl figure flex shrink-0 items-center border-b-2 px-2.5 text-[11px] whitespace-nowrap",
              on
                ? "border-ink-3 text-ink"
                : "border-transparent text-ink-3 hover:text-ink-2",
            )}
          >
            {s.label}
          </a>
        );
      })}
    </nav>
  );
}
