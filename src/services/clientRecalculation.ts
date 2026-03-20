/**
 * Client Score Recalculation Service (Phase D)
 *
 * Retroactively corrects scoring-impacting fields (DOB, gender) across
 * all assessment data: live doc, snapshots, and summaries.
 *
 * IMPORTANT: Merges corrected fields into each document's OWN formData.
 * Does NOT replace historical performance data with current values.
 */

import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
  limit,
  writeBatch,
} from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import type { FormData } from '@/contexts/FormContext';
import { ORGANIZATION } from '@/lib/database/paths';
import { generateClientSlug } from '@/services/clientProfiles';
import { logger } from '@/lib/utils/logger';

/** Fields that are safe to retroactively correct (affect scoring) */
const CORRECTABLE_FIELDS: ReadonlySet<string> = new Set(['dateOfBirth', 'gender']);

const MAX_BATCH_LIMIT = 500;

interface CorrectedFields {
  dateOfBirth?: string;
  gender?: string;
}

interface RecalculationResult {
  success: boolean;
  message: string;
  liveDocUpdated: boolean;
  snapshotsUpdated: number;
  summariesUpdated: number;
}

/**
 * Validate that recalculated scores are safe numbers (not NaN/Infinity).
 */
function isValidScore(score: number): boolean {
  return typeof score === 'number' && Number.isFinite(score) && !Number.isNaN(score);
}

/**
 * Retroactively recalculate scores for a client after correcting
 * a scoring-impacting field like dateOfBirth or gender.
 *
 * GOTCHA: Each snapshot/summary retains its own historical formData.
 * We only patch the corrected fields, then re-score using the
 * snapshot's own performance data (not the current live data).
 */
export async function recalculateClientScores(
  clientName: string,
  organizationId: string,
  correctedFields: CorrectedFields,
): Promise<RecalculationResult> {
  const db = getDb();
  const slug = generateClientSlug(clientName);
  const result: RecalculationResult = {
    success: false,
    message: '',
    liveDocUpdated: false,
    snapshotsUpdated: 0,
    summariesUpdated: 0,
  };

  // Validate corrected fields are on the whitelist
  for (const key of Object.keys(correctedFields)) {
    if (!CORRECTABLE_FIELDS.has(key)) {
      result.message = `Field "${key}" is not in the correctable whitelist (${Array.from(CORRECTABLE_FIELDS).join(', ')}).`;
      return result;
    }
  }

  // Lazy-load scoring engine
  const { computeScores, summarizeScores } = await import('@/lib/scoring');

  // 1. Update live doc
  const currentPath = ORGANIZATION.clients.current(organizationId, slug);
  const currentSnap = await getDoc(doc(db, currentPath));
  if (currentSnap.exists()) {
    const data = currentSnap.data() as { formData: FormData; overallScore: number };
    const patchedForm = { ...data.formData, ...correctedFields } as FormData;
    const newScores = computeScores(patchedForm);

    if (isValidScore(newScores.overall)) {
      await updateDoc(doc(db, currentPath), {
        formData: patchedForm,
        overallScore: newScores.overall,
      });
      result.liveDocUpdated = true;
    } else {
      logger.warn('[Recalc] Skipping live doc: recalculated score is invalid', newScores.overall);
    }
  }

  // 2. Update all sessions
  const snapshotsPath = ORGANIZATION.clients.sessions.collection(organizationId, slug);
  const snapshotDocs = await getDocs(query(collection(db, snapshotsPath), limit(MAX_BATCH_LIMIT)));

  for (const snapDoc of snapshotDocs.docs) {
    const snapData = snapDoc.data() as { formData: FormData; overallScore: number };
    const patchedForm = { ...snapData.formData, ...correctedFields } as FormData;
    const newScores = computeScores(patchedForm);

    if (isValidScore(newScores.overall)) {
      await updateDoc(snapDoc.ref, {
        formData: patchedForm,
        overallScore: newScores.overall,
      });
      result.snapshotsUpdated++;
    } else {
      logger.warn(`[Recalc] Skipping snapshot ${snapDoc.id}: invalid score`);
    }
  }

  // 3. Update client profile doc (v2: one doc per client in clients collection)
  const assessmentsRef = collection(db, ORGANIZATION.clients.collection(organizationId));
  const summaryQ = query(
    assessmentsRef,
    where('clientNameLower', '==', clientName.toLowerCase()),
    limit(MAX_BATCH_LIMIT),
  );
  const summaryDocs = await getDocs(summaryQ);

  if (summaryDocs.size > 0) {
    const batch = writeBatch(db);
    let batchCount = 0;

    for (const sumDoc of summaryDocs.docs) {
      const sumData = sumDoc.data() as { formData: FormData; overallScore: number };
      const patchedForm = { ...sumData.formData, ...correctedFields } as FormData;
      const newSummary = summarizeScores(patchedForm);
      const newScores = computeScores(patchedForm);

      if (isValidScore(newScores.overall)) {
        batch.update(sumDoc.ref, {
          formData: patchedForm,
          overallScore: newScores.overall,
          scoresSummary: newSummary,
        });
        batchCount++;
      } else {
        logger.warn(`[Recalc] Skipping summary ${sumDoc.id}: invalid score`);
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }
    result.summariesUpdated = batchCount;
  }

  result.success = true;
  result.message = `Recalculated: live=${result.liveDocUpdated ? 1 : 0}, snapshots=${result.snapshotsUpdated}, summaries=${result.summariesUpdated}`;
  logger.info(`[Recalc] ${result.message}`);

  return result;
}
