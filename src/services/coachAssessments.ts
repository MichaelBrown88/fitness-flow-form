import { collection, serverTimestamp, getDocs, query, orderBy, limit, doc, getDoc, deleteDoc, where, setDoc, updateDoc, type DocumentReference } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import type { FormData } from '@/contexts/FormContext';
import { getDb } from '@/services/firebase';
import { summarizeScores } from '@/lib/scoring';
import { validateOrganizationId } from '@/lib/utils/validateOrganizationId';
import type { UserProfile } from '@/types/auth';
import { COLLECTIONS } from '@/constants/collections';
import { ORGANIZATION } from '@/lib/database/paths';
import { generateClientSlug } from '@/services/clientProfiles';
import { sanitizeForFirestore } from '@/lib/utils/firebaseUtils';
import { logger } from '@/lib/utils/logger';

const MAX_ASSESSMENTS_LIMIT = 200;
const MAX_CLIENT_ASSESSMENTS_LIMIT = 200;
const MAX_CLIENT_LIST_LIMIT = 500;

/**
 * Extract overall score from assessment data
 * Handles both legacy (overallScore) and migrated (scores.overall) formats
 */
function extractOverallScore(data: { overallScore?: number; scores?: { overall?: number } }): number {
  if (typeof data.overallScore === 'number') {
    return data.overallScore;
  }
  return data.scores?.overall ?? 0;
}

export type CoachAssessmentSummary = {
  id: string;
  clientName: string;
  createdAt: Timestamp | null;
  /** Last partial/full assessment update timestamp (for dashboard "last activity") */
  updatedAt?: Timestamp | null;
  overallScore: number;
  goals: string[];
  /** Previous assessment score (for trend calculation) */
  previousScore?: number;
  /** Pre-computed trend (overallScore - previousScore) */
  trend?: number;
  /** Total assessments for this client (incremented on each upsert) */
  assessmentCount?: number;
  /** UID of the coach who owns this client (used in team/admin views) */
  coachUid?: string | null;
  /** Client finished remote-friendly steps; coach-only phases may remain */
  remoteIntakeAwaitingStudio?: boolean;
  /** Coach sent pre-assessment link; client has not submitted yet */
  remoteIntakePending?: boolean;
  /** Client profile account status (from organizations/.../clients doc) */
  clientStatus?: 'active' | 'inactive' | 'paused' | 'archived' | 'deleted';
  assessmentType?: 'full' | 'pillar';
  isPartial?: boolean;
  scoresSummary?: {
    overall: number;
    fullProfileScore: number | null;
    categories: {
      id: string;
      score: number;
      assessed: boolean;
      weaknesses: string[];
    }[];
  };
};

type CoachAssessmentDoc = {
  clientName: string;
  clientNameLower: string;
  createdAt: Timestamp;
  coachUid: string;
  coachEmail?: string | null;
  overallScore: number;
  goals: string[];
  formData: FormData;
  organizationId?: string | null;
  isSummary?: boolean;
  /** @deprecated Use assessmentType instead */
  isPartial?: boolean;
  /** Semantic type: 'full' for a complete assessment, 'pillar' for a single-category session */
  assessmentType?: 'full' | 'pillar';
  /** Which pillar was assessed (only set when assessmentType === 'pillar') */
  pillar?: string;
  category?: string;
  scoresSummary?: CoachAssessmentSummary['scoresSummary'];
  remoteIntakeAwaitingStudio?: boolean;
};

const orgClientsCollection = (orgId: string) =>
  collection(getDb(), ORGANIZATION.clients.collection(orgId));

async function resolveOrganizationId(
  coachUid: string,
  organizationId?: string
): Promise<string> {
  if (organizationId) return organizationId;
  const profileSnap = await getDoc(doc(getDb(), COLLECTIONS.USER_PROFILES, coachUid));
  const profileData = profileSnap.data() as UserProfile | undefined;
  if (profileData?.organizationId) return profileData.organizationId;
  throw new Error('Organization ID is required for assessment access.');
}


export type SaveResult = {
  assessmentId: string;
  shareToken: string | null;
  /** False when publishPublicReport failed — client report link may be stale */
  publicReportSynced: boolean;
};

