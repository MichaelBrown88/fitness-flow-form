/**
 * Pricing Constants
 *
 * Region/currency for multi-tenant reporting; capacity packages (GBP) from shared billing module.
 */

import {
  CAPACITY_TIERS,
  NEW_CAPACITY_TIERS,
  LEGACY_CAPACITY_TIERS,
  getPaidTierByClientCount,
  type CapacityTier,
  type PaidCapacityTierId,
  type BillingPeriod,
  type CapacityTierId,
} from '@shared/billing/capacityTiers';
import { DEFAULT_CURRENCY_RATES, REPORTING_CURRENCY } from '@shared/reportingFx';

export {
  CAPACITY_TIERS,
  NEW_CAPACITY_TIERS,
  LEGACY_CAPACITY_TIERS,
  PAID_TIER_IDS,
  TIER_F_CLIENT_CAP,
  SOLO_MAX_CLIENT_LIMIT,
  GYM_MAX_CLIENT_LIMIT,
  GYM_TRIAL_CLIENT_CAP,
  CUSTOM_BRANDING_PRICE_GBP,
  FREE_TIER_CLIENT_LIMIT,
  FREE_TIER_MONTHLY_AI_CREDITS,
  getPaidTierByClientCount,
  getPaidTierForPackageTrack,
  getActivePaidTiersForTrack,
  getPaidTierById,
  isPaidCapacityTierId,
  annualSavingsVsMonthly,
  type CapacityTier,
  type PaidCapacityTierId,
  type BillingPeriod,
  type CapacityTierId,
  type PackageTrack,
} from '@shared/billing/capacityTiers';

export { REPORTING_CURRENCY };
export const KWD_TO_GBP = DEFAULT_CURRENCY_RATES.KWD_TO_GBP;

export const REGIONS = ['GB', 'US', 'KW'] as const;
export type Region = (typeof REGIONS)[number];

export const CURRENCIES = ['GBP', 'USD', 'KWD'] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Distinct client limits across active GB solo + gym tiers (reference / admin). */
export const CAPACITY_CLIENT_LIMITS = [
  10, 20, 35, 50, 75, 100, 150, 200, 250,
] as const;
export type CapacityClientLimit = (typeof CAPACITY_CLIENT_LIMITS)[number];

/**
 * @deprecated Legacy Everfit-style seat counts — used only for US/KW pricing tables and admin fallbacks.
 */
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

export const DEFAULT_REGION: Region = 'GB';
export const DEFAULT_CURRENCY: Currency = 'GBP';

const LEGACY_MONTHLY_CREDITS: Record<number, number> = {
  5: 15,
  10: 30,
  20: 60,
  35: 90,
  50: 100,
  75: 150,
  100: 200,
  150: 300,
  250: 500,
  300: -1,
};

function buildMonthlyCreditsByTier(): Record<number, number> {
  const m: Record<number, number> = { ...LEGACY_MONTHLY_CREDITS };
  for (const t of NEW_CAPACITY_TIERS) {
    if (t.packageTrack === 'solo') {
      m[t.clientLimit] = t.monthlyAiCredits;
    }
  }
  for (const t of LEGACY_CAPACITY_TIERS) {
    if (m[t.clientLimit] == null) {
      m[t.clientLimit] = t.monthlyAiCredits;
    }
  }
  return m;
}

/**
 * Monthly AI credits by nominal client/seat limit.
 * Each AI OCR or posture scan consumes 1 credit. Non-AI assessments are free.
 */
export const MONTHLY_CREDITS_BY_TIER: Record<number, number> = buildMonthlyCreditsByTier();

/** Ambiguous limits (e.g. 50/100 on both tracks): default to solo ladder for generic lookups. */
export function monthlyAiCreditsForClientLimit(clientLimit: number): number {
  const direct = MONTHLY_CREDITS_BY_TIER[clientLimit];
  if (direct != null) return direct;
  return getPaidTierByClientCount(clientLimit, 'solo').monthlyAiCredits;
}

/** Sentinel value for unlimited credits */
export const UNLIMITED_CREDITS = -1;

/** Legacy / admin: very high balance treated as unlimited (matches Stripe webhook unlimited-credit handling). */
const UNLIMITED_CREDITS_SENTINEL_MIN = 9999;

/** True when balance should bypass AI credit consumption (explicit unlimited or legacy high balance). */
export function isUnlimitedAiCredits(credits: number | null | undefined): boolean {
  if (credits == null) return false;
  return credits === UNLIMITED_CREDITS || credits >= UNLIMITED_CREDITS_SENTINEL_MIN;
}

export const CREDIT_TOPUP_PRICE: Record<Region, number> = {
  GB: 9,
  US: 12,
  KW: 3,
};

export const CREDIT_TOPUP_QUANTITY = 20;
