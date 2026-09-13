"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A token's icon from Lighter's CDN — the same images Lighter's app uses — or
 * the symbol's first letter when there is none. Decorative: the symbol always
 * sits beside it, so it carries no alt text.
 *
 * The CDN serves full-size PNGs, some close to 1 MB, for an icon drawn at
 * 16px, so it goes through the image optimiser, which returns a WebP of a
 * kilobyte or so. SVGs pass through untouched.
 *
 * The image is only requested after mount. A failure that happened before
 * hydration would never reach `onError`, leaving a broken-image glyph; a
 * quiet placeholder for the first frame is the cheaper trade.
 */
export function TokenIcon({
  src,
  symbol,
  size = 16,
  className,
}: {
  src?: string | null;
  symbol: string;
  size?: number;
  className?: string;
}) {
  const [state, setState] = useState<"pending" | "ready" | "failed">("pending");

  useEffect(() => {
    setState(src ? "ready" : "failed");
  }, [src]);

  const box = { width: size, height: size };

  if (state === "ready" && src) {
    return (
      <Image
        src={src}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        loading="lazy"
        draggable={false}
        onError={() => setState("failed")}
        className={cn("shrink-0 rounded-full", className)}
        style={box}
      />
    );
  }

  if (state === "failed") {
    const letter = symbol.replace(/^[0-9]+/, "").charAt(0).toUpperCase() || "·";
    return (
      <span
        aria-hidden="true"
        className={cn(
          "figure grid shrink-0 place-items-center rounded-full bg-active font-medium text-ink-3",
          className,
        )}
        style={{ ...box, fontSize: Math.max(7, Math.round(size * 0.48)) }}
      >
        {letter}
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn("block shrink-0 rounded-full bg-raised", className)}
      style={box}
    />
  );
}
