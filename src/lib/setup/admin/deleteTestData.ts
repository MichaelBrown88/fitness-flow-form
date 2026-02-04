/**
 * Delete Test Data
 *
 * This tool identifies and removes test user accounts, demo assessments,
 * and placeholder accounts that should be cleaned up in production.
 *
 * Run from browser console: await window.deleteTestData()
 *
 * For dry-run mode (default): await window.deleteTestData({ dryRun: true })
 * For specific deletion: await window.deleteTestData({ dryRun: false, targetUids: ['uid1', 'uid2'] })
 *
 * IMPORTANT: This is a destructive operation. Always run in dry-run mode first!
 */

import {
  getDocs,
  deleteDoc,
  doc,
  collection,
  writeBatch,
  query,
  where,
} from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { logger as appLogger } from '@/lib/utils/logger';
import {
  getLegacyUserProfilesCollection,
  getLegacyCoachesCollection,
  getOrganizationsCollection,
  getOrganizationDoc,
  getAIUsageLogsCollection,
  getPlatformAdminsCollection,
} from '@/lib/database/collections';
import { COLLECTIONS } from '@/constants/collections';

const logger = {
  info: (...args: unknown[]) => appLogger.info('✅', ...args),
  warn: (...args: unknown[]) => appLogger.warn('⚠️', ...args),
  error: (...args: unknown[]) => appLogger.error('❌', ...args),
  section: (title: string) => appLogger.info(`\n📋 ${title}\n${'='.repeat(60)}`),
};

// ============================================================================
// TYPES
// ============================================================================

interface TestAccount {
  uid: string;
  email: string;
  role?: string;
  organizationId?: string;
  reason: string;
  assessmentCount: number;
  clientCount: number;
}

interface TestOrganization {
  id: string;
  name: string;
  reason: string;
  coachCount: number;
  assessmentCount: number;
}

interface DeleteTestDataOptions {
  /** If true (default), only report what would be deleted without making changes */
  dryRun?: boolean;

  /** Specific UIDs to target for deletion (optional) */
  targetUids?: string[];

  /** Specific organization IDs to target for deletion (optional) */
  targetOrgIds?: string[];

  /** If true, also delete AI usage logs associated with test accounts */
  deleteAILogs?: boolean;

  /** Patterns to match test emails */
  testEmailPatterns?: string[];
}

interface DeleteTestDataResult {
  success: boolean;
  dryRun: boolean;
  testAccounts: TestAccount[];
  testOrganizations: TestOrganization[];
  deleted: {
    userProfiles: string[];
    coaches: string[];
    clients: string[];
    assessments: string[];
    organizations: string[];
    aiLogs: number;
  };
  errors: string[];
}

// ============================================================================
// DEFAULT PATTERNS
// ============================================================================

const DEFAULT_TEST_EMAIL_PATTERNS = [
  'test',
  'demo',
  'example',
  'placeholder',
  'fake',
  'dummy',
  'sample',
  '@test.',
  '@demo.',
  '@example.',
];

