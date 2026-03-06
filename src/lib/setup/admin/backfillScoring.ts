/**
 * Backfill Scoring for All Clients
 *
 * Recalculates overall and category scores using the current scoring logic
 * (simple average of filled pillars / sub-scores) for every client's current doc,
 * all snapshots, and summary doc. Does not patch any form fields—re-score only.
 *
 * Run from browser console (or admin entrypoint):
 *   await window.backfillScoring({ dryRun: true, orgId: 'your-org-id' })
 *   await window.backfillScoring({ dryRun: false })
 */

import { collection, getDocs, query, where, orderBy, limit, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getDb, auth } from '@/services/firebase';
import { ORGANIZATION } from '@/lib/database/paths';
import { getAllClients } from '@/services/coachAssessments';
import { getSnapshots } from '@/services/assessmentHistory';
import { generateClientSlug } from '@/services/clientProfiles';
import type { FormData } from '@/contexts/FormContext';
import { reclassifyPostureInFormData } from '@/lib/utils/reclassifyPosture';

const MAX_SNAPSHOTS_PER_CLIENT = 500;
const MAX_CLIENT_LIST = 500;

function isValidScore(score: number): boolean {
  return typeof score === 'number' && Number.isFinite(score) && !Number.isNaN(score);
}

export interface BackfillScoringOptions {
  dryRun?: boolean;
  orgId?: string;
  coachUid?: string;
  /** When true, reclassify posture status from stored numbers (shoulder <1 cm, CVA if stored) then recalc */
  runPostureReclassify?: boolean;
}

export interface BackfillScoringResult {
  processed: number;
  currentUpdated: number;
  snapshotsUpdated: number;
  summariesUpdated: number;
  errors: string[];
  details: string[];
}

export async function backfillScoring(options: BackfillScoringOptions = {}): Promise<BackfillScoringResult> {
  const { dryRun = true, runPostureReclassify = false } = options;
  const result: BackfillScoringResult = {
    processed: 0,
    currentUpdated: 0,
    snapshotsUpdated: 0,
    summariesUpdated: 0,
    errors: [],
    details: [],
  };

  const user = auth.currentUser;
  const coachUid = options.coachUid ?? user?.uid;
  if (!coachUid) {
    result.errors.push('Not authenticated and no coachUid provided');
    return result;
  }

  let orgId = options.orgId;
  if (!orgId) {
    const profileSnap = await getDoc(doc(getDb(), 'userProfiles', coachUid));
    if (!profileSnap.exists()) {
      result.errors.push('No user profile found');
      return result;
    }
    orgId = profileSnap.data().organizationId;
    if (!orgId) {
      result.errors.push('No organizationId on profile');
      return result;
    }
  }

  const { computeScores, summarizeScores } = await import('@/lib/scoring');
  const db = getDb();

  const clientNames = await getAllClients(coachUid, orgId, MAX_CLIENT_LIST);
  result.details.push(`Found ${clientNames.length} clients in org ${orgId}`);

  for (const clientName of clientNames) {
    result.processed++;
    const slug = generateClientSlug(clientName);

    try {
      const currentPath = ORGANIZATION.assessmentHistory.current(orgId, slug);
      const currentRef = doc(db, currentPath);
      const currentSnap = await getDoc(currentRef);

      if (currentSnap.exists()) {
        let formData = currentSnap.data().formData as FormData;
        if (runPostureReclassify && formData?.postureAiResults) {
          formData = { ...formData, postureAiResults: reclassifyPostureInFormData(formData.postureAiResults) };
        }
        const newScores = computeScores(formData);
        if (isValidScore(newScores.overall)) {
          if (!dryRun) {
            await updateDoc(currentRef, runPostureReclassify && formData.postureAiResults
              ? { formData, overallScore: newScores.overall }
              : { overallScore: newScores.overall });
          }
          result.currentUpdated++;
        }
      }

      const snapshots = await getSnapshots(coachUid, clientName, MAX_SNAPSHOTS_PER_CLIENT, orgId);
      const snapshotsAsc = [...snapshots].sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis());
      const snapshotsRef = collection(db, ORGANIZATION.assessmentHistory.snapshots(orgId, slug));

      for (const snap of snapshotsAsc) {
        let formData = snap.formData;
        if (runPostureReclassify && formData?.postureAiResults) {
          formData = { ...formData, postureAiResults: reclassifyPostureInFormData(formData.postureAiResults) };
        }
        const newScores = computeScores(formData);
        if (isValidScore(newScores.overall)) {
          if (!dryRun) {
            const snapRef = doc(db, snapshotsRef.path, snap.id);
            await updateDoc(snapRef, runPostureReclassify && formData.postureAiResults
              ? { formData, overallScore: newScores.overall }
              : { overallScore: newScores.overall });
          }
          result.snapshotsUpdated++;
        }
      }

      const assessmentsRef = collection(db, ORGANIZATION.assessments.collection(orgId));
      const summaryQ = query(
        assessmentsRef,
        where('clientNameLower', '==', clientName.toLowerCase()),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const summarySnap = await getDocs(summaryQ);

      if (!summarySnap.empty) {
        const sumDoc = summarySnap.docs[0];
        const sumData = sumDoc.data() as { formData: FormData; overallScore: number; previousScore?: number; trend?: number };
        let formData = (sumData.formData ?? {}) as FormData;
        if (runPostureReclassify && formData?.postureAiResults) {
          formData = { ...formData, postureAiResults: reclassifyPostureInFormData(formData.postureAiResults) };
        }
        const newScores = computeScores(formData);
        const newSummary = summarizeScores(formData);
        if (isValidScore(newScores.overall)) {
          const prevSnapshot = snapshotsAsc.length >= 2 ? snapshotsAsc[snapshotsAsc.length - 2] : null;
          const previousScore = prevSnapshot ? computeScores(prevSnapshot.formData).overall : 0;
          const trend = newScores.overall - previousScore;
          if (!dryRun) {
            await updateDoc(sumDoc.ref, runPostureReclassify && formData.postureAiResults
              ? { formData, overallScore: newScores.overall, scoresSummary: newSummary, previousScore, trend }
              : { overallScore: newScores.overall, scoresSummary: newSummary, previousScore, trend });
          }
          result.summariesUpdated++;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`${clientName}: ${msg}`);
    }
  }

  result.details.push(
    `Done: current=${result.currentUpdated}, snapshots=${result.snapshotsUpdated}, summaries=${result.summariesUpdated}${dryRun ? ' (dry run)' : ''}`
  );
  return result;
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as Window & { backfillScoring?: typeof backfillScoring }).backfillScoring = backfillScoring;
}
