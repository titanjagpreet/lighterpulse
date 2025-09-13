"use client";
import { Sparkles } from "lucide-react";
import Link from "next/link";

export const LandingFooter = () => {
    return (
        <>
            <div className="relative min-h-[500px] w-full bg-[#121218] overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]"></div>

                {/* Animated Grid Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="h-full w-full bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:50px_50px] animate-pulse"></div>
                </div>

                <div className="relative z-10 h-full flex flex-col">
                    {/* Main Footer Content */}
                    <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                        <div className="w-full max-w-7xl">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 lg:gap-12">

                                {/* Project Info */}
                                <div className="space-y-4 sm:space-y-6">
                                    <div className="space-y-3 sm:space-y-4">
                                        <h3 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center">
                                                <img src="https://lighter.xyz/_astro/logo.DJnDsPC3.svg" alt="" className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                                            </div>
                                            LighterPulse
                                        </h3>
                                        <p className="text-sm sm:text-base text-neutral-400 leading-relaxed">
                                            Your complete Lighter.xyz hub for tracking, analyzing, and exploring everything about the protocol in real-time.
                                        </p>
                                    </div>

                                    {/* Status Indicator */}
                                    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-black/20 rounded-lg border border-neutral-800">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                        <span className="text-xs sm:text-sm text-neutral-300">Protocol Status: Active</span>
                                    </div>
                                </div>

                                {/* Quick Links */}
                                <div className="space-y-4 sm:space-y-6">
                                    <h4 className="text-base sm:text-lg font-semibold text-white">Quick Access</h4>
                                    <ul className="space-y-2 sm:space-y-3">
                                        <li>
                                            <Link href="/dashboard" className="text-sm sm:text-base text-neutral-400 hover:text-white transition-colors duration-200 flex items-center gap-2 group">
                                                <div className="w-1 h-1 bg-blue-500 rounded-full group-hover:scale-150 transition-transform"></div>
                                                Dashboard
                                            </Link>
                                        </li>
                                        <li>
                                            <Link href="/explorer" className="text-sm sm:text-base text-neutral-400 hover:text-white transition-colors duration-200 flex items-center gap-2 group">
                                                <div className="w-1 h-1 bg-purple-500 rounded-full group-hover:scale-150 transition-transform"></div>
                                                Transaction Explorer
                                            </Link>
                                        </li>
                                        <li>
                                            <Link href="/exchange-stats" className="text-sm sm:text-base text-neutral-400 hover:text-white transition-colors duration-200 flex items-center gap-2 group">
                                                <div className="w-1 h-1 bg-green-500 rounded-full group-hover:scale-150 transition-transform"></div>
                                                Exchange Stats
                                            </Link>
                                        </li>
                                        <li>
                                            <Link href="/funding-comparison" className="text-sm sm:text-base text-neutral-400 hover:text-white transition-colors duration-200 flex items-center gap-2 group">
                                                <div className="w-1 h-1 bg-orange-500 rounded-full group-hover:scale-150 transition-transform"></div>
                                                Funding Comparison
                                            </Link>
                                        </li>

                                        <li>
                                            <Link href="/announcements" className="text-sm sm:text-base text-neutral-400 hover:text-white transition-colors duration-200 flex items-center gap-2 group">
                                                <div className="w-1 h-1 bg-orange-500 rounded-full group-hover:scale-150 transition-transform"></div>
                                                Announcements
                                            </Link>
                                        </li>
                                    </ul>
                                </div>

                                {/* Protocol Links */}
                                <div className="space-y-4 sm:space-y-6">
                                    <h4 className="text-base sm:text-lg font-semibold text-white">Protocol</h4>
                                    <ul className="space-y-2 sm:space-y-3">
                                        <li>
                                            <a href="https://lighter.xyz" target="_blank" rel="noopener noreferrer" className="text-sm sm:text-base text-neutral-400 hover:text-white transition-colors duration-200 flex items-center gap-2 group">
                                                <div className="w-1 h-1 bg-cyan-500 rounded-full group-hover:scale-150 transition-transform"></div>
                                                Lighter.xyz
                                            </a>
                                        </li>
                                        <li>
                                            <a href="#" className="text-sm sm:text-base text-neutral-400 hover:text-white transition-colors duration-200 flex items-center gap-2 group">
                                                <div className="w-1 h-1 bg-pink-500 rounded-full group-hover:scale-150 transition-transform"></div>
                                                Documentation
                                            </a>
                                        </li>
                                        <li>
                                            <a href="https://apibetadocs.lighter.xyz/docs/private-beta" className="text-sm sm:text-base text-neutral-400 hover:text-white transition-colors duration-200 flex items-center gap-2 group">
                                                <div className="w-1 h-1 bg-yellow-500 rounded-full group-hover:scale-150 transition-transform"></div>
                                                API Reference
                                            </a>
                                        </li>
                                        <li>
                                            <a href="#" className="text-sm sm:text-base text-neutral-400 hover:text-white transition-colors duration-200 flex items-center gap-2 group">
                                                <div className="w-1 h-1 bg-indigo-500 rounded-full group-hover:scale-150 transition-transform"></div>
                                                GitHub
                                            </a>
                                        </li>
                                    </ul>
                                </div>

                                {/* Developer Info */}
                                <div className="space-y-4 sm:space-y-6">
                                    <h4 className="text-base sm:text-lg font-semibold text-white">Developer</h4>
                                    <div className="space-y-3 sm:space-y-4">
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <img
                                                src="https://pbs.twimg.com/profile_images/1958862285851484160/JWSabHMM_400x400.jpg"
                                                alt="SinghXBT"
                                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-neutral-700"
                                            />
                                            <div>
                                                <p className="text-sm sm:text-base text-white font-medium">SinghXBT</p>
                                                <p className="text-xs sm:text-sm text-neutral-400">Full-Stack Developer</p>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <a href="https://x.com/singhxbt" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm sm:text-base text-neutral-400 hover:text-white transition-colors duration-200 group">
                                                <div className="w-1 h-1 bg-blue-400 rounded-full group-hover:scale-150 transition-transform"></div>
                                                @singhxbt
                                            </a>
                                            <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-400">
                                                <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                                                Available for work
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Bar */}
                    <div className="border-t border-neutral-800 bg-black/20">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
                                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 lg:gap-6 text-xs sm:text-sm text-neutral-400 text-center sm:text-left">
                                    <span>© 2024 LighterPulse. Built with ❤️ for the Lighter.xyz community</span>
                                    <div className="hidden sm:flex items-center gap-2 lg:gap-4">
                                        <span>•</span>
                                        <span>Powered by Next.js & TypeScript</span>
                                        <span>•</span>
                                        <span>Real-time blockchain data</span>
                                    </div>
                                </div>

                                {/* Tech Stack Badges */}
                                <div className="flex items-center gap-1 sm:gap-2">
                                    <div className="px-2 sm:px-3 py-1 bg-neutral-800/50 rounded-full text-xs text-neutral-300 border border-neutral-700">
                                        React
                                    </div>
                                    <div className="px-2 sm:px-3 py-1 bg-neutral-800/50 rounded-full text-xs text-neutral-300 border border-neutral-700">
                                        TypeScript
                                    </div>
                                    <div className="px-2 sm:px-3 py-1 bg-neutral-800/50 rounded-full text-xs text-neutral-300 border border-neutral-700">
                                        Web3
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}