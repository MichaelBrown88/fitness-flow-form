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

/**
 * Get assessment document from either org-centric or legacy path
 */
async function getAssessmentDoc(
  assessmentId: string,
  organizationId?: string,
  coachUid?: string
): Promise<AssessmentDoc | undefined> {
  const db = getDb();

  // Try organization path first if organizationId is provided
  if (organizationId) {
    const orgDoc = await db
      .doc(`organizations/${organizationId}/assessments/${assessmentId}`)
      .get();
    if (orgDoc.exists) {
      return orgDoc.data() as AssessmentDoc;
    }
  }

  // Fallback to legacy path if coachUid is provided
  if (coachUid) {
    const legacyDoc = await db
      .doc(`coaches/${coachUid}/assessments/${assessmentId}`)
      .get();
    if (legacyDoc.exists) {
      return legacyDoc.data() as AssessmentDoc;
    }
  }

  return undefined;
}

export async function ensureReportArtifacts(params: {
  coachUid: string;
  assessmentId: string;
  assessment?: AssessmentDoc;
  organizationId?: string;
}) {
  const { coachUid, assessmentId, organizationId } = params;

  // Try to get assessment from provided data or fetch from database
  const assessment =
    params.assessment ??
    (await getAssessmentDoc(assessmentId, organizationId, coachUid));

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
    organizationId: organizationId || assessment.organizationId,
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
