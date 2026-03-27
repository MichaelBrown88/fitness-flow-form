/**
 * Platform Metrics Service
 *
 * Handles platform analytics and organization management:
 * - Live metrics and dashboard data
 * - Organization CRUD operations
 * - Subscription management
 * - Data access permissions (GDPR/HIPAA)
 */

import { httpsCallable } from 'firebase/functions';
import {
  doc,
  getDoc,
  getDocFromServer,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  startAfter,
  limit as firestoreLimit,
  documentId,
  serverTimestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { getDb, getFirebaseFunctions } from '@/services/firebase';
import { calculateMonthlyFee } from '@/lib/pricing';
import { getMonthlyPrice, getPriceInSmallestUnit } from '@/lib/pricing/config';
import { DEFAULT_REGION, REGION_TO_CURRENCY } from '@/constants/pricing';
import type { Region } from '@/constants/pricing';
import type {
  PlatformMetrics,
  PlatformMetricsHistoryEntry,
  OrganizationSummary,
  OrganizationDetails,
} from '@/types/platform';
import { logger } from '@/lib/utils/logger';
import { ORGANIZATION, PLATFORM } from '@/lib/database/paths';
import {
  getPlatformAdminsCollection,
  getOrganizationsCollection,
  getOrganizationDoc,
  getUserProfilesCollection,
  getSystemStatsDoc,
  getOrgCoachesCollection,
  getOrgAssessmentsCollection,
  getOrgClientsCollection,
} from '@/lib/database/collections';
import { filsToGbpPence, usdCentsToGbpPence } from '@/lib/utils/currency';
import { logAdminAction } from './auditLog';
import { ORGANIZATIONS_LIST_PAGE_SIZE, ORG_COACHES_SUBCOLLECTION_LIMIT } from '@/constants/firestoreQueryLimits';

const PLATFORM_ADMIN_QUERY_LIMIT = 1;
const COACH_PROFILE_LIMIT = 500;
const ORG_LIST_LIMIT_MAX = 200;
const ORG_FILTER_BUFFER_MULTIPLIER = 3;

/** Paginated full scan of organizations root collection (each chunk has limit). */
async function getAllOrganizationDocSnapshots(): Promise<QueryDocumentSnapshot<DocumentData>[]> {
  const orgCol = getOrganizationsCollection();
  const out: QueryDocumentSnapshot<DocumentData>[] = [];
  let cursor: QueryDocumentSnapshot<DocumentData> | undefined;
  while (true) {
    const q = cursor
      ? query(
          orgCol,
          orderBy(documentId()),
          firestoreLimit(ORGANIZATIONS_LIST_PAGE_SIZE),
          startAfter(cursor),
        )
      : query(orgCol, orderBy(documentId()), firestoreLimit(ORGANIZATIONS_LIST_PAGE_SIZE));
    const snap = await getDocs(q);
    if (snap.empty) break;
    out.push(...snap.docs);
    if (snap.size < ORGANIZATIONS_LIST_PAGE_SIZE) break;
    cursor = snap.docs[snap.docs.length - 1];
  }
  return out;
}

export interface RevenueByRegionResult {
  byRegion: {
    GB?: { amountLocal: number; currency: 'GBP'; gbpPence: number };
    US?: { amountLocal: number; currency: 'USD'; gbpPence: number };
    KW?: { amountLocal: number; currency: 'KWD'; gbpPence: number };
  };
  totalGbpPence: number;
}

/**
 * Get revenue grouped by region (UK £, US $, KW KWD, Total £).
 */
export async function getRevenueByRegion(): Promise<RevenueByRegionResult> {
  const result: RevenueByRegionResult = { byRegion: {}, totalGbpPence: 0 };
  try {
    const orgDocs = await getAllOrganizationDocSnapshots();
    const regionTotals = new Map<string, { amountLocal: number; currency: 'GBP' | 'USD' | 'KWD' }>();

    orgDocs.forEach((orgDoc) => {
      const data = orgDoc.data();
      const status = data.subscription?.status;
      const isComped = data.subscription?.isComped === true;
      if (status !== 'active' || isComped) return;

      const region = (data.subscription?.region ?? data.region) as Region | undefined;
      const currency = data.subscription?.currency ?? (region ? REGION_TO_CURRENCY[region] : undefined);
      if (!region || !currency) return;

      const amountCents = data.subscription?.amountCents ?? data.subscription?.amountFils;
      if (amountCents == null || amountCents <= 0) return;

      const existing = regionTotals.get(region) ?? { amountLocal: 0, currency };
      if (currency === 'GBP') existing.amountLocal += amountCents;
      else if (currency === 'USD') existing.amountLocal += amountCents;
      else existing.amountLocal += amountCents;
      regionTotals.set(region, existing);
    });

    let totalGbpPence = 0;
    regionTotals.forEach((v, region) => {
      let gbpPence = 0;
      const key = region as 'GB' | 'US' | 'KW';
      if (v.currency === 'GBP') gbpPence = v.amountLocal;
      else if (v.currency === 'USD') gbpPence = usdCentsToGbpPence(v.amountLocal);
      else gbpPence = filsToGbpPence(v.amountLocal);
      const entry = { amountLocal: v.amountLocal, currency: v.currency, gbpPence };
      (result.byRegion as Record<string, typeof entry>)[key] = entry;
      totalGbpPence += gbpPence;
    });
    result.totalGbpPence = totalGbpPence;
  } catch (error) {
    logger.error('Error computing revenue by region:', error);
  }
  return result;
}

/**
 * Get live platform metrics
 * This reads from ONE document instead of querying all collections (highly efficient!)
 * MRR/ARR are in GBP pence (reporting currency).
 */
export async function getLiveMetrics(): Promise<PlatformMetrics> {
  try {
    const systemStatsRef = getSystemStatsDoc();
    const systemStatsSnap = await getDocFromServer(systemStatsRef).catch(() => getDoc(systemStatsRef));

    if (!systemStatsSnap.exists()) {
      logger.warn('system_stats/global_metrics does not exist yet. Returning defaults. Cloud Functions will populate it on next write.');
      return getDefaultMetrics();
    }

    const stats = systemStatsSnap.data();
    const now = new Date();

    const assessmentsThisMonth = typeof stats.assessments_this_month === 'number'
      ? stats.assessments_this_month
      : 0;

    const aiCostsMtdCents = typeof stats.aiCostsMtdGbpPence === 'number' && stats.aiCostsMtdGbpPence >= 0
      ? stats.aiCostsMtdGbpPence
      : 0;
    const totalAiCostsCents = typeof stats.totalAiCostsGbpPence === 'number' && stats.totalAiCostsGbpPence >= 0
      ? stats.totalAiCostsGbpPence
      : 0;

    const mrrGbpPence = stats.monthlyRecurringRevenueGbpPence ?? stats.monthlyRecurringRevenueFils ?? 0;
    logger.debug(`Metrics loaded from system_stats (efficient single-read): totalOrgs=${stats.totalOrgs || 0}, activeOrgs=${stats.activeOrgs || 0}, mrrGbpPence=${mrrGbpPence}`);

    return {
      totalOrganizations: stats.totalOrgs || 0,
      activeOrganizations: stats.activeOrgs || 0,
      trialOrganizations: stats.trialOrgs || 0,
      totalUsers: (stats.totalCoaches || 0) + (stats.totalClients || 0),
      totalCoaches: stats.totalCoaches || 0,
      totalClients: stats.totalClients || 0,
      mrrCents: mrrGbpPence,
      arrCents: mrrGbpPence * 12,
      aiCostsMtdCents: aiCostsMtdCents,
      aiCostsLastMonthCents: 0,
      totalAiCostsCents,
      totalAssessments: stats.totalAssessments || 0,
      assessmentsThisMonth,
      trialConversionsThisMonth: stats.trialConversionsThisMonth ?? 0,
      churnsThisMonth: stats.churnsThisMonth ?? 0,
      churnsLifetime: stats.churnsLifetime ?? 0,
      updatedAt: stats.lastUpdated?.toDate?.() || now,
    };
  } catch (error) {
    logger.error('Error fetching live metrics from system_stats:', error);
    return getDefaultMetrics();
  }
}

/**
 * Get assessment chart data for last 30 days
 * Uses server-side aggregation (Cloud Function) when available.
 */
export async function getAssessmentChartData(): Promise<Array<{ date: string; assessments: number }>> {
  try {
    const fn = httpsCallable<null, Array<{ date: string; assessments: number }>>(getFirebaseFunctions(), 'getAssessmentChartData');
    const res = await fn(null);
    return Array.isArray(res.data) ? res.data : [];
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
 * Reads from organizations/{orgId}/coaches/{uid} for pre-aggregated stats
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

    // Read from organization's coaches collection (with pre-aggregated stats)
    const orgCoachesRef = getOrgCoachesCollection(orgId);
    const orgCoachesSnapshot = await getDocs(
      query(orgCoachesRef, firestoreLimit(ORG_COACHES_SUBCOLLECTION_LIMIT)),
    );

    const coachesWithStats: Array<{
      uid: string;
      displayName: string;
      email?: string;
      role: string;
      assessmentCount: number;
      clientCount: number;
    }> = [];

    orgCoachesSnapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      coachesWithStats.push({
        uid: docSnap.id,
        displayName: data.displayName || data.email || 'Unknown',
        email: data.email,
        role: data.role || 'coach',
        assessmentCount: data.stats?.assessmentCount || 0,
        clientCount: data.stats?.clientCount || 0,
      });
    });

    // If no coaches in org collection, fallback to userProfiles
    if (coachesWithStats.length === 0) {
      const coachProfilesQuery = query(
        getUserProfilesCollection(),
        where('organizationId', '==', orgId),
        where('role', 'in', ['coach', 'org_admin']),
        firestoreLimit(COACH_PROFILE_LIMIT)
      );
      const userProfilesSnapshot = await getDocs(coachProfilesQuery);

      userProfilesSnapshot.docs.forEach(userDoc => {
        const data = userDoc.data();
        coachesWithStats.push({
          uid: userDoc.id,
          displayName: data.displayName || data.email || 'Unknown',
          email: data.email,
          role: data.role,
          assessmentCount: 0,
          clientCount: 0,
        });
      });
    }

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
    const orgsCollection = getOrganizationsCollection();
    const orgsConstraints = [
      orderBy('createdAt', 'desc'),
      firestoreLimit(orgsQueryLimit),
    ];
    const orgsQuery = startAfterDoc
      ? query(orgsCollection, ...orgsConstraints, startAfter(startAfterDoc))
      : query(orgsCollection, ...orgsConstraints);
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

        // Skip deleted organizations (test orgs are shown; filter by UI)
        if (data.metadata?.isDeleted === true) {
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
        const region = (data.subscription?.region ?? data.region) as Region | undefined;
        const effectiveRegion = region ?? DEFAULT_REGION;
        const currency =
          data.subscription?.currency ?? REGION_TO_CURRENCY[effectiveRegion];
        const seatBlock = data.subscription?.clientCount ?? clientSeats;
        const amountCents = data.subscription?.amountCents ?? data.subscription?.amountFils;
        const seatsForPrice = seatBlock || clientSeats;
        const monthlyAmountLocal = isComped
          ? 0
          : amountCents != null && currency
            ? (currency === 'KWD'
              ? (amountCents as number) / 1000
              : (amountCents as number) / 100)
            : effectiveRegion === 'KW'
              ? calculateMonthlyFee(plan, clientSeats)
              : getMonthlyPrice(effectiveRegion, seatsForPrice);

        return {
          id: orgId,
          name: data.name || 'Unnamed Organization',
          type: data.type || 'solo_coach',
          plan: plan,
          status: data.subscription?.status || 'none',
          isComped: isComped,
          clientSeats: clientSeats,
          monthlyFeeKwd: currency === 'KWD' ? monthlyAmountLocal : undefined,
          region: effectiveRegion,
          currency,
          seatBlock: seatBlock || clientSeats,
          monthlyAmountLocal: currency ? monthlyAmountLocal : undefined,
          customBrandingEnabled: data.customBrandingEnabled === true,
          customBrandingPaidAt: data.customBrandingPaidAt?.toDate?.(),
          coachCount: stats.coachCount || 0,
          clientCount: stats.clientCount || 0,
          assessmentCount: stats.assessmentCount || 0,
          assessmentsThisMonth: stats.assessmentsThisMonth ?? 0,
          aiCostsMtdCents: stats.aiCostsMtdGbpPence ?? (stats.aiCostsMtdFils != null ? filsToGbpPence(stats.aiCostsMtdFils) : 0),
          createdAt: data.createdAt?.toDate?.() || new Date(),
          trialEndsAt: data.subscription?.trialEndsAt?.toDate?.(),
          lastActiveDate: stats.lastAssessmentDate?.toDate?.(),
          onboardingCompletedAt: data.onboardingCompletedAt?.toDate?.(),
          isTest: data.metadata?.isTest === true,
        } as OrganizationSummary & { lastActiveDate?: Date; onboardingCompletedAt?: Date; isTest?: boolean };
      })
      .filter((org): org is OrganizationSummary & { lastActiveDate?: Date; onboardingCompletedAt?: Date; isTest?: boolean } => {
        if (!org) return false;
        // Keep orgs with data, comped, or test/incomplete (so admins can see and remove them)
        const hasData = org.coachCount > 0 || org.clientCount > 0 || org.assessmentCount > 0;
        const isIncomplete = !org.onboardingCompletedAt && (!org.name || org.name === 'Unnamed Organization');
        return hasData || org.isComped || org.isTest === true || isIncomplete;
      }) as OrganizationSummary[];

    // Sort by createdAt descending
    organizations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const limitedOrganizations = organizations.slice(0, limitCount);
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

    const plan = data.subscription?.plan || 'free';
    const clientSeats = data.subscription?.clientSeats || 0;
    const isComped = data.subscription?.isComped === true;
    const region = (data.subscription?.region ?? data.region) as Region | undefined;
    const effectiveRegion = region ?? DEFAULT_REGION;
    const currency = data.subscription?.currency ?? REGION_TO_CURRENCY[effectiveRegion];
    const seatBlock = data.subscription?.clientCount ?? clientSeats;
    const amountCents = data.subscription?.amountCents ?? data.subscription?.amountFils;
    const seatsForPrice = seatBlock || clientSeats;
    const monthlyAmountLocal = isComped
      ? 0
      : amountCents != null && currency
        ? (currency === 'KWD'
          ? (amountCents as number) / 1000
          : (amountCents as number) / 100)
        : effectiveRegion === 'KW'
          ? (data.subscription?.amountFils != null
            ? Number(data.subscription.amountFils) / 1000
            : calculateMonthlyFee(plan, clientSeats))
          : getMonthlyPrice(effectiveRegion, seatsForPrice);
    const monthlyFeeKwd = currency === 'KWD' ? monthlyAmountLocal : undefined;

    return {
      id: orgSnap.id,
      name: data.name || 'Unnamed Organization',
      type: data.type || 'solo_coach',
      plan,
      status: data.subscription?.status || 'none',
      isComped,
      clientSeats,
      monthlyFeeKwd,
      region: effectiveRegion,
      currency,
      seatBlock: seatBlock || clientSeats,
      monthlyAmountLocal: currency ? monthlyAmountLocal : undefined,
      customBrandingEnabled: data.customBrandingEnabled === true,
      customBrandingPaidAt: data.customBrandingPaidAt?.toDate?.(),
      coachCount: stats.coachCount || 0,
      clientCount: stats.clientCount || 0,
      assessmentCount: stats.assessmentCount || 0,
      aiCostsMtdCents: stats.aiCostsMtdGbpPence ?? (stats.aiCostsMtdFils != null ? filsToGbpPence(stats.aiCostsMtdFils) : 0),
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
      stripeCustomerId: data.stripe?.stripeCustomerId,
      stripeSubscriptionId: data.stripe?.stripeSubscriptionId,
      stripePriceId: data.stripe?.stripePriceId,
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
      updatedAt: serverTimestamp(),
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

    // Handle metadata (soft delete, etc.)
    if (updates.metadata !== undefined) {
      const metaSnap = await getDoc(orgRef);
      const currentMeta = metaSnap.data()?.metadata || {};
      updateData.metadata = { ...currentMeta, ...updates.metadata };
    }

    // Handle data access permission updates (GDPR/HIPAA)
    if (updates.dataAccessPermission !== undefined) {
      updateData.dataAccessPermission = updates.dataAccessPermission;
    }

    // Handle subscription updates (region, seatBlock, plan, status, isComped, clientSeats)
    const subFields = updates.region !== undefined || updates.seatBlock !== undefined || updates.plan !== undefined
      || updates.status !== undefined || updates.isComped !== undefined || updates.clientSeats !== undefined;
    if (subFields) {
      const orgSnap = await getDoc(orgRef);
      const currentData = orgSnap.data();
      const currentSubscription = currentData?.subscription || {};
      const region = (updates.region ?? currentSubscription.region ?? currentData?.region) as Region | undefined;
      const seatBlock = updates.seatBlock ?? updates.clientSeats ?? currentSubscription.clientCount ?? currentSubscription.clientSeats ?? 0;

      const subscriptionUpdate: Record<string, unknown> = {
        ...currentSubscription,
        ...(updates.plan !== undefined && { plan: updates.plan }),
        ...(updates.status !== undefined && { status: updates.status }),
        ...(updates.isComped !== undefined && { isComped: updates.isComped }),
        ...(updates.clientSeats !== undefined && { clientSeats: updates.clientSeats }),
        ...(updates.region !== undefined && { region: updates.region }),
        ...(updates.seatBlock !== undefined && { clientCount: updates.seatBlock, clientSeats: updates.seatBlock }),
      };

      if (region && (updates.region !== undefined || updates.seatBlock !== undefined || updates.clientSeats !== undefined)) {
        const currency = REGION_TO_CURRENCY[region];
        const isComped = updates.isComped !== undefined ? updates.isComped : currentSubscription.isComped === true;
        const monthlyAmount = isComped ? 0 : getMonthlyPrice(region, seatBlock);
        const amountCents = isComped ? 0 : getPriceInSmallestUnit(monthlyAmount, currency);
        subscriptionUpdate.currency = currency;
        subscriptionUpdate.clientCount = seatBlock;
        subscriptionUpdate.amountCents = amountCents;
        if (currency === 'KWD') subscriptionUpdate.amountFils = amountCents;
      } else if (updates.plan !== undefined || updates.clientSeats !== undefined) {
        const plan = updates.plan || currentSubscription.plan || 'free';
        const seats = updates.clientSeats ?? seatBlock;
        const isComped = updates.isComped !== undefined ? updates.isComped : currentSubscription.isComped === true;
        const monthlyFeeKwd = isComped ? 0 : calculateMonthlyFee(plan, seats);
        subscriptionUpdate.amountFils = monthlyFeeKwd * 1000;
      }

      updateData.subscription = subscriptionUpdate;
    }

    await updateDoc(orgRef, updateData);
    logger.info(`Organization ${orgId} updated successfully`);
  } catch (error) {
    logger.error(`Error updating organization ${orgId}:`, error);
    throw error;
  }
}

