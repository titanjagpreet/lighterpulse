export interface KPIData {
    collateral: number;
    totalBalance: number;
    unrealizedPnl: number;
    roi: number;
    openPositionsCount: number;
}

export interface Position {
    symbol: string;
    size: number;
    entryPrice: number;
    positionValue: number;
    marginMode: "Cross" | "Isolated";
    direction: "Long" | "Short";
    pnl: number;
    returnPct: number;
    margin: number;
}

export interface AccountData {
    kpis: KPIData;
    positions: Position[];
}

export async function getAccountData(address: string): Promise<AccountData | null> {
    try {
        const res = await fetch(
            `https://mainnet.zklighter.elliot.ai/api/v1/account?by=l1_address&value=${address}`,
            {
                headers: { accept: "application/json" },
                cache: "no-store",
            }
        );

        if (!res.ok) return null;

        const data = await res.json();
        const account = data?.accounts?.[0];
        if (!account) return null;

        // ✅ Filter only open positions
        const openPositions = (account.positions || []).filter(
            (pos: any) => parseFloat(pos.position_value) > 0
        );

        // ✅ KPIs
        const collateral = parseFloat(account.cross_asset_value);
        const totalBalance = parseFloat(account.total_asset_value);
        const unrealizedPnl = openPositions.reduce(
            (sum: number, pos: any) => sum + parseFloat(pos.unrealized_pnl),
            0
        );
        const roi = collateral > 0 ? (unrealizedPnl / collateral) * 100 : 0;

        // ✅ Positions with return percentage + margin
        const positions: Position[] = openPositions.map((pos: any) => {
            const positionValue = parseFloat(pos.position_value);
            const pnl = parseFloat(pos.unrealized_pnl);
            const returnPct = positionValue > 0 ? (pnl / positionValue) * 100 : 0;
            const margin = parseFloat(pos.allocated_margin); // ✅ Added allocated margin

            return {
                symbol: pos.symbol,
                size: parseFloat(pos.position),
                entryPrice: parseFloat(pos.avg_entry_price),
                positionValue,
                marginMode: pos.margin_mode === 1 ? "Isolated" : "Cross",
                direction: pos.sign === 1 ? "Long" : "Short",
                pnl,
                returnPct,
                margin,
            };
        });

        return {
            kpis: {
                collateral,
                totalBalance,
                unrealizedPnl,
                roi,
                openPositionsCount: openPositions.length,
            },
            positions,
        };
    } catch (error) {
        console.error("Error fetching account data:", error);
        return null;
    }
}