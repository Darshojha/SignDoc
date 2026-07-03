import "server-only";

export type RateLimitResult =
  | { allowed: true; remaining: number; resetAt: number }
  | { allowed: false; retryAfterMs: number };

type Bucket = {
  count: number;
  resetAt: number;
};

const RATE_LIMIT_STATE = Symbol.for("signdoc.rateLimitState");

function getStore() {
  const globalForRateLimit = globalThis as typeof globalThis & {
    [RATE_LIMIT_STATE]?: Map<string, Bucket>;
  };

  if (!globalForRateLimit[RATE_LIMIT_STATE]) {
    globalForRateLimit[RATE_LIMIT_STATE] = new Map<string, Bucket>();
  }

  return globalForRateLimit[RATE_LIMIT_STATE]!;
}

export function consumeRateLimit(
  key: string,
  options: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const store = getStore();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + options.windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: options.limit - 1, resetAt };
  }

  if (bucket.count >= options.limit) {
    return { allowed: false, retryAfterMs: Math.max(bucket.resetAt - now, 1) };
  }

  bucket.count += 1;
  store.set(key, bucket);
  return { allowed: true, remaining: options.limit - bucket.count, resetAt: bucket.resetAt };
}

export function getClientIp(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for");
  const forwardedIp = forwardedFor?.split(",")[0]?.trim();
  return (
    forwardedIp ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    "unknown"
  );
}
