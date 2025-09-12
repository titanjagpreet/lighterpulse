"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, ChevronDown, Info, Menu, X, ArrowLeft } from "lucide-react";
import { GlowingEffect } from "@/components/aceternity/glow-cards";
import { cn } from "@/lib/utils";
import { getFundingData } from "@/utils/getFundingData";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Timeframe = "1h" | "8h" | "1d" | "1w" | "1y";

interface FundingTableData {
    symbol: string;
    lighter: number;
    binance: number;
    bybit: number;
    hyperliquid: number;
    lighter_binance_arb: number;
    lighter_bybit_arb: number;
    lighter_hl_arb: number;
    lighter_binance_suggestion: string;
    lighter_bybit_suggestion: string;
    lighter_hl_suggestion: string;
}

export default function FundingComparisonPage() {
    const [fundingData, setFundingData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [timeframe, setTimeframe] = useState<Timeframe>("8h");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userAddress, setUserAddress] = useState<string>("");

    // Get user address from URL query parameter
    const getAddressFromUrl = useCallback(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const fromAddress = urlParams.get('from');
            if (fromAddress) {
                setUserAddress(fromAddress);
            }
        }
    }, []);

    useEffect(() => {
        getAddressFromUrl();
    }, [getAddressFromUrl]);

    // Fetch funding data
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getFundingData();
            setFundingData(data);
        } catch (err) {
            setError("Failed to fetch funding data");
            console.error("Error fetching funding data:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);



    // Get rate based on timeframe
    const getRateByTimeframe = useCallback((item: any, timeframe: Timeframe): number => {
        switch (timeframe) {
            case "1h": return item.rate_1h;
            case "8h": return item.rate_8h;
            case "1d": return item.rate_1d;
            case "1w": return item.rate_1w;
            case "1y": return item.rate_1y;
            default: return item.rate_8h;
        }
    }, []);

    // Get arbitrage difference based on timeframe
    const getArbByTimeframe = useCallback((arbItem: any, timeframe: Timeframe): number => {
        if (!arbItem || !arbItem.diffs) return 0;
        switch (timeframe) {
            case "1h": return arbItem.diffs["1h"];
            case "8h": return arbItem.diffs["8h"];
            case "1d": return arbItem.diffs["1d"];
            case "1w": return arbItem.diffs["1w"];
            case "1y": return arbItem.diffs["1y"];
            default: return arbItem.diffs["8h"];
        }
    }, []);

    // Get arbitrage suggestion based on timeframe
    const getArbSuggestion = useCallback((arbItem: any, timeframe: Timeframe): string => {
        if (!arbItem || !arbItem.suggestions) return "No suggestion available";
        switch (timeframe) {
            case "1h": return arbItem.suggestions["1h"];
            case "8h": return arbItem.suggestions["8h"];
            case "1d": return arbItem.suggestions["1d"];
            case "1w": return arbItem.suggestions["1w"];
            case "1y": return arbItem.suggestions["1y"];
            default: return arbItem.suggestions["8h"];
        }
    }, []);

    // Format table data
    const formatTableData = useCallback((): FundingTableData[] => {
        if (!fundingData) return [];

        return fundingData.symbols.map((symbol: string) => {
            const lighter = fundingData.lighter.find((item: any) => item.symbol === symbol);
            const binance = fundingData.binance.find((item: any) => item.symbol === symbol);
            const bybit = fundingData.bybit.find((item: any) => item.symbol === symbol);
            const hyperliquid = fundingData.hyperliquid.find((item: any) => item.symbol === symbol);
            const lighter_binance_arb = fundingData.lighter_binance_arb.find((item: any) => item.symbol === symbol);
            const lighter_bybit_arb = fundingData.lighter_bybit_arb.find((item: any) => item.symbol === symbol);
            const lighter_hl_arb = fundingData.lighter_hl_arb.find((item: any) => item.symbol === symbol);

            return {
                symbol,
                lighter: lighter ? getRateByTimeframe(lighter, timeframe) : 0,
                binance: binance ? getRateByTimeframe(binance, timeframe) : 0,
                bybit: bybit ? getRateByTimeframe(bybit, timeframe) : 0,
                hyperliquid: hyperliquid ? getRateByTimeframe(hyperliquid, timeframe) : 0,
                lighter_binance_arb: lighter_binance_arb ? getArbByTimeframe(lighter_binance_arb, timeframe) : 0,
                lighter_bybit_arb: lighter_bybit_arb ? getArbByTimeframe(lighter_bybit_arb, timeframe) : 0,
                lighter_hl_arb: lighter_hl_arb ? getArbByTimeframe(lighter_hl_arb, timeframe) : 0,
                lighter_binance_suggestion: lighter_binance_arb ? getArbSuggestion(lighter_binance_arb, timeframe) : "No suggestion available",
                lighter_bybit_suggestion: lighter_bybit_arb ? getArbSuggestion(lighter_bybit_arb, timeframe) : "No suggestion available",
                lighter_hl_suggestion: lighter_hl_arb ? getArbSuggestion(lighter_hl_arb, timeframe) : "No suggestion available",
            };
        });
    }, [fundingData, timeframe, getRateByTimeframe, getArbByTimeframe, getArbSuggestion]);

    // Filter and sort data
    const { filteredData, sortedData } = useMemo(() => {
        const formatted = formatTableData();
        const filtered = formatted.filter(item =>
            item.symbol.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        const sorted = [...filtered].sort((a, b) => {
            if (!fundingData) return 0;
            const aItem = fundingData.lighter.find((item: any) => item.symbol === a.symbol);
            const bItem = fundingData.lighter.find((item: any) => item.symbol === b.symbol);
            
            if (!aItem || !bItem) return 0;
            return aItem.market_id - bItem.market_id;
        });
        
        return { filteredData: filtered, sortedData: sorted };
    }, [formatTableData, searchTerm, fundingData]);

    // Format percentage
    const formatPercentage = useCallback((value: number, showSign: boolean = false): string => {
        if (value === 0) return "--";
        if (showSign) {
            const sign = value >= 0 ? "+" : "";
            return `${sign}${(value * 100).toFixed(4)}%`;
        } else {
            return `${Math.abs(value * 100).toFixed(4)}%`;
        }
    }, []);

    // Get color for value
    const getValueColor = useCallback((value: number, isArb: boolean = false): string => {
        if (value === 0) return "text-neutral-400";
        
        if (isArb) {
            return value >= 0 ? "text-[#1FA67D]" : "text-[#EC6F87]";
        } else {
            return value >= 0 ? "text-[#1FA67D]" : "text-[#EC6F87]";
        }
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#121218] text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-neutral-400">Loading funding data...</p>
                </div>
            </div>
        );
    }

    if (error || !fundingData) {
        return (
            <div className="min-h-screen bg-[#121218] text-white flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-400 mb-4">Failed to load funding data</p>
                    <p className="text-neutral-400">Please try again later</p>
                </div>
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-[#121218] text-white">
                {/* Navbar */}
                <nav className="fixed top-0 left-0 right-0 z-50 bg-[#121218]/80 backdrop-blur-md border-b border-neutral-800">
                <div className="flex items-center justify-between px-4 sm:px-6 py-4">
                    {/* Logo */}
                    <div className="flex items-center space-x-2 sm:space-x-3">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="sm:hidden p-1 text-neutral-400 hover:text-white transition-colors"
                        >
                            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                        <img
                            src="https://lighter.xyz/_astro/logo.DJnDsPC3.svg"
                            alt="LighterPulse"
                            className="w-6 h-6 sm:w-8 sm:h-8"
                        />
                        <span className="text-lg sm:text-xl font-bold text-white">LighterPulse</span>
                    </div>

                    {/* Right Navigation */}
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        <Link 
                            href={userAddress ? `/dashboard/${userAddress}` : "/dashboard/0x0000000000000000000000000000000000000000"}
                            className="flex items-center space-x-1 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-neutral-300 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>Dashboard</span>
                        </Link>
                        <button className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-neutral-300 hover:text-white transition-colors">
                            Explorer
                        </button>
                        <Link 
                            href="/support"
                            className="px-2 sm:px-4 py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors"
                        >
                            Support
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="pt-20">
                <div className="p-4 sm:p-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-4 sm:space-y-0">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Funding Comparison</h1>
                            <p className="text-neutral-400 text-sm sm:text-base">Funding rate differences across exchanges</p>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="mb-6">
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                        {/* Search Box */}
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search by coin"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Timeframe Dropdown */}
                        <div className="relative">
                            <select
                                value={timeframe}
                                onChange={(e) => setTimeframe(e.target.value as Timeframe)}
                                className="appearance-none bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                            >
                                <option value="1h">Hourly</option>
                                <option value="8h">8 Hours</option>
                                <option value="1d">Daily</option>
                                <option value="1w">Weekly</option>
                                <option value="1y">Yearly</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Funding Table */}
                <div className="relative group">
                    <div className="relative h-full rounded-2xl border p-2 md:rounded-3xl md:p-3">
                        <GlowingEffect
                            spread={40}
                            glow={true}
                            disabled={false}
                            proximity={64}
                            inactiveZone={0.01}
                        />
                        <div className="border-0.75 relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl p-6 md:p-6 dark:shadow-[0px_0px_27px_0px_#2D2D2D] bg-[#121218]">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[1000px]">
                                    <thead>
                                        <tr className="border-b border-neutral-800">
                                            <th className="text-left py-3 px-4 text-neutral-400 font-medium text-sm">Market</th>
                                            <th className="text-right py-3 px-4 text-neutral-400 font-medium text-sm">Lighter</th>
                                            <th className="text-right py-3 px-4 text-neutral-400 font-medium text-sm">Binance</th>
                                            <th className="text-right py-3 px-4 text-neutral-400 font-medium text-sm">Lighter-Binance-Arb</th>
                                            <th className="text-right py-3 px-4 text-neutral-400 font-medium text-sm">Bybit</th>
                                            <th className="text-right py-3 px-4 text-neutral-400 font-medium text-sm">Lighter-Bybit-Arb</th>
                                            <th className="text-right py-3 px-4 text-neutral-400 font-medium text-sm">HL</th>
                                            <th className="text-right py-3 px-4 text-neutral-400 font-medium text-sm">Lighter-HL-Arb</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedData.map((item, index) => (
                                            <tr key={index} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                                                <td className="py-3 px-4">
                                                    <span className="text-white font-medium text-sm">{item.symbol}</span>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <span className={cn(
                                                        "text-sm font-medium",
                                                        getValueColor(item.lighter)
                                                    )}>
                                                        {formatPercentage(item.lighter, false)}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <span className={cn(
                                                        "text-sm font-medium",
                                                        getValueColor(item.binance)
                                                    )}>
                                                        {formatPercentage(item.binance, false)}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className={cn(
                                                                "text-sm font-medium cursor-help",
                                                                getValueColor(item.lighter_binance_arb, true)
                                                            )}>
                                                                {formatPercentage(item.lighter_binance_arb, true)}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent 
                                                            side="top" 
                                                            className="bg-neutral-900 border border-neutral-700 text-white max-w-xs p-2"
                                                            sideOffset={5}
                                                        >
                                                            <p className="text-xs text-neutral-300">{item.lighter_binance_suggestion}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <span className={cn(
                                                        "text-sm font-medium",
                                                        getValueColor(item.bybit)
                                                    )}>
                                                        {formatPercentage(item.bybit, false)}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className={cn(
                                                                "text-sm font-medium cursor-help",
                                                                getValueColor(item.lighter_bybit_arb, true)
                                                            )}>
                                                                {formatPercentage(item.lighter_bybit_arb, true)}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent 
                                                            side="top" 
                                                            className="bg-neutral-900 border border-neutral-700 text-white max-w-xs p-2"
                                                            sideOffset={5}
                                                        >
                                                            <p className="text-xs text-neutral-300">{item.lighter_bybit_suggestion}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <span className={cn(
                                                        "text-sm font-medium",
                                                        getValueColor(item.hyperliquid)
                                                    )}>
                                                        {formatPercentage(item.hyperliquid, false)}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className={cn(
                                                                "text-sm font-medium cursor-help",
                                                                getValueColor(item.lighter_hl_arb, true)
                                                            )}>
                                                                {formatPercentage(item.lighter_hl_arb, true)}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent 
                                                            side="top" 
                                                            className="bg-neutral-900 border border-neutral-700 text-white max-w-xs p-2"
                                                            sideOffset={5}
                                                        >
                                                            <p className="text-xs text-neutral-300">{item.lighter_hl_suggestion}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {sortedData.length === 0 && (
                                <div className="text-center py-12">
                                    <Search className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                                    <p className="text-neutral-400">No funding data found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                </div>
            </div>
        </div>
        </TooltipProvider>
    );
}