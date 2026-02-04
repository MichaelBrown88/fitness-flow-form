import * as admin from 'firebase-admin';
import type { CallableRequest } from 'firebase-functions/v2/https';
import { APP_HOST, SENDGRID_API_KEY, SENDGRID_FROM } from './config';
import { ensureReportArtifacts } from './artifacts';
import type { PublicReportDoc } from './types';

let sendgridMail: typeof import('@sendgrid/mail') | null = null;
if (SENDGRID_API_KEY) {
  // Lazy import to avoid requiring the module when no API key is provided.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mailModule = require('@sendgrid/mail');
  sendgridMail = mailModule;
  if (sendgridMail) {
    sendgridMail.setApiKey(SENDGRID_API_KEY);
  }
}

// Lazy initialization to ensure admin.initializeApp() is called first
function getDb() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return admin.firestore();
}

type ShareView = 'client' | 'coach';

function assertAuthenticated(request: CallableRequest<unknown>) {
  if (!request.auth?.uid) {
    throw new Error('unauthenticated');
  }
  return request.auth.uid;
}

function cleanEmail(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

/**
 * Get public report by token (preferred) or by coachUid/assessmentId (legacy)
 * Returns the token if found, or null if not found
 */
async function getPublicReportToken(coachUid: string, assessmentId: string): Promise<string | null> {
  // Try to find existing token-based report
  const query = getDb()
    .collection('publicReports')
    .where('coachUid', '==', coachUid)
    .where('assessmentId', '==', assessmentId)
    .where('visibility', '==', 'public')
    .limit(1);

  const snapshot = await query.get();
  if (!snapshot.empty) {
    // Found token-based report
    return snapshot.docs[0].id; // Document ID is the token
  }

  // Fallback to legacy ID-based lookup
  const legacyRef = getDb().doc(`publicReports/${coachUid}__${assessmentId}`);
  const legacySnap = await legacyRef.get();
  if (legacySnap.exists) {
    // Legacy report exists but doesn't have a token yet
    // The client will generate one on next share
    return null;
  }

  return null;
}

async function ensurePublicReport(coachUid: string, assessmentId: string) {
  // Try token-based first
  const token = await getPublicReportToken(coachUid, assessmentId);

  if (token) {
    const ref = getDb().doc(`publicReports/${token}`);
    const snap = await ref.get();
    if (snap.exists) {
      return snap.data() as PublicReportDoc | undefined;
    }
  }

  // Fallback to legacy ID-based
  const legacyRef = getDb().doc(`publicReports/${coachUid}__${assessmentId}`);
  const snap = await legacyRef.get();
  if (!snap.exists) {
    await ensureReportArtifacts({ coachUid, assessmentId });
    return (await legacyRef.get()).data() as PublicReportDoc | undefined;
  }
  return snap.data() as PublicReportDoc;
}

type SharePayload = {
  assessmentId: string;
  view?: ShareView;
};

export async function requestShareLinks(request: CallableRequest<SharePayload>) {
  try {
    const coachUid = assertAuthenticated(request);
    const data = request.data;
    const assessmentId = data.assessmentId;

    if (!assessmentId) {
      throw new Error('invalid-argument');
    }

    const report = await ensurePublicReport(coachUid, assessmentId);
    if (!report) {
      throw new Error('failed-precondition');
    }

    // Try to get token-based URL, fallback to legacy
    const token = await getPublicReportToken(coachUid, assessmentId);
    const shareUrl = token
      ? `${APP_HOST}/r/${token}`
      : (report.shareUrl || `${APP_HOST}/share/${coachUid}/${assessmentId}`);

    const whatsappText = `Here is your One Fitness assessment report:\n${shareUrl}`;

    return {
      shareUrl,
      whatsappText,
    };
  } catch (err) {
    console.error('[requestShareLinks] error', err);
    throw err instanceof Error ? err : new Error(String(err));
  }
}

type EmailPayload = SharePayload & {
  to: string;
  clientName?: string;
};

export async function sendReportEmail(request: CallableRequest<EmailPayload>) {
  const coachUid = assertAuthenticated(request);
  const data = request.data;
  const recipient = cleanEmail(data.to);
  if (!recipient) {
    throw new Error('invalid-email');
  }
  if (!sendgridMail) {
    throw new Error('email-not-configured');
  }

  const view: ShareView = data.view === 'coach' ? 'coach' : 'client';

  // Get share URL by calling the internal logic
  const report = await ensurePublicReport(coachUid, data.assessmentId);
  if (!report) {
    throw new Error('failed-precondition');
  }

  // Try to get token-based URL, fallback to legacy
  const token = await getPublicReportToken(coachUid, data.assessmentId);
  const shareUrl = token
    ? `${APP_HOST}/r/${token}`
    : (report.shareUrl || `${APP_HOST}/share/${coachUid}/${data.assessmentId}`);
  const subject =
    view === 'coach'
      ? 'Coach report ready'
      : `${data.clientName || 'Your'} One Fitness assessment report`;
  const text = `Here is the latest One Fitness assessment report:\n${shareUrl}`;

  await sendgridMail.send({
    to: recipient,
    from: SENDGRID_FROM,
    subject,
    text,
    html: `<p>${text.replace(/\n/g, '<br/>')}</p>`,
  });

  return { ok: true, coachUid };
}
