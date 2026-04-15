/**
 * Remote assessment: token doc + server-side merge into client formData.
 * Enable with REMOTE_ASSESSMENT_MVP=true in functions env.
 */

import * as admin from 'firebase-admin';
import { randomBytes, randomUUID } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';
import type { CallableRequest } from 'firebase-functions/v2/https';

export const REMOTE_ASSESSMENT_MVP = process.env.REMOTE_ASSESSMENT_MVP === 'true';

export type RemoteAssessmentScope = 'lifestyle' | 'lifestyle_posture' | 'posture' | 'full';

const BASIC_INFO_KEYS = [
  'fullName', 'email', 'phone', 'dateOfBirth', 'gender', 'heightCm',
  'trainingHistory', 'recentActivity',
] as const;

const LIFESTYLE_KEYS = new Set([
  'activityLevel', 'sleepArchetype', 'stressLevel', 'nutritionHabits',
  'hydrationHabits', 'stepsPerDay', 'sedentaryHours', 'caffeineCupsPerDay',
  'alcoholFrequency', 'medicationsFlag', 'medicationsNotes',
]);

const PARQ_KEYS = [
  'parq1', 'parq2', 'parq3', 'parq4', 'parq5', 'parq6', 'parq7',
  'parq8', 'parq9', 'parq10', 'parq11', 'parq12', 'parq13', 'parqNotes',
];

const BODY_COMP_KEYS = [
  'inbodyWeightKg', 'inbodyBodyFatPct', 'bodyFatMassKg', 'inbodyBmi',
  'visceralFatLevel', 'skeletalMuscleMassKg', 'totalBodyWaterL', 'waistHipRatio',
  'bmrKcal', 'inbodyScore', 'segmentalTrunkKg', 'segmentalArmLeftKg',
  'segmentalArmRightKg', 'segmentalLegLeftKg', 'segmentalLegRightKg',
];

/** Posture views allowed for remote upload + merge (must match companion / storage naming). */
export const REMOTE_POSTURE_VIEWS = ['front', 'side-left', 'back', 'side-right'] as const;
export type RemotePostureView = (typeof REMOTE_POSTURE_VIEWS)[number];

function normalizeName(name: string): string {
  return (name || '').trim().replace(/\s+/g, ' ');
}

function generateClientSlugFromName(clientName: string): string {
  const safeName = normalizeName(clientName) || 'unnamed-client';
  return safeName.toLowerCase().replace(/\s+/g, '-');
}

function allowedKeysForScope(scope: RemoteAssessmentScope): string[] {
  const posturePathKeys = REMOTE_POSTURE_VIEWS.map((v) => `postureRemotePath_${v}`);
  if (scope === 'lifestyle') return Array.from(LIFESTYLE_KEYS);
  if (scope === 'posture') return posturePathKeys;
  if (scope === 'lifestyle_posture') return [...Array.from(LIFESTYLE_KEYS), ...posturePathKeys];
  // 'full': all non-physical fields
  return [
    ...BASIC_INFO_KEYS,
    ...Array.from(LIFESTYLE_KEYS),
    ...PARQ_KEYS,
    ...BODY_COMP_KEYS,
    ...posturePathKeys,
  ];
}

function parseScope(raw: unknown): RemoteAssessmentScope {
  if (raw === 'lifestyle_posture' || raw === 'posture' || raw === 'lifestyle' || raw === 'full') return raw;
  return 'lifestyle';
}

