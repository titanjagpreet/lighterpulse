import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next"
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LighterPulse - Real-time Analytics for Lighter.xyz",
  description: "Comprehensive analytics platform for Lighter.xyz featuring real-time trading stats, funding rate comparisons, exchange insights, transaction explorer, and portfolio tracking for perpetual DEX traders.",
  icons: {
    icon: "/favicon.ico",
  },
  keywords: [
    "lighter.xyz",
    "lighterpulse", 
    "crypto analytics",
    "perpetual dex",
    "trading analytics",
    "funding rates",
    "exchange stats",
    "block explorer",
    "portfolio tracker",
    "defi analytics",
    "crypto trading",
    "perp trading",
    "lighter protocol",
    "real-time data",
    "trading insights",
    "crypto dashboard",
    "defi dashboard",
    "trading statistics",
    "market analysis",
    "crypto metrics"
  ],
  authors: [{ name: "LighterPulse Team" }],
  creator: "LighterPulse",
  publisher: "LighterPulse",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "LighterPulse - Real-time Analytics for Lighter.xyz",
    description: "Comprehensive analytics platform for Lighter.xyz featuring real-time trading stats, funding rate comparisons, exchange insights, and portfolio tracking.",
    url: "https://lighterpulse.xyz",
    siteName: "LighterPulse",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "LighterPulse - Analytics for Lighter.xyz",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@singhxbt",
    creator: "@singhxbt",
    title: "LighterPulse - Real-time Analytics for Lighter.xyz",
    description: "Comprehensive analytics platform for Lighter.xyz featuring real-time trading stats, funding rate comparisons, and exchange insights.",
    images: ["/logo.png"],
  },
  alternates: {
    canonical: "https://lighterpulse.xyz",
  },
  category: "Technology",
  classification: "Crypto Analytics Platform",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "LighterPulse",
    "application-name": "LighterPulse",
    "msapplication-TileColor": "#121218",
    "theme-color": "#121218",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
