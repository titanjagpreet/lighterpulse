/**
 * History collector.
 *
 * Lighter reports open interest per market only as a live value — there is no
 * history endpoint, and candles carry no open interest — so the history exists
 * only if we record it. The same is true of LIT staked, LIT burned and every
 * pool's TVL. Every run missed is a gap for good.
 *
 * `runSnapshot` is meant to run every 15 minutes, and two things call it:
 *   · /api/collector on the website, hit by an external scheduler. This is the
 *     primary trigger: GitHub's scheduled workflows are best-effort, and this
 *     one ran only every 2–7 hours, which left the history in pieces.
 *   · `npm run snapshot` (run.mjs) — the GitHub workflow's hourly backstop, or
 *     a run by hand.
 * A second run in the same 15 minutes adds nothing, so overlapping triggers
 * are harmless.
 *
 * Each run:
 *   1. stores open interest in Postgres — 15-minute rows kept 30 days, and one
 *      row per hour kept permanently;
 *   2. once an hour, stores LIT staked, LIT burned, LIT awaiting burn and the
 *      TVL of the LLP and every vault over $10K;
 *   3. publishes everything the website reads to Redis.
 *
 * Pages never query Postgres. Neon's free tier suspends compute for the rest of
 * the month once its CU-hours are spent; if page traffic could wake the
 * database, a busy week could silently stop the recording itself.
 */
import { neon } from "@neondatabase/serverless";

const API = process.env.LIGHTER_API_BASE ?? "https://mainnet.zklighter.elliot.ai";
const ETH_RPC = process.env.ETH_RPC_URL ?? "https://ethereum-rpc.publicnode.com";

const MIN = 60_000;
const Q = 15 * MIN;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
/** The site reports open interest counting both sides of every contract. */
const OI_SIDES = 2;
const KEEP_15M_DAYS = 30;
const PREFIX = "lp:oi:v1";
const POOLS_KEY = "lp:pools:v1:history";
/** Per-market series are republished hourly; the page appends the live value. */
const SERIES_EVERY = 55 * MIN;
/** Pool balances move slowly; once an hour is plenty. */
const POOLS_EVERY = 55 * MIN;

const LLP_INDEX = 281474976710654;
const STAKING_POOL_INDEX = 281474976624800;
const BUYBACK_ACCOUNT_INDEX = 0;
const LIT_TOKEN = "0x232ce3bd40fcd6f80f3d55a522d03f25df784ee2";
const DEAD_HOLDER = "000000000000000000000000000000000000000000000000000000000000dead";
/** Vaults below this are not worth a row an hour. */
const POOL_TVL_FLOOR = 10_000;

const floorTo = (ms, step) => Math.floor(ms / step) * step;
const iso = (ms) => new Date(ms).toISOString();
const pct = (now, then) => (then > 0 && Number.isFinite(now) ? ((now - then) / then) * 100 : null);

/**
 * One collector run. Resolves with a one-line summary; throws when open
 * interest could not be recorded. Redis is optional — without it the run
 * records to Postgres and publishes nothing.
 */
export async function runSnapshot({ databaseUrl, redisUrl, redisToken }) {
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  return collect({
    sql: neon(databaseUrl),
    redis: redisUrl && redisToken ? redisPipeline(redisUrl, redisToken) : null,
  });
}

/* ── Lighter ─────────────────────────────────────────────────── */