/**
 * Delete organization (client-side: deletes org doc only; no Auth).
 * For full hard delete including Auth users, use callDeleteOrganization (Cloud Function).
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

export interface OnboardingFunnel {
  step1?: number;
  step2?: number;
  step3?: number;
  step4?: number;
  lastUpdated?: { seconds: number; nanoseconds: number };
}

/**
 * Get onboarding funnel counts for platform dashboard.
 */
export async function getOnboardingFunnel(): Promise<OnboardingFunnel> {
  try {
    const ref = doc(getDb(), PLATFORM.onboardingFunnel());
    const snap = await getDoc(ref);
    if (!snap.exists()) return {};
    const data = snap.data();
    return {
      step1: typeof data.step1 === 'number' ? data.step1 : 0,
      step2: typeof data.step2 === 'number' ? data.step2 : 0,
      step3: typeof data.step3 === 'number' ? data.step3 : 0,
      step4: typeof data.step4 === 'number' ? data.step4 : 0,
      lastUpdated: data.lastUpdated as { seconds: number; nanoseconds: number } | undefined,
    };
  } catch (err) {
    logger.warn('Failed to fetch onboarding funnel:', err);
    return {};
  }
}

/**
 * Log onboarding step for funnel analytics (fire-and-forget; no PII).
 */
