import { cn } from "@/lib/utils";
import { usdCompact } from "@/lib/format";
import type { Market } from "@/lib/lighter/types";

/**
 * The exchange as an object: every market as an extruded column on an
 * isometric field. Height is open interest, colour is 24h direction.
 *
 * It is the data, not an ornament — which is the only reason a 3D object
 * belongs in a system whose first rule is that colour carries meaning.
 * Pure SVG, computed on the server, no WebGL and no client JS.
 */

const N = 9; // 9 × 9 field
const W = 30; // tile half-width
const D = 15; // tile half-depth (2:1 isometric)

/** Cells nearest the viewer, in draw order — the towers go here. */
const FRONT_CELLS: [number, number][] = [
  [5, 6],
  [6, 4],
  [3, 6],
  [7, 5],
  [4, 4],
  [6, 7],
  [2, 5],
  [5, 2],
  [7, 7],
];

const proj = (gx: number, gy: number) => ({
  x: (gx - gy) * W,
  y: (gx + gy) * D,
});

/** Deterministic PRNG so the field is stable between renders. */
function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

type Face = [string, string, string]; // top, left, right

function faces(tier: 0 | 1 | 2, up: boolean): Face {
  if (tier === 0) {
    return up
      ? ["#4FD89A", "#2A8F63", "#175538"]
      : ["#EC7B6B", "#A04C41", "#65302A"];
  }
  if (tier === 1) {
    return up
      ? ["#1E7A55", "#155840", "#0F3B2B"]
      : ["#8A4036", "#5E2C25", "#3F1E19"];
  }
  return ["#242C29", "#1A211E", "#121614"];
}

interface Cell {
  gx: number;
  gy: number;
  h: number;
  tier: 0 | 1 | 2;
  up: boolean;
  label?: string;
  oi?: number;
}

