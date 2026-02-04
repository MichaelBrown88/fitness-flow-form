/**
 * Database Integrity Audit Tool
 *
 * Comprehensive audit of the entire database structure for data integrity,
 * orphaned records, missing relationships, and unused fields.
 *
 * Run from browser console: await window.auditDatabase()
 *
 * This tool checks:
 * - Orphaned assessments (without corresponding client profiles)
 * - Clients without any assessments
 * - Users without organizationId
 * - Assessments without organizationId
 * - Stats mismatches between reported and actual counts
 * - Test/demo accounts that should be cleaned up
 * - Duplicate clients across coaches
 * - Unused/deprecated fields in formData
 */

import { getDocs, collection, getDoc, doc } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { logger as appLogger } from '@/lib/utils/logger';
import {
  getOrganizationsCollection,
  getOrganizationDoc,
  getLegacyUserProfilesCollection,
  getLegacyCoachesCollection,
  getAIUsageLogsCollection,
  getPlatformAdminsCollection,
} from '@/lib/database/collections';
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

export interface AuditResult {
  /** Assessments that don't have a corresponding client profile */
  assessmentsWithoutClients: Array<{
    coachUid: string;
    assessmentId: string;
    clientName: string;
    createdAt?: Date;
  }>;

  /** Client profiles that have no assessments */
  clientsWithoutAssessments: Array<{
    coachUid: string;
    clientId: string;
    clientName: string;
  }>;

  /** Users (coaches) without an organizationId */
  usersWithoutOrgId: Array<{
    uid: string;
    email: string;
    role: string;
  }>;

  /** Assessments missing organizationId */
  assessmentsWithoutOrgId: Array<{
    coachUid: string;
    assessmentId: string;
    clientName: string;
  }>;

  /** Comparison of reported stats vs actual counts */
  orgStatsMismatch: {
    orgId: string;
    orgName: string;
    reported: { coaches: number; clients: number; assessments: number };
    actual: { coaches: number; clients: number; assessments: number };
  }[];

  /** System stats vs actual global counts */
  systemStatsMismatch: {
    reported: { orgs: number; coaches: number; clients: number; assessments: number; aiCostsFils: number };
    actual: { orgs: number; coaches: number; clients: number; assessments: number; aiCostsFils: number };
  } | null;

  /** Test accounts that should be cleaned up */
  testAccounts: Array<{
    uid: string;
    email: string;
    reason: string;
  }>;

  /** Clients that appear to be duplicates (same name across coaches) */
  duplicateClients: Array<{
    name: string;
    locations: string[]; // coachUid/clientId pairs
  }>;

  /** Inventory of fields and how many documents have them */
  unusedFields: Record<string, number>;

  /** Fields that are potentially deprecated (marked in FormData but rarely used) */
  potentiallyDeprecatedFields: Array<{
    field: string;
    occurrences: number;
    percentage: number;
  }>;

  /** Summary statistics */
  summary: {
    totalCoaches: number;
    totalClients: number;
    totalAssessments: number;
    totalOrganizations: number;
    issueCount: number;
    auditedAt: Date;
  };
}

// ============================================================================
// FIELD ANALYSIS - Known deprecated/legacy fields
// ============================================================================

/** Fields that are known to be deprecated or legacy */
const KNOWN_DEPRECATED_FIELDS: string[] = [
  'alcoholFrequency',      // Removed from form
  'sleepDuration',         // Replaced by sleepArchetype
  'sleepQuality',          // Replaced by sleepArchetype
  'sleepConsistency',      // Replaced by sleepArchetype
  'primaryTrainingStyle',  // Replaced by primaryTrainingStyles[]
  'mobilityAnkle',         // Replaced by mobilityAnkleLeft/Right
  'hipCm',                 // Replaced by hipsCm
  'neckCm',                // May be unused
];

