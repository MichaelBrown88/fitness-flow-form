import { randomUUID } from 'node:crypto';
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

/**
 * Get assessment document from org-scoped path (legacy paths removed).
 */
async function getAssessmentDoc(
  assessmentId: string,
  organizationId: string
): Promise<AssessmentDoc | undefined> {
  const db = getDb();
  const orgDoc = await db
    .doc(`organizations/${organizationId}/clients/${assessmentId}`)
    .get();
  if (orgDoc.exists) {
    return orgDoc.data() as AssessmentDoc;
  }
  return undefined;
}

export async function ensureReportArtifacts(params: {
  coachUid: string;
  assessmentId: string;
  assessment?: AssessmentDoc;
  organizationId: string;
}) {
  const { coachUid, assessmentId, organizationId } = params;

  const assessment =
    params.assessment ??
    (await getAssessmentDoc(assessmentId, organizationId));

  if (!assessment) {
    throw new Error('Assessment payload missing; cannot create report artifacts.');
  }

  const shareToken = randomUUID();
  const publicReport: Partial<PublicReportDoc> = {
    coachUid,
    assessmentId,
    shareToken,
    clientName: assessment.clientName || 'Unnamed client',
    clientNameLower: (assessment.clientName || 'Unnamed client').toLowerCase(),
    goals: Array.isArray(assessment.goals) ? assessment.goals : [],
    overallScore: typeof assessment.overallScore === 'number' ? assessment.overallScore : 0,
    visibility: 'public',
    shareUrl: `${APP_HOST}/r/${shareToken}`,
    organizationId: organizationId || assessment.organizationId,
  };

  await getDb()
    .doc(`shared-reports/${shareToken}`)
    .set(
      {
        ...publicReport,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  return { shareToken };
}
