/**
 * Values safe to read from both the server and the browser.
 *
 * `client.ts` is server-only (it carries the auth token and the explorer
 * host); anything a client component needs must live here instead.
 */

export const API_BASE_PUBLIC =
  process.env.NEXT_PUBLIC_LIGHTER_API ?? "https://mainnet.zklighter.elliot.ai";
