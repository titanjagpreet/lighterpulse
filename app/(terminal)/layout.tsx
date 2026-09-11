import { TopBar } from "@/components/terminal/top-bar";
import { getLitStats } from "@/lib/lighter/token";
import { getExplorerTotals } from "@/lib/lighter/explorer";

/**
 * The terminal shell. Every screen in this group inherits it, so no page
 * re-implements chrome — which is what keeps them from drifting apart.
 *
 * The LIT ticker and the block height are server-rendered from cache so the
 * bar is never empty on first paint; the socket takes the height over once
 * it connects.
 */
export default async function TerminalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [lit, totals] = await Promise.all([
    getLitStats().catch(() => null),
    getExplorerTotals().catch(() => null),
  ]);

  return (
    <div className="min-h-screen bg-surface">
      <TopBar
        litPrice={lit?.data.price ?? null}
        litChange={lit?.data.change24h ?? null}
        initialHeight={totals?.data.blocks ?? null}
      />
      <main>{children}</main>
    </div>
  );
}
