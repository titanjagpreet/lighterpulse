import { TopBar } from "@/components/terminal/top-bar";
import { StatsStrip } from "@/components/terminal/stats-strip";
import { getLitStats } from "@/lib/lighter/token";
import { getExplorerTotals } from "@/lib/lighter/explorer";
import { getOverview } from "@/lib/lighter/overview";
import { getStakingPool } from "@/lib/lighter/pools";
import { getLitSupply } from "@/lib/chain/lit-token";

/**
 * The terminal shell. Every screen in this group inherits it, so no page
 * re-implements chrome — which is what keeps them from drifting apart.
 *
 * The LIT ticker, the block height and the stats strip are server-rendered
 * from cache so the chrome is never empty on first paint; the socket takes
 * the height over once it connects. Each part degrades on its own.
 */
export default async function TerminalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [lit, totals, overview, staking, supply] = await Promise.all([
    getLitStats().catch(() => null),
    getExplorerTotals().catch(() => null),
    getOverview().catch(() => null),
    getStakingPool().catch(() => null),
    getLitSupply().catch(() => null),
  ]);

  const o = overview?.data;
  const staked = staking?.data.staked ?? null;
  const circulating = supply?.data.circulating ?? null;

  return (
    <div className="min-h-screen bg-surface">
      <TopBar
        litPrice={lit?.data.price ?? null}
        litChange={lit?.data.change24h ?? null}
        initialHeight={totals?.data.blocks ?? null}
      />
      {o && (
        <StatsStrip
          stats={{
            openInterest: o.openInterest,
            volume24h: o.volume24h,
            tps: o.tps,
            activeAccounts: o.genesis.activeAccounts,
            staked,
            stakedShare:
              staked != null && circulating ? (staked / circulating) * 100 : null,
          }}
        />
      )}
      <main>{children}</main>
    </div>
  );
}
