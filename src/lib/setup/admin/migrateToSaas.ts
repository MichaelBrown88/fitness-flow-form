/**
 * Migrate to SaaS Architecture
 *
 * This tool migrates the database from the legacy coach-centric structure
 * to the new organization-centric SaaS structure.
 *
 * OLD STRUCTURE:
 *   coaches/{coachUid}/clients/{clientSlug}
 *   coaches/{coachUid}/assessments/{assessmentId}
 *   userProfiles/{uid}
 *
 * NEW STRUCTURE:
 *   organizations/{orgId}/members/{uid}
 *   organizations/{orgId}/clients/{clientId}
 *   organizations/{orgId}/assessments/{assessmentId}
 *   userProfiles/{uid} (kept for auth - simplified)
 *
 * Run from browser console: await window.migrateToSaas()
 *
 * For dry-run mode (default): await window.migrateToSaas({ dryRun: true })
 * For specific org: await window.migrateToSaas({ orgId: 'org-123' })
 *
 * IMPORTANT: Always run in dry-run mode first to verify the migration plan!
 */

import {
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  doc,
  collection,
  serverTimestamp,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { logger as appLogger } from '@/lib/utils/logger';
import {
  getLegacyUserProfilesCollection,
  getLegacyCoachesCollection,
  getOrganizationsCollection,
  getOrganizationDoc,
} from '@/lib/database/collections';
import { COLLECTIONS } from '@/constants/collections';
import { ORGANIZATION } from '@/lib/database/paths';
import type { FormData } from '@/contexts/FormContext';

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

  /** If true, also delete the old structure after successful migration */
  deleteOldData?: boolean;

  /** Maximum documents per batch write */
  batchSize?: number;
}

interface MemberDocument {
  uid: string;
  email: string;
  displayName: string;
  role: 'coach' | 'org_admin';
  status: 'active' | 'inactive';
  createdAt: unknown;
  updatedAt: unknown;
  stats: {
    clientCount: number;
    assessmentCount: number;
    lastAssessmentDate: Date | null;
  };
}

interface ClientDocument {
  clientId: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  assignedCoachUid: string;
  status: 'active' | 'inactive' | 'on-hold';
  tags: string[];
  createdAt: unknown;
  updatedAt: unknown;
  stats: {
    lastAssessmentDate: Date | null;
    totalAssessments: number;
  };
  // Migration metadata
  legacyPath: string;
}

interface AssessmentDocument {
  assessmentId: string;
  clientId: string;
  clientName: string;
  coachUid: string;
  createdAt: unknown;
  scores: {
    overall: number;
    categories?: Array<{ id: string; score: number; weaknesses: string[] }>;
  };
  goals: string[];
  formData: FormData;
  // Migration metadata
  legacyPath: string;
  legacyId: string;
}

interface MigrationPlan {
  orgId: string;
  orgName: string;
  members: MemberDocument[];
  clients: ClientDocument[];
  assessments: AssessmentDocument[];
  orphanedClients: Array<{ clientId: string; reason: string }>;
  orphanedAssessments: Array<{ assessmentId: string; reason: string }>;
}

