/**
 * Legacy KWD plan-tier pricing (Kuwaiti Dinar).
 *
 * UK-first capacity pricing lives in `@/lib/pricing/config` (`getMonthlyPrice`).
 * Use this module only for KW / `calculateMonthlyFee` fallbacks — not new GB features.
 */

export type SubscriptionPlan = 'starter' | 'professional' | 'enterprise' | 'free' | 'none';

export interface PlanConfig {
  name: string;
  basePriceKwd: number; // Monthly base price in KWD
  pricePerSeatKwd: number; // Additional cost per client seat per month
  includedSeats: number; // Number of seats included in base price
  maxSeats?: number; // Maximum seats allowed (undefined = unlimited)
  description: string;
}

export const PRICING_PLANS: Record<SubscriptionPlan, PlanConfig> = {
  free: {
    name: 'Free',
    basePriceKwd: 0,
    pricePerSeatKwd: 0,
    includedSeats: 5,
    maxSeats: 5,
    description: 'Limited features, 5 client seats',
  },
  starter: {
    name: 'Starter',
    basePriceKwd: 29, // KWD 29/month
    pricePerSeatKwd: 2, // KWD 2 per additional seat
    includedSeats: 10,
    maxSeats: 50,
    description: 'Perfect for solo coaches, up to 50 clients',
  },
  professional: {
    name: 'Professional',
    basePriceKwd: 79, // KWD 79/month
    pricePerSeatKwd: 1.5, // KWD 1.5 per additional seat
    includedSeats: 25,
    maxSeats: 200,
    description: 'Ideal for small gyms, up to 200 clients',
  },
  enterprise: {
    name: 'Enterprise',
    basePriceKwd: 199, // KWD 199/month
    pricePerSeatKwd: 1, // KWD 1 per additional seat
    includedSeats: 100,
    maxSeats: undefined, // Unlimited
    description: 'For large gyms and chains, unlimited clients',
  },
  none: {
    name: 'No Plan',
    basePriceKwd: 0,
    pricePerSeatKwd: 0,
    includedSeats: 0,
    maxSeats: 0,
    description: 'No active subscription',
  },
};

/**
 * Calculate monthly subscription fee based on plan and number of seats
 * @param plan - Subscription plan
 * @param clientSeats - Number of client seats requested
 * @returns Monthly fee in KWD (converted to fils for storage: KWD * 1000)
 */
export function calculateMonthlyFee(plan: SubscriptionPlan, clientSeats: number): number {
  const planConfig = PRICING_PLANS[plan];
  
  if (!planConfig) {
    return 0;
  }

  // If plan is free or none, no charge
  if (plan === 'free' || plan === 'none') {
    return 0;
  }

  // If seats are within included amount, just base price
  if (clientSeats <= planConfig.includedSeats) {
    return planConfig.basePriceKwd;
  }

  // Calculate: base price + (additional seats * price per seat)
  const additionalSeats = clientSeats - planConfig.includedSeats;
  const totalFee = planConfig.basePriceKwd + (additionalSeats * planConfig.pricePerSeatKwd);

  // Check max seats if defined
  if (planConfig.maxSeats !== undefined && clientSeats > planConfig.maxSeats) {
    // If exceeding max, calculate up to max only
    const seatsToCharge = Math.min(clientSeats, planConfig.maxSeats);
    if (seatsToCharge <= planConfig.includedSeats) {
      return planConfig.basePriceKwd;
    }
    const additional = seatsToCharge - planConfig.includedSeats;
    return planConfig.basePriceKwd + (additional * planConfig.pricePerSeatKwd);
  }

  return totalFee;
}

/**
 * Get plan configuration
 */
export function getPlanConfig(plan: SubscriptionPlan): PlanConfig {
  return PRICING_PLANS[plan] || PRICING_PLANS.none;
}

/**
 * Format monthly fee for display
 */
export function formatMonthlyFee(kwd: number): string {
  return new Intl.NumberFormat('en-KW', {
    style: 'currency',
    currency: 'KWD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(kwd);
}