/**
 * Save an incomplete assessment as draft only. Does not update live report or create snapshot.
 * Used when coach clicks "Save for Later". Dashboard can check getDraftAssessment to show "Finish assessment" CTA.
 */
export type SaveDraftAssessmentOptions = {
  /** Persisted for cross-device resume (see `useAssessmentFirestoreDraftSync`). */
  activePhaseIdx?: number;
  /** Phase id (e.g. 'P3') — preferred over the positional index on resume so phase reorders stay safe. */
  activePhaseId?: string;
};

export async function saveDraftAssessment(
  clientName: string,
  formData: FormData,
  organizationId: string,
  options?: SaveDraftAssessmentOptions,
): Promise<void> {
  const slug = generateClientSlug(clientName);
  const draftRef = doc(getDb(), ORGANIZATION.clients.draft(organizationId, slug));
  const payload: Record<string, unknown> = {
    clientName: clientName.trim(),
    formData: sanitizeForFirestore(formData),
    updatedAt: serverTimestamp(),
    organizationId,
  };
  if (options?.activePhaseIdx !== undefined) {
    payload.activePhaseIdx = options.activePhaseIdx;
  }
  if (options?.activePhaseId !== undefined) {
    payload.activePhaseId = options.activePhaseId;
  }
  await setDoc(draftRef, payload);
}

/**
 * Get incomplete draft for a client, if any. Used by dashboard to show "Finish assessment" alert.
 */
export async function getDraftAssessment(
  clientName: string,
  organizationId: string,
): Promise<{
  formData: FormData;
  updatedAt: Timestamp | null;
  activePhaseIdx: number | null;
  activePhaseId: string | null;
} | null> {
  const slug = generateClientSlug(clientName);
  const draftRef = doc(getDb(), ORGANIZATION.clients.draft(organizationId, slug));
  const snap = await getDoc(draftRef);
  if (!snap.exists()) return null;
  const data = snap.data();
  const rawPhase = data?.activePhaseIdx;
  const activePhaseIdx =
    typeof rawPhase === 'number' && Number.isFinite(rawPhase) ? rawPhase : null;
  const rawPhaseId = data?.activePhaseId;
  const activePhaseId =
    typeof rawPhaseId === 'string' && rawPhaseId.trim() ? rawPhaseId : null;
  return {
    formData: (data?.formData ?? {}) as FormData,
    updatedAt: (data?.updatedAt as Timestamp) ?? null,
    activePhaseIdx,
    activePhaseId,
  };
}

/**
 * Clear draft for a client after a complete assessment is saved (live report updated).
 */
export async function clearDraftAssessment(
  clientName: string,
  organizationId: string,
): Promise<void> {
  const slug = generateClientSlug(clientName);
  const draftRef = doc(getDb(), ORGANIZATION.clients.draft(organizationId, slug));
  const snap = await getDoc(draftRef);
  if (snap.exists()) await deleteDoc(draftRef);
}

