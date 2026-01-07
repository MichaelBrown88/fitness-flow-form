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
  collection, 
  getDocs, 
  query, 
  where,
  collectionGroup
} from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import type { 
  PlatformAdmin, 
  PlatformMetrics, 
  OrganizationSummary,
  AICostBreakdown 
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
  getLegacyRootAssessmentsCollection,
  getLegacyUserProfilesCollection,
  getAIUsageLogsCollection,
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
    { isPasswordSet: true, lastLoginAt: new Date() }, 
    { merge: true }
  );
}

/**
 * Update last login time
 */
export async function updateLastLogin(uid: string): Promise<void> {
  await setDoc(
    getPlatformAdminDoc(uid),
    { lastLoginAt: new Date() },
    { merge: true }
  );
}

/**
 * Get platform metrics (cached)
 */
export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  try {
    const docRef = getPlatformMetricsDoc();
    const snapshot = await getDoc(docRef);
    
    if (!snapshot.exists()) {
      // Return default metrics if none exist yet
      return getDefaultMetrics();
    }
    
    return snapshot.data() as PlatformMetrics;
  } catch (error) {
    logger.error('Error fetching platform metrics:', error);
    return getDefaultMetrics();
  }
}

/**
 * Get live metrics by counting actual documents in Firestore
 * NO fake data - only real counts from the database
 * Currency is in fils (1 KWD = 1000 fils)
 */
export async function getLiveMetrics(): Promise<PlatformMetrics> {
  try {
    const db = getDb();
    
    // Count organizations from organizations collection
    const orgsSnapshot = await getDocs(getOrganizationsCollection());
    const orgs = orgsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const totalOrganizations = orgs.length;
    
    // Only count as active if they have explicit active+paid subscription
    const activeOrganizations = orgs.filter(o => 
      o.subscription?.status === 'active' && o.subscription?.plan !== 'free'
    ).length;
    
    const trialOrganizations = orgs.filter(o => 
      o.subscription?.status === 'trial'
    ).length;
    
    // Count users from userProfiles collection (legacy path)
    const usersSnapshot = await getDocs(getLegacyUserProfilesCollection());
    const totalUsers = usersSnapshot.size;
    const totalCoaches = usersSnapshot.size; // All users are coaches/admins
    
    // Count clients using collectionGroup query (clients are in coaches/{uid}/clients/ OR organizations/{orgId}/clients/)
    let totalClients = 0;
    try {
      const clientsSnapshot = await getDocs(collectionGroup(db, 'clients'));
      totalClients = clientsSnapshot.size;
    } catch {
      // Fallback: count unique client names from assessments
      const assessmentsForClients = await getDocs(getLegacyRootAssessmentsCollection());
      const uniqueClients = new Set<string>();
      assessmentsForClients.docs.forEach(doc => {
        const data = doc.data();
        if (data.clientName) uniqueClients.add(data.clientName.toLowerCase());
      });
      totalClients = uniqueClients.size;
    }
    
    // Count assessments from assessments collection (legacy root-level)
    const assessmentsSnapshot = await getDocs(getLegacyRootAssessmentsCollection());
    const totalAssessments = assessmentsSnapshot.size;
    
    // Count this month's assessments
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const assessmentsThisMonth = assessmentsSnapshot.docs.filter(doc => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() || data.timestamp?.toDate?.();
      return createdAt && createdAt >= startOfMonth;
    }).length;
    
    // MRR/ARR: 0 until actual subscriptions are set up
    // Will only show revenue when orgs have subscription.amountFils set
    let mrrFils = 0;
    orgs.forEach(org => {
      if (org.subscription?.status === 'active' && org.subscription?.amountFils) {
        mrrFils += org.subscription.amountFils;
      }
    });
    
    // AI costs: Sum from ai_usage_logs if available
    let aiCostsMtdFils = 0;
    try {
      const aiLogsSnapshot = await getDocs(getAIUsageLogsCollection());
      aiLogsSnapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const logDate = data.timestamp?.toDate?.();
        if (logDate && logDate >= startOfMonth && data.costFils) {
          aiCostsMtdFils += data.costFils;
        }
      });
    } catch {
      // AI logs collection may not exist yet
    }
    
    logger.debug('Live metrics calculated:', {
      totalOrganizations,
      activeOrganizations,
      trialOrganizations,
      totalUsers,
      totalClients,
      totalAssessments,
      assessmentsThisMonth,
      mrrFils,
      aiCostsMtdFils,
    });
    
    return {
      totalOrganizations,
      activeOrganizations,
      trialOrganizations,
      totalUsers,
      totalCoaches,
      totalClients,
      mrrCents: mrrFils, // Actually fils, not cents
      arrCents: mrrFils * 12,
      aiCostsMtdCents: aiCostsMtdFils,
      aiCostsLastMonthCents: 0,
      totalAssessments,
      assessmentsThisMonth,
      updatedAt: new Date(),
    };
  } catch (error) {
    logger.error('Error calculating live metrics:', error);
    return getDefaultMetrics();
  }
}

