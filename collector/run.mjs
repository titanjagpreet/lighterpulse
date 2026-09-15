/**
 * `npm run snapshot`: one collector run from the command line — the GitHub
 * workflow's hourly backstop, or a run by hand with .env.local.
 */
import { runSnapshot } from "./snapshot.mjs";

try {
  const result = await runSnapshot({
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.UPSTASH_REDIS_REST_URL,
    redisToken: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  console.log(result.message);
} catch (err) {
  console.error("✗ collector failed:", err instanceof Error ? err.message : err);
  process.exit(1);
}
