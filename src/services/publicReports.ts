import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import type { FormData } from '@/contexts/FormContext';
import { getDb } from '@/lib/firebase';
import { sanitizeForFirestore } from '@/lib/utils/firebaseUtils';

export type PublicReportDoc = {
  coachUid: string;
  assessmentId: string;
  organizationId?: string; // SaaS readiness
  clientName: string;
  clientNameLower: string;
  visibility: 'public' | 'private';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  formData: FormData;
};

const collectionName = 'publicReports';

const publicReportId = (coachUid: string, assessmentId: string) =>
  `${coachUid}__${assessmentId}`;

export async function publishPublicReport(params: {
  coachUid: string;
  assessmentId: string;
  formData: FormData;
  visibility?: 'public' | 'private';
  organizationId?: string;
}): Promise<string> {
  const { coachUid, assessmentId, formData, visibility = 'public', organizationId } = params;
  const id = publicReportId(coachUid, assessmentId);
  const ref = doc(getDb(), collectionName, id);
  const snapshot = await getDoc(ref);

  const payload = {
    coachUid,
    assessmentId,
    organizationId: organizationId || null,
    clientName: (formData.fullName || 'Unnamed client').trim(),
    clientNameLower: (formData.fullName || 'Unnamed client').toLowerCase(),
    visibility,
    formData: sanitizeForFirestore(formData),
    updatedAt: serverTimestamp(),
    ...(snapshot.exists() ? {} : { createdAt: serverTimestamp() }),
  };

  await setDoc(ref, payload, { merge: true });
  console.log(`[SHARE] ✓ Public report published to: ${ref.path}`);
  return id;
}

export async function getPublicReport(params: {
  coachUid: string;
  assessmentId: string;
}): Promise<PublicReportDoc | null> {
  const { coachUid, assessmentId } = params;
  const id = publicReportId(coachUid, assessmentId);
  const ref = doc(getDb(), collectionName, id);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  return snapshot.data() as PublicReportDoc;
}








