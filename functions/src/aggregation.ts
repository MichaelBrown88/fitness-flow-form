/**
 * Firestore Aggregation Functions
 * 
 * Implements write-time aggregation pattern for efficient dashboard queries.
 * Updates platform-stats/global-metrics and organization-level stats atomically.
 */

import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import type { Change } from 'firebase-functions';
import { filsToGbpPence } from './currency';
import { alertCapacityHit } from './slackBillingAlerts';
import {
  currencyRatesFromFirestoreDoc,
  DEFAULT_CURRENCY_RATES,
  subscriptionSmallestUnitToGbpPence,
  type CurrencyRatesForReporting,
} from './shared/reportingFx';
import { getLogCostFils } from './aiPricing';
import { firestoreValueToDate as toDate } from './firestoreTimestamp';

/**
 * Get Firestore instance (lazy initialization)
 */
function getDb() {
  return admin.firestore();
}

/**
 * Get system stats document reference
 */
function getSystemStatsDoc() {
  return getDb().doc('platform-stats/global-metrics');
}

function getLocalLogCostFils(data: admin.firestore.DocumentData | undefined): number {
  return getLogCostFils((data ?? {}) as Record<string, unknown>);
}

function getLogTokens(data: admin.firestore.DocumentData | undefined): number {
  const meta = data?.metadata as Record<string, unknown> | undefined;
  return Number(data?.tokensUsed ?? meta?.tokensUsed ?? 0);
}

function getLogOrgId(data: admin.firestore.DocumentData | undefined): string | undefined {
  if (typeof data?.organizationId === 'string' && data.organizationId.trim()) {
    return data.organizationId;
  }
  const meta = data?.metadata as Record<string, unknown> | undefined;
  const orgId = meta?.organizationId;
  return typeof orgId === 'string' && orgId.trim() ? orgId : undefined;
}

function getLogDate(data: admin.firestore.DocumentData | undefined): Date {
  return (
    toDate(data?.timestamp) ??
    toDate((data?.metadata as Record<string, unknown> | undefined)?.timestamp) ??
    toDate(data?.createdAt) ??
    new Date()
  );
}

/**
 * Atomically update system stats counters
 */
