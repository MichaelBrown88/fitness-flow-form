import type { Region } from '@/constants/pricing';
import { DEFAULT_CURRENCY } from '@/constants/pricing';
import { getCurrencyMinorUnitMultiplier } from '@/lib/utils/currencyMinorUnits';
import { subscriptionSmallestUnitToGbpPence } from '@shared/reportingFx';

/** KWD fils → GBP pence (uses shared reporting rates). */
export function filsToGbpPence(fils: number): number {
  return subscriptionSmallestUnitToGbpPence(Number(fils), 'KWD');
}

/** USD cents → GBP pence (uses shared reporting rates). */
export function usdCentsToGbpPence(cents: number): number {
  return subscriptionSmallestUnitToGbpPence(Number(cents), 'USD');
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

/** Reasonable default locale for ISO currency formatting when region is unknown */
export function getLocaleHintForCurrency(currency: string): string {
  const c = currency.toUpperCase();
  if (c === 'GBP') return 'en-GB';
  if (c === 'USD') return 'en-US';
  if (c === 'EUR') return 'de-DE';
  if (c === 'KWD') return 'en-KW';
  return getDefaultLocale();
}

/**
 * Format a stored amount in the currency’s smallest unit (pence, cents, fils, etc.).
 * Platform reporting stays GBP-based; this is display-only for admin UI.
 */
export function formatAmountFromSmallestUnits(
  amountInSmallestUnit: number,
  currency: string,
  locale?: string,
): string {
  const n = Number(amountInSmallestUnit);
  if (Number.isNaN(n)) return '—';
  const mult = getCurrencyMinorUnitMultiplier(currency);
  const main = n / mult;
  const c = currency.toUpperCase();
  const loc = locale ?? getLocaleHintForCurrency(currency);
  try {
    if (c === 'KWD') {
      return new Intl.NumberFormat('en-KW', {
        style: 'currency',
        currency: 'KWD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 3,
      }).format(main);
    }
    const showSubunits = mult > 1 && (Math.abs(n) < mult || n % mult !== 0);
    return new Intl.NumberFormat(loc, {
      style: 'currency',
      currency: c,
      minimumFractionDigits: showSubunits ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(main);
  } catch {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: DEFAULT_CURRENCY,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n / 100);
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
