import "server-only";

/**
 * Low-level fetch against the Lighter hosts.
 *
 * Two hosts, two very different budgets:
 *   mainnet.zklighter.elliot.ai  — 60 req/min on the standard tier
 *   explorer.elliot.ai           — 90 WEIGHTED req/min for everyone, no escape
 *
 * Nothing here caches. Callers go through lib/cache.ts, which is what keeps us
 * inside those budgets no matter how much traffic the site takes.
 */

export const API_BASE =
  process.env.LIGHTER_API_BASE ?? "https://mainnet.zklighter.elliot.ai";
export const EXPLORER_BASE =
  process.env.EXPLORER_API_BASE ?? "https://explorer.elliot.ai";

const TIMEOUT_MS = 12_000;
const RETRIES = 2;

export class LighterError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly endpoint: string,
  ) {
    super(message);
    this.name = "LighterError";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function request<T>(url: string, endpoint: string): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    if (attempt > 0) await sleep(220 * 2 ** (attempt - 1));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const headers: Record<string, string> = { accept: "application/json" };
      // Builder-tier accounts authenticate every request; without the token we
      // fall back to anonymous, which the standard tier allows.
      const token = process.env.LIGHTER_AUTH_TOKEN;
      if (token && url.startsWith(API_BASE)) headers.authorization = token;

      const res = await fetch(url, {
        headers,
        signal: controller.signal,
        // We manage freshness in Redis; Next's own fetch cache would only add
        // a second, less predictable layer.
        cache: "no-store",
      });

      if (res.status === 429) {
        // Rate limited. Back off hard and retry; the cooldown is short.
        lastError = new LighterError("rate limited", 429, endpoint);
        console.warn(`[lighter] 429 on ${endpoint} (attempt ${attempt + 1})`);
        await sleep(1_000 * (attempt + 1));
        continue;
      }

      if (!res.ok) {
        // 4xx other than 429 will not improve on retry.
        const err = new LighterError(
          `HTTP ${res.status}`,
          res.status,
          endpoint,
        );
        if (res.status < 500) throw err;
        lastError = err;
        continue;
      }

      const json = (await res.json()) as T & { code?: number; message?: string };

      // The v1 API returns 200 with an error code in the body.
      if (
        json &&
        typeof json === "object" &&
        "code" in json &&
        typeof json.code === "number" &&
        json.code !== 200 &&
        json.code !== 0
      ) {
        throw new LighterError(
          json.message ?? `api code ${json.code}`,
          json.code,
          endpoint,
        );
      }

      return json;
    } catch (err) {
      if (err instanceof LighterError && err.status < 500 && err.status !== 429) {
        throw err;
      }
      lastError = err;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new LighterError("request failed", 0, endpoint);
}

function qs(params?: Record<string, string | number | undefined>): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** Call the main v1 API. */
export function api<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  return request<T>(`${API_BASE}/api/v1/${path}${qs(params)}`, path);
}

/**
 * Call the explorer host. Server-only and rate-limited by callers —
 * 90 weighted req/min is shared by every visitor to this site.
 */
export function explorerApi<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  return request<T>(
    `${EXPLORER_BASE}/api/${path}${qs(params)}`,
    `explorer/${path}`,
  );
}

/** Third-party GET with the same retry/timeout discipline. */
export function external<T>(url: string, label: string): Promise<T> {
  return request<T>(url, label);
}
