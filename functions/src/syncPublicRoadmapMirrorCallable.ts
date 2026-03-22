import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import type { CallableRequest } from 'firebase-functions/v2/https';

/** Roadmap-only share links from `generateShareToken()` in `src/services/roadmaps.ts` (12 bytes → 24 hex). */
const ROADMAP_SHARE_TOKEN_HEX = /^[a-f0-9]{24}$/;
/** Public report doc IDs from `crypto.randomUUID()` — used when clients open `/r/{reportToken}/roadmap`. */
const PUBLIC_REPORT_DOC_ID_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Mirrors `normalizeClientName` / `generateClientSlug` in `src/services/clientProfiles.ts` (callable cannot import app src). */
function normalizeClientName(name: string): string {
  return (name || '').trim().replace(/\s+/g, ' ');
}

function generateClientSlugFromName(clientName: string): string {
  const safeName = normalizeClientName(clientName) || 'unnamed-client';
  return safeName.toLowerCase().replace(/\s+/g, '-');
}

export interface SyncPublicRoadmapMirrorResponse {
  clientSlug: string;
  clientName: string;
  summary: string;
  items: unknown[];
  activePhase?: unknown;
  clientGoals: unknown[];
  coachUid: string;
  organizationId: string;
  assessmentId: string;
}