export function logOnboardingStep(step: number): void {
  if (typeof step !== 'number' || step < 1 || step > 4) return;
  const fn = httpsCallable<{ step: number }, { success: boolean }>(
    getFirebaseFunctions(),
    'logOnboardingStep',
  );
  fn({ step }).catch(() => { /* fire-and-forget */ });
}

/**
 * Permanently delete organization via Cloud Function (deletes org, subcollections, userProfiles, and Auth users).
 */
export async function callDeleteOrganization(
  orgId: string,
  deleteAuthUsers = true,
): Promise<{ success: boolean; message: string }> {
  const fn = httpsCallable<
    { orgId: string; deleteAuthUsers?: boolean },
    { success: boolean; message: string }
  >(getFirebaseFunctions(), 'deleteOrganizationCallable');
  const res = await fn({ orgId, deleteAuthUsers });
  return res.data;
}

/**
 * Pause organization subscription
 */
export async function pauseSubscription(orgId: string, adminUid?: string): Promise<void> {
  try {
    const orgRef = getOrganizationDoc(orgId);
    await updateDoc(orgRef, {
      'subscription.status': 'paused',
      updatedAt: serverTimestamp(),
    });
    logger.info(`Subscription paused for organization ${orgId}`);
    if (adminUid) {
      await logAdminAction(adminUid, 'subscription_pause', orgId);
    }
  } catch (error) {
    logger.error(`Error pausing subscription for ${orgId}:`, error);
    throw error;
  }
}

