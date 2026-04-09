/**
 * GDPR Article 17 — Right to Erasure
 *
 * Callable by org admins only. Permanently deletes a client's personal data
 * and marks the corresponding erasure request as completed.
 *
 * What is deleted:
 *   organizations/{orgId}/clients/{clientSlug}  + all subcollections
 *   publicReports/{shareToken}                  + all subcollections
 *   publicRoadmaps/* where assessmentId == clientSlug && organizationId == orgId
 *
 * What is retained (compliance records):
 *   organizations/{orgId}/erasureRequests/{requestId}  — updated to status:'completed'
 *   ai_usage_logs — anonymised cost records, no PII
 */

import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import type { CallableRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';

const CLIENT_SUBCOLLECTIONS = [
  'current',
  'sessions',
  'roadmap',
  'achievements',
  'assessmentDrafts',
  'consents',
];

const PUBLIC_REPORT_SUBCOLLECTIONS = [
  'snapshots',
  'achievements',
  'notifications',
  'lifestyleCheckins',
  'preSessionCheckins',
];

function db() {
  return admin.firestore();
}

/** Delete all docs in a collection reference in batches of 500. */
async function deleteCollection(ref: admin.firestore.CollectionReference): Promise<number> {
  let total = 0;
  let snap = await ref.limit(500).get();
  while (!snap.empty) {
    const batch = db().batch();
    snap.docs.forEach((d) => { batch.delete(d.ref); total++; });
    await batch.commit();
    snap = await ref.limit(500).get();
  }
  return total;
}

async function assertOrgAdmin(uid: string, orgId: string): Promise<void> {
  const coachSnap = await db()
    .doc(`organizations/${orgId}/coaches/${uid}`)
    .get();
  if (!coachSnap.exists) {
    throw new HttpsError('permission-denied', 'Not a member of this organization.');
  }
  const role = coachSnap.data()?.role as string | undefined;
  if (!['org_admin', 'admin', 'owner'].includes(role ?? '')) {
    throw new HttpsError('permission-denied', 'Organization admin role required.');
  }
}

export interface ExecuteClientErasureRequest {
  orgId: string;
  erasureRequestId: string;
}

export interface ExecuteClientErasureResponse {
  success: true;
  deletedDocs: number;
}

export async function handleExecuteClientErasure(
  request: CallableRequest<ExecuteClientErasureRequest>,
): Promise<ExecuteClientErasureResponse> {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const { orgId, erasureRequestId } = request.data ?? {};
  if (!orgId || typeof orgId !== 'string' || !erasureRequestId || typeof erasureRequestId !== 'string') {
    throw new HttpsError('invalid-argument', 'orgId and erasureRequestId are required.');
  }

  await assertOrgAdmin(request.auth.uid, orgId);

  // Load the erasure request
  const erasureRef = db().doc(`organizations/${orgId}/erasureRequests/${erasureRequestId}`);
  const erasureSnap = await erasureRef.get();
  if (!erasureSnap.exists) {
    throw new HttpsError('not-found', 'Erasure request not found.');
  }
  const erasureData = erasureSnap.data() as Record<string, unknown>;
  if (erasureData.status === 'completed') {
    throw new HttpsError('already-exists', 'This erasure request has already been completed.');
  }

  const shareToken = typeof erasureData.shareToken === 'string' ? erasureData.shareToken.trim() : '';
  const clientSlug  = typeof erasureData.assessmentId === 'string' ? erasureData.assessmentId.trim() : '';

  if (!shareToken && !clientSlug) {
    throw new HttpsError('failed-precondition', 'Erasure request is missing both shareToken and assessmentId.');
  }

  let totalDeleted = 0;

  // ── 1. Delete client subcollections + client doc ──────────────────────────
  if (clientSlug) {
    const clientRef = db().doc(`organizations/${orgId}/clients/${clientSlug}`);
    const clientSnap = await clientRef.get();

    if (clientSnap.exists) {
      for (const sub of CLIENT_SUBCOLLECTIONS) {
        try {
          totalDeleted += await deleteCollection(clientRef.collection(sub));
        } catch (err) {
          logger.warn(`executeClientErasure: failed to delete subcollection ${sub}`, { err });
        }
      }
      await clientRef.delete();
      totalDeleted++;
      logger.info('executeClientErasure: deleted client doc', { orgId, clientSlug });
    } else {
      logger.info('executeClientErasure: client doc not found (may have been deleted already)', { orgId, clientSlug });
    }
  }

  // ── 2. Delete publicReport subcollections + report doc ───────────────────
  if (shareToken) {
    const reportRef = db().doc(`publicReports/${shareToken}`);
    const reportSnap = await reportRef.get();

    if (reportSnap.exists) {
      for (const sub of PUBLIC_REPORT_SUBCOLLECTIONS) {
        try {
          totalDeleted += await deleteCollection(reportRef.collection(sub));
        } catch (err) {
          logger.warn(`executeClientErasure: failed to delete publicReport subcollection ${sub}`, { err });
        }
      }
      await reportRef.delete();
      totalDeleted++;
      logger.info('executeClientErasure: deleted publicReport', { shareToken });
    }
  }

  // ── 3. Delete any publicRoadmaps linked to this client ───────────────────
  if (clientSlug) {
    try {
      const roadmapsSnap = await db()
        .collection('publicRoadmaps')
        .where('assessmentId', '==', clientSlug)
        .where('organizationId', '==', orgId)
        .get();

      for (const roadmapDoc of roadmapsSnap.docs) {
        await roadmapDoc.ref.delete();
        totalDeleted++;
      }
      if (roadmapsSnap.size > 0) {
        logger.info('executeClientErasure: deleted publicRoadmaps', { count: roadmapsSnap.size, clientSlug });
      }
    } catch (err) {
      logger.warn('executeClientErasure: failed to delete publicRoadmaps', { err });
    }
  }

  // ── 4. Mark erasure request completed ────────────────────────────────────
  await erasureRef.update({
    status: 'completed',
    actionedAt: admin.firestore.FieldValue.serverTimestamp(),
    actionedBy: request.auth.uid,
    deletedDocs: totalDeleted,
  });

  logger.info('executeClientErasure: completed', {
    orgId,
    erasureRequestId,
    clientSlug,
    shareToken: shareToken ? `${shareToken.slice(0, 8)}…` : '(none)',
    totalDeleted,
    actionedBy: request.auth.uid,
  });

  return { success: true, deletedDocs: totalDeleted };
}
