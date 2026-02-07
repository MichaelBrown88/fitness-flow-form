/**
 * Migrate Assessment History Data
 *
 * This tool migrates the assessment history (current/history/snapshots) from
 * the legacy coach-centric structure to the new organization-centric structure.
 *
 * The main migrateToSaas only copies assessment summaries. This migrates the
 * deeper history tracking data.
 *
 * OLD STRUCTURE:
 *   coaches/{coachUid}/assessments/{clientSlug}/current/data
 *   coaches/{coachUid}/assessments/{clientSlug}/history/*
 *   coaches/{coachUid}/assessments/{clientSlug}/snapshots/*
 *
 * NEW STRUCTURE:
 *   organizations/{orgId}/assessmentHistory/{clientSlug}/current/data
 *   organizations/{orgId}/assessmentHistory/{clientSlug}/history/*
 *   organizations/{orgId}/assessmentHistory/{clientSlug}/snapshots/*
 *
 * Run from browser console: await window.migrateAssessmentHistory()
 *
 * For dry-run mode (default): await window.migrateAssessmentHistory({ dryRun: true })
 * For specific org: await window.migrateAssessmentHistory({ orgId: 'org-123' })
 */

import {
  getDocs,
  getDoc,
  setDoc,
  doc,
  collection,
  serverTimestamp,
  writeBatch,
  query,
  where,
} from 'firebase/firestore';
import { getDb, auth } from '@/services/firebase';
import { logger as appLogger } from '@/lib/utils/logger';
import {
  getLegacyUserProfilesCollection,
  getOrganizationsCollection,
} from '@/lib/database/collections';
import { COLLECTIONS } from '@/constants/collections';
import { ORGANIZATION } from '@/lib/database/paths';

/**
 * Get the current user's organization ID from their profile
 */
async function getCurrentUserOrgId(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) {
    return null;
  }

  const db = getDb();
  const profileRef = doc(db, COLLECTIONS.USER_PROFILES, user.uid);
  const profileSnap = await getDoc(profileRef);

  if (profileSnap.exists()) {
    return profileSnap.data()?.organizationId || null;
  }

  return null;
}

const logger = {
  info: (...args: unknown[]) => appLogger.info('✅', ...args),
  warn: (...args: unknown[]) => appLogger.warn('⚠️', ...args),
  error: (...args: unknown[]) => appLogger.error('❌', ...args),
  section: (title: string) => appLogger.info(`\n📋 ${title}\n${'='.repeat(60)}`),
};

// ============================================================================
// TYPES
// ============================================================================

interface MigrationOptions {
  /** If true (default), only report what would be migrated without making changes */
  dryRun?: boolean;

  /** Specific organization ID to migrate (optional - migrates all if not specified) */
  orgId?: string;

  /** Maximum documents per batch write */
  batchSize?: number;
}

interface ClientHistoryData {
  clientSlug: string;
  coachUid: string;
  orgId: string;
  currentData: Record<string, unknown> | null;
  historyDocs: Array<{ id: string; data: Record<string, unknown> }>;
  snapshotDocs: Array<{ id: string; data: Record<string, unknown> }>;
}