/**
 * Cancel organization subscription
 */
export async function cancelSubscription(orgId: string, adminUid?: string): Promise<void> {
  try {
    const orgRef = getOrganizationDoc(orgId);
    await updateDoc(orgRef, {
      'subscription.status': 'cancelled',
      updatedAt: serverTimestamp(),
    });
    logger.info(`Subscription cancelled for organization ${orgId}`);
    if (adminUid) {
      await logAdminAction(adminUid, 'subscription_cancel', orgId);
    }
  } catch (error) {
    logger.error(`Error cancelling subscription for ${orgId}:`, error);
    throw error;
  }
}

/**
 * Reactivate organization subscription
 */
export async function reactivateSubscription(orgId: string, adminUid?: string): Promise<void> {
  try {
    const orgRef = getOrganizationDoc(orgId);
    await updateDoc(orgRef, {
      'subscription.status': 'active',
      updatedAt: serverTimestamp(),
    });
    logger.info(`Subscription reactivated for organization ${orgId}`);
    if (adminUid) {
      await logAdminAction(adminUid, 'subscription_reactivate', orgId);
    }
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
      'dataAccessPermission.grantedAt': serverTimestamp(),
      'dataAccessPermission.grantedBy': platformAdminUid,
      'dataAccessPermission.reason': reason || 'Support request',
      updatedAt: serverTimestamp(),
    };
    await updateDoc(orgRef, updateData);
    logger.info(`Data access granted for org ${orgId} by ${platformAdminUid}`);
    await logAdminAction(platformAdminUid, 'data_access_grant', orgId, { reason: reason ?? undefined });
  } catch (error) {
    logger.error(`Error granting data access for org ${orgId}:`, error);
    throw error;
  }
}

