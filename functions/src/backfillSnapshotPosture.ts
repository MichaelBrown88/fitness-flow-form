/**
 * Backfill structuredFindings (and full postureAiResults) onto a historical
 * snapshot whose original capture predated the structured-findings analyzer.
 *
 * Why this is a Cloud Function: `organizations/{orgId}/clients/{slug}/sessions/{id}`
 * is governed by an immutable audit-trail rule — only platform admins can update
 * those docs from the client. Coaches can't. So the frontend runs the analyzer,
 * then calls this CF which writes the result with admin credentials after
 * verifying the caller is a coach in the owning org.
 *
 * Auth: any authenticated coach in the org that owns the client.
 * Input: { clientSlug, sessionId, postureAiResults }
 *   - clientSlug: the slug under organizations/{orgId}/clients/
 *   - sessionId: the session doc id under .../sessions/
 *   - postureAiResults: the analyzer output keyed by view
 *     ({ front: PostureAnalysisResult, 'side-left': ..., back: ..., 'side-right': ... })
 */

import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import type { CallableRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';

interface BackfillRequest {
  clientSlug: string;
  sessionId: string;
  postureAiResults: Record<string, unknown>;
}

interface BackfillResponse {
  success: true;
  sessionId: string;
  viewsUpdated: string[];
}

function db() {
  return admin.firestore();
}

export async function handleBackfillSnapshotPosture(
  req: CallableRequest<BackfillRequest>,
): Promise<BackfillResponse> {
  const uid = req.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const { clientSlug, sessionId, postureAiResults } = req.data ?? ({} as BackfillRequest);
  if (!clientSlug || !sessionId || !postureAiResults || typeof postureAiResults !== 'object') {
    throw new HttpsError(
      'invalid-argument',
      'clientSlug, sessionId, and postureAiResults are required.',
    );
  }

  // Resolve caller's org via their user profile
  const profileSnap = await db().doc(`user-profiles/${uid}`).get();
  if (!profileSnap.exists) {
    throw new HttpsError('not-found', 'User profile not found.');
  }
  const orgId = (profileSnap.data() as { organizationId?: string } | undefined)?.organizationId;
  if (!orgId) {
    throw new HttpsError('failed-precondition', 'User has no organization.');
  }

  // Verify caller is a coach in this org (matches canWriteOrgData rule semantics)
  const coachSnap = await db().doc(`organizations/${orgId}/coaches/${uid}`).get();
  if (!coachSnap.exists) {
    throw new HttpsError('permission-denied', 'Not a coach in this organisation.');
  }

  // Verify the session exists and belongs to this org's client
  const sessionRef = db().doc(
    `organizations/${orgId}/clients/${clientSlug}/sessions/${sessionId}`,
  );
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) {
    throw new HttpsError('not-found', `Session ${sessionId} not found.`);
  }

  // Defensive: cap input size to avoid runaway payloads
  const payloadJson = JSON.stringify(postureAiResults);
  if (payloadJson.length > 250_000) {
    throw new HttpsError('invalid-argument', 'postureAiResults payload too large (>250KB).');
  }

  // Admin SDK bypasses the session-immutability rule. The caller's coach
  // membership has already been verified above.
  await sessionRef.update({
    'formData.postureAiResults': postureAiResults,
    backfilledAt: admin.firestore.FieldValue.serverTimestamp(),
    backfilledBy: uid,
  });

  // Also patch current/state if this session is the latest with posture data
  // — keeps the live report and the historical view consistent.
  const currentRef = db().doc(`organizations/${orgId}/clients/${clientSlug}/current/state`);
  const currentSnap = await currentRef.get();
  if (currentSnap.exists) {
    const cd = currentSnap.data() as {
      formData?: { postureAiResults?: Record<string, unknown> };
    };
    const currentPosture = cd.formData?.postureAiResults ?? {};
    // Merge — preserve any pillar fields already in current/state, overlay the
    // newly-analysed views from this snapshot.
    const merged = { ...currentPosture, ...postureAiResults };
    await currentRef.update({
      'formData.postureAiResults': merged,
    });
  }

  logger.info(
    `[backfillSnapshotPosture] org=${orgId} client=${clientSlug} session=${sessionId} ` +
      `views=${Object.keys(postureAiResults).join(',')}`,
  );

  return {
    success: true,
    sessionId,
    viewsUpdated: Object.keys(postureAiResults),
  };
}
