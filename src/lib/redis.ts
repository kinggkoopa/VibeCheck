import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

/**
 * Upstash Redis client — used for rate limiting and ephemeral caching.
 * Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars.
 */
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
});

/**
 * Global API rate limiter: 30 requests per 60-second sliding window.
 * Apply per-user via their Supabase user ID.
 */
export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "60 s"),
  analytics: true,
  prefix: "mvc:api",
});

/**
 * Stricter rate limiter for LLM calls: 10 per 60s.
 * Protects users from accidental runaway loops.
 */
export const llmRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  analytics: true,
  prefix: "mvc:llm",
});
