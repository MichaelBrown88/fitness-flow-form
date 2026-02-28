/**
 * Database Integrity Verification
 * 
 * Comprehensive check of database structure, links, and data integrity.
 * Run from browser console: await window.verifyDatabaseIntegrity()
 * 
 * This verifies:
 * - Organization structure
 * - User profile linking
 * - AI usage log linking
 * - Assessment/client counts
 * - Financial data accuracy
 * - No test/orphaned data
 */

import { getDocs, getDoc, collection } from 'firebase/firestore';
import { 
  getOrganizationsCollection,
  getOrganizationDoc,
  getAIUsageLogsCollection,
  getLegacyUserProfilesCollection,
} from '@/lib/database/collections';
import { getDb } from '@/services/firebase';
import { calculateMonthlyFee } from '@/lib/pricing';
import { logger as appLogger } from '@/lib/utils/logger';

const logger = {
  info: (...args: unknown[]) => appLogger.info('✅', ...args),
  warn: (...args: unknown[]) => appLogger.warn('⚠️', ...args),
  error: (...args: unknown[]) => appLogger.error('❌', ...args),
  section: (title: string) => appLogger.info(`\n📋 ${title}\n${'='.repeat(60)}`),
};

interface VerificationResult {
  success: boolean;
  organizations: {
    total: number;
    withValidSubscription: number;
    comped: number;
    active: number;
    issues: string[];
  };
  userProfiles: {
    total: number;
    withOrganizationId: number;
    withoutOrganizationId: number;
    platformAdmins: number;
    issues: string[];
  };
  aiUsageLogs: {
    total: number;
    withOrganizationId: number;
    withoutOrganizationId: number;
    withCostFils: number;
    totalCostFils: number;
    issues: string[];
  };
  assessments: {
    total: number;
    byOrganization: Record<string, number>;
    issues: string[];
  };
  financial: {
    systemStatsExists: boolean;
    totalOrgsInStats: number;
    totalCoachesInStats: number;
    totalClientsInStats: number;
    totalAssessmentsInStats: number;
    mrrFils: number;
    issues: string[];
  };
  overallIssues: string[];
}

