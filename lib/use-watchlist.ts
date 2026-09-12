"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

/**
 * A watchlist kept in this browser.
 *
 * No account, no database: starred market ids live in localStorage, keyed by
 * market id rather than symbol because ids never get renamed. Every component
 * reading the list shares one store, so starring a row updates the overview
 * strip in the same tab, and the `storage` event carries it to other tabs.
 *
 * Storage can throw rather than merely be empty — private windows, blocked
 * site data — so every access is guarded and the list degrades to empty.
 */

const KEY = "lp:watchlist:v1";
const EMPTY: number[] = [];
const listeners = new Set<() => void>();
let snapshot: number[] | null = null;

function read(): number[] {
  if (snapshot) return snapshot;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    snapshot = Array.isArray(parsed)
      ? parsed.filter((x): x is number => Number.isInteger(x))
      : [];
  } catch {
    snapshot = [];
  }
  return snapshot;
}

function write(next: number[]) {
  snapshot = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage blocked — the list still works for this page view */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    snapshot = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useWatchlist() {
  const ids = useSyncExternalStore(subscribe, read, () => EMPTY);
  // The server has no list; `ready` lets callers avoid flashing an empty state
  // before the browser's copy is read.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const toggle = useCallback((id: number) => {
    const current = read();
    write(
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }, []);

  const has = useCallback((id: number) => ids.includes(id), [ids]);

  return { ids, has, toggle, ready };
}
