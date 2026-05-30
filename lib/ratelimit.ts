/**
 * In-memory sliding-window rate limiter.
 * Each key (IP or user) gets a bucket with a token count and reset time.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Clean up stale buckets every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}, 5 * 60_000);

/**
 * Check if a request should be rate-limited.
 *
 * @param key - Unique identifier (e.g., IP address or username)
 * @param max - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns { allowed, retryAfter } - retryAfter in seconds (0 if allowed)
 */
export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  bucket.count++;
  if (bucket.count > max) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true, retryAfter: 0 };
}

/**
 * Extract client IP from request headers.
 */
export function getClientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