/** Fields that might be deprecated based on equipment/module settings */
const POTENTIALLY_UNUSED_FIELDS: string[] = [
  'restingBPSystolic',
  'restingBPDiastolic',
  'medicationsFlag',
  'medicationsNotes',
  'lastCaffeineIntake',
  'segmentalArmRightKg',
  'segmentalArmLeftKg',
  'segmentalLegRightKg',
  'segmentalLegLeftKg',
  'segmentalTrunkKg',
  'bmrKcal',
  'inbodyScore',
];

// ============================================================================
// AUDIT FUNCTIONS
// ============================================================================

/**
 * Get all coach UIDs and their organization mapping
 */
async function getCoachMapping(): Promise<Map<string, { email: string; orgId: string | null; role: string }>> {
  const userProfilesSnapshot = await getDocs(getLegacyUserProfilesCollection());
  const platformAdminsSnapshot = await getDocs(getPlatformAdminsCollection());

  const platformAdminUids = new Set(platformAdminsSnapshot.docs.map(d => d.id));
  const coachMap = new Map<string, { email: string; orgId: string | null; role: string }>();

  for (const userDoc of userProfilesSnapshot.docs) {
    const data = userDoc.data();
    const uid = userDoc.id;

    // Skip platform admins - they shouldn't have organizationId
    if (platformAdminUids.has(uid)) continue;

    if (data.role === 'coach' || data.role === 'org_admin') {
      coachMap.set(uid, {
        email: data.email || 'unknown',
        orgId: data.organizationId || null,
        role: data.role,
      });
    }
  }

  return coachMap;
}

/**
 * Get all clients for a coach
 */
async function getCoachClients(coachUid: string): Promise<Map<string, string>> {
  const db = getDb();
  const clientsRef = collection(db, 'coaches', coachUid, 'clients');
  const clientsSnapshot = await getDocs(clientsRef);

  const clients = new Map<string, string>();
  for (const clientDoc of clientsSnapshot.docs) {
    const data = clientDoc.data();
    clients.set(clientDoc.id, data.clientName || clientDoc.id);
  }

  return clients;
}

/**
 * Get all assessments for a coach
 */
async function getCoachAssessments(coachUid: string): Promise<Array<{
  id: string;
  clientName: string;
  clientNameLower: string;
  organizationId: string | null;
  formData: FormData | null;
  createdAt: Date | null;
}>> {
  const db = getDb();
  const assessmentsRef = collection(db, 'coaches', coachUid, 'assessments');
  const assessmentsSnapshot = await getDocs(assessmentsRef);

  const assessments: Array<{
    id: string;
    clientName: string;
    clientNameLower: string;
    organizationId: string | null;
    formData: FormData | null;
    createdAt: Date | null;
  }> = [];

  for (const assessmentDoc of assessmentsSnapshot.docs) {
    const data = assessmentDoc.data();
    assessments.push({
      id: assessmentDoc.id,
      clientName: data.clientName || 'Unknown',
      clientNameLower: (data.clientNameLower || data.clientName || '').toLowerCase(),
      organizationId: data.organizationId || null,
      formData: data.formData || null,
      createdAt: data.createdAt?.toDate?.() || null,
    });
  }

  return assessments;
}

/**
 * Get organization stats
 */
async function getOrgStats(): Promise<Map<string, { name: string; stats: { coaches: number; clients: number; assessments: number } }>> {
  const orgsSnapshot = await getDocs(getOrganizationsCollection());
  const orgStats = new Map<string, { name: string; stats: { coaches: number; clients: number; assessments: number } }>();

  for (const orgDoc of orgsSnapshot.docs) {
    const data = orgDoc.data();
    orgStats.set(orgDoc.id, {
      name: data.name || 'Unnamed',
      stats: {
        coaches: data.stats?.coachCount || 0,
        clients: data.stats?.clientCount || 0,
        assessments: data.stats?.assessmentCount || 0,
      },
    });
  }

  return orgStats;
}

/**
 * Get system stats
 */
