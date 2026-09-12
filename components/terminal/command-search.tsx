"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * The address bar. `/` focuses it from anywhere.
 *
 * Classification happens locally for the three unambiguous shapes, which
 * covers almost every real query without touching the network. Anything else
 * goes to the explorer's own `search`, so the API decides — the old site
 * guessed with a regex and sent block numbers to a route that did not exist.
 */

const ETH_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const BLOCK_NUMBER = /^\d{1,12}$/;
const TX_HASH = /^(0x)?[0-9a-fA-F]{32,128}$/;

export function CommandSearch({
  placeholder = "Market, address, tx or block",
  size = "sm",
  className,
  autoFocus = false,
}: {
  placeholder?: string;
  size?: "sm" | "lg";
  className?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable);
      if (typing) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const q = value.trim();
      if (!q) return;
      setError(null);

      if (ETH_ADDRESS.test(q)) {
        router.push(`/a/${q}`);
        return;
      }
      if (BLOCK_NUMBER.test(q)) {
        router.push(`/explorer/block/${q}`);
        return;
      }
      if (TX_HASH.test(q)) {
        router.push(`/explorer/tx/${q.replace(/^0x/, "")}`);
        return;
      }

      // Ambiguous — let the explorer classify it.
      setBusy(true);
      try {
        const res = await fetch(
          `/api/explorer/search?q=${encodeURIComponent(q)}`,
        );
        if (res.status === 429) {
          setError("Too many searches. Try again in a moment.");
          return;
        }
        if (!res.ok) {
          setError("Nothing found for that.");
          return;
        }
        const { href } = (await res.json()) as { href?: string };
        if (href) router.push(href);
        else setError("Nothing found for that.");
      } catch {
        setError("Search is unavailable right now.");
      } finally {
        setBusy(false);
      }
    },
    [value, router],
  );

  const lg = size === "lg";

  return (
    <form onSubmit={submit} className={cn("relative", className)}>
      <label
        className={cn(
          "ctl flex cursor-text items-center gap-3 rounded-[4px] border border-edge bg-panel",
          lg ? "h-[46px] px-3.5" : "h-[30px] px-2.5",
          "focus-within:border-ink-3",
        )}
      >
        <svg
          width={lg ? 14 : 12}
          height={lg ? 14 : 12}
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          className="shrink-0"
        >
          <circle cx="7" cy="7" r="4.6" stroke="var(--color-ink-3)" strokeWidth="1.4" />
          <path
            d="M10.4 10.4 L14 14"
            stroke="var(--color-ink-3)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          spellCheck={false}
          autoComplete="off"
          aria-label="Search markets, addresses, transactions and blocks"
          className={cn(
            "figure grow bg-transparent text-ink placeholder:text-ink-3 focus:outline-none",
            lg ? "text-[13px]" : "text-[11px]",
          )}
        />
        {busy ? (
          <span className="figure text-[10px] text-ink-4">…</span>
        ) : (
          <kbd className="figure rounded-[3px] border border-edge px-1.5 py-px text-[9.5px] text-ink-4">
            /
          </kbd>
        )}
      </label>
      {error && (
        <p className="figure absolute top-full left-0 mt-1.5 text-[10.5px] text-down">
          {error}
        </p>
      )}
    </form>
  );
}
