/**
 * usePlatformDataIntelligence
 *
 * Fetches pre-computed population analytics and milestone data from Firestore,
 * marks milestones as seen when the admin opens the Data Intelligence tab,
 * and exposes chart-ready data + a manual "Compute Now" trigger.
 */

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getDb, getFirebaseFunctions } from '@/services/firebase';
import { logger } from '@/lib/utils/logger';
import {
  TIER_DEFINITIONS,
  ANALYTICS_TIER_ORDER,
  type PopulationAnalytics,
  type MilestonesDoc,
  type MilestoneProgress,
  type PillarDistributionChartData,
  type GoalChartEntry,
  type PatternChartEntry,
  type AnalyticsTier,
  type PillarKey,
  type OutcomeFunnel,
  type EngagementCohort,
  type DataCompleteness,
} from '@/types/analytics';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PILLAR_LABELS: Record<PillarKey, string> = {
  overall: 'Overall',
  bodyComp: 'Body Composition',
  cardio: 'Cardio',
  strength: 'Strength',
  movementQuality: 'Movement',
  lifestyle: 'Lifestyle',
};

const GOAL_LABELS: Record<string, string> = {
  'weight-loss': 'Weight Loss',
  'build-muscle': 'Build Muscle',
  'build-strength': 'Build Strength',
  'body-recomposition': 'Body Recomp',
  'improve-fitness': 'Improve Fitness',
  'general-health': 'General Health',
};

const PATTERN_LABELS: Record<string, string> = {
  metabolic_risk: 'Metabolic Risk',
  structural_injury_risk: 'Structural Injury Risk',
  systemic_recovery_crisis: 'Recovery Crisis',
  structural_integrity_needed: 'Structural Integrity',
  hybrid_athlete: 'Hybrid Athlete',
  structural_mastery: 'Structural Mastery',
  metabolic_resilience: 'Metabolic Resilience',
  structural_durability: 'Structural Durability',
  rapid_adaptive_potential: 'Rapid Adaptation',
};

const NUTRITION_LABELS: Record<string, string> = {
  poor: 'Poor',
  fair: 'Fair',
  good: 'Good',
  excellent: 'Excellent',
};

const HYDRATION_LABELS: Record<string, string> = {
  poor: 'Poor',
  fair: 'Fair',
  good: 'Good',
  excellent: 'Excellent',
};

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentary',
  'lightly-active': 'Lightly Active',
  'moderately-active': 'Moderately Active',
  'very-active': 'Very Active',
  'extremely-active': 'Extremely Active',
};

const ALCOHOL_LABELS: Record<string, string> = {
  never: 'Rarely or never',
  occasionally: 'Occasionally (few times a month)',
  weekly: 'About once a week',
  'multiple-weekly': 'Several times a week',
  frequent: 'Most days',
  daily: 'Daily',
};

export const LIFESTYLE_LABEL_MAPS = {
  nutrition: NUTRITION_LABELS,
  hydration: HYDRATION_LABELS,
  activity: ACTIVITY_LABELS,
  alcohol: ALCOHOL_LABELS,
};

const PILLAR_IMPROVEMENT_LABELS: Record<string, string> = {
  bodyComp: 'Body Composition',
  cardio: 'Cardio',
  strength: 'Strength',
  movementQuality: 'Movement Quality',
  lifestyle: 'Lifestyle',
};

export { PILLAR_IMPROVEMENT_LABELS };

// ---------------------------------------------------------------------------
// Hook result type
// ---------------------------------------------------------------------------

export interface PlatformDataIntelligenceResult {
  loading: boolean;
  computing: boolean;
  populationData: PopulationAnalytics | null;
  milestonesData: MilestonesDoc | null;

  // Convenience — top-level uniqueClientCount falls back to the nested assessmentPatterns value
  uniqueClientCount: number;

  // New outcome / engagement fields (undefined when not yet computed)
  outcomeFunnel: OutcomeFunnel | undefined;
  engagementCohorts: EngagementCohort[] | undefined;
  dataCompleteness: DataCompleteness | undefined;
  /** ISO date string of the earliest session on the platform, e.g. '2024-01-15' */
  earliestSessionDate: string | undefined;
  /** % of longitudinal clients whose overall score improved ≥5 points */
  efficacyPct: number | null;

