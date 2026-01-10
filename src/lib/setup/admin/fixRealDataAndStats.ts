/**
 * Fix Real Data and Stats
 * 
 * This script:
 * 1. Queries REAL data from Firestore collections (not aggregated stats)
 * 2. Updates organization documents with correct stats
 * 3. Recalculates system_stats/global_metrics with actual counts
 * 4. Deletes any unwanted organizations (like "New Organization")
 * 
 * Run from browser console: await window.fixRealDataAndStats()
 */

import { 
  getDocs, 
  deleteDoc,
  updateDoc,
  setDoc,
  query,
  where,
  collection,
  doc,
  writeBatch
} from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { logger } from '@/lib/utils/logger';
import {
  getOrganizationsCollection,
  getOrganizationDoc,
  getSystemStatsDoc,
  getLegacyUserProfilesCollection,
  getLegacyRootAssessmentsCollection,
  getLegacyCoachDoc,
  getAIUsageLogsCollection,
} from '@/lib/database/collections';

interface OrgRealStats {
  orgId: string;
  name: string;
  coachCount: number;
  clientCount: number;
  assessmentCount: number;
  aiCostsMtdFils: number;
  lastAssessmentDate: Date | null;
}

/**
 * Get real-time stats for a specific organization
 * Coaches are stored in userProfiles, and their data is under coaches/{userUID}/
 */
async function getOrgRealStats(orgId: string): Promise<OrgRealStats> {
  const db = getDb();
  
  // Get coaches from userProfiles (users with organizationId matching this org)
  const userProfilesRef = getLegacyUserProfilesCollection();
  const userProfilesSnapshot = await getDocs(userProfilesRef);
  
  const coachUids: string[] = [];
  userProfilesSnapshot.docs.forEach(userDoc => {
    const data = userDoc.data();
    const authUid = userDoc.id; // Document ID is the Firebase Auth UID
    const userOrgId = data.organizationId;
    
    // Only count coaches that belong to THIS specific org
    if (userOrgId === orgId && (data.role === 'coach' || data.role === 'org_admin')) {
      coachUids.push(authUid);
    }
  });
  
  const coachCount = coachUids.length;
  logger.info(`Found ${coachCount} coaches for org ${orgId}: ${coachUids.join(', ')}`);
  
  const clientSet = new Set<string>();
  let totalAssessments = 0;
  let lastAssessmentDate: Date | null = null;
  
  // Count clients and assessments from each coach UID
  for (const coachUid of coachUids) {
    // Count clients for this coach
    try {
      const clientsRef = collection(db, 'coaches', coachUid, 'clients');
      const clientsSnapshot = await getDocs(clientsRef);
      clientsSnapshot.docs.forEach(clientDoc => {
        // Use combination of coachId and clientId for uniqueness
        clientSet.add(`${coachUid}:${clientDoc.id}`);
      });
      if (clientsSnapshot.size > 0) {
        logger.info(`Coach ${coachUid} has ${clientsSnapshot.size} clients`);
      }
    } catch (e) {
      logger.warn(`Error counting clients for coach ${coachUid}:`, e);
    }
    
    // Count assessments for this coach
    try {
      const assessmentsRef = collection(db, 'coaches', coachUid, 'assessments');
      const assessmentsSnapshot = await getDocs(assessmentsRef);
      if (assessmentsSnapshot.size > 0) {
        logger.info(`Coach ${coachUid} has ${assessmentsSnapshot.size} assessments`);
      }
      
      assessmentsSnapshot.docs.forEach(assessmentDoc => {
        totalAssessments++;
        const assessmentData = assessmentDoc.data();
        const createdAt = assessmentData.createdAt?.toDate?.() || assessmentData.timestamp?.toDate?.();
        if (createdAt) {
          if (!lastAssessmentDate || createdAt > lastAssessmentDate) {
            lastAssessmentDate = createdAt;
          }
        }
      });
    } catch (e) {
      logger.warn(`Error counting assessments for coach ${coachUid}:`, e);
    }
  }
  
  const totalClients = clientSet.size;
  
  // Count AI costs from ALL ai_usage_logs (since One Fitness is the only org)
  const aiLogsRef = getAIUsageLogsCollection();
  const aiLogsSnapshot = await getDocs(aiLogsRef);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  let aiCostsMtdFils = 0;
  aiLogsSnapshot.docs.forEach(logDoc => {
    const logData = logDoc.data();
    // Include all AI costs (they're all for One Fitness if it's the only org)
    // But prefer organizationId match if available
    const belongsToOrg = !logData.organizationId || logData.organizationId === orgId;
    
    if (belongsToOrg) {
      const logDate = logData.timestamp?.toDate?.() || logData.createdAt?.toDate?.();
      if (logDate && logDate >= startOfMonth) {
        // Handle both new (costFils) and legacy (costEstimate) fields
        let costFils = logData.costFils || 0;
        if (costFils === 0 && logData.costEstimate) {
          // Convert USD to KWD, then to fils: USD * 0.305 KWD/USD * 1000 fils/KWD
          costFils = Math.round(logData.costEstimate * 0.305 * 1000);
        }
        aiCostsMtdFils += costFils;
      }
    }
  });
  
  logger.info(`Calculated stats: ${coachCount} coaches, ${totalClients} clients, ${totalAssessments} assessments, ${aiCostsMtdFils} fils`);
  
  return {
    orgId,
    name: '', // Will be filled from org doc
    coachCount,
    clientCount: totalClients,
    assessmentCount: totalAssessments,
    aiCostsMtdFils,
    lastAssessmentDate,
  };
}