async function getJson(url) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 1500 * attempt));
    try {
      const res = await fetch(url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (typeof json.code === "number" && json.code !== 200 && json.code !== 0) {
        throw new Error(json.message ?? `api code ${json.code}`);
      }
      return json;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

async function fetchBooks() {
  const json = await getJson(`${API}/api/v1/orderBookDetails`);
  if (!Array.isArray(json.order_book_details)) throw new Error("unexpected response shape");
  return json.order_book_details;
}

async function fetchAccount(index) {
  const json = await getJson(`${API}/api/v1/account?by=index&value=${index}`);
  return Array.isArray(json.accounts) ? json.accounts[0] ?? null : null;
}

/** Every public pool. Pages start one below the index given, so page downward. */
async function fetchPublicPools() {
  const out = [];
  let cursor = LLP_INDEX + 1;
  for (let page = 0; page < 20; page++) {
    const json = await getJson(`${API}/api/v1/publicPoolsMetadata?index=${cursor}&limit=100&filter=all`);
    const rows = Array.isArray(json.public_pools) ? json.public_pools : [];
    out.push(...rows);
    if (rows.length < 100) break;
    cursor = Number(rows[rows.length - 1].account_index);
  }
  return out;
}

/** LIT held by the dead address on Ethereum, in whole tokens. */
async function fetchBurned() {
  const res = await fetch(ETH_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to: LIT_TOKEN, data: `0x70a08231${DEAD_HOLDER}` }, "latest"],
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const json = await res.json();
  if (typeof json.result !== "string" || !/^0x[0-9a-f]+$/i.test(json.result)) {
    throw new Error(json.error?.message ?? "bad eth_call result");
  }
  return Number(BigInt(json.result) / 10n ** 12n) / 1e6;
}

/* ── Redis (Upstash REST) ────────────────────────────────────── */

/** Sends a batch of commands in one request; resolves with their results in order. */
function redisPipeline(url, token) {
  return async (commands) => {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`redis HTTP ${res.status}`);
    const out = await res.json();
    const failed = out.find((r) => r.error);
    if (failed) throw new Error(`redis: ${failed.error}`);
    return out.map((r) => r.result);
  };
}

/* ── schema — idempotent, cheap, and lets a fresh database just work ── */

async function ensureSchema(sql) {
  await sql`create table if not exists markets (
    market_id  smallint    primary key,
    symbol     text        not null,
    first_seen timestamptz not null default now(),
    last_seen  timestamptz not null default now()
  )`;
  await sql`create table if not exists oi_15m (
    bucket     timestamptz not null,
    market_id  smallint    not null,
    oi_base    real        not null,
    mark_price real        not null,
    primary key (market_id, bucket)
  )`;
  await sql`create index if not exists oi_15m_bucket_idx on oi_15m (bucket)`;
  await sql`create table if not exists oi_1h (
    bucket     timestamptz not null,
    market_id  smallint    not null,
    oi_base    real        not null,
    mark_price real        not null,
    primary key (market_id, bucket)
  )`;
  await sql`create table if not exists collector_runs (
    id          bigserial   primary key,
    started_at  timestamptz not null,
    bucket      timestamptz not null,
    markets     integer     not null,
    duration_ms integer     not null
  )`;
  // Share counts reach 10^13, beyond what `real` holds exactly.
  await sql`create table if not exists lit_1h (
    bucket        timestamptz      primary key,
    staked        double precision,
    staked_shares double precision,
    burned        double precision,
    held          double precision
  )`;
  await sql`create table if not exists pool_1h (
    bucket       timestamptz      not null,
    pool_index   bigint           not null,
    tvl          double precision not null,
    total_shares double precision not null,
    primary key (pool_index, bucket)
  )`;
}

/* ── run ─────────────────────────────────────────────────────── */