export async function verifyDatabaseIntegrity(): Promise<VerificationResult> {
  const result: VerificationResult = {
    success: true,
    organizations: { total: 0, withValidSubscription: 0, comped: 0, active: 0, issues: [] },
    userProfiles: { total: 0, withOrganizationId: 0, withoutOrganizationId: 0, platformAdmins: 0, issues: [] },
    aiUsageLogs: { total: 0, withOrganizationId: 0, withoutOrganizationId: 0, withCostFils: 0, totalCostFils: 0, issues: [] },
    assessments: { total: 0, byOrganization: {}, issues: [] },
    financial: { systemStatsExists: false, totalOrgsInStats: 0, totalCoachesInStats: 0, totalClientsInStats: 0, totalAssessmentsInStats: 0, mrrFils: 0, issues: [] },
    overallIssues: [],
  };

  try {
    logger.section('DATABASE INTEGRITY VERIFICATION');

    // 1. Verify Organizations
    logger.info('1️⃣ Verifying Organizations...');
    const orgsSnapshot = await getDocs(getOrganizationsCollection());
    result.organizations.total = orgsSnapshot.size;

    for (const orgDoc of orgsSnapshot.docs) {
      const data = orgDoc.data();
      const orgId = orgDoc.id;

      // Check for test/deleted flags
      if (data.metadata?.isTest === true) {
        result.organizations.issues.push(`⚠️ ${orgId}: Marked as test (should be deleted)`);
        result.success = false;
      }
      if (data.metadata?.isDeleted === true) {
        result.organizations.issues.push(`⚠️ ${orgId}: Marked as deleted (should be removed)`);
        result.success = false;
      }

      // Check subscription
      if (data.subscription) {
        result.organizations.withValidSubscription++;
        if (data.subscription.isComped === true) {
          result.organizations.comped++;
        }
        if (data.subscription.status === 'active') {
          result.organizations.active++;
        }

        // Verify monthly fee calculation
        const plan = data.subscription.plan || 'free';
        const seats = data.subscription.clientSeats || 0;
        const expectedFee = data.subscription.isComped ? 0 : calculateMonthlyFee(plan, seats);
        if (data.subscription.amountFils !== undefined && data.subscription.amountFils !== expectedFee * 1000) {
          result.organizations.issues.push(`⚠️ ${orgId}: Monthly fee mismatch (expected ${expectedFee} KWD, got ${(data.subscription.amountFils || 0) / 1000} KWD)`);
        }
      }

      // Check stats exist
      if (!data.stats) {
        result.organizations.issues.push(`⚠️ ${orgId}: Missing stats object`);
      } else {
        // Stats will be verified separately
      }
    }

    logger.info(`   Found ${result.organizations.total} organizations`);
    logger.info(`   - With subscription: ${result.organizations.withValidSubscription}`);
    logger.info(`   - Comped: ${result.organizations.comped}`);
    logger.info(`   - Active: ${result.organizations.active}`);

    // 2. Verify User Profiles
    logger.info('\n2️⃣ Verifying User Profiles...');
    const userProfilesSnapshot = await getDocs(getLegacyUserProfilesCollection());
    result.userProfiles.total = userProfilesSnapshot.size;

    // Get platform admin UIDs
    const platformAdminsRef = collection(getDb(), 'platform_admins');
    const platformAdminsSnapshot = await getDocs(platformAdminsRef);
    const platformAdminUids = new Set(platformAdminsSnapshot.docs.map(doc => doc.id));

    for (const userDoc of userProfilesSnapshot.docs) {
      const data = userDoc.data();
      const uid = userDoc.id;
      const isPlatformAdmin = platformAdminUids.has(uid);

      if (isPlatformAdmin) {
        result.userProfiles.platformAdmins++;
        // Platform admin should NOT have organizationId
        if (data.organizationId) {
          result.userProfiles.issues.push(`❌ Platform admin ${uid} has organizationId (should be null)`);
          result.success = false;
        }
        if (data.role === 'org_admin' || data.role === 'coach') {
          result.userProfiles.issues.push(`❌ Platform admin ${uid} has incorrect role: ${data.role}`);
          result.success = false;
        }
      } else {
        // Regular users MUST have organizationId
        if (data.organizationId) {
          result.userProfiles.withOrganizationId++;
          
          // Verify org exists
          const orgRef = getOrganizationDoc(data.organizationId);
          const orgSnap = await getDoc(orgRef);
          if (!orgSnap.exists()) {
            result.userProfiles.issues.push(`❌ User ${uid} points to non-existent org: ${data.organizationId}`);
            result.success = false;
          }
        } else {
          result.userProfiles.withoutOrganizationId++;
          if (data.role === 'coach' || data.role === 'org_admin') {
            result.userProfiles.issues.push(`❌ Coach/Admin ${uid} has no organizationId`);
            result.success = false;
          }
        }
      }
    }

    logger.info(`   Found ${result.userProfiles.total} user profiles`);
    logger.info(`   - With organizationId: ${result.userProfiles.withOrganizationId}`);
    logger.info(`   - Without organizationId: ${result.userProfiles.withoutOrganizationId} (platform admins: ${result.userProfiles.platformAdmins})`);

    // 3. Verify AI Usage Logs
    logger.info('\n3️⃣ Verifying AI Usage Logs...');
    const aiLogsSnapshot = await getDocs(getAIUsageLogsCollection());
    result.aiUsageLogs.total = aiLogsSnapshot.size;

    for (const logDoc of aiLogsSnapshot.docs) {
      const data = logDoc.data();

      if (data.organizationId) {
        result.aiUsageLogs.withOrganizationId++;
        
        // Verify org exists
        const orgRef = getOrganizationDoc(data.organizationId);
        const orgSnap = await getDoc(orgRef);
        if (!orgSnap.exists()) {
          result.aiUsageLogs.issues.push(`❌ AI log ${logDoc.id} points to non-existent org: ${data.organizationId}`);
          result.success = false;
        }
      } else {
        result.aiUsageLogs.withoutOrganizationId++;
        result.aiUsageLogs.issues.push(`⚠️ AI log ${logDoc.id} has no organizationId`);
      }

      // Check costFils
      if (data.costFils !== undefined && data.costFils > 0) {
        result.aiUsageLogs.withCostFils++;
        result.aiUsageLogs.totalCostFils += data.costFils;
      } else if (data.costEstimate) {
        // Legacy cost, should be converted
        result.aiUsageLogs.issues.push(`⚠️ AI log ${logDoc.id} has costEstimate but no costFils (should run recalculateAICosts)`);
      }
    }

    logger.info(`   Found ${result.aiUsageLogs.total} AI usage logs`);
    logger.info(`   - With organizationId: ${result.aiUsageLogs.withOrganizationId}`);
    logger.info(`   - Without organizationId: ${result.aiUsageLogs.withoutOrganizationId}`);
    logger.info(`   - With costFils: ${result.aiUsageLogs.withCostFils}`);
    logger.info(`   - Total cost: ${(result.aiUsageLogs.totalCostFils / 1000).toFixed(3)} KWD`);

    // 4. Verify Assessments (count actual assessments)
    logger.info('\n4️⃣ Verifying Assessments...');
    const coachesRef = collection(getDb(), 'coaches');
    const coachesSnapshot = await getDocs(coachesRef);

    for (const coachDoc of coachesSnapshot.docs) {
      const coachUid = coachDoc.id;
      
      // Get coach's organizationId
      const userProfileRef = collection(getDb(), 'userProfiles');
      const userProfileSnap = await getDocs(userProfileRef);
      let coachOrgId: string | null = null;
      
      userProfileSnap.docs.forEach(userDoc => {
        if (userDoc.id === coachUid) {
          coachOrgId = userDoc.data().organizationId || null;
        }
      });

      // Count assessments for this coach
      const assessmentsRef = collection(getDb(), 'coaches', coachUid, 'assessments');
      const assessmentsSnapshot = await getDocs(assessmentsRef);
      const assessmentCount = assessmentsSnapshot.size;
      
      if (assessmentCount > 0) {
        result.assessments.total += assessmentCount;
        if (coachOrgId) {
          result.assessments.byOrganization[coachOrgId] = 
            (result.assessments.byOrganization[coachOrgId] || 0) + assessmentCount;
        } else {
          result.assessments.issues.push(`⚠️ Coach ${coachUid} has ${assessmentCount} assessments but no organizationId`);
        }
      }
    }

    logger.info(`   Found ${result.assessments.total} total assessments`);
    logger.info(`   - By organization:`, result.assessments.byOrganization);

    // 5. Verify System Stats
    logger.info('\n5️⃣ Verifying System Stats...');
    const systemStatsRef = collection(getDb(), 'system_stats');
    const systemStatsSnapshot = await getDocs(systemStatsRef);
    
    if (systemStatsSnapshot.empty) {
      result.financial.issues.push('❌ system_stats collection does not exist');
      result.success = false;
    } else {
      const globalMetricsDoc = systemStatsSnapshot.docs.find(doc => doc.id === 'global_metrics');
      if (!globalMetricsDoc) {
        result.financial.issues.push('❌ system_stats/global_metrics document does not exist');
        result.success = false;
      } else {
        result.financial.systemStatsExists = true;
        const stats = globalMetricsDoc.data();
        result.financial.totalOrgsInStats = stats.totalOrgs || 0;
        result.financial.totalCoachesInStats = stats.totalCoaches || 0;
        result.financial.totalClientsInStats = stats.totalClients || 0;
        result.financial.totalAssessmentsInStats = stats.totalAssessments || 0;
        result.financial.mrrFils = stats.monthlyRecurringRevenueFils || 0;

        // Compare with actual counts
        if (result.financial.totalOrgsInStats !== result.organizations.total) {
          result.financial.issues.push(`⚠️ Org count mismatch: stats says ${result.financial.totalOrgsInStats}, actual is ${result.organizations.total}`);
        }
        if (result.financial.totalCoachesInStats !== result.userProfiles.withOrganizationId) {
          // This might be okay if some users are clients, not coaches
          // But we'll flag it for review
          result.financial.issues.push(`⚠️ Coach count mismatch: stats says ${result.financial.totalCoachesInStats}, checking...`);
        }
      }
    }

    logger.info(`   System stats exists: ${result.financial.systemStatsExists}`);
    if (result.financial.systemStatsExists) {
      logger.info(`   - Total orgs: ${result.financial.totalOrgsInStats}`);
      logger.info(`   - Total coaches: ${result.financial.totalCoachesInStats}`);
      logger.info(`   - Total clients: ${result.financial.totalClientsInStats}`);
      logger.info(`   - Total assessments: ${result.financial.totalAssessmentsInStats}`);
      logger.info(`   - MRR: ${(result.financial.mrrFils / 1000).toFixed(3)} KWD`);
    }

    // Summary
    logger.section('VERIFICATION SUMMARY');

    const allIssues = [
      ...result.organizations.issues,
      ...result.userProfiles.issues,
      ...result.aiUsageLogs.issues,
      ...result.assessments.issues,
      ...result.financial.issues,
    ];

    if (allIssues.length === 0) {
      logger.info('✅ ALL CHECKS PASSED - Database integrity verified!');
      result.success = true;
    } else {
      logger.warn(`⚠️ Found ${allIssues.length} issues:`);
      allIssues.forEach(issue => logger.warn(`   ${issue}`));
      result.success = false;
    }

    result.overallIssues = allIssues;

    return result;
  } catch (error) {
    logger.error('❌ Verification failed:', error);
    result.success = false;
    result.overallIssues.push(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }
}

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as unknown as { verifyDatabaseIntegrity: typeof verifyDatabaseIntegrity }).verifyDatabaseIntegrity = verifyDatabaseIntegrity;
}
