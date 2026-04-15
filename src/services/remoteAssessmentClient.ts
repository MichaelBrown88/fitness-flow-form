import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '@/services/firebase';
import { logger } from '@/lib/utils/logger';
import type { RemoteAssessmentScope, RemotePostureView, RemoteSessionResult } from '@/lib/types/remoteAssessment';

function fns() {
  return getFirebaseFunctions();
}

export async function fetchRemoteAssessmentSession(token: string): Promise<RemoteSessionResult> {
  try {
    const fn = httpsCallable<
      { token: string },
      { ok: true; scope: RemoteAssessmentScope; allowedKeys: string[] } | { ok: false }
    >(fns(), 'getRemoteAssessmentSession');
    const res = await fn({ token });
    const d = res.data;
    if (!d || typeof d !== 'object') return { ok: false };
    if (d.ok === true && 'scope' in d) {
      return {
        ok: true,
        scope: d.scope,
        allowedKeys: Array.isArray(d.allowedKeys) ? d.allowedKeys : [],
      };
    }
    return { ok: false };
  } catch (e) {
    logger.warn('[RemoteAssessment] session fetch failed', e);
    return { ok: false };
  }
}

export async function validateRemoteAssessmentToken(token: string): Promise<boolean> {
  const s = await fetchRemoteAssessmentSession(token);
  return s.ok === true;
}

export async function submitRemoteAssessmentFields(
  token: string,
  fields: Record<string, string>,
): Promise<void> {
  const fn = httpsCallable<{ token: string; fields: Record<string, string> }, { success: boolean }>(
    fns(),
    'submitRemoteAssessmentFields',
  );
  await fn({ token, fields });
}

export async function createRemoteAssessmentTokenForClient(
  organizationId: string,
  clientName: string,
  options?: { remoteScope?: RemoteAssessmentScope },
): Promise<{ token: string; expiresAt: number }> {
  const fn = httpsCallable<
    { organizationId: string; clientName: string; remoteScope?: RemoteAssessmentScope },
    { token: string; expiresAt: number }
  >(fns(), 'createRemoteAssessmentToken');
  const res = await fn({
    organizationId,
    clientName,
    ...(options?.remoteScope ? { remoteScope: options.remoteScope } : {}),
  });
  return res.data;
}

export async function getRemotePostureUploadSlot(
  token: string,
  view: RemotePostureView,
  contentType: 'image/jpeg' | 'image/png',
): Promise<{ uploadUrl: string; storagePath: string; expiresAt: number }> {
  const fn = httpsCallable<
    { token: string; view: string; contentType: string },
    { uploadUrl: string; storagePath: string; expiresAt: number }
  >(fns(), 'getRemotePostureUploadUrl');
  const res = await fn({ token, view, contentType });
  return res.data;
}

export async function uploadBlobToSignedUrl(
  uploadUrl: string,
  blob: Blob,
  contentType: string,
): Promise<void> {
  const put = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  });
  if (!put.ok) {
    throw new Error(`Upload failed (${put.status})`);
  }
}

export async function getRemoteBodyCompUploadSlot(
  token: string,
  contentType: 'image/jpeg' | 'image/png',
): Promise<{ uploadUrl: string; storagePath: string; expiresAt: number }> {
  const fn = httpsCallable<
    { token: string; contentType: string },
    { uploadUrl: string; storagePath: string; expiresAt: number }
  >(fns(), 'getRemoteBodyCompUploadUrl');
  const res = await fn({ token, contentType });
  return res.data;
}

export async function extractBodyCompOcrFromStorage(
  token: string,
  storagePath: string,
): Promise<{ fields: Record<string, string> }> {
  const fn = httpsCallable<
    { token: string; storagePath: string },
    { fields: Record<string, string> }
  >(fns(), 'extractRemoteBodyCompOcr');
  const res = await fn({ token, storagePath });
  return res.data;
}
