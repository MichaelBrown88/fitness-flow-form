import { httpsCallable } from 'firebase/functions';
import { CONFIG } from '@/config';
import { getFirebaseFunctions } from '@/services/firebase';
import { logger } from '@/lib/utils/logger';
import {
  pickRemoteBasicPrefill,
  hasRemoteBasicPrefill,
  type RemoteBasicInfoPrefill,
} from '@/lib/remote/remoteIntakePrefill';
import type {
  RemoteAssessmentScope,
  RemotePostureView,
  RemoteSessionFailReason,
  RemoteSessionResult,
} from '@/lib/types/remoteAssessment';
import { FirebaseError } from 'firebase/app';

function fns() {
  return getFirebaseFunctions();
}

export async function fetchRemoteAssessmentSession(token: string): Promise<RemoteSessionResult> {
  try {
    const fn = httpsCallable<
      { token: string },
      | { ok: true; scope: RemoteAssessmentScope; allowedKeys: string[]; prefill?: Record<string, unknown> }
      | { ok: false; reason?: RemoteSessionFailReason }
    >(fns(), 'getRemoteAssessmentSession');
    const res = await fn({ token });
    const d = res.data;
    if (!d || typeof d !== 'object') return { ok: false, reason: 'network' };
    if (d.ok === true && 'scope' in d) {
      const prefill =
        d.prefill && typeof d.prefill === 'object'
          ? pickRemoteBasicPrefill(d.prefill)
          : undefined;
      return {
        ok: true,
        scope: d.scope,
        allowedKeys: Array.isArray(d.allowedKeys) ? d.allowedKeys : [],
        ...(prefill && hasRemoteBasicPrefill(prefill) ? { prefill } : {}),
      };
    }
    const reason =
      d.ok === false && d.reason && ['invalid', 'expired', 'disabled'].includes(d.reason)
        ? d.reason
        : 'invalid';
    return { ok: false, reason };
  } catch (e) {
    logger.warn('[RemoteAssessment] session fetch failed', e);
    if (e instanceof FirebaseError && e.code === 'functions/failed-precondition') {
      return { ok: false, reason: 'disabled' };
    }
    if (e instanceof FirebaseError && e.code === 'functions/not-found') {
      return { ok: false, reason: 'invalid' };
    }
    return { ok: false, reason: 'network' };
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

/**
 * Optional intake metadata captured at client-creation time. Persisted on
 * the client doc by the Cloud Function. Currently only the contact email,
 * which the coach knows before they've assessed the client. Other fields
 * (coaching focus, starting notes) belong post-assessment when there's
 * actual signal to act on.
 */
export interface RemoteAssessmentClientIntake extends RemoteBasicInfoPrefill {}

export async function createRemoteAssessmentTokenForClient(
  organizationId: string,
  clientName: string,
  options?: { remoteScope?: RemoteAssessmentScope; intake?: RemoteAssessmentClientIntake },
): Promise<{ token: string; expiresAt: number }> {
  const fn = httpsCallable<
    {
      organizationId: string;
      clientName: string;
      remoteScope?: RemoteAssessmentScope;
      intake?: RemoteAssessmentClientIntake;
    },
    { token: string; expiresAt: number }
  >(fns(), 'createRemoteAssessmentToken');
  const res = await fn({
    organizationId,
    clientName,
    ...(options?.remoteScope ? { remoteScope: options.remoteScope } : {}),
    ...(options?.intake && Object.keys(options.intake).length > 0 ? { intake: options.intake } : {}),
  });
  return res.data;
}

export async function sendRemoteIntakeLinkEmail(params: {
  organizationId: string;
  token: string;
  to: string;
  clientName: string;
}): Promise<void> {
  const fn = httpsCallable<
    {
      organizationId: string;
      token: string;
      to: string;
      clientName: string;
    },
    { ok: true }
  >(fns(), CONFIG.AI.FUNCTIONS.EMAIL_REMOTE_INTAKE);
  await fn({
    organizationId: params.organizationId,
    token: params.token,
    to: params.to.trim(),
    clientName: params.clientName.trim(),
  });
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
