import * as admin from 'firebase-admin';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onCall } from 'firebase-functions/v2/https';
import { handleAssessmentWrite } from './artifacts';
import { requestShareLinks, sendReportEmail } from './share';

admin.initializeApp();

export const syncAssessmentArtifacts = onDocumentWritten(
  {
    document: 'coaches/{coachUid}/assessments/{assessmentId}',
  },
  handleAssessmentWrite,
);

export const requestReportShare = onCall({
  enforceAppCheck: false,
}, requestShareLinks);

export const emailReport = onCall({
  enforceAppCheck: false,
}, sendReportEmail);

