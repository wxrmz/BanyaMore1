type Bucket = { count: number; resetAt: number };

const MAX_TRACKED_KEYS = 10_000;

/** Small in-memory fixed-window limiter (per process). */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const buckets = new Map<string, Bucket>();

  const prune = (now: number) => {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
    while (buckets.size > MAX_TRACKED_KEYS) {
      const oldest = buckets.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      buckets.delete(oldest);
    }
  };

  /** Registers a hit. Returns seconds to wait when the limit is exceeded, otherwise 0. */
  return (key: string, now = Date.now()) => {
    if (buckets.size > MAX_TRACKED_KEYS / 2) prune(now);
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return 0;
    }
    bucket.count += 1;
    return bucket.count > limit ? Math.ceil((bucket.resetAt - now) / 1000) : 0;
  };
}
