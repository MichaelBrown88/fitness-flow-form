import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, limit, doc, getDoc, deleteDoc, where, updateDoc } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import type { FormData } from '@/contexts/FormContext';
import { getDb } from '@/services/firebase';
import { summarizeScores } from '@/lib/scoring';
import { validateOrganizationId } from '@/lib/utils/validateOrganizationId';
import type { UserProfile } from '@/types/auth';

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

const coachAssessmentsCollection = (coachUid: string) =>
  collection(getDb(), 'coaches', coachUid, 'assessments');

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
  
  // 2. ALSO update/create a summary in the flat assessments collection for the dashboard
  // Pre-calculate scores summary for dashboard performance
  const scoresSummary = summarizeScores(formData);
  
  // Create assessment summary document and capture the actual Firestore document ID
  const docRef = await addDoc(collection(getDb(), 'coaches', coachUid, 'assessments'), {
    clientName: name,
    clientNameLower: name.toLowerCase(),
    createdAt: serverTimestamp(),
    coachUid,
    coachEmail: coachEmail || null,
    organizationId: validOrgId, // Use validated organizationId (never null)
    overallScore,
    goals: Array.isArray(formData.clientGoals) ? formData.clientGoals : [],
    formData: formData, // Include full data so it can be reopened from dashboard
    scoresSummary,
    isSummary: true 
  });
  
  // Update public report if one exists (keeps shared links live)
  // Note: This is non-blocking - if public report update fails, assessment save still succeeds
  try {
    const { publishPublicReport } = await import('./publicReports');
    await publishPublicReport({
      coachUid,
      assessmentId: docRef.id,
      formData,
      organizationId: validOrgId,
    });
  } catch (err) {
    // Non-blocking: public report update failure shouldn't block assessment save
    const { logger } = await import('@/lib/utils/logger');
    logger.warn('Failed to update public report after assessment save:', err);
  }
  
  // Return the actual Firestore document ID for reliable navigation and report loading
  return docRef.id;
}

export async function listCoachAssessments(
  coachUid: string,
  max = 100,
  organizationId?: string,
): Promise<CoachAssessmentSummary[]> {
  let q;
  if (organizationId) {
    // If we have an organizationId, we filter by it.
    // In a full SaaS model, we might query a top-level 'assessments' collection
    // but for now we're keeping the coach-centric structure.
    q = query(
      coachAssessmentsCollection(coachUid),
      where('organizationId', '==', organizationId),
      orderBy('createdAt', 'desc'),
      limit(max),
    );
  } else {
    q = query(
      coachAssessmentsCollection(coachUid),
      orderBy('createdAt', 'desc'),
      limit(max),
    );
  }

  const snap = await getDocs(q);
  const items: CoachAssessmentSummary[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Partial<CoachAssessmentDoc>;
    items.push({
      id: docSnap.id,
      clientName: data.clientName || 'Unnamed client',
      createdAt: (data.createdAt as Timestamp | undefined) ?? null,
      overallScore: typeof data.overallScore === 'number' ? data.overallScore : 0,
      goals: Array.isArray(data.goals) ? data.goals : [],
      scoresSummary: data.scoresSummary,
    });
  });
  return items;
}

export async function getCoachAssessment(
  coachUid: string,
  assessmentId: string,
  clientName?: string
): Promise<{ formData: FormData; overallScore: number; goals: string[] } | null> {
  const db = getDb();
  
  // 0. Handle "latest" keyword for the live merged report
  if (assessmentId === 'latest' && clientName) {
    const { getCurrentAssessment } = await import('./assessmentHistory');
    const current = await getCurrentAssessment(coachUid, clientName);
    if (current) {
      return {
        formData: current.formData,
        overallScore: current.overallScore,
        goals: Array.isArray(current.formData.clientGoals) ? current.formData.clientGoals : [],
      };
    }
  }

  // 1. Try the specific assessment document (summary or full)
  const ref = doc(db, 'coaches', coachUid, 'assessments', assessmentId);
  const snap = await getDoc(ref);
  
  if (snap.exists()) {
    const data = snap.data() as {
      formData?: FormData;
      overallScore?: number;
      goals?: string[];
      clientName?: string;
    };
    
    // If it has formData, we're good
    if (data.formData) {
      return {
        formData: data.formData as FormData,
        overallScore: typeof data.overallScore === 'number' ? data.overallScore : 0,
        goals: Array.isArray(data.goals) ? data.goals : [],
      };
    }
    
    // If it's a summary WITHOUT formData, try to find the full data
    const resolvedName = clientName || data.clientName;
    if (resolvedName) {
      const { getCurrentAssessment, getSnapshots } = await import('./assessmentHistory');
      
      // Try to find a snapshot that might match this summary's timestamp? 
      // Or just fall back to current if it's the latest
      const current = await getCurrentAssessment(coachUid, resolvedName);
      if (current) {
        return {
          formData: current.formData,
          overallScore: current.overallScore,
          goals: Array.isArray(current.formData.clientGoals) ? current.formData.clientGoals : [],
        };
      }
    }
  }

  // 2. Try the client's snapshots collection if assessmentId might be a snapshot ID
  if (clientName) {
    const { getSnapshots } = await import('./assessmentHistory');
    const snapshots = await getSnapshots(coachUid, clientName);
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
): Promise<void> {
  const ref = doc(getDb(), 'coaches', coachUid, 'assessments', assessmentId);
  await deleteDoc(ref);
}

export async function getClientAssessments(
  coachUid: string,
  clientName: string,
  organizationId?: string,
): Promise<CoachAssessmentSummary[]> {
  let q;
  if (organizationId) {
    q = query(
      coachAssessmentsCollection(coachUid),
      where('clientNameLower', '==', clientName.toLowerCase()),
      where('organizationId', '==', organizationId),
      orderBy('createdAt', 'desc'),
    );
  } else {
    q = query(
      coachAssessmentsCollection(coachUid),
      where('clientNameLower', '==', clientName.toLowerCase()),
      orderBy('createdAt', 'desc'),
    );
  }
  const snap = await getDocs(q);
  const items: CoachAssessmentSummary[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Partial<CoachAssessmentDoc>;
    items.push({
      id: docSnap.id,
      clientName: data.clientName || 'Unnamed client',
      createdAt: (data.createdAt as Timestamp | undefined) ?? null,
      overallScore: typeof data.overallScore === 'number' ? data.overallScore : 0,
      goals: Array.isArray(data.goals) ? data.goals : [],
      scoresSummary: data.scoresSummary,
    });
  });
  return items;
}

