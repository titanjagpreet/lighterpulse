"use client";
import { useState, useCallback } from "react";
import { Copy, Check, Heart, Coffee, Zap, Star, ExternalLink, Sparkles } from "lucide-react";
import { GlowingEffect } from "@/components/aceternity/glow-cards";
import { cn } from "@/lib/utils";
import Link from "next/link";

const cryptoMethods = [
    {
        name: "Ethereum",
        symbol: "ETH",
        address: "0x78E970B10027759c91C516FBF42c4DB12F752C1D",
        image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Ethereum-icon-purple.svg/2048px-Ethereum-icon-purple.svg.png",
        color: "from-blue-500 to-cyan-500",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/20"
    },
    {
        name: "Solana",
        symbol: "SOL",
        address: "8rFaAgvSdQC2vHymtT2orLdq7E7DntMc6XcK1ig5Fkxv",
        image: "https://cdn.iconscout.com/icon/premium/png-256-thumb/solana-sol-icon-svg-download-png-5795323.png",
        color: "from-purple-500 to-pink-500",
        bgColor: "bg-purple-500/10",
        borderColor: "border-purple-500/20"
    },
    {
        name: "Bitcoin",
        symbol: "BTC",
        address: "bc1pjhcvm40dky2w4kgyv7hg6mxm45r7x2n6rkzm78kx223dsc0h5rqqqq2xhf",
        image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/1024px-Bitcoin.svg.png",
        color: "from-orange-500 to-yellow-500",
        bgColor: "bg-orange-500/10",
        borderColor: "border-orange-500/20"
    }
];