export async function saveCoachAssessment(
  coachUid: string,
  coachEmail: string | null | undefined,
  formData: FormData,
  overallScore: number,
  organizationId?: string,
  profile?: UserProfile | null,
): Promise<SaveResult> {
  const name = (formData.fullName || 'Unnamed client').trim();

  // Validate organizationId before proceeding
  const validOrgId = validateOrganizationId(organizationId, profile);

  // 1. Pre-calculate scores summary — needed by both history snapshot and dashboard doc
  const scoresSummary = summarizeScores(formData);

  // 2. ALWAYS update history first (keeps the "Current" view accurate and logs the change)
  const { updateCurrentAssessment } = await import('./assessmentHistory');
  const hasChanges = await updateCurrentAssessment(coachUid, name, formData, overallScore, 'full', 'all', validOrgId, scoresSummary);
  if (!hasChanges) {
    return { assessmentId: '', shareToken: null, publicReportSynced: false };
  }

  // 3. Upsert: canonical current-state doc uses the client slug as ID (deterministic, queryable).
  // Check the slug doc first. If absent, check for a legacy UUID doc (pre-slug era) and migrate it.
  const slug = generateClientSlug(name);
  const slugDocRef = doc(orgClientsCollection(validOrgId), slug) as DocumentReference;
  const slugDocSnap = await getDoc(slugDocRef);

  let existingData: Record<string, unknown> | null = null;
  let legacyRefToDelete: DocumentReference | null = null;

  if (slugDocSnap.exists()) {
    existingData = slugDocSnap.data() as Record<string, unknown>;
  } else {
    // Fall back to legacy UUID-ID lookup for clients assessed before slug-based saves
    const legacyQ = query(
      orgClientsCollection(validOrgId),
      where('clientNameLower', '==', name.toLowerCase()),
      orderBy('createdAt', 'desc'),
      limit(1),
    );
    const legacySnap = await getDocs(legacyQ);
    if (!legacySnap.empty) {
      existingData = legacySnap.docs[0].data() as Record<string, unknown>;
      legacyRefToDelete = legacySnap.docs[0].ref as DocumentReference;
      logger.info('[Assessment] Migrating UUID assessment doc to slug-based ID:', slug);
    }
  }

  if (existingData !== null) {
    const previousScore = (existingData.overallScore as number | undefined) ?? 0;
    const trend = overallScore - previousScore;

    logger.info('[Assessment] Upsert: updating current-state doc for', slug);
    await setDoc(slugDocRef, {
      clientName: name,
      clientNameLower: name.toLowerCase(),
      coachUid,
      coachEmail: coachEmail || null,
      organizationId: validOrgId,
      overallScore,
      previousScore,
      trend,
      assessmentCount: ((existingData.assessmentCount as number | undefined) ?? 0) + 1,
      createdAt: existingData.createdAt ?? serverTimestamp(),
      updatedAt: serverTimestamp(),
      goals: Array.isArray(formData.clientGoals) ? formData.clientGoals : [],
      // formData intentionally excluded — stored in current/state + sessions only
      scoresSummary,
      isSummary: true,
      isPartial: false,
      assessmentType: 'full' as const,
      category: 'all',
      remoteIntakeAwaitingStudio: false,
    });

    // Clean up legacy UUID doc now that slug doc is in place
    if (legacyRefToDelete) await deleteDoc(legacyRefToDelete);

    // Auto-regenerate coach notes from this fresh assessment.
    void fireCoachNotesRegeneration(validOrgId, slug, formData);

    // Public report sync is handled by Cloud Function trigger on current/state writes.
    // ShareToken is read from the existing slug doc if one was previously shared.
    const shareToken = (existingData as Record<string, unknown>).shareToken as string | null ?? null;
    return { assessmentId: slug, shareToken, publicReportSynced: false };
  }

  // 4. First assessment for this client — create slug-based current-state doc
  await setDoc(slugDocRef, {
    clientName: name,
    clientNameLower: name.toLowerCase(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    coachUid,
    coachEmail: coachEmail || null,
    organizationId: validOrgId,
    overallScore,
    assessmentCount: 1,
    goals: Array.isArray(formData.clientGoals) ? formData.clientGoals : [],
    // formData intentionally excluded — stored in current/state + sessions only
    scoresSummary,
    isSummary: true,
    isPartial: false,
    assessmentType: 'full' as const,
    category: 'all',
    remoteIntakeAwaitingStudio: false,
  });
  const docRef = { id: slug };

  // Auto-regenerate coach notes from this fresh full assessment.
  void fireCoachNotesRegeneration(validOrgId, slug, formData);

  // Public report sync handled by Cloud Function trigger on current/state writes.
  return { assessmentId: docRef.id, shareToken: null, publicReportSynced: false };
}

/**
 * Fire-and-forget coach-notes regeneration. Errors are logged but
 * don't block the assessment-save flow — coach can manually
 * regenerate from the Coach Notes tab if this fails.
 */
async function fireCoachNotesRegeneration(
  orgId: string,
  clientSlug: string,
  formData: FormData,
): Promise<void> {
  try {
    const { computeScores } = await import('@/lib/scoring');
    const { regenerateCoachNotes } = await import('./coachNotes');
    const scores = computeScores(formData);
    await regenerateCoachNotes({ orgId, clientSlug, formData, scores });
  } catch (err) {
    const { logger } = await import('@/lib/utils/logger');
    logger.warn('[Coach Notes] Background regeneration failed (non-fatal)', 'COACH_NOTES_REGEN', err);
  }
}

export async function listCoachAssessments(
  coachUid: string,
  max = 100,
  organizationId?: string,
): Promise<CoachAssessmentSummary[]> {
  const resolvedOrgId = await resolveOrganizationId(coachUid, organizationId);
  const resolvedLimit = Math.min(max, MAX_ASSESSMENTS_LIMIT);

  const q = query(
    orgClientsCollection(resolvedOrgId),
    where('coachUid', '==', coachUid),
    orderBy('createdAt', 'desc'),
    limit(resolvedLimit),
  );

  const snap = await getDocs(q);
  const items: CoachAssessmentSummary[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Partial<CoachAssessmentDoc> & { scores?: { overall?: number }; previousScore?: number; trend?: number; assessmentCount?: number; updatedAt?: Timestamp };
    items.push({
      id: docSnap.id,
      clientName: data.clientName || 'Unnamed client',
      createdAt: (data.createdAt as Timestamp | undefined) ?? null,
      updatedAt: data.updatedAt ?? null,
      overallScore: extractOverallScore(data),
      goals: Array.isArray(data.goals) ? data.goals : [],
      scoresSummary: data.scoresSummary,
      previousScore: data.previousScore,
      trend: data.trend,
      assessmentCount: data.assessmentCount,
    });
  });
  return items;
}

