/**
 * Currency conversion for platform reporting (base currency GBP).
 * Matches src/lib/utils/currency.ts filsToGbpPence.
 */
const KWD_TO_GBP = 2.6;

/**
 * Convert KWD fils to GBP pence.
 * 1000 fils = 1 KWD. Used for AI costs aggregation.
 */
export function filsToGbpPence(fils: number): number {
  const n = Number(fils);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.round((n / 1000) * KWD_TO_GBP * 100);
}