const PROTECTED_EMAILS = [
  'michaeljbrown88@gmail.com', // Platform owner
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if an email matches test patterns
 */
function isTestEmail(email: string, patterns: string[]): boolean {
  const normalizedEmail = email.toLowerCase();

  // Never delete protected emails
  if (PROTECTED_EMAILS.some(e => e.toLowerCase() === normalizedEmail)) {
    return false;
  }

  return patterns.some(pattern => normalizedEmail.includes(pattern.toLowerCase()));
}

/**
 * Check if an account appears to be a test/placeholder based on various heuristics
 */
function isTestAccount(
  email: string,
  role: string | undefined,
  assessmentCount: number,
  clientCount: number,
  patterns: string[],
): { isTest: boolean; reason: string } {
  // Check email patterns
  if (isTestEmail(email, patterns)) {
    return { isTest: true, reason: `Email matches test pattern` };
  }

  // Check for "Coach" placeholder (common test account name)
  if (email.toLowerCase() === 'coach' || email === 'Coach') {
    return { isTest: true, reason: 'Placeholder "Coach" account' };
  }

  // Check for zero activity coach accounts
  if (role === 'coach' && assessmentCount === 0 && clientCount === 0) {
    // Only flag if it also has a suspicious email
    if (email.includes('@') === false) {
      return { isTest: true, reason: 'Zero-activity account with invalid email' };
    }
  }

  return { isTest: false, reason: '' };
}

/**
 * Check if an organization appears to be a test organization
 */
function isTestOrganization(
  name: string,
  metadata?: { isTest?: boolean; isDeleted?: boolean },
): { isTest: boolean; reason: string } {
  // Check metadata flags
  if (metadata?.isTest === true) {
    return { isTest: true, reason: 'Marked as test in metadata' };
  }

  if (metadata?.isDeleted === true) {
    return { isTest: true, reason: 'Marked as deleted in metadata' };
  }

  // Check name patterns
  const normalizedName = name.toLowerCase();
  const testPatterns = ['test', 'demo', 'sample', 'example', 'new organization', 'dummy'];

  for (const pattern of testPatterns) {
    if (normalizedName.includes(pattern)) {
      return { isTest: true, reason: `Name contains "${pattern}"` };
    }
  }

  return { isTest: false, reason: '' };
}

/**
 * Get assessment and client counts for a coach
 */
async function getCoachStats(coachUid: string): Promise<{ assessments: number; clients: number }> {
  const db = getDb();

  let assessments = 0;
  let clients = 0;

  try {
    const assessmentsRef = collection(db, COLLECTIONS.COACHES, coachUid, COLLECTIONS.ASSESSMENTS);
    const assessmentsSnapshot = await getDocs(assessmentsRef);
    assessments = assessmentsSnapshot.size;
  } catch {
    // Collection might not exist
  }

  try {
    const clientsRef = collection(db, COLLECTIONS.COACHES, coachUid, COLLECTIONS.CLIENTS);
    const clientsSnapshot = await getDocs(clientsRef);
    clients = clientsSnapshot.size;
  } catch {
    // Collection might not exist
  }

  return { assessments, clients };
}

/**
 * Delete a coach and all their subcollections
 */
async function deleteCoachData(coachUid: string): Promise<{ assessments: number; clients: number }> {
  const db = getDb();
  let deletedAssessments = 0;
  let deletedClients = 0;

  // Delete assessments
  try {
    const assessmentsRef = collection(db, COLLECTIONS.COACHES, coachUid, COLLECTIONS.ASSESSMENTS);
    const assessmentsSnapshot = await getDocs(assessmentsRef);

    for (const docSnap of assessmentsSnapshot.docs) {
      // Also delete any subcollections (current, history, snapshots)
      const subCollections = ['current', 'history', 'snapshots'];
      for (const subCol of subCollections) {
        try {
          const subRef = collection(db, COLLECTIONS.COACHES, coachUid, COLLECTIONS.ASSESSMENTS, docSnap.id, subCol);
          const subSnapshot = await getDocs(subRef);
          for (const subDoc of subSnapshot.docs) {
            await deleteDoc(subDoc.ref);
          }
        } catch {
          // Subcollection might not exist
        }
      }

      await deleteDoc(docSnap.ref);
      deletedAssessments++;
    }
  } catch {
    // Collection might not exist
  }

  // Delete clients
  try {
    const clientsRef = collection(db, COLLECTIONS.COACHES, coachUid, COLLECTIONS.CLIENTS);
    const clientsSnapshot = await getDocs(clientsRef);

    for (const docSnap of clientsSnapshot.docs) {
      await deleteDoc(docSnap.ref);
      deletedClients++;
    }
  } catch {
    // Collection might not exist
  }

  // Delete the coach document itself
  try {
    const coachRef = doc(db, COLLECTIONS.COACHES, coachUid);
    await deleteDoc(coachRef);
  } catch {
    // Document might not exist
  }

  return { assessments: deletedAssessments, clients: deletedClients };
}

/**
 * Delete AI usage logs associated with a coach/organization
 */
async function deleteAILogsForCoach(coachUid: string): Promise<number> {
  const db = getDb();
  let deleted = 0;

  try {
    const aiLogsRef = getAIUsageLogsCollection();
    const q = query(aiLogsRef, where('coachUid', '==', coachUid));
    const snapshot = await getDocs(q);

    for (const docSnap of snapshot.docs) {
      await deleteDoc(docSnap.ref);
      deleted++;
    }
  } catch {
    // Might not have matching logs
  }

  return deleted;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Identify and delete test data
 */
export async function deleteTestData(
  options: DeleteTestDataOptions = {},
): Promise<DeleteTestDataResult> {
  const {
    dryRun = true, // Default to dry run for safety
    targetUids,
    targetOrgIds,
    deleteAILogs = false,
    testEmailPatterns = DEFAULT_TEST_EMAIL_PATTERNS,
  } = options;

  const result: DeleteTestDataResult = {
    success: false,
    dryRun,
    testAccounts: [],
    testOrganizations: [],
    deleted: {
      userProfiles: [],
      coaches: [],
      clients: [],
      assessments: [],
      organizations: [],
      aiLogs: 0,
    },
    errors: [],
  };

  try {
    logger.section(dryRun ? 'TEST DATA AUDIT (DRY RUN)' : 'DELETE TEST DATA');

    if (!dryRun) {
      logger.warn('⚠️ WARNING: This will permanently delete data!');
      logger.warn('   Make sure you have a backup before proceeding.\n');
    }

    // ========================================================================
    // Step 1: Identify test accounts
    // ========================================================================
    logger.info('1️⃣ Scanning for test accounts...');

    const platformAdminsSnapshot = await getDocs(getPlatformAdminsCollection());
    const platformAdminUids = new Set(platformAdminsSnapshot.docs.map(d => d.id));

    const userProfilesSnapshot = await getDocs(getLegacyUserProfilesCollection());
    const coachesSnapshot = await getDocs(getLegacyCoachesCollection());

    // Combine user profiles and coaches
    const allCoachUids = new Set<string>();
    const coachData = new Map<string, { email: string; role?: string; organizationId?: string }>();

    for (const userDoc of userProfilesSnapshot.docs) {
      const data = userDoc.data();
      if (data.role === 'coach' || data.role === 'org_admin') {
        allCoachUids.add(userDoc.id);
        coachData.set(userDoc.id, {
          email: data.email || userDoc.id,
          role: data.role,
          organizationId: data.organizationId,
        });
      }
    }

    for (const coachDoc of coachesSnapshot.docs) {
      allCoachUids.add(coachDoc.id);
      if (!coachData.has(coachDoc.id)) {
        const data = coachDoc.data();
        coachData.set(coachDoc.id, {
          email: data.email || coachDoc.id,
          role: 'coach',
        });
      }
    }

    // Check each coach
    for (const uid of allCoachUids) {
      // Skip platform admins
      if (platformAdminUids.has(uid)) continue;

      // Skip if not in targetUids (when specified)
      if (targetUids && !targetUids.includes(uid)) continue;

      const data = coachData.get(uid)!;
      const stats = await getCoachStats(uid);

      const { isTest, reason } = isTestAccount(
        data.email,
        data.role,
        stats.assessments,
        stats.clients,
        testEmailPatterns,
      );

      if (isTest) {
        result.testAccounts.push({
          uid,
          email: data.email,
          role: data.role,
          organizationId: data.organizationId,
          reason,
          assessmentCount: stats.assessments,
          clientCount: stats.clients,
        });
      }
    }

    logger.info(`   Found ${result.testAccounts.length} test accounts`);

    // ========================================================================
    // Step 2: Identify test organizations
    // ========================================================================
    logger.info('\n2️⃣ Scanning for test organizations...');

    const orgsSnapshot = await getDocs(getOrganizationsCollection());

    for (const orgDoc of orgsSnapshot.docs) {
      // Skip if not in targetOrgIds (when specified)
      if (targetOrgIds && !targetOrgIds.includes(orgDoc.id)) continue;

      const data = orgDoc.data();
      const { isTest, reason } = isTestOrganization(data.name, data.metadata);

      if (isTest) {
        // Count coaches and assessments in this org
        let coachCount = 0;
        let assessmentCount = 0;

        for (const testAccount of result.testAccounts) {
          if (testAccount.organizationId === orgDoc.id) {
            coachCount++;
            assessmentCount += testAccount.assessmentCount;
          }
        }

        result.testOrganizations.push({
          id: orgDoc.id,
          name: data.name || 'Unnamed',
          reason,
          coachCount,
          assessmentCount,
        });
      }
    }

    logger.info(`   Found ${result.testOrganizations.length} test organizations`);

    // ========================================================================
    // Step 3: Report findings
    // ========================================================================
    logger.section('TEST DATA SUMMARY');

    if (result.testAccounts.length > 0) {
      logger.info(`\n👤 Test Accounts (${result.testAccounts.length}):`);
      for (const account of result.testAccounts) {
        logger.info(`   - ${account.email}`);
        logger.info(`     UID: ${account.uid}`);
        logger.info(`     Reason: ${account.reason}`);
        logger.info(`     Data: ${account.assessmentCount} assessments, ${account.clientCount} clients`);
      }
    }

    if (result.testOrganizations.length > 0) {
      logger.info(`\n🏢 Test Organizations (${result.testOrganizations.length}):`);
      for (const org of result.testOrganizations) {
        logger.info(`   - ${org.name} (${org.id})`);
        logger.info(`     Reason: ${org.reason}`);
        logger.info(`     Data: ${org.coachCount} coaches, ${org.assessmentCount} assessments`);
      }
    }

    // ========================================================================
    // Step 4: Execute deletion (if not dry run)
    // ========================================================================
    if (!dryRun) {
      logger.section('EXECUTING DELETION');

      // Delete test accounts
      for (const account of result.testAccounts) {
        try {
          logger.info(`\n   Deleting account: ${account.email}`);

          // Delete coach data (assessments, clients, history)
          const { assessments, clients } = await deleteCoachData(account.uid);
          result.deleted.assessments.push(...Array(assessments).fill(account.uid));
          result.deleted.clients.push(...Array(clients).fill(account.uid));
          result.deleted.coaches.push(account.uid);

          // Delete user profile
          const userProfileRef = doc(getDb(), COLLECTIONS.USER_PROFILES, account.uid);
          await deleteDoc(userProfileRef);
          result.deleted.userProfiles.push(account.uid);

          // Delete AI logs if requested
          if (deleteAILogs) {
            const aiLogsDeleted = await deleteAILogsForCoach(account.uid);
            result.deleted.aiLogs += aiLogsDeleted;
          }

          logger.info(`   ✅ Deleted: ${assessments} assessments, ${clients} clients`);
        } catch (error) {
          result.errors.push(`Failed to delete account ${account.uid}: ${error}`);
          logger.error(`   ❌ Failed to delete account ${account.uid}:`, error);
        }
      }

      // Delete test organizations
      for (const org of result.testOrganizations) {
        try {
          logger.info(`\n   Deleting organization: ${org.name}`);
          await deleteDoc(getOrganizationDoc(org.id));
          result.deleted.organizations.push(org.id);
          logger.info(`   ✅ Deleted organization: ${org.id}`);
        } catch (error) {
          result.errors.push(`Failed to delete organization ${org.id}: ${error}`);
          logger.error(`   ❌ Failed to delete organization ${org.id}:`, error);
        }
      }

      logger.section('DELETION COMPLETE');
      logger.info(`User profiles deleted: ${result.deleted.userProfiles.length}`);
      logger.info(`Coaches deleted: ${result.deleted.coaches.length}`);
      logger.info(`Assessments deleted: ${result.deleted.assessments.length}`);
      logger.info(`Clients deleted: ${result.deleted.clients.length}`);
      logger.info(`Organizations deleted: ${result.deleted.organizations.length}`);
      if (deleteAILogs) {
        logger.info(`AI logs deleted: ${result.deleted.aiLogs}`);
      }
    } else {
      logger.info(`\n💡 This is a DRY RUN. No data was deleted.`);
      logger.info(`   To execute deletion, run:`);
      logger.info(`   await window.deleteTestData({ dryRun: false })`);

      if (result.testAccounts.length > 0) {
        logger.info(`\n   Or to delete specific accounts:`);
        const uids = result.testAccounts.slice(0, 3).map(a => `'${a.uid}'`).join(', ');
        logger.info(`   await window.deleteTestData({ dryRun: false, targetUids: [${uids}] })`);
      }
    }

    result.success = result.errors.length === 0;
    return result;

  } catch (error) {
    logger.error('Operation failed:', error);
    result.errors.push(`Fatal error: ${error}`);
    return result;
  }
}

/**
 * List all accounts and their status
 */
export async function listAllAccounts(): Promise<{
  total: number;
  byOrganization: Map<string, { name: string; accounts: { uid: string; email: string; role: string }[] }>;
  orphaned: { uid: string; email: string; role: string }[];
}> {
  const userProfilesSnapshot = await getDocs(getLegacyUserProfilesCollection());
  const orgsSnapshot = await getDocs(getOrganizationsCollection());

  const orgNames = new Map<string, string>();
  for (const orgDoc of orgsSnapshot.docs) {
    orgNames.set(orgDoc.id, orgDoc.data().name || 'Unnamed');
  }

  const byOrganization = new Map<string, { name: string; accounts: { uid: string; email: string; role: string }[] }>();
  const orphaned: { uid: string; email: string; role: string }[] = [];

  for (const userDoc of userProfilesSnapshot.docs) {
    const data = userDoc.data();

    if (data.role !== 'coach' && data.role !== 'org_admin') continue;

    const account = {
      uid: userDoc.id,
      email: data.email || userDoc.id,
      role: data.role || 'unknown',
    };

    if (data.organizationId && orgNames.has(data.organizationId)) {
      if (!byOrganization.has(data.organizationId)) {
        byOrganization.set(data.organizationId, {
          name: orgNames.get(data.organizationId)!,
          accounts: [],
        });
      }
      byOrganization.get(data.organizationId)!.accounts.push(account);
    } else {
      orphaned.push(account);
    }
  }

  return {
    total: userProfilesSnapshot.size,
    byOrganization,
    orphaned,
  };
}

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as unknown as {
    deleteTestData: typeof deleteTestData;
    listAllAccounts: typeof listAllAccounts;
  }).deleteTestData = deleteTestData;
  (window as unknown as { listAllAccounts: typeof listAllAccounts }).listAllAccounts = listAllAccounts;
}
