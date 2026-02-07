/**
 * Backfill Migrated Assessments
 *
 * Fixes migrated assessments that are missing required fields:
 * - clientNameLower: needed for getClientAssessments query
 * - overallScore: moved from scores.overall to top-level field
 *
 * Run from browser console:
 *   await window.backfillMigratedAssessments({ dryRun: true })  // Preview
 *   await window.backfillMigratedAssessments({ dryRun: false }) // Execute
 */

import {
  getDocs,
  doc,
  getDoc,
  updateDoc,
  collection,
  writeBatch,
} from 'firebase/firestore';
import { getDb, auth } from '@/services/firebase';
import { logger as appLogger } from '@/lib/utils/logger';
import { COLLECTIONS } from '@/constants/collections';
import { ORGANIZATION } from '@/lib/database/paths';

const logger = {
  info: (...args: unknown[]) => appLogger.info('✅', ...args),
  warn: (...args: unknown[]) => appLogger.warn('⚠️', ...args),
  error: (...args: unknown[]) => appLogger.error('❌', ...args),
};

interface BackfillOptions {
  dryRun?: boolean;
  orgId?: string;
}

interface BackfillResult {
  success: boolean;
  dryRun: boolean;
  updated: number;
  skipped: number;
  errors: string[];
}

/**
 * Get the current user's organization ID
 */
async function getCurrentUserOrgId(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const db = getDb();
  const profileRef = doc(db, COLLECTIONS.USER_PROFILES, user.uid);
  const profileSnap = await getDoc(profileRef);

  if (profileSnap.exists()) {
    return profileSnap.data()?.organizationId || null;
  }
  return null;
}

/**
 * Backfill missing fields on migrated assessments
 */
export async function backfillMigratedAssessments(
  options: BackfillOptions = {}
): Promise<BackfillResult> {
  const { dryRun = true, orgId } = options;

  const result: BackfillResult = {
    success: false,
    dryRun,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  try {
    logger.info(dryRun ? '🔍 BACKFILL PREVIEW (DRY RUN)' : '🔧 BACKFILLING ASSESSMENTS');

    if (!dryRun) {
      logger.warn('This will update documents in your database.');
    }

    // Determine org to process
    let targetOrgId = orgId;
    if (!targetOrgId) {
      targetOrgId = await getCurrentUserOrgId();
      if (!targetOrgId) {
        result.errors.push('No orgId provided and could not determine current user organization');
        logger.error('No organization found. Please provide orgId parameter.');
        return result;
      }
    }

    logger.info(`Processing organization: ${targetOrgId}`);

    const db = getDb();
    const assessmentsRef = collection(db, ORGANIZATION.assessments.collection(targetOrgId));
    const snapshot = await getDocs(assessmentsRef);

    logger.info(`Found ${snapshot.size} assessments to check`);

    const toUpdate: Array<{
      id: string;
      clientNameLower?: string;
      overallScore?: number;
    }> = [];

    // Analyze each assessment
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const updates: { clientNameLower?: string; overallScore?: number } = {};

      // Check for missing clientNameLower
      if (!data.clientNameLower && data.clientName) {
        updates.clientNameLower = data.clientName.toLowerCase();
      }

      // Check for missing overallScore (should be at top level)
      if (typeof data.overallScore !== 'number') {
        // Try to get from scores.overall
        const scoreFromScores = data.scores?.overall;
        if (typeof scoreFromScores === 'number') {
          updates.overallScore = scoreFromScores;
        } else {
          // Default to 0 if no score found
          updates.overallScore = 0;
        }
      }

      if (Object.keys(updates).length > 0) {
        toUpdate.push({ id: docSnap.id, ...updates });
      } else {
        result.skipped++;
      }
    }

    logger.info(`Need to update: ${toUpdate.length} assessments`);
    logger.info(`Already correct: ${result.skipped} assessments`);

    if (toUpdate.length === 0) {
      logger.info('No updates needed!');
      result.success = true;
      return result;
    }

    // Show sample of updates
    logger.info('\nSample updates:');
    for (const update of toUpdate.slice(0, 5)) {
      logger.info(`  ${update.id}: clientNameLower=${update.clientNameLower}, overallScore=${update.overallScore}`);
    }
    if (toUpdate.length > 5) {
      logger.info(`  ... and ${toUpdate.length - 5} more`);
    }

    if (dryRun) {
      logger.info('\n💡 This is a DRY RUN. No changes were made.');
      logger.info('   To execute, run:');
      logger.info('   await window.backfillMigratedAssessments({ dryRun: false })');
      result.success = true;
      return result;
    }

    // Execute updates in batches
    const batchSize = 500;
    for (let i = 0; i < toUpdate.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchItems = toUpdate.slice(i, i + batchSize);

      for (const item of batchItems) {
        const docRef = doc(db, ORGANIZATION.assessments.doc(targetOrgId, item.id));
        const updateData: Record<string, unknown> = {};
        if (item.clientNameLower) updateData.clientNameLower = item.clientNameLower;
        if (typeof item.overallScore === 'number') updateData.overallScore = item.overallScore;
        batch.update(docRef, updateData);
      }

      try {
        await batch.commit();
        result.updated += batchItems.length;
        logger.info(`Updated batch ${Math.floor(i / batchSize) + 1}: ${batchItems.length} documents`);
      } catch (error) {
        result.errors.push(`Batch ${Math.floor(i / batchSize) + 1} failed: ${error}`);
        logger.error(`Batch failed:`, error);
      }
    }

    logger.info(`\n✅ Backfill complete! Updated ${result.updated} assessments.`);
    result.success = result.errors.length === 0;

  } catch (error) {
    logger.error('Backfill failed:', error);
    result.errors.push(`Fatal error: ${error}`);
  }

  return result;
}

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as unknown as {
    backfillMigratedAssessments: typeof backfillMigratedAssessments;
  }).backfillMigratedAssessments = backfillMigratedAssessments;
}
