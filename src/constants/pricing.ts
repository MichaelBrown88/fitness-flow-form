/**
 * Pricing Constants
 *
 * Zero magic strings for region, currency, and seat tiers.
 * Used by pricing config and components.
 */

export const REGIONS = ['GB', 'US', 'KW'] as const;
export type Region = (typeof REGIONS)[number];

export const CURRENCIES = ['GBP', 'USD', 'KWD'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const SEAT_TIERS = [5, 10, 20, 35, 50, 75, 100, 150, 250, 300] as const;
export type SeatTier = (typeof SEAT_TIERS)[number];

export const REGION_TO_CURRENCY: Record<Region, Currency> = {
  GB: 'GBP',
  US: 'USD',
  KW: 'KWD',
};

export const REGION_LABELS: Record<Region, string> = {
  GB: 'United Kingdom',
  US: 'United States',
  KW: 'Kuwait',
};

/** Default region for new orgs (UK base) */
export const DEFAULT_REGION: Region = 'GB';

/** Default currency (UK base) */
export const DEFAULT_CURRENCY: Currency = 'GBP';

/** KWD to GBP rate for platform reporting (base currency). Used to convert AI costs and regional totals. */
export const KWD_TO_GBP = 2.6;

/**
 * Monthly AI assessment credits replenished per seat tier.
 * Each AI scan (OCR or posture) consumes 1 credit.
 * Non-AI assessments are always free.
 * Tiers with 300 seats get unlimited credits (represented as -1).
 */
export const MONTHLY_CREDITS_BY_TIER: Record<number, number> = {
  5: 15,
  10: 30,
  20: 60,
  35: 90,
  50: 100,
  75: 150,
  100: 200,
  150: 300,
  250: 500,
  300: -1, // unlimited
};

/** Sentinel value for unlimited credits */
export const UNLIMITED_CREDITS = -1;

/**
 * Credit top-up pack: 20 scans for a fixed price per region.
 */
export const CREDIT_TOPUP_PRICE: Record<Region, number> = {
  GB: 9,
  US: 12,
  KW: 3,
};

export const CREDIT_TOPUP_QUANTITY = 20;
