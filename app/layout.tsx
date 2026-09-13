import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import { preconnect } from "react-dom";
import { API_BASE_PUBLIC } from "@/lib/lighter/public";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "LighterPulse — Lighter DEX Analytics, Funding Rates & Explorer",
    template: "%s · LighterPulse",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "lighter",
    "lighter.xyz",
    "lighterpulse",
    "perp dex analytics",
    "open interest",
    "funding rates",
    "liquidations",
    "trader leaderboard",
    "block explorer",
    "LIT token",
    "zkLighter",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // No title, description or url here. Set at the root, every page inherited
  // them, so each shared link previewed as the home page; left out, Next fills
  // them in from each page's own title and description.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    site: "@singhxbt",
    creator: "@singhxbt",
  },
  category: "Finance",
};

export const viewport: Viewport = {
  themeColor: "#070908",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // The live stream and the browser-side fetches all go to Lighter's API;
  // opening the connection early saves the DNS and TLS round trips.
  preconnect(API_BASE_PUBLIC, { crossOrigin: "anonymous" });

  return (
    <html lang="en">
      <body className={`${archivo.variable} ${plexMono.variable} antialiased`}>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