async function collect(db) {
  const { sql, redis } = db;
  const started = Date.now();
  const bucket = floorTo(started, Q);
  const hour = floorTo(started, HOUR);

  const books = await fetchBooks();
  const rows = books
    .filter((b) => b.status === "active")
    .map((b) => ({
      id: Number(b.market_id),
      symbol: String(b.symbol),
      oi: Number(b.open_interest),
      mark: Number(b.mark_price),
    }))
    .filter((r) => Number.isInteger(r.id) && Number.isFinite(r.oi) && r.oi >= 0 && Number.isFinite(r.mark) && r.mark > 0);
  if (rows.length === 0) throw new Error("no active markets in response");

  const ids = rows.map((r) => r.id);
  const symbols = rows.map((r) => r.symbol);
  const ois = rows.map((r) => r.oi);
  const marks = rows.map((r) => r.mark);

  await ensureSchema(sql);
  await sql.transaction([
    sql`insert into markets (market_id, symbol)
        select * from unnest(${ids}::smallint[], ${symbols}::text[])
        on conflict (market_id) do update set symbol = excluded.symbol, last_seen = now()`,
    // A second trigger inside the same 15 minutes is ignored rather than duplicated.
    sql`insert into oi_15m (bucket, market_id, oi_base, mark_price)
        select ${iso(bucket)}::timestamptz, * from unnest(${ids}::smallint[], ${ois}::real[], ${marks}::real[])
        on conflict do nothing`,
    // The hourly row keeps the latest observation in its hour.
    sql`insert into oi_1h (bucket, market_id, oi_base, mark_price)
        select ${iso(hour)}::timestamptz, * from unnest(${ids}::smallint[], ${ois}::real[], ${marks}::real[])
        on conflict (market_id, bucket) do update set oi_base = excluded.oi_base, mark_price = excluded.mark_price`,
    sql`delete from oi_15m where bucket < now() - make_interval(days => ${KEEP_15M_DAYS}::int)`,
  ]);

  const [{ since }] = await sql`select min(bucket) as since from oi_1h`;
  const sinceIso = since ? new Date(since).toISOString() : null;

  if (!redis) {
    const pools = await recordPoolsSafely(db, hour, null);
    return finish(sql, started, bucket, rows.length,
      `✓ recorded ${rows.length} markets at ${iso(bucket)}${pools.note} (Redis not configured — nothing published)`);
  }

  /* changes over 1h / 4h / 24h / 7d — the latest snapshot within a slack
     window before each target, so a late or dropped run leaves a null, not a
     wrong number */
  const past = await sql`
    select w.key, s.market_id, s.oi_base, s.mark_price
    from (values
      ('d1h',  ${iso(bucket - HOUR)}::timestamptz,     interval '45 minutes'),
      ('d4h',  ${iso(bucket - 4 * HOUR)}::timestamptz, interval '1 hour'),
      ('d24h', ${iso(bucket - DAY)}::timestamptz,      interval '2 hours'),
      ('d7d',  ${iso(bucket - 7 * DAY)}::timestamptz,  interval '6 hours')
    ) as w(key, target, slack)
    cross join lateral (
      select distinct on (market_id) market_id, oi_base, mark_price
      from oi_15m
      where bucket <= w.target and bucket > w.target - w.slack
      order by market_id, bucket desc
    ) s`;

  const then = new Map();
  for (const p of past) then.set(`${p.key}:${p.market_id}`, p);

  const markets = {};
  for (const r of rows) {
    const oiUsd = r.oi * r.mark * OI_SIDES;
    const at = (key) => {
      const p = then.get(`${key}:${r.id}`);
      return p ? pct(oiUsd, p.oi_base * p.mark_price * OI_SIDES) : null;
    };
    const day = then.get(`d24h:${r.id}`);
    const d24h = at("d24h");
    const p24h = day ? pct(r.mark, day.mark_price) : null;
    markets[r.id] = {
      oi: Math.round(oiUsd),
      d1h: round2(at("d1h")),
      d4h: round2(at("d4h")),
      d24h: round2(d24h),
      d7d: round2(at("d7d")),
      p24h: round2(p24h),
      regime: regimeOf(p24h, d24h),
    };
  }

  const nowIso = new Date().toISOString();
  const [metaRaw] = await redis([["GET", `${PREFIX}:meta`]]);
  const meta = safeJson(metaRaw) ?? {};
  const publishSeries = !meta.seriesAt || Date.now() - Date.parse(meta.seriesAt) > SERIES_EVERY;
  const poolsDue = !meta.poolsAt || Date.now() - Date.parse(meta.poolsAt) > POOLS_EVERY;

  let seriesCount = 0;
  if (publishSeries) seriesCount = await publishAllSeries(db, bucket, hour, sinceIso, nowIso);

  const pools = poolsDue ? await recordPoolsSafely(db, hour, nowIso) : { ok: false, note: "" };

  await redis([
    ["SET", `${PREFIX}:latest`, JSON.stringify({ at: iso(bucket), since: sinceIso, markets })],
    [
      "SET",
      `${PREFIX}:meta`,
      JSON.stringify({
        lastRunAt: nowIso,
        bucket: iso(bucket),
        since: sinceIso,
        markets: rows.length,
        seriesAt: publishSeries ? nowIso : meta.seriesAt ?? null,
        poolsAt: pools.ok ? nowIso : meta.poolsAt ?? null,
      }),
    ],
  ]);

  return finish(sql, started, bucket, rows.length,
    `✓ recorded ${rows.length} markets at ${iso(bucket)} · published latest${publishSeries ? ` + ${seriesCount} series` : ""}${pools.note} · since ${sinceIso ?? "now"}`);
}

