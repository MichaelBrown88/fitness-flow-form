import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import type { CoachAssessmentSummary } from '@/services/coachAssessments';
import { parseClientProfileStatus } from '@/lib/clients/parseClientProfileStatus';

export function mapOrgClientDocToSummary(
  docSnap: QueryDocumentSnapshot<DocumentData>,
): CoachAssessmentSummary {
  const docData = docSnap.data();
  const clientStatus = parseClientProfileStatus(docData.status);
  const score =
    typeof docData.overallScore === 'number'
      ? docData.overallScore
      : (docData.scores?.overall ?? 0);

  return {
    id: docSnap.id,
    clientName: docData.clientName || 'Unnamed client',
    createdAt: docData.createdAt || null,
    updatedAt: docData.updatedAt || docData.remoteIntakeLastAt || null,
    overallScore: score,
    goals: Array.isArray(docData.goals) ? docData.goals : [],
    scoresSummary: docData.scoresSummary ?? docData.scores,
    coachUid: docData.coachUid || null,
    previousScore: docData.previousScore,
    trend: docData.trend,
    assessmentCount: docData.assessmentCount,
    clientStatus,
    remoteIntakeAwaitingStudio:
      clientStatus !== 'deleted' && docData.remoteIntakeAwaitingStudio === true,
    remoteIntakePending:
      clientStatus !== 'deleted' &&
      docData.remoteIntakePending === true &&
      docData.remoteIntakeAwaitingStudio !== true,
    assessmentType: docData.assessmentType,
    isPartial: docData.isPartial,
  };
}

/** Merge client rows; intake-flagged rows win so dashboard pills stay accurate. */
export function mergeClientSummaries(
  primary: CoachAssessmentSummary[],
  intakePriority: CoachAssessmentSummary[],
): CoachAssessmentSummary[] {
  const byId = new Map<string, CoachAssessmentSummary>();
  for (const item of primary) {
    byId.set(item.id, item);
  }
  for (const item of intakePriority) {
    const existing = byId.get(item.id);
    byId.set(item.id, existing ? { ...existing, ...item } : item);
  }
  return Array.from(byId.values());
}
