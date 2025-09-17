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
    margin: number;    // USD
    leverage: number;  // x
    liquidationPrice: number; // returned directly from API (no change)
    currentPrice: number;     // computed: positionValue / size (0 if size === 0)
}

export interface AccountData {
    kpis: KPIData;
    positions: Position[];
}

const toNumber = (v: any): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

const parseInitialMarginFraction = (raw: any): number | null => {
    if (raw === undefined || raw === null || raw === "") return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n > 1 ? n / 100 : n; // if >1, treat as percent string
};

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

        const openPositions = (account.positions || []).filter(
            (pos: any) => toNumber(pos.position_value) > 0
        );

        // KPIs
        const collateral = toNumber(account.collateral);
        const totalBalance = toNumber(account.total_asset_value);
        const unrealizedPnl = openPositions.reduce(
            (sum: number, pos: any) => sum + toNumber(pos.unrealized_pnl),
            0
        );
        const roi = collateral > 0 ? (unrealizedPnl / collateral) * 100 : 0;

        const positions: Position[] = openPositions.map((pos: any) => {
            const size = toNumber(pos.position);
            const entryPrice = toNumber(pos.avg_entry_price);
            const positionValue = toNumber(pos.position_value);
            const pnl = toNumber(pos.unrealized_pnl);
            const returnPct = positionValue > 0 ? (pnl / positionValue) * 100 : 0;
            const allocatedMargin = toNumber(pos.allocated_margin);

            // Liquidation price: return exactly as in API (converted to number)
            const liquidationPrice = toNumber(pos.liquidation_price);

            // Current price implied by position_value and size (avoid divide-by-zero)
            const currentPriceRaw = size > 0 ? positionValue / size : 0;
            // round current price to 6 decimals for readability (adjust if you prefer)
            const currentPrice = Number(currentPriceRaw ? currentPriceRaw.toFixed(6) : 0);

            const imfDecimal = parseInitialMarginFraction(pos.initial_margin_fraction);
            let margin = 0;

            if (imfDecimal !== null && positionValue > 0) {
                margin = positionValue * imfDecimal;
            } else if (allocatedMargin > 0) {
                margin = allocatedMargin;
            }

            // prefer allocated margin if Isolated and >0
            const isIsolated = pos.margin_mode === 1;
            if (isIsolated && allocatedMargin > 0) {
                margin = allocatedMargin;
            }

            const leverage = margin > 0 ? positionValue / margin : 0;

            return {
                symbol: pos.symbol,
                size,
                entryPrice,
                positionValue,
                marginMode: isIsolated ? "Isolated" : "Cross",
                direction: pos.sign === 1 ? "Long" : "Short",
                pnl,
                returnPct,
                margin: Number(margin.toFixed(2)),
                leverage: Number(leverage.toFixed(2)),
                liquidationPrice, // exact API value (number)
                currentPrice,
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