export default function SupportPage() {
    const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

    const copyToClipboard = useCallback(async (address: string, symbol: string) => {
        try {
            await navigator.clipboard.writeText(address);
            setCopiedAddress(symbol);
            setTimeout(() => setCopiedAddress(null), 2000);
        } catch (err) {
            console.error('Failed to copy address:', err);
        }
    }, []);

    return (
        <div className="min-h-screen bg-[#121218] text-white">
            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#121218]/80 backdrop-blur-md border-b border-neutral-800">
                <div className="flex items-center justify-between px-4 sm:px-6 py-4">
                    {/* Logo */}
                    <div className="flex items-center space-x-2 sm:space-x-3">
                        <img
                            src="/logo.png"
                            alt="LighterPulse Logo"
                            className="w-12 h-12 sm:w-14 sm:h-14"
                        />
                        <span className="text-lg sm:text-xl font-bold text-white">LighterPulse</span>
                    </div>

                    {/* Right Navigation */}
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        <Link 
                            href="/dashboard"
                            className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-neutral-300 hover:text-white transition-colors"
                        >
                            Dashboard
                        </Link>
                        <Link 
                            href="/explorer"
                            className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-neutral-300 hover:text-white transition-colors"
                        >
                            Explorer
                        </Link>
                        <button className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-blue-400 border-b-2 border-blue-400">
                            Support
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="pt-20">
                <div className="p-4 sm:p-8">
                    {/* Hero Section */}
                    <div className="text-center mb-12 sm:mb-16">
                        <div className="relative inline-block mb-6">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-lg opacity-30"></div>
                            <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 rounded-full p-4">
                                <Heart className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
                            </div>
                        </div>
                        
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-3 sm:mb-4 lg:mb-6">
                            Support the Developer
                        </h1>
                        
                        <p className="text-base sm:text-lg lg:text-xl text-neutral-400 max-w-3xl mx-auto leading-relaxed px-4">
                            Help keep LighterPulse running and support future development. 
                            Every contribution helps improve the platform for the entire Lighter.xyz community.
                        </p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-8 sm:mb-12 max-w-4xl mx-auto">
                        <div className="relative group">
                            <div className="relative h-full rounded-xl border p-1">
                                <GlowingEffect
                                    spread={30}
                                    glow={true}
                                    disabled={false}
                                    proximity={64}
                                    inactiveZone={0.01}
                                />
                                <div className="border-0.75 relative flex h-full flex-col justify-between gap-3 overflow-hidden rounded-lg p-4 sm:p-5 dark:shadow-[0px_0px_20px_0px_#2D2D2D] bg-neutral-900">
                                    <div className="flex items-center justify-center">
                                        <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
                                            <Coffee className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-neutral-400 text-xs mb-1">Cups of Coffee</p>
                                        <p className="text-sm sm:text-base font-bold text-white">∞</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="relative group">
                            <div className="relative h-full rounded-xl border p-1">
                                <GlowingEffect
                                    spread={30}
                                    glow={true}
                                    disabled={false}
                                    proximity={64}
                                    inactiveZone={0.01}
                                />
                                <div className="border-0.75 relative flex h-full flex-col justify-between gap-3 overflow-hidden rounded-lg p-4 sm:p-5 dark:shadow-[0px_0px_20px_0px_#2D2D2D] bg-neutral-900">
                                    <div className="flex items-center justify-center">
                                        <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
                                            <Zap className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-neutral-400 text-xs mb-1">Hours Coded</p>
                                        <p className="text-sm sm:text-base font-bold text-white">100+</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="relative group">
                            <div className="relative h-full rounded-xl border p-1">
                                <GlowingEffect
                                    spread={30}
                                    glow={true}
                                    disabled={false}
                                    proximity={64}
                                    inactiveZone={0.01}
                                />
                                <div className="border-0.75 relative flex h-full flex-col justify-between gap-3 overflow-hidden rounded-lg p-4 sm:p-5 dark:shadow-[0px_0px_20px_0px_#2D2D2D] bg-neutral-900">
                                    <div className="flex items-center justify-center">
                                        <div className="p-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500">
                                            <Star className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-neutral-400 text-xs mb-1">Features Built</p>
                                        <p className="text-sm sm:text-base font-bold text-white">10+</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Crypto Methods */}
                    <div className="max-w-4xl mx-auto mb-12 sm:mb-16">
                        <div className="text-center mb-6 sm:mb-8 lg:mb-12">
                            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-3 sm:mb-4">
                                Choose Your Preferred Method
                            </h2>
                            <p className="text-neutral-400 text-xs sm:text-sm lg:text-base px-4">
                                All contributions are greatly appreciated and help support ongoing development
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                            {cryptoMethods.map((crypto, index) => (
                                <div key={index} className="relative group">
                                    <div className="relative h-full rounded-2xl border p-2 md:rounded-3xl md:p-3">
                                        <GlowingEffect
                                            spread={40}
                                            glow={true}
                                            disabled={false}
                                            proximity={64}
                                            inactiveZone={0.01}
                                        />
                                        <div className={cn(
                                            "border-0.75 relative flex h-full flex-col justify-between gap-4 sm:gap-6 overflow-hidden rounded-xl p-5 sm:p-6 dark:shadow-[0px_0px_27px_0px_#2D2D2D] bg-neutral-900",
                                            crypto.borderColor
                                        )}>
                                            {/* Header */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <div className="p-2 sm:p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                                                        <img 
                                                            src={crypto.image} 
                                                            alt={`${crypto.name} logo`} 
                                                            className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
                                                        />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-base sm:text-lg font-semibold text-white">{crypto.name}</h3>
                                                        <p className="text-xs sm:text-sm text-neutral-400">{crypto.symbol}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Address */}
                                            <div className="space-y-3 sm:space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs sm:text-sm text-neutral-400">Address:</p>
                                                    <button
                                                        onClick={() => copyToClipboard(crypto.address, crypto.symbol)}
                                                        className="flex items-center space-x-1 px-2 py-1 bg-neutral-800 hover:bg-neutral-700 rounded-md transition-colors text-xs"
                                                    >
                                                        {copiedAddress === crypto.symbol ? (
                                                            <>
                                                                <Check className="w-3 h-3 text-green-400" />
                                                                <span className="text-green-400">Copied!</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy className="w-3 h-3 text-neutral-400" />
                                                                <span className="text-neutral-400">Copy</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                                <div className="bg-neutral-800 rounded-lg p-4">
                                                    <p className="text-xs sm:text-sm text-white font-mono break-all leading-relaxed">
                                                        {crypto.address}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Social Section */}
                    <div className="max-w-2xl mx-auto mb-12 sm:mb-16">
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
                                    <div className="text-center">
                                        <div className="flex items-center justify-center mb-4">
                                            <div className="p-3 rounded-lg bg-gradient-to-r from-black to-gray-800">
                                                <img 
                                                    src="https://icon2.cleanpng.com/20240119/phb/transparent-x-icon-black-and-white-x-in-the-1710888893456.webp" 
                                                    alt="X Logo" 
                                                    className="w-8 h-8 filter  invert"
                                                />
                                            </div>
                                        </div>
                                        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Follow for Updates</h3>
                                        <p className="text-neutral-400 text-xs sm:text-sm mb-4 sm:mb-6">
                                            Stay updated with the latest features, announcements, and development progress
                                        </p>
                                        <a
                                            href="https://x.com/singhxbt"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-colors text-sm sm:text-base"
                                        >
                                            <img 
                                                src="https://icon2.cleanpng.com/20240119/phb/transparent-x-icon-black-and-white-x-in-the-1710888893456.webp" 
                                                alt="X Logo" 
                                                className="w-8 h-8 filter invert"
                                            />
                                            <span>Follow @singhxbt</span>
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Thank You Message */}
                    <div className="text-center">
                        <div className="relative inline-block mb-4">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full blur-lg opacity-20"></div>
                            <div className="relative bg-gradient-to-r from-purple-500 to-pink-600 rounded-full p-3">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-2 sm:mb-3">
                            Thank You for Your Support!
                        </h3>
                        <p className="text-neutral-400 text-xs sm:text-sm lg:text-base max-w-2xl mx-auto px-4">
                            Your contributions help make LighterPulse better for everyone. 
                            Together, we're building the future of Lighter.xyz analytics.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
