import "server-only";

/**
 * Simple in-memory LRU cache for expensive computations on Hobby tier.
 * Avoids redundant LLM calls for identical inputs within a TTL window.
 *
 * NOT shared across serverless invocations — just helps within a single
 * instance lifecycle (Vercel keeps warm instances alive ~5 min).
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();
const MAX_ENTRIES = 100;

/** Cache a value with a TTL in seconds (default: 5 minutes). */
export function cacheSet<T>(key: string, value: T, ttlSeconds = 300): void {
  // Evict oldest entries if at capacity
  if (store.size >= MAX_ENTRIES) {
    const firstKey = store.keys().next().value;
    if (firstKey !== undefined) store.delete(firstKey);
  }
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

/** Get a cached value, or null if expired/missing. */
export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

/**
 * Cache-through helper: get from cache or compute + store.
 *
 * Usage:
 *   const result = await cached("optimize:" + hash, () => expensiveLLMCall(), 600);
 */
export async function cached<T>(
  key: string,
  compute: () => Promise<T>,
  ttlSeconds = 300
): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== null) return hit;
  const value = await compute();
  cacheSet(key, value, ttlSeconds);
  return value;
}

/** Simple hash for cache keys — deterministic, fast, not crypto-grade. */
export function hashKey(...parts: string[]): string {
  const str = parts.join("|");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash.toString(36);
}
