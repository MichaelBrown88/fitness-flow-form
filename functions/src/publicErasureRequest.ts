/**
 * Public GDPR erasure request submission (token-scoped).
 * Writes via Admin SDK so Firestore rules can deny direct client creates on erasureRequests.
 */

import * as admin from 'firebase-admin';
import type { CallableRequest } from 'firebase-functions/v2/https';
import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { assertRateLimit } from './rateLimit';

const MAX_SHARE_TOKEN_LEN = 256;
const MAX_REASON_CHARS = 2000;

function normalizeClientIp(rawIp: string | undefined): string {
  return rawIp?.replace(/^::ffff:/, '') ?? 'unknown';
}

export async function handleSubmitPublicErasureRequest(
  request: CallableRequest<{ shareToken?: unknown; reason?: unknown }>,
): Promise<{ success: true; requestId: string }> {
  const db = admin.firestore();
  const ip = normalizeClientIp(request.rawRequest?.ip);

  const tokenRaw = request.data?.shareToken;
  const shareToken = typeof tokenRaw === 'string' ? tokenRaw.trim() : '';
  if (!shareToken || shareToken.length > MAX_SHARE_TOKEN_LEN) {
    throw new HttpsError('invalid-argument', 'Invalid share token.');
  }

  const reasonRaw = typeof request.data?.reason === 'string' ? request.data.reason.trim() : '';
  const reason =
    reasonRaw.length > 0 ? reasonRaw.slice(0, MAX_REASON_CHARS) : 'No reason provided';

  await assertRateLimit(db, `public_erasure:ip:${ip}`, {
    maxRequests: 25,
    windowSeconds: 3600,
  });
  await assertRateLimit(db, `public_erasure:token:${shareToken}:${ip}`, {
    maxRequests: 5,
    windowSeconds: 3600,
  });

  const reportSnap = await db.collection('shared-reports').doc(shareToken).get();
  if (!reportSnap.exists) {
    throw new HttpsError('not-found', 'Report not found.');
  }

  const reportData = reportSnap.data() as Record<string, unknown>;
  const organizationId =
    typeof reportData.organizationId === 'string' ? reportData.organizationId.trim() : '';
  if (!organizationId) {
    throw new HttpsError('failed-precondition', 'Report has no organisation.');
  }

  const assessmentId =
    typeof reportData.assessmentId === 'string' ? reportData.assessmentId : null;

  const orgSnap = await db.collection('organizations').doc(organizationId).get();
  if (!orgSnap.exists) {
    throw new HttpsError('not-found', 'Organization not found.');
  }

  const payload = {
    shareToken,
    assessmentId,
    organizationId,
    reason,
    status: 'pending',
    requestedAt: admin.firestore.FieldValue.serverTimestamp(),
    schemaVersion: 1,
  };

  const docRef = await db
    .collection('organizations')
    .doc(organizationId)
    .collection('erasureRequests')
    .add(payload);

  logger.info('submitPublicErasureRequest: created', {
    organizationId,
    requestId: docRef.id,
    shareTokenLen: shareToken.length,
  });

  return { success: true, requestId: docRef.id };
}
