/**
 * Send remote assessment intake link to a client via Resend (coach-authenticated).
 */

import * as admin from 'firebase-admin';
import type { CallableRequest } from 'firebase-functions/v2/https';
import { HttpsError } from 'firebase-functions/v2/https';
import { Resend } from 'resend';
import { APP_HOST, RESEND_API_KEY, RESEND_FROM } from './config';
import { renderNotificationEmail, sendResendHtmlText } from './email';
import { REMOTE_ASSESSMENT_MVP } from './remoteAssessment';

const resend = new Resend(RESEND_API_KEY);
const APP_NAME = 'One Assess';
const TOKEN_RE = /^[a-f0-9]{32}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getDb() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return admin.firestore();
}

function cleanEmail(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function displayNameFromProfile(data: Record<string, unknown> | undefined): string {
  const first = typeof data?.firstName === 'string' ? data.firstName.trim() : '';
  const last = typeof data?.lastName === 'string' ? data.lastName.trim() : '';
  const combined = `${first} ${last}`.trim();
  if (combined) return combined;
  if (typeof data?.displayName === 'string' && data.displayName.trim()) {
    return data.displayName.trim();
  }
  return 'Your coach';
}

export type SendRemoteIntakeEmailPayload = {
  organizationId?: string;
  token?: string;
  to?: string;
  clientName?: string;
};

export async function sendRemoteIntakeLinkEmail(
  request: CallableRequest<SendRemoteIntakeEmailPayload>,
): Promise<{ ok: true }> {
  if (!REMOTE_ASSESSMENT_MVP) {
    throw new HttpsError('failed-precondition', 'Remote intake is not enabled.');
  }
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }
  if (!RESEND_API_KEY) {
    throw new HttpsError('failed-precondition', 'Email is not configured.');
  }

  const coachUid = request.auth.uid;
  const organizationId =
    typeof request.data?.organizationId === 'string' ? request.data.organizationId.trim() : '';
  const token = typeof request.data?.token === 'string' ? request.data.token.trim() : '';
  const recipient = cleanEmail(request.data?.to);
  const clientName =
    typeof request.data?.clientName === 'string' ? request.data.clientName.trim() : '';

  if (!organizationId || !token || !TOKEN_RE.test(token)) {
    throw new HttpsError('invalid-argument', 'A valid organization and intake link are required.');
  }
  if (!recipient || !EMAIL_RE.test(recipient)) {
    throw new HttpsError('invalid-argument', 'A valid client email address is required.');
  }
  if (!clientName || clientName.length < 2) {
    throw new HttpsError('invalid-argument', 'Client name is required.');
  }

  const db = getDb();
  const profileSnap = await db.doc(`user-profiles/${coachUid}`).get();
  const profileOrg = (profileSnap.data() as { organizationId?: string } | undefined)?.organizationId;
  if (profileOrg !== organizationId) {
    throw new HttpsError('permission-denied', 'Organization mismatch.');
  }

  const tokenSnap = await db.doc(`remote-tokens/${token}`).get();
  if (!tokenSnap.exists) {
    throw new HttpsError('not-found', 'This intake link is no longer valid. Generate a new link.');
  }

  const tokenData = tokenSnap.data() as {
    coachUid?: string;
    organizationId?: string;
    expiresAt?: admin.firestore.Timestamp;
    scope?: string;
  };

  if (tokenData.coachUid !== coachUid || tokenData.organizationId !== organizationId) {
    throw new HttpsError('permission-denied', 'You cannot send this intake link.');
  }

  const expiresAt = tokenData.expiresAt?.toMillis?.() ?? 0;
  if (expiresAt > 0 && expiresAt < Date.now()) {
    throw new HttpsError('failed-precondition', 'This intake link has expired. Generate a new link.');
  }

  const intakeUrl = `${APP_HOST}/remote/${token}`;
  const coachLabel = displayNameFromProfile(
    profileSnap.data() as Record<string, unknown> | undefined,
  );
  const subject = `Your assessment intake — ${coachLabel}`;
  const summary = `Hi ${clientName}, ${coachLabel} invited you to complete your private intake before your studio visit (about 5–10 minutes on your phone). This link is personal to you and expires in seven days.`;

  const { html, text } = renderNotificationEmail({
    subject,
    preheader: summary,
    appName: APP_NAME,
    summary,
    linkHref: intakeUrl,
    linkLabel: 'Open intake',
    footerVariant: 'transactional',
  });

  await sendResendHtmlText(resend, {
    to: recipient,
    from: RESEND_FROM,
    subject,
    html,
    text,
  });

  return { ok: true };
}
