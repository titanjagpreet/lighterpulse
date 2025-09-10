"use client";
import React, { useState } from "react";
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

export function NavbarResizable() {
    const navItems = [
        {
            name: "𝕏",
            link: "https://x.com/singhxbt",
        },
    ];

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="fixed top-0 left-0 right-0 z-50 w-full">
            <Navbar>
                {/* Desktop Navigation */}
                <NavBody>
                    <NavbarLogo />
                    <NavItems items={navItems} />
                    <div className="flex items-center gap-4">
                        <NavbarButton variant="primary">Explorer</NavbarButton>
                        <NavbarButton variant="primary">Dashboard</NavbarButton>
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
                            >
                                Login
                            </NavbarButton>
                            <NavbarButton
                                onClick={() => setIsMobileMenuOpen(false)}
                                variant="primary"
                                className="w-full"
                            >
                                Book a call
                            </NavbarButton>
                        </div>
                    </MobileNavMenu>
                </MobileNav>
            </Navbar>
            {/* Navbar */}
        </div>
    );
}

export function PlaceholdersAndVanishInputBox() {
    const placeholders = [
        "Enter address, transaction hash, or block number",
        "Try: 0xabc...123, tx hash, or block height"
    ];

    const router = useRouter();
    const [error, setError] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        console.log("Input:", e.target.value);
    };

    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const inputEl = e.currentTarget.querySelector("input") as HTMLInputElement;
        const value = inputEl.value;

        const route = getRouteForInput(value);
        
        if (route) {
            router.push(route);
        } else {
            setError("Invalid input. Please enter a valid address, transaction hash, or block number.");
        }
    };

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

export function GlowingEffectFeatures() {
    return (
        <ul className="grid grid-cols-1 grid-rows-none gap-4 md:grid-cols-12 md:grid-rows-3 lg:gap-4 xl:max-h-[34rem] xl:grid-rows-2">
            <GridItem
                area="md:[grid-area:1/1/2/7] xl:[grid-area:1/1/2/5]"
                icon={<Box className="h-4 w-4 text-black dark:text-neutral-400" />}
                title="Real-Time On-Chain Data"
                description="Stay ahead with live data updates from the Lighter protocol."
            />

            <GridItem
                area="md:[grid-area:1/7/2/13] xl:[grid-area:2/1/3/5]"
                icon={<Settings className="h-4 w-4 text-black dark:text-neutral-400" />}
                title="Transaction Explorer"
                description="Dive deep into all protocol transactions, and chain blocks"
            />

            <GridItem
                area="md:[grid-area:2/1/3/7] xl:[grid-area:1/5/3/8]"
                icon={<Lock className="h-4 w-4 text-black dark:text-neutral-400" />}
                title="Account Health Monitor"
                description="Track your wallet balance, open positions, and overall exposure in real time."
            />

            <GridItem
                area="md:[grid-area:2/7/3/13] xl:[grid-area:1/8/2/13]"
                icon={<Sparkles className="h-4 w-4 text-black dark:text-neutral-400" />}
                title="Interactive Analytics Dashboard"
                description="Beautiful charts and visual insights to monitor your portfolio health."
            />

            <GridItem
                area="md:[grid-area:3/1/4/13] xl:[grid-area:2/8/3/13]"
                icon={<Search className="h-4 w-4 text-black dark:text-neutral-400" />}
                title="Live Balance & Positions"
                description="Track your wallet balance, open positions, and overall exposure in real time."
            />
        </ul>
    );
}

interface GridItemProps {
    area: string;
    icon: React.ReactNode;
    title: string;
    description: React.ReactNode;
}

const GridItem = ({ area, icon, title, description }: GridItemProps) => {
    return (
        <li className={`min-h-[14rem] list-none ${area}`}>
            <div className="relative h-full rounded-2xl border p-2 md:rounded-3xl md:p-3">
                <GlowingEffect
                    spread={40}
                    glow={true}
                    disabled={false}
                    proximity={64}
                    inactiveZone={0.01}
                />
                <div className="border-0.75 relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl p-6 md:p-6 dark:shadow-[0px_0px_27px_0px_#2D2D2D]">
                    <div className="relative flex flex-1 flex-col justify-between gap-3">
                        <div className="w-fit rounded-lg border border-gray-600 p-2">
                            {icon}
                        </div>
                        <div className="space-y-3">
                            <h3 className="-tracking-4 pt-0.5 font-sans text-xl/[1.375rem] font-semibold text-balance text-black md:text-2xl/[1.875rem] dark:text-white">
                                {title}
                            </h3>
                            <h2 className="font-sans text-sm/[1.125rem] text-black md:text-base/[1.375rem] dark:text-neutral-400 [&_b]:md:font-semibold [&_strong]:md:font-semibold">
                                {description}
                            </h2>
                        </div>
                    </div>
                </div>
            </div>
        </li>
    );
};


export function LandingPage() {
    return <>
        <NavbarResizable />
        <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#121218]">
            <BackgroundRippleEffect />

            <div className="w-full px-4 text-center">
                {/* Heading */}
                <h2 className="relative z-10 mx-auto max-w-4xl text-center text-xl font-bold mb-8 text-neutral-800 md:text-3xl lg:text-6xl dark:text-neutral-100">
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

                {/* Subtext */}
                <p className="relative z-10 mx-auto mt-6 max-w-xl text-center text-neutral-700 dark:text-neutral-400">
                    Track, analyze, and explore everything about Lighter.xyz in one place.
                </p>

                {/* Input Box */}
                <div className="mt-14 flex justify-center">
                    <div className="w-full max-w-lg">
                        <PlaceholdersAndVanishInputBox />
                    </div>
                </div>
            </div>
        </div>
        <div className="h-screen w-full flex items-center justify-center bg-[#121218]">
            <div className="w-[75%]">
                <GlowingEffectFeatures />
            </div>
        </div>

        <div className="h-screen w-full flex items-center justify-center bg-[#121218] px-8">
            <div className="flex items-center justify-between w-full max-w-6xl gap-16">
                {/* Profile Card - Left Side */}
                <div className="flex-shrink-0">
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
                <div className="flex-1 max-w-2xl space-y-8">
                    {/* Quote Section */}
                    <div className="relative">
                        <div className="absolute -left-4 top-0 h-full w-1 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
                        <blockquote className="text-2xl font-light text-neutral-300 leading-relaxed pl-8">
                            "In the blockchain, we don't just write code, we write the future, one transaction at a time."
                        </blockquote>
                    </div>

                    {/* Developer Info */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xl font-semibold text-white mb-3">About Me</h3>
                            <p className="text-neutral-400 leading-relaxed">
                                Full-stack developer passionate about Web3, DeFi, and building the decentralized future.
                                Specialized in smart contract development, DApp architecture, and blockchain integration.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Expertise</h4>
                                <ul className="space-y-1 text-neutral-300">
                                    <li>• Smart Contracts (Solidity)</li>
                                    <li>• DeFi Protocols</li>
                                    <li>• Web3 Integration</li>
                                    <li>• Full-Stack Development</li>
                                </ul>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Technologies</h4>
                                <ul className="space-y-1 text-neutral-300">
                                    <li>• React & Next.js</li>
                                    <li>• TypeScript</li>
                                    <li>• Ethereum & EVM</li>
                                    <li>• GraphQL & APIs</li>
                                </ul>
                            </div>
                        </div>

                        <div className="pt-4">
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="text-sm text-neutral-400">Available for new projects</span>
                                </div>
                                <div className="text-neutral-600">|</div>
                                <span className="text-sm text-neutral-400">Based in India</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Footer */}
        <LandingFooter />
    </>
}