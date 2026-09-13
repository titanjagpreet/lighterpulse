import { IntentLink } from "./intent-link";
import { Wordmark } from "./mark";
import { Label } from "./primitives";
import { XLogo } from "./x-logo";
import { lighterApp, LIGHTER_DOCS, REFERRAL_REL } from "@/lib/links";
import { SITE_X } from "@/lib/site";
import { cn } from "@/lib/utils";

const TERMINAL: [string, string][] = [
  ["/overview", "Overview"],
  ["/markets", "Markets"],
  ["/funding", "Funding"],
  ["/liquidations", "Liquidations"],
];

const DATA: [string, string][] = [
  ["/leaderboard", "Leaderboard"],
  ["/lit", "LIT"],
  ["/llp", "LLP & vaults"],
  ["/explorer", "Explorer"],
];

const LINK = "ctl -my-1 py-1 text-[12px] text-ink-2 hover:text-ink";

/**
 * The footer on every page — the landing and the terminal share it, so the
 * two never drift apart. Besides the sections it links the deepest markets:
 * market pages are where most search traffic lands, and a link from every
 * page is how they are found and weighed.
 */
export function SiteFooter({
  markets = [],
  className,
}: {
  /** Symbols to link, deepest first. */
  markets?: string[];
  className?: string;
}) {
  return (
    <footer className={cn("flex flex-wrap items-start gap-10 px-6 py-9 sm:px-11", className)}>
      <div className="flex flex-col gap-3">
        <Wordmark size={14} tone="muted" pulse={false} />
        <span className="figure text-[11px] text-ink-3">
          Built on the public Lighter API. Not affiliated with Lighter.
        </span>
        <span className="figure text-[11px] text-ink-3">
          Links that open Lighter&rsquo;s app carry a referral code.
        </span>
        <a
          href={SITE_X.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(LINK, "mt-1 flex w-fit items-center gap-2")}
        >
          <XLogo size={12} />
          {SITE_X.handle}
        </a>
      </div>
      <div className="grow" />
      <div className="flex flex-wrap gap-x-14 gap-y-8">
        <FooterCol title="Terminal" links={TERMINAL} />
        <FooterCol title="Data" links={DATA} />
        {markets.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <Label className="mb-0.5">Markets</Label>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
              {markets.map((symbol) => (
                <IntentLink key={symbol} href={`/markets/${symbol}`} className={LINK}>
                  {symbol} perp
                </IntentLink>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-col gap-2.5">
          <Label className="mb-0.5">Lighter</Label>
          <a href={lighterApp()} target="_blank" rel={REFERRAL_REL} className={LINK}>
            Open Lighter ↗
          </a>
          <a href={LIGHTER_DOCS.home} target="_blank" rel="noopener noreferrer" className={LINK}>
            Docs ↗
          </a>
          <a href={LIGHTER_DOCS.api} target="_blank" rel="noopener noreferrer" className={LINK}>
            API docs ↗
          </a>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="flex flex-col gap-2.5">
      <Label className="mb-0.5">{title}</Label>
      {links.map(([href, label]) => (
        <IntentLink key={href} href={href} className={LINK}>
          {label}
        </IntentLink>
      ))}
    </div>
  );
}
