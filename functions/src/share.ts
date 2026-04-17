import * as admin from 'firebase-admin';
import type { CallableRequest } from 'firebase-functions/v2/https';
import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
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
    throw new HttpsError('unauthenticated', 'Authentication required.');
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
    .collection('shared-reports')
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
  const legacyRef = getDb().doc(`shared-reports/${coachUid}__${assessmentId}`);
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
    const ref = getDb().doc(`shared-reports/${token}`);
    const snap = await ref.get();
    if (snap.exists) {
      return snap.data() as PublicReportDoc | undefined;
    }
  }

  // Fallback to legacy ID-based
  const legacyRef = getDb().doc(`shared-reports/${coachUid}__${assessmentId}`);
  const snap = await legacyRef.get();
  if (!snap.exists) {
    const profileSnap = await getDb().doc(`user-profiles/${coachUid}`).get();
    const organizationId = profileSnap.exists
      ? (profileSnap.data() as { organizationId?: string })?.organizationId
      : undefined;
    if (!organizationId) {
      throw new Error('User profile missing organizationId; cannot create report artifacts.');
    }
    const { shareToken } = await ensureReportArtifacts({
      coachUid,
      assessmentId,
      organizationId,
    });
    const createdSnap = await getDb().doc(`shared-reports/${shareToken}`).get();
    return createdSnap.data() as PublicReportDoc | undefined;
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

    const whatsappText = `Here is your One Assess report (AXIS Score™ & pillars):\n${shareUrl}`;

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

  // Try to get token-based URL, fallback to legacy
  const token = await getPublicReportToken(coachUid, data.assessmentId);
  const shareUrl = token
    ? `${APP_HOST}/r/${token}`
    : (report.shareUrl || `${APP_HOST}/share/${coachUid}/${data.assessmentId}`);
  const subject =
    view === 'coach'
      ? 'Coach report ready (SIGNAL™ & AXIS Score™)'
      : `${data.clientName || 'Your'} One Assess report — AXIS Score™ ready`;
  const clientLabel = data.clientName?.trim() || 'Your';
  const summary =
    view === 'coach'
      ? 'Your coach report is ready — SIGNAL™ themes and AXIS Score™ in One Assess.'
      : `${clientLabel} report is ready to view — AXIS Score™ and pillars in One Assess.`;

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