export async function getCoachAssessment(
  coachUid: string,
  assessmentId: string,
  clientName?: string,
  organizationId?: string,
  profile?: UserProfile | null
): Promise<{ formData: FormData; overallScore: number; goals: string[] } | null> {
  const resolvedOrgId = organizationId ?? profile?.organizationId;
  const validOrgId = resolvedOrgId ? validateOrganizationId(resolvedOrgId, profile) : undefined;

  // 0. Handle "latest" keyword for the live merged report
  if (assessmentId === 'latest' && clientName && validOrgId) {
    const { getCurrentAssessment } = await import('./assessmentHistory');
    const current = await getCurrentAssessment(coachUid, clientName, validOrgId);
    if (current) {
      return {
        formData: current.formData,
        overallScore: current.overallScore,
        goals: Array.isArray(current.formData.clientGoals) ? current.formData.clientGoals : [],
      };
    }
    // Fallback: if no current assessment doc exists, use the most recent assessment
    const latestAssessments = await getClientAssessments(coachUid, clientName, validOrgId, 1);
    if (latestAssessments.length > 0) {
      // Recurse with the real assessment ID instead of "latest"
      return getCoachAssessment(coachUid, latestAssessments[0].id, clientName, validOrgId, profile);
    }
    return null;
  }

  // 1. Try the specific client document from organization path
  if (validOrgId) {
    const ref = doc(getDb(), ORGANIZATION.clients.doc(validOrgId, assessmentId));
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data() as {
        formData?: FormData;
        overallScore?: number;
        scores?: { overall?: number };
        goals?: string[];
        clientName?: string;
        organizationId?: string | null;
      };

      // Verify organization ownership
      if (data.organizationId && data.organizationId !== validOrgId) {
        throw new Error('Cannot access assessment: Organization mismatch.');
      }

      // If it has formData, we're good
      if (data.formData) {
        return {
          formData: data.formData as FormData,
          overallScore: extractOverallScore(data),
          goals: Array.isArray(data.goals) ? data.goals : [],
        };
      }

      // If it's a summary WITHOUT formData, try to find the full data
      const resolvedName = clientName || data.clientName;
      if (resolvedName) {
        const { getCurrentAssessment } = await import('./assessmentHistory');
        const current = await getCurrentAssessment(coachUid, resolvedName, validOrgId);
        if (current) {
          return {
            formData: current.formData,
            overallScore: current.overallScore,
            goals: Array.isArray(current.formData.clientGoals) ? current.formData.clientGoals : [],
          };
        }
      }
    }
  }

  // 2. Try the client's snapshots collection if assessmentId might be a snapshot ID
  if (clientName && validOrgId) {
    const { getSnapshots } = await import('./assessmentHistory');
    const snapshots = await getSnapshots(coachUid, clientName, 50, validOrgId);
    const snapshot = snapshots.find(s => s.id === assessmentId);
    if (snapshot) {
      return {
        formData: snapshot.formData,
        overallScore: snapshot.overallScore,
        goals: Array.isArray(snapshot.formData.clientGoals) ? snapshot.formData.clientGoals : [],
      };
    }
  }

  return null;
}

