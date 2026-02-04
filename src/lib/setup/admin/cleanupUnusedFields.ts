/**
 * Cleanup Unused Fields
 *
 * This tool removes deprecated/unused fields from assessment formData
 * to keep the database clean and reduce storage costs.
 *
 * Run from browser console: await window.cleanupUnusedFields()
 *
 * For dry-run mode: await window.cleanupUnusedFields({ dryRun: true })
 * For specific fields: await window.cleanupUnusedFields({ fields: ['alcoholFrequency'] })
 */

import { getDocs, collection, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { logger as appLogger } from '@/lib/utils/logger';
import {
  getLegacyUserProfilesCollection,
  getLegacyCoachesCollection,
} from '@/lib/database/collections';
import { COLLECTIONS } from '@/constants/collections';
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

/**
 * Fields that are confirmed deprecated and safe to remove
 */
export const CONFIRMED_DEPRECATED_FIELDS: string[] = [
  // Removed from form
  'alcoholFrequency',      // Removed from lifestyle section

  // Legacy fields replaced by new ones
  'sleepDuration',         // Replaced by sleepArchetype
  'sleepQuality',          // Replaced by sleepArchetype
  'sleepConsistency',      // Replaced by sleepArchetype
  'primaryTrainingStyle',  // Replaced by primaryTrainingStyles[]
  'mobilityAnkle',         // Replaced by mobilityAnkleLeft/Right
  'hipCm',                 // Replaced by hipsCm
];

/**
 * Fields that might be unused depending on equipment config
 * These require confirmation before removal
 */
export const POTENTIALLY_DEPRECATED_FIELDS: string[] = [
  'restingBPSystolic',
  'restingBPDiastolic',
  'medicationsFlag',
  'medicationsNotes',
  'lastCaffeineIntake',
  'neckCm',
  'segmentalArmRightKg',
  'segmentalArmLeftKg',
  'segmentalLegRightKg',
  'segmentalLegLeftKg',
  'segmentalTrunkKg',
  'bmrKcal',
  'inbodyScore',
];

interface CleanupOptions {
  /** If true, only report what would be removed without making changes */
  dryRun?: boolean;

  /** Specific fields to remove (defaults to CONFIRMED_DEPRECATED_FIELDS) */
  fields?: string[];

  /** Also include potentially deprecated fields (requires explicit opt-in) */
  includePotentiallyDeprecated?: boolean;

  /** Maximum documents to process in one batch */
  batchSize?: number;
}

interface FieldCleanupStat {
  field: string;
  documentsWithField: number;
  documentsWithValue: number;
  sampleValues: unknown[];
}

interface CleanupResult {
  success: boolean;
  dryRun: boolean;
  fieldsTargeted: string[];
  fieldStats: FieldCleanupStat[];
  documentsAnalyzed: number;
  documentsModified: number;
  fieldsRemoved: number;
  errors: string[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all coach UIDs
 */
async function getAllCoachUids(): Promise<string[]> {
  const userProfilesSnapshot = await getDocs(getLegacyUserProfilesCollection());
  const coachesSnapshot = await getDocs(getLegacyCoachesCollection());

  const coachUids = new Set<string>();

  for (const userDoc of userProfilesSnapshot.docs) {
    const data = userDoc.data();
    if (data.role === 'coach' || data.role === 'org_admin') {
      coachUids.add(userDoc.id);
    }
  }

  for (const coachDoc of coachesSnapshot.docs) {
    coachUids.add(coachDoc.id);
  }

  return Array.from(coachUids);
}

/**
 * Check if a field has a meaningful value
 */
function hasValue(value: unknown): boolean {
  if (value === '' || value === null || value === undefined) return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === 'object' && Object.keys(value as object).length === 0) return false;
  return true;
}

/**
 * Analyze field usage across all assessments
 */
async function analyzeFieldUsage(
  coachUids: string[],
  fieldsToCheck: string[],
): Promise<{
  stats: FieldCleanupStat[];
  assessmentRefs: Array<{ coachUid: string; assessmentId: string; fieldsToRemove: string[] }>;
}> {
  const db = getDb();
  const stats: Map<string, FieldCleanupStat> = new Map();

  // Initialize stats for each field
  for (const field of fieldsToCheck) {
    stats.set(field, {
      field,
      documentsWithField: 0,
      documentsWithValue: 0,
      sampleValues: [],
    });
  }

  const assessmentRefs: Array<{ coachUid: string; assessmentId: string; fieldsToRemove: string[] }> = [];

  for (const coachUid of coachUids) {
    const assessmentsRef = collection(db, COLLECTIONS.COACHES, coachUid, COLLECTIONS.ASSESSMENTS);
    const snapshot = await getDocs(assessmentsRef);

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const formData = data.formData as FormData | undefined;

      if (!formData) continue;

      const fieldsToRemove: string[] = [];

      for (const field of fieldsToCheck) {
        const value = (formData as Record<string, unknown>)[field];
        const stat = stats.get(field)!;

        if (value !== undefined) {
          stat.documentsWithField++;

          if (hasValue(value)) {
            stat.documentsWithValue++;
            // Keep only first 5 sample values
            if (stat.sampleValues.length < 5) {
              stat.sampleValues.push(value);
            }
          }

          fieldsToRemove.push(field);
        }
      }

      if (fieldsToRemove.length > 0) {
        assessmentRefs.push({
          coachUid,
          assessmentId: docSnap.id,
          fieldsToRemove,
        });
      }
    }
  }

  return {
    stats: Array.from(stats.values()),
    assessmentRefs,
  };
}

/**
 * Remove fields from assessment formData using batched writes
 */
async function removeFieldsFromAssessments(
  assessmentRefs: Array<{ coachUid: string; assessmentId: string; fieldsToRemove: string[] }>,
  batchSize: number = 500,
): Promise<{ modified: number; errors: string[] }> {
  const db = getDb();
  let modified = 0;
  const errors: string[] = [];

  // Process in batches
  for (let i = 0; i < assessmentRefs.length; i += batchSize) {
    const batch = writeBatch(db);
    const batchRefs = assessmentRefs.slice(i, i + batchSize);

    for (const { coachUid, assessmentId, fieldsToRemove } of batchRefs) {
      const assessmentRef = doc(db, COLLECTIONS.COACHES, coachUid, COLLECTIONS.ASSESSMENTS, assessmentId);

      // Create update object that removes the fields from formData
      const updates: Record<string, unknown> = {};
      for (const field of fieldsToRemove) {
        // Use FieldValue.delete() equivalent by setting to undefined in update
        // For nested fields in formData, we need to update the whole formData object
        // Instead, we'll use updateDoc with a custom approach
        updates[`formData.${field}`] = null; // Firestore will remove null fields on update
      }

      batch.update(assessmentRef, updates);
    }

    try {
      await batch.commit();
      modified += batchRefs.length;
      logger.info(`   Batch ${Math.floor(i / batchSize) + 1}: Modified ${batchRefs.length} documents`);
    } catch (error) {
      errors.push(`Batch ${Math.floor(i / batchSize) + 1} failed: ${error}`);
      logger.error(`   Batch ${Math.floor(i / batchSize) + 1} failed:`, error);
    }
  }

  return { modified, errors };
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Clean up unused fields from assessment formData
 */
export async function cleanupUnusedFields(
  options: CleanupOptions = {},
): Promise<CleanupResult> {
  const {
    dryRun = true, // Default to dry run for safety
    fields,
    includePotentiallyDeprecated = false,
    batchSize = 500,
  } = options;

  const result: CleanupResult = {
    success: false,
    dryRun,
    fieldsTargeted: [],
    fieldStats: [],
    documentsAnalyzed: 0,
    documentsModified: 0,
    fieldsRemoved: 0,
    errors: [],
  };

  try {
    logger.section(dryRun ? 'FIELD CLEANUP ANALYSIS (DRY RUN)' : 'FIELD CLEANUP');

    // Determine which fields to target
    const fieldsToClean = fields || [
      ...CONFIRMED_DEPRECATED_FIELDS,
      ...(includePotentiallyDeprecated ? POTENTIALLY_DEPRECATED_FIELDS : []),
    ];

    result.fieldsTargeted = fieldsToClean;
    logger.info(`Targeting ${fieldsToClean.length} fields for cleanup:`);
    for (const field of fieldsToClean) {
      logger.info(`   - ${field}`);
    }

    // Get all coaches
    logger.info('\n📋 Gathering coach data...');
    const coachUids = await getAllCoachUids();
    logger.info(`   Found ${coachUids.length} coaches`);

    // Analyze field usage
    logger.info('\n🔍 Analyzing field usage...');
    const { stats, assessmentRefs } = await analyzeFieldUsage(coachUids, fieldsToClean);

    result.fieldStats = stats;
    result.documentsAnalyzed = assessmentRefs.length;

    // Count total fields to remove
    let totalFieldsToRemove = 0;
    for (const ref of assessmentRefs) {
      totalFieldsToRemove += ref.fieldsToRemove.length;
    }
    result.fieldsRemoved = totalFieldsToRemove;

    // Report findings
    logger.section('FIELD USAGE ANALYSIS');

    for (const stat of stats) {
      if (stat.documentsWithField > 0) {
        logger.info(`\n📊 ${stat.field}:`);
        logger.info(`   - Documents with field: ${stat.documentsWithField}`);
        logger.info(`   - Documents with value: ${stat.documentsWithValue}`);
        if (stat.sampleValues.length > 0) {
          logger.info(`   - Sample values: ${JSON.stringify(stat.sampleValues.slice(0, 3))}`);
        }
      } else {
        logger.info(`\n📊 ${stat.field}: Not found in any documents`);
      }
    }

    logger.section('CLEANUP PLAN');
    logger.info(`Documents to modify: ${assessmentRefs.length}`);
    logger.info(`Total field removals: ${totalFieldsToRemove}`);

    if (dryRun) {
      logger.info(`\n💡 This is a DRY RUN. No changes will be made.`);
      logger.info(`   To execute the cleanup, run:`);
      logger.info(`   await window.cleanupUnusedFields({ dryRun: false })`);

      if (!includePotentiallyDeprecated) {
        logger.info(`\n💡 To also include potentially deprecated fields:`);
        logger.info(`   await window.cleanupUnusedFields({ dryRun: false, includePotentiallyDeprecated: true })`);
      }

      result.success = true;
    } else {
      // Execute the cleanup
      logger.info(`\n⚡ Executing cleanup...`);

      if (assessmentRefs.length === 0) {
        logger.info('   No documents need modification');
        result.success = true;
      } else {
        const { modified, errors } = await removeFieldsFromAssessments(assessmentRefs, batchSize);
        result.documentsModified = modified;
        result.errors = errors;
        result.success = errors.length === 0;

        logger.section('CLEANUP COMPLETE');
        logger.info(`Documents modified: ${modified}/${assessmentRefs.length}`);
        logger.info(`Fields removed: ${totalFieldsToRemove}`);

        if (errors.length > 0) {
          logger.error(`\nErrors encountered: ${errors.length}`);
          for (const error of errors) {
            logger.error(`   - ${error}`);
          }
        }
      }
    }

    return result;

  } catch (error) {
    logger.error('Cleanup failed:', error);
    result.errors.push(`Fatal error: ${error}`);
    return result;
  }
}

/**
 * Get a report of field usage across all assessments
 */
export async function getFieldUsageReport(): Promise<{
  totalAssessments: number;
  fieldUsage: Record<string, { count: number; percentage: number }>;
}> {
  const db = getDb();
  const coachUids = await getAllCoachUids();

  const fieldCounts: Record<string, number> = {};
  let totalAssessments = 0;

  for (const coachUid of coachUids) {
    const assessmentsRef = collection(db, COLLECTIONS.COACHES, coachUid, COLLECTIONS.ASSESSMENTS);
    const snapshot = await getDocs(assessmentsRef);

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const formData = data.formData as FormData | undefined;

      if (!formData) continue;
      totalAssessments++;

      for (const [field, value] of Object.entries(formData)) {
        if (hasValue(value)) {
          fieldCounts[field] = (fieldCounts[field] || 0) + 1;
        }
      }
    }
  }

  const fieldUsage: Record<string, { count: number; percentage: number }> = {};
  for (const [field, count] of Object.entries(fieldCounts)) {
    fieldUsage[field] = {
      count,
      percentage: totalAssessments > 0 ? Math.round((count / totalAssessments) * 100) : 0,
    };
  }

  // Sort by usage percentage
  const sortedUsage: Record<string, { count: number; percentage: number }> = {};
  const sortedFields = Object.entries(fieldUsage)
    .sort((a, b) => b[1].percentage - a[1].percentage);

  for (const [field, usage] of sortedFields) {
    sortedUsage[field] = usage;
  }

  return {
    totalAssessments,
    fieldUsage: sortedUsage,
  };
}

/**
 * List all deprecated fields with their current status
 */
export function listDeprecatedFields(): {
  confirmed: string[];
  potential: string[];
} {
  console.log('\n📋 CONFIRMED DEPRECATED FIELDS (safe to remove):');
  for (const field of CONFIRMED_DEPRECATED_FIELDS) {
    console.log(`   - ${field}`);
  }

  console.log('\n⚠️ POTENTIALLY DEPRECATED FIELDS (require confirmation):');
  for (const field of POTENTIALLY_DEPRECATED_FIELDS) {
    console.log(`   - ${field}`);
  }

  return {
    confirmed: CONFIRMED_DEPRECATED_FIELDS,
    potential: POTENTIALLY_DEPRECATED_FIELDS,
  };
}

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as unknown as {
    cleanupUnusedFields: typeof cleanupUnusedFields;
    getFieldUsageReport: typeof getFieldUsageReport;
    listDeprecatedFields: typeof listDeprecatedFields;
  }).cleanupUnusedFields = cleanupUnusedFields;
  (window as unknown as { getFieldUsageReport: typeof getFieldUsageReport }).getFieldUsageReport = getFieldUsageReport;
  (window as unknown as { listDeprecatedFields: typeof listDeprecatedFields }).listDeprecatedFields = listDeprecatedFields;
}
