"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Hash, Blocks, Clock, Users, ExternalLink, Copy, Eye } from "lucide-react";
import { GlowingEffect } from "@/components/aceternity/glow-cards";
import { cn } from "@/lib/utils";
import { getExplorerData } from "@/utils/getExplorerLandingData";
import { ExplorerData, BlockTableItem, TxTableItem } from "@/types/explorerLanding";
import Link from "next/link";

export default function ExplorerPage() {
    const [explorerData, setExplorerData] = useState<ExplorerData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const router = useRouter();

    // Fetch explorer data
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await getExplorerData();
                if (data) {
                    setExplorerData(data);
                } else {
                    setError("Failed to fetch explorer data");
                }
            } catch (err) {
                setError("Failed to fetch explorer data");
                console.error("Error fetching explorer data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Handle search functionality
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;

        const trimmedSearch = searchTerm.trim();
        
        // Check if it's a block number (numeric)
        if (/^\d+$/.test(trimmedSearch)) {
            router.push(`/explorer/block/${trimmedSearch}`);
        } else {
            // Assume it's a transaction hash
            router.push(`/explorer/tx/${trimmedSearch}`);
        }
    };

    // Mock KPI data (you can replace with real API calls)
    const kpiData = [
        {
            title: "Total Transactions",
            value: "2,847,392",
            icon: Hash,
            color: "from-blue-500 to-cyan-500"
        },
        {
            title: "Total Blocks",
            value: explorerData?.blocks[0]?.height?.toLocaleString() || "Loading...",
            icon: Blocks,
            color: "from-green-500 to-emerald-500"
        },
        {
            title: "Latest Verified Block",
            value: explorerData?.blocks[0]?.height?.toString() || "Loading...",
            icon: Clock,
            color: "from-purple-500 to-pink-500"
        },
        {
            title: "Total Addresses",
            value: "100k+",
            icon: Users,
            color: "from-orange-500 to-red-500"
        }
    ];

    // Format transaction hash for display
    const formatTxHash = (hash: string) => {
        return `${hash.slice(0, 6)}...${hash.slice(-6)}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#121218] text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-neutral-400">Loading explorer data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#121218] text-white flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-400 mb-4">Failed to load explorer data</p>
                    <p className="text-neutral-400">Please try again later</p>
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
                            href="/dashboard/0x0000000000000000000000000000000000000000"
                            className="flex items-center space-x-1 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-neutral-300 hover:text-white transition-colors"
                        >
                            <span>Dashboard</span>
                        </Link>
                        <button className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-blue-400 border-b-2 border-blue-400">
                            Explorer
                        </button>
                        <button className="px-2 sm:px-4 py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors">
                            Donate
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="pt-20">
                <div className="p-4 sm:p-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Block Explorer</h1>
                                <p className="text-neutral-400 text-sm sm:text-base">Explore blocks, transactions, and addresses on Lighter Network</p>
                            </div>
                        </div>

                        {/* Search Box */}
                        <div className="max-w-2xl">
                            <form onSubmit={handleSearch}>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Search by block number or transaction hash..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <button
                                        type="submit"
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                                    >
                                        Search
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                        {kpiData.map((kpi, index) => (
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

                    {/* Tables Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Latest Blocks */}
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
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-white">Latest Blocks</h3>
                                        <Link 
                                            href="/explorer/blocks" 
                                            className="text-blue-400 hover:text-blue-300 text-sm flex items-center space-x-1"
                                        >
                                            <span>View All</span>
                                            <ExternalLink className="w-3 h-3" />
                                        </Link>
                                    </div>
                                    {explorerData?.blocks && explorerData.blocks.length > 0 ? (
                                        <div className="space-y-3">
                                            {explorerData.blocks.map((block: BlockTableItem, index: number) => (
                                                <div key={index} className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                                            <Blocks className="w-4 h-4 text-white" />
                                                        </div>
                                                        <div>
                                                            <p className="text-white font-medium">Block #{block.height}</p>
                                                            <p className="text-neutral-400 text-xs">Verified</p>
                                                        </div>
                                                    </div>
                                                    <Link 
                                                        href={block.link}
                                                        className="text-blue-400 hover:text-blue-300 transition-colors"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Link>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <Blocks className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                                            <p className="text-neutral-400">No blocks found</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Latest Transactions */}
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
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-white">Latest Transactions</h3>
                                        <Link 
                                            href="/explorer/transactions" 
                                            className="text-blue-400 hover:text-blue-300 text-sm flex items-center space-x-1"
                                        >
                                            <span>View All</span>
                                            <ExternalLink className="w-3 h-3" />
                                        </Link>
                                    </div>
                                    {explorerData?.transactions && explorerData.transactions.length > 0 ? (
                                        <div className="space-y-3">
                                            {explorerData.transactions.map((tx: TxTableItem, index: number) => (
                                                <div key={index} className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                                                            <Hash className="w-4 h-4 text-white" />
                                                        </div>
                                                        <div>
                                                            <p className="text-white font-medium text-sm">{formatTxHash(tx.txHash)}</p>
                                                            <p className="text-neutral-400 text-xs">Transaction</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <button 
                                                            onClick={() => navigator.clipboard.writeText(tx.txHash)}
                                                            className="text-neutral-400 hover:text-white transition-colors"
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                        </button>
                                                        <Link 
                                                            href={tx.link}
                                                            className="text-blue-400 hover:text-blue-300 transition-colors"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Link>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <Hash className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                                            <p className="text-neutral-400">No transactions found</p>
                                            <p className="text-neutral-500 text-xs mt-2">
                                                No blocks with transactions available
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