interface MigrationResult {
  success: boolean;
  dryRun: boolean;
  migrated: {
    currentDocs: number;
    historyDocs: number;
    snapshotDocs: number;
  };
  errors: string[];
  clientsProcessed: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all coaches belonging to an organization
 * Uses filtered query to work with org member permissions (not just platform admin)
 */
async function getOrgCoaches(orgId: string): Promise<Array<{
  uid: string;
  email: string;
}>> {
  const db = getDb();
  const coaches: Array<{ uid: string; email: string }> = [];

  // Use filtered query - works with org member permissions
  const orgMembersQuery = query(
    getLegacyUserProfilesCollection(),
    where('organizationId', '==', orgId)
  );
  const userProfilesSnapshot = await getDocs(orgMembersQuery);

  for (const userDoc of userProfilesSnapshot.docs) {
    const data = userDoc.data();

    if (data.role === 'coach' || data.role === 'org_admin') {
      coaches.push({
        uid: userDoc.id,
        email: data.email || '',
      });
    }
  }

  return coaches;
}

/**
 * Get all client slugs that have history data for a coach
 * (These are the document IDs in coaches/{uid}/assessments/ that have subcollections)
 */
async function getClientSlugsWithHistory(coachUid: string): Promise<string[]> {
  const db = getDb();
  const slugs: string[] = [];

  try {
    // Get all documents in coaches/{uid}/assessments/
    const assessmentsRef = collection(db, COLLECTIONS.COACHES, coachUid, COLLECTIONS.ASSESSMENTS);
    const snapshot = await getDocs(assessmentsRef);

    for (const docSnap of snapshot.docs) {
      // Check if this document has a 'current' subcollection with data
      const currentRef = doc(db, COLLECTIONS.COACHES, coachUid, COLLECTIONS.ASSESSMENTS, docSnap.id, 'current', 'data');
      const currentSnap = await getDoc(currentRef);

      if (currentSnap.exists()) {
        slugs.push(docSnap.id);
      }
    }
  } catch {
    // Collection might not exist
  }

  return slugs;
}

/**
 * Get history data for a specific client
 */
async function getClientHistoryData(
  coachUid: string,
  clientSlug: string,
  orgId: string
): Promise<ClientHistoryData> {
  const db = getDb();
  const result: ClientHistoryData = {
    clientSlug,
    coachUid,
    orgId,
    currentData: null,
    historyDocs: [],
    snapshotDocs: [],
  };

  // Get current data
  try {
    const currentRef = doc(db, COLLECTIONS.COACHES, coachUid, COLLECTIONS.ASSESSMENTS, clientSlug, 'current', 'data');
    const currentSnap = await getDoc(currentRef);
    if (currentSnap.exists()) {
      result.currentData = currentSnap.data() as Record<string, unknown>;
    }
  } catch {
    // Current data doesn't exist
  }

  // Get history documents
  try {
    const historyRef = collection(db, COLLECTIONS.COACHES, coachUid, COLLECTIONS.ASSESSMENTS, clientSlug, 'history');
    const historySnap = await getDocs(historyRef);
    for (const docSnap of historySnap.docs) {
      result.historyDocs.push({
        id: docSnap.id,
        data: docSnap.data() as Record<string, unknown>,
      });
    }
  } catch {
    // History collection doesn't exist
  }

  // Get snapshot documents
  try {
    const snapshotsRef = collection(db, COLLECTIONS.COACHES, coachUid, COLLECTIONS.ASSESSMENTS, clientSlug, 'snapshots');
    const snapshotsSnap = await getDocs(snapshotsRef);
    for (const docSnap of snapshotsSnap.docs) {
      result.snapshotDocs.push({
        id: docSnap.id,
        data: docSnap.data() as Record<string, unknown>,
      });
    }
  } catch {
    // Snapshots collection doesn't exist
  }

  return result;
}

/**
 * Migrate history data for a single client
 */
async function migrateClientHistory(
  data: ClientHistoryData,
  batchSize: number
): Promise<{ currentDocs: number; historyDocs: number; snapshotDocs: number; errors: string[] }> {
  const db = getDb();
  const result = { currentDocs: 0, historyDocs: 0, snapshotDocs: 0, errors: [] as string[] };

  // Migrate current data
  if (data.currentData) {
    try {
      const newCurrentRef = doc(db, ORGANIZATION.assessmentHistory.current(data.orgId, data.clientSlug));
      await setDoc(newCurrentRef, {
        ...data.currentData,
        organizationId: data.orgId,
        _migration: {
          legacyPath: `coaches/${data.coachUid}/assessments/${data.clientSlug}/current/data`,
          migratedAt: serverTimestamp(),
        },
      });
      result.currentDocs++;
    } catch (error) {
      result.errors.push(`Failed to migrate current data for ${data.clientSlug}: ${error}`);
    }
  }

  // Migrate history documents in batches
  for (let i = 0; i < data.historyDocs.length; i += batchSize) {
    const batch = writeBatch(db);
    const batchDocs = data.historyDocs.slice(i, i + batchSize);

    for (const historyDoc of batchDocs) {
      const newHistoryRef = doc(
        db,
        ORGANIZATION.assessmentHistory.history(data.orgId, data.clientSlug),
        historyDoc.id
      );
      batch.set(newHistoryRef, {
        ...historyDoc.data,
        organizationId: data.orgId,
        _migration: {
          legacyPath: `coaches/${data.coachUid}/assessments/${data.clientSlug}/history/${historyDoc.id}`,
          migratedAt: serverTimestamp(),
        },
      });
    }

    try {
      await batch.commit();
      result.historyDocs += batchDocs.length;
    } catch (error) {
      result.errors.push(`Failed to migrate history batch for ${data.clientSlug}: ${error}`);
    }
  }

  // Migrate snapshot documents in batches
  for (let i = 0; i < data.snapshotDocs.length; i += batchSize) {
    const batch = writeBatch(db);
    const batchDocs = data.snapshotDocs.slice(i, i + batchSize);

    for (const snapshotDoc of batchDocs) {
      const newSnapshotRef = doc(
        db,
        ORGANIZATION.assessmentHistory.snapshots(data.orgId, data.clientSlug),
        snapshotDoc.id
      );
      batch.set(newSnapshotRef, {
        ...snapshotDoc.data,
        organizationId: data.orgId,
        _migration: {
          legacyPath: `coaches/${data.coachUid}/assessments/${data.clientSlug}/snapshots/${snapshotDoc.id}`,
          migratedAt: serverTimestamp(),
        },
      });
    }

    try {
      await batch.commit();
      result.snapshotDocs += batchDocs.length;
    } catch (error) {
      result.errors.push(`Failed to migrate snapshots batch for ${data.clientSlug}: ${error}`);
    }
  }

  return result;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Migrate assessment history data to SaaS architecture
 */
export async function migrateAssessmentHistory(
  options: MigrationOptions = {}
): Promise<MigrationResult> {
  const {
    dryRun = true, // Default to dry run for safety
    orgId,
    batchSize = 500,
  } = options;

  const result: MigrationResult = {
    success: false,
    dryRun,
    migrated: { currentDocs: 0, historyDocs: 0, snapshotDocs: 0 },
    errors: [],
    clientsProcessed: 0,
  };

  try {
    logger.section(dryRun ? 'ASSESSMENT HISTORY MIGRATION PLAN (DRY RUN)' : 'ASSESSMENT HISTORY MIGRATION');

    if (!dryRun) {
      logger.warn('⚠️ WARNING: This will write to your database!');
      logger.warn('   Make sure you have a backup before proceeding.\n');
    }

    // ========================================================================
    // Step 1: Get organizations to migrate
    // ========================================================================
    logger.info('1️⃣ Identifying organizations to migrate...');

    const orgsToMigrate: Array<{ id: string; name: string }> = [];

    // Determine which org to migrate
    let targetOrgId = orgId;
    if (!targetOrgId) {
      // Get current user's org from their profile
      targetOrgId = await getCurrentUserOrgId();
      if (!targetOrgId) {
        result.errors.push('No orgId provided and could not determine current user organization. Please provide orgId parameter.');
        logger.error('   No organization found. Please provide orgId parameter:');
        logger.error('   await window.migrateAssessmentHistory({ orgId: "your-org-id" })');
        return result;
      }
      logger.info(`   Using current user's organization: ${targetOrgId}`);
    }

    // Get the specific organization (filtered query works with org member permissions)
    const db = getDb();
    const orgRef = doc(db, 'organizations', targetOrgId);
    const orgSnap = await getDoc(orgRef);

    if (orgSnap.exists()) {
      const data = orgSnap.data();
      if (data.metadata?.isTest || data.metadata?.isDeleted) {
        logger.info(`   Skipping test/deleted org: ${data.name} (${orgSnap.id})`);
      } else {
        orgsToMigrate.push({
          id: orgSnap.id,
          name: data.name || 'Unnamed',
        });
      }
    } else {
      result.errors.push(`Organization ${targetOrgId} not found`);
      logger.error(`   Organization ${targetOrgId} not found`);
      return result;
    }

    logger.info(`   Found ${orgsToMigrate.length} organization(s) to migrate`);

    // ========================================================================
    // Step 2: Collect all history data to migrate
    // ========================================================================
    logger.info('\n2️⃣ Scanning for assessment history data...');

    const allHistoryData: ClientHistoryData[] = [];

    for (const org of orgsToMigrate) {
      logger.info(`\n   📋 Organization: ${org.name} (${org.id})`);

      const coaches = await getOrgCoaches(org.id);
      logger.info(`      Found ${coaches.length} coaches`);

      for (const coach of coaches) {
        const clientSlugs = await getClientSlugsWithHistory(coach.uid);

        if (clientSlugs.length > 0) {
          logger.info(`      Coach ${coach.email}: ${clientSlugs.length} clients with history`);
        }

        for (const clientSlug of clientSlugs) {
          const historyData = await getClientHistoryData(coach.uid, clientSlug, org.id);

          // Only add if there's actual data to migrate
          if (historyData.currentData || historyData.historyDocs.length > 0 || historyData.snapshotDocs.length > 0) {
            allHistoryData.push(historyData);
          }
        }
      }
    }

    // ========================================================================
    // Step 3: Report migration plan
    // ========================================================================
    logger.section('MIGRATION SUMMARY');

    let totalCurrent = 0;
    let totalHistory = 0;
    let totalSnapshots = 0;

    for (const data of allHistoryData) {
      if (data.currentData) totalCurrent++;
      totalHistory += data.historyDocs.length;
      totalSnapshots += data.snapshotDocs.length;
    }

    logger.info(`Clients with history data: ${allHistoryData.length}`);
    logger.info(`Current assessment docs: ${totalCurrent}`);
    logger.info(`History change docs: ${totalHistory}`);
    logger.info(`Snapshot docs: ${totalSnapshots}`);
    logger.info(`Total documents to migrate: ${totalCurrent + totalHistory + totalSnapshots}`);

    // ========================================================================
    // Step 4: Execute migration (if not dry run)
    // ========================================================================
    if (!dryRun) {
      logger.section('EXECUTING MIGRATION');

      for (const data of allHistoryData) {
        logger.info(`   Migrating: ${data.clientSlug} (org: ${data.orgId})`);

        const migrationResult = await migrateClientHistory(data, batchSize);

        result.migrated.currentDocs += migrationResult.currentDocs;
        result.migrated.historyDocs += migrationResult.historyDocs;
        result.migrated.snapshotDocs += migrationResult.snapshotDocs;
        result.errors.push(...migrationResult.errors);
        result.clientsProcessed++;
      }

      logger.section('MIGRATION COMPLETE');
      logger.info(`Migrated:`);
      logger.info(`   - Clients processed: ${result.clientsProcessed}`);
      logger.info(`   - Current docs: ${result.migrated.currentDocs}`);
      logger.info(`   - History docs: ${result.migrated.historyDocs}`);
      logger.info(`   - Snapshot docs: ${result.migrated.snapshotDocs}`);

      if (result.errors.length > 0) {
        logger.error(`\nErrors encountered: ${result.errors.length}`);
        for (const error of result.errors.slice(0, 10)) {
          logger.error(`   - ${error}`);
        }
      }
    } else {
      logger.info(`\n💡 This is a DRY RUN. No changes were made.`);
      logger.info(`   To execute the migration, run:`);
      logger.info(`   await window.migrateAssessmentHistory({ dryRun: false })`);

      if (orgId) {
        logger.info(`\n   Currently targeting org: ${orgId}`);
      } else {
        logger.info(`\n   To migrate a specific organization:`);
        logger.info(`   await window.migrateAssessmentHistory({ dryRun: false, orgId: 'org-id' })`);
      }
    }

    result.success = result.errors.length === 0;
    return result;

  } catch (error) {
    logger.error('Migration failed:', error);
    result.errors.push(`Fatal error: ${error}`);
    return result;
  }
}

/**
 * Verify assessment history migration was successful
 */
export async function verifyAssessmentHistoryMigration(orgId?: string): Promise<{
  success: boolean;
  legacyCounts: { current: number; history: number; snapshots: number };
  newCounts: { current: number; history: number; snapshots: number };
  mismatches: string[];
}> {
  const db = getDb();
  const result = {
    success: false,
    legacyCounts: { current: 0, history: 0, snapshots: 0 },
    newCounts: { current: 0, history: 0, snapshots: 0 },
    mismatches: [] as string[],
  };

  // Determine org to verify
  let targetOrgId = orgId;
  if (!targetOrgId) {
    targetOrgId = await getCurrentUserOrgId();
    if (!targetOrgId) {
      result.mismatches.push('No orgId provided and could not determine current user organization');
      return result;
    }
  }

  // Count legacy structure
  const coaches = await getOrgCoaches(targetOrgId);
  for (const coach of coaches) {
    const clientSlugs = await getClientSlugsWithHistory(coach.uid);

    for (const clientSlug of clientSlugs) {
      const data = await getClientHistoryData(coach.uid, clientSlug, targetOrgId);
      if (data.currentData) result.legacyCounts.current++;
      result.legacyCounts.history += data.historyDocs.length;
      result.legacyCounts.snapshots += data.snapshotDocs.length;
    }
  }

  // Count new structure
  try {
    const historyCollectionRef = collection(db, ORGANIZATION.assessmentHistory.collection(targetOrgId));
    const historySnapshot = await getDocs(historyCollectionRef);

    for (const clientDoc of historySnapshot.docs) {
      const clientSlug = clientDoc.id;

      // Check current
      const currentRef = doc(db, ORGANIZATION.assessmentHistory.current(targetOrgId, clientSlug));
      const currentSnap = await getDoc(currentRef);
      if (currentSnap.exists()) result.newCounts.current++;

      // Count history
      const historyRef = collection(db, ORGANIZATION.assessmentHistory.history(targetOrgId, clientSlug));
      const historyDocsSnap = await getDocs(historyRef);
      result.newCounts.history += historyDocsSnap.size;

      // Count snapshots
      const snapshotsRef = collection(db, ORGANIZATION.assessmentHistory.snapshots(targetOrgId, clientSlug));
      const snapshotsDocsSnap = await getDocs(snapshotsRef);
      result.newCounts.snapshots += snapshotsDocsSnap.size;
    }
  } catch (error) {
    result.mismatches.push(`Failed to read new structure: ${error}`);
  }

  // Compare
  logger.info(`Legacy: current=${result.legacyCounts.current}, history=${result.legacyCounts.history}, snapshots=${result.legacyCounts.snapshots}`);
  logger.info(`New: current=${result.newCounts.current}, history=${result.newCounts.history}, snapshots=${result.newCounts.snapshots}`);

  if (result.legacyCounts.current !== result.newCounts.current) {
    result.mismatches.push(`Current doc count mismatch: ${result.legacyCounts.current} vs ${result.newCounts.current}`);
  }
  if (result.legacyCounts.history !== result.newCounts.history) {
    result.mismatches.push(`History doc count mismatch: ${result.legacyCounts.history} vs ${result.newCounts.history}`);
  }
  if (result.legacyCounts.snapshots !== result.newCounts.snapshots) {
    result.mismatches.push(`Snapshot doc count mismatch: ${result.legacyCounts.snapshots} vs ${result.newCounts.snapshots}`);
  }

  result.success = result.mismatches.length === 0;
  return result;
}

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as unknown as {
    migrateAssessmentHistory: typeof migrateAssessmentHistory;
    verifyAssessmentHistoryMigration: typeof verifyAssessmentHistoryMigration;
  }).migrateAssessmentHistory = migrateAssessmentHistory;
  (window as unknown as { verifyAssessmentHistoryMigration: typeof verifyAssessmentHistoryMigration }).verifyAssessmentHistoryMigration = verifyAssessmentHistoryMigration;
}