/** Aligned arrays per market: 24h at 15 minutes, 30 days hourly, all days daily. */
async function publishAllSeries({ sql, redis }, bucket, hour, sinceIso, nowIso) {
  const m15Start = bucket - 95 * Q;
  const h1Start = hour - 719 * HOUR;

  const m15 = await sql`
    select m.market_id, array_agg(round(s.oi_base * s.mark_price * ${OI_SIDES})::bigint order by g.t) as v
    from markets m
    cross join generate_series(${iso(m15Start)}::timestamptz, ${iso(bucket)}::timestamptz, interval '15 minutes') g(t)
    left join oi_15m s on s.market_id = m.market_id and s.bucket = g.t
    where m.last_seen > now() - interval '1 day'
    group by m.market_id`;

  const h1 = await sql`
    select m.market_id, array_agg(round(s.oi_base * s.mark_price * ${OI_SIDES})::bigint order by g.t) as v
    from markets m
    cross join generate_series(${iso(h1Start)}::timestamptz, ${iso(hour)}::timestamptz, interval '1 hour') g(t)
    left join oi_1h s on s.market_id = m.market_id and s.bucket = g.t
    where m.last_seen > now() - interval '1 day'
    group by m.market_id`;

  const d1 = await sql`
    with first as (select date_trunc('day', min(bucket), 'UTC') as d from oi_1h),
    days as (
      select generate_series((select d from first), date_trunc('day', now(), 'UTC'), interval '1 day') as day
    ),
    last_per_day as (
      select distinct on (market_id, date_trunc('day', bucket, 'UTC'))
        market_id, date_trunc('day', bucket, 'UTC') as day, oi_base * mark_price * ${OI_SIDES} as oi
      from oi_1h
      order by market_id, date_trunc('day', bucket, 'UTC'), bucket desc
    )
    select m.market_id, (select d from first) as first_day,
           array_agg(round(l.oi)::bigint order by days.day) as v
    from markets m
    cross join days
    left join last_per_day l on l.market_id = m.market_id and l.day = days.day
    where m.last_seen > now() - interval '1 day'
    group by m.market_id`;

  const byId = new Map();
  const part = (start, step, values) => trimLeading({ start, step, v: values.map((x) => (x == null ? null : Number(x))) });
  for (const r of m15) byId.set(r.market_id, { m15: part(m15Start, Q, r.v) });
  for (const r of h1) (byId.get(r.market_id) ?? byId.set(r.market_id, {}).get(r.market_id)).h1 = part(h1Start, HOUR, r.v);
  for (const r of d1) {
    const entry = byId.get(r.market_id) ?? byId.set(r.market_id, {}).get(r.market_id);
    entry.d1 = part(new Date(r.first_day).getTime(), DAY, r.v);
  }

  const commands = [];
  for (const [id, s] of byId) {
    const payload = { at: nowIso, since: sinceIso, m15: s.m15 ?? empty(Q), h1: s.h1 ?? empty(HOUR), d1: s.d1 ?? empty(DAY) };
    // Three days of expiry: a delisted market's key clears itself.
    commands.push(["SET", `${PREFIX}:series:${id}`, JSON.stringify(payload), "EX", String(3 * 24 * 3600)]);
  }
  for (let i = 0; i < commands.length; i += 40) await redis(commands.slice(i, i + 40));
  return commands.length;
}

