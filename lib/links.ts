/**
 * Links out to Lighter.
 *
 * A link that starts something on Lighter — trading, depositing, staking —
 * carries the LighterPulse referral code. A link that only points at a
 * reference, such as the docs, does not.
 *
 * Lighter's app reads `referral` from the query string on any route and then
 * removes it from the address bar, so a deep link keeps the code.
 */

const APP = "https://app.lighter.xyz";
const REFERRAL_CODE = "SINGH";

/** An app.lighter.xyz URL with the referral code, e.g. `lighterApp("/trade/BTC")`. */
export function lighterApp(path = "/"): string {
  const url = new URL(path, APP);
  url.searchParams.set("referral", REFERRAL_CODE);
  return url.toString();
}

/** Reference links — never carry the referral code. */
export const LIGHTER_DOCS = {
  home: "https://docs.lighter.xyz",
  litUtility: "https://docs.lighter.xyz/about-lighter/lit-utility",
  api: "https://apidocs.lighter.xyz",
} as const;

/**
 * `rel` for a referral link: `sponsored` tells search engines what it is,
 * `noopener` keeps the new tab from reaching back into this one.
 */
export const REFERRAL_REL = "sponsored noopener";
