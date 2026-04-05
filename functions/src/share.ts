import { randomUUID } from 'node:crypto';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import type { CallableRequest } from 'firebase-functions/v2/https';
import { Resend } from 'resend';
import { APP_HOST, RESEND_API_KEY, RESEND_FROM } from './config';
import { renderNotificationEmail, sendResendHtmlText } from './email';
import { ensureReportArtifacts } from './artifacts';
import type { PublicReportDoc } from './types';

const resend = new Resend(RESEND_API_KEY);

const APP_NAME = 'One Assess';

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
 * Move `publicReports/{coachUid}__{assessmentId}` → `publicReports/{uuid}` so share links never embed coach UIDs.
 */
async function promoteLegacyPublicReportDoc(
  coachUid: string,
  assessmentId: string,
): Promise<string | null> {
  const db = getDb();
  const legacyId = `${coachUid}__${assessmentId}`;
  if (legacyId.length > 1500) {
    return null;
  }
  const legacyRef = db.doc(`publicReports/${legacyId}`);
  const legacySnap = await legacyRef.get();
  if (!legacySnap.exists) {
    return null;
  }

  const newToken = randomUUID();
  const newRef = db.doc(`publicReports/${newToken}`);
  const data = legacySnap.data() ?? {};
  const batch = db.batch();
  batch.set(
    newRef,
    {
      ...data,
      shareToken: newToken,
      shareUrl: `${APP_HOST}/r/${newToken}`,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: false },
  );
  batch.delete(legacyRef);
  await batch.commit();
  logger.info('[share] promoted legacy publicReport to token doc', { legacyId, newToken });
  return newToken;
}

/** Resolve share token document id for this coach + assessment (promotes legacy doc id if needed). */
async function getPublicReportToken(coachUid: string, assessmentId: string): Promise<string | null> {
  const query = getDb()
    .collection('publicReports')
    .where('coachUid', '==', coachUid)
    .where('assessmentId', '==', assessmentId)
    .where('visibility', '==', 'public')
    .limit(1);

  const snapshot = await query.get();
  if (!snapshot.empty) {
    return snapshot.docs[0].id;
  }

  const promoted = await promoteLegacyPublicReportDoc(coachUid, assessmentId);
  if (promoted) {
    return promoted;
  }

  return null;
}

async function ensurePublicReport(coachUid: string, assessmentId: string) {
  let token = await getPublicReportToken(coachUid, assessmentId);
  if (token) {
    const ref = getDb().doc(`publicReports/${token}`);
    const snap = await ref.get();
    if (snap.exists) {
      return snap.data() as PublicReportDoc | undefined;
    }
  }

  const profileSnap = await getDb().doc(`userProfiles/${coachUid}`).get();
  const organizationId = profileSnap.exists
    ? (profileSnap.data() as { organizationId?: string })?.organizationId
    : undefined;
  if (!organizationId) {
    throw new Error('User profile missing organizationId; cannot create report artifacts.');
  }
  await ensureReportArtifacts({ coachUid, assessmentId, organizationId });
  token = await getPublicReportToken(coachUid, assessmentId);
  if (!token) {
    return undefined;
  }
  const snap = await getDb().doc(`publicReports/${token}`).get();
  return snap.data() as PublicReportDoc | undefined;
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

    const token =
      typeof report.shareToken === 'string' && report.shareToken.length > 0
        ? report.shareToken
        : await getPublicReportToken(coachUid, assessmentId);
    if (!token) {
      throw new Error('failed-precondition');
    }
    const shareUrl = `${APP_HOST}/r/${token}`;

    const whatsappText = `Here is your One Assess assessment report:\n${shareUrl}`;

    return {
      shareUrl,
      whatsappText,
    };
  } catch (err) {
    logger.error('[requestShareLinks] error', err);
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
  if (!RESEND_API_KEY) {
    throw new Error('email-not-configured');
  }

  const view: ShareView = data.view === 'coach' ? 'coach' : 'client';

  // Get share URL by calling the internal logic
  const report = await ensurePublicReport(coachUid, data.assessmentId);
  if (!report) {
    throw new Error('failed-precondition');
  }

  const token =
    typeof report.shareToken === 'string' && report.shareToken.length > 0
      ? report.shareToken
      : await getPublicReportToken(coachUid, data.assessmentId);
  if (!token) {
    throw new Error('failed-precondition');
  }
  const shareUrl = `${APP_HOST}/r/${token}`;
  const subject =
    view === 'coach'
      ? 'Coach report ready'
      : `${data.clientName || 'Your'} One Assess assessment report`;
  const clientLabel = data.clientName?.trim() || 'Your';
  const summary =
    view === 'coach'
      ? 'Your coach assessment report is ready to view.'
      : `${clientLabel} assessment report is ready to view.`;

  const { html, text } = renderNotificationEmail({
    subject,
    preheader: summary,
    appName: APP_NAME,
    summary,
    linkHref: shareUrl,
    linkLabel: 'View report',
    footerVariant: 'transactional',
  });

  await sendResendHtmlText(resend, {
    to: recipient,
    from: RESEND_FROM,
    subject,
    html,
    text,
  });

  return { ok: true, coachUid };
}