async function getSystemStats(): Promise<{
  totalOrgs: number;
  totalCoaches: number;
  totalClients: number;
  totalAssessments: number;
  totalAiCostsFils: number;
} | null> {
  const db = getDb();
  const systemStatsRef = doc(db, 'system_stats', 'global_metrics');
  const systemStatsSnap = await getDoc(systemStatsRef);

  if (!systemStatsSnap.exists()) return null;

  const data = systemStatsSnap.data();
  return {
    totalOrgs: data.totalOrgs || 0,
    totalCoaches: data.totalCoaches || 0,
    totalClients: data.totalClients || 0,
    totalAssessments: data.totalAssessments || 0,
    totalAiCostsFils: data.totalAiCostsFils || 0,
  };
}

/**
 * Analyze field usage across all assessments
 */
function analyzeFieldUsage(allFormData: FormData[]): {
  fieldCounts: Record<string, number>;
  potentiallyDeprecated: Array<{ field: string; occurrences: number; percentage: number }>;
} {
  const fieldCounts: Record<string, number> = {};
  const totalDocs = allFormData.length;

  // Count occurrences of each field
  for (const formData of allFormData) {
    for (const [key, value] of Object.entries(formData)) {
      // Check if field has a meaningful value
      const hasValue = value !== '' && value !== null && value !== undefined &&
        !(Array.isArray(value) && value.length === 0) &&
        !(typeof value === 'object' && Object.keys(value).length === 0);

      if (hasValue) {
        fieldCounts[key] = (fieldCounts[key] || 0) + 1;
      }
    }
  }

  // Identify potentially deprecated fields (less than 5% usage)
  const potentiallyDeprecated: Array<{ field: string; occurrences: number; percentage: number }> = [];
  const threshold = 0.05; // 5%

  for (const field of [...KNOWN_DEPRECATED_FIELDS, ...POTENTIALLY_UNUSED_FIELDS]) {
    const count = fieldCounts[field] || 0;
    const percentage = totalDocs > 0 ? count / totalDocs : 0;

    if (percentage < threshold || count === 0) {
      potentiallyDeprecated.push({
        field,
        occurrences: count,
        percentage: Math.round(percentage * 100),
      });
    }
  }

  return { fieldCounts, potentiallyDeprecated };
}

/**
 * Identify test accounts based on various heuristics
 */
function identifyTestAccounts(
  coachMap: Map<string, { email: string; orgId: string | null; role: string }>,
  assessmentCounts: Map<string, number>,
  clientCounts: Map<string, number>,
): Array<{ uid: string; email: string; reason: string }> {
  const testAccounts: Array<{ uid: string; email: string; reason: string }> = [];

  for (const [uid, { email, role }] of coachMap) {
    const assessments = assessmentCounts.get(uid) || 0;
    const clients = clientCounts.get(uid) || 0;
    const reasons: string[] = [];

    // Check for test email patterns
    if (email.includes('test') || email.includes('demo') || email.includes('example')) {
      reasons.push('Test email pattern');
    }

    // Check for placeholder names
    if (email.toLowerCase() === 'coach' || email.toLowerCase().includes('placeholder')) {
      reasons.push('Placeholder name');
    }

    // Check for zero activity (coach account with no clients and no assessments)
    if (assessments === 0 && clients === 0 && role === 'coach') {
      reasons.push('Zero activity (no clients, no assessments)');
    }

    if (reasons.length > 0) {
      testAccounts.push({ uid, email, reason: reasons.join('; ') });
    }
  }

  return testAccounts;
}

/**
 * Find duplicate clients (same name across different coaches)
 */
