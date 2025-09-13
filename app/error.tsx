"use client";
import { useEffect } from "react";
import NotFound from "@/components/reactbits/NotFound";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <NotFound
      title="Something went wrong!"
      description="An unexpected error occurred. Please try again or contact support if the problem persists."
      showBackButton={true}
      showHomeButton={true}
      showSearchButton={false}
    />
  );
}
