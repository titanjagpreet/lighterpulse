"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

/**
 * Accounts watched in this browser — the account counterpart of the market
 * watchlist. Each entry keeps the index, which is what the API is asked for,
 * and the L1 address, for linking and display.
 *
 * Like the market list it lives in localStorage and is shared by every
 * component through one store; storage that throws degrades to an empty list.
 */

export interface WatchedAccount {
  index: number;
  address: string;
}

const KEY = "lp:accounts:v1";
/** Each row costs one API call on the visitor's quota; keep the page light. */
export const MAX_WATCHED_ACCOUNTS = 25;

const EMPTY: WatchedAccount[] = [];
const listeners = new Set<() => void>();
let snapshot: WatchedAccount[] | null = null;

function isEntry(x: unknown): x is WatchedAccount {
  return (
    !!x &&
    typeof x === "object" &&
    Number.isSafeInteger((x as WatchedAccount).index) &&
    typeof (x as WatchedAccount).address === "string"
  );
}

function read(): WatchedAccount[] {
  if (snapshot) return snapshot;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    snapshot = Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    snapshot = [];
  }
  return snapshot;
}

function write(next: WatchedAccount[]) {
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

export function useAccountWatchlist() {
  const accounts = useSyncExternalStore(subscribe, read, () => EMPTY);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const has = useCallback(
    (index: number) => accounts.some((a) => a.index === index),
    [accounts],
  );

  /** Adds or removes; returns false when the list is full. */
  const toggle = useCallback((entry: WatchedAccount): boolean => {
    const current = read();
    if (current.some((a) => a.index === entry.index)) {
      write(current.filter((a) => a.index !== entry.index));
      return true;
    }
    if (current.length >= MAX_WATCHED_ACCOUNTS) return false;
    write([...current, entry]);
    return true;
  }, []);

  const remove = useCallback((index: number) => {
    write(read().filter((a) => a.index !== index));
  }, []);

  return {
    accounts,
    has,
    toggle,
    remove,
    ready,
    full: accounts.length >= MAX_WATCHED_ACCOUNTS,
  };
}
