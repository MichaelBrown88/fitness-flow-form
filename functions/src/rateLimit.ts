/**
 * Lightweight rate-limiting helper for Cloud Functions.
 *
 * Uses a Firestore counter document with a sliding window.
 * Firestore is chosen over in-memory counters because Cloud Functions are
 * stateless — each instance has no shared memory, so in-memory state would
 * only limit concurrency per-instance, not globally.
 *
 * Pattern:
 *   await assertRateLimit(db, key, { maxRequests: 10, windowSeconds: 60 });
 *
 * The counter doc lives at: rate-limits/{key}
 * It stores { count, windowStart } and is cleaned up atomically on each call.
 *
 * For high-traffic scenarios, consider switching to a dedicated Redis/Memorystore
 * instance instead. This implementation is intentionally simple and covers the
 * current low-to-medium traffic needs.
 */

import * as admin from 'firebase-admin';

export interface RateLimitOptions {
  /** Maximum requests allowed within the window. */
  maxRequests: number;
  /** Sliding window size in seconds. */
  windowSeconds: number;
}

/**
 * Check and increment a rate limit counter for the given key.
 * Throws an Error with code `RATE_LIMITED` if the limit is exceeded.
 *
 * @param db    Firestore instance
 * @param key   Unique key for this limit bucket (e.g. "checkout:uid:abc123")
 * @param opts  Window and count options
 */
export async function assertRateLimit(
  db: admin.firestore.Firestore,
  key: string,
  opts: RateLimitOptions,
): Promise<void> {
  const ref = db.collection('rate-limits').doc(key);
  const nowMs = Date.now();
  const windowMs = opts.windowSeconds * 1000;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);

    if (!snap.exists) {
      tx.set(ref, { count: 1, windowStart: nowMs, ttl: nowMs + windowMs * 2 });
      return;
    }

    const data = snap.data()!;
    const windowStart: number = data.windowStart ?? nowMs;

    // Window has expired — reset counter
    if (nowMs - windowStart > windowMs) {
      tx.set(ref, { count: 1, windowStart: nowMs, ttl: nowMs + windowMs * 2 });
      return;
    }

    const count: number = data.count ?? 0;
    if (count >= opts.maxRequests) {
      const retryAfterSeconds = Math.ceil((windowMs - (nowMs - windowStart)) / 1000);
      const err = new Error(`Rate limit exceeded. Retry after ${retryAfterSeconds}s.`);
      (err as NodeJS.ErrnoException).code = 'RATE_LIMITED';
      throw err;
    }

    tx.update(ref, { count: count + 1 });
  });
}

/**
 * Build a consistent rate limit key from optional uid and/or IP address.
 * Using both prevents single-IP bypass via different accounts and vice versa.
 */
export function buildRateLimitKey(
  namespace: string,
  uid?: string,
  rawIp?: string,
): string {
  // Normalise IPv6-mapped IPv4 addresses (e.g. "::ffff:1.2.3.4" → "1.2.3.4")
  const ip = rawIp?.replace(/^::ffff:/, '') ?? 'unknown';
  const identifier = uid ?? ip;
  return `${namespace}:${identifier}`;
}
