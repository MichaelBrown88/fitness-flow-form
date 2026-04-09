/**
 * Per-org AI assistant quotas (coach workspace assistant tab).
 * Maps Stripe / org subscription fields to tiers; see `subscriptionAiPlanTier()`.
 */

import type { OrgSubscriptionSnapshot } from '@/services/organizations';

export type AssistantAiPlanTier = 'trial' | 'starter' | 'pro' | 'studio';

export type AssistantAiPlanLimits = {
  /** null = unlimited */
  maxRequests: number | null;
  /** null = unlimited */
  maxTokens: number | null;
};

export const ASSISTANT_AI_PLAN_LIMITS: Record<AssistantAiPlanTier, AssistantAiPlanLimits> = {
  trial:   { maxRequests: 25,    maxTokens: 300_000 },
  starter: { maxRequests: 1_500, maxTokens: 20_000_000 },
  pro:     { maxRequests: 3_500, maxTokens: 50_000_000 },
  studio:  { maxRequests: null,  maxTokens: null },
};

function norm(s: string | undefined): string {
  return (s ?? '').trim().toLowerCase();
}

/**
 * Derive assistant quota tier from org subscription snapshot (organizations/{orgId}.subscription).
 */
export function subscriptionAiPlanTier(sub: OrgSubscriptionSnapshot | undefined): AssistantAiPlanTier {
  if (!sub) return 'starter';
  const kind = norm(sub.planKind);
  const status = norm(sub.status);

  if (kind.includes('studio') || kind.includes('enterprise')) return 'studio';
  if (sub.packageTrack === 'gym') return 'studio';  // all gym tiers → unlimited
  if (status === 'trial') return 'trial';

  // Upper solo tiers (S50+) → pro limits; S10–S35 → starter
  const tierId = sub.capacityTierId;
  const monthly = typeof sub.monthlyAiCredits === 'number' ? sub.monthlyAiCredits : 0;
  if (tierId === 'S50' || tierId === 'S75' || tierId === 'S100') return 'pro';
  if (!tierId && monthly >= 85) return 'pro';  // fallback for orgs missing capacityTierId
  return 'starter';
}

export function assistantPlanLimits(tier: AssistantAiPlanTier): AssistantAiPlanLimits {
  return ASSISTANT_AI_PLAN_LIMITS[tier];
}