async function updateSystemStats(
  increments: Record<string, number>,
): Promise<void> {
  try {
    const updates: Record<string, admin.firestore.FieldValue> = {
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Convert all increments to FieldValue.increment()
    Object.entries(increments).forEach(([field, value]) => {
      updates[field] = admin.firestore.FieldValue.increment(value);
    });

    await getSystemStatsDoc().set(updates, { merge: true });
    logger.debug('System stats updated:', increments);
  } catch (error) {
    logger.error('Error updating system stats:', error);
    throw error;
  }
}

/** Currency rate cache — refreshed once per function instance cold-start */
let cachedRates: CurrencyRatesForReporting | null = null;

async function getCurrencyRates(): Promise<CurrencyRatesForReporting> {
  if (cachedRates) return cachedRates;
  try {
    const configSnap = await getDb().doc('platform/config').get();
    cachedRates = currencyRatesFromFirestoreDoc(configSnap.data() as Record<string, unknown> | undefined);
    return cachedRates;
  } catch {
    cachedRates = DEFAULT_CURRENCY_RATES;
    return cachedRates;
  }
}

/** Convert org subscription amount to GBP pence for MRR aggregation */
async function subscriptionAmountToGbpPence(sub: { amountCents?: number; amountFils?: number; currency?: string } | undefined): Promise<number> {
  if (!sub) return 0;
  const amountSmallest = sub.amountCents ?? sub.amountFils ?? 0;
  const currency = sub.currency || 'KWD';
  const rates = await getCurrencyRates();
  return subscriptionSmallestUnitToGbpPence(amountSmallest, currency, rates);
}

/**
 * Update coach-level stats in organizations/{orgId}/coaches/{coachUid}
 */
async function updateCoachStats(
  orgId: string | null | undefined,
  coachUid: string | null | undefined,
  increments: Record<string, number>,
): Promise<void> {
  if (!orgId || !coachUid) return;

  try {
    const coachRef = getDb().doc(`organizations/${orgId}/coaches/${coachUid}`);
    const updates: Record<string, admin.firestore.FieldValue> = {
      'stats.lastUpdated': admin.firestore.FieldValue.serverTimestamp(),
    };
    Object.entries(increments).forEach(([field, value]) => {
      updates[`stats.${field}`] = admin.firestore.FieldValue.increment(value);
    });
    await coachRef.set(updates, { merge: true });
    logger.debug(`Coach ${coachUid} in org ${orgId} stats updated:`, increments);
  } catch (error) {
    logger.error(`Error updating coach ${coachUid} stats in org ${orgId}:`, error);
  }
}

/**
 * Update organization-level stats
 */
async function updateOrgStats(
  orgId: string | null | undefined,
  increments: Record<string, number>,
): Promise<void> {
  if (!orgId) {
    logger.warn('No organizationId provided for org stats update');
    return;
  }

  try {
    const orgRef = getDb().doc(`organizations/${orgId}`);
    const updates: Record<string, admin.firestore.FieldValue> = {
      'stats.lastUpdated': admin.firestore.FieldValue.serverTimestamp(),
    };

    Object.entries(increments).forEach(([field, value]) => {
      updates[`stats.${field}`] = admin.firestore.FieldValue.increment(value);
    });

    await orgRef.set(updates, { merge: true });
    logger.debug(`Org ${orgId} stats updated:`, increments);
  } catch (error) {
    logger.error(`Error updating org ${orgId} stats:`, error);
    // Don't throw - allow main flow to continue
  }
}

/**
 * Handle organization document changes
 */
export async function handleOrganizationChange(
  change: Change<admin.firestore.DocumentSnapshot>,
): Promise<void> {
  const beforeData = change.before.data();
  const afterData = change.after.data();
  const isCreated = !change.before.exists && change.after.exists;
  const isDeleted = change.before.exists && !change.after.exists;
  const isUpdated = change.before.exists && change.after.exists;

  if (isCreated) {
    // New organization created
    await updateSystemStats({ totalOrgs: 1 });

    // Check if it's trial/active
    if (afterData?.subscription?.status === 'trial') {
      await updateSystemStats({ trialOrgs: 1 });
    } else if (afterData?.subscription?.status === 'active') {
      await updateSystemStats({ activeOrgs: 1 });
    }

    // Update MRR if subscription amount exists (store in GBP pence)
    const gbpPence = await subscriptionAmountToGbpPence(afterData?.subscription);
    if (gbpPence > 0 && afterData?.subscription?.status === 'active') {
      await updateSystemStats({ monthlyRecurringRevenueGbpPence: gbpPence });
    }

  } else if (isDeleted) {
    // Organization deleted
    await updateSystemStats({ totalOrgs: -1 });

    if (beforeData?.subscription?.status === 'trial') {
      await updateSystemStats({ trialOrgs: -1 });
    } else if (beforeData?.subscription?.status === 'active') {
      await updateSystemStats({ activeOrgs: -1 });
    }

    const gbpPence = await subscriptionAmountToGbpPence(beforeData?.subscription);
    if (gbpPence > 0 && beforeData?.subscription?.status === 'active') {
      await updateSystemStats({ monthlyRecurringRevenueGbpPence: -gbpPence });
    }
  } else if (isUpdated) {
    // Subscription status changed
    const beforeStatus = beforeData?.subscription?.status;
    const afterStatus = afterData?.subscription?.status;

    // Handle trial status changes
    if (beforeStatus === 'trial' && afterStatus !== 'trial') {
      await updateSystemStats({ trialOrgs: -1 });
      if (afterStatus === 'active') {
        await updateSystemStats({ activeOrgs: 1, trialConversionsThisMonth: 1, trialConversionsLifetime: 1 });
      }
    } else if (beforeStatus !== 'trial' && afterStatus === 'trial') {
      await updateSystemStats({ trialOrgs: 1 });
      if (beforeStatus === 'active') {
        await updateSystemStats({ activeOrgs: -1 });
      }
    }

    // Handle active status changes
    if (beforeStatus === 'active' && afterStatus !== 'active') {
      const churnIncrement = afterStatus === 'cancelled' ? 1 : 0;
      await updateSystemStats({
        activeOrgs: -1,
        ...(churnIncrement > 0 && { churnsThisMonth: churnIncrement, churnsLifetime: churnIncrement }),
      });
      const gbpPence = await subscriptionAmountToGbpPence(beforeData?.subscription);
      if (gbpPence > 0) {
        await updateSystemStats({ monthlyRecurringRevenueGbpPence: -gbpPence });
      }
    } else if (beforeStatus !== 'active' && afterStatus === 'active') {
      await updateSystemStats({ activeOrgs: 1 });
      const gbpPence = await subscriptionAmountToGbpPence(afterData?.subscription);
      if (gbpPence > 0) {
        await updateSystemStats({ monthlyRecurringRevenueGbpPence: gbpPence });
      }
    }

    // Handle subscription amount changes (for active subscriptions)
    if (afterStatus === 'active') {
      const beforeGbp = await subscriptionAmountToGbpPence(beforeData?.subscription);
      const afterGbp = await subscriptionAmountToGbpPence(afterData?.subscription);
      const diff = afterGbp - beforeGbp;
      if (diff !== 0) {
        await updateSystemStats({ monthlyRecurringRevenueGbpPence: diff });
      }
    }
  }
}

/**
 * Handle user profile changes (coaches/clients)
 */
export async function handleUserProfileChange(
  change: Change<admin.firestore.DocumentSnapshot>,
): Promise<void> {
  const beforeData = change.before.data();
  const afterData = change.after.data();
  const isCreated = !change.before.exists && change.after.exists;
  const isDeleted = change.before.exists && !change.after.exists;

  if (!isCreated && !isDeleted) return; // Only handle creates/deletes

  const role = (afterData || beforeData)?.role;
  const orgId = (afterData || beforeData)?.organizationId;

  if (isCreated) {
    if (role === 'coach' || role === 'org_admin') {
      await updateSystemStats({ totalCoaches: 1 });
      await updateOrgStats(orgId, { coachCount: 1 });
    } else if (role === 'client') {
      await updateSystemStats({ totalClients: 1 });
      await updateOrgStats(orgId, { clientCount: 1 });
    }
  } else if (isDeleted) {
    if (role === 'coach' || role === 'org_admin') {
      await updateSystemStats({ totalCoaches: -1 });
      await updateOrgStats(orgId, { coachCount: -1 });
    } else if (role === 'client') {
      await updateSystemStats({ totalClients: -1 });
      await updateOrgStats(orgId, { clientCount: -1 });
    }
  }
}

/**
 * Handle assessment changes
 * Supports create, update (re-assessments), and delete.
 * @param orgIdFromPath - Optional org ID from document path (for organizations/{orgId}/assessments)
 */
export async function handleAssessmentChange(
  change: Change<admin.firestore.DocumentSnapshot>,
  orgIdFromPath?: string,
): Promise<void> {
  const beforeData = change.before.data();
  const afterData = change.after.data();
  const isCreated = !change.before.exists && change.after.exists;
  const isDeleted = change.before.exists && !change.after.exists;
  const isUpdated = change.before.exists && change.after.exists;

  const orgId =
    orgIdFromPath ||
    afterData?.organizationId ||
    beforeData?.organizationId ||
    afterData?.coachUid ||
    beforeData?.coachUid;

  const updateLastAssessmentDate = async (id: string | undefined) => {
    if (!id) return;
    try {
      const orgRef = getDb().doc(`organizations/${id}`);
      await orgRef.set(
        { 'stats.lastAssessmentDate': admin.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );
    } catch (error) {
      logger.error(`Error updating lastAssessmentDate for org ${id}:`, error);
    }
  };

  const coachUid = afterData?.coachUid || afterData?.assignedCoachUid || beforeData?.coachUid || beforeData?.assignedCoachUid;

  if (isCreated) {
    const createdAt =
      toDate(afterData?.createdAt) ?? toDate(afterData?.timestamp) ?? new Date();
    const now = new Date();
    const isCurrentMonth = createdAt.getFullYear() === now.getFullYear() && createdAt.getMonth() === now.getMonth();

    await updateSystemStats({ totalAssessments: 1 });
    await updateOrgStats(orgId, { assessmentCount: 1, ...(isCurrentMonth && { assessmentsThisMonth: 1 }) });
    if (coachUid) await updateCoachStats(orgId, coachUid, { assessmentCount: 1 });

    if (isCurrentMonth) {
      await updateSystemStats({ assessments_this_month: 1 });
    }

    await updateLastAssessmentDate(orgId);
  } else if (isUpdated) {
    const beforeCount = typeof beforeData?.assessmentCount === 'number' ? beforeData.assessmentCount : 0;
    const afterCount = typeof afterData?.assessmentCount === 'number' ? afterData.assessmentCount : 0;
    const delta = afterCount - beforeCount;

    const updatedAt =
      toDate(afterData?.updatedAt) ?? toDate(afterData?.createdAt) ?? new Date();
    const now = new Date();
    const isCurrentMonth =
      updatedAt.getFullYear() === now.getFullYear() && updatedAt.getMonth() === now.getMonth();

    if (delta > 0) {
      const orgIncrements: Record<string, number> = { assessmentCount: delta };
      if (isCurrentMonth) orgIncrements.assessmentsThisMonth = delta;
      await updateSystemStats({ totalAssessments: delta });
      await updateOrgStats(orgId, orgIncrements);
      if (coachUid) await updateCoachStats(orgId, coachUid, { assessmentCount: delta });

      if (isCurrentMonth) {
        await updateSystemStats({ assessments_this_month: delta });
      }
    }

    await updateLastAssessmentDate(orgId);
  } else if (isDeleted) {
    const deletedCoachUid = beforeData?.coachUid || beforeData?.assignedCoachUid;
    const deletedAt =
      toDate(beforeData?.createdAt) ?? toDate(beforeData?.timestamp) ?? new Date();
    const now = new Date();
    const wasCurrentMonth = deletedAt.getFullYear() === now.getFullYear() && deletedAt.getMonth() === now.getMonth();
    // Decrement by the full assessmentCount (full + pillar sessions) not just -1
    const totalSessionCount = typeof beforeData?.assessmentCount === 'number' && beforeData.assessmentCount > 0
      ? beforeData.assessmentCount
      : 1;
    const orgDecrements: Record<string, number> = { assessmentCount: -totalSessionCount };
    if (wasCurrentMonth) orgDecrements.assessmentsThisMonth = -totalSessionCount;
    await updateSystemStats({ totalAssessments: -totalSessionCount });
    await updateOrgStats(orgId, orgDecrements);
    if (deletedCoachUid) {
      await updateCoachStats(orgId, deletedCoachUid, { assessmentCount: -totalSessionCount });
    }

    if (wasCurrentMonth) {
      await updateSystemStats({ assessments_this_month: -totalSessionCount });
    }
  }
}

function isBillingActiveClientStatus(status: unknown): boolean {
  return status !== 'archived';
}

/**
 * Handle client changes in organizations/{orgId}/clients
 * Updates stats.clientCount (non-archived only) and platform-stats.totalClients.
 */
export async function handleClientChange(
  change: Change<admin.firestore.DocumentSnapshot>,
  orgIdFromPath?: string,
): Promise<void> {
  const isCreated = !change.before.exists && change.after.exists;
  const isDeleted = change.before.exists && !change.after.exists;
  const isUpdated = change.before.exists && change.after.exists;

  const orgId = orgIdFromPath ?? change.after.data()?.organizationId ?? change.before.data()?.organizationId;

  if (isCreated) {
    const status = change.after.data()?.status;
    if (isBillingActiveClientStatus(status)) {
      await updateSystemStats({ totalClients: 1 });
      await updateOrgStats(orgId, { clientCount: 1 });

      // Capacity alerting: fire once when crossing 80% or hitting the cap.
      // Reads are cheap here; fire-and-forget (non-blocking to the write path).
      if (orgId) {
        void checkAndAlertCapacity(orgId).catch((err) =>
          logger.warn('[handleClientChange] Capacity check failed', err),
        );
      }
    }
    return;
  }

  if (isDeleted) {
    const status = change.before.data()?.status;
    if (isBillingActiveClientStatus(status)) {
      await updateSystemStats({ totalClients: -1 });
      await updateOrgStats(orgId, { clientCount: -1 });
    }
    return;
  }

  if (isUpdated) {
    const beforeStatus = change.before.data()?.status;
    const afterStatus = change.after.data()?.status;
    const beforeActive = isBillingActiveClientStatus(beforeStatus);
    const afterActive = isBillingActiveClientStatus(afterStatus);
    if (beforeActive && !afterActive) {
      await updateSystemStats({ totalClients: -1 });
      await updateOrgStats(orgId, { clientCount: -1 });
    } else if (!beforeActive && afterActive) {
      await updateSystemStats({ totalClients: 1 });
      await updateOrgStats(orgId, { clientCount: 1 });
    }
  }
}

/**
 * Check org client count vs subscription cap and alert if at 80% or full.
 * Only fires on the exact crossing point to avoid repeated alerts.
 */
async function checkAndAlertCapacity(orgId: string): Promise<void> {
  const db = getDb();
  const [orgSnap, statsSnap] = await Promise.all([
    db.doc(`organizations/${orgId}`).get(),
    db.doc(`organizations/${orgId}/stats/summary`).get(),
  ]);
  const orgData = orgSnap.data();
  // clientCap comes from subscription; fall back to legacy fields
  const clientCap: number =
    orgData?.subscription?.clientCap ??
    orgData?.subscription?.clientSeats ??
    orgData?.subscription?.clientCount ??
    0;
  if (!clientCap) return; // free tier or no subscription; nothing to check

  // Current active-client count — use stats doc if available, else org field
  const statsData = statsSnap.data();
  const currentCount: number = statsData?.clientCount ?? orgData?.stats?.clientCount ?? 0;
  const prevCount = currentCount - 1; // we just incremented by 1

  const pct = currentCount / clientCap;
  const prevPct = prevCount / clientCap;

  if (currentCount >= clientCap && prevCount < clientCap) {
    // Crossed into full
    await alertCapacityHit({
      orgId,
      orgName: orgData?.name as string | undefined,
      clientCount: currentCount,
      clientCap,
      level: 'full',
    });
  } else if (pct >= 0.8 && prevPct < 0.8) {
    // Crossed 80% warning threshold
    await alertCapacityHit({
      orgId,
      orgName: orgData?.name as string | undefined,
      clientCount: currentCount,
      clientCap,
      level: 'warning',
    });
  }
}

/**
 * Handle AI usage log changes (for cost tracking)
 */
export async function handleAIUsageChange(
  change: Change<admin.firestore.DocumentSnapshot>,
): Promise<void> {
  const beforeData = change.before.data();
  const afterData = change.after.data();
  const isCreated = !change.before.exists && change.after.exists;
  const isDeleted = change.before.exists && !change.after.exists;
  const isUpdated = change.before.exists && change.after.exists;

  if (!isCreated && !isDeleted && !isUpdated) return;

  const now = new Date();
  const isInCurrentMonth = (date: Date) =>
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();

  const beforeCostGbpPence = filsToGbpPence(getLocalLogCostFils(beforeData));
  const afterCostGbpPence = filsToGbpPence(getLocalLogCostFils(afterData));
  const beforeTokens = getLogTokens(beforeData);
  const afterTokens = getLogTokens(afterData);
  const beforeOrgId = getLogOrgId(beforeData);
  const afterOrgId = getLogOrgId(afterData);
  const beforeUsageDate = getLogDate(beforeData);
  const afterUsageDate = getLogDate(afterData);
  const beforeIsCurrentMonth = isInCurrentMonth(beforeUsageDate);
  const afterIsCurrentMonth = isInCurrentMonth(afterUsageDate);
  if (isCreated) {
    await updateSystemStats({
      totalAiTokensUsed: afterTokens,
      totalAiCostsGbpPence: afterCostGbpPence,
      ...(afterIsCurrentMonth && { aiCostsMtdGbpPence: afterCostGbpPence }),
    });

    if (afterIsCurrentMonth && afterOrgId) {
      await updateOrgStats(afterOrgId, { aiCostsMtdGbpPence: afterCostGbpPence });
    }

    if (afterOrgId) {
      await updateOrgStats(afterOrgId, { totalAiCostsGbpPence: afterCostGbpPence });

      // Track feature usage on the org doc (for platform admin health dashboard)
      const featureType = afterData?.type as string | undefined;
      const featureMap: Record<string, string> = {
        posture_analysis: 'posture-ai',
        ocr_inbody: 'body-comp-ocr',
        coach_assistant_response: 'ai-assistant',
        exercise_recommendation: 'ai-recommendations',
        comparison_narrative: 'ai-narrative',
      };
      const featureTag = featureType ? featureMap[featureType] : undefined;
      if (featureTag) {
        await getDb().doc(`organizations/${afterOrgId}`).update({
          featuresUsed: admin.firestore.FieldValue.arrayUnion(featureTag),
        }).catch(() => { /* non-fatal */ });
      }
    }
  } else if (isUpdated) {
    const systemMtdDelta =
      (afterIsCurrentMonth ? afterCostGbpPence : 0) -
      (beforeIsCurrentMonth ? beforeCostGbpPence : 0);
    await updateSystemStats({
      totalAiTokensUsed: afterTokens - beforeTokens,
      totalAiCostsGbpPence: afterCostGbpPence - beforeCostGbpPence,
      ...(systemMtdDelta !== 0 && { aiCostsMtdGbpPence: systemMtdDelta }),
    });

    if (beforeOrgId && beforeOrgId === afterOrgId) {
      const orgMtdDelta =
        (afterIsCurrentMonth ? afterCostGbpPence : 0) -
        (beforeIsCurrentMonth ? beforeCostGbpPence : 0);
      await updateOrgStats(beforeOrgId, {
        totalAiCostsGbpPence: afterCostGbpPence - beforeCostGbpPence,
        ...(orgMtdDelta !== 0 && { aiCostsMtdGbpPence: orgMtdDelta }),
      });
    } else {
      if (beforeOrgId) {
        await updateOrgStats(beforeOrgId, {
          totalAiCostsGbpPence: -beforeCostGbpPence,
          ...(beforeIsCurrentMonth && { aiCostsMtdGbpPence: -beforeCostGbpPence }),
        });
      }
      if (afterOrgId) {
        await updateOrgStats(afterOrgId, {
          totalAiCostsGbpPence: afterCostGbpPence,
          ...(afterIsCurrentMonth && { aiCostsMtdGbpPence: afterCostGbpPence }),
        });
      }
    }
  } else if (isDeleted) {
    await updateSystemStats({
      totalAiTokensUsed: -beforeTokens,
      totalAiCostsGbpPence: -beforeCostGbpPence,
      ...(beforeIsCurrentMonth && { aiCostsMtdGbpPence: -beforeCostGbpPence }),
    });

    if (beforeIsCurrentMonth && beforeOrgId) {
      await updateOrgStats(beforeOrgId, { aiCostsMtdGbpPence: -beforeCostGbpPence });
    }

    if (beforeOrgId) {
      await updateOrgStats(beforeOrgId, { totalAiCostsGbpPence: -beforeCostGbpPence });
    }
  }
}