/**
 * Recalculate and fix all organization stats and system stats
 */
export async function fixRealDataAndStats(): Promise<{
  success: boolean;
  organizationsFixed: string[];
  systemStatsUpdated: boolean;
  orgsDeleted: string[];
  errors: string[];
}> {
  const db = getDb();
  const result = {
    success: false,
    organizationsFixed: [] as string[],
    systemStatsUpdated: false,
    orgsDeleted: [] as string[],
    errors: [] as string[],
  };
  
  try {
    // 1. Get all organizations
    const orgsSnapshot = await getDocs(getOrganizationsCollection());
    const organizations: Array<{ id: string; name: string; isOneFitness: boolean }> = [];
    
    for (const orgDoc of orgsSnapshot.docs) {
      const data = orgDoc.data();
      const name = String(data.name || '').toLowerCase();
      const isOneFitness = 
        name.includes('one fitness') ||
        name.includes('onefitness') ||
        name === 'one fitness' ||
        orgDoc.id.includes('onefitness');
      
      organizations.push({
        id: orgDoc.id,
        name: data.name || 'Unnamed',
        isOneFitness,
      });
    }
    
    // 2. Find One Fitness org first
    const oneFitnessOrg = organizations.find(o => o.isOneFitness);
    if (!oneFitnessOrg) {
      result.errors.push('One Fitness organization not found');
      return result;
    }
    
    // 3. Delete "New Organization" and other unwanted orgs (keep only One Fitness)
    for (const org of organizations) {
      if (!org.isOneFitness) {
        try {
          await deleteDoc(getOrganizationDoc(org.id));
          result.orgsDeleted.push(`${org.id} (${org.name})`);
          logger.info('Deleted organization:', org.id, org.name);
        } catch (e) {
          result.errors.push(`Failed to delete org ${org.id}: ${e}`);
        }
      }
    }
    
    logger.info('Calculating real stats for One Fitness:', oneFitnessOrg.id);
    const realStats = await getOrgRealStats(oneFitnessOrg.id);
    realStats.name = oneFitnessOrg.name;
    
    // 4. Update One Fitness organization document with real stats
    await updateDoc(getOrganizationDoc(oneFitnessOrg.id), {
      stats: {
        coachCount: realStats.coachCount,
        clientCount: realStats.clientCount,
        assessmentCount: realStats.assessmentCount,
        aiCostsMtdFils: realStats.aiCostsMtdFils,
        lastAssessmentDate: realStats.lastAssessmentDate || null,
        lastUpdated: new Date(),
      },
    });
    
    result.organizationsFixed.push(oneFitnessOrg.id);
    logger.info(`Updated One Fitness stats: ${realStats.coachCount} coaches, ${realStats.clientCount} clients, ${realStats.assessmentCount} assessments`);
    
    // 5. Recalculate system_stats from scratch
    // Count total organizations (should be 1 - One Fitness)
    const totalOrgs = 1; // Only One Fitness now
    
    // Count total coaches from userProfiles (only those belonging to One Fitness)
    const userProfilesSnapshot = await getDocs(getLegacyUserProfilesCollection());
    let totalCoaches = 0;
    const coachUids: string[] = [];
    const oneFitnessOrgId = oneFitnessOrg.id;
    
    userProfilesSnapshot.docs.forEach(userDoc => {
      const data = userDoc.data();
      // Only count coaches belonging to One Fitness
      if ((data.role === 'coach' || data.role === 'org_admin') && data.organizationId === oneFitnessOrgId) {
        totalCoaches++;
        coachUids.push(userDoc.id); // Document ID is the Firebase Auth UID
      }
    });
    
    logger.info(`Total coaches for One Fitness: ${totalCoaches} (${coachUids.join(', ')})`);
    
    // Count total clients and assessments from all coaches
    const clientSet = new Set<string>();
    let totalAssessments = 0;
    
    for (const coachUid of coachUids) {
      // Count clients
      try {
        const clientsRef = collection(db, 'coaches', coachUid, 'clients');
        const clientsSnapshot = await getDocs(clientsRef);
        clientsSnapshot.docs.forEach(clientDoc => {
          clientSet.add(`${coachUid}:${clientDoc.id}`);
        });
      } catch (e) {
        logger.warn(`Error counting clients for coach ${coachUid}:`, e);
      }
      
      // Count assessments
      try {
        const assessmentsRef = collection(db, 'coaches', coachUid, 'assessments');
        const assessmentsSnapshot = await getDocs(assessmentsRef);
        totalAssessments += assessmentsSnapshot.size;
      } catch (e) {
        logger.warn(`Error counting assessments for coach ${coachUid}:`, e);
      }
    }
    
    const totalClients = clientSet.size;
    
    // Also count from root assessments collection if any exist
    try {
      const assessmentsSnapshot = await getDocs(getLegacyRootAssessmentsCollection());
      totalAssessments += assessmentsSnapshot.size;
    } catch (e) {
      logger.warn('Error counting root assessments:', e);
    }
    
    // Count AI costs (total, not just MTD) - all belong to One Fitness since it's the only real org
    const aiLogsSnapshot = await getDocs(getAIUsageLogsCollection());
    let totalAiCostsFils = 0;
    let totalAiTokensUsed = 0;
    
    aiLogsSnapshot.docs.forEach(logDoc => {
      const logData = logDoc.data();
      // Count all AI costs (they're all for One Fitness - test orgs don't have real usage)
      // Handle both new (costFils) and legacy (costEstimate) fields
      let costFils = logData.costFils || 0;
      if (costFils === 0 && logData.costEstimate) {
        // Convert USD to KWD, then to fils: USD * 0.305 KWD/USD * 1000 fils/KWD
        costFils = Math.round(logData.costEstimate * 0.305 * 1000);
      }
      totalAiCostsFils += costFils;
      totalAiTokensUsed += logData.tokensUsed || 0;
    });
    
    logger.info(`Total AI costs: ${totalAiCostsFils} fils, Tokens: ${totalAiTokensUsed}`);
    
    logger.info(`Recalculated system stats: ${totalOrgs} orgs, ${totalCoaches} coaches, ${totalClients} clients, ${totalAssessments} assessments, ${totalAiCostsFils} fils`);
    
    // MRR should be 0 (One Fitness is comped)
    const monthlyRecurringRevenueFils = 0;
    
    // Active orgs: 1 (One Fitness)
    const activeOrgs = 1;
    const trialOrgs = 0;
    
    // 6. Update system_stats/global_metrics
    const systemStatsRef = getSystemStatsDoc();
    await setDoc(systemStatsRef, {
      totalOrgs,
      activeOrgs,
      trialOrgs,
      totalCoaches,
      totalClients,
      totalAssessments,
      totalAiTokensUsed,
      totalAiCostsFils,
      monthlyRecurringRevenueFils,
      lastUpdated: new Date(),
      version: 1,
    }, { merge: true });
    
    result.systemStatsUpdated = true;
    logger.info(`Updated system_stats with real data: ${totalOrgs} orgs, ${totalCoaches} coaches, ${totalClients} clients, ${totalAssessments} assessments, ${totalAiCostsFils} fils`);
    
    result.success = true;
    return result;
    
  } catch (error) {
    logger.error('Failed to fix real data and stats:', error);
    result.errors.push(`General error: ${error}`);
    return result;
  }
}

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as unknown as { 
    fixRealDataAndStats: typeof fixRealDataAndStats;
  }).fixRealDataAndStats = fixRealDataAndStats;
}