  // Chart-ready shapes
  pillarDistributions: PillarDistributionChartData[];
  goalChartData: GoalChartEntry[];
  patternChartData: PatternChartEntry[];
  milestoneProgress: MilestoneProgress | null;

  triggerCompute: () => Promise<void>;
  /** Callable `pushApexProductMetricsNow` — platform admin only. */
  triggerPushApexProductMetrics: () => Promise<PushApexProductMetricsNowResponse>;
  pushingApexProductMetrics: boolean;
  lastComputedLabel: string | null;
}

/** Matches Cloud Function return from `pushApexProductMetricsFromFirestore`. */
export type PushApexProductMetricsNowResponse = {
  pushed: boolean;
  reason?: string;
  metricsCount?: number;
  status?: number;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePlatformDataIntelligence(): PlatformDataIntelligenceResult {
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [pushingApexProductMetrics, setPushingApexProductMetrics] = useState(false);
  const [populationData, setPopulationData] = useState<PopulationAnalytics | null>(null);
  const [milestonesData, setMilestonesData] = useState<MilestonesDoc | null>(null);

  const fetchData = useCallback(async () => {
    const db = getDb();
    try {
      const [popSnap, milesSnap] = await Promise.all([
        getDoc(doc(db, 'platform-analytics/population')),
        getDoc(doc(db, 'platform-analytics/milestones')),
      ]);

      if (popSnap.exists()) {
        const raw = popSnap.data();
        setPopulationData({
          ...raw,
          computedAt: raw.computedAt instanceof Timestamp
            ? raw.computedAt.toDate()
            : new Date(raw.computedAt ?? Date.now()),
        } as PopulationAnalytics);
      } else {
        setPopulationData(null);
      }

      if (milesSnap.exists()) {
        const raw = milesSnap.data();
        setMilestonesData({
          ...raw,
          lastComputedAt: raw.lastComputedAt instanceof Timestamp
            ? raw.lastComputedAt.toDate()
            : new Date(raw.lastComputedAt ?? Date.now()),
          seenByAdminAt: raw.seenByAdminAt instanceof Timestamp
            ? raw.seenByAdminAt.toDate()
            : raw.seenByAdminAt ? new Date(raw.seenByAdminAt) : undefined,
        } as MilestonesDoc);
      } else {
        setMilestonesData(null);
      }
    } catch (err) {
      logger.error('usePlatformDataIntelligence: fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark milestones as seen when the tab is opened
  const markSeen = useCallback(async () => {
    try {
      const db = getDb();
      await updateDoc(doc(db, 'platform-analytics/milestones'), {
        seenByAdminAt: Timestamp.now(),
      });
    } catch {
      // Non-fatal — doc may not exist yet
    }
  }, []);

  useEffect(() => {
    void fetchData();
    void markSeen();
  }, [fetchData, markSeen]);

  // Manual "Compute Now" trigger
  const triggerCompute = useCallback(async () => {
    setComputing(true);
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'computePopulationAnalyticsNow');
      await fn({});
      await fetchData();
    } catch (err) {
      logger.error('usePlatformDataIntelligence: compute failed', err);
      throw err;
    } finally {
      setComputing(false);
    }
  }, [fetchData]);

  const triggerPushApexProductMetrics = useCallback(async () => {
    setPushingApexProductMetrics(true);
    try {
      const fn = httpsCallable<void, PushApexProductMetricsNowResponse>(
        getFirebaseFunctions(),
        'pushApexProductMetricsNow',
      );
      const res = await fn();
      return res.data;
    } catch (err) {
      logger.error('usePlatformDataIntelligence: push APEX product metrics failed', err);
      throw err;
    } finally {
      setPushingApexProductMetrics(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Derive chart data
  // ---------------------------------------------------------------------------

  const pillarDistributions: PillarDistributionChartData[] = populationData
    ? (Object.keys(populationData.scoreDistributions) as PillarKey[]).map(pillar => ({
        pillar,
        label: PILLAR_LABELS[pillar] ?? pillar,
        buckets: populationData.scoreDistributions[pillar],
      }))
    : [];

  const goalChartData: GoalChartEntry[] = populationData
    ? Object.entries(populationData.goalDistribution)
        .sort((a, b) => b[1] - a[1])
        .map(([key, value]) => ({
          name: GOAL_LABELS[key] ?? key,
          value,
        }))
    : [];

  // uniqueClientCount: top-level field (new) falls back to nested assessmentPatterns value (old)
  const uniqueClientCount: number =
    populationData?.uniqueClientCount ??
    populationData?.assessmentPatterns?.uniqueClientCount ??
    0;

  const patternChartData: PatternChartEntry[] = (() => {
    if (!populationData) return [];
    // Patterns are now counted per unique client so the denominator is uniqueClientCount,
    // not totalScoredAssessments (sessions). This gives accurate population prevalence %.
    const total = uniqueClientCount || populationData.totalScoredAssessments;
    return Object.entries(populationData.clinicalPatterns)
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({
        pattern: PATTERN_LABELS[key] ?? key,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }));
  })();

  const milestoneProgress: MilestoneProgress | null = (() => {
    const count = milestonesData?.totalScoredAssessments ?? populationData?.totalScoredAssessments;
    if (count === undefined) return null;

    const unlocked = (milestonesData?.unlockedTiers ?? []) as AnalyticsTier[];

    // Next locked tier
    const nextTierDef = TIER_DEFINITIONS.find(
      t => !unlocked.includes(t.tier) && t.threshold > 0,
    ) ?? null;

    const prevThreshold = nextTierDef
      ? (TIER_DEFINITIONS.find(
          (_, i, arr) => arr[i + 1]?.tier === nextTierDef.tier,
        )?.threshold ?? 0)
      : 0;

    const progressPct = nextTierDef
      ? Math.min(
          100,
          Math.round(
            ((count - prevThreshold) / (nextTierDef.threshold - prevThreshold)) * 100,
          ),
        )
      : 100;

    // New unlocks = tiers unlocked after seenByAdminAt
    const seenAt = milestonesData?.seenByAdminAt;
    const computedAt = milestonesData?.lastComputedAt;
    const hasNewUnlocks = !!(
      seenAt &&
      computedAt &&
      computedAt > seenAt &&
      unlocked.some(t => {
        const tier = ANALYTICS_TIER_ORDER.indexOf(t as AnalyticsTier);
        return tier >= 0;
      })
    );

    return { currentCount: count, nextTier: nextTierDef, progressPct, unlockedTiers: unlocked, hasNewUnlocks };
  })();

  const lastComputedLabel: string | null = (() => {
    const d = populationData?.computedAt ?? milestonesData?.lastComputedAt;
    if (!d) return null;
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  })();

  const outcomeFunnel = populationData?.outcomeFunnel;
  const engagementCohorts = populationData?.engagementCohorts;
  const dataCompleteness = populationData?.dataCompleteness;
  const earliestSessionDate = populationData?.earliestSessionDate;

  // Efficacy % — what share of longitudinal clients improved?
  const efficacyPct: number | null = (() => {
    const funnel = outcomeFunnel?.overall;
    if (!funnel || funnel.total === 0) {
      // Fall back to longitudinalInsights if outcomeFunnel not yet computed
      const li = populationData?.longitudinalInsights;
      if (!li || li.clientCount === 0) return null;
      return Math.round((li.clientsImproved / li.clientCount) * 100);
    }
    return Math.round((funnel.improved / funnel.total) * 100);
  })();

  return {
    loading,
    computing,
    populationData,
    milestonesData,
    uniqueClientCount,
    outcomeFunnel,
    engagementCohorts,
    dataCompleteness,
    earliestSessionDate,
    efficacyPct,
    pillarDistributions,
    goalChartData,
    patternChartData,
    milestoneProgress,
    triggerCompute,
    triggerPushApexProductMetrics,
    pushingApexProductMetrics,
    lastComputedLabel,
  };
}

// ---------------------------------------------------------------------------
// Lightweight milestone-only fetch for the tab badge (used in PlatformDashboard)
// ---------------------------------------------------------------------------

export async function fetchMilestoneBadgeState(): Promise<boolean> {
  try {
    const db = getDb();
    const snap = await getDoc(doc(db, 'platform-analytics/milestones'));
    if (!snap.exists()) return false;
    const data = snap.data();
    const seenAt: Date | undefined = data.seenByAdminAt instanceof Timestamp
      ? data.seenByAdminAt.toDate()
      : undefined;
    const computedAt: Date = data.lastComputedAt instanceof Timestamp
      ? data.lastComputedAt.toDate()
      : new Date();
    return !seenAt || computedAt > seenAt;
  } catch {
    return false;
  }
}
