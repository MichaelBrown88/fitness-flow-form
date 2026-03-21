/**
 * Client capacity + AI credits from the organization document (realtime).
 */

import { useMemo, useEffect, useState, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { getDb } from '@/services/firebase';
import {
  FREE_TIER_CLIENT_LIMIT,
  FREE_TIER_MONTHLY_AI_CREDITS,
  UNLIMITED_CREDITS,
  getPaidTierByClientCount,
  getPaidTierById,
  isPaidCapacityTierId,
  type PaidCapacityTierId,
  type PackageTrack,
} from '@/constants/pricing';

export interface ClientCapacityState {
  loading: boolean;
  /** Paid tier id from Firestore, if any */
  capacityTierId: PaidCapacityTierId | null;
  currentTierLabel: string;
  clientLimit: number;
  clientCount: number;
  aiCredits: number | null;
  aiCreditLimit: number;
  canAddClient: boolean;
  canUseAIAssessment: boolean;
  atClientLimit: boolean;
  isApproachingClientLimit: boolean;
  planKind?: string;
  /** Track used for next-tier pricing copy (solo vs gym). */
  upgradeTrack: PackageTrack;
}

function tierLabel(tierId: string | null | undefined, clientLimit: number, planKind?: string): string {
  if (tierId && isPaidCapacityTierId(tierId)) {
    const row = getPaidTierById(tierId);
    return row?.label ?? `Package ${tierId}`;
  }
  if (planKind === 'solo_free' || clientLimit <= FREE_TIER_CLIENT_LIMIT) return 'Free plan';
  return `Up to ${clientLimit} clients`;
}

export function useClientCapacity(): ClientCapacityState & {
  getUpgradeRecommendation: (desiredClients: number) => ReturnType<typeof getPaidTierByClientCount>;
} {
  const { profile } = useAuth();
  const orgId = profile?.organizationId;
  const [loading, setLoading] = useState(true);
  const [raw, setRaw] = useState<{
    sub: Record<string, unknown>;
    statsClientCount: number;
    assessmentCredits: number | null;
  } | null>(null);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      setRaw(null);
      return;
    }
    setLoading(true);
    const ref = doc(getDb(), 'organizations', orgId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setRaw(null);
          setLoading(false);
          return;
        }
        const d = snap.data();
        const sub = (d.subscription as Record<string, unknown>) ?? {};
        const stats = (d.stats as Record<string, unknown>) ?? {};
        const sc = typeof stats.clientCount === 'number' ? stats.clientCount : 0;
        const credits =
          typeof d.assessmentCredits === 'number' ? d.assessmentCredits : null;
        setRaw({ sub, statsClientCount: sc, assessmentCredits: credits });
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, [orgId]);

  const derived = useMemo(() => {
    if (!raw) {
      return {
        capacityTierId: null as PaidCapacityTierId | null,
        currentTierLabel: 'Free plan',
        clientLimit: FREE_TIER_CLIENT_LIMIT,
        clientCount: 0,
        aiCredits: null as number | null,
        aiCreditLimit: FREE_TIER_MONTHLY_AI_CREDITS,
        canAddClient: true,
        canUseAIAssessment: true,
        atClientLimit: false,
        isApproachingClientLimit: false,
        planKind: undefined,
        upgradeTrack: 'solo' as PackageTrack,
      };
    }
    const sub = raw.sub;
    const status = typeof sub.status === 'string' ? sub.status : 'trial';
    const planKind = typeof sub.planKind === 'string' ? sub.planKind : undefined;
    const paidActive = status === 'active' || status === 'trialing' || status === 'trial';
    const cap =
      typeof sub.clientCap === 'number'
        ? sub.clientCap
        : typeof sub.clientSeats === 'number'
          ? sub.clientSeats
          : typeof sub.clientCount === 'number'
            ? sub.clientCount
            : paidActive
              ? 10
              : FREE_TIER_CLIENT_LIMIT;

    const tierIdRaw = sub.capacityTierId;
    const capacityTierId: PaidCapacityTierId | null =
      typeof tierIdRaw === 'string' && isPaidCapacityTierId(tierIdRaw) ? tierIdRaw : null;

    const upgradeTrack: PackageTrack =
      sub.packageTrack === 'gym' || planKind === 'gym_trial' ? 'gym' : 'solo';

    const monthlyAi =
      typeof sub.monthlyAiCredits === 'number'
        ? sub.monthlyAiCredits
        : capacityTierId
          ? getPaidTierByClientCount(cap, upgradeTrack).monthlyAiCredits
          : paidActive
            ? getPaidTierByClientCount(cap, upgradeTrack).monthlyAiCredits
            : FREE_TIER_MONTHLY_AI_CREDITS;

    const aiCredits = raw.assessmentCredits;
    const isUnlimited =
      aiCredits === UNLIMITED_CREDITS || (aiCredits != null && aiCredits >= 9999);
    // Missing balance = permissive until webhook backfills credits (legacy orgs)
    const canUseAIAssessment = isUnlimited || aiCredits === null || aiCredits > 0;

    const count = raw.statsClientCount;
    const canAddClient = count < cap;
    const atClientLimit = !canAddClient;
    const isApproachingClientLimit = canAddClient && count >= cap - 1 && cap > 1;

    return {
      capacityTierId,
      currentTierLabel: tierLabel(capacityTierId, cap, planKind),
      clientLimit: cap,
      clientCount: count,
      aiCredits,
      aiCreditLimit: monthlyAi,
      canAddClient,
      canUseAIAssessment,
      atClientLimit,
      isApproachingClientLimit,
      planKind,
      upgradeTrack,
    };
  }, [raw]);

  const getUpgradeRecommendation = useCallback((desiredClients: number) => {
    const track = raw
      ? raw.sub.packageTrack === 'gym' || raw.sub.planKind === 'gym_trial'
        ? 'gym'
        : 'solo'
      : 'solo';
    return getPaidTierByClientCount(desiredClients, track);
  }, [raw]);

  return {
    loading,
    ...derived,
    getUpgradeRecommendation,
  };
}
