import { FREE_TIER_CLIENT_LIMIT } from '@/constants/pricing';

export interface OrgCheckoutTargetInput {
  orgType?: string;
  packageTrack?: string;
  subscriptionClientCap: number;
  statsClientCount: number;
}

/**
 * Minimum desired clients for capacity tier when starting Stripe checkout (solo vs gym).
 * Mirrors `Billing.tsx` so org admin billing and settings billing stay aligned.
 */
export function checkoutClientTargetForStripe(input: OrgCheckoutTargetInput): number {
  const cap = input.subscriptionClientCap || FREE_TIER_CLIENT_LIMIT;
  const stats = input.statsClientCount;
  const isSolo = input.orgType === 'solo_coach' || input.packageTrack === 'solo';
  if (isSolo) {
    return Math.min(300, Math.max(cap, stats + 1, FREE_TIER_CLIENT_LIMIT + 1));
  }
  return Math.max(1, cap);
}
