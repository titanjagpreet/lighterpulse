import Link from "next/link";
import { Mark } from "./mark";

/**
 * The shared shell for 404s and error boundaries. Quiet, not apologetic —
 * says what happened and offers the two routes that always work.
 */
export function StatusScreen({
  code,
  title,
  detail,
  action,
}: {
  code: string;
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 text-center">
      <Mark size={26} />
      <p
        className="figure mt-7 text-[11px] tracking-[0.13em] text-ink-4 uppercase"
        aria-hidden="true"
      >
        {code}
      </p>
      <h1 className="mt-3 text-[22px] font-semibold tracking-[-0.02em]">
        {title}
      </h1>
      <p className="mt-3 max-w-[46ch] text-[13px] leading-relaxed text-ink-3">
        {detail}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
        {action}
        <Link
          href="/overview"
          className="figure ctl rounded-[4px] border border-edge px-4 py-2 text-[12px] text-ink hover:border-ink-4"
        >
          Open terminal
        </Link>
        <Link
          href="/"
          className="figure ctl rounded-[4px] px-4 py-2 text-[12px] text-ink-3 hover:text-ink"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
