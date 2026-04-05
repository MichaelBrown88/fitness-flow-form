/**
 * Coach Invite Cloud Functions
 *
 * Generates a signed invite token, stores it in Firestore, and emails
 * the invitee via Resend so a new coach can join an organization.
 *
 * Environment: RESEND_API_KEY, RESEND_FROM (see functions/env.example).
 */

import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import type { CallableRequest } from 'firebase-functions/v2/https';
import { HttpsError } from 'firebase-functions/v2/https';
import { Resend } from 'resend';
import {
  APP_HOST,
  COACH_INVITE_ALLOWED_EMAIL_DOMAINS,
  EMAIL_ASSETS_LOGO_URL,
  RESEND_API_KEY,
  RESEND_FROM,
} from './config';
import { renderActivationEmail, sendResendHtmlText } from './email';
import {
  canSendCoachInvites,
  isCoachInviteEmailDomainAllowed,
  isValidCoachInviteEmail,
  normalizeCoachInviteEmail,
} from './inviteShared';

const resend = new Resend(RESEND_API_KEY);

export interface CoachInviteRequest {
  email: string;
  organizationId: string;
  organizationName: string;
  invitedBy: string;
}

interface InvitationDoc {
  email: string;
  organizationId: string;
  organizationName: string;
  invitedBy: string;
  /** Owner / sender Firebase Auth UID — used for invite-accepted notification + email */
  invitedByUid: string;
  createdAt: admin.firestore.FieldValue;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'expired';
}

const INVITE_TTL_DAYS = 7;
const APP_NAME = 'One Assess';

export async function handleSendCoachInvite(
  request: CallableRequest<CoachInviteRequest>,
) {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const { email: rawEmail, organizationId, organizationName, invitedBy } = request.data;

  if (!rawEmail || !organizationId || !organizationName || !invitedBy) {
    throw new HttpsError('invalid-argument', 'Missing required fields: email, organizationId, organizationName, invitedBy.');
  }

  const email = normalizeCoachInviteEmail(rawEmail);
  if (!isValidCoachInviteEmail(email)) {
    throw new HttpsError('invalid-argument', 'Invalid email address.');
  }
  if (!isCoachInviteEmailDomainAllowed(email, COACH_INVITE_ALLOWED_EMAIL_DOMAINS)) {
    throw new HttpsError('permission-denied', 'This email domain is not permitted for coach invitations.');
  }

  const db = admin.firestore();

  const orgDoc = await db.doc(`organizations/${organizationId}`).get();
  if (!orgDoc.exists) {
    throw new HttpsError('not-found', 'Organization not found.');
  }
  const orgData = orgDoc.data();
  const coachSnap = await db.doc(`organizations/${organizationId}/coaches/${request.auth.uid}`).get();
  const coachRole = coachSnap.exists ? (coachSnap.data() as { role?: string }).role : undefined;
  if (
    !canSendCoachInvites({
      orgOwnerId: orgData?.ownerId as string | undefined,
      coachRole,
      authUid: request.auth.uid,
    })
  ) {
    throw new HttpsError('permission-denied', 'Only an organisation owner or admin can send coach invites.');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  const invitation: InvitationDoc = {
    email,
    organizationId,
    organizationName,
    invitedBy,
    invitedByUid: request.auth.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
    status: 'pending',
  };

  await db.doc(`invitations/${token}`).set(invitation);

  const inviteLink = `${APP_HOST}/onboarding?invite=${token}`;

  if (RESEND_API_KEY) {
    const subject = `You've been invited to join ${organizationName}`;
    const { html, text } = renderActivationEmail({
      subject,
      preheader: `${invitedBy} invited you to ${organizationName} on ${APP_NAME}.`,
      appName: APP_NAME,
      logoUrl: EMAIL_ASSETS_LOGO_URL || undefined,
      headline: "You're invited!",
      paragraphs: [
        `${invitedBy} has invited you to join ${organizationName} as a coach.`,
        `This invite expires in ${INVITE_TTL_DAYS} days. If you didn't expect this email, you can ignore it.`,
      ],
      primaryCta: { label: 'Accept invite', href: inviteLink },
      footerVariant: 'transactional',
    });

    await sendResendHtmlText(resend, {
      to: email,
      from: RESEND_FROM,
      subject,
      html,
      text,
    });
  }

  return { success: true, token };
}
