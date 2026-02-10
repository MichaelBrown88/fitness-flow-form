import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, limit, doc, getDoc, deleteDoc, where, updateDoc, increment } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import type { FormData } from '@/contexts/FormContext';
import { getDb } from '@/services/firebase';
import { summarizeScores } from '@/lib/scoring';
import { validateOrganizationId } from '@/lib/utils/validateOrganizationId';
import type { UserProfile } from '@/types/auth';
import { COLLECTIONS } from '@/constants/collections';
import { ORGANIZATION } from '@/lib/database/paths';
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
  scoresSummary?: {
    overall: number;
    categories: {
      id: string;
      score: number;
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
  /** UID of the coach who physically performed the assessment (set when different from coachUid) */
  performedByUid?: string;
  overallScore: number;
  goals: string[];
  formData: FormData;
  organizationId?: string | null;
  isSummary?: boolean;
  isPartial?: boolean;
  category?: string;
  scoresSummary?: CoachAssessmentSummary['scoresSummary'];
};

/**
 * Get the organization's assessments collection
 * Now uses organization-centric path instead of coach-centric
 */
const orgAssessmentsCollection = (orgId: string) =>
  collection(getDb(), ORGANIZATION.assessments.collection(orgId));

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

/**
 * Resolve the effective coach UID for assessment attribution.
 * If assignedCoach is set and differs from the logged-in user, the assessment
 * is attributed to the assigned coach (guest assessment / favor scenario).
 */
function resolveEffectiveCoach(
  loggedInCoachUid: string,
  formData: FormData,
  _organizationId: string,
): string {
  const assignedCoach = formData.assignedCoach?.trim();
  if (assignedCoach && assignedCoach !== loggedInCoachUid) {
    return assignedCoach;
  }
  return loggedInCoachUid;
}

export async function saveCoachAssessment(
  coachUid: string,
  coachEmail: string | null | undefined,
  formData: FormData,
  overallScore: number,
  organizationId?: string,
  profile?: UserProfile | null,
): Promise<string> {
  const name = (formData.fullName || 'Unnamed client').trim();

  // Validate organizationId before proceeding
  const validOrgId = validateOrganizationId(organizationId, profile);

  // Resolve effective coach: use assignedCoach for guest assessment attribution (Phase F)
  const effectiveCoachUid = resolveEffectiveCoach(coachUid, formData, validOrgId);
  const isGuestAssessment = effectiveCoachUid !== coachUid;

  // 1. ALWAYS update history first (keeps the "Current" view accurate and logs the change)
  const { updateCurrentAssessment } = await import('./assessmentHistory');
  await updateCurrentAssessment(effectiveCoachUid, name, formData, overallScore, 'full', 'all', validOrgId);

  // 2. Pre-calculate scores summary for dashboard performance
  const scoresSummary = summarizeScores(formData);

  // 3. Upsert: check if a summary already exists for this client (one row per client)
  const existingQ = query(
    orgAssessmentsCollection(validOrgId),
    where('clientNameLower', '==', name.toLowerCase()),
    where('coachUid', '==', effectiveCoachUid),
    orderBy('createdAt', 'desc'),
    limit(1),
  );
  const existingSnapshot = await getDocs(existingQ);

  if (!existingSnapshot.empty) {
    const existingDoc = existingSnapshot.docs[0];
    const existingData = existingDoc.data();
    // Capture previousScore BEFORE overwrite for trend calculation
    const previousScore = existingData.overallScore ?? 0;
    const trend = overallScore - previousScore;

    logger.info('[Assessment] Upsert: updating existing client summary');
    await updateDoc(existingDoc.ref, {
      clientName: name,
      clientNameLower: name.toLowerCase(),
      overallScore,
      previousScore,
      trend,
      assessmentCount: increment(1),
      createdAt: serverTimestamp(),
      goals: Array.isArray(formData.clientGoals) ? formData.clientGoals : [],
      formData,
      scoresSummary,
      ...(isGuestAssessment ? { performedByUid: coachUid } : {}),
    });

    // Update public report
    try {
      const { publishPublicReport } = await import('./publicReports');
      await publishPublicReport({
        coachUid: effectiveCoachUid,
        assessmentId: existingDoc.id,
        formData,
        organizationId: validOrgId,
        profile,
      });
    } catch (err) {
      logger.warn('Failed to update public report after upsert save:', err);
    }

    return existingDoc.id;
  }

  // 4. First assessment for this client -- create new summary
  const docRef = await addDoc(orgAssessmentsCollection(validOrgId), {
    clientName: name,
    clientNameLower: name.toLowerCase(),
    createdAt: serverTimestamp(),
    coachUid: effectiveCoachUid,
    coachEmail: coachEmail || null,
    organizationId: validOrgId,
    overallScore,
    assessmentCount: 1,
    goals: Array.isArray(formData.clientGoals) ? formData.clientGoals : [],
    formData,
    scoresSummary,
    isSummary: true,
    ...(isGuestAssessment ? { performedByUid: coachUid } : {}),
  });

  // Update public report if one exists (keeps shared links live)
  try {
    const { publishPublicReport } = await import('./publicReports');
    await publishPublicReport({
      coachUid: effectiveCoachUid,
      assessmentId: docRef.id,
      formData,
      organizationId: validOrgId,
      profile,
    });
  } catch (err) {
    logger.warn('Failed to update public report after assessment save:', err);
  }

  return docRef.id;
}

export async function listCoachAssessments(
  coachUid: string,
  max = 100,
  organizationId?: string,
): Promise<CoachAssessmentSummary[]> {
  const resolvedOrgId = await resolveOrganizationId(coachUid, organizationId);
  const resolvedLimit = Math.min(max, MAX_ASSESSMENTS_LIMIT);

  // Query organization's assessments collection, filtered by coachUid if needed
  const q = query(
    orgAssessmentsCollection(resolvedOrgId),
    where('coachUid', '==', coachUid),
    orderBy('createdAt', 'desc'),
    limit(resolvedLimit),
  );

  const snap = await getDocs(q);
  const items: CoachAssessmentSummary[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Partial<CoachAssessmentDoc> & { scores?: { overall?: number }; previousScore?: number; trend?: number; assessmentCount?: number };
    items.push({
      id: docSnap.id,
      clientName: data.clientName || 'Unnamed client',
      createdAt: (data.createdAt as Timestamp | undefined) ?? null,
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

  // 1. Try the specific assessment document from organization path
  if (validOrgId) {
    const ref = doc(getDb(), ORGANIZATION.assessments.doc(validOrgId, assessmentId));
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

  // Use organization path for assessment
  const ref = doc(getDb(), ORGANIZATION.assessments.doc(validOrgId, assessmentId));

  // Fetch document first to verify ownership
  const assessmentDoc = await getDoc(ref);
  if (!assessmentDoc.exists()) {
    throw new Error('Assessment not found');
  }

  const existingData = assessmentDoc.data() as CoachAssessmentDoc;

  // Verify ownership: organizationId must match
  if (existingData.organizationId && existingData.organizationId !== validOrgId) {
    throw new Error('Cannot delete assessment: Organization mismatch.');
  }

  // Proceed with deletion
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

  // Query organization's assessments by client name
  const q = query(
    orgAssessmentsCollection(resolvedOrgId),
    where('clientNameLower', '==', clientName.toLowerCase()),
    orderBy('createdAt', 'desc'),
    limit(resolvedLimit),
  );
  const snap = await getDocs(q);
  const items: CoachAssessmentSummary[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Partial<CoachAssessmentDoc> & { scores?: { overall?: number } };
    items.push({
      id: docSnap.id,
      clientName: data.clientName || 'Unnamed client',
      createdAt: (data.createdAt as Timestamp | undefined) ?? null,
      overallScore: extractOverallScore(data),
      goals: Array.isArray(data.goals) ? data.goals : [],
      scoresSummary: data.scoresSummary,
    });
  });
  return items;
}

export async function getAllClients(coachUid: string, organizationId?: string, maxAssessments = 500): Promise<string[]> {
  const resolvedOrgId = await resolveOrganizationId(coachUid, organizationId);
  const resolvedLimit = Math.min(maxAssessments, MAX_CLIENT_LIST_LIMIT);

  // Query organization's assessments to extract unique client names
  const q = query(
    orgAssessmentsCollection(resolvedOrgId),
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
  category: 'inbody' | 'posture' | 'fitness' | 'strength' | 'lifestyle',
  organizationId?: string,
  profile?: UserProfile | null,
): Promise<string> {
  const finalName = (clientName || formData.fullName || 'Unnamed client').trim();

  // Validate organizationId before proceeding
  const validOrgId = validateOrganizationId(organizationId, profile);

  // Resolve effective coach for guest assessment attribution (Phase F)
  const effectiveCoachUid = resolveEffectiveCoach(coachUid, formData, validOrgId);
  const isGuestAssessment = effectiveCoachUid !== coachUid;

  // 1. Get current assessment to merge with
  const { getCurrentAssessment, updateCurrentAssessment } = await import('./assessmentHistory');
  const current = await getCurrentAssessment(effectiveCoachUid, finalName, validOrgId);

  // Merge: new partial data overrides existing data
  const mergedFormData = current?.formData
    ? { ...current.formData, ...formData }
    : formData;

  // Determine change type
  const changeType = `partial-${category}` as const;

  // 2. ALWAYS update history first (keeps audit trail complete even on dedup)
  await updateCurrentAssessment(effectiveCoachUid, finalName, mergedFormData, overallScore, changeType, category, validOrgId);

  // Pre-calculate scores summary for dashboard performance
  const scoresSummary = summarizeScores(mergedFormData);

  // 3. Upsert: check if a summary already exists for this client (one row per client)
  const existingQ = query(
    orgAssessmentsCollection(validOrgId),
    where('clientNameLower', '==', finalName.toLowerCase()),
    where('coachUid', '==', effectiveCoachUid),
    orderBy('createdAt', 'desc'),
    limit(1),
  );
  const existingSnapshot = await getDocs(existingQ);

  if (!existingSnapshot.empty) {
    const existingDoc = existingSnapshot.docs[0];
    const existingData = existingDoc.data();
    const previousScore = existingData.overallScore ?? 0;
    const trend = overallScore - previousScore;

    logger.info('[Assessment] Upsert (partial): updating existing client summary');
    await updateDoc(existingDoc.ref, {
      clientName: finalName,
      clientNameLower: finalName.toLowerCase(),
      overallScore,
      previousScore,
      trend,
      assessmentCount: increment(1),
      createdAt: serverTimestamp(),
      goals: Array.isArray(mergedFormData.clientGoals) ? mergedFormData.clientGoals : [],
      formData: mergedFormData,
      scoresSummary,
      category,
      isPartial: true,
      ...(isGuestAssessment ? { performedByUid: coachUid } : {}),
    });

    try {
      const { publishPublicReport } = await import('./publicReports');
      await publishPublicReport({
        coachUid: effectiveCoachUid,
        assessmentId: existingDoc.id,
        formData: mergedFormData,
        organizationId: validOrgId,
      });
    } catch (err) {
      logger.warn('Failed to update public report after partial upsert save:', err);
    }

    return existingDoc.id;
  }

  // 4. First assessment for this client -- create new summary
  const docRef = await addDoc(orgAssessmentsCollection(validOrgId), {
    clientName: finalName,
    clientNameLower: finalName.toLowerCase(),
    createdAt: serverTimestamp(),
    coachUid: effectiveCoachUid,
    coachEmail: coachEmail || null,
    organizationId: validOrgId,
    overallScore,
    assessmentCount: 1,
    goals: Array.isArray(mergedFormData.clientGoals) ? mergedFormData.clientGoals : [],
    formData: mergedFormData,
    scoresSummary,
    category,
    isPartial: true,
    ...(isGuestAssessment ? { performedByUid: coachUid } : {}),
  });

  // Update public report if one exists
  try {
    const { publishPublicReport } = await import('./publicReports');
    await publishPublicReport({
      coachUid: effectiveCoachUid,
      assessmentId: docRef.id,
      formData: mergedFormData,
      organizationId: validOrgId,
    });
  } catch (err) {
    logger.warn('Failed to update public report after partial assessment save:', err);
  }

  return docRef.id;
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

  // Use organization path for assessment
  const ref = doc(getDb(), ORGANIZATION.assessments.doc(validOrgId, assessmentId));

  // Get the existing document to preserve createdAt
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
  await updateDoc(ref, {
    clientName: (formData.fullName || 'Unnamed client').trim(),
    clientNameLower: (formData.fullName || 'Unnamed client').trim().toLowerCase(),
    overallScore,
    goals: Array.isArray(formData.clientGoals) ? formData.clientGoals : [],
    formData: formData,
    scoresSummary,
    organizationId: validOrgId,
    // Note: createdAt is NOT included here, so it will be preserved
  });

  // Also update the current assessment in the history system
  const clientName = (formData.fullName || 'Unnamed client').trim();
  const { updateCurrentAssessment } = await import('./assessmentHistory');
  await updateCurrentAssessment(coachUid, clientName, formData, overallScore, 'full', 'all', validOrgId);

  // Update public report if one exists
  try {
    const { publishPublicReport } = await import('./publicReports');
    await publishPublicReport({
      coachUid,
      assessmentId,
      formData,
      organizationId: validOrgId,
    });
  } catch (err) {
    const { logger } = await import('@/lib/utils/logger');
    logger.warn('Failed to update public report after assessment update:', err);
  }
}


