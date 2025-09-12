"use client";
import { DashboardParams, PageProps } from "@/types/routes";
import { useState, useEffect, useMemo, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { validateEthereumAddress } from "@/utils/validation";
import {
    Search,
    Wallet,
    TrendingUp,
    Shield,
    Activity,
    BarChart3,
    Home,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    Eye,
    Copy,
    Clock,
    Hash,
    Target,
    Zap,
    Menu,
    X,
    Megaphone,
    TrendingDown,
    RefreshCw
} from "lucide-react";
import { GlowingEffect } from "@/components/aceternity/glow-cards";
import { cn } from "@/lib/utils";
import { getAccountData, AccountData, KPIData, Position } from "@/utils/getBalancePositions";

export default function DashboardPage({ params }: { params: Promise<DashboardParams> }) {
    const resolvedParams = use(params) as DashboardParams;
    const [activeTab, setActiveTab] = useState("positions");
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [addressInput, setAddressInput] = useState(resolvedParams.address);
    const [accountData, setAccountData] = useState<AccountData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [initialLoad, setInitialLoad] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [searchError, setSearchError] = useState<string | null>(null);
    const router = useRouter();

    const sidebarItems = useMemo(() => [
        { id: "dashboard", label: "Dashboard", icon: Home, active: true, type: "button" },
        { id: "explorer", label: "Explorer", icon: Hash, type: "link", href: `/explorer?from=${resolvedParams.address}`},
        { id: "fundings", label: "Fundings", icon: DollarSign, type: "link", href: `/funding-comparison?from=${resolvedParams.address}` },
        { id: "announcements", label: "Announcements", icon: Megaphone, type: "link", href: `/announcements?from=${resolvedParams.address}` },
        { id: "exchange-stats", label: "Exchange Stats", icon: TrendingDown, type: "link", href: `/exchange-stats?from=${resolvedParams.address}` },
        { id: "analytics", label: "Analytics", icon: BarChart3, type: "button" },
    ], [resolvedParams.address]);

    // Fetch account data
    const fetchData = useCallback(async () => {
            try {
                setLoading(true);
                setError(null);
            
                const data = await getAccountData(resolvedParams.address);
                setAccountData(data);
            setLastUpdated(new Date());
            } catch (err) {
                setError("Failed to fetch account data");
                console.error("Error fetching account data:", err);
            } finally {
                setLoading(false);
            setInitialLoad(false);
            }
    }, [resolvedParams.address]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Format KPI data
    const formatKPIs = useCallback((kpis: KPIData) => [
        {
            title: "Total Balance",
            value: `$${kpis.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            change: `${kpis.roi >= 0 ? '+' : ''}${kpis.roi.toFixed(2)}%`,
            changeType: kpis.roi >= 0 ? "positive" : "negative",
            icon: Wallet,
            color: "from-blue-500 to-cyan-500"
        },
        {
            title: "Collateral Value",
            value: `$${kpis.collateral.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            change: "+0.00%",
            changeType: "positive",
            icon: Shield,
            color: "from-green-500 to-emerald-500"
        },
        {
            title: "Open Positions",
            value: kpis.openPositionsCount.toString(),
            change: "0",
            changeType: "positive",
            icon: Activity,
            color: "from-purple-500 to-pink-500"
        },
        {
            title: "Unrealized P&L",
            value: `$${kpis.unrealizedPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            change: `${kpis.roi >= 0 ? '+' : ''}${kpis.roi.toFixed(2)}%`,
            changeType: kpis.unrealizedPnl >= 0 ? "positive" : "negative",
            icon: TrendingUp,
            color: "from-orange-500 to-red-500"
        }
    ], []);

    // Format positions data
    const formatPositions = useCallback((positions: Position[]) =>
        positions.map(pos => ({
            pair: pos.symbol,
            type: pos.direction,
            size: `${Math.abs(pos.size).toFixed(4)}`,
            positionValue: `$${pos.positionValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            entry: pos.entryPrice.toFixed(2),
            current: pos.entryPrice.toFixed(2), // Using entry price as current for now
            margin: `$${pos.margin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            pnl: `${pos.pnl >= 0 ? '+' : ''}$${pos.pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            pnlPercent: `${pos.returnPct >= 0 ? '+' : ''}${pos.returnPct.toFixed(2)}%`
        })), []);

    const kpis = useMemo(() => accountData ? formatKPIs(accountData.kpis) : [], [accountData, formatKPIs]);
    const positions = useMemo(() => accountData ? formatPositions(accountData.positions) : [], [accountData, formatPositions]);

    // Copy address to clipboard
    const copyAddress = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(resolvedParams.address);
            // You could add a toast notification here
        } catch (err) {
            console.error('Failed to copy address:', err);
        }
    }, [resolvedParams.address]);

    // Handle search input
    const handleSearchSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        setSearchError(null);
        
        const trimmedAddress = addressInput.trim();
        
        if (validateEthereumAddress(trimmedAddress)) {
            // Navigate to the new address dashboard
            router.push(`/dashboard/${trimmedAddress}`);
        } else {
            setSearchError('Please enter a valid Ethereum address');
        }
    }, [addressInput, router]);

    // Show skeleton loading instead of full page loading
    if (initialLoad && loading) {
        return (
            <div className="min-h-screen bg-[#121218] text-white">
                {/* Navbar */}
                <nav className="fixed top-0 left-0 right-0 z-50 bg-[#121218]/80 backdrop-blur-md border-b border-neutral-800">
                    <div className="flex items-center justify-between px-4 sm:px-6 py-4">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-neutral-700 rounded animate-pulse"></div>
                            <div className="w-32 h-6 bg-neutral-700 rounded animate-pulse"></div>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-4">
                            <div className="w-16 h-8 bg-neutral-700 rounded animate-pulse"></div>
                            <div className="w-16 h-8 bg-neutral-700 rounded animate-pulse"></div>
                        </div>
                    </div>
                </nav>

                {/* Main Content Skeleton */}
                <div className="flex pt-20">
                    {/* Sidebar Skeleton */}
                    <div className="w-64 bg-neutral-900 border-r border-neutral-800 p-4">
                        {[1,2,3,4,5].map((i) => (
                            <div key={i} className="w-full h-12 bg-neutral-800 rounded-lg mb-2 animate-pulse"></div>
                        ))}
                    </div>

                    {/* Content Skeleton */}
                    <div className="flex-1 p-4 sm:p-8">
                        <div className="mb-8">
                            <div className="w-48 h-8 bg-neutral-800 rounded animate-pulse mb-4"></div>
                            <div className="w-96 h-4 bg-neutral-800 rounded animate-pulse"></div>
                        </div>

                        {/* KPI Cards Skeleton */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                            {[1,2,3,4].map((i) => (
                                <div key={i} className="h-32 bg-neutral-900 rounded-2xl border border-neutral-800 animate-pulse"></div>
                            ))}
                        </div>

                        {/* Content Skeleton */}
                        <div className="w-full h-96 bg-neutral-900 rounded-2xl border border-neutral-800 animate-pulse"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !accountData) {
        return (
            <div className="min-h-screen bg-[#121218] text-white flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-400 mb-4">Failed to load dashboard data</p>
                    <p className="text-neutral-400">Please check the address and try again</p>
                </div>
            </div>
        );
    }

    return (
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

                    {/* Center Search */}
                    <div className="flex-1 max-w-md mx-4 sm:mx-8 hidden sm:block">
                        <form onSubmit={handleSearchSubmit} className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Enter Ethereum address"
                                value={addressInput}
                                onChange={(e) => {
                                    setAddressInput(e.target.value);
                                    setSearchError(null);
                                }}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            {searchError && (
                                <p className="absolute top-full left-0 mt-1 text-red-400 text-xs">{searchError}</p>
                            )}
                        </form>
                    </div>

                    {/* Right Navigation */}
                    <div className="flex items-center space-x-2 sm:space-x-4">

                        <Link 
                            href="/explorer"
                            className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-neutral-300 hover:text-white transition-colors"
                        >
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

            {/* Main Content */}
            <div className="flex pt-20">
                {/* Sidebar */}
                <div className={cn(
                    "fixed left-0 top-20 h-full bg-neutral-900 border-r border-neutral-800 transition-all duration-300 z-40",
                    sidebarCollapsed ? "w-16" : "w-64",
                    "sm:translate-x-0",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
                )}>
                    <div className="p-4">
                        {sidebarItems.map((item) => (
                            item.type === "link" ? (
                                <Link
                                    key={item.id}
                                    href={item.href || ""}
                                    className={cn(
                                        "w-full flex items-center space-x-3 px-3 py-3 rounded-lg mb-2 transition-all duration-200",
                                        "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                                    )}
                                >
                                    <item.icon className="w-5 h-5 flex-shrink-0" />
                                    {!sidebarCollapsed && (
                                        <span className="text-sm font-medium">{item.label}</span>
                                    )}
                                </Link>
                            ) : (
                                <button
                                    key={item.id}
                                    className={cn(
                                        "w-full flex items-center space-x-3 px-3 py-3 rounded-lg mb-2 transition-all duration-200",
                                        item.active
                                            ? "bg-blue-600 text-white"
                                            : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                                    )}
                                >
                                    <item.icon className="w-5 h-5 flex-shrink-0" />
                                    {!sidebarCollapsed && (
                                        <span className="text-sm font-medium">{item.label}</span>
                                    )}
                                </button>
                            )
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className={cn(
                    "flex-1 transition-all duration-300",
                    "ml-0 sm:ml-64",
                    sidebarCollapsed ? "sm:ml-16" : "sm:ml-64"
                )}>
                    <div className="p-4 sm:p-8">
                        {/* Header */}
                        <div className="mb-8">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-4 sm:space-y-0">
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Dashboard</h1>
                                    <p className="text-neutral-400 text-sm sm:text-base">
                                        Address: {resolvedParams.address}
                                        {lastUpdated && (
                                            <span className="ml-2 text-xs text-neutral-500">
                                                • Last updated: {lastUpdated.toLocaleTimeString()}
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div className="flex items-center space-x-2 sm:space-x-3">
                                    <button 
                                        onClick={fetchData}
                                        disabled={loading}
                                        className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <RefreshCw className={cn("w-3 h-3 sm:w-4 sm:h-4", loading && "animate-spin")} />
                                        <span className="hidden sm:inline">Refresh</span>
                                        <span className="sm:hidden">Refresh</span>
                                    </button>
                                    <button 
                                        onClick={copyAddress}
                                        className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors text-xs sm:text-sm"
                                    >
                                        <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                                        <span className="hidden sm:inline">Copy Address</span>
                                        <span className="sm:hidden">Copy</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                            {kpis.map((kpi, index) => (
                                <div key={index} className="relative group">
                                    <div className="relative h-full rounded-2xl border p-2 md:rounded-3xl md:p-3">
                                        <GlowingEffect
                                            spread={40}
                                            glow={true}
                                            disabled={false}
                                            proximity={64}
                                            inactiveZone={0.01}
                                        />
                                        <div className="border-0.75 relative flex h-full flex-col justify-between gap-4 sm:gap-6 overflow-hidden rounded-xl p-4 sm:p-6 md:p-6 dark:shadow-[0px_0px_27px_0px_#2D2D2D] bg-neutral-900">
                                            <div className="flex items-center justify-between">
                                                <div className={`p-2 sm:p-3 rounded-lg bg-gradient-to-r ${kpi.color}`}>
                                                    <kpi.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                                </div>
                                                <div className={cn(
                                                    "flex items-center space-x-1 text-xs sm:text-sm font-medium",
                                                    kpi.changeType === "positive" ? "text-[#17A970]" : "text-[#FF384F]"
                                                )}>
                                                    {kpi.changeType === "positive" ? (
                                                        <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" />
                                                    ) : (
                                                        <ArrowDownRight className="w-3 h-3 sm:w-4 sm:h-4" />
                                                    )}
                                                    <span>{kpi.change}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-neutral-400 text-xs sm:text-sm mb-1">{kpi.title}</p>
                                                <p className="text-lg sm:text-2xl font-bold text-white">{kpi.value}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Tabs */}
                        <div className="mb-6">
                            <div className="flex space-x-1 bg-neutral-900 p-1 rounded-lg w-fit">
                                {["positions", "overview", "analytics"].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={cn(
                                            "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 capitalize",
                                            activeTab === tab
                                                ? "bg-blue-600 text-white"
                                                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                                        )}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="space-y-6">
                            {activeTab === "overview" && (
                                <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                                    {/* Quick Actions */}
                                    <div className="relative group">
                                        <div className="relative h-full rounded-2xl border p-2 md:rounded-3xl md:p-3">
                                            <GlowingEffect
                                                spread={40}
                                                glow={true}
                                                disabled={false}
                                                proximity={64}
                                                inactiveZone={0.01}
                                            />
                                            <div className="border-0.75 relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl p-6 md:p-6 dark:shadow-[0px_0px_27px_0px_#2D2D2D] bg-neutral-900">
                                                <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <a 
                                                        href="https://app.lighter.xyz/trade/ETH?referral=5BHSFETV46UG"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex flex-col items-center p-4 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors"
                                                    >
                                                        <DollarSign className="w-6 h-6 text-blue-400 mb-2" />
                                                        <span className="text-sm text-white">Deposit</span>
                                                    </a>
                                                    <a 
                                                        href="https://app.lighter.xyz/trade/ETH?referral=5BHSFETV46UG"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex flex-col items-center p-4 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors"
                                                    >
                                                        <Activity className="w-6 h-6 text-purple-400 mb-2" />
                                                        <span className="text-sm text-white">Trade</span>
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "positions" && (
                                <div className="relative group">
                                    <div className="relative h-full rounded-2xl border p-2 md:rounded-3xl md:p-3">
                                        <GlowingEffect
                                            spread={40}
                                            glow={true}
                                            disabled={false}
                                            proximity={64}
                                            inactiveZone={0.01}
                                        />
                                        <div className="border-0.75 relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl p-6 md:p-6 dark:shadow-[0px_0px_27px_0px_#2D2D2D] bg-neutral-900">
                                            <div className="flex items-center justify-between mb-6">
                                                <h3 className="text-lg font-semibold text-white">Open Positions</h3>
                                                <div className="flex items-center space-x-4">
                                                    <span className="text-neutral-400 text-sm">Total P&L: <span className="text-green-400 font-medium">+${accountData?.kpis.unrealizedPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</span></span>
                                                    <button className="text-blue-400 hover:text-blue-300 text-sm">Close All</button>
                                                </div>
                                            </div>
                                            {loading ? (
                                                <div className="space-y-3">
                                                    {[1,2,3].map((i) => (
                                                        <div key={i} className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg animate-pulse">
                                                            <div className="flex items-center space-x-3">
                                                                <div className="w-8 h-8 bg-neutral-700 rounded-lg"></div>
                                                                <div className="space-y-2">
                                                                    <div className="w-20 h-4 bg-neutral-700 rounded"></div>
                                                                    <div className="w-16 h-3 bg-neutral-700 rounded"></div>
                                                                </div>
                                                            </div>
                                                            <div className="w-6 h-6 bg-neutral-700 rounded"></div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : positions.length > 0 ? (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full min-w-[800px]">
                                                        <thead>
                                                            <tr className="border-b border-neutral-800">
                                                                <th className="text-left py-3 px-2 sm:px-4 text-neutral-400 font-medium text-xs sm:text-sm">Pair</th>
                                                                <th className="text-left py-3 px-2 sm:px-4 text-neutral-400 font-medium text-xs sm:text-sm">Type</th>
                                                                <th className="text-left py-3 px-2 sm:px-4 text-neutral-400 font-medium text-xs sm:text-sm">Size</th>
                                                                <th className="text-left py-3 px-2 sm:px-4 text-neutral-400 font-medium text-xs sm:text-sm">Position Value</th>
                                                                <th className="text-left py-3 px-2 sm:px-4 text-neutral-400 font-medium text-xs sm:text-sm">Entry Price</th>
                                                                <th className="text-left py-3 px-2 sm:px-4 text-neutral-400 font-medium text-xs sm:text-sm">Current Price</th>
                                                                <th className="text-left py-3 px-2 sm:px-4 text-neutral-400 font-medium text-xs sm:text-sm">Margin</th>
                                                                <th className="text-left py-3 px-2 sm:px-4 text-neutral-400 font-medium text-xs sm:text-sm">P&L</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {positions.map((position, index) => (
                                                                <tr key={index} className="border-b border-neutral-800/50">
                                                                    <td className="py-3 px-2 sm:px-4">
                                                                        <span className="text-white font-medium text-xs sm:text-sm">{position.pair}</span>
                                                                    </td>
                                                                    <td className="py-3 px-2 sm:px-4">
                                                                        <span className={cn(
                                                                            "px-1 sm:px-2 py-1 rounded text-xs font-medium",
                                                                            position.type === "Long" ? "bg-green-900 text-green-400" : "bg-red-900 text-red-400"
                                                                        )}>
                                                                            {position.type}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-3 px-2 sm:px-4 text-white text-xs sm:text-sm">{position.size}</td>
                                                                    <td className="py-3 px-2 sm:px-4 text-white text-xs sm:text-sm">{position.positionValue}</td>
                                                                    <td className="py-3 px-2 sm:px-4 text-neutral-400 text-xs sm:text-sm">${position.entry}</td>
                                                                    <td className="py-3 px-2 sm:px-4 text-white text-xs sm:text-sm">${position.current}</td>
                                                                    <td className="py-3 px-2 sm:px-4 text-white text-xs sm:text-sm">{position.margin}</td>
                                                                    <td className="py-3 px-2 sm:px-4">
                                                                        <div className="flex flex-col">
                                                                            <span className={cn(
                                                                                "font-medium text-xs sm:text-sm",
                                                                                position.pnl.startsWith("+") ? "text-[#17A970]" : "text-[#FF384F]"
                                                                            )}>
                                                                                {position.pnl}
                                                                            </span>
                                                                            <span className={cn(
                                                                                "text-xs",
                                                                                position.pnlPercent.startsWith("+") ? "text-[#17A970]" : "text-[#FF384F]"
                                                                            )}>
                                                                                {position.pnlPercent}
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="text-center py-12">
                                                    <Activity className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                                                    <p className="text-neutral-400">No open positions found</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}



                            {activeTab === "analytics" && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                                    {/* Performance Chart */}
                                    <div className="relative group">
                                        <div className="relative h-full rounded-2xl border p-2 md:rounded-3xl md:p-3">
                                            <GlowingEffect
                                                spread={40}
                                                glow={true}
                                                disabled={false}
                                                proximity={64}
                                                inactiveZone={0.01}
                                            />
                                            <div className="border-0.75 relative flex h-full flex-col justify-between gap-4 sm:gap-6 overflow-hidden rounded-xl p-4 sm:p-6 md:p-6 dark:shadow-[0px_0px_27px_0px_#2D2D2D] bg-neutral-900">
                                                <h3 className="text-lg font-semibold text-white mb-4">Performance Overview</h3>
                                                <div className="h-48 sm:h-64 bg-neutral-800 rounded-lg flex items-center justify-center">
                                                    <div className="text-center">
                                                        <BarChart3 className="w-8 h-8 sm:w-12 sm:h-12 text-neutral-600 mx-auto mb-2" />
                                                        <p className="text-neutral-400 text-sm sm:text-base">Chart placeholder</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Statistics */}
                                    <div className="relative group">
                                        <div className="relative h-full rounded-2xl border p-2 md:rounded-3xl md:p-3">
                                            <GlowingEffect
                                                spread={40}
                                                glow={true}
                                                disabled={false}
                                                proximity={64}
                                                inactiveZone={0.01}
                                            />
                                            <div className="border-0.75 relative flex h-full flex-col justify-between gap-4 sm:gap-6 overflow-hidden rounded-xl p-4 sm:p-6 md:p-6 dark:shadow-[0px_0px_27px_0px_#2D2D2D] bg-neutral-900">
                                                <h3 className="text-lg font-semibold text-white mb-4">Statistics</h3>
                                                <div className="space-y-3 sm:space-y-4">
                                                    <div className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg">
                                                        <div className="flex items-center space-x-3">
                                                            <Target className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                                                            <span className="text-neutral-300 text-sm sm:text-base">Open Positions</span>
                                                        </div>
                                                        <span className="text-white font-medium text-sm sm:text-base">{accountData?.kpis.openPositionsCount || 0}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg">
                                                        <div className="flex items-center space-x-3">
                                                            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                                                            <span className="text-neutral-300 text-sm sm:text-base">ROI</span>
                                                        </div>
                                                        <span className={cn(
                                                            "font-medium text-sm sm:text-base",
                                                            (accountData?.kpis.roi || 0) >= 0 ? "text-[#17A970]" : "text-[#FF384F]"
                                                        )}>
                                                            {(accountData?.kpis.roi || 0) >= 0 ? '+' : ''}{(accountData?.kpis.roi || 0).toFixed(2)}%
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg">
                                                        <div className="flex items-center space-x-3">
                                                            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                                                            <span className="text-neutral-300 text-sm sm:text-base">Total Position Value</span>
                                                        </div>
                                                        <span className="text-white font-medium text-sm sm:text-base">${(accountData?.kpis.totalBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg">
                                                        <div className="flex items-center space-x-3">
                                                            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                                                            <span className="text-neutral-300 text-sm sm:text-base">Collateral</span>
                                                        </div>
                                                        <span className="text-white font-medium text-sm sm:text-base">${(accountData?.kpis.collateral || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}