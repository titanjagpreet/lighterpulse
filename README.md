# LighterPulse

<div align="center">
  
  **Your Complete Lighter.xyz Hub**
  
  [![Next.js](https://img.shields.io/badge/Next.js-15.5.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-18.0-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
  
  Track, analyze, and explore everything about Lighter.xyz in one place.
</div>

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Integration](#api-integration)
- [Pages & Components](#pages--components)
- [Styling & UI](#styling--ui)
- [Development](#development)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Support](#support)
- [License](#license)

## 🚀 Overview

LighterPulse is a comprehensive analytics and exploration platform built specifically for the Lighter.xyz ecosystem. It provides real-time insights, transaction tracking, and portfolio management tools for traders and users of the Lighter protocol.

### Key Highlights

- **Real-time Data**: Live blockchain data integration with Lighter.xyz
- **Portfolio Tracking**: Comprehensive dashboard for account monitoring
- **Block Explorer**: Advanced transaction and block exploration
- **Funding Analysis**: Cross-exchange funding rate comparisons
- **Exchange Statistics**: Live trading pair data with 8 KPI cards and cached metrics
- **Protocol Updates**: Latest announcements and feature releases
- **Performance Optimized**: Redis caching and lazy loading for faster page loads
- **Mobile Responsive**: Optimized for all device sizes

## ✨ Features

### 🚀 Performance & Caching
- **Redis Caching**: Upstash Redis integration for 1-hour cached metrics
- **Lazy Loading**: Progressive loading for better user experience
- **Manual Refresh**: User-controlled data refresh with timestamps
- **Optimized APIs**: Parallel data fetching for faster load times

### 🏠 Dashboard
- **Account Analytics**: Real-time balance tracking and position monitoring
- **Portfolio Overview**: Comprehensive portfolio insights and performance metrics
- **Position Management**: Open positions tracking with P&L calculations
- **Quick Actions**: Direct links to trading and deposit functions
- **Manual Refresh**: Manual data refresh with last updated timestamps
- **Address Search**: Search functionality with validation

### 🔍 Block Explorer
- **Transaction Search**: Search by transaction hash or block number
- **Block Information**: Detailed block data with verification status
- **Address Tracking**: Monitor specific addresses and their activities
- **Real-time Updates**: Live blockchain data with automatic refresh

### 📊 Exchange Statistics
- **Trading Pairs**: Live price data for all Lighter.xyz trading pairs
- **Volume Metrics**: Real-time trading volume and market statistics
- **Market Analysis**: Comprehensive market data and trends
- **Performance Tracking**: Historical data and performance metrics
- **8 KPI Cards**: Total Pairs, Daily Trades, Volume, TVL, Users, TVL Share, Retention, Weekly TVL
- **Cached Data**: 1-hour cached metrics for better performance

### 💰 Funding Comparison
- **Multi-Exchange Support**: Compare funding rates across Lighter, Binance, Bybit, and Hyperliquid
- **Arbitrage Opportunities**: Real-time arbitrage suggestions and opportunities
- **Rate Analysis**: Historical funding rate data and trends
- **Alert System**: Notifications for optimal funding opportunities

### 📢 Announcements
- **Protocol Updates**: Latest Lighter.xyz protocol updates and changes
- **Feature Releases**: New feature announcements and documentation
- **Community News**: Important community updates and events
- **Search & Filter**: Advanced search and filtering capabilities

## 🛠 Tech Stack

### Frontend
- **Framework**: [Next.js 15.5.0](https://nextjs.org/) with App Router
- **Language**: [TypeScript 5.0](https://www.typescriptlang.org/)
- **UI Library**: [React 19.1.0](https://reactjs.org/)
- **Styling**: [Tailwind CSS 4.0](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

### UI Components
- **Aceternity UI**: Modern, animated components
- **Radix UI**: Accessible component primitives
- **React Bits**: Custom component library
- **Motion**: Advanced animations and transitions
- **Glowing Effects**: Interactive hover and focus effects
- **Responsive Design**: Mobile-first approach with tablet and desktop optimization

### Development Tools
- **Package Manager**: npm
- **Linting**: ESLint 9 with Next.js config
- **TypeScript**: Full type safety and IntelliSense
- **PostCSS**: CSS processing and optimization

### Backend & Caching
- **Redis**: Upstash Redis for data caching and performance
- **API Routes**: Next.js API routes for server-side logic
- **Dune Analytics**: Blockchain analytics and metrics
- **Caching Strategy**: 1-hour cache for metrics, real-time for trading data

## 🚀 Getting Started

### Prerequisites

- Node.js 18.0 or later
- npm, yarn, pnpm, or bun package manager
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/lighterpulse.git
   cd lighterpulse
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   # or
   bun install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```

4. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

### Environment Setup

Create a `.env.local` file in the root directory:

```env
# API Configuration
NEXT_PUBLIC_API_URL=https://api.lighter.xyz
NEXT_PUBLIC_WS_URL=wss://api.lighter.xyz/ws

# Dune Analytics API
DUNE_API_KEY=your-dune-api-key

# Upstash Redis Configuration
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Optional: Analytics
NEXT_PUBLIC_GA_ID=your-google-analytics-id
```

## 📁 Project Structure

```
lighterpulse/
├── app/                          # Next.js App Router
│   ├── dashboard/               # Dashboard pages
│   │   ├── [address]/          # Dynamic address routes
│   │   │   └── page.tsx        # Address-specific dashboard
│   │   └── page.tsx            # Main dashboard
│   ├── explorer/               # Block explorer
│   │   ├── tx/[txnhash]/       # Transaction details
│   │   │   └── page.tsx        # Transaction page
│   │   └── page.tsx            # Explorer main page
│   ├── exchange-stats/         # Exchange statistics
│   │   └── page.tsx            # Exchange stats page
│   ├── funding-comparison/     # Funding rate comparison
│   │   └── page.tsx            # Funding comparison page
│   ├── announcements/          # Protocol announcements
│   │   └── page.tsx            # Announcements page
│   ├── support/               # Support page
│   │   └── page.tsx            # Support page
│   ├── api/                   # API routes
│   │   └── metrics/           # Metrics API endpoint
│   │       └── route.ts       # Cached metrics API
│   ├── error.tsx              # Error boundary
│   ├── global-error.tsx       # Global error boundary
│   ├── not-found.tsx          # 404 Not Found page
│   ├── robots.ts              # SEO robots.txt
│   ├── sitemap.ts             # SEO sitemap
│   ├── favicon.ico            # Site favicon
│   ├── globals.css            # Global styles
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Landing page
├── components/                 # Reusable components
│   ├── aceternity/            # Aceternity UI components
│   │   ├── glow-cards.tsx     # Glowing card effects
│   │   ├── navbar.tsx         # Navigation component
│   │   ├── ripple-effect.tsx  # Background effects
│   │   └── vanish-input.tsx   # Animated input
│   ├── reactbits/             # Custom components
│   │   ├── landing-footer.tsx # Footer component
│   │   ├── NotFound.tsx       # 404 Not Found component
│   │   ├── ProfileCard.css    # Profile card styles
│   │   ├── ProfileCard.tsx    # Profile card component
│   │   └── TrueFocus.tsx      # Text animation
│   └── ui/                    # UI components
│       ├── button.tsx         # Button component
│       └── tooltip.tsx        # Tooltip component
├── lib/                       # Utility libraries
│   ├── redis.ts              # Redis client configuration
│   └── utils.ts              # Common utilities
├── types/                    # TypeScript type definitions
│   ├── excahngeStats.ts      # Exchange statistics types
│   ├── explorerLanding.ts    # Explorer types
│   ├── funding.ts            # Funding comparison types
│   ├── routes.ts             # Route types
│   └── transaction.ts        # Transaction types
├── utils/                    # Utility functions
│   ├── getAnnouncements.ts   # Announcements API
│   ├── getBalancePositions.ts # Balance & positions API
│   ├── getCachedMetrics.ts   # Cached metrics utility
│   ├── getExchangeStats.ts   # Exchange statistics API
│   ├── getExplorerLandingData.ts # Explorer data API
│   ├── getFundingData.ts     # Funding data API
│   ├── getOtherStats.ts      # Additional metrics API
│   ├── getTotalLiquidation.ts # Total 24h liquidation
│   ├── getTotalOI.ts         # Total real time OI
│   ├── getTransaction.ts     # Transaction data API
│   └── validation.ts         # Input validation
├── public/                   # Static assets
│   ├── logo.png              # LighterPulse logo
│   ├── file.svg              # File icon
│   ├── globe.svg             # Globe icon
│   ├── next.svg              # Next.js logo
│   ├── vercel.svg            # Vercel logo
│   └── window.svg            # Window icon
├── components.json           # Component configuration
├── eslint.config.mjs         # ESLint configuration
├── next-env.d.ts            # Next.js type definitions
├── next.config.ts           # Next.js configuration
├── package.json             # Dependencies and scripts
├── package-lock.json        # Dependency lock file
├── postcss.config.mjs       # PostCSS configuration
├── tailwind.config.ts       # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── README.md               # Project documentation
```

## 🔌 API Integration

### Lighter.xyz API

The application integrates with the Lighter.xyz API for real-time blockchain data:

- **Account Data**: Balance, positions, and portfolio information
- **Blockchain Data**: Transactions, blocks, and address information
- **Market Data**: Trading pairs, prices, and volume statistics
- **Funding Rates**: Real-time funding rate data across exchanges

### Internal API Endpoints

- **`/api/metrics`**: Cached metrics endpoint with 1-hour Redis caching
- **Dune Analytics Integration**: Additional blockchain metrics and analytics
- **Upstash Redis**: High-performance caching layer for improved user experience

### External APIs

- **Exchange APIs**: Binance, Bybit, Hyperliquid for funding rate comparisons
- **Blockchain APIs**: Ethereum, Solana, Bitcoin for transaction verification
- **Dune Analytics**: For additional metrics and analytics data
- **Upstash Redis**: For caching and performance optimization

## 📄 Pages & Components

### Landing Page (`/`)
- Hero section with animated text effects
- Feature showcase with interactive cards
- Developer profile section
- Responsive design for all devices

### Dashboard (`/dashboard/[address]`)
- Account overview with KPI cards
- Position tracking and management
- Performance analytics
- Quick action buttons

### Explorer (`/explorer`)
- Search functionality for blocks and transactions
- Latest blocks and transactions display
- Real-time blockchain statistics
- Advanced filtering options

### Exchange Stats (`/exchange-stats`)
- Live trading pair data with 8 KPI cards
- Volume and price metrics
- Market analysis charts
- Performance tracking
- Cached metrics (TVL, Users, Retention, etc.)

### Funding Comparison (`/funding-comparison`)
- Multi-exchange funding rate comparison
- Arbitrage opportunity detection
- Historical rate analysis
- Alert system integration

### Announcements (`/announcements`)
- Protocol update notifications
- Feature release announcements
- Community news and events
- Search and filter capabilities

### Support (`/support`)
- Developer support information
- Crypto donation methods (ETH, SOL, BTC)
- Social media links
- Contact information

## 🎨 Styling & UI

### Design System

- **Color Palette**: Dark theme with blue, purple, and green accents
- **Typography**: Modern, readable fonts with proper hierarchy
- **Spacing**: Consistent spacing system using Tailwind CSS
- **Animations**: Smooth transitions and hover effects

### Responsive Design

- **Mobile First**: Optimized for mobile devices (320px+)
- **Tablet Support**: Enhanced layout for tablets (640px+)
- **Desktop**: Full-featured experience (1024px+)
- **Large Screens**: Optimized for large displays (1280px+)

### Component Library

- **Aceternity UI**: Modern, animated components
- **Custom Components**: Tailored for Lighter.xyz ecosystem
- **Accessibility**: WCAG 2.1 compliant components
- **Performance**: Optimized for fast loading and smooth interactions

## 🛠 Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Additional Commands
npx tsc --noEmit     # Run TypeScript compiler check
```

### Development Guidelines

1. **Code Style**: Follow TypeScript and React best practices
2. **Component Structure**: Use functional components with hooks
3. **Type Safety**: Define proper TypeScript interfaces
4. **Performance**: Optimize for Core Web Vitals
5. **Accessibility**: Ensure WCAG 2.1 compliance

### Git Workflow

1. Create feature branches from `main`
2. Use descriptive commit messages
3. Test thoroughly before submitting PRs
4. Follow the existing code style and patterns

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect Repository**
   ```bash
   vercel --prod
   ```

2. **Environment Variables**
   - Set up environment variables in Vercel dashboard
   - Configure API endpoints and keys

3. **Custom Domain**
   - Add custom domain in Vercel settings
   - Configure DNS records

### Other Platforms

- **Netlify**: Compatible with Next.js static export
- **AWS Amplify**: Full-stack deployment support
- **Railway**: Simple deployment with database support

### Build Configuration

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      'lighter.xyz',
      'upload.wikimedia.org',
      'www.citypng.com',
      'freebiehive.com',
      'icon2.cleanpng.com'
    ],
  },
  eslint: {
    ignoreDuringBuilds: true, // Optional: disable ESLint during builds
  },
};

export default nextConfig;
```

## 🤝 Contributing

We welcome contributions to LighterPulse! Here's how you can help:

### Ways to Contribute

1. **Bug Reports**: Report issues and bugs
2. **Feature Requests**: Suggest new features
3. **Code Contributions**: Submit pull requests
4. **Documentation**: Improve documentation
5. **Testing**: Help with testing and QA

### Contribution Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards

- Follow existing code style and patterns
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all checks pass

## 💬 Support

### Getting Help

- **Documentation**: Check this README and inline code comments
- **Issues**: Open an issue on GitHub for bugs or questions
- **Discussions**: Use GitHub Discussions for general questions
- **Community**: Join the Lighter.xyz community

### Developer Support

If you find LighterPulse helpful, consider supporting the developer:

- **Ethereum**: `0x78E970B10027759c91C516FBF42c4DB12F752C1D`
- **Solana**: `8rFaAgvSdQC2vHymtT2orLdq7E7DntMc6XcK1ig5Fkxv`
- **Bitcoin**: `bc1pjhcvm40dky2w4kgyv7hg6mxm45r7x2n6rkzm78kx223dsc0h5rqqqq2xhf`

Visit the [Support Page](/support) for more information and easy copy-to-clipboard functionality.

### Social Media

- **Twitter/X**: [@singhxbt](https://x.com/singhxbt)
- **GitHub**: [titanjagpreet](https://github.com/titanjagpreetsingh)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Lighter.xyz Team**: For building an amazing protocol
- **Next.js Team**: For the excellent framework
- **Aceternity UI**: For beautiful component designs
- **Upstash**: For Redis caching infrastructure
- **Dune Analytics**: For blockchain analytics and metrics
- **Community**: For feedback and contributions

---

<div align="center">
  <p>Built with ❤️ for the Lighter.xyz community</p>
  <p>
    <a href="https://lighter.xyz">Lighter.xyz</a> •
    <a href="https://x.com/singhxbt">Twitter</a> •
    <a href="/support">Support</a>
  </p>
</div>