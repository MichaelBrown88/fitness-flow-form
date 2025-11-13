import { getDb } from '@/lib/firebase';
import { addDoc, collection, doc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { FormData } from '@/contexts/FormContext';
import type { AssessmentResult } from '@/lib/assessmentLogic';
import { generateAssessmentResults } from '@/lib/assessmentLogic';

export type AssessmentRecord = {
  id: string;
  createdAt: Timestamp | null;
  input: FormData;
  computedResult: AssessmentResult;
};

export async function createAssessment(input: FormData, computedResult: AssessmentResult): Promise<string> {
  const db = getDb();
  const ref = await addDoc(collection(db, 'assessments'), {
    createdAt: serverTimestamp(),
    input,
    computedResult,
  });
  return ref.id;
}

export async function getAssessmentById(id: string): Promise<AssessmentRecord | null> {
  // Local fallback for dev without Firebase
  if (id.startsWith('local-')) {
    try {
      const raw = sessionStorage.getItem(`assessments:${id}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { createdAt?: string; input: FormData; computedResult?: AssessmentResult; computed?: unknown };
      const computedResult: AssessmentResult = parsed.computedResult
        ? parsed.computedResult
        : (parsed.computed as AssessmentResult) || generateAssessmentResults(parsed.input);
      return {
        id,
        createdAt: null,
        input: parsed.input,
        computedResult,
      };
    } catch {
      return null;
    }
  }

  const db = getDb();
  const snapshot = await getDoc(doc(db, 'assessments', id));
  if (!snapshot.exists()) return null;
  const data = snapshot.data() as { createdAt?: Timestamp; input: FormData; computedResult?: AssessmentResult; computed?: unknown };
  const computedResult: AssessmentResult = data.computedResult
    ? data.computedResult
    : (data.computed as AssessmentResult) || generateAssessmentResults(data.input);
  return {
    id: snapshot.id,
    createdAt: data.createdAt ?? null,
    input: data.input,
    computedResult,
  };
}

export function saveLocalAssessment(input: FormData, computedResult: AssessmentResult): string {
  const id = `local-${Date.now()}`;
  const payload = { createdAt: new Date().toISOString(), input, computedResult };
  try {
    sessionStorage.setItem(`assessments:${id}`, JSON.stringify(payload));
  } catch {
    // ignore quota errors
  }
  return id;
}


