import * as admin from 'firebase-admin';
import type { FirestoreEvent, Change, DocumentSnapshot } from 'firebase-functions/v2/firestore';
import { STORAGE_REPORT_PREFIX, APP_HOST, SIGNED_URL_TTL_HOURS } from './config';
import { buildReportPdf } from './pdf';
import type { AssessmentDoc, PublicReportDoc } from './types';

// Lazy initialization to ensure admin.initializeApp() is called first
function getDb() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return admin.firestore();
}

function getBucket() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return admin.storage().bucket();
}

const getPublicReportId = (coachUid: string, assessmentId: string) => `${coachUid}__${assessmentId}`;

async function savePdf(buffer: Buffer, path: string) {
  const file = getBucket().file(path);
  await file.save(buffer, {
    contentType: 'application/pdf',
    resumable: false,
    gzip: false,
  });
  return file;
}

async function generateArtifactBuffers(assessment: AssessmentDoc) {
  const [clientBuffer, coachBuffer] = await Promise.all([
    buildReportPdf({ assessment, view: 'client' }),
    buildReportPdf({ assessment, view: 'coach' }),
  ]);
  return { clientBuffer, coachBuffer };
}

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

  const safeName = (assessment.clientName || 'one-fitness-report').trim() || 'one-fitness-report';
  const basePath = `${STORAGE_REPORT_PREFIX}/${coachUid}/${assessmentId}`;
  const clientPath = `${basePath}/client-${safeName}.pdf`.replace(/\s+/g, '-').toLowerCase();
  const coachPath = `${basePath}/coach-${safeName}.pdf`.replace(/\s+/g, '-').toLowerCase();

  const { clientBuffer, coachBuffer } = await generateArtifactBuffers(assessment);
  await Promise.all([
    savePdf(clientBuffer, clientPath),
    savePdf(coachBuffer, coachPath),
  ]);

  const publicReport: Partial<PublicReportDoc> = {
    coachUid,
    assessmentId,
    clientName: assessment.clientName || 'Unnamed client',
    clientNameLower: (assessment.clientName || 'Unnamed client').toLowerCase(),
    goals: Array.isArray(assessment.goals) ? assessment.goals : [],
    overallScore: typeof assessment.overallScore === 'number' ? assessment.overallScore : 0,
    visibility: 'public',
    shareUrl: `${APP_HOST}/share/${coachUid}/${assessmentId}`,
    artifacts: {
      clientPdfPath: clientPath,
      coachPdfPath: coachPath,
    },
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

  return {
    clientPdfPath: clientPath,
    coachPdfPath: coachPath,
  };
}

export async function handleAssessmentWrite(
  event: FirestoreEvent<Change<DocumentSnapshot | undefined> | undefined, { coachUid: string; assessmentId: string }>
) {
  const coachUid = event.params.coachUid;
  const assessmentId = event.params.assessmentId;
  const after = event.data?.after;
  if (!after?.exists) return;
  const assessment = after.data() as AssessmentDoc;
  try {
    await ensureReportArtifacts({ coachUid, assessmentId, assessment });
  } catch (err) {
    console.error('[ensureReportArtifacts] failed', err);
    throw err;
  }
}

export async function getSignedPdfUrl(path: string) {
  const expires = Date.now() + SIGNED_URL_TTL_HOURS * 60 * 60 * 1000;
  const [url] = await getBucket().file(path).getSignedUrl({
    action: 'read',
    expires,
    version: 'v4',
  });
  return url;
}

