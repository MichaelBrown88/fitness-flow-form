/**
 * Platform Admin Service
 * 
 * Handles all platform-level administration functions.
 * This is separate from organization-level services.
 * 
 * Uses the new hierarchical database structure from @/lib/database
 */

import { 
  doc, 
  getDoc, 
  setDoc,
  updateDoc,
  deleteDoc,
  collection, 
  getDocs, 
  query, 
  where,
  collectionGroup,
  Timestamp,
  orderBy,
  startAfter,
  limit as firestoreLimit
} from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { calculateMonthlyFee } from '@/lib/pricing';
import type { 
  PlatformAdmin, 
  PlatformMetrics, 
  OrganizationSummary,
  AICostBreakdown,
  OrganizationDetails 
} from '@/types/platform';
import { logger } from '@/lib/utils/logger';
import { 
  PLATFORM, 
  ORGANIZATION, 
  LEGACY, 
  AI_USAGE 
} from '@/lib/database/paths';
import {
  getPlatformAdminsCollection,
  getPlatformAdminDoc,
  getPlatformAdminLookupDoc,
  getPlatformMetricsDoc,
  getOrganizationsCollection,
  getOrganizationDoc,
  getLegacyRootAssessmentsCollection,
  getLegacyUserProfilesCollection,
  getAIUsageLogsCollection,
  getSystemStatsDoc,
} from '@/lib/database/collections';

/**
 * Check if a user is a platform admin by email
 */
export async function isPlatformAdmin(email: string): Promise<boolean> {
  try {
    // First check lookup collection (fast)
    const lookupRef = getPlatformAdminLookupDoc(email);
    const lookupSnap = await getDoc(lookupRef);
    
    if (lookupSnap.exists()) return true;
    
    // Fallback to query (for backwards compatibility)
    const adminQuery = query(
      getPlatformAdminsCollection(),
      where('email', '==', email.toLowerCase())
    );
    const snapshot = await getDocs(adminQuery);
    return !snapshot.empty;
  } catch (error) {
    logger.error('Error checking platform admin status:', error);
    return false;
  }
}

/**
 * Get platform admin by email
 */
export async function getPlatformAdminByEmail(email: string): Promise<PlatformAdmin | null> {
  try {
    // First check lookup collection to get UID
    const lookupRef = getPlatformAdminLookupDoc(email);
    const lookupSnap = await getDoc(lookupRef);
    
    if (lookupSnap.exists()) {
      const lookupData = lookupSnap.data();
      const adminRef = getPlatformAdminDoc(lookupData.uid);
      const adminSnap = await getDoc(adminRef);
      
      if (adminSnap.exists()) {
        return { uid: adminSnap.id, ...adminSnap.data() } as PlatformAdmin;
      }
    }
    
    // Fallback to query
    const adminQuery = query(
      getPlatformAdminsCollection(),
      where('email', '==', email.toLowerCase())
    );
    const snapshot = await getDocs(adminQuery);
    
    if (snapshot.empty) return null;
    
    const adminDoc = snapshot.docs[0];
    return { uid: adminDoc.id, ...adminDoc.data() } as PlatformAdmin;
  } catch (error) {
    logger.error('Error fetching platform admin:', error);
    return null;
  }
}

/**
 * Get platform admin by UID
 */
export async function getPlatformAdmin(uid: string): Promise<PlatformAdmin | null> {
  try {
    const docRef = getPlatformAdminDoc(uid);
    const snapshot = await getDoc(docRef);
    
    if (!snapshot.exists()) return null;
    
    return { uid: snapshot.id, ...snapshot.data() } as PlatformAdmin;
  } catch (error) {
    logger.error('Error fetching platform admin:', error);
    return null;
  }
}

/**
 * Create platform admin record (called after Firebase Auth account is created)
 */
