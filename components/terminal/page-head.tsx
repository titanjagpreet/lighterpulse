/**
 * A page's title row: the visible heading and one line on what the page
 * covers. The dashboards used to carry their H1 as screen-reader-only text;
 * a heading people can see is also one search engines weigh.
 */
export function PageHead({
  title,
  note,
}: {
  title: React.ReactNode;
  note?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line px-5 py-3.5">
      <h1 className="text-[17px] font-semibold tracking-[-0.015em]">{title}</h1>
      {note && <p className="text-[12px] text-ink-3">{note}</p>}
    </div>
  );
}
