/**
 * Platform Metrics Service
 *
 * Handles platform analytics and organization management:
 * - Live metrics and dashboard data
 * - Organization CRUD operations
 * - Subscription management
 * - Data access permissions (GDPR/HIPAA)
 */

import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  getCountFromServer,
  query,
  where,
  orderBy,
  startAfter,
  limit as firestoreLimit,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { calculateMonthlyFee } from '@/lib/pricing';
import type {
  PlatformMetrics,
  OrganizationSummary,
  OrganizationDetails,
} from '@/types/platform';
import { logger } from '@/lib/utils/logger';
import { COLLECTIONS } from '@/constants/collections';
import {
  getPlatformAdminsCollection,
  getOrganizationsCollection,
  getOrganizationDoc,
  getLegacyUserProfilesCollection,
  getSystemStatsDoc,
} from '@/lib/database/collections';
import { calculateAICostsMTD, getOrgAICostsByFeature } from './aiUsageTracking';

const PLATFORM_ADMIN_QUERY_LIMIT = 1;
const COACH_PROFILE_LIMIT = 500;
const ORG_LIST_LIMIT_MAX = 200;
const ORG_FILTER_BUFFER_MULTIPLIER = 3;
const COACH_ASSESSMENTS_LIMIT = 500;

/**
 * Get live platform metrics
 * This reads from ONE document instead of querying all collections (highly efficient!)
 * Currency is in fils (1 KWD = 1000 fils)
 */
export async function getLiveMetrics(): Promise<PlatformMetrics> {
  try {
    const db = getDb();

    // Read from aggregated system_stats document (single document read - extremely fast!)
    const systemStatsRef = getSystemStatsDoc();
    const systemStatsSnap = await getDoc(systemStatsRef);

    if (!systemStatsSnap.exists()) {
      logger.warn('system_stats/global_metrics does not exist yet. Returning defaults. Cloud Functions will populate it on next write.');
      return getDefaultMetrics();
    }

    const stats = systemStatsSnap.data();
    const now = new Date();

    // Calculate assessments this month by querying actual assessment data
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let assessmentsThisMonth = 0;
    try {
      // Query assessments from all coaches subcollections
      // We'll query coaches collection to find all coaches, then their assessments
      const coachProfilesQuery = query(
        getLegacyUserProfilesCollection(),
        where('role', 'in', ['coach', 'org_admin']),
        firestoreLimit(COACH_PROFILE_LIMIT)
      );
      const userProfilesSnapshot = await getDocs(coachProfilesQuery);
      const coachUids: string[] = [];

      userProfilesSnapshot.docs.forEach(userDoc => {
        coachUids.push(userDoc.id);
      });

      // Query assessments from each coach's subcollection
      for (const coachUid of coachUids) {
        try {
          const assessmentsRef = collection(db, COLLECTIONS.COACHES, coachUid, COLLECTIONS.ASSESSMENTS);
          const assessmentsQuery = query(assessmentsRef, firestoreLimit(COACH_ASSESSMENTS_LIMIT));
          const assessmentsSnapshot = await getDocs(assessmentsQuery);

          assessmentsSnapshot.docs.forEach(assessmentDoc => {
            const assessmentData = assessmentDoc.data();
            const createdAt = assessmentData.createdAt?.toDate?.() || assessmentData.timestamp?.toDate?.();
            if (createdAt && createdAt >= startOfMonth) {
              assessmentsThisMonth++;
            }
          });
        } catch (e) {
          // Skip coaches without assessments subcollection
          logger.debug(`No assessments for coach ${coachUid}`);
        }
      }
    } catch (error) {
      logger.warn('Error calculating assessments this month, using fallback:', error);
      // Fallback: use total assessments / 30 as rough estimate
      assessmentsThisMonth = Math.floor((stats.totalAssessments || 0) / 30);
    }

    // Calculate actual AI costs from logs (more accurate than aggregated stats)
    const aiCostsMtdCents = await calculateAICostsMTD();

    logger.debug(`Metrics loaded from system_stats (efficient single-read): totalOrgs=${stats.totalOrgs || 0}, activeOrgs=${stats.activeOrgs || 0}, mrrFils=${stats.monthlyRecurringRevenueFils || 0}`);

    return {
      totalOrganizations: stats.totalOrgs || 0,
      activeOrganizations: stats.activeOrgs || 0,
      trialOrganizations: stats.trialOrgs || 0,
      totalUsers: (stats.totalCoaches || 0) + (stats.totalClients || 0),
      totalCoaches: stats.totalCoaches || 0,
      totalClients: stats.totalClients || 0,
      mrrCents: stats.monthlyRecurringRevenueFils || 0, // Actually fils, not cents
      arrCents: (stats.monthlyRecurringRevenueFils || 0) * 12,
      aiCostsMtdCents: aiCostsMtdCents, // Calculate from actual logs
      aiCostsLastMonthCents: 0,
      totalAssessments: stats.totalAssessments || 0,
      assessmentsThisMonth,
      updatedAt: stats.lastUpdated?.toDate?.() || now,
    };
  } catch (error) {
    logger.error('Error fetching live metrics from system_stats:', error);
    return getDefaultMetrics();
  }
}

