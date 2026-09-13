import "server-only";
import { explorerApi, LighterError } from "./client";
import { cached, type Cached } from "../cache";
import { n } from "../format";
import type { ExplorerBatch, ExplorerBlock, ExplorerTotals } from "./types";

/**
 * explorer.elliot.ai — where the block explorer moved to. The old site still
 * calls `/api/v1/currentHeight` and `/api/v1/blocks` on the main host, which
 * now 403 at CloudFront; that is why its explorer page is dead.
 *
 * CRITICAL: this host allows 90 WEIGHTED requests per minute for every account
 * type, with no builder tier to escape to. `search` weighs 3, `accounts/*`
 * weighs 2, everything else 1. Every call must be cached, and search must also
 * be rate-limited per IP — see app/api/explorer/search/route.ts.
 */

async function fetchTotals(): Promise<ExplorerTotals> {
  const res = await explorerApi<{
    blocks: number;
    batches: number;
    accounts: number;
    txs: number;
  }>("total");
  return {
    blocks: n(res.blocks),
    batches: n(res.batches),
    accounts: n(res.accounts),
    txs: n(res.txs),
  };
}

export const getExplorerTotals = (): Promise<Cached<ExplorerTotals>> =>
  cached("explorer:totals", 60, fetchTotals);

interface RawBlock {
  block_height: number;
  updated_at: string;
  block_size: number;
  batch_status: string | null;
}

async function fetchBlocks(): Promise<ExplorerBlock[]> {
  // Note the shape: a bare array, not the `{code, blocks}` envelope the old
  // main-host endpoint returned.
  const res = await explorerApi<RawBlock[]>("blocks");
  const rows = Array.isArray(res) ? res : [];
  return rows.map((b) => ({
    height: n(b.block_height),
    updatedAt: b.updated_at,
    size: n(b.block_size),
    batchStatus: b.batch_status,
  }));
}

export const getExplorerBlocks = (): Promise<Cached<ExplorerBlock[]>> =>
  cached("explorer:blocks", 10, fetchBlocks);

interface RawBatch {
  batch_number: number;
  updated_at: string;
  batch_size: number;
  batch_status: string | null;
  batch_details: {
    commit_tx_hash?: string | null;
    verify_tx_hash?: string | null;
    execute_tx_hash?: string | null;
  } | null;
}

async function fetchBatches(): Promise<ExplorerBatch[]> {
  const res = await explorerApi<RawBatch[]>("batches");
  const rows = Array.isArray(res) ? res : [];
  return rows.map((b) => ({
    number: n(b.batch_number),
    updatedAt: b.updated_at,
    size: n(b.batch_size),
    status: b.batch_status,
    commitTx: b.batch_details?.commit_tx_hash ?? null,
    verifyTx: b.batch_details?.verify_tx_hash ?? null,
    executeTx: b.batch_details?.execute_tx_hash ?? null,
  }));
}

export const getExplorerBatches = (): Promise<Cached<ExplorerBatch[]>> =>
  cached("explorer:batches", 20, fetchBatches);

/**
 * Hand classification to the API instead of guessing with a regex — the old
 * site's `getRouteForInput` sent block numbers to a route that doesn't exist.
 */
export type SearchResult = Record<string, unknown>;

/**
 * The explorer answers a miss with HTTP 404, which the client treats as an
 * error. A miss is a legitimate result, so it is normalised to `null` and
 * cached — otherwise every typo would spend 3 of the 90 weighted requests
 * this host allows per minute across all visitors.
 */
export function searchExplorer(q: string): Promise<Cached<SearchResult[] | null>> {
  const key = q.trim().toLowerCase().slice(0, 96);
  return cached(`explorer:search:${key}`, 120, async () => {
    try {
      const res = await explorerApi<SearchResult[]>("search", { q: key });
      return Array.isArray(res) ? res : null;
    } catch (err) {
      if (err instanceof LighterError && err.status === 404) return null;
      throw err;
    }
  });
}

/* ── detail lookups ──────────────────────────────────────────── */

export interface BlockDetail {
  height: number;
  batchNumber: number | null;
  batchStatus: string | null;
  batchStatusTime: string | null;
  totalTransactions: number;
  commitTx: string | null;
  verifyTx: string | null;
  executeTx: string | null;
}

export function getBlock(height: string): Promise<Cached<BlockDetail | null>> {
  const key = height.replace(/\D/g, "").slice(0, 15);
  return cached(`explorer:block:${key}`, 60, async () => {
    try {
      const b = await explorerApi<{
        block_number?: number;
        batch_number?: number;
        batch_status?: string | null;
        batch_status_time?: string | null;
        total_transactions?: number;
        batch_details?: {
          commit_tx_hash?: string | null;
          verify_tx_hash?: string | null;
          execute_tx_hash?: string | null;
        } | null;
      }>(`blocks/${key}`);
      if (b?.block_number == null) return null;
      return {
        height: n(b.block_number),
        batchNumber: b.batch_number != null ? n(b.batch_number) : null,
        batchStatus: b.batch_status ?? null,
        batchStatusTime: b.batch_status_time ?? null,
        totalTransactions: n(b.total_transactions),
        commitTx: b.batch_details?.commit_tx_hash ?? null,
        verifyTx: b.batch_details?.verify_tx_hash ?? null,
        executeTx: b.batch_details?.execute_tx_hash ?? null,
      };
    } catch {
      return null;
    }
  });
}

export interface TxDetail {
  hash: string;
  /** Readable name, e.g. "InternalLiquidatePosition". */
  type: string;
  time: string | null;
  pubdata: Record<string, unknown> | null;
}

export function getTx(hash: string): Promise<Cached<TxDetail | null>> {
  const key = hash.replace(/[^0-9a-fA-F]/g, "").slice(0, 128).toLowerCase();
  return cached(`explorer:tx:${key}`, 300, async () => {
    try {
      const t = await explorerApi<{
        tx_type?: string;
        hash?: string;
        time?: string;
        pubdata?: Record<string, unknown>;
      }>(`logs/${key}`);
      if (!t?.hash) return null;
      return {
        hash: t.hash,
        type: t.tx_type ?? "Unknown",
        time: t.time ?? null,
        pubdata: t.pubdata ?? null,
      };
    } catch {
      return null;
    }
  });
}
