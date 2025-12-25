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
  const goals = Array.isArray(formData.clientGoals) ? formData.clientGoals : [];

  const payload: Omit<CoachAssessmentDoc, 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> } = {
    clientName: name,
    clientNameLower: name.toLowerCase(),
    createdAt: serverTimestamp(),
    coachUid,
    coachEmail: coachEmail ?? null,
    overallScore,
    goals,
    formData,
  };

  const ref = await addDoc(coachAssessmentsCollection(coachUid), payload);
  return ref.id;
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
): Promise<{ formData: FormData; overallScore: number; goals: string[] } | null> {
  const ref = doc(getDb(), 'coaches', coachUid, 'assessments', assessmentId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as Partial<CoachAssessmentDoc>;
  return {
    formData: (data.formData as FormData) ?? ({} as FormData),
    overallScore: typeof data.overallScore === 'number' ? data.overallScore : 0,
    goals: Array.isArray(data.goals) ? data.goals : [],
  };
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