export function MarketField({
  markets,
  className,
  drift = true,
}: {
  markets: Market[];
  className?: string;
  drift?: boolean;
}) {
  const ranked = [...markets]
    .filter((m) => m.oiUsd > 0)
    .sort((a, b) => b.oiUsd - a.oiUsd);

  if (ranked.length === 0) return null;

  const peak = ranked[0].oiUsd;
  const MAX_H = 155;
  // Square-root compression: BTC still towers, but the tail stays visible
  // instead of collapsing into the base plate.
  const heightFor = (oi: number) =>
    Math.max(2.4, Math.sqrt(oi / peak) * MAX_H);

  const taken = new Set<string>();
  const cells: Cell[] = [];

  // Towers — the nine largest markets, placed toward the viewer.
  FRONT_CELLS.forEach(([gx, gy], i) => {
    const m = ranked[i];
    if (!m) return;
    taken.add(`${gx},${gy}`);
    cells.push({
      gx,
      gy,
      h: heightFor(m.oiUsd),
      tier: 0,
      up: m.change24h >= 0,
      label: i < 3 ? m.symbol : undefined,
      oi: i < 3 ? m.oiUsd : undefined,
    });
  });

  // The tail fills the rest of the field, with gaps so it reads as a
  // landscape rather than a bar chart.
  const rest = ranked.slice(FRONT_CELLS.length);
  const rand = rng(20260910);
  let cursor = 0;
  for (let gx = 0; gx < N; gx++) {
    for (let gy = 0; gy < N; gy++) {
      if (taken.has(`${gx},${gy}`)) continue;
      if (rand() < 0.17) continue; // plaza
      const m = rest[cursor++ % Math.max(1, rest.length)];
      if (!m) continue;
      cells.push({
        gx,
        gy,
        h: heightFor(m.oiUsd),
        tier: m.oiUsd > peak * 0.02 ? 1 : 2,
        up: m.change24h >= 0,
      });
    }
  }

  // Painter's algorithm: far cells first.
  cells.sort((a, b) => a.gx + a.gy - (b.gx + b.gy));

  const grid: React.ReactElement[] = [];
  for (let i = 0; i <= N; i++) {
    const a = proj(i, 0);
    const b = proj(i, N);
    const c = proj(0, i);
    const d = proj(N, i);
    grid.push(
      <line
        key={`gx${i}`}
        x1={a.x}
        y1={a.y + D}
        x2={b.x}
        y2={b.y + D}
        stroke="#141A18"
        strokeWidth="0.7"
      />,
      <line
        key={`gy${i}`}
        x1={c.x}
        y1={c.y + D}
        x2={d.x}
        y2={d.y + D}
        stroke="#141A18"
        strokeWidth="0.7"
      />,
    );
  }

  return (
    <svg
      viewBox="-300 -195 600 495"
      width="100%"
      className={cn("block overflow-visible", drift && "drift", className)}
      role="img"
      aria-label={`Open interest across ${markets.length} Lighter markets, drawn as an isometric field. Tallest: ${ranked
        .slice(0, 3)
        .map((m) => `${m.symbol} ${usdCompact(m.oiUsd)}`)
        .join(", ")}.`}
    >
      <g opacity="0.85">{grid}</g>

      {cells.map((c, i) => {
        const { x, y } = proj(c.gx, c.gy);
        const h = c.h;
        const [tF, lF, rF] = faces(c.tier, c.up);
        const Nt = `${x},${y - h}`;
        const Et = `${x + W},${y + D - h}`;
        const St = `${x},${y + 2 * D - h}`;
        const Wt = `${x - W},${y + D - h}`;
        const Sb = `${x},${y + 2 * D}`;
        const Wb = `${x - W},${y + D}`;
        const Eb = `${x + W},${y + D}`;
        return (
          <g key={i}>
            <polygon points={`${Wt} ${St} ${Sb} ${Wb}`} fill={lF} />
            <polygon points={`${St} ${Et} ${Eb} ${Sb}`} fill={rF} />
            <polygon
              points={`${Nt} ${Et} ${St} ${Wt}`}
              fill={tF}
              stroke={c.tier === 0 ? tF : undefined}
              strokeOpacity={c.tier === 0 ? 0.55 : undefined}
              strokeWidth={c.tier === 0 ? 0.6 : undefined}
            />
          </g>
        );
      })}

      {/* leader lines on the three largest — the object stays legible as data */}
      {cells
        .filter((c) => c.label)
        .map((c) => {
          const { x, y } = proj(c.gx, c.gy);
          const top = y + D - c.h;
          const ly = top - 12;
          return (
            <g key={`l-${c.label}`}>
              <line x1={x} y1={top - 3} x2={x} y2={ly} stroke="#47534E" strokeWidth="0.8" />
              <circle cx={x} cy={top - 3} r="1.5" fill="#9BA8A2" />
              <text
                x={x}
                y={ly - 10}
                textAnchor="middle"
                fill="#E2E9E5"
                fontFamily="var(--font-mono)"
                fontSize="11"
                fontWeight="500"
                letterSpacing="0.04em"
              >
                {c.label}
              </text>
              <text
                x={x}
                y={ly - 1}
                textAnchor="middle"
                fill="#66736D"
                fontFamily="var(--font-mono)"
                fontSize="8.5"
              >
                {usdCompact(c.oi ?? 0, 1)}
              </text>
            </g>
          );
        })}
    </svg>
  );
}

/** Caption + legend. Keeps the object readable as data, not decoration. */
export function MarketFieldLegend({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-4 pl-1", className)}>
      <span className="label">Open interest · {count} markets</span>
      <div className="h-px grow bg-line" />
      <span className="flex items-center gap-1.5">
        <span className="size-[7px] bg-[#4FD89A]" aria-hidden="true" />
        <span className="figure text-[10px] text-ink-3">up 24h</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-[7px] bg-[#EC7B6B]" aria-hidden="true" />
        <span className="figure text-[10px] text-ink-3">down</span>
      </span>
    </div>
  );
}