function findDuplicateClients(
  clientsByCoach: Map<string, Map<string, string>>,
): Array<{ name: string; locations: string[] }> {
  const clientNameIndex = new Map<string, string[]>();

  for (const [coachUid, clients] of clientsByCoach) {
    for (const [clientId, clientName] of clients) {
      const normalizedName = clientName.toLowerCase().trim();
      const location = `${coachUid}/${clientId}`;

      if (!clientNameIndex.has(normalizedName)) {
        clientNameIndex.set(normalizedName, []);
      }
      clientNameIndex.get(normalizedName)!.push(location);
    }
  }

  // Filter to only duplicates
  const duplicates: Array<{ name: string; locations: string[] }> = [];
  for (const [name, locations] of clientNameIndex) {
    if (locations.length > 1) {
      duplicates.push({ name, locations });
    }
  }

  return duplicates;
}

// ============================================================================
// MAIN AUDIT FUNCTION
// ============================================================================

/**
 * Run a comprehensive database audit
 */
export async function auditDatabase(): Promise<AuditResult> {
  const result: AuditResult = {
    assessmentsWithoutClients: [],
    clientsWithoutAssessments: [],
    usersWithoutOrgId: [],
    assessmentsWithoutOrgId: [],
    orgStatsMismatch: [],
    systemStatsMismatch: null,
    testAccounts: [],
    duplicateClients: [],
    unusedFields: {},
    potentiallyDeprecatedFields: [],
    summary: {
      totalCoaches: 0,
      totalClients: 0,
      totalAssessments: 0,
      totalOrganizations: 0,
      issueCount: 0,
      auditedAt: new Date(),
    },
  };

  try {
    logger.section('DATABASE INTEGRITY AUDIT');
    logger.info('Starting comprehensive audit...\n');

    // ========================================================================
    // Step 1: Gather all data
    // ========================================================================
    logger.info('1️⃣ Gathering coach data...');
    const coachMap = await getCoachMapping();
    result.summary.totalCoaches = coachMap.size;
    logger.info(`   Found ${coachMap.size} coaches`);

    logger.info('\n2️⃣ Gathering client and assessment data...');
    const clientsByCoach = new Map<string, Map<string, string>>();
    const assessmentsByCoach = new Map<string, ReturnType<typeof getCoachAssessments> extends Promise<infer T> ? T : never>();
    const assessmentCounts = new Map<string, number>();
    const clientCounts = new Map<string, number>();
    const allFormData: FormData[] = [];

    // Also check coaches collection directly (some may not be in userProfiles)
    const coachesSnapshot = await getDocs(getLegacyCoachesCollection());
    const allCoachUids = new Set([
      ...coachMap.keys(),
      ...coachesSnapshot.docs.map(d => d.id),
    ]);

    for (const coachUid of allCoachUids) {
      const clients = await getCoachClients(coachUid);
      const assessments = await getCoachAssessments(coachUid);

      clientsByCoach.set(coachUid, clients);
      assessmentsByCoach.set(coachUid, assessments);
      assessmentCounts.set(coachUid, assessments.length);
      clientCounts.set(coachUid, clients.size);

      result.summary.totalClients += clients.size;
      result.summary.totalAssessments += assessments.length;

      // Collect form data for field analysis
      for (const assessment of assessments) {
        if (assessment.formData) {
          allFormData.push(assessment.formData);
        }
      }
    }

    logger.info(`   Found ${result.summary.totalClients} clients, ${result.summary.totalAssessments} assessments`);

    logger.info('\n3️⃣ Gathering organization data...');
    const orgStats = await getOrgStats();
    result.summary.totalOrganizations = orgStats.size;
    logger.info(`   Found ${orgStats.size} organizations`);

    // ========================================================================
    // Step 2: Check for orphaned data
    // ========================================================================
    logger.info('\n4️⃣ Checking for orphaned assessments (no client profile)...');

    for (const [coachUid, assessments] of assessmentsByCoach) {
      const clients = clientsByCoach.get(coachUid) || new Map();

      for (const assessment of assessments) {
        // Generate expected client ID from name
        const expectedClientId = assessment.clientNameLower.replace(/\s+/g, '-');

        if (!clients.has(expectedClientId)) {
          result.assessmentsWithoutClients.push({
            coachUid,
            assessmentId: assessment.id,
            clientName: assessment.clientName,
            createdAt: assessment.createdAt || undefined,
          });
        }
      }
    }

    logger.info(`   Found ${result.assessmentsWithoutClients.length} orphaned assessments`);

    // ========================================================================
    // Step 3: Check for clients without assessments
    // ========================================================================
    logger.info('\n5️⃣ Checking for clients without assessments...');

    for (const [coachUid, clients] of clientsByCoach) {
      const assessments = assessmentsByCoach.get(coachUid) || [];
      const assessedClients = new Set(assessments.map(a => a.clientNameLower.replace(/\s+/g, '-')));

      for (const [clientId, clientName] of clients) {
        if (!assessedClients.has(clientId)) {
          result.clientsWithoutAssessments.push({
            coachUid,
            clientId,
            clientName,
          });
        }
      }
    }

    logger.info(`   Found ${result.clientsWithoutAssessments.length} clients without assessments`);

    // ========================================================================
    // Step 4: Check for missing organizationId
    // ========================================================================
    logger.info('\n6️⃣ Checking for missing organizationId...');

    for (const [uid, { email, orgId, role }] of coachMap) {
      if (!orgId) {
        result.usersWithoutOrgId.push({ uid, email, role });
      }
    }

    logger.info(`   Found ${result.usersWithoutOrgId.length} users without organizationId`);

    for (const [coachUid, assessments] of assessmentsByCoach) {
      for (const assessment of assessments) {
        if (!assessment.organizationId) {
          result.assessmentsWithoutOrgId.push({
            coachUid,
            assessmentId: assessment.id,
            clientName: assessment.clientName,
          });
        }
      }
    }

    logger.info(`   Found ${result.assessmentsWithoutOrgId.length} assessments without organizationId`);

    // ========================================================================
    // Step 5: Check stats mismatches
    // ========================================================================
    logger.info('\n7️⃣ Checking organization stats mismatches...');

    // Calculate actual counts per organization
    const actualOrgCounts = new Map<string, { coaches: number; clients: number; assessments: number }>();

    for (const [coachUid, { orgId }] of coachMap) {
      if (!orgId) continue;

      if (!actualOrgCounts.has(orgId)) {
        actualOrgCounts.set(orgId, { coaches: 0, clients: 0, assessments: 0 });
      }

      const counts = actualOrgCounts.get(orgId)!;
      counts.coaches++;
      counts.clients += clientCounts.get(coachUid) || 0;
      counts.assessments += assessmentCounts.get(coachUid) || 0;
    }

    // Compare with reported stats
    for (const [orgId, { name, stats: reported }] of orgStats) {
      const actual = actualOrgCounts.get(orgId) || { coaches: 0, clients: 0, assessments: 0 };

      if (reported.coaches !== actual.coaches ||
          reported.clients !== actual.clients ||
          reported.assessments !== actual.assessments) {
        result.orgStatsMismatch.push({
          orgId,
          orgName: name,
          reported,
          actual,
        });
      }
    }

    logger.info(`   Found ${result.orgStatsMismatch.length} organizations with stats mismatches`);

    // Check system stats
    const systemStats = await getSystemStats();
    if (systemStats) {
      // Calculate actual AI costs
      const aiLogsSnapshot = await getDocs(getAIUsageLogsCollection());
      let totalAiCostsFils = 0;
      for (const logDoc of aiLogsSnapshot.docs) {
        const data = logDoc.data();
        let costFils = data.costFils || 0;
        if (costFils === 0 && data.costEstimate) {
          costFils = Math.round(data.costEstimate * 0.305 * 1000);
        }
        totalAiCostsFils += costFils;
      }

      const actualSystemStats = {
        orgs: orgStats.size,
        coaches: coachMap.size,
        clients: result.summary.totalClients,
        assessments: result.summary.totalAssessments,
        aiCostsFils: totalAiCostsFils,
      };

      const reportedSystemStats = {
        orgs: systemStats.totalOrgs,
        coaches: systemStats.totalCoaches,
        clients: systemStats.totalClients,
        assessments: systemStats.totalAssessments,
        aiCostsFils: systemStats.totalAiCostsFils,
      };

      if (JSON.stringify(actualSystemStats) !== JSON.stringify(reportedSystemStats)) {
        result.systemStatsMismatch = {
          reported: reportedSystemStats,
          actual: actualSystemStats,
        };
        logger.warn('   System stats mismatch detected');
      } else {
        logger.info('   System stats match actual counts');
      }
    }

    // ========================================================================
    // Step 6: Identify test accounts
    // ========================================================================
    logger.info('\n8️⃣ Identifying test accounts...');
    result.testAccounts = identifyTestAccounts(coachMap, assessmentCounts, clientCounts);
    logger.info(`   Found ${result.testAccounts.length} potential test accounts`);

    // ========================================================================
    // Step 7: Find duplicate clients
    // ========================================================================
    logger.info('\n9️⃣ Finding duplicate clients...');
    result.duplicateClients = findDuplicateClients(clientsByCoach);
    logger.info(`   Found ${result.duplicateClients.length} duplicate client names`);

    // ========================================================================
    // Step 8: Analyze field usage
    // ========================================================================
    logger.info('\n🔟 Analyzing field usage...');
    const { fieldCounts, potentiallyDeprecated } = analyzeFieldUsage(allFormData);
    result.unusedFields = fieldCounts;
    result.potentiallyDeprecatedFields = potentiallyDeprecated;
    logger.info(`   Analyzed ${allFormData.length} assessments`);
    logger.info(`   Found ${potentiallyDeprecated.length} potentially deprecated fields`);

    // ========================================================================
    // Summary
    // ========================================================================
    result.summary.issueCount =
      result.assessmentsWithoutClients.length +
      result.clientsWithoutAssessments.length +
      result.usersWithoutOrgId.length +
      result.assessmentsWithoutOrgId.length +
      result.orgStatsMismatch.length +
      (result.systemStatsMismatch ? 1 : 0) +
      result.testAccounts.length +
      result.duplicateClients.length;

    logger.section('AUDIT SUMMARY');
    logger.info(`📊 Database Statistics:`);
    logger.info(`   - Organizations: ${result.summary.totalOrganizations}`);
    logger.info(`   - Coaches: ${result.summary.totalCoaches}`);
    logger.info(`   - Clients: ${result.summary.totalClients}`);
    logger.info(`   - Assessments: ${result.summary.totalAssessments}`);
    logger.info(`\n⚠️ Issues Found: ${result.summary.issueCount}`);

    if (result.assessmentsWithoutClients.length > 0) {
      logger.warn(`   - Orphaned assessments: ${result.assessmentsWithoutClients.length}`);
    }
    if (result.clientsWithoutAssessments.length > 0) {
      logger.warn(`   - Clients without assessments: ${result.clientsWithoutAssessments.length}`);
    }
    if (result.usersWithoutOrgId.length > 0) {
      logger.warn(`   - Users without orgId: ${result.usersWithoutOrgId.length}`);
    }
    if (result.assessmentsWithoutOrgId.length > 0) {
      logger.warn(`   - Assessments without orgId: ${result.assessmentsWithoutOrgId.length}`);
    }
    if (result.orgStatsMismatch.length > 0) {
      logger.warn(`   - Org stats mismatches: ${result.orgStatsMismatch.length}`);
    }
    if (result.systemStatsMismatch) {
      logger.warn(`   - System stats mismatch: YES`);
    }
    if (result.testAccounts.length > 0) {
      logger.warn(`   - Test accounts: ${result.testAccounts.length}`);
    }
    if (result.duplicateClients.length > 0) {
      logger.warn(`   - Duplicate clients: ${result.duplicateClients.length}`);
    }

    if (result.potentiallyDeprecatedFields.length > 0) {
      logger.info(`\n📝 Potentially Deprecated Fields:`);
      for (const { field, occurrences, percentage } of result.potentiallyDeprecatedFields) {
        logger.info(`   - ${field}: ${occurrences} occurrences (${percentage}%)`);
      }
    }

    logger.info(`\n✅ Audit complete at ${result.summary.auditedAt.toISOString()}`);

    return result;

  } catch (error) {
    logger.error('Audit failed:', error);
    throw error;
  }
}