/**
 * Get assessment chart data for last 30 days
 */
export async function getAssessmentChartData(): Promise<Array<{ date: string; assessments: number }>> {
  try {
    const db = getDb();
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all coaches
    const coachProfilesQuery = query(
      getLegacyUserProfilesCollection(),
      where('role', 'in', ['coach', 'org_admin']),
      firestoreLimit(COACH_PROFILE_LIMIT)
    );
    const userProfilesSnapshot = await getDocs(coachProfilesQuery);
    const coachUids: string[] = [];

    userProfilesSnapshot.docs.forEach(userDoc => {
      coachUids.push(userDoc.id);
    });

    // Collect all assessments from last 30 days
    const assessmentsByDate = new Map<string, number>();

    // Initialize all 30 days to 0
    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      assessmentsByDate.set(dateKey, 0);
    }

    // Query assessments from each coach
    for (const coachUid of coachUids) {
      try {
        const assessmentsRef = collection(db, COLLECTIONS.COACHES, coachUid, COLLECTIONS.ASSESSMENTS);
        const assessmentsQuery = query(assessmentsRef, firestoreLimit(COACH_ASSESSMENTS_LIMIT));
        const assessmentsSnapshot = await getDocs(assessmentsQuery);

        assessmentsSnapshot.docs.forEach(assessmentDoc => {
          const assessmentData = assessmentDoc.data();
          const createdAt = assessmentData.createdAt?.toDate?.() || assessmentData.timestamp?.toDate?.();

          if (createdAt && createdAt >= thirtyDaysAgo) {
            const dateKey = createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
            const currentCount = assessmentsByDate.get(dateKey) || 0;
            assessmentsByDate.set(dateKey, currentCount + 1);
          }
        });
      } catch (e) {
        // Skip coaches without assessments subcollection
      }
    }

    // Convert to array and sort by date
    const chartData = Array.from(assessmentsByDate.entries())
      .map(([date, count]) => ({
        date,
        assessments: count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return chartData;
  } catch (error) {
    logger.error('Error fetching assessment chart data:', error);
    return [];
  }
}

/**
 * Check if platform admin has data access permission for an organization
 * Comped organizations (like One Fitness - owner's company) automatically have access
 */
async function hasDataAccessPermission(orgId: string): Promise<boolean> {
  try {
    const orgRef = getOrganizationDoc(orgId);
    const orgSnap = await getDoc(orgRef);
    if (!orgSnap.exists()) return false;

    const data = orgSnap.data();
    // Comped organizations get automatic access (owner's company for testing)
    if (data.subscription?.isComped === true) {
      return true;
    }
    // Check explicit permission
    return data.dataAccessPermission?.platformAdminAccess === true;
  } catch (error) {
    logger.error(`Error checking data access permission for org ${orgId}:`, error);
    return false;
  }
}

/**
 * Get coaches with their assessment counts for an organization
 * GDPR/HIPAA: Only works if platform admin has explicit permission OR org is platform owner
 */
export async function getOrgCoachesWithStats(orgId: string): Promise<Array<{
  uid: string;
  displayName: string;
  email?: string;
  role: string;
  assessmentCount: number;
  clientCount: number;
}>> {
  try {
    // Check permission first
    const hasPermission = await hasDataAccessPermission(orgId);
    if (!hasPermission) {
      logger.warn(`Platform admin does not have data access permission for org ${orgId}`);
      throw new Error('Data access permission required. Please request access from the organization.');
    }

    const db = getDb();
    const coachProfilesQuery = query(
      getLegacyUserProfilesCollection(),
      where('organizationId', '==', orgId),
      where('role', 'in', ['coach', 'org_admin']),
      firestoreLimit(COACH_PROFILE_LIMIT)
    );
    const userProfilesSnapshot = await getDocs(coachProfilesQuery);
    const coaches: Array<{ uid: string; displayName: string; email?: string; role: string }> = [];

    // Get all coaches in this organization
    userProfilesSnapshot.docs.forEach(userDoc => {
      const data = userDoc.data();
      coaches.push({
        uid: userDoc.id,
        displayName: data.displayName || data.email || 'Unknown',
        email: data.email,
        role: data.role,
      });
    });

    // Get assessment and client counts for each coach
    const coachesWithStats = await Promise.all(
      coaches.map(async (coach) => {
        try {
          // Count assessments for this coach
          const assessmentsRef = collection(db, COLLECTIONS.COACHES, coach.uid, COLLECTIONS.ASSESSMENTS);
          const assessmentsCountSnap = await getCountFromServer(assessmentsRef);
          const assessmentCount = assessmentsCountSnap.data().count;

          // Count clients for this coach
          const clientsRef = collection(db, COLLECTIONS.COACHES, coach.uid, COLLECTIONS.CLIENTS);
          const clientsCountSnap = await getCountFromServer(clientsRef);
          const clientCount = clientsCountSnap.data().count;

          return {
            ...coach,
            assessmentCount,
            clientCount,
          };
        } catch (error) {
          logger.warn(`Error fetching stats for coach ${coach.uid}:`, error);
          return {
            ...coach,
            assessmentCount: 0,
            clientCount: 0,
          };
        }
      })
    );

    // Sort by assessment count (descending)
    return coachesWithStats.sort((a, b) => b.assessmentCount - a.assessmentCount);
  } catch (error) {
    logger.error('Error fetching org coaches with stats:', error);
    throw error; // Re-throw so UI can handle permission errors
  }
}

/**
 * Get organization list for platform admin with stats
 * Uses aggregated stats from organization documents (stats.coachCount, stats.assessmentCount, etc.)
 * This avoids expensive queries - all stats are maintained by Cloud Functions
 */
export async function getOrganizations(
  limitCount: number = 50,
  startAfterDoc?: QueryDocumentSnapshot<DocumentData>
): Promise<{ organizations: OrganizationSummary[]; lastDoc?: QueryDocumentSnapshot<DocumentData> }> {
  try {
    // Get platform admin UID to filter out any incorrectly created organizations
    let platformAdminUid: string | null = null;
    try {
      const platformAdminsSnapshot = await getDocs(query(
        getPlatformAdminsCollection(),
        firestoreLimit(PLATFORM_ADMIN_QUERY_LIMIT)
      ));
      if (!platformAdminsSnapshot.empty) {
        // Get the first platform admin (typically only one)
        platformAdminUid = platformAdminsSnapshot.docs[0].id;
      }
    } catch (e) {
      logger.warn('Could not fetch platform admin UID for filtering:', e);
    }

    // Get all organizations (stats are embedded in each org document)
    const orgsQueryLimit = Math.min(limitCount * ORG_FILTER_BUFFER_MULTIPLIER, ORG_LIST_LIMIT_MAX);
    const orgsQueryParts = [
      getOrganizationsCollection(),
      orderBy('createdAt', 'desc'),
      firestoreLimit(orgsQueryLimit)
    ];
    const orgsQuery = startAfterDoc
      ? query(...orgsQueryParts, startAfter(startAfterDoc))
      : query(...orgsQueryParts);
    const orgsSnapshot = await getDocs(orgsQuery);

    if (orgsSnapshot.empty) {
      logger.debug('No organizations found in database');
      return { organizations: [] };
    }

    const organizations = orgsSnapshot.docs
      .map(doc => {
        const data = doc.data();
        const orgId = doc.id;
        const stats = data.stats || {}; // Aggregated stats from Cloud Functions

        // Skip deleted or test organizations (marked as deleted in metadata)
        if (data.metadata?.isDeleted === true || data.metadata?.isTest === true) {
          return null;
        }

        // Skip organizations that belong to platform admin ONLY if they appear to be
        // incorrectly auto-created (no name, no assessments, not marked as internal)
        // Pattern: org-{platformAdminUid} indicates a potentially incorrectly auto-created org
        if (platformAdminUid && orgId === `org-${platformAdminUid}`) {
          // Don't skip if it's marked as internal (owner's company) or has real data
          const hasRealData = stats.assessmentCount > 0 || stats.clientCount > 0;
          const isInternal = data.metadata?.isInternal === true;
          const hasName = data.name && data.name !== 'Unnamed Organization' && data.name !== 'New Organization';

          if (!hasRealData && !isInternal && !hasName) {
            logger.debug(`Skipping platform admin's incorrectly created organization: ${orgId}`);
            return null;
          }
        }

        // Extract subscription details
        const plan = data.subscription?.plan || 'free';
        const clientSeats = data.subscription?.clientSeats || 0;
        const isComped = data.subscription?.isComped === true;
        // Calculate monthly fee (0 if comped, otherwise based on plan and seats)
        const monthlyFeeKwd = isComped ? 0 : calculateMonthlyFee(plan, clientSeats);

        return {
          id: orgId,
          name: data.name || 'Unnamed Organization',
          type: data.type || 'solo_coach',
          plan: plan,
          status: data.subscription?.status || 'none',
          isComped: isComped, // Track if comped (excluded from MRR)
          clientSeats: clientSeats,
          monthlyFeeKwd: monthlyFeeKwd,
          coachCount: stats.coachCount || 0,
          clientCount: stats.clientCount || 0,
          assessmentCount: stats.assessmentCount || 0,
          aiCostsMtdCents: stats.aiCostsMtdFils || 0, // Already in fils, but using Cents field name
          createdAt: data.createdAt?.toDate?.() || new Date(),
          trialEndsAt: data.subscription?.trialEndsAt?.toDate?.(),
          lastActiveDate: stats.lastAssessmentDate?.toDate?.(), // For activity tracking
        } as OrganizationSummary & { lastActiveDate?: Date };
      })
      .filter((org): org is OrganizationSummary & { lastActiveDate?: Date } => {
        // Filter out nulls and empty organizations (no coaches, no clients, no assessments)
        if (!org) return false;
        // Keep organizations with at least one coach, client, or assessment
        // OR keep comped organizations (they might be new)
        return org.coachCount > 0 || org.clientCount > 0 || org.assessmentCount > 0 || org.isComped;
      }) as OrganizationSummary[];

    // Sort by createdAt descending
    organizations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Calculate actual AI costs for each organization from logs
    const organizationsWithCosts = await Promise.all(
      organizations.map(async (org) => {
        try {
          const orgCosts = await getOrgAICostsByFeature(org.id);
          const totalCosts = orgCosts.reduce((sum, item) => sum + item.costFils, 0);
          return {
            ...org,
            aiCostsMtdCents: totalCosts, // Update with actual calculated costs
          };
        } catch (e) {
          logger.warn(`Failed to calculate AI costs for org ${org.id}:`, e);
          return org; // Return original if calculation fails
        }
      })
    );

    const limitedOrganizations = organizationsWithCosts.slice(0, limitCount);
    const lastDoc = orgsSnapshot.docs[orgsSnapshot.docs.length - 1];
    return { organizations: limitedOrganizations, lastDoc };
  } catch (error) {
    logger.error('Error fetching organizations:', error);
    return { organizations: [] };
  }
}

/**
 * Get full organization details for management page
 */
export async function getOrganizationDetails(orgId: string): Promise<OrganizationDetails> {
  try {
    const orgRef = getOrganizationDoc(orgId);
    const orgSnap = await getDoc(orgRef);

    if (!orgSnap.exists()) {
      throw new Error(`Organization ${orgId} not found`);
    }

    const data = orgSnap.data();
    const stats = data.stats || {};

    // Calculate actual AI costs from logs (more accurate)
    const actualAICostsMTD = await getOrgAICostsByFeature(orgId);
    const totalAICostsMTD = actualAICostsMTD.reduce((sum, item) => sum + item.costFils, 0);

    // Extract subscription details
    const plan = data.subscription?.plan || 'free';
    const clientSeats = data.subscription?.clientSeats || 0;
    const isComped = data.subscription?.isComped === true;

    // Use stored amountFils (source of truth) and convert to KWD
    // amountFils is stored in fils (1 KWD = 1000 fils) to avoid floating point precision issues
    // If amountFils doesn't exist, calculate it as fallback
    const storedAmountFils = data.subscription?.amountFils;
    const monthlyFeeKwd = isComped
      ? 0
      : (storedAmountFils !== undefined && storedAmountFils !== null)
        ? storedAmountFils / 1000  // Convert fils to KWD
        : calculateMonthlyFee(plan, clientSeats);  // Fallback calculation

    return {
      id: orgSnap.id,
      name: data.name || 'Unnamed Organization',
      type: data.type || 'solo_coach',
      plan,
      status: data.subscription?.status || 'none',
      isComped,
      clientSeats,
      monthlyFeeKwd,
      coachCount: stats.coachCount || 0,
      clientCount: stats.clientCount || 0,
      assessmentCount: stats.assessmentCount || 0,
      aiCostsMtdCents: totalAICostsMTD, // Use actual calculated costs
      createdAt: data.createdAt?.toDate?.() || new Date(),
      trialEndsAt: data.subscription?.trialEndsAt?.toDate?.(),
      lastActiveDate: stats.lastAssessmentDate?.toDate?.(),
      // Contact information
      adminEmail: data.adminEmail || data.admin?.email,
      phone: data.phone,
      address: data.address,
      website: data.website,
      // Additional details
      logoUrl: data.logoUrl,
      gradientId: data.gradientId,
      equipmentConfig: data.equipmentConfig,
      modules: data.modules,
      demoAutoFillEnabled: data.demoAutoFillEnabled ?? false, // Platform admin controlled - OFF by default
      onboardingCompletedAt: data.onboardingCompletedAt?.toDate?.(),
      metadata: data.metadata,
      // GDPR/HIPAA compliance
      dataAccessPermission: data.dataAccessPermission ? {
        platformAdminAccess: data.dataAccessPermission.platformAdminAccess || false,
        grantedAt: data.dataAccessPermission.grantedAt?.toDate?.(),
        grantedBy: data.dataAccessPermission.grantedBy,
        reason: data.dataAccessPermission.reason,
      } : undefined,
    } as OrganizationDetails;
  } catch (error) {
    logger.error('Error fetching organization details:', error);
    throw error;
  }
}

/**
 * Update organization details
 */
export async function updateOrganizationDetails(
  orgId: string,
  updates: Partial<OrganizationDetails>
): Promise<void> {
  try {
    const orgRef = getOrganizationDoc(orgId);
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Map OrganizationDetails fields to Firestore document structure
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.address !== undefined) updateData.address = updates.address;
    if (updates.website !== undefined) updateData.website = updates.website;
    if (updates.logoUrl !== undefined) updateData.logoUrl = updates.logoUrl;
    if (updates.gradientId !== undefined) updateData.gradientId = updates.gradientId;
    if (updates.adminEmail !== undefined) updateData.adminEmail = updates.adminEmail;
    // Platform admin controlled features
    if (updates.demoAutoFillEnabled !== undefined) updateData.demoAutoFillEnabled = updates.demoAutoFillEnabled;

    // Handle data access permission updates (GDPR/HIPAA)
    if (updates.dataAccessPermission !== undefined) {
      updateData.dataAccessPermission = updates.dataAccessPermission;
    }

    // Handle subscription updates
    if (updates.plan !== undefined || updates.status !== undefined || updates.isComped !== undefined || updates.clientSeats !== undefined) {
      const orgSnap = await getDoc(orgRef);
      const currentData = orgSnap.data();
      const currentSubscription = currentData?.subscription || {};

      updateData.subscription = {
        ...currentSubscription,
        ...(updates.plan !== undefined && { plan: updates.plan }),
        ...(updates.status !== undefined && { status: updates.status }),
        ...(updates.isComped !== undefined && { isComped: updates.isComped }),
        ...(updates.clientSeats !== undefined && { clientSeats: updates.clientSeats }),
      };

      // Recalculate monthly fee if plan or seats changed
      if (updates.plan !== undefined || updates.clientSeats !== undefined) {
        const plan = updates.plan || currentSubscription.plan || 'free';
        const seats = updates.clientSeats || currentSubscription.clientSeats || 0;
        const isComped = updates.isComped !== undefined ? updates.isComped : currentSubscription.isComped === true;
        const monthlyFeeKwd = isComped ? 0 : calculateMonthlyFee(plan, seats);
        (updateData.subscription as Record<string, unknown>).amountFils = monthlyFeeKwd * 1000; // Convert to fils
      }
    }

    await updateDoc(orgRef, updateData);
    logger.info(`Organization ${orgId} updated successfully`);
  } catch (error) {
    logger.error(`Error updating organization ${orgId}:`, error);
    throw error;
  }
}

/**
 * Delete organization
 */
export async function deleteOrganization(orgId: string): Promise<void> {
  try {
    const orgRef = getOrganizationDoc(orgId);
    await deleteDoc(orgRef);
    logger.info(`Organization ${orgId} deleted`);
  } catch (error) {
    logger.error(`Error deleting organization ${orgId}:`, error);
    throw error;
  }
}

/**
 * Pause organization subscription
 */
export async function pauseSubscription(orgId: string): Promise<void> {
  try {
    const orgRef = getOrganizationDoc(orgId);
    await updateDoc(orgRef, {
      'subscription.status': 'paused',
      updatedAt: new Date(),
    });
    logger.info(`Subscription paused for organization ${orgId}`);
  } catch (error) {
    logger.error(`Error pausing subscription for ${orgId}:`, error);
    throw error;
  }
}

/**
 * Cancel organization subscription
 */
export async function cancelSubscription(orgId: string): Promise<void> {
  try {
    const orgRef = getOrganizationDoc(orgId);
    await updateDoc(orgRef, {
      'subscription.status': 'cancelled',
      updatedAt: new Date(),
    });
    logger.info(`Subscription cancelled for organization ${orgId}`);
  } catch (error) {
    logger.error(`Error cancelling subscription for ${orgId}:`, error);
    throw error;
  }
}

/**
 * Reactivate organization subscription
 */
export async function reactivateSubscription(orgId: string): Promise<void> {
  try {
    const orgRef = getOrganizationDoc(orgId);
    await updateDoc(orgRef, {
      'subscription.status': 'active',
      updatedAt: new Date(),
    });
    logger.info(`Subscription reactivated for organization ${orgId}`);
  } catch (error) {
    logger.error(`Error reactivating subscription for org ${orgId}:`, error);
    throw error;
  }
}

/**
 * Grant data access permission to platform admin (GDPR/HIPAA compliance)
 * This allows platform admin to view assessment/client data for support purposes
 */
export async function grantDataAccess(
  orgId: string,
  platformAdminUid: string,
  reason?: string
): Promise<void> {
  try {
    const orgRef = getOrganizationDoc(orgId);
    const updateData = {
      'dataAccessPermission.platformAdminAccess': true,
      'dataAccessPermission.grantedAt': new Date(),
      'dataAccessPermission.grantedBy': platformAdminUid,
      'dataAccessPermission.reason': reason || 'Support request',
      updatedAt: new Date(),
    };
    await updateDoc(orgRef, updateData);
    logger.info(`Data access granted for org ${orgId} by ${platformAdminUid}`);
  } catch (error) {
    logger.error(`Error granting data access for org ${orgId}:`, error);
    throw error;
  }
}

/**
 * Revoke data access permission from platform admin (GDPR/HIPAA compliance)
 */
export async function revokeDataAccess(orgId: string): Promise<void> {
  try {
    const orgRef = getOrganizationDoc(orgId);
    const updateData = {
      'dataAccessPermission.platformAdminAccess': false,
      'dataAccessPermission.grantedAt': null,
      'dataAccessPermission.grantedBy': null,
      'dataAccessPermission.reason': null,
      updatedAt: new Date(),
    };
    await updateDoc(orgRef, updateData);
    logger.info(`Data access revoked for org ${orgId}`);
  } catch (error) {
    logger.error(`Error revoking data access for org ${orgId}:`, error);
    throw error;
  }
}

/**
 * Get default metrics (fallback)
 */
export function getDefaultMetrics(): PlatformMetrics {
  const now = new Date();
  return {
    totalOrganizations: 0,
    activeOrganizations: 0,
    trialOrganizations: 0,
    totalUsers: 0,
    totalCoaches: 0,
    totalClients: 0,
    mrrCents: 0,
    arrCents: 0,
    aiCostsMtdCents: 0,
    aiCostsLastMonthCents: 0,
    totalAssessments: 0,
    assessmentsThisMonth: 0,
    updatedAt: now,
  };
}
