import { IntentLink } from "@/components/terminal/intent-link";
import type { Metadata } from "next";
import { CommandSearch } from "@/components/terminal/command-search";
import { TimeAgo } from "@/components/terminal/as-of";
import {
  AsOf,
  Chip,
  Figure,
  Label,
  LiveDot,
  SectionHeader,
} from "@/components/terminal/primitives";
import {
  getExplorerBatches,
  getExplorerBlocks,
  getExplorerTotals,
} from "@/lib/lighter/explorer";
import { hash, num } from "@/lib/format";

export const revalidate = 10;

export const metadata: Metadata = {
  title: "Lighter Explorer — Blocks, Transactions & Accounts",
  description:
    "Blocks, batches, transactions and accounts on the Lighter zk-rollup. Live chain totals and L1 settlement status.",
  alternates: { canonical: "/explorer" },
};

export default async function ExplorerPage() {
  const [totals, blocks, batches] = await Promise.all([
    getExplorerTotals().catch(() => null),
    getExplorerBlocks().catch(() => null),
    getExplorerBatches().catch(() => null),
  ]);

  return (
    <div>
      {/* ── search + totals ────────────────────────────────── */}
      <div className="border-b border-line px-5 py-6">
        <h1 className="mb-4 text-[24px] font-semibold tracking-[-0.02em]">
          Explorer
        </h1>
        <CommandSearch
          size="lg"
          placeholder="Block, transaction, account or market"
          className="mb-6 max-w-[720px]"
        />

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line lg:grid-cols-4">
          <Total label="Blocks" value={totals?.data.blocks} />
          <Total label="L1 batches" value={totals?.data.batches} />
          <Total label="Accounts" value={totals?.data.accounts} />
          <Total label="Transactions" value={totals?.data.txs} />
        </div>
        {totals && (
          <div className="mt-2.5">
            <AsOf asOf={totals.asOf} ttl={totals.ttl} source={totals.source} />
          </div>
        )}
      </div>

      {/* ── blocks + batches ───────────────────────────────── */}
      <div className="grid lg:grid-cols-2">
        <div className="border-line p-5 lg:border-r">
          <SectionHeader title="Latest blocks">
            <LiveDot />
          </SectionHeader>

          <div className="label grid grid-cols-[minmax(0,1fr)_92px_120px_72px] items-center border-b border-edge pb-2.5">
            <span>Height</span>
            <span className="text-right">Size</span>
            <span className="text-right">Batch</span>
            <span className="text-right">Age</span>
          </div>

          {(blocks?.data ?? []).slice(0, 12).map((b) => (
            <IntentLink
              key={b.height}
              href={`/explorer/block/${b.height}`}
              className="row-hit grid grid-cols-[minmax(0,1fr)_92px_120px_72px] items-center border-b border-hair py-2.5 last:border-0"
            >
              <Figure className="text-[12.5px] text-ink">{num(b.height)}</Figure>
              <Figure className="text-right text-[12.5px] text-ink-2">
                {num(b.size)}
              </Figure>
              <span className="flex justify-end">
                {b.batchStatus ? (
                  <Chip tone="up">SETTLED</Chip>
                ) : (
                  <Chip tone="warn">PENDING</Chip>
                )}
              </span>
              <Figure className="text-right text-[11.5px] text-ink-3">
                <TimeAgo t={b.updatedAt} />
              </Figure>
            </IntentLink>
          ))}

          {!blocks?.data.length && (
            <p className="py-10 text-center text-[12.5px] text-ink-3">
              Block data is unavailable right now.
            </p>
          )}
        </div>

        <div className="p-5">
          <SectionHeader title="L1 batches" note="settlement to Ethereum" />

          <div className="label grid grid-cols-[minmax(0,1fr)_84px_136px_72px] items-center border-b border-edge pb-2.5">
            <span>Batch</span>
            <span className="text-right">Blocks</span>
            <span className="text-right">Commit tx</span>
            <span className="text-right">Age</span>
          </div>

          {(batches?.data ?? []).slice(0, 12).map((b) => (
            <div
              key={b.number}
              className="row-hit grid grid-cols-[minmax(0,1fr)_84px_136px_72px] items-center border-b border-hair py-2.5 last:border-0"
            >
              <Figure className="text-[12.5px] text-ink">{num(b.number)}</Figure>
              <Figure className="text-right text-[12.5px] text-ink-2">
                {num(b.size)}
              </Figure>
              <span className="flex justify-end">
                {b.commitTx ? (
                  <a
                    href={`https://etherscan.io/tx/${b.commitTx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="figure ctl -my-2 py-2 text-[11.5px] text-ink-2 hover:text-ink"
                  >
                    {hash(b.commitTx, 6, 4)} ↗
                  </a>
                ) : (
                  <Figure className="text-[11.5px] text-ink-4">pending</Figure>
                )}
              </span>
              <Figure className="text-right text-[11.5px] text-ink-3">
                <TimeAgo t={b.updatedAt} />
              </Figure>
            </div>
          ))}

          {!batches?.data.length && (
            <p className="py-10 text-center text-[12.5px] text-ink-3">
              Batch data is unavailable right now.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Total({ label, value }: { label: string; value?: number | null }) {
  return (
    <div className="bg-panel px-5 py-4">
      <Label className="mb-2">{label}</Label>
      <Figure className="text-[22px] font-medium tracking-[-0.02em]">
        {value != null ? num(value) : "—"}
      </Figure>
    </div>
  );
}
