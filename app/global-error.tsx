"use client";
import { useEffect } from "react";
import NotFound from "@/components/reactbits/NotFound";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global application error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <NotFound
          title="Application Error"
          description="A critical error occurred. Please refresh the page or contact support."
          showBackButton={false}
          showHomeButton={true}
          showSearchButton={false}
        />
      </body>
    </html>
  );
}
