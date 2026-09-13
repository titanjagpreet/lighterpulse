import { NextResponse, type NextRequest } from "next/server";
import { LLP_INDEX } from "@/lib/pools";

/**
 * Redirects that must be real status codes, decided before anything renders.
 * A page cannot do this itself: once a response has started streaming its
 * status is already 200.
 *
 * Canonical market URLs. Every Lighter symbol is upper-case alphanumeric
 * (checked against all 233), so `/markets/btc` and `/markets/Btc` get a 308 to
 * `/markets/BTC`. On a case-insensitive file system a prebuilt `BTC.html` would
 * otherwise be served for `btc` before the route ran. Should a symbol ever
 * carry lower-case letters, the page still resolves it case-insensitively and
 * declares the exact form canonical, so this can never loop or strand a market.
 *
 * `/staking` lands on the LIT page's staking section, and the LLP's own account
 * index on the LLP page rather than a duplicate pool view.
 */
export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname.replace(/\/+$/, "") || "/";

  if (path === "/staking") {
    const url = req.nextUrl.clone();
    url.pathname = "/lit";
    url.hash = "staking";
    return NextResponse.redirect(url, 308);
  }

  if (path === `/llp/${LLP_INDEX}`) {
    const url = req.nextUrl.clone();
    url.pathname = "/llp";
    return NextResponse.redirect(url, 308);
  }

  const match = path.match(/^\/markets\/([^/]+)$/);
  if (!match) return NextResponse.next();

  let symbol: string;
  try {
    symbol = decodeURIComponent(match[1]);
  } catch {
    return NextResponse.next();
  }
  const canonical = symbol.toUpperCase();
  if (symbol === canonical) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = `/markets/${encodeURIComponent(canonical)}`;
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ["/markets/:symbol", "/staking", "/llp/:index"],
};
