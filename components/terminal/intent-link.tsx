"use client";

import Link from "next/link";
import { useState, type ComponentProps } from "react";

/**
 * A link that prefetches its page on intent — a pointer over it, a touch, or
 * keyboard focus — rather than as soon as it scrolls into view.
 *
 * Next prefetches every visible link. The top bar alone pulled about 110 KB of
 * other pages on each visit, and a table of market rows fetched pages nobody
 * opened. This starts with prefetching off and hands control back to Next's
 * own prefetch at the first sign of intent, so each kind of route still gets
 * the prefetch Next would have given it.
 */
export function IntentLink({
  onMouseEnter,
  onTouchStart,
  onFocus,
  ...props
}: Omit<ComponentProps<typeof Link>, "prefetch">) {
  const [intent, setIntent] = useState(false);
  return (
    <Link
      {...props}
      prefetch={intent ? null : false}
      onMouseEnter={(e) => {
        setIntent(true);
        onMouseEnter?.(e);
      }}
      onTouchStart={(e) => {
        setIntent(true);
        onTouchStart?.(e);
      }}
      onFocus={(e) => {
        setIntent(true);
        onFocus?.(e);
      }}
    />
  );
}
