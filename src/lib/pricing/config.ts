/**
 * Pricing Config - Everfit-style seat blocks, UK base £29
 *
 * Location-based pricing (UK, US, Kuwait). Lookup tables only; no formulas in production.
 */

import type { Region, SeatTier } from '@/constants/pricing';

/** Subscription monthly price by region and client count (main unit: GBP, USD, KWD) */
export const PRICING_SUBSCRIPTION: Record<Region, Record<number, number>> = {
  GB: {
    5: 29,
    10: 44,
    20: 74,
    35: 115,
    50: 145,
    75: 184,
    100: 214,
    150: 274,
    250: 389,
    300: 444,
  },
  US: {
    5: 39,
    10: 59,
    20: 99,
    35: 154,
    50: 195,
    75: 249,
    100: 289,
    150: 369,
    250: 519,
    300: 597,
  },
  KW: {
    5: 12,
    10: 18,
    20: 29,
    35: 45,
    50: 57,
    75: 72,
    100: 84,
    150: 108,
    250: 153,
    300: 174,
  },
};

/** Per-client overage rate for 300+ (main unit per client) */
export const PRICING_OVERAGE_RATE: Record<Region, number> = {
  GB: 1.48,
  US: 1.99,
  KW: 0.58,
};

/** Custom branding one-off add-on (main unit) */
export const CUSTOM_BRANDING: Record<Region, number> = {
  GB: 60,
  US: 85,
  KW: 23,
};

/**
 * Get monthly subscription price for region and client count.
 * For 300+, uses base 300 price + overage rate * (clientCount - 300).
 */
export function getMonthlyPrice(region: Region, clientCount: number): number {
  const safeCount = Math.max(0, Math.floor(Number(clientCount)));
  if (Number.isNaN(safeCount)) return 0;
  const tiers = PRICING_SUBSCRIPTION[region];
  const tierKeys = [5, 10, 20, 35, 50, 75, 100, 150, 250, 300];
  if (safeCount <= 300) {
    const tier = tierKeys.filter((t) => t <= safeCount).pop() ?? 5;
    return tiers[tier] ?? 0;
  }
  const base300 = tiers[300] ?? 0;
  const overage = (safeCount - 300) * PRICING_OVERAGE_RATE[region];
  return base300 + overage;
}

/** Get custom branding one-off price for region */
export function getCustomBrandingPrice(region: Region): number {
  return CUSTOM_BRANDING[region] ?? 0;
}

/** Convert main-unit amount to smallest unit (pence/cents/fils) */
export function getPriceInSmallestUnit(amount: number, currency: string): number {
  const n = Number(amount);
  if (Number.isNaN(n)) return 0;
  switch (currency) {
    case 'GBP':
      return Math.round(n * 100); // pence
    case 'USD':
      return Math.round(n * 100); // cents
    case 'KWD':
      return Math.round(n * 1000); // fils
    default:
      return Math.round(n * 100);
  }
}
