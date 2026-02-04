/**
 * Create Missing Client Profiles
 *
 * This tool identifies assessments that don't have corresponding client profiles
 * and creates the missing client documents to maintain data integrity.
 *
 * Run from browser console: await window.createMissingClients()
 *
 * For dry-run mode: await window.createMissingClients({ dryRun: true })
 */

import { getDocs, collection, getDoc, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { logger as appLogger } from '@/lib/utils/logger';
import {
  getLegacyUserProfilesCollection,
  getLegacyCoachesCollection,
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

interface MissingClient {
  coachUid: string;
  clientName: string;
  clientId: string; // slugified name
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  organizationId?: string;
  assessmentCount: number;
  firstAssessmentDate?: Date;
  lastAssessmentDate?: Date;
}

interface CreateMissingClientsOptions {
  /** If true, only report what would be created without making changes */
  dryRun?: boolean;
  /** Specific coach UID to process (optional, processes all if not provided) */
  coachUid?: string;
}

interface CreateMissingClientsResult {
  success: boolean;
  dryRun: boolean;
  missingClients: MissingClient[];
  created: string[];
  skipped: string[];
  errors: string[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a client ID from a name (slugified)
 */
function generateClientId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Get coach's organizationId from userProfiles
 */
async function getCoachOrganizationId(coachUid: string): Promise<string | null> {
  const userProfilesSnapshot = await getDocs(getLegacyUserProfilesCollection());

  for (const userDoc of userProfilesSnapshot.docs) {
    if (userDoc.id === coachUid) {
      const data = userDoc.data();
      return data.organizationId || null;
    }
  }

  return null;
}

/**
 * Get all coach UIDs from both userProfiles and coaches collection
 */
async function getAllCoachUids(): Promise<string[]> {
  const userProfilesSnapshot = await getDocs(getLegacyUserProfilesCollection());
  const coachesSnapshot = await getDocs(getLegacyCoachesCollection());

  const coachUids = new Set<string>();

  // Add coaches from userProfiles
  for (const userDoc of userProfilesSnapshot.docs) {
    const data = userDoc.data();
    if (data.role === 'coach' || data.role === 'org_admin') {
      coachUids.add(userDoc.id);
    }
  }

  // Add coaches from coaches collection
  for (const coachDoc of coachesSnapshot.docs) {
    coachUids.add(coachDoc.id);
  }

  return Array.from(coachUids);
}

/**
 * Get all assessments for a coach
 */
async function getCoachAssessments(coachUid: string): Promise<Array<{
  id: string;
  clientName: string;
  clientNameLower: string;
  organizationId?: string;
  formData?: {
    fullName?: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
  };
  createdAt?: Date;
}>> {
  const db = getDb();
  const assessmentsRef = collection(db, COLLECTIONS.COACHES, coachUid, COLLECTIONS.ASSESSMENTS);
  const snapshot = await getDocs(assessmentsRef);

  const assessments: Array<{
    id: string;
    clientName: string;
    clientNameLower: string;
    organizationId?: string;
    formData?: {
      fullName?: string;
      email?: string;
      phone?: string;
      dateOfBirth?: string;
      gender?: string;
    };
    createdAt?: Date;
  }> = [];

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    assessments.push({
      id: docSnap.id,
      clientName: data.clientName || 'Unknown',
      clientNameLower: (data.clientNameLower || data.clientName || '').toLowerCase(),
      organizationId: data.organizationId,
      formData: data.formData,
      createdAt: data.createdAt?.toDate?.() || undefined,
    });
  }

  return assessments;
}

/**
 * Check if a client profile exists
 */
async function clientProfileExists(coachUid: string, clientId: string): Promise<boolean> {
  const db = getDb();
  const clientRef = doc(db, COLLECTIONS.COACHES, coachUid, COLLECTIONS.CLIENTS, clientId);
  const snapshot = await getDoc(clientRef);
  return snapshot.exists();
}

/**
 * Create a client profile from assessment data
 */
async function createClientProfile(
  coachUid: string,
  client: MissingClient,
): Promise<void> {
  const db = getDb();
  const clientRef = doc(db, COLLECTIONS.COACHES, coachUid, COLLECTIONS.CLIENTS, client.clientId);

  await setDoc(clientRef, {
    clientName: client.clientName,
    email: client.email || '',
    phone: client.phone || '',
    dateOfBirth: client.dateOfBirth || '',
    gender: client.gender || '',
    organizationId: client.organizationId || null,
    assignedCoachUid: coachUid,
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastAssessmentDate: client.lastAssessmentDate || null,
    // Metadata about creation
    metadata: {
      createdByMigration: true,
      migrationDate: new Date().toISOString(),
      originalAssessmentCount: client.assessmentCount,
    },
  });
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Find and create missing client profiles
 */
export async function createMissingClients(
  options: CreateMissingClientsOptions = {},
): Promise<CreateMissingClientsResult> {
  const { dryRun = false, coachUid: specificCoachUid } = options;

  const result: CreateMissingClientsResult = {
    success: false,
    dryRun,
    missingClients: [],
    created: [],
    skipped: [],
    errors: [],
  };

  try {
    logger.section(dryRun ? 'MISSING CLIENTS AUDIT (DRY RUN)' : 'CREATE MISSING CLIENTS');

    // Get all coaches to process
    const coachUids = specificCoachUid
      ? [specificCoachUid]
      : await getAllCoachUids();

    logger.info(`Processing ${coachUids.length} coach(es)...\n`);

    // Process each coach
    for (const coachUid of coachUids) {
      logger.info(`📋 Processing coach: ${coachUid}`);

      // Get coach's organizationId
      const coachOrgId = await getCoachOrganizationId(coachUid);

      // Get all assessments for this coach
      const assessments = await getCoachAssessments(coachUid);
      logger.info(`   Found ${assessments.length} assessments`);

      // Group assessments by client name (normalized)
      const clientAssessments = new Map<string, typeof assessments>();

      for (const assessment of assessments) {
        const normalizedName = assessment.clientNameLower || assessment.clientName.toLowerCase();

        if (!clientAssessments.has(normalizedName)) {
          clientAssessments.set(normalizedName, []);
        }
        clientAssessments.get(normalizedName)!.push(assessment);
      }

      // Check each unique client
      for (const [normalizedName, clientAssessmentsGroup] of clientAssessments) {
        // Get the client ID (slugified name)
        const clientId = generateClientId(normalizedName);

        // Check if client profile exists
        const exists = await clientProfileExists(coachUid, clientId);

        if (!exists) {
          // Extract client info from the most recent assessment with formData
          const assessmentsWithFormData = clientAssessmentsGroup
            .filter(a => a.formData)
            .sort((a, b) => {
              const dateA = a.createdAt?.getTime() || 0;
              const dateB = b.createdAt?.getTime() || 0;
              return dateB - dateA;
            });

          const mostRecentFormData = assessmentsWithFormData[0]?.formData;
          const mostRecentAssessment = clientAssessmentsGroup.sort((a, b) => {
            const dateA = a.createdAt?.getTime() || 0;
            const dateB = b.createdAt?.getTime() || 0;
            return dateB - dateA;
          })[0];

          const firstAssessment = clientAssessmentsGroup.sort((a, b) => {
            const dateA = a.createdAt?.getTime() || 0;
            const dateB = b.createdAt?.getTime() || 0;
            return dateA - dateB;
          })[0];

          // Use organizationId from assessments or coach
          const orgId = mostRecentAssessment?.organizationId || coachOrgId || undefined;

          const missingClient: MissingClient = {
            coachUid,
            clientName: mostRecentFormData?.fullName || mostRecentAssessment?.clientName || normalizedName,
            clientId,
            email: mostRecentFormData?.email,
            phone: mostRecentFormData?.phone,
            dateOfBirth: mostRecentFormData?.dateOfBirth,
            gender: mostRecentFormData?.gender,
            organizationId: orgId,
            assessmentCount: clientAssessmentsGroup.length,
            firstAssessmentDate: firstAssessment?.createdAt,
            lastAssessmentDate: mostRecentAssessment?.createdAt,
          };

          result.missingClients.push(missingClient);

          if (!dryRun) {
            try {
              await createClientProfile(coachUid, missingClient);
              result.created.push(`${coachUid}/${clientId}`);
              logger.info(`   ✅ Created client profile: ${missingClient.clientName}`);
            } catch (error) {
              const errorMsg = `Failed to create ${coachUid}/${clientId}: ${error}`;
              result.errors.push(errorMsg);
              logger.error(`   ❌ ${errorMsg}`);
            }
          } else {
            result.skipped.push(`${coachUid}/${clientId}`);
            logger.info(`   📝 Would create: ${missingClient.clientName} (${clientAssessmentsGroup.length} assessments)`);
          }
        }
      }
    }

    // Summary
    logger.section('SUMMARY');

    if (result.missingClients.length === 0) {
      logger.info('✅ No missing client profiles found! Database is consistent.');
    } else {
      logger.info(`Found ${result.missingClients.length} missing client profiles`);

      if (dryRun) {
        logger.info(`\n📋 Clients that would be created:`);
        for (const client of result.missingClients) {
          logger.info(`   - ${client.clientName} (${client.assessmentCount} assessments, coach: ${client.coachUid.slice(0, 8)}...)`);
        }
        logger.info(`\n💡 Run without dryRun option to create these profiles:`);
        logger.info(`   await window.createMissingClients({ dryRun: false })`);
      } else {
        logger.info(`   Created: ${result.created.length}`);
        logger.info(`   Errors: ${result.errors.length}`);

        if (result.errors.length > 0) {
          logger.error('\nErrors encountered:');
          for (const error of result.errors) {
            logger.error(`   - ${error}`);
          }
        }
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
 * Find missing clients for a specific client name
 * Useful for debugging specific cases
 */
export async function findMissingClientByName(
  clientName: string,
): Promise<MissingClient[]> {
  const normalizedName = clientName.toLowerCase();
  const coachUids = await getAllCoachUids();
  const missing: MissingClient[] = [];

  for (const coachUid of coachUids) {
    const assessments = await getCoachAssessments(coachUid);
    const matchingAssessments = assessments.filter(
      a => a.clientNameLower === normalizedName || a.clientName.toLowerCase() === normalizedName
    );

    if (matchingAssessments.length > 0) {
      const clientId = generateClientId(normalizedName);
      const exists = await clientProfileExists(coachUid, clientId);

      if (!exists) {
        const mostRecent = matchingAssessments[0];
        missing.push({
          coachUid,
          clientName: mostRecent.clientName,
          clientId,
          assessmentCount: matchingAssessments.length,
          organizationId: mostRecent.organizationId,
        });
      }
    }
  }

  return missing;
}

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as unknown as {
    createMissingClients: typeof createMissingClients;
    findMissingClientByName: typeof findMissingClientByName;
  }).createMissingClients = createMissingClients;
  (window as unknown as { findMissingClientByName: typeof findMissingClientByName }).findMissingClientByName = findMissingClientByName;
}
