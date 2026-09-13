"use client";

import { useEffect, useRef, useState } from "react";
import type { Position } from "@/lib/lighter/account";
import { price, usdSigned } from "@/lib/format";

const W = 1200;
const H = 630;

/** The house palette, as literal values — a canvas cannot read CSS tokens. */
const C = {
  surface: "#070908",
  line: "#191F1C",
  edge: "#232A27",
  ink: "#E2E9E5",
  ink2: "#9BA8A2",
  ink3: "#727F79",
  ink4: "#47534E",
  up: "#3FC98A",
  down: "#E36B5C",
  brand: "#2ED694",
};

/** The page's own font stacks, so the card matches the site. */
function stack(variable: string, fallback: string): string {
  const family = getComputedStyle(document.body).getPropertyValue(variable).trim();
  return family ? `${family}, ${fallback}` : fallback;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Return on the margin the leverage implies — how exchanges quote a position. */
export function returnOnMargin(p: Position): number | null {
  const margin = p.size * p.entryPrice * p.initialMarginFraction;
  return margin > 0 ? (p.unrealizedPnl / margin) * 100 : null;
}

function draw(
  canvas: HTMLCanvasElement,
  p: Position,
  opts: { showUsd: boolean; account: string; at: number },
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = W;
  canvas.height = H;
  const sans = stack("--font-archivo", "Helvetica Neue, Arial, sans-serif");
  const mono = stack("--font-plex-mono", "ui-monospace, Menlo, Consolas, monospace");
  const spaced = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  const good = p.unrealizedPnl >= 0;
  const sideColour = p.side === "long" ? C.up : C.down;
  const roe = returnOnMargin(p);
  const headline = roe ?? p.returnPct;
  const lev = p.leverage > 0 ? `${p.leverage.toFixed(p.leverage < 10 ? 1 : 0)}×` : null;

  ctx.fillStyle = C.surface;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);

  // The measure — the house motif — above the footer.
  ctx.fillStyle = C.edge;
  for (let x = 64; x <= W - 64; x += 8) ctx.fillRect(x, H - 96, 1, 8);

  // brand
  ctx.textBaseline = "middle";
  ctx.fillStyle = C.brand;
  ctx.beginPath();
  ctx.arc(70, 74, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.ink;
  ctx.font = `600 26px ${sans}`;
  ctx.fillText("LighterPulse", 88, 75);
  ctx.fillStyle = C.ink3;
  ctx.font = `400 20px ${mono}`;
  ctx.textAlign = "right";
  ctx.fillText("lighterpulse.xyz", W - 64, 75);
  ctx.textAlign = "left";

  // market, side, leverage
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = C.ink;
  ctx.font = `700 86px ${sans}`;
  ctx.fillText(p.symbol, 60, 214);
  let x = 60 + ctx.measureText(p.symbol).width + 28;
  ctx.font = `500 22px ${mono}`;
  const side = p.side.toUpperCase();
  const chipW = ctx.measureText(side).width + 30;
  ctx.strokeStyle = sideColour;
  ctx.lineWidth = 2;
  roundedRect(ctx, x, 164, chipW, 40, 5);
  ctx.stroke();
  ctx.fillStyle = sideColour;
  ctx.fillText(side, x + 15, 192);
  x += chipW + 18;
  if (lev) {
    ctx.fillStyle = C.ink2;
    ctx.font = `400 28px ${mono}`;
    ctx.fillText(lev, x, 194);
  }

  // headline return
  ctx.fillStyle = good ? C.up : C.down;
  ctx.font = `500 148px ${mono}`;
  ctx.fillText(`${headline >= 0 ? "+" : "−"}${Math.abs(headline).toFixed(2)}%`, 54, 382);
  ctx.fillStyle = C.ink3;
  ctx.font = `400 20px ${mono}`;
  ctx.fillText(
    roe != null && lev ? `unrealised return on margin at ${lev}` : "unrealised return on position value",
    62,
    424,
  );

  // figures
  const cells: [string, string][] = [
    ["ENTRY", price(p.entryPrice)],
    ["MARK", price(p.markPrice)],
  ];
  if (opts.showUsd) cells.push(["PNL", usdSigned(p.unrealizedPnl)]);
  let cx = 62;
  for (const [label, value] of cells) {
    spaced.letterSpacing = "3px";
    ctx.fillStyle = C.ink3;
    ctx.font = `500 15px ${sans}`;
    ctx.fillText(label, cx, 466);
    spaced.letterSpacing = "0px";
    ctx.fillStyle = label === "PNL" ? (good ? C.up : C.down) : C.ink;
    ctx.font = `500 36px ${mono}`;
    ctx.fillText(value, cx, 506);
    cx += 320;
  }

  // footer
  ctx.fillStyle = C.ink4;
  ctx.font = `400 18px ${mono}`;
  ctx.fillText(opts.account, 62, H - 46);
  ctx.textAlign = "right";
  ctx.fillText(
    `${new Date(opts.at).toISOString().slice(0, 16).replace("T", " ")} UTC · Lighter`,
    W - 64,
    H - 46,
  );
  ctx.textAlign = "left";
}

/** A small share button that opens the card for one position. */
export function ShareCardButton({ position, account }: { position: Position; account: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Share card for ${position.symbol} ${position.side}`}
        title="Share card"
        className="ctl -m-1.5 grid size-7 place-items-center rounded-[3px] text-ink-4 hover:bg-raised hover:text-ink pointer-coarse:size-9"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 10V2.5M5 5.2 8 2.2l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 8.5v4A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5v-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
      {open && <ShareDialog position={position} account={account} onClose={() => setOpen(false)} />}
    </>
  );
}

function ShareDialog({
  position,
  account,
  onClose,
}: {
  position: Position;
  account: string;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // The row keeps repricing; the card shows the moment it was opened.
  const [snapshot] = useState(() => ({ position, at: Date.now() }));
  const [showUsd, setShowUsd] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const paint = () => {
      if (alive && canvasRef.current) {
        draw(canvasRef.current, snapshot.position, { showUsd, account, at: snapshot.at });
      }
    };
    paint();
    // Repaint once web fonts are ready, or the first frame may use a fallback.
    document.fonts?.ready.then(paint).catch(() => {});
    return () => {
      alive = false;
    };
  }, [snapshot, showUsd, account]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const blob = () =>
    new Promise<Blob | null>((resolve) => {
      const c = canvasRef.current;
      if (!c) return resolve(null);
      c.toBlob(resolve, "image/png");
    });

  const download = async () => {
    const b = await blob();
    if (!b) return;
    const url = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${snapshot.position.symbol}-${snapshot.position.side}-lighterpulse.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("Image saved.");
  };

  const copy = async () => {
    try {
      const b = await blob();
      if (!b || typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
        throw new Error("unsupported");
      }
      await navigator.clipboard.write([new ClipboardItem({ "image/png": b })]);
      setStatus("Copied — paste it anywhere.");
    } catch {
      setStatus("This browser cannot copy images. Use Download instead.");
    }
  };

  const btn =
    "ctl figure rounded-[3px] border border-edge px-3 py-1.5 text-[11px] text-ink-2 hover:text-ink pointer-coarse:py-2.5";

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-surface/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-card-title"
        className="w-full max-w-[680px] rounded-[4px] border border-edge bg-panel p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-3">
          <h2 id="share-card-title" className="text-[13px] font-semibold tracking-[-0.005em]">
            Share position
          </h2>
          <span className="figure text-[10.5px] text-ink-3">
            {snapshot.position.symbol} · {snapshot.position.side}
          </span>
          <div className="grow" />
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="ctl -m-1 grid size-8 place-items-center text-ink-3 hover:text-ink">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="block h-auto w-full rounded-[3px] border border-line"
          role="img"
          aria-label={`Share card: ${snapshot.position.symbol} ${snapshot.position.side}`}
        />

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-[11.5px] text-ink-2">
            <input
              type="checkbox"
              checked={showUsd}
              onChange={(e) => setShowUsd(e.target.checked)}
              className="accent-[var(--color-brand)]"
            />
            Show PnL in dollars
          </label>
          <div className="grow" />
          <button type="button" onClick={copy} className={btn}>
            Copy image
          </button>
          <button type="button" onClick={download} className={btn}>
            Download PNG
          </button>
        </div>
        <p role="status" className="figure mt-2 min-h-[16px] text-[10.5px] text-ink-3">
          {status}
        </p>
      </div>
    </div>
  );
}
