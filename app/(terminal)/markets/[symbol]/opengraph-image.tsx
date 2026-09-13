import { ImageResponse } from "next/og";
import { getMarkets } from "@/lib/lighter/markets";
import { ASSET_CLASS_LABEL } from "@/lib/lighter/types";
import { price, ratePct, usdCompact } from "@/lib/format";

/**
 * A market's share card — price, the day's move, open interest, volume and
 * funding — so a link to a market previews that market instead of the
 * generic card. Drawn from the same cached book as the page. Social apps keep
 * a preview for days, so the card says when it was drawn.
 */

export const alt = "Lighter perpetual market on LighterPulse";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 300;

const SURFACE = "#070908";
const LINE = "#191F1C";
const INK = "#E2E9E5";
const INK2 = "#9BA8A2";
const INK3 = "#727F79";
const BRAND = "#2ED694";
const UP = "#3FC98A";
const DOWN = "#E36B5C";

export default async function MarketImage({
  params,
}: {
  params: Promise<{ symbol: string }> | { symbol: string };
}) {
  const { symbol } = await params;
  const cached = await getMarkets().catch(() => null);
  const wanted = decodeURIComponent(symbol).toUpperCase();
  const m = cached?.data.find((x) => x.symbol.toUpperCase() === wanted) ?? null;

  const drawn = new Date(cached?.asOf ?? Date.now()).toISOString();
  const change = m?.change24h ?? null;
  const funding = m?.funding ?? null;
  const stats: { label: string; value: string; tone?: string }[] = [
    { label: "Open interest", value: m ? usdCompact(m.oiUsd, 2) : "—" },
    { label: "Volume 24h", value: m ? usdCompact(m.volume24h, 2) : "—" },
    {
      label: "Funding · 8h",
      value: funding != null ? ratePct(funding) : "—",
      tone: funding == null ? undefined : funding >= 0 ? UP : DOWN,
    },
    { label: "Max leverage", value: m ? `${m.maxLeverage}×` : "—" },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: SURFACE,
          padding: "60px 72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 26,
              height: 26,
              border: `3px solid ${BRAND}`,
              transform: "rotate(45deg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: 8, height: 8, background: BRAND }} />
          </div>
          <div style={{ color: INK, fontSize: 26, fontWeight: 700, letterSpacing: 4 }}>
            LIGHTERPULSE
          </div>
          <div style={{ flexGrow: 1 }} />
          <div style={{ color: INK3, fontSize: 22, letterSpacing: 2 }}>
            {`${m ? ASSET_CLASS_LABEL[m.assetClass].toUpperCase() : "MARKET"} · PERP ON LIGHTER`}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 52 }}>
          <div style={{ color: INK, fontSize: 118, fontWeight: 700, letterSpacing: -4, lineHeight: 1 }}>
            {m?.symbol ?? wanted}
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 26, marginTop: 20 }}>
            <div style={{ color: INK, fontSize: 64, fontWeight: 600, letterSpacing: -2, lineHeight: 1 }}>
              {m ? `$${price(m.markPrice)}` : "—"}
            </div>
            {change != null && (
              <div style={{ color: change >= 0 ? UP : DOWN, fontSize: 36, fontWeight: 600, lineHeight: 1.1 }}>
                {`${change >= 0 ? "+" : "−"}${Math.abs(change).toFixed(2)}% 24h`}
              </div>
            )}
          </div>
        </div>

        <div style={{ flexGrow: 1 }} />

        <div style={{ display: "flex", borderTop: `1px solid ${LINE}`, paddingTop: 28 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ display: "flex", flexDirection: "column", width: "25%" }}>
              <div style={{ color: INK3, fontSize: 20, letterSpacing: 2 }}>{s.label.toUpperCase()}</div>
              <div style={{ color: s.tone ?? INK, fontSize: 40, fontWeight: 600, marginTop: 10 }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 30,
            color: INK2,
            fontSize: 20,
          }}
        >
          <div>{`lighterpulse.xyz/markets/${m?.symbol ?? wanted}`}</div>
          <div>{`${drawn.slice(0, 10)} · ${drawn.slice(11, 16)} UTC`}</div>
        </div>
      </div>
    ),
    size,
  );
}