/**
 * Revoke data access permission from platform admin (GDPR/HIPAA compliance)
 */
export async function revokeDataAccess(orgId: string, adminUid?: string): Promise<void> {
  try {
    const orgRef = getOrganizationDoc(orgId);
    const updateData: Record<string, unknown> = {
      'dataAccessPermission.platformAdminAccess': false,
      'dataAccessPermission.grantedAt': null,
      'dataAccessPermission.grantedBy': null,
      'dataAccessPermission.reason': null,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(orgRef, updateData);
    logger.info(`Data access revoked for org ${orgId}`);
    if (adminUid) {
      await logAdminAction(adminUid, 'data_access_revoke', orgId);
    }
  } catch (error) {
    logger.error(`Error revoking data access for org ${orgId}:`, error);
    throw error;
  }
}

/**
 * Get platform metrics history for the last N days.
 * Uses callable (server-side) to bypass Firestore rules.
 */
export async function getMetricsHistory(days: number = 30): Promise<PlatformMetricsHistoryEntry[]> {
  try {
    const fn = httpsCallable<
      { days?: number },
      PlatformMetricsHistoryEntry[]
    >(getFirebaseFunctions(), 'getMetricsHistory');
    const res = await fn({ days });
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    logger.error('Error fetching metrics history:', error);
    return [];
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
    totalAiCostsCents: 0,
    totalAssessments: 0,
    assessmentsThisMonth: 0,
    trialConversionsThisMonth: 0,
    churnsThisMonth: 0,
    updatedAt: now,
  };
}
