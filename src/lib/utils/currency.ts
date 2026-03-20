import { DEFAULT_CURRENCY, KWD_TO_GBP } from '@/constants/pricing';

const USD_TO_GBP = 1 / 1.27;
import type { Region } from '@/constants/pricing';

/**
 * Convert KWD fils to GBP pence.
 * 1000 fils = 1 KWD. KWD_TO_GBP converts to GBP main unit; * 100 for pence.
 */
export function filsToGbpPence(fils: number): number {
  const n = Number(fils);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.round((n / 1000) * KWD_TO_GBP * 100);
}

/**
 * Convert USD cents to GBP pence.
 */
export function usdCentsToGbpPence(cents: number): number {
  const n = Number(cents);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.round((n / 100) * USD_TO_GBP * 100);
}

function getDefaultLocale(): string {
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }
  return 'en-GB';
}

/** Locale for region (for currency display) */
export function getLocaleForRegion(region: Region): string {
  switch (region) {
    case 'GB':
      return 'en-GB';
    case 'US':
      return 'en-US';
    case 'KW':
      return 'en-KW';
    default:
      return 'en-GB';
  }
}

/**
 * Format amount in currency.
 * @param amount - Amount in main unit (e.g. 29 for £29)
 * @param currency - Currency code (GBP, USD, KWD)
 * @param locale - Optional locale; if not provided, uses region-based or browser default
 */
export function formatPrice(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
  locale?: string,
): string {
  const loc = locale ?? getDefaultLocale();
  const safeAmount = Number.isNaN(Number(amount)) ? 0 : Number(amount);
  try {
    return new Intl.NumberFormat(loc, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(safeAmount);
  } catch {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: DEFAULT_CURRENCY,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(safeAmount);
  }
}
