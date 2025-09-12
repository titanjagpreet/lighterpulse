import { ExchangeStat, ExchangeStatsResponse } from "../types/excahngeStats";

export async function getExchangeStats(): Promise<ExchangeStatsResponse | null> {
    try {
        const res = await fetch("https://mainnet.zklighter.elliot.ai/api/v1/exchangeStats", {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
        });

        if (!res.ok) return null;

        const data = await res.json();
        if (!data || data.code !== 200) return null;

        const stats: ExchangeStat[] = (data.order_book_stats || []).map((item: any) => ({
            symbol: item.symbol,
            lastTradePrice: item.last_trade_price,
            dailyTradesCount: item.daily_trades_count,
            dailyBaseTokenVolume: item.daily_base_token_volume,
            dailyQuoteTokenVolume: item.daily_quote_token_volume,
            dailyPriceChange: item.daily_price_change
        }));

        return {
            total: data.total,
            stats
        };
    } catch (error) {
        console.error("Error fetching exchange stats:", error);
        return null;
    }
}