function buildMirrorPayload(
  data: admin.firestore.DocumentData,
  clientSlug: string,
  reportEnrichment?: admin.firestore.DocumentData,
): {
  mirror: Record<string, unknown>;
  coachUid: string;
  organizationId: string;
  assessmentId: string;
} {
  let coachUid = typeof data.coachUid === 'string' ? data.coachUid.trim() : '';
  let organizationId = typeof data.organizationId === 'string' ? data.organizationId.trim() : '';
  let assessmentId = typeof data.assessmentId === 'string' ? data.assessmentId.trim() : '';

  if (reportEnrichment) {
    if (!coachUid && typeof reportEnrichment.coachUid === 'string') {
      coachUid = reportEnrichment.coachUid.trim();
    }
    if (!organizationId && typeof reportEnrichment.organizationId === 'string') {
      organizationId = reportEnrichment.organizationId.trim();
    }
    if (!assessmentId && typeof reportEnrichment.assessmentId === 'string') {
      assessmentId = reportEnrichment.assessmentId.trim();
    }
  }

  if (!coachUid || !organizationId) {
    throw new HttpsError('failed-precondition', 'Roadmap data is incomplete.');
  }

  const displayName =
    typeof data.clientName === 'string' && data.clientName.trim()
      ? data.clientName.trim()
      : typeof reportEnrichment?.clientName === 'string' && reportEnrichment.clientName.trim()
        ? String(reportEnrichment.clientName).trim()
        : 'Client';

  const mirror: Record<string, unknown> = {
    clientSlug,
    clientName: displayName,
    summary: typeof data.summary === 'string' ? data.summary : '',
    items: Array.isArray(data.items) ? data.items : [],
    clientGoals: Array.isArray(data.clientGoals) ? data.clientGoals : [],
    coachUid,
    organizationId,
    assessmentId,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (data.activePhase != null) {
    mirror.activePhase = data.activePhase;
  }
  return { mirror, coachUid, organizationId, assessmentId };
}

/**
 * Public callable: ensure `publicRoadmaps/{urlToken}` exists and return display fields.
 * Supports (1) roadmap hex shareToken, (2) public report UUID when the app uses `/r/{reportToken}/roadmap`.
 */
export async function handleSyncPublicRoadmapMirror(
  request: CallableRequest<{ shareToken?: string }>,
): Promise<SyncPublicRoadmapMirrorResponse> {
  const db = admin.firestore();
  const raw =
    typeof request.data?.shareToken === 'string' ? request.data.shareToken.trim() : '';

  if (!raw) {
    throw new HttpsError('invalid-argument', 'shareToken is required.');
  }

  const tokenLower = raw.toLowerCase();
  const isHex = ROADMAP_SHARE_TOKEN_HEX.test(tokenLower);
  const isUuid = PUBLIC_REPORT_DOC_ID_UUID.test(raw);
  if (!isHex && !isUuid) {
    throw new HttpsError('invalid-argument', 'Invalid share token.');
  }

  /** Canonical id for `publicRoadmaps/{id}` — always lowercase so client cache reads match. */
  const mirrorDocId = tokenLower;

  let data: admin.firestore.DocumentData;
  let clientSlug: string;
  let reportForMirror: admin.firestore.DocumentData | undefined;

  if (isHex) {
    const querySnap = await db
      .collectionGroup('roadmap')
      .where('shareToken', '==', tokenLower)
      .limit(1)
      .get();

    if (querySnap.empty) {
      throw new HttpsError('not-found', 'Roadmap not found.');
    }

    const docSnap = querySnap.docs[0];
    data = docSnap.data();
    const parent = docSnap.ref.parent.parent;
    const slug = parent?.id;
    if (!slug) {
      throw new HttpsError('failed-precondition', 'Invalid roadmap document path.');
    }
    clientSlug = slug;
  } else {
    // Firestore document IDs are case-sensitive; URLs may not match stored id casing.
    const reportIdVariants = [...new Set([raw, tokenLower, raw.toUpperCase()])];
    let reportSnap: admin.firestore.DocumentSnapshot | null = null;
    for (const id of reportIdVariants) {
      const snap = await db.doc(`publicReports/${id}`).get();
      if (snap.exists) {
        reportSnap = snap;
        break;
      }
    }
    if (!reportSnap?.exists) {
      throw new HttpsError('not-found', 'Roadmap not found.');
    }
    const report = reportSnap.data()!;
    const reportDocId = reportSnap.ref.id;
    reportForMirror = report;
    if (report.visibility != null && report.visibility !== 'public') {
      throw new HttpsError('not-found', 'Roadmap not found.');
    }
    const organizationId = typeof report.organizationId === 'string' ? report.organizationId : '';
    if (!organizationId) {
      throw new HttpsError('not-found', 'Roadmap not found.');
    }

    const clientsCol = db.collection(`organizations/${organizationId}/clients`);
    const roadmapPath = (clientDocId: string) =>
      `organizations/${organizationId}/clients/${clientDocId}/roadmap/plan`;

    const assessmentIdFromReport =
      typeof report.assessmentId === 'string' ? report.assessmentId.trim() : '';

    let resolvedClientId = '';
    let roadmapSnap: admin.firestore.DocumentSnapshot | null = null;

    if (assessmentIdFromReport) {
      resolvedClientId = assessmentIdFromReport;
      roadmapSnap = await db.doc(roadmapPath(resolvedClientId)).get();
    }

    // `assessmentId` on publicReports can be stale (e.g. legacy client UUID after migration to slug doc ids).
    // Current-state assessments always live at `clients/{slug}/...` where slug matches `formData.fullName`.
    if (!roadmapSnap?.exists) {
      const formDataRaw = report.formData as admin.firestore.DocumentData | undefined;
      const fullNameFromForm =
        formDataRaw && typeof formDataRaw.fullName === 'string'
          ? normalizeClientName(String(formDataRaw.fullName))
          : '';
      const slugFromFormData = fullNameFromForm ? generateClientSlugFromName(fullNameFromForm) : '';
      if (slugFromFormData && slugFromFormData !== resolvedClientId) {
        const snap = await db.doc(roadmapPath(slugFromFormData)).get();
        if (snap.exists) {
          resolvedClientId = slugFromFormData;
          roadmapSnap = snap;
        }
      }
    }

    // `publicReports/{token}` doc id equals the client's profile `shareToken` when assessments sync the profile.
    if (!roadmapSnap?.exists) {
      const shareLookupIds = [...new Set([tokenLower, raw, reportDocId, raw.toUpperCase()])];
      for (const st of shareLookupIds) {
        const byShare = await clientsCol.where('shareToken', '==', st).limit(1).get();
        if (!byShare.empty) {
          resolvedClientId = byShare.docs[0].id;
          roadmapSnap = await db.doc(roadmapPath(resolvedClientId)).get();
          break;
        }
      }
    }

    if (!roadmapSnap?.exists) {
      const nameLower =
        typeof report.clientNameLower === 'string'
          ? report.clientNameLower.trim().toLowerCase()
          : typeof report.clientName === 'string'
            ? report.clientName.trim().toLowerCase()
            : '';
      if (nameLower) {
        const byNameLower = await clientsCol.where('clientNameLower', '==', nameLower).limit(2).get();
        if (byNameLower.size === 1) {
          resolvedClientId = byNameLower.docs[0].id;
          roadmapSnap = await db.doc(roadmapPath(resolvedClientId)).get();
        }
      }
    }

    const displayNameRaw = typeof report.clientName === 'string' ? report.clientName : '';
    const normalizedReportName = displayNameRaw ? normalizeClientName(displayNameRaw) : '';
    const slugFromReportName = normalizedReportName
      ? generateClientSlugFromName(normalizedReportName)
      : '';

    // UUID-keyed profiles: slug → clientId via clientLookup (see createOrUpdateClientProfile).
    if (!roadmapSnap?.exists && slugFromReportName) {
      const lookupSnap = await db
        .doc(`organizations/${organizationId}/clientLookup/${slugFromReportName}`)
        .get();
      if (lookupSnap.exists) {
        const lu = lookupSnap.data() as { clientId?: unknown };
        const lookupClientId = typeof lu.clientId === 'string' ? lu.clientId.trim() : '';
        if (lookupClientId) {
          resolvedClientId = lookupClientId;
          roadmapSnap = await db.doc(roadmapPath(resolvedClientId)).get();
        }
      }
    }

    // UUID client docs store the name-based slug here when created via createOrUpdateClientProfile.
    if (!roadmapSnap?.exists && slugFromReportName) {
      const byLegacySlug = await clientsCol.where('legacySlug', '==', slugFromReportName).limit(2).get();
      if (byLegacySlug.size === 1) {
        resolvedClientId = byLegacySlug.docs[0].id;
        roadmapSnap = await db.doc(roadmapPath(resolvedClientId)).get();
      }
    }

    // Profiles often omit clientNameLower; exact clientName matches createOrUpdateClientProfile writes.
    if (!roadmapSnap?.exists && normalizedReportName) {
      const byClientName = await clientsCol.where('clientName', '==', normalizedReportName).limit(2).get();
      if (byClientName.size === 1) {
        resolvedClientId = byClientName.docs[0].id;
        roadmapSnap = await db.doc(roadmapPath(resolvedClientId)).get();
      }
    }

    // Legacy slug document IDs under clients/{slug}.
    if (!roadmapSnap?.exists && slugFromReportName && slugFromReportName !== resolvedClientId) {
      resolvedClientId = slugFromReportName;
      roadmapSnap = await db.doc(roadmapPath(resolvedClientId)).get();
    }

    if (!roadmapSnap?.exists || !resolvedClientId) {
      throw new HttpsError('not-found', 'Roadmap not found.');
    }
    data = roadmapSnap.data()!;
    clientSlug = resolvedClientId;
  }

  const { mirror, coachUid, organizationId, assessmentId } = buildMirrorPayload(
    data,
    clientSlug,
    reportForMirror,
  );

  await db.collection('publicRoadmaps').doc(mirrorDocId).set(mirror, { merge: true });

  return {
    clientSlug,
    clientName: mirror.clientName as string,
    summary: mirror.summary as string,
    items: mirror.items as unknown[],
    activePhase: data.activePhase,
    clientGoals: mirror.clientGoals as unknown[],
    coachUid,
    organizationId,
    assessmentId,
  };
}
