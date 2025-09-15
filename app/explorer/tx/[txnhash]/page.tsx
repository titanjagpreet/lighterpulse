"use client";
import { useState, useEffect, useMemo, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { 
    ArrowLeft, 
    Copy, 
    Check, 
    Clock, 
    Hash, 
    DollarSign, 
    User, 
    FileText, 
    Calendar,
    Activity,
    ExternalLink,
    AlertCircle
} from "lucide-react";
import { GlowingEffect } from "@/components/aceternity/glow-cards";
import { cn } from "@/lib/utils";
import { getTransactionDetails } from "@/utils/getTransaction";
import { TxDetails } from "@/types/transaction";
import Link from "next/link";

export default function TransactionPage({ params }: { params: Promise<{ txnhash: string }> }) {
    const resolvedParams = use(params);
    const [txDetails, setTxDetails] = useState<TxDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const router = useRouter();

    // Fetch transaction details
    const fetchTxDetails = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getTransactionDetails(resolvedParams.txnhash);
            if (data) {
                setTxDetails(data);
            } else {
                setError("Transaction not found");
            }
        } catch (err) {
            setError("Failed to fetch transaction details");
            console.error("Error fetching transaction details:", err);
        } finally {
            setLoading(false);
        }
    }, [resolvedParams.txnhash]);

    useEffect(() => {
        fetchTxDetails();
    }, [fetchTxDetails]);

    // Copy to clipboard function
    const copyToClipboard = useCallback(async (text: string, type: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(type);
            setTimeout(() => setCopied(null), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    }, []);

    // Format transaction hash for display
    const formatHash = useCallback((hash: string) => {
        return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
    }, []);

    // Format timestamp for display
    const formatTimestamp = useCallback((timestamp: string) => {
        const date = new Date(timestamp);
        return {
            date: date.toLocaleDateString(),
            time: date.toLocaleTimeString(),
            relative: getRelativeTime(date)
        };
    }, []);

    // Get relative time
    const getRelativeTime = useCallback((date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return "Just now";
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    }, []);

    // Get transaction type name
    const getTransactionType = useCallback((type: number) => {
        const types = {
            0: "Transfer",
            1: "Deposit",
            2: "Withdrawal",
            3: "Trade",
            4: "Liquidation"
        };
        return types[type as keyof typeof types] || `Type ${type}`;
    }, []);

    // Get status badge
    const getStatusBadge = useCallback((status: number) => {
        const statuses = {
            0: { text: "Pending", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
            1: { text: "Success", color: "bg-green-500/20 text-green-400 border-green-500/30" },
            2: { text: "Failed", color: "bg-red-500/20 text-red-400 border-red-500/30" }
        };
        return statuses[status as keyof typeof statuses] || { text: "Unknown", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" };
    }, []);

    const { queuedTime, executedTime, expiredTime, statusBadge } = useMemo(() => {
        if (!txDetails) return { 
            queuedTime: { date: '', time: '', relative: '' }, 
            executedTime: { date: '', time: '', relative: '' }, 
            expiredTime: { date: '', time: '', relative: '' }, 
            statusBadge: { text: 'Unknown', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' }
        };
        return {
            queuedTime: formatTimestamp(txDetails.queuedAt),
            executedTime: formatTimestamp(txDetails.executedAt),
            expiredTime: formatTimestamp(txDetails.expiredAt),
            statusBadge: getStatusBadge(txDetails.status)
        };
    }, [txDetails, formatTimestamp, getStatusBadge]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#121218] text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-neutral-400">Loading transaction details...</p>
                </div>
            </div>
        );
    }

    if (error || !txDetails) {
        return (
            <div className="min-h-screen bg-[#121218] text-white">
                {/* Navbar */}
                <nav className="fixed top-0 left-0 right-0 z-50 bg-[#121218]/80 backdrop-blur-md border-b border-neutral-800">
                    <div className="flex items-center justify-between px-4 sm:px-6 py-4">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                            <img
                                src="/logo.png"
                                alt="LighterPulse"
                                className="w-12 h-12 sm:w-14 sm:h-14"
                            />
                            <span className="text-lg sm:text-xl font-bold text-white">LighterPulse</span>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-4">
                            <Link 
                                href="/explorer"
                                className="flex items-center space-x-1 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-neutral-300 hover:text-white transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>Back to Explorer</span>
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

                <div className="pt-20 flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-white mb-2">Transaction Not Found</h1>
                        <p className="text-neutral-400 mb-6">{error || "The transaction you're looking for doesn't exist."}</p>
                        <Link 
                            href="/explorer"
                            className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Back to Explorer</span>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#121218] text-white">
            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#121218]/80 backdrop-blur-md border-b border-neutral-800">
                <div className="flex items-center justify-between px-4 sm:px-6 py-4">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                        <img
                            src="/logo.png"
                            alt="LighterPulse"
                            className="w-6 h-6 sm:w-8 sm:h-8"
                        />
                        <span className="text-lg hidden sm:block sm:text-xl font-bold text-white">LighterPulse</span>
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        <Link 
                            href="/explorer"
                            className="flex items-center space-x-1 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-neutral-300 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Back to Explorer</span>
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
            <div className="pt-20">
                <div className="p-4 sm:p-8">
                    <div className="max-w-6xl mx-auto">
                        {/* Header */}
                        <div className="mb-8">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Transaction Details</h1>
                                    <p className="text-neutral-400 text-sm sm:text-base">Detailed information about this transaction</p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <span className={cn(
                                        "px-3 py-1 rounded-full text-xs font-medium border",
                                        statusBadge.color
                                    )}>
                                        {statusBadge.text}
                                    </span>
                                </div>
                            </div>

                            {/* Transaction Hash */}
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
                                            <div className="flex items-center space-x-3">
                                                <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500">
                                                    <Hash className="w-5 h-5 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-neutral-400 text-sm">Transaction Hash</p>
                                                    <p className="text-white font-mono text-sm sm:text-base">{formatHash(txDetails.hash)}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => copyToClipboard(txDetails.hash, "hash")}
                                                className="flex items-center space-x-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                                            >
                                                {copied === "hash" ? (
                                                    <Check className="w-4 h-4 text-green-400" />
                                                ) : (
                                                    <Copy className="w-4 h-4 text-neutral-400" />
                                                )}
                                                <span className="text-sm text-neutral-300">
                                                    {copied === "hash" ? "Copied!" : "Copy"}
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Transaction Information Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            {/* Basic Information */}
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
                                            <h3 className="text-lg font-semibold text-white">Basic Information</h3>
                                            <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
                                                <FileText className="w-5 h-5 text-white" />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-neutral-400 text-sm">Type</span>
                                                <span className="text-white font-medium">{getTransactionType(txDetails.type)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-neutral-400 text-sm">Block Height</span>
                                                <Link 
                                                    href={`/explorer/block/${txDetails.blockHeight}`}
                                                    className="text-blue-400 hover:text-blue-300 font-medium flex items-center space-x-1"
                                                >
                                                    <span>#{txDetails.blockHeight}</span>
                                                    <ExternalLink className="w-3 h-3" />
                                                </Link>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-neutral-400 text-sm">Nonce</span>
                                                <span className="text-white font-mono text-sm">{txDetails.nonce}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-neutral-400 text-sm">Account Index</span>
                                                <span className="text-white font-medium">{txDetails.accountIndex}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Financial Information */}
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
                                            <h3 className="text-lg font-semibold text-white">Financial Details</h3>
                                            <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
                                                <DollarSign className="w-5 h-5 text-white" />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-neutral-400 text-sm">USDC Amount</span>
                                                <span className="text-white font-medium">${txDetails.usdcAmount.toFixed(6)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-neutral-400 text-sm">Fee</span>
                                                <span className="text-white font-medium">${txDetails.fee.toFixed(6)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-neutral-400 text-sm">Total Value</span>
                                                <span className="text-white font-medium">${(txDetails.usdcAmount + txDetails.fee).toFixed(6)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Account Information */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            {/* From Account */}
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
                                            <h3 className="text-lg font-semibold text-white">From Account</h3>
                                            <div className="p-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500">
                                                <User className="w-5 h-5 text-white" />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-neutral-400 text-sm">Account Index</span>
                                                <span className="text-white font-medium">{txDetails.fromAccountIndex}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-neutral-400 text-sm">L1 Address</span>
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-white font-mono text-sm">{formatHash(txDetails.l1Address)}</span>
                                                    <button
                                                        onClick={() => copyToClipboard(txDetails.l1Address, "l1Address")}
                                                        className="text-neutral-400 hover:text-white transition-colors"
                                                    >
                                                        {copied === "l1Address" ? (
                                                            <Check className="w-4 h-4 text-green-400" />
                                                        ) : (
                                                            <Copy className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* To Account */}
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
                                            <h3 className="text-lg font-semibold text-white">To Account</h3>
                                            <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500">
                                                <User className="w-5 h-5 text-white" />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-neutral-400 text-sm">Account Index</span>
                                                <span className="text-white font-medium">{txDetails.toAccountIndex}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Timestamps */}
                        <div className="relative group mb-8">
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
                                        <h3 className="text-lg font-semibold text-white">Timeline</h3>
                                        <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
                                            <Clock className="w-5 h-5 text-white" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <p className="text-neutral-400 text-sm">Queued At</p>
                                            <p className="text-white font-medium">{queuedTime.date}</p>
                                            <p className="text-neutral-400 text-sm">{queuedTime.time}</p>
                                            <p className="text-blue-400 text-xs">{queuedTime.relative}</p>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-neutral-400 text-sm">Executed At</p>
                                            <p className="text-white font-medium">{executedTime.date}</p>
                                            <p className="text-neutral-400 text-sm">{executedTime.time}</p>
                                            <p className="text-green-400 text-xs">{executedTime.relative}</p>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-neutral-400 text-sm">Expired At</p>
                                            <p className="text-white font-medium">{expiredTime.date}</p>
                                            <p className="text-neutral-400 text-sm">{expiredTime.time}</p>
                                            <p className="text-orange-400 text-xs">{expiredTime.relative}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Memo */}
                        {txDetails.memo && txDetails.memo.trim() !== "" && (
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
                                            <h3 className="text-lg font-semibold text-white">Memo</h3>
                                            <div className="p-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500">
                                                <FileText className="w-5 h-5 text-white" />
                                            </div>
                                        </div>
                                        <div className="bg-neutral-800 rounded-lg p-4">
                                            <p className="text-white font-mono text-sm whitespace-pre-wrap break-words">{txDetails.memo}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
