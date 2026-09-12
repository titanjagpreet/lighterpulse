import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBlock, getExplorerBlocks } from "@/lib/lighter/explorer";
import { TimeAgo } from "@/components/terminal/as-of";
import { AsOf, Chip, Figure } from "@/components/terminal/primitives";
import { hash as shortHash, num } from "@/lib/format";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ height: string }>;
}): Promise<Metadata> {
  const { height } = await params;
  return {
    title: `Block ${height}`,
    description: `Block ${height} on the Lighter zk-rollup — transactions, batch and L1 settlement status.`,
    alternates: { canonical: `/explorer/block/${height}` },
  };
}

export default async function BlockPage({
  params,
}: {
  params: Promise<{ height: string }>;
}) {
  const { height } = await params;
  const [res, latest] = await Promise.all([
    getBlock(height),
    getExplorerBlocks().catch(() => null),
  ]);
  const b = res.data;
  if (!b) notFound();
  // No "next" past the tip of the chain — it could only lead to a 404.
  const tip = latest?.data[0]?.height ?? null;

  return (
    <div className="px-5 py-6">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="flex items-baseline gap-3">
          <span className="label">Block</span>
          <span className="figure text-[26px] font-medium tracking-[-0.025em]">
            {num(b.height)}
          </span>
        </h1>
        {b.batchStatus ? <Chip tone="up">SETTLED</Chip> : <Chip tone="warn">PENDING</Chip>}
        <div className="grow" />
        <AsOf asOf={res.asOf} ttl={res.ttl} source={res.source} />
      </div>

      <dl className="grid max-w-[820px] grid-cols-1 gap-px overflow-hidden rounded-[3px] border border-line bg-line sm:grid-cols-2">
        <Row k="Transactions" v={num(b.totalTransactions)} />
        <Row k="Batch" v={b.batchNumber != null ? num(b.batchNumber) : "—"} />
        <Row k="Batch status" v={b.batchStatus ?? "pending"} />
        <Row k="Settled" v={b.batchStatusTime ? <TimeAgo t={b.batchStatusTime} suffix=" ago" /> : "—"} />
        <RowTx k="Commit tx" v={b.commitTx} />
        <RowTx k="Verify tx" v={b.verifyTx} />
      </dl>

      <div className="mt-7 flex gap-2.5">
        <Link
          href={`/explorer/block/${b.height - 1}`}
          className="figure ctl rounded-[4px] border border-edge px-3.5 py-1.5 text-[11.5px] text-ink-2 hover:text-ink"
        >
          ← Previous
        </Link>
        {(tip == null || b.height < tip) && (
          <Link
            href={`/explorer/block/${b.height + 1}`}
            className="figure ctl rounded-[4px] border border-edge px-3.5 py-1.5 text-[11.5px] text-ink-2 hover:text-ink"
          >
            Next →
          </Link>
        )}
        <Link
          href="/explorer"
          className="figure ctl rounded-[4px] px-3.5 py-1.5 text-[11.5px] text-ink-3 hover:text-ink"
        >
          Explorer
        </Link>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="bg-panel px-4 py-3">
      <dt className="label mb-1.5">{k}</dt>
      <dd>
        <Figure className="text-[13px]">{v}</Figure>
      </dd>
    </div>
  );
}

function RowTx({ k, v }: { k: string; v: string | null }) {
  return (
    <div className="bg-panel px-4 py-3">
      <dt className="label mb-1.5">{k}</dt>
      <dd>
        {v ? (
          <a
            href={`https://etherscan.io/tx/${v}`}
            target="_blank"
            rel="noopener noreferrer"
            className="figure ctl text-[13px] text-ink hover:text-white"
          >
            {shortHash(v, 10, 8)} ↗
          </a>
        ) : (
          <Figure className="text-[13px] text-ink-4">pending</Figure>
        )}
      </dd>
    </div>
  );
}
