"use client";
import React, { useState, useMemo, useCallback, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import { getRouteForInput } from "@/utils/validation";
import { BackgroundRippleEffect } from "@/components/aceternity/ripple-effect";
import TrueFocus from "@/components/reactbits/TrueFocus";
import { PlaceholdersAndVanishInput } from "@/components/aceternity/vanish-input";
import { Box, Lock, Search, Settings, Sparkles } from "lucide-react";
import { GlowingEffect } from "@/components/aceternity/glow-cards";
import ProfileCard from "@/components/reactbits/ProfileCard";
import { LandingFooter } from "@/components/reactbits/landing-footer";
import {
    Navbar,
    NavBody,
    NavItems,
    MobileNav,
    NavbarLogo,
    NavbarButton,
    MobileNavHeader,
    MobileNavToggle,
    MobileNavMenu,
} from "@/components/aceternity/navbar";

// Lazy load heavy components
const LazyGlowingEffectFeatures = lazy(() => Promise.resolve({ default: GlowingEffectFeatures }));
const LazyProfileSection = lazy(() => Promise.resolve({ default: ProfileSection }));
const LazyLandingFooter = lazy(() => Promise.resolve({ default: LandingFooter }));

function NavbarResizable() {
    const navItems = useMemo(() => [
        {
            name: "Fundings",
            link: "/funding-comparison",
        },
        {
            name: "𝕏",
            link: "https://x.com/singhxbt",
        },
        {
            name: "Exchange Stats",
            link: "/exchange-stats",
        }
    ], []);

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="fixed top-0 left-0 right-0 z-50 w-full">
            <Navbar>
                {/* Desktop Navigation */}
                <NavBody>
                    <NavbarLogo />
                    <NavItems items={navItems} />
                    <div className="hidden sm:flex items-center gap-2 lg:gap-4">
                        <NavbarButton variant="primary" href="/dashboard">Dashboard</NavbarButton>
                    </div>
                </NavBody>

                {/* Mobile Navigation */}
                <MobileNav>
                    <MobileNavHeader>
                        <NavbarLogo />
                        <MobileNavToggle
                            isOpen={isMobileMenuOpen}
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        />
                    </MobileNavHeader>

                    <MobileNavMenu
                        isOpen={isMobileMenuOpen}
                        onClose={() => setIsMobileMenuOpen(false)}
                    >
                        {navItems.map((item, idx) => (
                            <a
                                key={`mobile-link-${idx}`}
                                href={item.link}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="relative text-neutral-600 dark:text-neutral-300"
                            >
                                <span className="block">{item.name}</span>
                            </a>
                        ))}
                        <div className="flex w-full flex-col gap-4">
                            <NavbarButton
                                onClick={() => setIsMobileMenuOpen(false)}
                                variant="primary"
                                className="w-full"
                                href="/dashboard"
                            >
                                Dashboard
                            </NavbarButton>
                        </div>
                    </MobileNavMenu>
                </MobileNav>
            </Navbar>
            {/* Navbar */}
        </div>
    );
}

function PlaceholdersAndVanishInputBox() {
    const placeholders = useMemo(() => [
        "Enter address, transaction hash, or block number",
        "Try: 0xabc...123, tx hash, or block height"
    ], []);

    const router = useRouter();
    const [error, setError] = useState("");

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        console.log("Input:", e.target.value);
    }, []);

    const onSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const inputEl = e.currentTarget.querySelector("input") as HTMLInputElement;
        const value = inputEl.value;

        const route = getRouteForInput(value);
        
        if (route) {
            router.push(route);
        } else {
            setError("Invalid input. Please enter a valid address, transaction hash, or block number.");
        }
    }, [router]);

    return (
        <div>
            <PlaceholdersAndVanishInput
                placeholders={placeholders}
                onChange={handleChange}
                onSubmit={onSubmit}
            />
            {error && <p className="mt-2 text-red-500 text-sm">{error}</p>}
        </div>
    );
}

