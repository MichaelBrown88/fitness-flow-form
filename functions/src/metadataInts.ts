/**
 * Stripe Checkout / Subscription metadata is stringly-typed.
 * Parse with fallback and hard caps to avoid NaN cascades and abuse.
 */

export const METADATA_MAX_CLIENT_CAP = 10_000;
export const METADATA_MAX_MONTHLY_AI_CREDITS = 100_000;
export const METADATA_MAX_CREDIT_TOPUP_QTY = 5_000;

function clampInt(n: number, min: number, max: number): number {
  const x = Math.floor(Number(n));
  if (!Number.isFinite(x)) {
    const fb = Math.floor(Number(min));
    return Number.isFinite(fb) ? Math.min(max, Math.max(0, fb)) : 0;
  }
  return Math.min(max, Math.max(min, x));
}

/**
 * Parse a non-negative integer from metadata; invalid or missing uses fallback (also clamped).
 */
export function parseMetadataInt(
  raw: string | undefined | null,
  fallback: number,
  max: number,
): number {
  if (raw == null || String(raw).trim() === '') {
    return clampInt(fallback, 0, max);
  }
  const n = Number.parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n) || Number.isNaN(n)) {
    return clampInt(fallback, 0, max);
  }
  return clampInt(n, 0, max);
}
