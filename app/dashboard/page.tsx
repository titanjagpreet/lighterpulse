"use client";
import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getRouteForInput } from "@/utils/validation";
import { BackgroundRippleEffect } from "@/components/aceternity/ripple-effect";
import TrueFocus from "@/components/reactbits/TrueFocus";
import { PlaceholdersAndVanishInput } from "@/components/aceternity/vanish-input";

export function PlaceholdersAndVanishInputBox() {
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

export default function Dashboard() {
    return (
        <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#121218]">
            <BackgroundRippleEffect />

            <div className="w-full px-4 text-center">
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
    );
}