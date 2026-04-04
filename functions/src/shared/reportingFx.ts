/**
 * Platform reporting: normalize subscription amounts to GBP pence.
 * Shared by Cloud Functions (MRR aggregation) and client admin (revenue-by-region scan).
 *
 * Stripe stores per-org amounts in the smallest unit of `subscription.currency`
 * (`amountCents`, or `amountFils` when currency is KWD).
 *
 * Optional live overrides: Firestore `platform/config.currencyRates` (same keys as below).
 */

export const REPORTING_CURRENCY = 'GBP' as const;

export interface CurrencyRatesForReporting {
  /** Multiply USD **cents** by this to get GBP **pence** (e.g. 0.79 ≈ £0.79 per $1). */
  USD_TO_GBP: number;
  /** Multiply EUR **cents** by this to get GBP **pence**. */
  EUR_TO_GBP: number;
  /** KWD per 1 KWD main unit → GBP main unit (fils converted inside). */
  KWD_TO_GBP: number;
}

export const DEFAULT_CURRENCY_RATES: CurrencyRatesForReporting = {
  USD_TO_GBP: 0.79,
  EUR_TO_GBP: 0.86,
  KWD_TO_GBP: 2.6,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Merge Firestore `platform/config` with defaults (partial overrides allowed).
 */
export function currencyRatesFromFirestoreDoc(
  data: Record<string, unknown> | undefined,
): CurrencyRatesForReporting {
  const raw = data && isRecord(data.currencyRates) ? data.currencyRates : undefined;
  const USD =
    raw && typeof raw.USD_TO_GBP === 'number' && Number.isFinite(raw.USD_TO_GBP)
      ? raw.USD_TO_GBP
      : DEFAULT_CURRENCY_RATES.USD_TO_GBP;
  const EUR =
    raw && typeof raw.EUR_TO_GBP === 'number' && Number.isFinite(raw.EUR_TO_GBP)
      ? raw.EUR_TO_GBP
      : DEFAULT_CURRENCY_RATES.EUR_TO_GBP;
  const KWD =
    raw && typeof raw.KWD_TO_GBP === 'number' && Number.isFinite(raw.KWD_TO_GBP)
      ? raw.KWD_TO_GBP
      : DEFAULT_CURRENCY_RATES.KWD_TO_GBP;
  return { USD_TO_GBP: USD, EUR_TO_GBP: EUR, KWD_TO_GBP: KWD };
}

/**
 * Convert stored subscription smallest-unit amount to GBP pence for dashboards / MRR counters.
 */
export function subscriptionSmallestUnitToGbpPence(
  amountSmallest: number,
  currency: string | undefined,
  rates: CurrencyRatesForReporting = DEFAULT_CURRENCY_RATES,
): number {
  const c = (currency || 'GBP').toUpperCase();
  const n = Number(amountSmallest);
  if (Number.isNaN(n) || n < 0) return 0;
  if (c === 'GBP') return Math.round(n);
  if (c === 'USD') return Math.round(n * rates.USD_TO_GBP);
  if (c === 'EUR') return Math.round(n * rates.EUR_TO_GBP);
  if (c === 'KWD') return Math.round((n / 1000) * rates.KWD_TO_GBP * 100);
  return 0;
}