/**
 * Get organization list for platform admin with stats
 * Counts are based on actual data linkages (coachUid, organizationId)
 */
export async function getOrganizations(
  limitCount: number = 50
): Promise<OrganizationSummary[]> {
  try {
    const db = getDb();
    
    // Get all organizations
    const orgsSnapshot = await getDocs(getOrganizationsCollection());
    
    if (orgsSnapshot.empty) {
      logger.debug('No organizations found in database');
      return [];
    }
    
    // Get all user profiles to count coaches per org (legacy path)
    const usersSnapshot = await getDocs(getLegacyUserProfilesCollection());
    const usersByOrg = new Map<string, number>();
    const coachUidToOrgId = new Map<string, string>(); // Map coachUid to their orgId
    
    usersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const orgId = data.organizationId;
      const uid = doc.id;
      
      if (orgId) {
        usersByOrg.set(orgId, (usersByOrg.get(orgId) || 0) + 1);
        coachUidToOrgId.set(uid, orgId);
      }
    });
    
    // Get assessments and count clients + assessments per org (legacy root-level)
    const assessmentsSnapshot = await getDocs(getLegacyRootAssessmentsCollection());
    const assessmentsByOrg = new Map<string, number>();
    const clientsByOrg = new Map<string, Set<string>>(); // Use Set to count unique clients
    
    assessmentsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      // Find org either by organizationId or by looking up coachUid
      const orgId = data.organizationId || coachUidToOrgId.get(data.coachUid) || data.coachUid;
      
      if (orgId) {
        // Count assessments
        assessmentsByOrg.set(orgId, (assessmentsByOrg.get(orgId) || 0) + 1);
        
        // Count unique clients
        if (data.clientName) {
          if (!clientsByOrg.has(orgId)) {
            clientsByOrg.set(orgId, new Set());
          }
          clientsByOrg.get(orgId)!.add(data.clientName.toLowerCase());
        }
      }
    });
    
    const organizations = orgsSnapshot.docs.map(doc => {
      const data = doc.data();
      const orgId = doc.id;
      
      return {
        id: orgId,
        name: data.name || 'Unnamed Organization',
        type: data.type || 'solo_coach',
        plan: data.subscription?.plan || 'free',
        status: data.subscription?.status || 'none',
        coachCount: usersByOrg.get(orgId) || 0,
        clientCount: clientsByOrg.get(orgId)?.size || 0,
        assessmentCount: assessmentsByOrg.get(orgId) || 0,
        aiCostsMtdCents: data.aiCostsMtdFils || 0,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        trialEndsAt: data.subscription?.trialEndsAt?.toDate?.(),
      } as OrganizationSummary;
    });
    
    // Sort by createdAt descending
    organizations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return organizations.slice(0, limitCount);
  } catch (error) {
    logger.error('Error fetching organizations:', error);
    return [];
  }
}

/**
 * Get AI cost breakdown by organization
 */
export async function getAICostBreakdown(period: string): Promise<AICostBreakdown[]> {
  // This would query from an AI usage tracking collection
  // For now, return empty array - this needs usage tracking to be implemented
  logger.debug('AI cost breakdown requested for period:', period);
  return [];
}

function getDefaultMetrics(): PlatformMetrics {
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
    updatedAt: new Date(),
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

