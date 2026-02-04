/**
 * Firestore Aggregation Functions
 * 
 * Implements write-time aggregation pattern for efficient dashboard queries.
 * Updates system_stats/global_metrics and organization-level stats atomically.
 */

import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import type { Change } from 'firebase-functions';

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
  return getDb().doc('system_stats/global_metrics');
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

    // Update MRR if subscription amount exists AND not comped
    const amountFils = afterData?.subscription?.amountFils || 0;
    const isComped = afterData?.subscription?.isComped === true;
    if (amountFils > 0 && afterData?.subscription?.status === 'active' && !isComped) {
      await updateSystemStats({ monthlyRecurringRevenueFils: amountFils });
    }
  } else if (isDeleted) {
    // Organization deleted
    await updateSystemStats({ totalOrgs: -1 });

    if (beforeData?.subscription?.status === 'trial') {
      await updateSystemStats({ trialOrgs: -1 });
    } else if (beforeData?.subscription?.status === 'active') {
      await updateSystemStats({ activeOrgs: -1 });
    }

    const amountFils = beforeData?.subscription?.amountFils || 0;
    const isComped = beforeData?.subscription?.isComped === true;
    if (amountFils > 0 && beforeData?.subscription?.status === 'active' && !isComped) {
      await updateSystemStats({ monthlyRecurringRevenueFils: -amountFils });
    }
  } else if (isUpdated) {
    // Subscription status changed
    const beforeStatus = beforeData?.subscription?.status;
    const afterStatus = afterData?.subscription?.status;

    // Handle trial status changes
    if (beforeStatus === 'trial' && afterStatus !== 'trial') {
      await updateSystemStats({ trialOrgs: -1 });
      if (afterStatus === 'active') {
        await updateSystemStats({ activeOrgs: 1 });
      }
    } else if (beforeStatus !== 'trial' && afterStatus === 'trial') {
      await updateSystemStats({ trialOrgs: 1 });
      if (beforeStatus === 'active') {
        await updateSystemStats({ activeOrgs: -1 });
      }
    }

    // Handle active status changes
    if (beforeStatus === 'active' && afterStatus !== 'active') {
      await updateSystemStats({ activeOrgs: -1 });
      const amountFils = beforeData?.subscription?.amountFils || 0;
      const wasComped = beforeData?.subscription?.isComped === true;
      if (amountFils > 0 && !wasComped) {
        await updateSystemStats({ monthlyRecurringRevenueFils: -amountFils });
      }
    } else if (beforeStatus !== 'active' && afterStatus === 'active') {
      await updateSystemStats({ activeOrgs: 1 });
      const amountFils = afterData?.subscription?.amountFils || 0;
      const isComped = afterData?.subscription?.isComped === true;
      if (amountFils > 0 && !isComped) {
        await updateSystemStats({ monthlyRecurringRevenueFils: amountFils });
      }
    }

    // Handle subscription amount changes (for active subscriptions, excluding comped)
    if (afterStatus === 'active') {
      const isComped = afterData?.subscription?.isComped === true;
      if (!isComped) {
        const beforeAmount = beforeData?.subscription?.amountFils || 0;
        const afterAmount = afterData?.subscription?.amountFils || 0;
        const diff = afterAmount - beforeAmount;
        if (diff !== 0) {
          await updateSystemStats({ monthlyRecurringRevenueFils: diff });
        }
      }
    }
    
    // Handle comped status changes (need to adjust MRR when org becomes comped/uncomped)
    const beforeComped = beforeData?.subscription?.isComped === true;
    const afterComped = afterData?.subscription?.isComped === true;
    if (beforeComped !== afterComped && afterStatus === 'active') {
      const amountFils = afterData?.subscription?.amountFils || 0;
      if (amountFils > 0) {
        // If becoming comped, remove from MRR. If becoming uncomped, add to MRR.
        const mrrdiff = afterComped ? -amountFils : amountFils;
        await updateSystemStats({ monthlyRecurringRevenueFils: mrrdiff });
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
 */
export async function handleAssessmentChange(
  change: Change<admin.firestore.DocumentSnapshot>,
): Promise<void> {
  const beforeData = change.before.data();
  const afterData = change.after.data();
  const isCreated = !change.before.exists && change.after.exists;
  const isDeleted = change.before.exists && !change.after.exists;

  if (!isCreated && !isDeleted) return;

  // Try to get organizationId from various possible locations
  const orgId = 
    afterData?.organizationId || 
    beforeData?.organizationId ||
    afterData?.coachUid || // Fallback: may need to look up coach's org
    beforeData?.coachUid;

  if (isCreated) {
    await updateSystemStats({ totalAssessments: 1 });
    await updateOrgStats(orgId, { assessmentCount: 1 });
    
    // Update last assessment date separately (not an increment)
    if (orgId) {
      try {
        const orgRef = getDb().doc(`organizations/${orgId}`);
        await orgRef.set({
          'stats.lastAssessmentDate': admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      } catch (error) {
        logger.error(`Error updating lastAssessmentDate for org ${orgId}:`, error);
      }
    }
  } else if (isDeleted) {
    await updateSystemStats({ totalAssessments: -1 });
    await updateOrgStats(orgId, { assessmentCount: -1 });
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

  if (!isCreated && !isDeleted) return;

  const orgId = afterData?.organizationId || beforeData?.organizationId;
  
  // Handle both new (costFils) and legacy (costEstimate) fields
  // costFils is in fils (1 KWD = 1000 fils)
  // costEstimate is in USD (legacy), convert to fils: USD * 0.305 KWD/USD * 1000 fils/KWD
  const data = afterData || beforeData;
  let costFils = data?.costFils || 0;
  
  // Backward compatibility: convert legacy costEstimate (USD) to fils
  if (costFils === 0 && data?.costEstimate) {
    // Convert USD to KWD, then to fils: USD * 0.305 KWD/USD * 1000 fils/KWD
    costFils = Math.ceil(data.costEstimate * 0.305 * 1000);
  }
  
  const tokensUsed = data?.tokensUsed || 0;

  // Check if this usage is from current month
  const usageDate = (afterData || beforeData)?.timestamp?.toDate?.() || new Date();
  const now = new Date();
  const isCurrentMonth = 
    usageDate.getFullYear() === now.getFullYear() &&
    usageDate.getMonth() === now.getMonth();

  if (isCreated) {
    await updateSystemStats({
      totalAiTokensUsed: tokensUsed,
      totalAiCostsFils: costFils,
    });

    if (isCurrentMonth && orgId) {
      await updateOrgStats(orgId, { aiCostsMtdFils: costFils });
    }

    if (orgId) {
      await updateOrgStats(orgId, { totalAiCostsFils: costFils });
    }
  } else if (isDeleted) {
    await updateSystemStats({
      totalAiTokensUsed: -tokensUsed,
      totalAiCostsFils: -costFils,
    });

    if (isCurrentMonth && orgId) {
      await updateOrgStats(orgId, { aiCostsMtdFils: -costFils });
    }

    if (orgId) {
      await updateOrgStats(orgId, { totalAiCostsFils: -costFils });
    }
  }
}