/**
 * Get a printable report of the audit results
 */
export function formatAuditReport(result: AuditResult): string {
  const lines: string[] = [
    '╔════════════════════════════════════════════════════════════════════╗',
    '║                    DATABASE INTEGRITY AUDIT REPORT                  ║',
    '╠════════════════════════════════════════════════════════════════════╣',
    '',
    '📊 DATABASE STATISTICS',
    '─'.repeat(50),
    `   Organizations: ${result.summary.totalOrganizations}`,
    `   Coaches:       ${result.summary.totalCoaches}`,
    `   Clients:       ${result.summary.totalClients}`,
    `   Assessments:   ${result.summary.totalAssessments}`,
    '',
    '⚠️ ISSUES FOUND',
    '─'.repeat(50),
  ];

  if (result.assessmentsWithoutClients.length > 0) {
    lines.push(`\n📋 Orphaned Assessments (${result.assessmentsWithoutClients.length}):`);
    for (const item of result.assessmentsWithoutClients.slice(0, 10)) {
      lines.push(`   - ${item.clientName} (coach: ${item.coachUid.slice(0, 8)}...)`);
    }
    if (result.assessmentsWithoutClients.length > 10) {
      lines.push(`   ... and ${result.assessmentsWithoutClients.length - 10} more`);
    }
  }

  if (result.usersWithoutOrgId.length > 0) {
    lines.push(`\n👤 Users Without OrgId (${result.usersWithoutOrgId.length}):`);
    for (const item of result.usersWithoutOrgId) {
      lines.push(`   - ${item.email} (${item.role})`);
    }
  }

  if (result.orgStatsMismatch.length > 0) {
    lines.push(`\n📈 Stats Mismatches (${result.orgStatsMismatch.length}):`);
    for (const item of result.orgStatsMismatch) {
      lines.push(`   - ${item.orgName}:`);
      lines.push(`     Reported: ${item.reported.coaches} coaches, ${item.reported.clients} clients, ${item.reported.assessments} assessments`);
      lines.push(`     Actual:   ${item.actual.coaches} coaches, ${item.actual.clients} clients, ${item.actual.assessments} assessments`);
    }
  }

  if (result.testAccounts.length > 0) {
    lines.push(`\n🧪 Test Accounts (${result.testAccounts.length}):`);
    for (const item of result.testAccounts) {
      lines.push(`   - ${item.email}: ${item.reason}`);
    }
  }

  if (result.potentiallyDeprecatedFields.length > 0) {
    lines.push(`\n📝 Potentially Deprecated Fields:`);
    for (const item of result.potentiallyDeprecatedFields) {
      lines.push(`   - ${item.field}: ${item.occurrences} uses (${item.percentage}%)`);
    }
  }

  lines.push('');
  lines.push('─'.repeat(50));
  lines.push(`Audit completed: ${result.summary.auditedAt.toISOString()}`);
  lines.push(`Total issues: ${result.summary.issueCount}`);
  lines.push('╚════════════════════════════════════════════════════════════════════╝');

  return lines.join('\n');
}

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as unknown as {
    auditDatabase: typeof auditDatabase;
    formatAuditReport: typeof formatAuditReport;
  }).auditDatabase = auditDatabase;
  (window as unknown as { formatAuditReport: typeof formatAuditReport }).formatAuditReport = formatAuditReport;
}
