"use client";
import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Menu, X, ArrowLeft, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { GlowingEffect } from "@/components/aceternity/glow-cards";
import { cn } from "@/lib/utils";
import { getExchangeStats } from "@/utils/getExchangeStats";
import { ExchangeStat } from "@/types/excahngeStats";
import Link from "next/link";

function ExchangeStatsContent() {
    const [exchangeData, setExchangeData] = useState<ExchangeStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const searchParams = useSearchParams();
    const userAddress = searchParams?.get('from') || "";
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const fetchData = useCallback(async (isInitialLoad = false) => {
        try {
            if (isInitialLoad) {
                setLoading(true);
            }
            setError(null);
            const data = await getExchangeStats();
            if (data) {
                setExchangeData(data.stats);
                setLastUpdated(new Date());
            } else {
                setError("Failed to fetch exchange stats");
            }
        } catch (err) {
            setError("Failed to fetch exchange stats");
            console.error("Error fetching exchange stats:", err);
        } finally {
            if (isInitialLoad) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        fetchData(true);
    }, [fetchData]);

    const filteredData = useMemo(() => 
        exchangeData.filter(item =>
            item.symbol.toLowerCase().includes(searchTerm.toLowerCase())
        ), [exchangeData, searchTerm]);

    const formatPrice = useCallback((price: number): string => {
        if (price >= 1) {
            return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } else {
            return `$${price.toFixed(6)}`;
        }
    }, []);

    const formatVolume = useCallback((volume: number): string => {
        if (volume >= 1000000) {
            return `$${(volume / 1000000).toFixed(2)}M`;
        } else if (volume >= 1000) {
            return `$${(volume / 1000).toFixed(2)}K`;
        } else {
            return `$${volume.toFixed(2)}`;
        }
    }, []);

    const formatPercentage = useCallback((value: number): string => {
        const sign = value >= 0 ? "+" : "";
        return `${sign}${value.toFixed(2)}%`;
    }, []);

    const getPriceChangeColor = useCallback((value: number): string => {
        return value >= 0 ? "text-[#1FA67D]" : "text-[#EC6F87]";
    }, []);

    const getPriceChangeIcon = useCallback((value: number) => {
        return value >= 0 ? TrendingUp : TrendingDown;
    }, []);

    const formatLastUpdated = useCallback((date: Date): string => {
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#121218] text-white">
                <nav className="fixed top-0 left-0 right-0 z-50 bg-[#121218]/80 backdrop-blur-md border-b border-neutral-800">
                    <div className="flex items-center justify-between px-4 sm:px-6 py-4">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-neutral-700 rounded animate-pulse"></div>
                            <div className="w-32 h-6 bg-neutral-700 rounded animate-pulse"></div>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-4">
                            <div className="w-16 h-8 bg-neutral-700 rounded animate-pulse"></div>
                            <div className="w-16 h-8 bg-neutral-700 rounded animate-pulse"></div>
                            <div className="w-16 h-8 bg-neutral-700 rounded animate-pulse"></div>
                        </div>
                    </div>
                </nav>

                <div className="pt-20 p-4 sm:p-8">
                    <div className="mb-6 sm:mb-8">
                        <div className="w-40 sm:w-48 h-6 sm:h-8 bg-neutral-800 rounded animate-pulse mb-3 sm:mb-4"></div>
                        <div className="w-80 sm:w-96 h-3 sm:h-4 bg-neutral-800 rounded animate-pulse"></div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6">
                        {[1,2,3].map((i) => (
                            <div key={i} className={`h-24 sm:h-28 lg:h-32 bg-neutral-900 rounded-xl sm:rounded-2xl border border-neutral-800 animate-pulse ${i === 3 ? 'sm:col-span-2 lg:col-span-1' : ''}`}></div>
                        ))}
                    </div>

                    <div className="mb-4 sm:mb-6">
                        <div className="w-full max-w-md mx-auto sm:mx-0">
                            <div className="w-full h-10 sm:h-9 bg-neutral-800 rounded animate-pulse"></div>
                        </div>
                    </div>

                    <div className="relative group">
                        <div className="relative h-full rounded-xl sm:rounded-2xl border p-1.5 sm:p-2 md:rounded-3xl md:p-3">
                            <div className="border-0.75 relative flex h-full flex-col justify-between gap-4 sm:gap-6 overflow-hidden rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 dark:shadow-[0px_0px_27px_0px_#2D2D2D] bg-[#121218]">
                                {/* Desktop skeleton */}
                                <div className="hidden xl:block space-y-3">
                                    {[1,2,3,4,5,6,7,8].map((i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg animate-pulse">
                                            <div className="w-16 h-4 bg-neutral-700 rounded"></div>
                                            <div className="w-20 h-4 bg-neutral-700 rounded"></div>
                                            <div className="w-24 h-4 bg-neutral-700 rounded"></div>
                                            <div className="w-20 h-4 bg-neutral-700 rounded"></div>
                                            <div className="w-20 h-4 bg-neutral-700 rounded"></div>
                                            <div className="w-16 h-4 bg-neutral-700 rounded"></div>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Tablet skeleton */}
                                <div className="hidden lg:block xl:hidden space-y-2">
                                    {[1,2,3,4,5,6,7,8].map((i) => (
                                        <div key={i} className="flex items-center justify-between p-2 bg-neutral-800 rounded-lg animate-pulse">
                                            <div className="w-12 h-3 bg-neutral-700 rounded"></div>
                                            <div className="w-16 h-3 bg-neutral-700 rounded"></div>
                                            <div className="w-20 h-3 bg-neutral-700 rounded"></div>
                                            <div className="w-16 h-3 bg-neutral-700 rounded"></div>
                                            <div className="w-16 h-3 bg-neutral-700 rounded"></div>
                                            <div className="w-12 h-3 bg-neutral-700 rounded"></div>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Mobile skeleton */}
                                <div className="lg:hidden space-y-3">
                                    {[1,2,3,4,5].map((i) => (
                                        <div key={i} className="bg-neutral-800/50 rounded-lg p-3 sm:p-4 animate-pulse">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="w-16 h-5 bg-neutral-700 rounded"></div>
                                                <div className="w-20 h-4 bg-neutral-700 rounded"></div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="w-full h-4 bg-neutral-700 rounded"></div>
                                                <div className="w-full h-4 bg-neutral-700 rounded"></div>
                                                <div className="w-full h-4 bg-neutral-700 rounded"></div>
                                                <div className="w-full h-4 bg-neutral-700 rounded"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !exchangeData.length) {
        return (
            <div className="min-h-screen bg-[#121218] text-white flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-400 mb-4">Failed to load exchange stats</p>
                    <p className="text-neutral-400">Please try again later</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#121218] text-white">
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#121218]/80 backdrop-blur-md border-b border-neutral-800">
                <div className="flex items-center justify-between px-4 sm:px-6 py-4">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="sm:hidden p-1 text-neutral-400 hover:text-white transition-colors"
                        >
                            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                        <img
                            src="/logo.png"
                            alt="LighterPulse"
                            className="w-12 h-12 sm:w-14 sm:h-14"
                        />
                        <span className="text-lg hidden sm:block sm:text-xl font-bold text-white">LighterPulse</span>
                    </div>

                    <div className="flex items-center space-x-2 sm:space-x-4">
                        <Link 
                            href={userAddress ? `/dashboard/${userAddress}` : "/dashboard/0x0000000000000000000000000000000000000000"}
                            className="flex items-center space-x-1 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-neutral-300 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>Dashboard</span>
                        </Link>
                        <Link 
                           href="/explorer"
                           className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-neutral-300 hover:text-white transition-colors">
                           Explorer
                        </Link>
                        <Link 
                            href="/support"
                            className="px-2 sm:px-4 py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors"
                        >
                            Support
                        </Link>
                    </div>
                </div>
            </nav>

            <div className="pt-20">
                <div className="p-4 sm:p-8">
                    <div className="mb-6 sm:mb-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-3 sm:space-y-0">
                            <div>
                                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2">Exchange Stats</h1>
                                <p className="text-neutral-400 text-xs sm:text-sm md:text-base">
                                    Real-time trading statistics for all pairs on Lighter Exchange
                                    {lastUpdated && (
                                        <span className="block sm:inline sm:ml-2 text-xs text-neutral-500 mt-1 sm:mt-0">
                                            • Last updated: {formatLastUpdated(lastUpdated)}
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div className="flex items-center space-x-2 sm:space-x-3">
                                <button 
                                    onClick={() => fetchData(false)}
                                    disabled={loading}
                                    className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <RefreshCw className={cn("w-3 h-3 sm:w-4 sm:h-4", loading && "animate-spin")} />
                                    <span className="hidden sm:inline">Refresh</span>
                                    <span className="sm:hidden">Refresh</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6">
                        <div className="relative group">
                            <div className="relative h-full rounded-xl sm:rounded-2xl border p-1.5 sm:p-2 md:rounded-3xl md:p-3">
                                <GlowingEffect
                                    spread={40}
                                    glow={true}
                                    disabled={false}
                                    proximity={64}
                                    inactiveZone={0.01}
                                />
                                <div className="border-0.75 relative flex h-full items-center gap-3 sm:gap-4 overflow-hidden rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 dark:shadow-[0px_0px_27px_0px_#2D2D2D] bg-neutral-900">
                                    <div className="p-1.5 sm:p-2 md:p-3 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500">
                                        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-neutral-400 text-xs sm:text-sm mb-1 truncate">Total Pairs</p>
                                        <p className="text-base sm:text-lg md:text-2xl font-bold text-white transition-all duration-300">{exchangeData.length}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="relative group">
                            <div className="relative h-full rounded-xl sm:rounded-2xl border p-1.5 sm:p-2 md:rounded-3xl md:p-3">
                                <GlowingEffect
                                    spread={40}
                                    glow={true}
                                    disabled={false}
                                    proximity={64}
                                    inactiveZone={0.01}
                                />
                                <div className="border-0.75 relative flex h-full items-center gap-3 sm:gap-4 overflow-hidden rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 dark:shadow-[0px_0px_27px_0px_#2D2D2D] bg-neutral-900">
                                    <div className="p-1.5 sm:p-2 md:p-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
                                        <Search className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-neutral-400 text-xs sm:text-sm mb-1 truncate">Total Daily Trades</p>
                                        <p className="text-base sm:text-lg md:text-2xl font-bold text-white transition-all duration-300">
                                            {exchangeData.reduce((sum, item) => sum + item.dailyTradesCount, 0).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="relative group sm:col-span-2 lg:col-span-1">
                            <div className="relative h-full rounded-xl sm:rounded-2xl border p-1.5 sm:p-2 md:rounded-3xl md:p-3">
                                <GlowingEffect
                                    spread={40}
                                    glow={true}
                                    disabled={false}
                                    proximity={64}
                                    inactiveZone={0.01}
                                />
                                <div className="border-0.75 relative flex h-full items-center gap-3 sm:gap-4 overflow-hidden rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 dark:shadow-[0px_0px_27px_0px_#2D2D2D] bg-neutral-900">
                                    <div className="p-1.5 sm:p-2 md:p-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
                                        <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-neutral-400 text-xs sm:text-sm mb-1 truncate">Total Volume (24h)</p>
                                        <p className="text-base sm:text-lg md:text-2xl font-bold text-white transition-all duration-300">
                                            ${(exchangeData.reduce((sum, item) => sum + item.dailyQuoteTokenVolume, 0) / 1000000).toFixed(2)}M
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mb-4 sm:mb-6">
                        <div className="w-full max-w-md mx-auto sm:mx-0">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search by symbol..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-10 pr-4 py-2.5 sm:py-2 text-sm sm:text-base text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="relative group">
                        <div className="relative h-full rounded-xl sm:rounded-2xl border p-1.5 sm:p-2 md:rounded-3xl md:p-3">
                            <GlowingEffect
                                spread={40}
                                glow={true}
                                disabled={false}
                                proximity={64}
                                inactiveZone={0.01}
                            />
                            <div className="border-0.75 relative flex h-full flex-col justify-between gap-4 sm:gap-6 overflow-hidden rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 dark:shadow-[0px_0px_27px_0px_#2D2D2D] bg-[#121218]">
                                {/* Desktop Table View */}
                                <div className="hidden xl:block overflow-x-auto">
                                    <table className="w-full min-w-[1000px]">
                                        <thead>
                                            <tr className="border-b border-neutral-800">
                                                <th className="text-left py-3 px-4 text-neutral-400 font-medium text-sm">Symbol</th>
                                                <th className="text-right py-3 px-4 text-neutral-400 font-medium text-sm">Last Trade Price</th>
                                                <th className="text-right py-3 px-4 text-neutral-400 font-medium text-sm">Daily Trades</th>
                                                <th className="text-right py-3 px-4 text-neutral-400 font-medium text-sm">Base Volume</th>
                                                <th className="text-right py-3 px-4 text-neutral-400 font-medium text-sm">Quote Volume</th>
                                                <th className="text-right py-3 px-4 text-neutral-400 font-medium text-sm">24h Change</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredData.map((item, index) => {
                                                const PriceChangeIcon = getPriceChangeIcon(item.dailyPriceChange);
                                                return (
                                                    <tr key={index} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                                                        <td className="py-3 px-4">
                                                            <span className="text-white font-medium text-sm">{item.symbol}</span>
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            <span className="text-white font-medium text-sm transition-all duration-300">
                                                                {formatPrice(item.lastTradePrice)}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            <span className="text-neutral-300 text-sm transition-all duration-300">
                                                                {item.dailyTradesCount.toLocaleString()}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            <span className="text-neutral-300 text-sm transition-all duration-300">
                                                                {item.dailyBaseTokenVolume}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            <span className="text-neutral-300 text-sm transition-all duration-300">
                                                                {formatVolume(item.dailyQuoteTokenVolume)}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            <div className="flex items-center justify-end space-x-1">
                                                                <PriceChangeIcon className={cn(
                                                                    "w-3 h-3",
                                                                    getPriceChangeColor(item.dailyPriceChange)
                                                                )} />
                                                                <span className={cn(
                                                                    "text-sm font-medium transition-all duration-300",
                                                                    getPriceChangeColor(item.dailyPriceChange)
                                                                )}>
                                                                    {formatPercentage(item.dailyPriceChange)}
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Tablet Table View */}
                                <div className="hidden lg:block xl:hidden overflow-x-auto">
                                    <table className="w-full min-w-[800px]">
                                        <thead>
                                            <tr className="border-b border-neutral-800">
                                                <th className="text-left py-2 px-3 text-neutral-400 font-medium text-xs">Symbol</th>
                                                <th className="text-right py-2 px-3 text-neutral-400 font-medium text-xs">Price</th>
                                                <th className="text-right py-2 px-3 text-neutral-400 font-medium text-xs">Trades</th>
                                                <th className="text-right py-2 px-3 text-neutral-400 font-medium text-xs">Base Vol</th>
                                                <th className="text-right py-2 px-3 text-neutral-400 font-medium text-xs">Quote Vol</th>
                                                <th className="text-right py-2 px-3 text-neutral-400 font-medium text-xs">24h</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredData.map((item, index) => {
                                                const PriceChangeIcon = getPriceChangeIcon(item.dailyPriceChange);
                                                return (
                                                    <tr key={index} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                                                        <td className="py-2 px-3">
                                                            <span className="text-white font-medium text-xs">{item.symbol}</span>
                                                        </td>
                                                        <td className="py-2 px-3 text-right">
                                                            <span className="text-white font-medium text-xs transition-all duration-300">
                                                                {formatPrice(item.lastTradePrice)}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 px-3 text-right">
                                                            <span className="text-neutral-300 text-xs transition-all duration-300">
                                                                {item.dailyTradesCount.toLocaleString()}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 px-3 text-right">
                                                            <span className="text-neutral-300 text-xs transition-all duration-300">
                                                                {item.dailyBaseTokenVolume}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 px-3 text-right">
                                                            <span className="text-neutral-300 text-xs transition-all duration-300">
                                                                {formatVolume(item.dailyQuoteTokenVolume)}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 px-3 text-right">
                                                            <div className="flex items-center justify-end space-x-1">
                                                                <PriceChangeIcon className={cn(
                                                                    "w-3 h-3",
                                                                    getPriceChangeColor(item.dailyPriceChange)
                                                                )} />
                                                                <span className={cn(
                                                                    "text-xs font-medium transition-all duration-300",
                                                                    getPriceChangeColor(item.dailyPriceChange)
                                                                )}>
                                                                    {formatPercentage(item.dailyPriceChange)}
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Card View */}
                                <div className="lg:hidden space-y-3">
                                    {filteredData.map((item, index) => {
                                        const PriceChangeIcon = getPriceChangeIcon(item.dailyPriceChange);
                                        return (
                                            <div key={index} className="bg-neutral-800/50 rounded-lg p-3 sm:p-4 hover:bg-neutral-800/70 transition-colors">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="text-white font-semibold text-base sm:text-lg">{item.symbol}</span>
                                                    <div className="flex items-center space-x-1">
                                                        <PriceChangeIcon className={cn(
                                                            "w-4 h-4",
                                                            getPriceChangeColor(item.dailyPriceChange)
                                                        )} />
                                                        <span className={cn(
                                                            "text-sm font-medium transition-all duration-300",
                                                            getPriceChangeColor(item.dailyPriceChange)
                                                        )}>
                                                            {formatPercentage(item.dailyPriceChange)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 text-sm">
                                                    <div>
                                                        <p className="text-neutral-400 text-xs mb-1">Price</p>
                                                        <p className="text-white font-medium transition-all duration-300">
                                                            {formatPrice(item.lastTradePrice)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-neutral-400 text-xs mb-1">Trades</p>
                                                        <p className="text-neutral-300 transition-all duration-300">
                                                            {item.dailyTradesCount.toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-neutral-400 text-xs mb-1">Base Volume</p>
                                                        <p className="text-neutral-300 transition-all duration-300">
                                                            {item.dailyBaseTokenVolume}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-neutral-400 text-xs mb-1">Quote Volume</p>
                                                        <p className="text-neutral-300 transition-all duration-300">
                                                            {formatVolume(item.dailyQuoteTokenVolume)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {filteredData.length === 0 && (
                                    <div className="text-center py-8 sm:py-12">
                                        <Search className="w-8 h-8 sm:w-12 sm:h-12 text-neutral-600 mx-auto mb-3 sm:mb-4" />
                                        <p className="text-neutral-400 text-sm sm:text-base">No exchange stats found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ExchangeStatsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#121218] text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-neutral-400">Loading exchange stats...</p>
                </div>
            </div>
        }>
            <ExchangeStatsContent />
        </Suspense>
    );
}