interface MigrationResult {
  success: boolean;
  dryRun: boolean;
  plans: MigrationPlan[];
  migrated: {
    members: number;
    clients: number;
    assessments: number;
  };
  deleted: {
    coaches: number;
    clients: number;
    assessments: number;
  };
  errors: string[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a client ID from a name (slugified)
 */
function generateClientId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/**
 * Get all coaches belonging to an organization
 */
async function getOrgCoaches(orgId: string): Promise<Array<{
  uid: string;
  email: string;
  displayName: string;
  role: 'coach' | 'org_admin';
}>> {
  const userProfilesSnapshot = await getDocs(getLegacyUserProfilesCollection());
  const coaches: Array<{
    uid: string;
    email: string;
    displayName: string;
    role: 'coach' | 'org_admin';
  }> = [];

  for (const userDoc of userProfilesSnapshot.docs) {
    const data = userDoc.data();

    if (data.organizationId === orgId && (data.role === 'coach' || data.role === 'org_admin')) {
      coaches.push({
        uid: userDoc.id,
        email: data.email || '',
        displayName: data.displayName || data.email || '',
        role: data.role as 'coach' | 'org_admin',
      });
    }
  }

  return coaches;
}

/**
 * Get all clients for a coach (from legacy structure)
 */
async function getLegacyClients(coachUid: string): Promise<Array<{
  clientId: string;
  data: Record<string, unknown>;
}>> {
  const db = getDb();
  const clients: Array<{ clientId: string; data: Record<string, unknown> }> = [];

  try {
    const clientsRef = collection(db, COLLECTIONS.COACHES, coachUid, COLLECTIONS.CLIENTS);
    const snapshot = await getDocs(clientsRef);

    for (const docSnap of snapshot.docs) {
      clients.push({
        clientId: docSnap.id,
        data: docSnap.data(),
      });
    }
  } catch {
    // Collection might not exist
  }

  return clients;
}

/**
 * Get all assessments for a coach (from legacy structure)
 */
async function getLegacyAssessments(coachUid: string): Promise<Array<{
  assessmentId: string;
  data: Record<string, unknown>;
}>> {
  const db = getDb();
  const assessments: Array<{ assessmentId: string; data: Record<string, unknown> }> = [];

  try {
    const assessmentsRef = collection(db, COLLECTIONS.COACHES, coachUid, COLLECTIONS.ASSESSMENTS);
    const snapshot = await getDocs(assessmentsRef);

    for (const docSnap of snapshot.docs) {
      assessments.push({
        assessmentId: docSnap.id,
        data: docSnap.data(),
      });
    }
  } catch {
    // Collection might not exist
  }

  return assessments;
}

/**
 * Build the migration plan for an organization
 */
async function buildMigrationPlan(orgId: string, orgName: string): Promise<MigrationPlan> {
  const plan: MigrationPlan = {
    orgId,
    orgName,
    members: [],
    clients: [],
    assessments: [],
    orphanedClients: [],
    orphanedAssessments: [],
  };

  // Get all coaches for this org
  const coaches = await getOrgCoaches(orgId);

  // Track all clients and assessments to detect duplicates
  const clientNameToId = new Map<string, { clientId: string; coachUid: string }>();
  const processedAssessmentIds = new Set<string>();

  for (const coach of coaches) {
    // Get coach's legacy data
    const legacyClients = await getLegacyClients(coach.uid);
    const legacyAssessments = await getLegacyAssessments(coach.uid);

    // Calculate stats for member document
    let lastAssessmentDate: Date | null = null;
    for (const assessment of legacyAssessments) {
      const createdAt = (assessment.data.createdAt as Timestamp)?.toDate?.() || null;
      if (createdAt && (!lastAssessmentDate || createdAt > lastAssessmentDate)) {
        lastAssessmentDate = createdAt;
      }
    }

    // Create member document
    plan.members.push({
      uid: coach.uid,
      email: coach.email,
      displayName: coach.displayName,
      role: coach.role,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      stats: {
        clientCount: legacyClients.length,
        assessmentCount: legacyAssessments.length,
        lastAssessmentDate,
      },
    });

    // Process clients
    for (const client of legacyClients) {
      const clientName = (client.data.clientName as string) || client.clientId;
      const normalizedName = clientName.toLowerCase();

      // Check for duplicates (same client name in different coaches)
      if (clientNameToId.has(normalizedName)) {
        // Client already exists - this is a duplicate
        const existing = clientNameToId.get(normalizedName)!;
        if (existing.coachUid !== coach.uid) {
          // Different coach - mark as duplicate but still process
          logger.warn(`   Duplicate client: "${clientName}" found under ${coach.uid} and ${existing.coachUid}`);
        }
        continue; // Skip duplicate
      }

      const clientId = generateClientId(normalizedName);
      clientNameToId.set(normalizedName, { clientId, coachUid: coach.uid });

      // Count assessments for this client
      const clientAssessments = legacyAssessments.filter(
        a => (a.data.clientNameLower as string || '').toLowerCase() === normalizedName ||
             (a.data.clientName as string || '').toLowerCase() === normalizedName
      );

      let clientLastAssessment: Date | null = null;
      for (const assessment of clientAssessments) {
        const createdAt = (assessment.data.createdAt as Timestamp)?.toDate?.() || null;
        if (createdAt && (!clientLastAssessment || createdAt > clientLastAssessment)) {
          clientLastAssessment = createdAt;
        }
      }

      plan.clients.push({
        clientId,
        name: clientName,
        email: (client.data.email as string) || '',
        phone: (client.data.phone as string) || '',
        dateOfBirth: (client.data.dateOfBirth as string) || '',
        gender: (client.data.gender as string) || '',
        assignedCoachUid: coach.uid,
        status: (client.data.status as 'active' | 'inactive' | 'on-hold') || 'active',
        tags: (client.data.tags as string[]) || [],
        createdAt: client.data.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
        stats: {
          lastAssessmentDate: clientLastAssessment,
          totalAssessments: clientAssessments.length,
        },
        legacyPath: `coaches/${coach.uid}/clients/${client.clientId}`,
      });
    }

    // Process assessments
    for (const assessment of legacyAssessments) {
      // Skip if already processed (shouldn't happen but safety check)
      if (processedAssessmentIds.has(assessment.assessmentId)) {
        continue;
      }
      processedAssessmentIds.add(assessment.assessmentId);

      const clientName = (assessment.data.clientName as string) || 'Unknown';
      const normalizedName = clientName.toLowerCase();
      const clientInfo = clientNameToId.get(normalizedName);

      if (!clientInfo) {
        // Assessment for a client that doesn't have a profile
        plan.orphanedAssessments.push({
          assessmentId: assessment.assessmentId,
          reason: `No client profile found for "${clientName}"`,
        });
        continue;
      }

      const formData = assessment.data.formData as FormData | undefined;
      const scoresSummary = assessment.data.scoresSummary as {
        overall?: number;
        categories?: Array<{ id: string; score: number; weaknesses: string[] }>;
      } | undefined;

      plan.assessments.push({
        assessmentId: assessment.assessmentId,
        clientId: clientInfo.clientId,
        clientName,
        coachUid: coach.uid,
        createdAt: assessment.data.createdAt || serverTimestamp(),
        scores: {
          overall: (assessment.data.overallScore as number) || 0,
          categories: scoresSummary?.categories || [],
        },
        goals: (assessment.data.goals as string[]) || [],
        formData: formData || {} as FormData,
        legacyPath: `coaches/${coach.uid}/assessments/${assessment.assessmentId}`,
        legacyId: assessment.assessmentId,
      });
    }
  }

  return plan;
}

/**
 * Execute the migration for a single organization
 */
async function executeMigration(
  plan: MigrationPlan,
  batchSize: number,
): Promise<{ members: number; clients: number; assessments: number; errors: string[] }> {
  const db = getDb();
  const result = { members: 0, clients: 0, assessments: 0, errors: [] as string[] };

  // Migrate members
  logger.info(`   Migrating ${plan.members.length} members...`);
  for (const member of plan.members) {
    try {
      const memberRef = doc(db, ORGANIZATION.coaches.doc(plan.orgId, member.uid));
      await setDoc(memberRef, {
        email: member.email,
        displayName: member.displayName,
        role: member.role,
        status: member.status,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
        stats: member.stats,
      });
      result.members++;
    } catch (error) {
      result.errors.push(`Failed to migrate member ${member.uid}: ${error}`);
    }
  }

  // Migrate clients in batches
  logger.info(`   Migrating ${plan.clients.length} clients...`);
  for (let i = 0; i < plan.clients.length; i += batchSize) {
    const batch = writeBatch(db);
    const batchClients = plan.clients.slice(i, i + batchSize);

    for (const client of batchClients) {
      const clientRef = doc(db, ORGANIZATION.clients.doc(plan.orgId, client.clientId));
      batch.set(clientRef, {
        name: client.name,
        email: client.email,
        phone: client.phone,
        dateOfBirth: client.dateOfBirth,
        gender: client.gender,
        assignedCoachUid: client.assignedCoachUid,
        status: client.status,
        tags: client.tags,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
        stats: client.stats,
        // Migration metadata (can be removed later)
        _migration: {
          legacyPath: client.legacyPath,
          migratedAt: serverTimestamp(),
        },
      });
    }

    try {
      await batch.commit();
      result.clients += batchClients.length;
    } catch (error) {
      result.errors.push(`Failed to migrate client batch ${i / batchSize + 1}: ${error}`);
    }
  }

  // Migrate assessments in batches
  logger.info(`   Migrating ${plan.assessments.length} assessments...`);
  for (let i = 0; i < plan.assessments.length; i += batchSize) {
    const batch = writeBatch(db);
    const batchAssessments = plan.assessments.slice(i, i + batchSize);

    for (const assessment of batchAssessments) {
      const assessmentRef = doc(db, ORGANIZATION.assessments.doc(plan.orgId, assessment.assessmentId));
      batch.set(assessmentRef, {
        clientId: assessment.clientId,
        clientName: assessment.clientName,
        coachUid: assessment.coachUid,
        createdAt: assessment.createdAt,
        scores: assessment.scores,
        goals: assessment.goals,
        formData: assessment.formData,
        // Migration metadata (can be removed later)
        _migration: {
          legacyPath: assessment.legacyPath,
          legacyId: assessment.legacyId,
          migratedAt: serverTimestamp(),
        },
      });
    }

    try {
      await batch.commit();
      result.assessments += batchAssessments.length;
    } catch (error) {
      result.errors.push(`Failed to migrate assessment batch ${i / batchSize + 1}: ${error}`);
    }
  }

  return result;
}

/**
 * Delete legacy data after successful migration
 */
async function deleteLegacyData(
  plan: MigrationPlan,
): Promise<{ coaches: number; clients: number; assessments: number; errors: string[] }> {
  const db = getDb();
  const result = { coaches: 0, clients: 0, assessments: 0, errors: [] as string[] };

  for (const member of plan.members) {
    try {
      // Delete all assessments
      const assessmentsRef = collection(db, COLLECTIONS.COACHES, member.uid, COLLECTIONS.ASSESSMENTS);
      const assessmentsSnapshot = await getDocs(assessmentsRef);
      for (const docSnap of assessmentsSnapshot.docs) {
        await deleteDoc(docSnap.ref);
        result.assessments++;
      }

      // Delete all clients
      const clientsRef = collection(db, COLLECTIONS.COACHES, member.uid, COLLECTIONS.CLIENTS);
      const clientsSnapshot = await getDocs(clientsRef);
      for (const docSnap of clientsSnapshot.docs) {
        await deleteDoc(docSnap.ref);
        result.clients++;
      }

      // Delete coach document
      const coachRef = doc(db, COLLECTIONS.COACHES, member.uid);
      await deleteDoc(coachRef);
      result.coaches++;
    } catch (error) {
      result.errors.push(`Failed to delete legacy data for ${member.uid}: ${error}`);
    }
  }

  return result;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Migrate database to SaaS architecture
 */
export async function migrateToSaas(
  options: MigrationOptions = {},
): Promise<MigrationResult> {
  const {
    dryRun = true, // Default to dry run for safety
    orgId,
    deleteOldData = false,
    batchSize = 500,
  } = options;

  const result: MigrationResult = {
    success: false,
    dryRun,
    plans: [],
    migrated: { members: 0, clients: 0, assessments: 0 },
    deleted: { coaches: 0, clients: 0, assessments: 0 },
    errors: [],
  };

  try {
    logger.section(dryRun ? 'SAAS MIGRATION PLAN (DRY RUN)' : 'SAAS MIGRATION');

    if (!dryRun) {
      logger.warn('⚠️ WARNING: This will modify your database structure!');
      logger.warn('   Make sure you have a backup before proceeding.\n');
    }

    // ========================================================================
    // Step 1: Get organizations to migrate
    // ========================================================================
    logger.info('1️⃣ Identifying organizations to migrate...');

    const orgsSnapshot = await getDocs(getOrganizationsCollection());
    const orgsToMigrate: Array<{ id: string; name: string }> = [];

    for (const orgDoc of orgsSnapshot.docs) {
      // Skip if specific orgId provided and doesn't match
      if (orgId && orgDoc.id !== orgId) continue;

      const data = orgDoc.data();

      // Skip test/deleted orgs
      if (data.metadata?.isTest || data.metadata?.isDeleted) {
        logger.info(`   Skipping test/deleted org: ${data.name} (${orgDoc.id})`);
        continue;
      }

      orgsToMigrate.push({
        id: orgDoc.id,
        name: data.name || 'Unnamed',
      });
    }

    logger.info(`   Found ${orgsToMigrate.length} organization(s) to migrate`);

    // ========================================================================
    // Step 2: Build migration plans
    // ========================================================================
    logger.info('\n2️⃣ Building migration plans...');

    for (const org of orgsToMigrate) {
      logger.info(`\n   📋 Organization: ${org.name} (${org.id})`);
      const plan = await buildMigrationPlan(org.id, org.name);
      result.plans.push(plan);

      logger.info(`      Members: ${plan.members.length}`);
      logger.info(`      Clients: ${plan.clients.length}`);
      logger.info(`      Assessments: ${plan.assessments.length}`);

      if (plan.orphanedAssessments.length > 0) {
        logger.warn(`      Orphaned assessments: ${plan.orphanedAssessments.length}`);
        for (const orphan of plan.orphanedAssessments.slice(0, 5)) {
          logger.warn(`         - ${orphan.assessmentId}: ${orphan.reason}`);
        }
        if (plan.orphanedAssessments.length > 5) {
          logger.warn(`         ... and ${plan.orphanedAssessments.length - 5} more`);
        }
      }
    }

    // ========================================================================
    // Step 3: Report migration plan
    // ========================================================================
    logger.section('MIGRATION SUMMARY');

    let totalMembers = 0;
    let totalClients = 0;
    let totalAssessments = 0;
    let totalOrphaned = 0;

    for (const plan of result.plans) {
      totalMembers += plan.members.length;
      totalClients += plan.clients.length;
      totalAssessments += plan.assessments.length;
      totalOrphaned += plan.orphanedAssessments.length;
    }

    logger.info(`Organizations: ${result.plans.length}`);
    logger.info(`Members to migrate: ${totalMembers}`);
    logger.info(`Clients to migrate: ${totalClients}`);
    logger.info(`Assessments to migrate: ${totalAssessments}`);
    if (totalOrphaned > 0) {
      logger.warn(`Orphaned assessments (will need attention): ${totalOrphaned}`);
    }

    // ========================================================================
    // Step 4: Execute migration (if not dry run)
    // ========================================================================
    if (!dryRun) {
      logger.section('EXECUTING MIGRATION');

      for (const plan of result.plans) {
        logger.info(`\n📋 Migrating: ${plan.orgName} (${plan.orgId})`);

        const migrationResult = await executeMigration(plan, batchSize);

        result.migrated.members += migrationResult.members;
        result.migrated.clients += migrationResult.clients;
        result.migrated.assessments += migrationResult.assessments;
        result.errors.push(...migrationResult.errors);

        logger.info(`   ✅ Members: ${migrationResult.members}/${plan.members.length}`);
        logger.info(`   ✅ Clients: ${migrationResult.clients}/${plan.clients.length}`);
        logger.info(`   ✅ Assessments: ${migrationResult.assessments}/${plan.assessments.length}`);

        // Delete old data if requested and migration succeeded
        if (deleteOldData && migrationResult.errors.length === 0) {
          logger.info(`   🗑️ Deleting legacy data...`);
          const deleteResult = await deleteLegacyData(plan);
          result.deleted.coaches += deleteResult.coaches;
          result.deleted.clients += deleteResult.clients;
          result.deleted.assessments += deleteResult.assessments;
          result.errors.push(...deleteResult.errors);
        }
      }

      logger.section('MIGRATION COMPLETE');
      logger.info(`Migrated:`);
      logger.info(`   - Members: ${result.migrated.members}`);
      logger.info(`   - Clients: ${result.migrated.clients}`);
      logger.info(`   - Assessments: ${result.migrated.assessments}`);

      if (deleteOldData) {
        logger.info(`Deleted legacy data:`);
        logger.info(`   - Coaches: ${result.deleted.coaches}`);
        logger.info(`   - Clients: ${result.deleted.clients}`);
        logger.info(`   - Assessments: ${result.deleted.assessments}`);
      }

      if (result.errors.length > 0) {
        logger.error(`\nErrors encountered: ${result.errors.length}`);
        for (const error of result.errors.slice(0, 10)) {
          logger.error(`   - ${error}`);
        }
      }
    } else {
      logger.info(`\n💡 This is a DRY RUN. No changes were made.`);
      logger.info(`   To execute the migration, run:`);
      logger.info(`   await window.migrateToSaas({ dryRun: false })`);

      if (totalOrphaned > 0) {
        logger.warn(`\n⚠️ There are ${totalOrphaned} orphaned assessments.`);
        logger.warn(`   Run window.createMissingClients() first to create missing client profiles.`);
      }

      logger.info(`\n   To migrate a specific organization:`);
      logger.info(`   await window.migrateToSaas({ dryRun: false, orgId: '${result.plans[0]?.orgId || 'org-id'}' })`);

      logger.info(`\n   To also delete old data after migration:`);
      logger.info(`   await window.migrateToSaas({ dryRun: false, deleteOldData: true })`);
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
 * Verify migration was successful
 */
export async function verifyMigration(orgId: string): Promise<{
  success: boolean;
  legacyCounts: { clients: number; assessments: number };
  newCounts: { members: number; clients: number; assessments: number };
  mismatches: string[];
}> {
  const db = getDb();
  const result = {
    success: false,
    legacyCounts: { clients: 0, assessments: 0 },
    newCounts: { members: 0, clients: 0, assessments: 0 },
    mismatches: [] as string[],
  };

  // Count new structure
  try {
    const membersRef = collection(db, ORGANIZATION.coaches.collection(orgId));
    const membersSnapshot = await getDocs(membersRef);
    result.newCounts.members = membersSnapshot.size;

    const clientsRef = collection(db, ORGANIZATION.clients.collection(orgId));
    const clientsSnapshot = await getDocs(clientsRef);
    result.newCounts.clients = clientsSnapshot.size;

    const assessmentsRef = collection(db, ORGANIZATION.assessments.collection(orgId));
    const assessmentsSnapshot = await getDocs(assessmentsRef);
    result.newCounts.assessments = assessmentsSnapshot.size;
  } catch (error) {
    result.mismatches.push(`Failed to read new structure: ${error}`);
  }

  // Count legacy structure
  const coaches = await getOrgCoaches(orgId);
  for (const coach of coaches) {
    const legacyClients = await getLegacyClients(coach.uid);
    const legacyAssessments = await getLegacyAssessments(coach.uid);
    result.legacyCounts.clients += legacyClients.length;
    result.legacyCounts.assessments += legacyAssessments.length;
  }

  // Compare
  if (result.newCounts.members !== coaches.length) {
    result.mismatches.push(`Member count mismatch: ${result.newCounts.members} vs ${coaches.length} coaches`);
  }

  // Note: Client count might differ due to deduplication
  logger.info(`Legacy clients: ${result.legacyCounts.clients}, New clients: ${result.newCounts.clients}`);
  logger.info(`Legacy assessments: ${result.legacyCounts.assessments}, New assessments: ${result.newCounts.assessments}`);

  result.success = result.mismatches.length === 0;
  return result;
}

/**
 * Rollback migration (restore from legacy data)
 * Use this if something goes wrong during migration
 */
export async function rollbackMigration(orgId: string): Promise<{
  success: boolean;
  deleted: { members: number; clients: number; assessments: number };
  errors: string[];
}> {
  const db = getDb();
  const result = {
    success: false,
    deleted: { members: 0, clients: 0, assessments: 0 },
    errors: [] as string[],
  };

  try {
    logger.section('ROLLING BACK MIGRATION');
    logger.warn(`⚠️ This will delete all migrated data for org: ${orgId}`);

    // Delete new structure
    const membersRef = collection(db, ORGANIZATION.coaches.collection(orgId));
    const membersSnapshot = await getDocs(membersRef);
    for (const docSnap of membersSnapshot.docs) {
      await deleteDoc(docSnap.ref);
      result.deleted.members++;
    }

    const clientsRef = collection(db, ORGANIZATION.clients.collection(orgId));
    const clientsSnapshot = await getDocs(clientsRef);
    for (const docSnap of clientsSnapshot.docs) {
      await deleteDoc(docSnap.ref);
      result.deleted.clients++;
    }

    const assessmentsRef = collection(db, ORGANIZATION.assessments.collection(orgId));
    const assessmentsSnapshot = await getDocs(assessmentsRef);
    for (const docSnap of assessmentsSnapshot.docs) {
      await deleteDoc(docSnap.ref);
      result.deleted.assessments++;
    }

    logger.info(`Deleted:`);
    logger.info(`   - Members: ${result.deleted.members}`);
    logger.info(`   - Clients: ${result.deleted.clients}`);
    logger.info(`   - Assessments: ${result.deleted.assessments}`);

    result.success = true;
  } catch (error) {
    result.errors.push(`Rollback failed: ${error}`);
  }

  return result;
}

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as unknown as {
    migrateToSaas: typeof migrateToSaas;
    verifyMigration: typeof verifyMigration;
    rollbackMigration: typeof rollbackMigration;
  }).migrateToSaas = migrateToSaas;
  (window as unknown as { verifyMigration: typeof verifyMigration }).verifyMigration = verifyMigration;
  (window as unknown as { rollbackMigration: typeof rollbackMigration }).rollbackMigration = rollbackMigration;
}