function GlowingEffectFeatures() {
    return (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 grid-rows-none gap-4 md:grid-rows-3 lg:gap-4 xl:max-h-[34rem] xl:grid-rows-2">
            <GridItem
                area="sm:[grid-area:1/1/2/2] md:[grid-area:1/1/2/7] xl:[grid-area:1/1/2/5]"
                icon={<Box className="h-4 w-4 text-black dark:text-neutral-400" />}
                title="Dashboard Analytics"
                description="Monitor your Lighter.xyz account with real-time balance tracking, position monitoring, and comprehensive portfolio insights."
            />

            <GridItem
                area="sm:[grid-area:1/2/2/3] md:[grid-area:1/7/2/13] xl:[grid-area:2/1/3/5]"
                icon={<Search className="h-4 w-4 text-black dark:text-neutral-400" />}
                title="Block Explorer"
                description="Explore Lighter.xyz blockchain with detailed transaction history, block information, and comprehensive on-chain data analysis."
            />

            <GridItem
                area="sm:[grid-area:2/1/3/2] md:[grid-area:2/1/3/7] xl:[grid-area:1/5/3/8]"
                icon={<Settings className="h-4 w-4 text-black dark:text-neutral-400" />}
                title="Funding Comparison"
                description="Compare funding rates across Lighter, Binance, Bybit, and Hyperliquid with real-time arbitrage opportunities and suggestions."
            />

            <GridItem
                area="sm:[grid-area:2/2/3/3] md:[grid-area:2/7/3/13] xl:[grid-area:1/8/2/13]"
                icon={<Sparkles className="h-4 w-4 text-black dark:text-neutral-400" />}
                title="Exchange Statistics"
                description="Track Lighter.xyz trading pairs with live price data, volume metrics, and comprehensive market statistics."
            />

            <GridItem
                area="sm:[grid-area:3/1/4/3] md:[grid-area:3/1/4/13] xl:[grid-area:2/8/3/13]"
                icon={<Lock className="h-4 w-4 text-black dark:text-neutral-400" />}
                title="Protocol Announcements"
                description="Stay updated with the latest Lighter.xyz protocol updates, feature releases, and important community announcements."
            />
        </ul>
    );
}

