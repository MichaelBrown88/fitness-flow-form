/**
 * Server-side coach invite acceptance: binds Auth identity to invitation email,
 * writes roster row, updates profile, marks invitation accepted (Admin SDK — bypasses client rules).
 */

import * as admin from 'firebase-admin';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { normalizeCoachInviteEmail } from './inviteShared';

export interface AcceptCoachInviteRequest {
  token: string;
  displayName: string;
  email: string | null;
  isActiveCoach: boolean;
}

function toDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof admin.firestore.Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    try {
      return (value as { toDate: () => Date }).toDate();
    } catch {
      return null;
    }
  }
  return null;
}

export async function handleAcceptCoachInvite(
  request: CallableRequest<AcceptCoachInviteRequest>,
): Promise<{ success: true; organizationId: string }> {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const uid = request.auth.uid;
  const rawToken = request.data?.token;
  const token = typeof rawToken === 'string' ? rawToken.trim() : '';
  if (!token || token.length < 16) {
    throw new HttpsError('invalid-argument', 'Invalid invitation token.');
  }

  const displayName =
    typeof request.data.displayName === 'string' ? request.data.displayName.trim() : '';
  if (!displayName) {
    throw new HttpsError('invalid-argument', 'Display name is required.');
  }

  const emailFromClient =
    request.data.email === null || request.data.email === undefined
      ? null
      : typeof request.data.email === 'string'
        ? normalizeCoachInviteEmail(request.data.email)
        : null;

  const isActiveCoach = request.data.isActiveCoach !== false;

  const authUser = await admin.auth().getUser(uid);
  const authEmail = authUser.email ? normalizeCoachInviteEmail(authUser.email) : null;
  if (!authEmail) {
    throw new HttpsError(
      'failed-precondition',
      'Your account must have an email address to accept this invitation.',
    );
  }

  const passwordProvider = authUser.providerData.some((p) => p.providerId === 'password');
  if (passwordProvider && authUser.emailVerified !== true) {
    throw new HttpsError(
      'failed-precondition',
      'Please verify your email before accepting this invitation.',
    );
  }

  if (emailFromClient !== null && emailFromClient !== authEmail) {
    throw new HttpsError(
      'failed-precondition',
      'Signed-in email does not match the invitation. Use the account that received the invite.',
    );
  }

  const db = admin.firestore();
  const inviteRef = db.doc(`invitations/${token}`);
  const inviteSnap = await inviteRef.get();

  if (!inviteSnap.exists) {
    throw new HttpsError('not-found', 'This invitation could not be found.');
  }

  const inv = inviteSnap.data() as Record<string, unknown>;
  const status = inv.status;
  if (status !== 'pending') {
    throw new HttpsError('failed-precondition', 'This invitation is no longer valid.');
  }

  const expiresAt = toDate(inv.expiresAt);
  if (!expiresAt || expiresAt.getTime() < Date.now()) {
    throw new HttpsError('failed-precondition', 'This invitation has expired.');
  }

  const invitedEmailRaw = typeof inv.email === 'string' ? inv.email : '';
  const invitedEmail = normalizeCoachInviteEmail(invitedEmailRaw);
  if (!invitedEmail) {
    throw new HttpsError('failed-precondition', 'This invitation is misconfigured.');
  }

  if (authEmail !== invitedEmail) {
    throw new HttpsError(
      'permission-denied',
      'This invitation was sent to a different email address. Sign in with that email to accept.',
    );
  }

  const organizationId = typeof inv.organizationId === 'string' ? inv.organizationId : '';
  if (!organizationId) {
    throw new HttpsError('failed-precondition', 'This invitation is misconfigured.');
  }

  const profileRef = db.doc(`userProfiles/${uid}`);
  const profileSnap = await profileRef.get();
  const previousOrgId = profileSnap.exists
    ? (profileSnap.data() as { organizationId?: string }).organizationId
    : undefined;

  const batch = db.batch();

  batch.set(
    inviteRef,
    {
      status: 'accepted',
      acceptedByUid: uid,
      acceptedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const coachRef = db.doc(`organizations/${organizationId}/coaches/${uid}`);
  batch.set(
    coachRef,
    {
      uid,
      role: 'coach',
      displayName: displayName || 'Coach',
      email: authUser.email ?? null,
    },
    { merge: true },
  );

  batch.set(
    profileRef,
    {
      onboardingCompleted: true,
      isActiveCoach,
      displayName,
      email: authUser.email ?? null,
      organizationId,
      role: 'coach',
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  if (
    typeof previousOrgId === 'string' &&
    previousOrgId.length > 0 &&
    previousOrgId !== organizationId
  ) {
    const shellCoachRef = db.doc(`organizations/${previousOrgId}/coaches/${uid}`);
    batch.delete(shellCoachRef);
  }

  await batch.commit();

  return { success: true, organizationId };
}