export async function createPlatformAdmin(
  uid: string, 
  email: string, 
  displayName: string
): Promise<void> {
  const db = getDb();
  const normalizedEmail = email.toLowerCase();
  
  // First, check if there's a pending admin record we need to migrate
  const existingAdmin = await getPlatformAdminByEmail(normalizedEmail);
  
  if (existingAdmin && existingAdmin.uid.startsWith('pending_')) {
    // Migrate the pending record to the real UID
    const oldAdminData = existingAdmin;
    
    // Create new record with real UID
    const admin: Omit<PlatformAdmin, 'uid'> = {
      email: normalizedEmail,
      displayName: oldAdminData.displayName || displayName,
      permissions: oldAdminData.permissions,
      isPasswordSet: true,
      createdAt: oldAdminData.createdAt,
      lastLoginAt: new Date(),
    };
    
    await setDoc(getPlatformAdminDoc(uid), admin);
    
    // Update lookup to point to new UID
    await setDoc(getPlatformAdminLookupDoc(normalizedEmail), {
      uid: uid,
      email: normalizedEmail,
      updatedAt: new Date(),
    }, { merge: true });
    
    // Delete old pending record
    // Note: We don't delete to avoid orphaned references, just leave it
    
    logger.info('Platform admin migrated from pending to real UID:', email);
    return;
  }
  
  // Create new admin record
  const admin: Omit<PlatformAdmin, 'uid'> = {
    email: normalizedEmail,
    displayName,
    permissions: ['view_metrics', 'view_organizations', 'view_ai_costs', 'manage_organizations', 'manage_admins'],
    isPasswordSet: false,
    createdAt: new Date(),
  };
  
  await setDoc(getPlatformAdminDoc(uid), admin);
  
  // Create lookup entry
  await setDoc(getPlatformAdminLookupDoc(normalizedEmail), {
    uid: uid,
    email: normalizedEmail,
    createdAt: new Date(),
  });
  
  logger.info('Platform admin created:', email);
}

/**
 * Mark password as set for platform admin
 */
export async function markPasswordSet(uid: string): Promise<void> {
  await setDoc(
    getPlatformAdminDoc(uid),
    { isPasswordSet: true, updatedAt: new Date() },
    { merge: true }
  );
}

/**
 * Update last login timestamp for platform admin
 */
