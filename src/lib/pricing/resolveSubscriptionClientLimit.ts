import {
  FREE_TIER_CLIENT_LIMIT,
  getPaidTierById,
  isPaidCapacityTierId,
} from '@/constants/pricing';

export type ResolveSubscriptionClientLimitInput = {
  capacityTierId?: string;
  clientCap?: number;
  clientCount?: number;
  clientSeats?: number;
  plan?: string;
  subscriptionStatus?: string;
};

/**
 * Client-capacity limit from subscription fields. Prefers `capacityTierId` (Stripe CFO tier)
 * over legacy `clientSeats` / partial `clientCount` values that can disagree with the purchased package.
 */
export function resolveSubscriptionClientLimit(input: ResolveSubscriptionClientLimitInput): number {
  const { capacityTierId, clientCap, clientCount, clientSeats, plan, subscriptionStatus } = input;

  if (capacityTierId) {
    const id = capacityTierId.toUpperCase();
    if (isPaidCapacityTierId(id)) {
      const row = getPaidTierById(id);
      if (row && row.clientLimit > 0) return row.clientLimit;
    }
  }

  if (typeof clientCap === 'number' && clientCap > 0) return clientCap;
  if (typeof clientCount === 'number' && clientCount > 0) return clientCount;
  if (typeof clientSeats === 'number' && clientSeats > 0) return clientSeats;

  const pkg = plan?.toLowerCase() ?? '';
  if (pkg.startsWith('package_')) {
    const raw = pkg.slice('package_'.length).toUpperCase();
    if (isPaidCapacityTierId(raw)) {
      const row = getPaidTierById(raw);
      if (row && row.clientLimit > 0) return row.clientLimit;
    }
  }

  const paidish =
    subscriptionStatus === 'active' ||
    subscriptionStatus === 'trialing' ||
    subscriptionStatus === 'trial';

  return paidish ? 10 : FREE_TIER_CLIENT_LIMIT;
}
