/**
 * Capacity packages — single source of truth (Functions + Vite via `@shared/billing/capacityTiers`).
 * Solo: 10–100 clients. Gym: 50–250. Gym floor price > solo ceiling at overlap (G50 > S100).
 * Legacy A–F retained for existing Stripe/Firestore.
 */

export const TIER_F_CLIENT_CAP = 100;
export const SOLO_MAX_CLIENT_LIMIT = 100;
export const GYM_MAX_CLIENT_LIMIT = 250;
/** During gym 14-day trial — max active clients (Firestore + product). */
export const GYM_TRIAL_CLIENT_CAP = 100;

export type PackageTrack = 'solo' | 'gym';

export type PaidCapacityTierId =
  | 'S10'
  | 'S20'
  | 'S35'
  | 'S50'
  | 'S75'
  | 'S100'
  | 'G50'
  | 'G100'
  | 'G150'
  | 'G200'
  | 'G250'
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F';

export type CapacityTierId = 'free' | PaidCapacityTierId;

export type BillingPeriod = 'monthly' | 'annual';

export interface CapacityTier {
  id: PaidCapacityTierId;
  packageTrack: PackageTrack;
  label: string;
  clientLimit: number;
  monthlyPriceGbp: number;
  annualPriceGbp: number;
  monthlyAiCredits: number;
  legacy?: boolean;
}

/** Active catalog (GB checkout + plan UI). CFO monthly GBP; annual ≈20% vs 12× monthly. */
export const NEW_CAPACITY_TIERS: readonly CapacityTier[] = [
  {
    id: 'S10',
    packageTrack: 'solo',
    label: 'Solo · 10 clients',
    clientLimit: 10,
    monthlyPriceGbp: 39,
    annualPriceGbp: 374,
    monthlyAiCredits: 30,
  },
  {
    id: 'S20',
    packageTrack: 'solo',
    label: 'Solo · 20 clients',
    clientLimit: 20,
    monthlyPriceGbp: 69,
    annualPriceGbp: 662,
    monthlyAiCredits: 45,
  },
  {
    id: 'S35',
    packageTrack: 'solo',
    label: 'Solo · 35 clients',
    clientLimit: 35,
    monthlyPriceGbp: 94,
    annualPriceGbp: 902,
    monthlyAiCredits: 65,
  },
  {
    id: 'S50',
    packageTrack: 'solo',
    label: 'Solo · 50 clients',
    clientLimit: 50,
    monthlyPriceGbp: 114,
    annualPriceGbp: 1094,
    monthlyAiCredits: 85,
  },
  {
    id: 'S75',
    packageTrack: 'solo',
    label: 'Solo · 75 clients',
    clientLimit: 75,
    monthlyPriceGbp: 129,
    annualPriceGbp: 1238,
    monthlyAiCredits: 110,
  },
  {
    id: 'S100',
    packageTrack: 'solo',
    label: 'Solo · 100 clients',
    clientLimit: 100,
    monthlyPriceGbp: 139,
    annualPriceGbp: 1334,
    monthlyAiCredits: 130,
  },
  {
    id: 'G50',
    packageTrack: 'gym',
    label: 'Gym · 50 clients',
    clientLimit: 50,
    monthlyPriceGbp: 149,
    annualPriceGbp: 1430,
    monthlyAiCredits: 150,
  },
  {
    id: 'G100',
    packageTrack: 'gym',
    label: 'Gym · 100 clients',
    clientLimit: 100,
    monthlyPriceGbp: 199,
    annualPriceGbp: 1910,
    monthlyAiCredits: 200,
  },
  {
    id: 'G150',
    packageTrack: 'gym',
    label: 'Gym · 150 clients',
    clientLimit: 150,
    monthlyPriceGbp: 239,
    annualPriceGbp: 2294,
    monthlyAiCredits: 260,
  },
  {
    id: 'G200',
    packageTrack: 'gym',
    label: 'Gym · 200 clients',
    clientLimit: 200,
    monthlyPriceGbp: 269,
    annualPriceGbp: 2582,
    monthlyAiCredits: 300,
  },
  {
    id: 'G250',
    packageTrack: 'gym',
    label: 'Gym · 250 clients',
    clientLimit: 250,
    monthlyPriceGbp: 289,
    annualPriceGbp: 2774,
    monthlyAiCredits: 350,
  },
] as const;

