/**
 * The site's one public address and name.
 *
 * Vercel serves www and redirects the bare domain to it, and www is what
 * search engines have indexed. Canonical URLs, the sitemap, robots.txt and
 * structured data all name it, so ranking signals are never split between
 * two spellings of the same page.
 */
export const SITE_URL = "https://www.lighterpulse.xyz";
export const SITE_NAME = "LighterPulse";
export const SITE_DESCRIPTION =
  "Live markets, funding across venues, liquidations, trader leaderboards and a full block explorer for Lighter — open interest, buybacks and live positions across every market.";

/** The site's account on X. */
export const SITE_X = {
  handle: "@singhxbt",
  url: "https://x.com/singhxbt",
} as const;

/** An absolute URL on this site, e.g. `siteUrl("/markets/BTC")`. */
export function siteUrl(path = "/"): string {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

/** schema.org BreadcrumbList. Home comes first; pass the rest as [name, path]. */
export function breadcrumbs(trail: [name: string, path: string][]) {
  const crumbs: [string, string][] = [["Home", "/"], ...trail];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: siteUrl(path),
    })),
  };
}

/** schema.org WebSite and Organization, for the home page. */
export function siteSchema() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: siteUrl("/apple-icon.png"),
        // Ties the brand to its X account for search engines.
        sameAs: [SITE_X.url],
      },
    ],
  };
}
