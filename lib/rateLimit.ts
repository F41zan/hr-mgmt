/**
 * lib/rateLimit.ts
 * Simple in-process rate limiter for login and password-reset endpoints.
 * Uses a sliding-window counter keyed by IP address.
 * For multi-instance production deployments, replace with Redis-backed solution.
 */

interface BucketEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, BucketEntry>();

// Clean up expired entries every 5 minutes to avoid memory growth
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  },
  5 * 60 * 1000,
).unref?.();

/**
 * Check and increment the rate-limit counter for the given key.
 * @param key       Unique key (e.g. "login:192.168.1.1")
 * @param limit     Maximum requests in the window
 * @param windowMs  Window size in milliseconds
 * @returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(key, entry);
  }

  entry.count += 1;
  const remaining = Math.max(0, limit - entry.count);

  return {
    allowed: entry.count <= limit,
    remaining,
    resetAt: entry.resetAt,
  };
}
