"use client";
import React, { useState } from "react";
import { BackgroundRippleEffect } from "@/components/aceternity/ripple-effect";
import TrueFocus from "@/components/reactbits/TrueFocus";
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


export function LandingPage() {
    return <>
        <NavbarResizable />
        <div className="relative flex h-screen w-full flex-col items-start justify-start overflow-hidden">
            <BackgroundRippleEffect />
            <div className="mt-50 w-full">

                <h2 className="relative z-10 mx-auto max-w-4xl text-center text-xl font-bold mb-8 text-neutral-800 md:text-3xl lg:text-6xl dark:text-neutral-100">
                    Your Complete Lighter.xyz Hub
                </h2>

                <TrueFocus
                    sentence="Dashboard, Explorer & Insights."
                    manualMode={false}
                    blurAmount={4}
                    borderColor="red"
                    animationDuration={0.7}
                    pauseBetweenAnimations={0.5}
                />
                <p className="relative z-10 mx-auto mt-4 max-w-xl text-center text-neutral-700 dark:text-neutral-400">
                    Track, analyze, and explore everything about Lighter.xyz in one place.
                </p>
            </div>
        </div>
    </>
}