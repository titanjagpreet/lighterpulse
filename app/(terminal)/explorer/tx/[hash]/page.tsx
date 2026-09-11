import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTx } from "@/lib/lighter/explorer";
import { AsOf, Chip, Figure, Label } from "@/components/terminal/primitives";
import { ago, hash as shortHash } from "@/lib/format";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ hash: string }>;
}): Promise<Metadata> {
  const { hash } = await params;
  return {
    title: `Transaction ${shortHash(hash)}`,
    description: `Lighter transaction ${shortHash(hash)} — type, time and decoded payload.`,
  };
}

export default async function TxPage({
  params,
}: {
  params: Promise<{ hash: string }>;
}) {
  const { hash } = await params;
  const res = await getTx(hash);
  const tx = res.data;
  if (!tx) notFound();

  // Split the camel-case type name so it reads as words.
  const label = tx.type.replace(/([a-z])([A-Z])/g, "$1 $2");

  return (
    <div className="px-5 py-6">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Label>Transaction</Label>
        <Chip tone={tx.type.includes("Liquidate") ? "down" : "neutral"}>
          {label}
        </Chip>
        <div className="grow" />
        <AsOf age={res.age} stale={res.stale} />
      </div>

      <dl className="mb-7 grid max-w-[820px] grid-cols-1 gap-px overflow-hidden rounded-[3px] border border-line bg-line">
        <div className="bg-panel px-4 py-3">
          <dt className="label mb-1.5">Hash</dt>
          <dd>
            <Figure className="text-[12.5px] break-all">{tx.hash}</Figure>
          </dd>
        </div>
        <div className="bg-panel px-4 py-3">
          <dt className="label mb-1.5">Time</dt>
          <dd>
            <Figure className="text-[13px]">
              {tx.time
                ? `${new Date(tx.time).toUTCString()} · ${ago(tx.time)} ago`
                : "—"}
            </Figure>
          </dd>
        </div>
      </dl>

      {tx.pubdata && (
        <div className="max-w-[820px]">
          <Label className="mb-2.5">Payload</Label>
          <pre className="figure overflow-x-auto rounded-[3px] border border-line bg-panel p-4 text-[11.5px] leading-relaxed text-ink-2">
            {JSON.stringify(tx.pubdata, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-7">
        <Link
          href="/explorer"
          className="figure ctl rounded-[4px] border border-edge px-3.5 py-1.5 text-[11.5px] text-ink-2 hover:text-ink"
        >
          ← Explorer
        </Link>
      </div>
    </div>
  );
}
