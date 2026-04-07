/**
 * Builds a subscription object for legacy orgs that were created before
 * multi-tenancy and have no subscription.planKind set.
 *
 * - solo_coach  → solo_free (free forever, no Stripe needed)
 * - gym / gym_chain → gym_trial (14-day trial, existing upgrade path via /subscribe)
 */

import {
  FREE_TIER_CLIENT_LIMIT,
  FREE_TIER_MONTHLY_AI_CREDITS,
  GYM_TRIAL_CLIENT_CAP,
} from '@/constants/pricing';
import type { OrgSubscriptionSnapshot } from '@/services/organizations';

export function buildLegacySubscription(
  type: string,
  region: string,
  billingEmail: string,
): OrgSubscriptionSnapshot {
  if (type === 'solo_coach') {
    return {
      plan: 'starter',
      planKind: 'solo_free',
      status: 'active',
      clientCap: FREE_TIER_CLIENT_LIMIT,
      clientSeats: FREE_TIER_CLIENT_LIMIT,
      monthlyAiCredits: FREE_TIER_MONTHLY_AI_CREDITS,
      billingEmail,
      region,
      packageTrack: 'solo',
    };
  }

  // gym or gym_chain
  return {
    plan: 'starter',
    planKind: 'gym_trial',
    status: 'trial',
    trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    clientCap: GYM_TRIAL_CLIENT_CAP,
    trialClientCap: GYM_TRIAL_CLIENT_CAP,
    clientSeats: GYM_TRIAL_CLIENT_CAP,
    billingEmail,
    region,
    packageTrack: 'gym',
  };
}
