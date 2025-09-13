"use client";
import { useState } from "react";
import Link from "next/link";
import { Home, ArrowLeft, Search, AlertCircle } from "lucide-react";
import { GlowingEffect } from "@/components/aceternity/glow-cards";
import { cn } from "@/lib/utils";

interface NotFoundProps {
  title?: string;
  description?: string;
  showBackButton?: boolean;
  showHomeButton?: boolean;
  showSearchButton?: boolean;
}

export default function NotFound({
  title = "Page Not Found",
  description = "The page you're looking for doesn't exist or has been moved.",
  showBackButton = true,
  showHomeButton = true,
  showSearchButton = true,
}: NotFoundProps) {
  const [isHovered, setIsHovered] = useState<string | null>(null);

  const handleGoBack = () => {
    if (typeof window !== "undefined") {
      window.history.back();
    }
  };

  return (
    <div className="min-h-screen bg-[#121218] text-white flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* 404 Animation */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-3xl opacity-20 scale-150"></div>
          <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 rounded-full p-8 mx-auto w-32 h-32 flex items-center justify-center">
            <AlertCircle className="w-16 h-16 text-white" />
          </div>
        </div>

        {/* Error Code */}
        <div className="mb-6">
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent mb-4">
            404
          </h1>
          <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-4">
            {title}
          </h2>
          <p className="text-lg text-neutral-400 leading-relaxed max-w-lg mx-auto">
            {description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          {showBackButton && (
            <button
              onClick={handleGoBack}
              onMouseEnter={() => setIsHovered("back")}
              onMouseLeave={() => setIsHovered(null)}
              className="relative group w-full sm:w-auto"
            >
              <div className="relative rounded-xl border p-1">
                <GlowingEffect
                  spread={30}
                  glow={isHovered === "back"}
                  disabled={false}
                  proximity={64}
                  inactiveZone={0.01}
                />
                <div className="border-0.75 relative flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="font-medium">Go Back</span>
                </div>
              </div>
            </button>
          )}

          {showHomeButton && (
            <Link
              href="/"
              onMouseEnter={() => setIsHovered("home")}
              onMouseLeave={() => setIsHovered(null)}
              className="relative group w-full sm:w-auto"
            >
              <div className="relative rounded-xl border p-1">
                <GlowingEffect
                  spread={30}
                  glow={isHovered === "home"}
                  disabled={false}
                  proximity={64}
                  inactiveZone={0.01}
                />
                <div className="border-0.75 relative flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors">
                  <Home className="w-4 h-4" />
                  <span className="font-medium">Go Home</span>
                </div>
              </div>
            </Link>
          )}

          {showSearchButton && (
            <Link
              href="/explorer"
              onMouseEnter={() => setIsHovered("search")}
              onMouseLeave={() => setIsHovered(null)}
              className="relative group w-full sm:w-auto"
            >
              <div className="relative rounded-xl border p-1">
                <GlowingEffect
                  spread={30}
                  glow={isHovered === "search"}
                  disabled={false}
                  proximity={64}
                  inactiveZone={0.01}
                />
                <div className="border-0.75 relative flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 transition-colors">
                  <Search className="w-4 h-4" />
                  <span className="font-medium">Explore</span>
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-md mx-auto">
          <Link
            href="/dashboard"
            className="p-3 bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors text-sm"
          >
            Dashboard
          </Link>
          <Link
            href="/explorer"
            className="p-3 bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors text-sm"
          >
            Explorer
          </Link>
          <Link
            href="/exchange-stats"
            className="p-3 bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors text-sm"
          >
            Exchange Stats
          </Link>
          <Link
            href="/support"
            className="p-3 bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors text-sm"
          >
            Support
          </Link>
        </div>

        {/* Footer Message */}
        <div className="mt-12 pt-8 border-t border-neutral-800">
          <p className="text-sm text-neutral-500">
            Need help? Check out our{" "}
            <Link href="/support" className="text-blue-400 hover:text-blue-300 transition-colors">
              support page
            </Link>{" "}
            or{" "}
            <a
              href="https://x.com/singhxbt"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              contact us
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
