"use client";
import { useState, useEffect } from "react";
import { Search, ArrowLeft, Calendar, Clock } from "lucide-react";
import { GlowingEffect } from "@/components/aceternity/glow-cards";
import { cn } from "@/lib/utils";
import { getAnnouncements, Announcement } from "@/utils/getAnnouncements";
import Link from "next/link";

export default function AnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [userAddress, setUserAddress] = useState<string>("");

    // Get user address from URL query parameter
    useEffect(() => {
        const getAddressFromUrl = () => {
            if (typeof window !== 'undefined') {
                const urlParams = new URLSearchParams(window.location.search);
                const fromAddress = urlParams.get('from');
                if (fromAddress) {
                    setUserAddress(fromAddress);
                }
            }
        };

        getAddressFromUrl();
    }, []);

    // Fetch announcements data
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await getAnnouncements();
                if (data && Array.isArray(data)) {
                    setAnnouncements(data);
                } else {
                    setError("Failed to fetch announcements");
                }
            } catch (err) {
                setError("Failed to fetch announcements");
                console.error("Error fetching announcements:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Filter announcements based on search
    const filteredAnnouncements = announcements.filter(announcement =>
        announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        announcement.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort announcements by timestamp (newest first)
    const sortedAnnouncements = [...filteredAnnouncements].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Format timestamp for display
    const formatTimestamp = (created_at: string) => {
        const date = new Date(created_at);
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
        
        if (diffInHours < 1) return "Just now";
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInHours < 48) return "Yesterday";
        
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#121218] text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-neutral-400">Loading announcements...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#121218] text-white flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-400 mb-4">Failed to load announcements</p>
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
                            href={userAddress ? `/dashboard/${userAddress}` : "/dashboard/0x0000000000000000000000000000000000000000"}
                            className="flex items-center space-x-1 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-neutral-300 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>Dashboard</span>
                        </Link>
                        <button className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-neutral-300 hover:text-white transition-colors">
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
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-4 sm:space-y-0">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Announcements</h1>
                                <p className="text-neutral-400 text-sm sm:text-base">Stay updated with the latest news and updates from Lighter</p>
                            </div>
                        </div>
                    </div>

                    {/* Search Box */}
                    <div className="mb-6">
                        <div className="max-w-md">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search announcements..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Announcements Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        {sortedAnnouncements.length > 0 ? (
                            sortedAnnouncements.map((announcement, index) => (
                                <div key={index} className="relative group">
                                    <div className="relative h-full rounded-2xl border p-2 md:rounded-3xl md:p-3">
                                        <GlowingEffect
                                            spread={40}
                                            glow={true}
                                            disabled={false}
                                            proximity={64}
                                            inactiveZone={0.01}
                                        />
                                        <div className="border-0.75 relative flex h-full flex-col justify-between gap-4 overflow-hidden rounded-xl p-6 md:p-6 dark:shadow-[0px_0px_27px_0px#2D2D2D] bg-neutral-900">
                                            {/* Header */}
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                                                        {announcement.title}
                                                    </h3>
                                                    <div className="flex items-center space-x-3 text-xs text-neutral-400">
                                                        <div className="flex items-center space-x-1">
                                                            <Calendar className="w-3 h-3" />
                                                            <span>{formatTimestamp(announcement.created_at)}</span>
                                                        </div>
                                                        <div className="flex items-center space-x-1">
                                                            <Clock className="w-3 h-3" />
                                                            <span>{new Date(announcement.created_at).toLocaleTimeString('en-US', {
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex-shrink-0 ml-3">
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1">
                                                <p className="text-neutral-300 text-sm leading-relaxed line-clamp-4">
                                                    {announcement.content}
                                                </p>
                                            </div>

                                            {/* Footer */}
                                            <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                                                <span className="text-xs text-neutral-500">#{index + 1}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full">
                                <div className="relative group">
                                    <div className="relative h-full rounded-2xl border p-2 md:rounded-3xl md:p-3">
                                        <GlowingEffect
                                            spread={40}
                                            glow={true}
                                            disabled={false}
                                            proximity={64}
                                            inactiveZone={0.01}
                                        />
                                        <div className="border-0.75 relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl p-6 md:p-6 dark:shadow-[0px_0px_27px_0px#2D2D2D] bg-neutral-900">
                                            <div className="text-center py-12">
                                                <Calendar className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                                                <p className="text-neutral-400 text-lg mb-2">
                                                    {searchTerm ? 'No announcements found' : 'No announcements available'}
                                                </p>
                                                <p className="text-neutral-500 text-sm">
                                                    {searchTerm ? 'Try adjusting your search terms' : 'Check back later for updates'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Results Count */}
                    {sortedAnnouncements.length > 0 && (
                        <div className="mt-6 text-center">
                            <p className="text-neutral-400 text-sm">
                                Showing {sortedAnnouncements.length} of {announcements.length} announcements
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
