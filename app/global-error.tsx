"use client";

import { useEffect } from "react";

/**
 * Replaces the root layout, so it cannot use the design tokens defined in
 * globals.css — the styles here are deliberately self-contained.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[lighterpulse] fatal error", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#070908",
          color: "#E2E9E5",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          textAlign: "center",
          padding: "0 24px",
        }}
      >
        <svg width="26" height="26" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M9 1 L16 9 L9 17 L2 9 Z" stroke="#2ED694" strokeWidth="1.5" />
          <path d="M9 5.4 L12.6 9 L9 12.6 L5.4 9 Z" fill="#2ED694" />
        </svg>
        <h1 style={{ margin: "28px 0 0", fontSize: 22, letterSpacing: "-0.02em" }}>
          LighterPulse hit a fatal error
        </h1>
        <p style={{ margin: "12px 0 0", maxWidth: "46ch", fontSize: 13, color: "#66736D", lineHeight: 1.6 }}>
          The application failed to start. Reloading usually clears it.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: 32,
            padding: "9px 18px",
            fontSize: 12,
            fontFamily: "ui-monospace, monospace",
            color: "#070908",
            background: "#E2E9E5",
            border: 0,
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
