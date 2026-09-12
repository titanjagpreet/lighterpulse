import { lighterApp, REFERRAL_REL } from "@/lib/links";
import { cn } from "@/lib/utils";

/**
 * A quiet button out to Lighter's app, only where acting there is the natural
 * next step — trade this market, deposit into this pool, stake. It carries the
 * referral code; reference links use `ProofLink` and carry none.
 */
export function LighterLink({
  path = "/",
  children,
  className,
}: {
  /** An app.lighter.xyz route, e.g. "/trade/BTC". */
  path?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={lighterApp(path)}
      target="_blank"
      rel={REFERRAL_REL}
      className={cn(
        "figure ctl inline-flex shrink-0 items-center gap-1 rounded-[3px] border border-edge px-2.5 py-1 text-[11px] text-ink-2 hover:border-ink-4 hover:text-ink pointer-coarse:py-2",
        className,
      )}
    >
      {children}
      <span aria-hidden="true">↗</span>
      <span className="sr-only">(opens Lighter in a new tab)</span>
    </a>
  );
}
