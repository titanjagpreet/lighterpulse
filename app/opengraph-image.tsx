import { ImageResponse } from "next/og";

/**
 * The share card. The previous metadata pointed at a 500×500 logo while
 * declaring it 1200×630, so every large-card preview was cropped or rejected.
 * Built from the product's own tokens rather than a screenshot, so it never
 * shows stale numbers.
 */

export const alt = "LighterPulse — the Lighter terminal";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SURFACE = "#070908";
const PANEL = "#0B0E0D";
const LINE = "#191F1C";
const EDGE = "#232A27";
const INK = "#E2E9E5";
const INK2 = "#9BA8A2";
const INK3 = "#727F79";
const BRAND = "#2ED694";
const UP = "#3FC98A";
const DOWN = "#E36B5C";

export default function OpenGraphImage() {
  // A quiet skyline of bars — the market field, flattened for a card.
  const bars = [38, 64, 52, 88, 71, 120, 96, 142, 110, 168, 131, 150, 186, 158, 204, 176];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: SURFACE,
          padding: "64px 72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 30,
              height: 30,
              border: `3px solid ${BRAND}`,
              transform: "rotate(45deg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: 10, height: 10, background: BRAND }} />
          </div>
          <div style={{ color: INK, fontSize: 30, fontWeight: 700, letterSpacing: 4 }}>
            LIGHTERPULSE
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 70 }}>
          <div style={{ color: INK, fontSize: 76, fontWeight: 700, letterSpacing: -3, lineHeight: 1 }}>
            Read the whole exchange.
          </div>
          <div style={{ color: INK2, fontSize: 30, marginTop: 26, maxWidth: 820, lineHeight: 1.35 }}>
            Markets, funding across venues, liquidations, buybacks and a block explorer for Lighter.
          </div>
        </div>

        <div style={{ flexGrow: 1 }} />

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            borderTop: `1px solid ${LINE}`,
            paddingTop: 26,
          }}
        >
          <div style={{ display: "flex", gap: 38 }}>
            {["Markets", "Funding", "Liquidations", "LIT", "Explorer"].map((l) => (
              <div key={l} style={{ color: INK3, fontSize: 22, letterSpacing: 2 }}>
                {l.toUpperCase()}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 7, height: 210 }}>
            {bars.map((h, i) => (
              <div
                key={i}
                style={{
                  width: 14,
                  height: h,
                  background: i === bars.length - 1 ? BRAND : i % 5 === 3 ? DOWN : i % 3 === 0 ? EDGE : UP,
                  opacity: i === bars.length - 1 ? 1 : 0.55,
                  border: `1px solid ${PANEL}`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
