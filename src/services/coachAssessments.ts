import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, limit, doc, getDoc, deleteDoc, where, updateDoc } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import type { FormData } from '@/contexts/FormContext';
import { getDb } from '@/services/firebase';
import { summarizeScores } from '@/lib/scoring';
import { validateOrganizationId } from '@/lib/utils/validateOrganizationId';
import type { UserProfile } from '@/types/auth';
import { COLLECTIONS } from '@/constants/collections';
import { ORGANIZATION } from '@/lib/database/paths';

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

  // 1. Use new assessment history system (the deep structure)
  const { updateCurrentAssessment } = await import('./assessmentHistory');
  await updateCurrentAssessment(coachUid, name, formData, overallScore, 'full', 'all', validOrgId);

  // 2. Create assessment summary in the organization's assessments collection
  // Pre-calculate scores summary for dashboard performance
  const scoresSummary = summarizeScores(formData);

  // Create assessment summary document using organization path
  const docRef = await addDoc(orgAssessmentsCollection(validOrgId), {
    clientName: name,
    clientNameLower: name.toLowerCase(),
    createdAt: serverTimestamp(),
    coachUid,
    coachEmail: coachEmail || null,
    organizationId: validOrgId,
    overallScore,
    goals: Array.isArray(formData.clientGoals) ? formData.clientGoals : [],
    formData: formData,
    scoresSummary,
    isSummary: true,
  });

  // Update public report if one exists (keeps shared links live)
  try {
    const { publishPublicReport } = await import('./publicReports');
    await publishPublicReport({
      coachUid,
      assessmentId: docRef.id,
      formData,
      organizationId: validOrgId,
      profile,
    });
  } catch (err) {
    const { logger } = await import('@/lib/utils/logger');
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

  // 1. Get current assessment to merge with
  const { getCurrentAssessment, updateCurrentAssessment } = await import('./assessmentHistory');
  const current = await getCurrentAssessment(coachUid, finalName, validOrgId);

  // Merge: new partial data overrides existing data
  const mergedFormData = current?.formData
    ? { ...current.formData, ...formData }
    : formData;

  // Determine change type
  const changeType = `partial-${category}` as const;

  // 2. Update current assessment and log change (deep structure)
  await updateCurrentAssessment(coachUid, finalName, mergedFormData, overallScore, changeType, category, validOrgId);

  // Pre-calculate scores summary for dashboard performance
  const scoresSummary = summarizeScores(mergedFormData);

  // 3. Create summary in organization's assessments collection
  const docRef = await addDoc(orgAssessmentsCollection(validOrgId), {
    clientName: finalName,
    clientNameLower: finalName.toLowerCase(),
    createdAt: serverTimestamp(),
    coachUid,
    coachEmail: coachEmail || null,
    organizationId: validOrgId,
    overallScore,
    goals: Array.isArray(mergedFormData.clientGoals) ? mergedFormData.clientGoals : [],
    formData: mergedFormData,
    scoresSummary,
    category,
    isPartial: true,
  });

  // Update public report if one exists
  try {
    const { publishPublicReport } = await import('./publicReports');
    await publishPublicReport({
      coachUid,
      assessmentId: docRef.id,
      formData: mergedFormData,
      organizationId: validOrgId,
    });
  } catch (err) {
    const { logger } = await import('@/lib/utils/logger');
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