// Profile Section Component
function ProfileSection() {
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#121218] px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
            <div className="flex flex-col lg:flex-row items-center justify-between w-full max-w-6xl gap-8 sm:gap-12 lg:gap-16">
                {/* Profile Card - Left Side */}
                <div className="flex-shrink-0 w-full sm:w-80 lg:w-auto">
                    <ProfileCard
                        name="SinghXBT"
                        title="Software Engineer"
                        handle="singhxbt"
                        status="Online"
                        contactText="Contact Me"
                        avatarUrl="https://pbs.twimg.com/profile_images/1958862285851484160/JWSabHMM_400x400.jpg"
                        showUserInfo={true}
                        enableTilt={false}
                        enableMobileTilt={false}
                        onContactClick={() => console.log('Contact clicked')}
                    />
                </div>

                {/* Developer Details - Right Side */}
                <div className="flex-1 max-w-2xl space-y-6 sm:space-y-8 w-full lg:w-auto text-center lg:text-left">
                    {/* Quote */}
                    <div className="relative">
                        <div className="absolute -left-4 top-0 h-full w-1 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
                        <blockquote className="text-lg sm:text-xl lg:text-2xl font-light text-neutral-300 leading-relaxed pl-6 sm:pl-8">
                            &quot;In the blockchain, we don&apos;t just write code, we write the future, one transaction at a time.&quot;
                        </blockquote>
                    </div>

                    {/* Developer Info */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg sm:text-xl font-semibold text-white mb-3">About Me</h3>
                            <p className="text-sm sm:text-base text-neutral-400 leading-relaxed">
                                Full-stack developer passionate about Web3, DeFi, and building the decentralized future.
                                Specialized in smart contract development, DApp architecture, and blockchain integration.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div className="space-y-2">
                                <h4 className="text-xs sm:text-sm font-medium text-neutral-500 uppercase tracking-wider">Expertise</h4>
                                <ul className="space-y-1 text-xs sm:text-sm text-neutral-300">
                                    <li>• Smart Contracts (Solidity)</li>
                                    <li>• DeFi Protocols</li>
                                    <li>• Web3 Integration</li>
                                    <li>• Full-Stack Development</li>
                                </ul>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-xs sm:text-sm font-medium text-neutral-500 uppercase tracking-wider">Technologies</h4>
                                <ul className="space-y-1 text-xs sm:text-sm text-neutral-300">
                                    <li>• React & Next.js</li>
                                    <li>• TypeScript</li>
                                    <li>• Ethereum & EVM</li>
                                    <li>• GraphQL & APIs</li>
                                </ul>
                            </div>
                        </div>

                        <div className="pt-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="text-xs sm:text-sm text-neutral-400">Available for new projects</span>
                                </div>
                                <div className="hidden sm:block text-neutral-600">|</div>
                                <span className="text-xs sm:text-sm text-neutral-400">Based in India</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Loading Component
function LoadingSpinner() {
    return (
        <div className="flex items-center justify-center h-screen bg-[#121218]">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-neutral-400">Loading...</p>
            </div>
        </div>
    );
}

interface GridItemProps {
    area: string;
    icon: React.ReactNode;
    title: string;
    description: React.ReactNode;
}

const GridItem = React.memo(function GridItem({ area, icon, title, description }: GridItemProps) {
    return (
        <li className={`min-h-[12rem] sm:min-h-[14rem] lg:min-h-[16rem] list-none ${area}`}>
            <div className="relative h-full rounded-2xl border p-2 md:rounded-3xl md:p-3">
                <GlowingEffect
                    spread={40}
                    glow={true}
                    disabled={false}
                    proximity={64}
                    inactiveZone={0.01}
                />
                <div className="border-0.75 relative flex h-full flex-col justify-between gap-4 sm:gap-6 overflow-hidden rounded-xl p-4 sm:p-6 md:p-6 dark:shadow-[0px_0px_27px_0px_#2D2D2D]">
                    <div className="relative flex flex-1 flex-col justify-between gap-3">
                        <div className="w-fit rounded-lg border border-gray-600 p-2">
                            {icon}
                        </div>
                        <div className="space-y-2 sm:space-y-3">
                            <h3 className="-tracking-4 pt-0.5 font-sans text-lg/[1.25rem] sm:text-xl/[1.375rem] font-semibold text-balance text-black md:text-2xl/[1.875rem] dark:text-white">
                                {title}
                            </h3>
                            <h2 className="font-sans text-xs/[1rem] sm:text-sm/[1.125rem] text-black md:text-base/[1.375rem] dark:text-neutral-400 [&_b]:md:font-semibold [&_strong]:md:font-semibold">
                                {description}
                            </h2>
                        </div>
                    </div>
                </div>
            </div>
        </li>
    );
});

export default function LandingPage() {
    const [showFeatures, setShowFeatures] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showFooter, setShowFooter] = useState(false);

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setShowFeatures(true);
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    React.useEffect(() => {
        if (showFeatures) {
            const timer = setTimeout(() => {
                setShowProfile(true);
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [showFeatures]);

    React.useEffect(() => {
        if (showProfile) {
            const timer = setTimeout(() => {
                setShowFooter(true);
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [showProfile]);

    return (
        <>
            <NavbarResizable />
            
            {/* Hero Section - Loads immediately */}
            <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#121218]">
                <BackgroundRippleEffect />

                <div className="w-full px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="relative z-10 mx-auto max-w-4xl text-center text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-6 sm:mb-8 text-neutral-800 dark:text-neutral-100 leading-tight">
                        Your Complete Lighter.xyz Hub
                    </h2>

                    {/* Animated text */}
                    <TrueFocus
                        sentence="Dashboard, Explorer & Insights."
                        manualMode={false}
                        blurAmount={4}
                        borderColor="#17A970"
                        animationDuration={0.7}
                        pauseBetweenAnimations={0.5}
                    />

                    <p className="relative z-10 mx-auto mt-4 sm:mt-6 max-w-xl text-center text-sm sm:text-base lg:text-lg text-neutral-700 dark:text-neutral-400 px-4">
                        Track, analyze, and explore everything about Lighter.xyz in one place.
                    </p>

                    {/* Input Box */}
                    <div className="mt-8 sm:mt-12 lg:mt-14 flex justify-center px-4">
                        <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg">
                            <PlaceholdersAndVanishInputBox />
                        </div>
                    </div>
                </div>
            </div>

            {showFeatures && (
                <Suspense fallback={<LoadingSpinner />}>
                    <div className="min-h-screen w-full flex items-center justify-center bg-[#121218] py-8 sm:py-12 lg:py-16">
                        <div className="w-[90%] sm:w-[85%] md:w-[80%] lg:w-[75%] xl:w-[70%]">
                            <LazyGlowingEffectFeatures />
                        </div>
                    </div>
                </Suspense>
            )}

            {showProfile && (
                <Suspense fallback={<LoadingSpinner />}>
                    <LazyProfileSection />
                </Suspense>
            )}

            {showFooter && (
                <Suspense fallback={<div className="h-32 bg-[#121218]"></div>}>
                    <LazyLandingFooter />
                </Suspense>
            )}
        </>
    );
}