export async function getAllClients(coachUid: string, organizationId?: string): Promise<string[]> {
  let q;
  if (organizationId) {
    q = query(
      coachAssessmentsCollection(coachUid), 
      where('organizationId', '==', organizationId),
      orderBy('createdAt', 'desc')
    );
  } else {
    q = query(
      coachAssessmentsCollection(coachUid), 
      orderBy('createdAt', 'desc')
    );
  }
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
  const current = await getCurrentAssessment(coachUid, finalName);
  
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
  
  // 3. Update summary for dashboard and capture the actual Firestore document ID
  const docRef = await addDoc(collection(getDb(), 'coaches', coachUid, 'assessments'), {
    clientName: finalName,
    clientNameLower: finalName.toLowerCase(),
    createdAt: serverTimestamp(),
    coachUid,
    coachEmail: coachEmail || null,
    organizationId: validOrgId,
    overallScore,
    goals: Array.isArray(mergedFormData.clientGoals) ? mergedFormData.clientGoals : [],
    formData: mergedFormData, // Include merged data for this point in time
    scoresSummary,
    category,
    isPartial: true
  });
  
  // Update public report if one exists (keeps shared links live)
  // Note: This is non-blocking - if public report update fails, assessment save still succeeds
  try {
    const { publishPublicReport } = await import('./publicReports');
    await publishPublicReport({
      coachUid,
      assessmentId: docRef.id,
      formData: mergedFormData,
      organizationId: validOrgId,
    });
  } catch (err) {
    // Non-blocking: public report update failure shouldn't block assessment save
    const { logger } = await import('@/lib/utils/logger');
    logger.warn('Failed to update public report after partial assessment save:', err);
  }
  
  // Return the actual Firestore document ID for reliable navigation and report loading
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
): Promise<void> {
  const db = getDb();
  const ref = doc(db, 'coaches', coachUid, 'assessments', assessmentId);
  
  // Get the existing document to preserve createdAt
  const existingDoc = await getDoc(ref);
  if (!existingDoc.exists()) {
    throw new Error('Assessment not found');
  }
  
  const existingData = existingDoc.data() as CoachAssessmentDoc;
  const scoresSummary = summarizeScores(formData);
  
  // Update the document while preserving createdAt
  await updateDoc(ref, {
    clientName: (formData.fullName || 'Unnamed client').trim(),
    clientNameLower: (formData.fullName || 'Unnamed client').trim().toLowerCase(),
    overallScore,
    goals: Array.isArray(formData.clientGoals) ? formData.clientGoals : [],
    formData: formData,
    scoresSummary,
    organizationId: organizationId || existingData.organizationId || null,
    // Note: createdAt is NOT included here, so it will be preserved
  });
  
  // Also update the current assessment in the history system
  const clientName = (formData.fullName || 'Unnamed client').trim();
  const { updateCurrentAssessment } = await import('./assessmentHistory');
  await updateCurrentAssessment(coachUid, clientName, formData, overallScore, 'full', 'all', organizationId || existingData.organizationId || undefined);
  
  // Update public report if one exists (keeps shared links live)
  try {
    const { publishPublicReport } = await import('./publicReports');
    await publishPublicReport({
      coachUid,
      assessmentId,
      formData,
      organizationId: organizationId || existingData.organizationId || undefined,
    });
  } catch (err) {
    // Non-blocking: public report update failure shouldn't block assessment update
    const { logger } = await import('@/lib/utils/logger');
    logger.warn('Failed to update public report after assessment update:', err);
  }
}


