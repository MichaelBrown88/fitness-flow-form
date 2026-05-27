/**
 * Converts client-upload HEIC/HEIF to JPEG server-side when browser WASM decoders fail
 * (e.g. ERR_LIBHEIF format not supported for some iPhone variants).
 */

import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import type { CallableRequest } from 'firebase-functions/v2/https';
import sharp from 'sharp';
import { assertRateLimit, buildRateLimitKey } from './rateLimit';

interface ConvertHeicRequest {
  /** Raw file bytes, base64-encoded (no data-URL prefix). */
  base64: string;
  fileName?: string;
}

interface ConvertHeicResponse {
  jpegBase64: string;
}

const MAX_BYTES = 12 * 1024 * 1024;

export async function handleConvertClientUploadHeic(
  req: CallableRequest<ConvertHeicRequest>,
): Promise<ConvertHeicResponse> {
  const uid = req.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const { base64, fileName } = req.data ?? ({} as ConvertHeicRequest);
  if (!base64 || typeof base64 !== 'string') {
    throw new HttpsError('invalid-argument', 'base64 is required.');
  }

  const db = admin.firestore();
  await assertRateLimit(
    db,
    buildRateLimitKey('convertClientUploadHeic', uid),
    { maxRequests: 30, windowSeconds: 60 },
  );

  let input: Buffer;
  try {
    input = Buffer.from(base64, 'base64');
  } catch {
    throw new HttpsError('invalid-argument', 'Invalid base64 payload.');
  }

  if (input.length === 0) {
    throw new HttpsError('invalid-argument', 'Empty image payload.');
  }
  if (input.length > MAX_BYTES) {
    throw new HttpsError(
      'failed-precondition',
      `Image too large (${input.length} bytes, max ${MAX_BYTES}). Export a smaller JPEG from Photos.`,
    );
  }

  try {
    const jpeg = await sharp(input, { failOn: 'none' })
      .rotate()
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();

    if (jpeg.length === 0) {
      throw new HttpsError('invalid-argument', 'Could not decode image.');
    }

    return { jpegBase64: jpeg.toString('base64') };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Decode failed';
    throw new HttpsError(
      'invalid-argument',
      `Could not convert ${fileName ?? 'HEIC'}: ${message}. Export as JPEG from Photos and try again.`,
    );
  }
}
