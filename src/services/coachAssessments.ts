import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, limit, doc, getDoc, deleteDoc, where } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import type { FormData } from '@/contexts/FormContext';
import { getDb } from '@/lib/firebase';

export type CoachAssessmentSummary = {
  id: string;
  clientName: string;
  createdAt: Timestamp | null;
  overallScore: number;
  goals: string[];
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
};

const coachAssessmentsCollection = (coachUid: string) =>
  collection(getDb(), 'coaches', coachUid, 'assessments');

export async function saveCoachAssessment(
  coachUid: string,
  coachEmail: string | null | undefined,
  formData: FormData,
  overallScore: number,
): Promise<string> {
  const name = (formData.fullName || 'Unnamed client').trim();
  
  // 1. Use new assessment history system (the deep structure)
  const { updateCurrentAssessment } = await import('./assessmentHistory');
  await updateCurrentAssessment(coachUid, name, formData, overallScore, 'full', 'all');
  
  // 2. ALSO update/create a summary in the flat assessments collection for the dashboard
  // We use a consistent ID based on the client name to keep the dashboard tidy
  const assessmentId = `${name.toLowerCase().replace(/\s+/g, '-')}-latest`;
  const summaryRef = doc(getDb(), 'coaches', coachUid, 'assessments', assessmentId);
  
  await addDoc(collection(getDb(), 'coaches', coachUid, 'assessments'), {
    clientName: name,
    clientNameLower: name.toLowerCase(),
    createdAt: serverTimestamp(),
    coachUid,
    coachEmail: coachEmail || null,
    overallScore,
    goals: Array.isArray(formData.clientGoals) ? formData.clientGoals : [],
    formData: formData, // Include full data so it can be reopened from dashboard
    isSummary: true 
  });
  
  // Return a consistent ID for the current assessment
  return `${coachUid}-${name.toLowerCase().replace(/\s+/g, '-')}-current`;
}

export async function listCoachAssessments(
  coachUid: string,
  max = 100,
): Promise<CoachAssessmentSummary[]> {
  const q = query(
    coachAssessmentsCollection(coachUid),
    orderBy('createdAt', 'desc'),
    limit(max),
  );
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
    const data = snap.data();
    
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
): Promise<CoachAssessmentSummary[]> {
  const q = query(
    coachAssessmentsCollection(coachUid),
    where('clientNameLower', '==', clientName.toLowerCase()),
    orderBy('createdAt', 'desc'),
  );
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
    });
  });
  return items;
}

export async function getAllClients(coachUid: string): Promise<string[]> {
  const q = query(coachAssessmentsCollection(coachUid), orderBy('createdAt', 'desc'));
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
): Promise<string> {
  const finalName = (clientName || formData.fullName || 'Unnamed client').trim();
  
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
  await updateCurrentAssessment(coachUid, finalName, mergedFormData, overallScore, changeType, category);
  
  // 3. Update summary for dashboard
  await addDoc(collection(getDb(), 'coaches', coachUid, 'assessments'), {
    clientName: finalName,
    clientNameLower: finalName.toLowerCase(),
    createdAt: serverTimestamp(),
    coachUid,
    coachEmail: coachEmail || null,
    overallScore,
    goals: Array.isArray(mergedFormData.clientGoals) ? mergedFormData.clientGoals : [],
    formData: mergedFormData, // Include merged data for this point in time
    category,
    isPartial: true
  });
  
  // Return consistent ID
  return `${coachUid}-${finalName.toLowerCase().replace(/\s+/g, '-')}-current`;
}


