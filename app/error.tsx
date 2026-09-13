"use client";

import { useEffect } from "react";
import { StatusScreen } from "@/components/terminal/status-screen";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[lighterpulse] render error", error);
  }, [error]);

  return (
    <StatusScreen
      code={error.digest ? `error · ${error.digest}` : "error"}
      title="That screen failed to load"
      detail="Something upstream returned an unexpected shape. The data is usually back within a minute — try again, or head to the terminal."
      action={
        <button
          type="button"
          onClick={reset}
          className="figure ctl rounded-[4px] bg-ink px-4 py-2 text-[12px] font-medium text-surface hover:bg-white"
        >
          Try again
        </button>
      }
    />
  );
}
