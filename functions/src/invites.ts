/**
 * Coach Invite Cloud Functions
 *
 * Generates a signed invite token, stores it in Firestore, and sends
 * an email via SendGrid so a new coach can join an organization.
 *
 * Environment variables required:
 *   SENDGRID_API_KEY — SendGrid API key (shared with share.ts)
 *   SENDGRID_FROM    — Sender email address
 */

import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import type { CallableRequest } from 'firebase-functions/v2/https';
import { Resend } from 'resend';
import { APP_HOST, RESEND_API_KEY, RESEND_FROM } from './config';

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
  createdAt: admin.firestore.FieldValue;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'expired';
}

const INVITE_TTL_DAYS = 7;

export async function handleSendCoachInvite(
  request: CallableRequest<CoachInviteRequest>,
) {
  if (!request.auth?.uid) {
    throw new Error('Authentication required.');
  }

  const { email, organizationId, organizationName, invitedBy } = request.data;

  if (!email || !organizationId || !organizationName || !invitedBy) {
    throw new Error('Missing required fields: email, organizationId, organizationName, invitedBy.');
  }

  const db = admin.firestore();

  const orgDoc = await db.doc(`organizations/${organizationId}`).get();
  if (!orgDoc.exists) {
    throw new Error('Organization not found.');
  }
  const orgData = orgDoc.data();
  if (orgData?.ownerId !== request.auth.uid) {
    throw new Error('Only the organization owner can send invites.');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  const invitation: InvitationDoc = {
    email,
    organizationId,
    organizationName,
    invitedBy,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
    status: 'pending',
  };

  await db.doc(`invitations/${token}`).set(invitation);

  const inviteLink = `${APP_HOST}/onboarding?invite=${token}`;

  if (RESEND_API_KEY) {
    await resend.emails.send({
      to: email,
      from: RESEND_FROM,
      subject: `You've been invited to join ${organizationName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>You're invited!</h2>
          <p><strong>${invitedBy}</strong> has invited you to join
             <strong>${organizationName}</strong> as a coach.</p>
          <a href="${inviteLink}"
             style="display:inline-block;padding:12px 24px;background:#0f172a;color:#fff;
                    border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">
            Accept Invite
          </a>
          <p style="font-size:12px;color:#94a3b8;">
            This invite expires in ${INVITE_TTL_DAYS} days. If you didn't expect this email, you can ignore it.
          </p>
        </div>
      `,
    });
  }

  return { success: true, token };
}
