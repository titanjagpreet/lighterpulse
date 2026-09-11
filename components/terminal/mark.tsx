import { cn } from "@/lib/utils";

/**
 * The LighterPulse mark: a diamond with a solid core.
 *
 * The identity is behavioural, not decorative — the core breathes, which is
 * what makes the name something the interface *does* rather than says. Set
 * `pulse={false}` for static contexts (footer, favicons, print).
 */
export function Mark({
  size = 16,
  pulse = true,
  className,
  tone = "brand",
}: {
  size?: number;
  pulse?: boolean;
  className?: string;
  tone?: "brand" | "muted";
}) {
  const color = tone === "brand" ? "var(--color-brand)" : "var(--color-ink-4)";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M9 1 L16 9 L9 17 L2 9 Z"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M9 5.4 L12.6 9 L9 12.6 L5.4 9 Z"
        fill={color}
        className={pulse ? "pulse-mark" : undefined}
      />
    </svg>
  );
}

/** Mark + wordmark. The lockup is uppercase and tracked — terminal, not startup. */
export function Wordmark({
  size = 16,
  pulse = true,
  tone = "brand",
  className,
}: {
  size?: number;
  pulse?: boolean;
  tone?: "brand" | "muted";
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Mark size={size} pulse={pulse} tone={tone} />
      <span
        className={cn(
          "font-bold tracking-[0.085em]",
          tone === "brand" ? "text-ink" : "text-ink-3",
        )}
        style={{ fontSize: size * 0.78 }}
      >
        LIGHTERPULSE
      </span>
    </span>
  );
}
