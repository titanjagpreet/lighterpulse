export interface FundingRate {
    exchange: "binance" | "bybit" | "hyperliquid" | "lighter";
    symbol: string;
    market_id: number;
    rate_8h: number; 
    rate_1h: number;  
    rate_1d: number;  
    rate_1w: number;  
    rate_1y: number; 
}

export interface ArbitrageSuggestion {
    symbol: string;
    longExchange: string;
    shortExchange: string;
}

export interface FundingData {
    binance: FundingRate[];
    bybit: FundingRate[];
    hyperliquid: FundingRate[];
    lighter: FundingRate[];
    symbols: string[];
    arbitrage: ArbitrageSuggestion[];
}