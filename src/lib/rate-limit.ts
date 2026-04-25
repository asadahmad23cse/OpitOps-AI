type Bucket = {
  count: number;
  resetAt: number;
};

export type RateLimitConfig = {
  windowMs: number;
  max: number;
  keyPrefix?: string;
};

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
};

type Store = Map<string, Bucket>;

declare global {
  var __optiopsRateLimitStore: Store | undefined;
}

function getStore(): Store {
  if (!globalThis.__optiopsRateLimitStore) {
    globalThis.__optiopsRateLimitStore = new Map<string, Bucket>();
  }
  return globalThis.__optiopsRateLimitStore;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp?.trim()) return realIp.trim();

  return "unknown";
}

export function checkRateLimit(
  req: Request,
  { windowMs, max, keyPrefix = "default" }: RateLimitConfig,
): RateLimitResult {
  const now = Date.now();
  const ip = getClientIp(req);
  const key = `${keyPrefix}:${ip}`;
  const store = getStore();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return {
      ok: true,
      limit: max,
      remaining: Math.max(max - 1, 0),
      resetAt,
      retryAfterSec: Math.ceil(windowMs / 1000),
    };
  }

  existing.count += 1;
  store.set(key, existing);

  const remaining = Math.max(max - existing.count, 0);
  const retryAfterSec = Math.max(Math.ceil((existing.resetAt - now) / 1000), 1);

  return {
    ok: existing.count <= max,
    limit: max,
    remaining,
    resetAt: existing.resetAt,
    retryAfterSec,
  };
}