export async function deleteCoachAssessment(
  coachUid: string,
  assessmentId: string,
  organizationId?: string,
  profile?: UserProfile | null,
): Promise<void> {
  // Validate organizationId before proceeding
  const validOrgId = validateOrganizationId(organizationId, profile);

  const ref = doc(getDb(), ORGANIZATION.clients.doc(validOrgId, assessmentId));

  const assessmentDoc = await getDoc(ref);
  if (!assessmentDoc.exists()) {
    throw new Error('Assessment not found');
  }

  const existingData = assessmentDoc.data() as CoachAssessmentDoc;

  if (existingData.organizationId && existingData.organizationId !== validOrgId) {
    throw new Error('Cannot delete assessment: Organization mismatch.');
  }

  await deleteDoc(ref);
}

export async function getClientAssessments(
  coachUid: string,
  clientName: string,
  organizationId?: string,
  maxResults = 50,
): Promise<CoachAssessmentSummary[]> {
  const resolvedOrgId = await resolveOrganizationId(coachUid, organizationId);
  const resolvedLimit = Math.min(maxResults, MAX_CLIENT_ASSESSMENTS_LIMIT);

  const q = query(
    orgClientsCollection(resolvedOrgId),
    where('clientNameLower', '==', clientName.toLowerCase()),
    orderBy('createdAt', 'desc'),
    limit(resolvedLimit),
  );
  const snap = await getDocs(q);
  const items: CoachAssessmentSummary[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Partial<CoachAssessmentDoc> & { scores?: { overall?: number }; previousScore?: number; trend?: number; assessmentCount?: number; updatedAt?: Timestamp };
    items.push({
      id: docSnap.id,
      clientName: data.clientName || 'Unnamed client',
      createdAt: (data.createdAt as Timestamp | undefined) ?? null,
      updatedAt: data.updatedAt ?? null,
      overallScore: extractOverallScore(data),
      goals: Array.isArray(data.goals) ? data.goals : [],
      scoresSummary: data.scoresSummary,
      previousScore: data.previousScore,
      trend: data.trend,
      assessmentCount: data.assessmentCount,
      assessmentType: data.assessmentType,
      isPartial: data.isPartial,
      remoteIntakeAwaitingStudio: data.remoteIntakeAwaitingStudio === true,
    });
  });
  return items;
}

export async function getAllClients(coachUid: string, organizationId?: string, maxAssessments = 500): Promise<string[]> {
  const resolvedOrgId = await resolveOrganizationId(coachUid, organizationId);
  const resolvedLimit = Math.min(maxAssessments, MAX_CLIENT_LIST_LIMIT);

  const q = query(
    orgClientsCollection(resolvedOrgId),
    where('coachUid', '==', coachUid),
    orderBy('createdAt', 'desc'),
    limit(resolvedLimit)
  );
  const snap = await getDocs(q);
  const clients = new Set<string>();
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Partial<CoachAssessmentDoc>;
    if (data.clientName) {
      clients.add(data.clientName);
    }
  });
  return Array.from(clients).sort();
}

