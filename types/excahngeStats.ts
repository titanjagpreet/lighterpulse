export interface ExchangeStat {
    symbol: string;
    lastTradePrice: number;
    dailyTradesCount: number;
    dailyBaseTokenVolume: number;
    dailyQuoteTokenVolume: number;
    dailyPriceChange: number;
}

export interface ExchangeStatsResponse {
    total: number;
    stats: ExchangeStat[];
}