export async function handleCreateRemoteAssessmentToken(
  request: CallableRequest<{
    organizationId?: string;
    clientName?: string;
    remoteScope?: RemoteAssessmentScope;
  }>,
): Promise<{ token: string; expiresAt: number }> {
  if (!REMOTE_ASSESSMENT_MVP) {
    throw new HttpsError('failed-precondition', 'Remote assessment MVP is not enabled.');
  }
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }
  const uid = request.auth.uid;
  const organizationId =
    typeof request.data?.organizationId === 'string' ? request.data.organizationId.trim() : '';
  const clientName = typeof request.data?.clientName === 'string' ? request.data.clientName.trim() : '';
  const remoteScope = parseScope(request.data?.remoteScope);

  if (!organizationId || !clientName) {
    throw new HttpsError('invalid-argument', 'organizationId and clientName are required.');
  }

  const db = admin.firestore();
  const profile = await db.doc(`userProfiles/${uid}`).get();
  const org = (profile.data() as { organizationId?: string } | undefined)?.organizationId;
  if (org !== organizationId) {
    throw new HttpsError('permission-denied', 'Organization mismatch.');
  }

  const slug = generateClientSlugFromName(clientName);
  const clientRef = db.doc(`organizations/${organizationId}/clients/${slug}`);
  const clientSnap = await clientRef.get();
  if (!clientSnap.exists) {
    // Auto-create a pending client record so remote intake data has a place to land
    await clientRef.set({
      name: normalizeName(clientName),
      coachUid: uid,
      organizationId,
      status: 'active',
      remoteIntakePending: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } else {
    const coachUid = (clientSnap.data() as { coachUid?: string } | undefined)?.coachUid;
    if (coachUid && coachUid !== uid) {
      throw new HttpsError('permission-denied', 'Not this client\'s coach.');
    }
  }

  const token = randomBytes(16).toString('hex');
  const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.doc(`remoteAssessmentTokens/${token}`).set({
    organizationId,
    clientSlug: slug,
    coachUid: uid,
    expiresAt,
    scope: remoteScope,
    allowedKeys: allowedKeysForScope(remoteScope),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { token, expiresAt: expiresAt.toMillis() };
}

export type RemoteSessionOk = {
  ok: true;
  scope: RemoteAssessmentScope;
  allowedKeys: string[];
};

export async function handleGetRemoteAssessmentSession(
  request: CallableRequest<{ token?: string }>,
): Promise<RemoteSessionOk | { ok: false }> {
  if (!REMOTE_ASSESSMENT_MVP) {
    throw new HttpsError('failed-precondition', 'Remote assessment MVP is not enabled.');
  }
  const token = typeof request.data?.token === 'string' ? request.data.token.trim() : '';
  if (!token || !/^[a-f0-9]{32}$/.test(token)) {
    return { ok: false };
  }

  const db = admin.firestore();
  const snap = await db.doc(`remoteAssessmentTokens/${token}`).get();
  if (!snap.exists) {
    return { ok: false };
  }
  const data = snap.data() as {
    expiresAt?: admin.firestore.Timestamp;
    scope?: RemoteAssessmentScope;
    allowedKeys?: string[];
  };
  const exp = data?.expiresAt;
  if (!exp || exp.toMillis() < Date.now()) {
    return { ok: false };
  }

  const scope = parseScope(data.scope);
  const allowedKeys =
    data.allowedKeys?.length ? data.allowedKeys : allowedKeysForScope(scope);

  return { ok: true, scope, allowedKeys };
}

function validateRemoteStoragePath(
  path: string,
  orgId: string,
  slug: string,
  token: string,
): boolean {
  const prefix = `organizations/${orgId}/clients/${slug}/remote-uploads/${token}/`;
  if (!path.startsWith(prefix) || path.includes('..')) return false;
  const rest = path.slice(prefix.length);
  if (!/^[a-z0-9_.-]+$/i.test(rest)) return false;
  return true;
}

async function pathsToPostureStorageMap(paths: Record<RemotePostureView, string>): Promise<Record<string, string>> {
  const bucket = admin.storage().bucket();
  const out: Record<string, string> = {};
  for (const view of REMOTE_POSTURE_VIEWS) {
    const p = paths[view];
    if (!p) continue;
    const file = bucket.file(p);
    const [exists] = await file.exists();
    if (!exists) continue;
    const [url] = await file.getSignedUrl({
      action: 'read',
      version: 'v4',
      expires: Date.now() + 1000 * 60 * 60 * 24 * 365,
    });
    out[view] = url;
  }
  return out;
}

export async function handleSubmitRemoteAssessmentFields(
  request: CallableRequest<{ token?: string; fields?: Record<string, string> }>,
): Promise<{ success: true }> {
  if (!REMOTE_ASSESSMENT_MVP) {
    throw new HttpsError('failed-precondition', 'Remote assessment MVP is not enabled.');
  }
  const token = typeof request.data?.token === 'string' ? request.data.token.trim() : '';
  const fields = request.data?.fields;
  if (!token || !/^[a-f0-9]{32}$/.test(token) || !fields || typeof fields !== 'object') {
    throw new HttpsError('invalid-argument', 'Invalid payload.');
  }

  const db = admin.firestore();
  const snap = await db.doc(`remoteAssessmentTokens/${token}`).get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Invalid or expired link.');
  }
  const meta = snap.data() as {
    organizationId?: string;
    clientSlug?: string;
    expiresAt?: admin.firestore.Timestamp;
    allowedKeys?: string[];
    scope?: RemoteAssessmentScope;
  };
  const orgId = meta.organizationId;
  const slug = meta.clientSlug;
  const exp = meta.expiresAt;
  if (!orgId || !slug || !exp || exp.toMillis() < Date.now()) {
    throw new HttpsError('not-found', 'Invalid or expired link.');
  }

  const scope = parseScope(meta.scope);
  const allowed = new Set(meta.allowedKeys?.length ? meta.allowedKeys : allowedKeysForScope(scope));
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (!allowed.has(key)) continue;
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    sanitized[key] = trimmed;
  }

  const posturePaths: Partial<Record<RemotePostureView, string>> = {};
  for (const view of REMOTE_POSTURE_VIEWS) {
    const k = `postureRemotePath_${view}`;
    const pathVal = sanitized[k];
    if (!pathVal) continue;
    if (!validateRemoteStoragePath(pathVal, orgId, slug, token)) {
      throw new HttpsError('invalid-argument', 'Invalid posture upload path.');
    }
    posturePaths[view] = pathVal;
    delete sanitized[k];
  }

  if (
    scope === 'posture' &&
    Object.keys(sanitized).length === 0 &&
    Object.keys(posturePaths).length === 0
  ) {
    throw new HttpsError('invalid-argument', 'Add at least one photo before submitting.');
  }

  const posturePatch =
    Object.keys(posturePaths).length > 0
      ? await pathsToPostureStorageMap(posturePaths as Record<RemotePostureView, string>)
      : {};

  const clientRef = db.doc(`organizations/${orgId}/clients/${slug}`);
  await db.runTransaction(async (tx) => {
    const doc = await tx.get(clientRef);
    if (!doc.exists) {
      throw new HttpsError('not-found', 'Client not found.');
    }
    const prev = doc.data() as { formData?: Record<string, unknown> };
    const prevForm = { ...(prev.formData ?? {}) } as Record<string, unknown>;

    const nextForm = { ...prevForm, ...sanitized };

    if (Object.keys(posturePatch).length > 0) {
      const existing =
        prevForm.postureImagesStorage &&
        typeof prevForm.postureImagesStorage === 'object' &&
        !Array.isArray(prevForm.postureImagesStorage)
          ? (prevForm.postureImagesStorage as Record<string, string>)
          : {};
      nextForm.postureImagesStorage = { ...existing, ...posturePatch };
      nextForm.postureInputMode = 'manual';
    }

    // Detect PAR-Q flag server-side (never submitted by client, always computed)
    const PARQ_MEDICAL_IDS = ['parq1','parq2','parq3','parq4','parq5','parq6','parq7'];
    const parqFlagged = PARQ_MEDICAL_IDS.some((k) => sanitized[k] === 'yes');

    tx.update(clientRef, {
      formData: nextForm,
      remoteIntakeAwaitingStudio: true,
      remoteIntakeLastAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(parqFlagged ? { parqFlagged: true } : {}),
    });
  });

  return { success: true };
}

export async function handleGetRemotePostureUploadUrl(
  request: CallableRequest<{
    token?: string;
    view?: string;
    contentType?: string;
  }>,
): Promise<{ uploadUrl: string; storagePath: string; expiresAt: number }> {
  if (!REMOTE_ASSESSMENT_MVP) {
    throw new HttpsError('failed-precondition', 'Remote assessment MVP is not enabled.');
  }
  const token = typeof request.data?.token === 'string' ? request.data.token.trim() : '';
  const view = typeof request.data?.view === 'string' ? request.data.view.trim() : '';
  const contentType =
    typeof request.data?.contentType === 'string' ? request.data.contentType.trim() : 'image/jpeg';

  if (!token || !/^[a-f0-9]{32}$/.test(token)) {
    throw new HttpsError('invalid-argument', 'Invalid token.');
  }
  if (!REMOTE_POSTURE_VIEWS.includes(view as RemotePostureView)) {
    throw new HttpsError('invalid-argument', 'Invalid view.');
  }
  if (contentType !== 'image/jpeg' && contentType !== 'image/png') {
    throw new HttpsError('invalid-argument', 'Only image/jpeg and image/png are allowed.');
  }

  const db = admin.firestore();
  const snap = await db.doc(`remoteAssessmentTokens/${token}`).get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Invalid or expired link.');
  }
  const meta = snap.data() as {
    organizationId?: string;
    clientSlug?: string;
    expiresAt?: admin.firestore.Timestamp;
    scope?: RemoteAssessmentScope;
  };
  const orgId = meta.organizationId;
  const slug = meta.clientSlug;
  const exp = meta.expiresAt;
  if (!orgId || !slug || !exp || exp.toMillis() < Date.now()) {
    throw new HttpsError('not-found', 'Invalid or expired link.');
  }

  const scope = parseScope(meta.scope);
  if (scope === 'lifestyle') {
    throw new HttpsError('failed-precondition', 'This link does not include posture uploads.');
  }

  const ext = contentType === 'image/png' ? 'png' : 'jpg';
  const objectName = `${view}_${randomUUID()}.${ext}`;
  const storagePath = `organizations/${orgId}/clients/${slug}/remote-uploads/${token}/${objectName}`;

  const bucket = admin.storage().bucket();
  const file = bucket.file(storagePath);
  const expiresWrite = Date.now() + 15 * 60 * 1000;
  const [uploadUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: expiresWrite,
    contentType,
  });

  return { uploadUrl, storagePath, expiresAt: expiresWrite };
}