export const LEGACY_CAPACITY_TIERS: readonly CapacityTier[] = [
  {
    id: 'A',
    packageTrack: 'solo',
    label: 'Package A',
    clientLimit: 10,
    monthlyPriceGbp: 39,
    annualPriceGbp: 374,
    monthlyAiCredits: 25,
    legacy: true,
  },
  {
    id: 'B',
    packageTrack: 'solo',
    label: 'Package B',
    clientLimit: 20,
    monthlyPriceGbp: 69,
    annualPriceGbp: 662,
    monthlyAiCredits: 50,
    legacy: true,
  },
  {
    id: 'C',
    packageTrack: 'solo',
    label: 'Package C',
    clientLimit: 30,
    monthlyPriceGbp: 94,
    annualPriceGbp: 902,
    monthlyAiCredits: 75,
    legacy: true,
  },
  {
    id: 'D',
    packageTrack: 'gym',
    label: 'Package D',
    clientLimit: 40,
    monthlyPriceGbp: 114,
    annualPriceGbp: 1094,
    monthlyAiCredits: 100,
    legacy: true,
  },
  {
    id: 'E',
    packageTrack: 'gym',
    label: 'Package E',
    clientLimit: 50,
    monthlyPriceGbp: 129,
    annualPriceGbp: 1238,
    monthlyAiCredits: 125,
    legacy: true,
  },
  {
    id: 'F',
    packageTrack: 'gym',
    label: 'Package F',
    clientLimit: TIER_F_CLIENT_CAP,
    monthlyPriceGbp: 139,
    annualPriceGbp: 1334,
    monthlyAiCredits: 150,
    legacy: true,
  },
] as const;

export const CAPACITY_TIERS: readonly CapacityTier[] = [...NEW_CAPACITY_TIERS, ...LEGACY_CAPACITY_TIERS];

export const PAID_TIER_IDS: readonly PaidCapacityTierId[] = CAPACITY_TIERS.map((t) => t.id);

export const FREE_TIER_CLIENT_LIMIT = 2;
export const FREE_TIER_MONTHLY_AI_CREDITS = 5;

export const CUSTOM_BRANDING_PRICE_GBP = 79;

const PAID_ID_SET = new Set<string>(CAPACITY_TIERS.map((t) => t.id));

export function isPaidCapacityTierId(value: string): value is PaidCapacityTierId {
  return PAID_ID_SET.has(value);
}

export function getActivePaidTiersForTrack(track: PackageTrack): CapacityTier[] {
  return NEW_CAPACITY_TIERS.filter((t) => t.packageTrack === track).slice();
}

export function getPaidTierForPackageTrack(desiredClients: number, track: PackageTrack): CapacityTier {
  const tiers = getActivePaidTiersForTrack(track).sort((a, b) => a.clientLimit - b.clientLimit);
  const n = Math.max(1, Math.floor(Number(desiredClients)));
  const match = tiers.find((t) => t.clientLimit >= n);
  return match ?? tiers[tiers.length - 1]!;
}

export function getPaidTierByClientCount(
  desiredClients: number,
  track: PackageTrack = 'solo',
): CapacityTier {
  return getPaidTierForPackageTrack(desiredClients, track);
}

export function stripeModeSuffix(): 'TEST' | 'LIVE' {
  const mode = (process.env.STRIPE_MODE || 'test').toLowerCase();
  return mode === 'live' ? 'LIVE' : 'TEST';
}

export function capacityPriceEnvKey(
  tierId: PaidCapacityTierId,
  period: BillingPeriod,
  mode: 'TEST' | 'LIVE' = stripeModeSuffix(),
): string {
  const p = period === 'monthly' ? 'MONTHLY' : 'ANNUAL';
  return `STRIPE_PACKAGE_${tierId}_${p}_${mode}`;
}

export function brandingPriceEnvKey(mode: 'TEST' | 'LIVE' = stripeModeSuffix()): string {
  return `STRIPE_CUSTOM_BRANDING_${mode}`;
}

export function getPaidTierById(id: PaidCapacityTierId | string): CapacityTier | undefined {
  return CAPACITY_TIERS.find((t) => t.id === id);
}

export function getClientCapForSubscription(
  tierId: CapacityTierId | undefined,
  legacyClientSeats?: number,
): number {
  if (tierId && tierId !== 'free') {
    const t = getPaidTierById(tierId);
    if (t) return t.clientLimit;
  }
  if (legacyClientSeats != null && legacyClientSeats > 0) {
    return getPaidTierByClientCount(legacyClientSeats, 'solo').clientLimit;
  }
  return FREE_TIER_CLIENT_LIMIT;
}

export function getMonthlyAiCreditsForTier(tierId: CapacityTierId | undefined): number {
  if (!tierId || tierId === 'free') return FREE_TIER_MONTHLY_AI_CREDITS;
  return getPaidTierById(tierId)?.monthlyAiCredits ?? FREE_TIER_MONTHLY_AI_CREDITS;
}

export function annualSavingsVsMonthly(tier: CapacityTier): number {
  const fullYear = tier.monthlyPriceGbp * 12;
  return Math.round((fullYear - tier.annualPriceGbp) * 100) / 100;
}

export function paidTierFromPriceId(
  priceId: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): PaidCapacityTierId | undefined {
  if (!priceId) return undefined;
  const mode: 'TEST' | 'LIVE' = stripeModeSuffix();
  for (const tier of CAPACITY_TIERS) {
    for (const period of ['monthly', 'annual'] as const) {
      const key = capacityPriceEnvKey(tier.id, period, mode);
      if (env[key] === priceId) return tier.id;
    }
  }
  return undefined;
}