/* ── pools and LIT supply ────────────────────────────────────── */

/** A failure here is logged and skipped — it must never cost an open-interest run. */
async function recordPoolsSafely(db, hour, publishAt) {
  try {
    const note = await recordPools(db, hour, publishAt);
    return { ok: true, note };
  } catch (err) {
    console.error("⚠ pool recording failed:", err instanceof Error ? err.message : err);
    return { ok: false, note: " · pools failed" };
  }
}

async function recordPools({ sql, redis }, hour, publishAt) {
  const [staking, buyback, burned] = await Promise.all([
    fetchAccount(STAKING_POOL_INDEX),
    fetchAccount(BUYBACK_ACCOUNT_INDEX),
    fetchBurned().catch((err) => {
      console.error("⚠ burned balance unavailable:", err instanceof Error ? err.message : err);
      return null;
    }),
  ]);
  // The public pool list includes the LLP.
  const poolRows = await fetchPublicPools();

  const litOf = (account) => Number(account?.assets?.find((a) => a.symbol === "LIT")?.balance);
  const finite = (v) => (Number.isFinite(v) ? v : null);
  const staked = finite(litOf(staking));
  const stakedShares = finite(Number(staking?.pool_info?.total_shares));
  const held = finite(litOf(buyback));

  // A pool's value as Lighter's own client computes it: the perps account
  // plus spot holdings. The LLP alone holds millions in spot.
  const tvl = new Map();
  for (const p of poolRows) {
    const index = Number(p.account_index);
    const value = (Number(p.total_asset_value) || 0) + (Number(p.total_spot_value) || 0);
    if (!(value >= POOL_TVL_FLOOR)) continue;
    tvl.set(index, { tvl: value, shares: Number(p.total_shares) || 0 });
  }
  const poolIds = [...tvl.keys()];

  await sql.transaction([
    // A reading that failed this hour keeps whatever the hour already holds.
    sql`insert into lit_1h (bucket, staked, staked_shares, burned, held)
        values (${iso(hour)}, ${staked}, ${stakedShares}, ${burned}, ${held})
        on conflict (bucket) do update set
          staked        = coalesce(excluded.staked, lit_1h.staked),
          staked_shares = coalesce(excluded.staked_shares, lit_1h.staked_shares),
          burned        = coalesce(excluded.burned, lit_1h.burned),
          held          = coalesce(excluded.held, lit_1h.held)`,
    ...(poolIds.length
      ? [
          sql`insert into pool_1h (bucket, pool_index, tvl, total_shares)
              select ${iso(hour)}::timestamptz, * from unnest(
                ${poolIds}::bigint[],
                ${poolIds.map((i) => tvl.get(i).tvl)}::float8[],
                ${poolIds.map((i) => tvl.get(i).shares)}::float8[])
              on conflict (pool_index, bucket) do update set tvl = excluded.tvl, total_shares = excluded.total_shares`,
        ]
      : []),
  ]);

  if (!publishAt) return ` · pools ${poolIds.length}`;

  const [lit] = await sql`
    with first as (select date_trunc('day', min(bucket), 'UTC') as d from lit_1h),
    days as (
      select generate_series((select d from first), date_trunc('day', now(), 'UTC'), interval '1 day') as day
    ),
    last_per_day as (
      select distinct on (date_trunc('day', bucket, 'UTC'))
        date_trunc('day', bucket, 'UTC') as day, staked, staked_shares, burned, held
      from lit_1h
      order by date_trunc('day', bucket, 'UTC'), bucket desc
    )
    select (select d from first) as first_day,
           (select min(bucket) from lit_1h) as since,
           array_agg(l.staked order by days.day) as staked,
           array_agg(case when l.staked_shares > 0 then l.staked / l.staked_shares end order by days.day) as lps,
           array_agg(l.burned order by days.day) as burned,
           array_agg(l.held order by days.day) as held
    from days
    left join last_per_day l on l.day = days.day`;

  const pools = await sql`
    with first as (select date_trunc('day', min(bucket), 'UTC') as d from pool_1h),
    days as (
      select generate_series((select d from first), date_trunc('day', now(), 'UTC'), interval '1 day') as day
    ),
    recent as (select distinct pool_index from pool_1h where bucket > now() - interval '2 days'),
    last_per_day as (
      select distinct on (pool_index, date_trunc('day', bucket, 'UTC'))
        pool_index, date_trunc('day', bucket, 'UTC') as day, tvl
      from pool_1h
      order by pool_index, date_trunc('day', bucket, 'UTC'), bucket desc
    )
    select r.pool_index, (select d from first) as first_day,
           array_agg(round(l.tvl) order by days.day) as v
    from recent r
    cross join days
    left join last_per_day l on l.pool_index = r.pool_index and l.day = days.day
    group by r.pool_index`;

  const daily = (firstDay, values, digits) =>
    firstDay
      ? trimLeading({
          start: new Date(firstDay).getTime(),
          step: DAY,
          v: (values ?? []).map((x) => (x == null ? null : roundTo(Number(x), digits))),
        })
      : empty(DAY);

  const tvlParts = {};
  for (const r of pools) tvlParts[String(r.pool_index)] = daily(r.first_day, r.v, 0);

  const payload = {
    at: publishAt,
    since: lit?.since ? new Date(lit.since).toISOString() : null,
    staked: daily(lit?.first_day, lit?.staked, 2),
    litPerShare: daily(lit?.first_day, lit?.lps, 12),
    burned: daily(lit?.first_day, lit?.burned, 2),
    held: daily(lit?.first_day, lit?.held, 2),
    tvl: tvlParts,
  };
  await redis([["SET", POOLS_KEY, JSON.stringify(payload)]]);
  return ` · pools ${poolIds.length} + LIT supply published`;
}