export async function savePartialAssessment(
  coachUid: string,
  coachEmail: string | null | undefined,
  formData: FormData,
  overallScore: number,
  clientName: string,
  category: 'bodycomp' | 'posture' | 'fitness' | 'strength' | 'lifestyle',
  organizationId?: string,
  profile?: UserProfile | null,
  sessionContext?: { sessionId: string; sessionCategories: string[] },
): Promise<SaveResult> {
  const finalName = (clientName || formData.fullName || 'Unnamed client').trim();

  // Validate organizationId before proceeding
  const validOrgId = validateOrganizationId(organizationId, profile);

  // 1. Get current assessment to merge with
  const { getCurrentAssessment, updateCurrentAssessment } = await import('./assessmentHistory');
  const current = await getCurrentAssessment(coachUid, finalName, validOrgId);

  // Merge: new partial data overrides existing data
  const mergedFormData = current?.formData
    ? { ...current.formData, ...formData }
    : formData;

  // Determine change type
  const changeType = `partial-${category}` as const;

  // Pre-calculate scores summary — needed by both history snapshot and dashboard doc
  const scoresSummary = summarizeScores(mergedFormData);

  // 2. ALWAYS update history first (keeps audit trail complete even on dedup)
  const hasChanges = await updateCurrentAssessment(coachUid, finalName, mergedFormData, overallScore, changeType, category, validOrgId, scoresSummary, sessionContext);
  if (!hasChanges) {
    return { assessmentId: '', shareToken: null, publicReportSynced: false };
  }

  // 3. Upsert: canonical current-state doc uses the client slug as ID.
  // Check slug doc first; fall back to legacy UUID doc and migrate on first encounter.
  const slug = generateClientSlug(finalName);
  const slugDocRef = doc(orgClientsCollection(validOrgId), slug) as DocumentReference;
  const slugDocSnap = await getDoc(slugDocRef);

  let existingDataPartial: Record<string, unknown> | null = null;
  let legacyPartialRefToDelete: DocumentReference | null = null;

  if (slugDocSnap.exists()) {
    existingDataPartial = slugDocSnap.data() as Record<string, unknown>;
  } else {
    const legacyQ = query(
      orgClientsCollection(validOrgId),
      where('clientNameLower', '==', finalName.toLowerCase()),
      orderBy('createdAt', 'desc'),
      limit(1),
    );
    const legacySnap = await getDocs(legacyQ);
    if (!legacySnap.empty) {
      existingDataPartial = legacySnap.docs[0].data() as Record<string, unknown>;
      legacyPartialRefToDelete = legacySnap.docs[0].ref as DocumentReference;
      logger.info('[Assessment] Migrating UUID partial assessment doc to slug-based ID:', slug);
    }
  }

  if (existingDataPartial !== null) {
    const previousScore = (existingDataPartial.overallScore as number | undefined) ?? 0;
    const trend = overallScore - previousScore;

    logger.info('[Assessment] Upsert (partial): updating current-state doc for', slug);
    await setDoc(slugDocRef, {
      clientName: finalName,
      clientNameLower: finalName.toLowerCase(),
      coachUid,
      coachEmail: coachEmail || null,
      organizationId: validOrgId,
      overallScore,
      previousScore,
      trend,
      assessmentCount: ((existingDataPartial.assessmentCount as number | undefined) ?? 0) + 1,
      createdAt: existingDataPartial.createdAt ?? serverTimestamp(),
      updatedAt: serverTimestamp(),
      goals: Array.isArray(mergedFormData.clientGoals) ? mergedFormData.clientGoals : [],
      scoresSummary,
      isSummary: true,
      category,
      isPartial: true,
      assessmentType: 'pillar' as const,
      pillar: category,
      remoteIntakeAwaitingStudio: false,
    });

    if (legacyPartialRefToDelete) await deleteDoc(legacyPartialRefToDelete);

    const partialShareToken = (existingDataPartial as Record<string, unknown>).shareToken as string | null ?? null;
    return { assessmentId: slug, shareToken: partialShareToken, publicReportSynced: false };
  }

  // 4. First assessment for this client — create slug-based current-state doc
  await setDoc(slugDocRef, {
    clientName: finalName,
    clientNameLower: finalName.toLowerCase(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    coachUid,
    coachEmail: coachEmail || null,
    organizationId: validOrgId,
    overallScore,
    assessmentCount: 1,
    goals: Array.isArray(mergedFormData.clientGoals) ? mergedFormData.clientGoals : [],
    scoresSummary,
    isSummary: true,
    category,
    isPartial: true,
    assessmentType: 'pillar' as const,
    pillar: category,
    remoteIntakeAwaitingStudio: false,
  });
  const docRef = { id: slug };

  // Auto-regenerate coach notes — pillar reassessments update only the
  // affected pillar's findings; coach overrides on other pillars survive.
  void fireCoachNotesRegeneration(validOrgId, slug, mergedFormData);

  // Public report sync handled by Cloud Function trigger on current/state writes.
  return { assessmentId: docRef.id, shareToken: null, publicReportSynced: false };
}

/**
 * Save N pillar assessments in one coaching session. Each pillar gets
 * its own snapshot (so per-pillar history queries are unchanged), but
 * all snapshots share a `sessionId` so the session is queryable as a
 * unit later.
 *
 * Implementation note: this is a sequential loop over `savePartialAssessment`
 * rather than a true Firestore batch. The savePartialAssessment function
 * already handles current-state merging, profile-date stamping, snapshot
 * creation, and coach-notes regen — wrapping it preserves all those side
 * effects without re-implementing them. Trade-off: N×writes for the
 * current-state doc upsert (last write wins, all but the last are
 * effectively wasted but functionally idempotent).
 */
export async function saveMultiPillarAssessment(
  coachUid: string,
  coachEmail: string | null | undefined,
  formData: FormData,
  overallScore: number,
  clientName: string,
  categories: Array<'bodycomp' | 'posture' | 'fitness' | 'strength' | 'lifestyle'>,
  organizationId?: string,
  profile?: UserProfile | null,
): Promise<{
  sessionId: string;
  results: Array<{ category: string; assessmentId: string; saved: boolean }>;
  shareToken: string | null;
}> {
  if (categories.length === 0) {
    throw new Error('saveMultiPillarAssessment: at least one category required');
  }

  if (categories.length === 1) {
    const result = await savePartialAssessment(
      coachUid, coachEmail, formData, overallScore, clientName, categories[0], organizationId, profile,
    );
    return {
      sessionId: result.assessmentId || crypto.randomUUID(),
      results: [{ category: categories[0], assessmentId: result.assessmentId, saved: !!result.assessmentId }],
      shareToken: result.shareToken,
    };
  }

  const sessionId = crypto.randomUUID();
  const sessionContext = { sessionId, sessionCategories: [...categories] };
  const results: Array<{ category: string; assessmentId: string; saved: boolean }> = [];
  let shareToken: string | null = null;

  for (const category of categories) {
    try {
      const r = await savePartialAssessment(
        coachUid, coachEmail, formData, overallScore, clientName, category, organizationId, profile, sessionContext,
      );
      if (r.shareToken) shareToken = r.shareToken;
      results.push({ category, assessmentId: r.assessmentId, saved: !!r.assessmentId });
    } catch (err) {
      logger.error(`[Multi-pillar save] Failed to save pillar ${category}:`, err);
      results.push({ category, assessmentId: '', saved: false });
    }
  }

  return { sessionId, results, shareToken };
}

/**
 * Update an existing assessment while preserving the original createdAt timestamp
 */
export async function updateCoachAssessment(
  coachUid: string,
  assessmentId: string,
  formData: FormData,
  overallScore: number,
  organizationId?: string,
  profile?: UserProfile | null,
): Promise<void> {
  // Validate organizationId before proceeding
  const validOrgId = validateOrganizationId(organizationId, profile);

  const ref = doc(getDb(), ORGANIZATION.clients.doc(validOrgId, assessmentId));

  const existingDoc = await getDoc(ref);
  if (!existingDoc.exists()) {
    throw new Error('Assessment not found');
  }

  const existingData = existingDoc.data() as CoachAssessmentDoc;

  // Verify organization ownership
  if (existingData.organizationId && existingData.organizationId !== validOrgId) {
    throw new Error('Cannot update assessment: Organization mismatch.');
  }

  const scoresSummary = summarizeScores(formData);

  // Update the document while preserving createdAt
  // formData intentionally excluded — stored in current/state + sessions only
  await updateDoc(ref, {
    clientName: (formData.fullName || 'Unnamed client').trim(),
    clientNameLower: (formData.fullName || 'Unnamed client').trim().toLowerCase(),
    overallScore,
    goals: Array.isArray(formData.clientGoals) ? formData.clientGoals : [],
    scoresSummary,
    organizationId: validOrgId,
    updatedAt: serverTimestamp(),
    isPartial: false,
    category: 'all',
  });

  // Also update the current assessment in the history system
  const clientName = (formData.fullName || 'Unnamed client').trim();
  const { updateCurrentAssessment } = await import('./assessmentHistory');
  await updateCurrentAssessment(coachUid, clientName, formData, overallScore, 'full', 'all', validOrgId);
  // Public report sync handled by Cloud Function trigger on current/state writes.
}


