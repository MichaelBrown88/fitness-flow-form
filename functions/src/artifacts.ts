import * as admin from 'firebase-admin';
import { APP_HOST } from './config';
import type { AssessmentDoc, PublicReportDoc } from './types';

// Lazy initialization to ensure admin.initializeApp() is called first
function getDb() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return admin.firestore();
}

const getPublicReportId = (coachUid: string, assessmentId: string) => `${coachUid}__${assessmentId}`;

export async function ensureReportArtifacts(params: {
  coachUid: string;
  assessmentId: string;
  assessment?: AssessmentDoc;
}) {
  const { coachUid, assessmentId } = params;
  const assessment =
    params.assessment ??
    ((
      await getDb().doc(`coaches/${coachUid}/assessments/${assessmentId}`).get()
    ).data() as AssessmentDoc | undefined);

  if (!assessment) {
    throw new Error('Assessment payload missing; cannot create report artifacts.');
  }

  const publicReport: Partial<PublicReportDoc> = {
    coachUid,
    assessmentId,
    clientName: assessment.clientName || 'Unnamed client',
    clientNameLower: (assessment.clientName || 'Unnamed client').toLowerCase(),
    goals: Array.isArray(assessment.goals) ? assessment.goals : [],
    overallScore: typeof assessment.overallScore === 'number' ? assessment.overallScore : 0,
    visibility: 'public',
    shareUrl: `${APP_HOST}/share/${coachUid}/${assessmentId}`,
  };

  await getDb()
    .doc(`publicReports/${getPublicReportId(coachUid, assessmentId)}`)
    .set(
      {
        ...publicReport,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  return {};
}