export async function updateLastLogin(uid: string): Promise<void> {
  await setDoc(
    getPlatformAdminDoc(uid),
    { lastLoginAt: new Date() },
    { merge: true }
  );
}

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
      const userProfilesSnapshot = await getDocs(getLegacyUserProfilesCollection());
      const coachUids: string[] = [];
      
      userProfilesSnapshot.docs.forEach(userDoc => {
        const data = userDoc.data();
        if (data.role === 'coach' || data.role === 'org_admin') {
          coachUids.push(userDoc.id);
        }
      });
      
      // Query assessments from each coach's subcollection
      for (const coachUid of coachUids) {
        try {
          const assessmentsRef = collection(db, 'coaches', coachUid, 'assessments');
          const assessmentsSnapshot = await getDocs(assessmentsRef);
          
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
      aiCostsLastMonthCents: 0, // TODO: Track monthly history
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
 * Calculate AI costs MTD (Month-To-Date) from actual usage logs
 * This ensures we have accurate costs even if aggregation hasn't run
 */
async function calculateAICostsMTD(): Promise<number> {
  try {
    const db = getDb();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Query all AI usage logs from current month
    const aiLogsRef = getAIUsageLogsCollection();
    const aiLogsQuery = query(
      aiLogsRef,
      where('timestamp', '>=', Timestamp.fromDate(startOfMonth)),
      orderBy('timestamp', 'desc')
    );
    
    const aiLogsSnapshot = await getDocs(aiLogsQuery);
    let totalCostsFils = 0;
    
    aiLogsSnapshot.docs.forEach(logDoc => {
      const logData = logDoc.data();
      // Handle both new (costFils) and legacy (costEstimate) fields
      let costFils = logData.costFils || 0;
      
      // Backward compatibility: convert legacy costEstimate (USD) to fils
      // costEstimate is in USD (0.000675 per request typically)
      if (costFils === 0 && logData.costEstimate) {
        // Convert USD to KWD, then to fils: USD * 0.305 KWD/USD * 1000 fils/KWD
        // Use Math.ceil to ensure we don't lose cost (0.205875 fils rounds to 1, not 0)
        costFils = Math.ceil(logData.costEstimate * 0.305 * 1000);
      }
      
      totalCostsFils += costFils;
    });
    
    return totalCostsFils;
  } catch (error) {
    logger.error('Error calculating AI costs MTD:', error);
    return 0;
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
    const userProfilesSnapshot = await getDocs(getLegacyUserProfilesCollection());
    const coachUids: string[] = [];
    
    userProfilesSnapshot.docs.forEach(userDoc => {
      const data = userDoc.data();
      if (data.role === 'coach' || data.role === 'org_admin') {
        coachUids.push(userDoc.id);
      }
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
        const assessmentsRef = collection(db, 'coaches', coachUid, 'assessments');
        const assessmentsSnapshot = await getDocs(assessmentsRef);
        
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
 * Get AI costs breakdown by feature type for platform
 */
export async function getAICostsByFeature(): Promise<Array<{
  feature: string;
  count: number;
  costFils: number;
}>> {
  try {
    const db = getDb();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Query all AI usage logs from current month
    const aiLogsRef = getAIUsageLogsCollection();
    const aiLogsQuery = query(
      aiLogsRef,
      where('timestamp', '>=', Timestamp.fromDate(startOfMonth)),
      orderBy('timestamp', 'desc')
    );
    
    const aiLogsSnapshot = await getDocs(aiLogsQuery);
    const costsByFeature = new Map<string, { count: number; costFils: number }>();
    
    aiLogsSnapshot.docs.forEach(logDoc => {
      const logData = logDoc.data();
      const feature = logData.type || 'unknown';
      
      // Handle both new (costFils) and legacy (costEstimate) fields
      let costFils = logData.costFils || 0;
      // Backward compatibility: convert legacy costEstimate (USD) to fils
      if (costFils === 0 && logData.costEstimate) {
        // Convert USD to KWD, then to fils: USD * 0.305 KWD/USD * 1000 fils/KWD
        // Use Math.ceil to ensure we don't lose cost
        costFils = Math.ceil(logData.costEstimate * 0.305 * 1000);
      }
      
      const current = costsByFeature.get(feature) || { count: 0, costFils: 0 };
      costsByFeature.set(feature, {
        count: current.count + 1,
        costFils: current.costFils + costFils,
      });
    });
    
    // Convert to array
    return Array.from(costsByFeature.entries())
      .map(([feature, data]) => ({
        feature,
        ...data,
      }))
      .sort((a, b) => b.costFils - a.costFils);
  } catch (error) {
    logger.error('Error fetching AI costs by feature:', error);
    return [];
  }
}

/**
 * Get AI costs breakdown by feature for a specific organization
 */
export async function getOrgAICostsByFeature(orgId: string): Promise<Array<{
  feature: string;
  count: number;
  costFils: number;
}>> {
  try {
    const db = getDb();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get all coaches in this organization
    const userProfilesSnapshot = await getDocs(getLegacyUserProfilesCollection());
    const coachUids: string[] = [];
    
    userProfilesSnapshot.docs.forEach(userDoc => {
      const data = userDoc.data();
      if (data.organizationId === orgId && (data.role === 'coach' || data.role === 'org_admin')) {
        coachUids.push(userDoc.id);
      }
    });
    
    // Query AI usage logs from current month, filter by coachUid or organizationId
    const aiLogsRef = getAIUsageLogsCollection();
    const aiLogsQuery = query(
      aiLogsRef,
      where('timestamp', '>=', Timestamp.fromDate(startOfMonth)),
      orderBy('timestamp', 'desc')
    );
    
    const aiLogsSnapshot = await getDocs(aiLogsQuery);
    const costsByFeature = new Map<string, { count: number; costFils: number }>();
    
    aiLogsSnapshot.docs.forEach(logDoc => {
      const logData = logDoc.data();
      const logOrgId = logData.organizationId;
      const coachUid = logData.coachUid;
      
      // Match if organizationId matches OR if coachUid is in this org
      const belongsToOrg = logOrgId === orgId || coachUids.includes(coachUid);
      
      if (belongsToOrg) {
        const feature = logData.type || 'unknown';
        
      // Handle both new (costFils) and legacy (costEstimate) fields
      let costFils = logData.costFils || 0;
      // Backward compatibility: convert legacy costEstimate (USD) to fils
      if (costFils === 0 && logData.costEstimate) {
        // Convert USD to KWD, then to fils: USD * 0.305 KWD/USD * 1000 fils/KWD
        // Use Math.ceil to ensure we don't lose cost
        costFils = Math.ceil(logData.costEstimate * 0.305 * 1000);
      }
        
        const current = costsByFeature.get(feature) || { count: 0, costFils: 0 };
        costsByFeature.set(feature, {
          count: current.count + 1,
          costFils: current.costFils + costFils,
        });
      }
    });
    
    // Convert to array
    return Array.from(costsByFeature.entries())
      .map(([feature, data]) => ({
        feature,
        ...data,
      }))
      .sort((a, b) => b.costFils - a.costFils);
  } catch (error) {
    logger.error('Error fetching org AI costs by feature:', error);
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
    const userProfilesSnapshot = await getDocs(getLegacyUserProfilesCollection());
    const coaches: Array<{ uid: string; displayName: string; email?: string; role: string }> = [];
    
    // Get all coaches in this organization
    userProfilesSnapshot.docs.forEach(userDoc => {
      const data = userDoc.data();
      if (data.organizationId === orgId && (data.role === 'coach' || data.role === 'org_admin')) {
        coaches.push({
          uid: userDoc.id,
          displayName: data.displayName || data.email || 'Unknown',
          email: data.email,
          role: data.role,
        });
      }
    });

    // Get assessment and client counts for each coach
    const coachesWithStats = await Promise.all(
      coaches.map(async (coach) => {
        try {
          // Count assessments for this coach
          const assessmentsRef = collection(db, 'coaches', coach.uid, 'assessments');
          const assessmentsSnapshot = await getDocs(assessmentsRef);
          const assessmentCount = assessmentsSnapshot.size;

          // Count clients for this coach
          const clientsRef = collection(db, 'coaches', coach.uid, 'clients');
          const clientsSnapshot = await getDocs(clientsRef);
          const clientCount = clientsSnapshot.size;

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
  limitCount: number = 50
): Promise<OrganizationSummary[]> {
  try {
    const db = getDb();
    
    // Get platform admin UID to filter out any incorrectly created organizations
    let platformAdminUid: string | null = null;
    try {
      const platformAdminsSnapshot = await getDocs(getPlatformAdminsCollection());
      if (!platformAdminsSnapshot.empty) {
        // Get the first platform admin (typically only one)
        platformAdminUid = platformAdminsSnapshot.docs[0].id;
      }
    } catch (e) {
      logger.warn('Could not fetch platform admin UID for filtering:', e);
    }
    
    // Get all organizations (stats are embedded in each org document)
    const orgsSnapshot = await getDocs(getOrganizationsCollection());
    
    if (orgsSnapshot.empty) {
      logger.debug('No organizations found in database');
      return [];
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
        
        // Skip organizations that belong to platform admin (incorrectly created)
        // Pattern: org-{platformAdminUid} indicates an incorrectly auto-created org
        if (platformAdminUid && orgId === `org-${platformAdminUid}`) {
          logger.debug(`Skipping platform admin's incorrectly created organization: ${orgId}`);
          return null;
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
    
    return organizationsWithCosts.slice(0, limitCount);
  } catch (error) {
    logger.error('Error fetching organizations:', error);
    return [];
  }
}

/**
 * Get AI cost breakdown by organization
 */
export async function getAICostBreakdown(period: string): Promise<AICostBreakdown[]> {
  // TODO: Implement monthly breakdown
  return [];
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
function getDefaultMetrics(): PlatformMetrics {
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

/**
 * Seed initial platform admin (one-time setup)
 * This creates the platform admin record if it doesn't exist
 */
export async function seedPlatformAdmin(email: string, displayName: string): Promise<void> {
  const existing = await getPlatformAdminByEmail(email);
  if (existing) {
    logger.info('Platform admin already exists:', email);
    return;
  }
  
  // Create a placeholder record - UID will be updated when they first log in
  const placeholderUid = `pending_${Date.now()}`;
  await createPlatformAdmin(placeholderUid, email, displayName);
  logger.info('Platform admin seeded:', email);
}
