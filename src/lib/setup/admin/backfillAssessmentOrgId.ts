/**
 * Backfill Assessment OrganizationId
 *
 * This tool fixes assessments that are missing the organizationId field.
 * It looks up each coach's organizationId and applies it to their assessments.
 *
 * Run from browser console: await window.backfillAssessmentOrgId()
 */

import { getDocs, updateDoc, collection, doc } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { logger as appLogger } from '@/lib/utils/logger';
import { getLegacyUserProfilesCollection } from '@/lib/database/collections';
import { COLLECTIONS } from '@/constants/collections';

const logger = {
  info: (...args: unknown[]) => appLogger.info('✅', ...args),
  warn: (...args: unknown[]) => appLogger.warn('⚠️', ...args),
  error: (...args: unknown[]) => appLogger.error('❌', ...args),
};

export async function backfillAssessmentOrgId(): Promise<{
  success: boolean;
  fixed: number;
  skipped: number;
  errors: string[];
}> {
  const db = getDb();
  const result = { success: false, fixed: 0, skipped: 0, errors: [] as string[] };

  try {
    logger.info('Starting assessment organizationId backfill...');

    // Get all user profiles to find coaches and their orgIds
    const userProfilesSnap = await getDocs(getLegacyUserProfilesCollection());

    const coachOrgMap = new Map<string, string>();
    for (const userDoc of userProfilesSnap.docs) {
      const data = userDoc.data();
      if ((data.role === 'coach' || data.role === 'org_admin') && data.organizationId) {
        coachOrgMap.set(userDoc.id, data.organizationId);
      }
    }

    logger.info(`Found ${coachOrgMap.size} coaches with organizationId`);

    // Process each coach's assessments
    for (const [coachUid, orgId] of coachOrgMap) {
      const assessmentsRef = collection(db, COLLECTIONS.COACHES, coachUid, COLLECTIONS.ASSESSMENTS);
      const assessmentsSnap = await getDocs(assessmentsRef);

      for (const assessmentDoc of assessmentsSnap.docs) {
        const data = assessmentDoc.data();

        if (!data.organizationId) {
          try {
            await updateDoc(doc(db, COLLECTIONS.COACHES, coachUid, COLLECTIONS.ASSESSMENTS, assessmentDoc.id), {
              organizationId: orgId,
            });
            result.fixed++;
            logger.info(`Fixed: ${assessmentDoc.id} -> ${orgId}`);
          } catch (error) {
            result.errors.push(`Failed to fix ${assessmentDoc.id}: ${error}`);
          }
        } else {
          result.skipped++;
        }
      }
    }

    logger.info(`Done! Fixed ${result.fixed} assessments, skipped ${result.skipped} (already had orgId)`);
    result.success = result.errors.length === 0;
    return result;

  } catch (error) {
    logger.error('Backfill failed:', error);
    result.errors.push(`Fatal error: ${error}`);
    return result;
  }
}

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as unknown as {
    backfillAssessmentOrgId: typeof backfillAssessmentOrgId;
  }).backfillAssessmentOrgId = backfillAssessmentOrgId;
}
