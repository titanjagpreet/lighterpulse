/**
 * Values safe to read from both the server and the browser.
 *
 * `client.ts` is server-only (it carries the auth token and the explorer
 * host); anything a client component needs must live here instead.
 */

export const API_BASE_PUBLIC =
  process.env.NEXT_PUBLIC_LIGHTER_API ?? "https://mainnet.zklighter.elliot.ai";

/**
 * The explorer answers browsers directly and limits per IP, so per-account
 * history is fetched on the visitor's quota — never through our server, which
 * shares one 90-weighted-requests-a-minute budget across every visitor.
 */
export const EXPLORER_BASE_PUBLIC =
  process.env.NEXT_PUBLIC_EXPLORER_API ?? "https://explorer.elliot.ai";
