import { FundingData, FundingRate, ArbitrageSuggestion } from "../types/funding";

export async function getFundingData(): Promise<
    (FundingData & {
        lighter_binance_arb: any[];
        lighter_bybit_arb: any[];
        lighter_hl_arb: any[];
    }) | null
> {
    try {
        const res = await fetch("https://mainnet.zklighter.elliot.ai/api/v1/funding-rates", {
            method: "GET",
            headers: {
                Accept: "application/json",
            },
            cache: "no-store",
        });

        if (!res.ok) {
            console.error("Failed to fetch funding data", res.status);
            return null;
        }

        const data = await res.json();
        const fundings = data?.funding_rates;
        if (!fundings) return null;

        const calculateRates = (rate_8h: number) => {
            const rate_1h = rate_8h / 8;
            const rate_1d = rate_8h * 3;
            const rate_1w = rate_8h * 21;
            const rate_1y = rate_8h * 365 * 3;
            return { rate_1h, rate_1d, rate_1w, rate_1y };
        };

        const formatRates = (exchange: string): FundingRate[] =>
            fundings
                .filter((item: any) => item.exchange === exchange)
                .sort((a: any, b: any) => a.market_id - b.market_id)
                .map((item: any) => {
                    const rate_8h = Number(item.rate);
                    const { rate_1h, rate_1d, rate_1w, rate_1y } = calculateRates(rate_8h);
                    return {
                        exchange: item.exchange,
                        symbol: item.symbol,
                        market_id: item.market_id,
                        rate_8h: Number(rate_8h.toFixed(8)),
                        rate_1h: Number(rate_1h.toFixed(8)),
                        rate_1d: Number(rate_1d.toFixed(8)),
                        rate_1w: Number(rate_1w.toFixed(8)),
                        rate_1y: Number(rate_1y.toFixed(8)),
                    };
                });

        const binance = formatRates("binance");
        const bybit = formatRates("bybit");
        const hyperliquid = formatRates("hyperliquid");
        const lighter = formatRates("lighter");

        const symbols = lighter.map((item) => item.symbol);

        // Arbitrage Suggestions
        const arbitrage: ArbitrageSuggestion[] = symbols
            .map((symbol) => {
                const rates = [
                    ...binance.filter((r) => r.symbol === symbol),
                    ...bybit.filter((r) => r.symbol === symbol),
                    ...hyperliquid.filter((r) => r.symbol === symbol),
                    ...lighter.filter((r) => r.symbol === symbol),
                ];

                if (rates.length === 0) return null;

                const sorted = rates.sort((a, b) => a.rate_8h - b.rate_8h);
                const longExchange = sorted[0].exchange;
                const shortExchange = sorted[sorted.length - 1].exchange;

                return { symbol, longExchange, shortExchange };
            })
            .filter(Boolean) as ArbitrageSuggestion[];

        // Lighter vs Others Arbitrage Differences
        const computeDiffs = (target: FundingRate[], base: FundingRate[]) =>
            base.map((light) => {
                const match = target.find((t) => t.symbol === light.symbol);
                if (!match) return null;
                return {
                    symbol: light.symbol,
                    market_id: light.market_id,
                    diff_1h: Number((light.rate_1h - match.rate_1h).toFixed(8)),
                    diff_8h: Number((light.rate_8h - match.rate_8h).toFixed(8)),
                    diff_1d: Number((light.rate_1d - match.rate_1d).toFixed(8)),
                    diff_1w: Number((light.rate_1w - match.rate_1w).toFixed(8)),
                    diff_1y: Number((light.rate_1y - match.rate_1y).toFixed(8)),
                };
            }).filter(Boolean);

        const lighter_binance_arb = computeDiffs(binance, lighter);
        const lighter_bybit_arb = computeDiffs(bybit, lighter);
        const lighter_hl_arb = computeDiffs(hyperliquid, lighter);

        return {
            binance,
            bybit,
            hyperliquid,
            lighter,
            symbols,
            arbitrage,
            lighter_binance_arb,
            lighter_bybit_arb,
            lighter_hl_arb,
        };
    } catch (error) {
        console.error("Error fetching funding data:", error);
        return null;
    }
}