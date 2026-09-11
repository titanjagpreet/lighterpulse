import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
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
  metadataBase: new URL("https://lighterpulse.xyz"),
  title: {
    default: "LighterPulse — the Lighter terminal",
    template: "%s · LighterPulse",
  },
  description:
    "Live market data, liquidation maps, trader leaderboards and a full block explorer for Lighter. Open interest, funding, positions and PnL across every market.",
  keywords: [
    "lighter",
    "lighter.xyz",
    "lighterpulse",
    "perp dex analytics",
    "open interest",
    "funding rates",
    "liquidation map",
    "trader leaderboard",
    "block explorer",
    "LIT token",
    "zkLighter",
  ],
  authors: [{ name: "LighterPulse" }],
  creator: "LighterPulse",
  icons: { icon: "/favicon.ico", apple: "/logo.png" },
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
  openGraph: {
    type: "website",
    url: "https://lighterpulse.xyz",
    siteName: "LighterPulse",
    locale: "en_US",
    title: "LighterPulse — the Lighter terminal",
    description:
      "Live market data, liquidation maps, trader leaderboards and a full block explorer for Lighter.",
    images: [{ url: "/logo.png", width: 1200, height: 630, alt: "LighterPulse" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@singhxbt",
    creator: "@singhxbt",
    title: "LighterPulse — the Lighter terminal",
    description:
      "Live market data, liquidation maps, trader leaderboards and a full block explorer for Lighter.",
    images: ["/logo.png"],
  },
  alternates: { canonical: "https://lighterpulse.xyz" },
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
  return (
    <html lang="en">
      <body className={`${archivo.variable} ${plexMono.variable} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
