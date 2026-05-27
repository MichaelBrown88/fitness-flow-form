/**
 * Server-side proxy for reading a posture image's bytes when the client
 * environment lacks CORS configuration on the Storage bucket.
 *
 * The browser can DISPLAY a Firebase Storage image (CORS-exempt for `<img>`)
 * but reading the bytes back via the Storage SDK requires CORS headers that
 * the bucket doesn't emit by default. This callable runs server-side with
 * admin credentials, downloads the bytes, and returns them as base64 so the
 * client can feed them into the posture analyzer.
 *
 * Auth: any authenticated coach in the org that owns the storage path.
 * Input: { storagePath } — the path inside the Storage bucket
 *   (e.g. "organizations/{orgId}/clients/.../sessions/.../front_full.jpg")
 */

import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import type { CallableRequest } from 'firebase-functions/v2/https';

interface FetchImageRequest {
  storagePath: string;
}

interface FetchImageResponse {
  base64: string;
  contentType: string;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB — defensive cap

export async function handleFetchSnapshotImageBytes(
  req: CallableRequest<FetchImageRequest>,
): Promise<FetchImageResponse> {
  const uid = req.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const { storagePath } = req.data ?? ({} as FetchImageRequest);
  if (!storagePath || typeof storagePath !== 'string') {
    throw new HttpsError('invalid-argument', 'storagePath is required.');
  }
  if (!storagePath.startsWith('organizations/')) {
    throw new HttpsError('invalid-argument', 'storagePath must start with "organizations/".');
  }

  // Extract orgId from the path and verify caller is a coach there.
  // Path shape: organizations/{orgId}/clients/{slug}/sessions/{sessionId}/{view}_full.jpg
  const parts = storagePath.split('/');
  const orgId = parts[1];
  if (!orgId) {
    throw new HttpsError('invalid-argument', 'Could not parse orgId from storagePath.');
  }

  const coachSnap = await admin
    .firestore()
    .doc(`organizations/${orgId}/coaches/${uid}`)
    .get();
  if (!coachSnap.exists) {
    throw new HttpsError('permission-denied', 'Not a coach in this organisation.');
  }

  // Download bytes via admin Storage SDK (server-side, bypasses CORS)
  const file = admin.storage().bucket().file(storagePath);
  const [exists] = await file.exists();
  if (!exists) {
    throw new HttpsError('not-found', `File not found at ${storagePath}`);
  }

  const [metadata] = await file.getMetadata();
  const size = Number(metadata.size ?? 0);
  if (size > MAX_IMAGE_BYTES) {
    throw new HttpsError('failed-precondition', `Image too large (${size} bytes, max ${MAX_IMAGE_BYTES}).`);
  }

  const [buffer] = await file.download();
  const base64 = buffer.toString('base64');
  const contentType = (metadata.contentType as string | undefined) ?? 'image/jpeg';

  return { base64, contentType };
}
