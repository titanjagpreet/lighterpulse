// lib/redis.ts
import { Redis } from "@upstash/redis";

/**
 * Server-side only Redis client for Upstash.
 * Only import this file from server code (api routes, server components).
 */

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  // Don't throw during import in dev environments where you purposely run without env,
  // but log so debugging is easier. You can throw if you prefer.
  console.warn("Upstash env variables not set: UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN");
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL as string,
  token: process.env.UPSTASH_REDIS_REST_TOKEN as string,
});