/* ── helpers ─────────────────────────────────────────────────── */

/**
 * Price and open interest over the same 24h, read together:
 * up/up new longs · up/down short covering · down/up new shorts · down/down long unwinding.
 * Small moves carry no label — noise should not read as a signal.
 */
function regimeOf(priceChange, oiChange) {
  if (priceChange == null || oiChange == null) return null;
  if (Math.abs(oiChange) < 1 || Math.abs(priceChange) < 0.25) return null;
  if (priceChange > 0) return oiChange > 0 ? "new-longs" : "short-covering";
  return oiChange > 0 ? "new-shorts" : "long-unwinding";
}

function round2(v) {
  return v == null || !Number.isFinite(v) ? null : Math.round(v * 100) / 100;
}

/** Round to `digits` decimals; very small values keep significant figures instead. */
function roundTo(v, digits) {
  if (!Number.isFinite(v)) return null;
  if (digits > 6) return Number(v.toPrecision(8));
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

function trimLeading(p) {
  const first = p.v.findIndex((x) => x != null);
  if (first <= 0) return first < 0 ? { ...p, v: [] } : p;
  return { start: p.start + first * p.step, step: p.step, v: p.v.slice(first) };
}

const empty = (step) => ({ start: 0, step, v: [] });

function safeJson(raw) {
  if (raw == null) return null;
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

async function finish(sql, started, bucket, count, message) {
  await sql`insert into collector_runs (started_at, bucket, markets, duration_ms)
            values (${iso(started)}, ${iso(bucket)}, ${count}, ${Date.now() - started})`;
  return { message, markets: count, bucket: iso(bucket), durationMs: Date.now() - started };
}
