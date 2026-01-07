import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, limit, getDocs } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import type { FormData } from '@/contexts/FormContext';
import { getDb } from '@/services/firebase';
import { sanitizeForFirestore } from '@/lib/utils/firebaseUtils';

export type PublicReportDoc = {
  shareToken: string; // UUID token used as document ID
  coachUid: string;
  assessmentId: string;
  organizationId?: string; // SaaS readiness
  clientName: string;
  clientNameLower: string;
  visibility: 'public' | 'private';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt?: Timestamp | null; // Optional expiry
  formData: FormData;
};

const collectionName = 'publicReports';

/**
 * Generate a secure random token for public report sharing
 * Uses crypto.randomUUID() for cryptographically secure tokens
 */
function generateShareToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Publish a public report with a secure token-based URL
 * Returns the shareToken that can be used in /r/:token route
 */
export async function publishPublicReport(params: {
  coachUid: string;
  assessmentId: string;
  formData: FormData;
  visibility?: 'public' | 'private';
  organizationId?: string;
}): Promise<string> {
  const { coachUid, assessmentId, formData, visibility = 'public', organizationId } = params;
  
  // Check if a public report already exists for this assessment
  // We'll query by assessmentId to find existing token
  const existingQuery = query(
    collection(getDb(), collectionName),
    where('coachUid', '==', coachUid),
    where('assessmentId', '==', assessmentId),
    where('visibility', '==', 'public'),
    limit(1)
  );
  
  const existingSnapshot = await getDocs(existingQuery);

  let shareToken: string;
  let isNew = false;

  if (!existingSnapshot.empty) {
    // Reuse existing token
    const existingDoc = existingSnapshot.docs[0];
    shareToken = existingDoc.id;
  } else {
    // Generate new secure token
    shareToken = generateShareToken();
    isNew = true;
  }

  const ref = doc(getDb(), collectionName, shareToken);
  const snapshot = await getDoc(ref);

  const payload = {
    coachUid,
    assessmentId,
    organizationId: organizationId || null,
    clientName: (formData.fullName || 'Unnamed client').trim(),
    clientNameLower: (formData.fullName || 'Unnamed client').toLowerCase(),
    visibility,
    formData: sanitizeForFirestore(formData) as FormData,
    updatedAt: serverTimestamp(),
    expiresAt: null, // No expiry by default
    ...(isNew && !snapshot.exists() ? { createdAt: serverTimestamp() } : {}),
  } as Omit<PublicReportDoc, 'shareToken' | 'createdAt' | 'updatedAt'> & {
    createdAt?: ReturnType<typeof serverTimestamp>;
    updatedAt: ReturnType<typeof serverTimestamp>;
  };

  await setDoc(ref, payload, { merge: true });
  return shareToken;
}

/**
 * Get a public report by its secure token
 * This is the secure way to access public reports
 */
export async function getPublicReportByToken(token: string): Promise<PublicReportDoc | null> {
  const ref = doc(getDb(), collectionName, token);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  
  const data = snapshot.data() as Omit<PublicReportDoc, 'shareToken'>;
  
  // Check if report is expired
  if (data.expiresAt && data.expiresAt.toMillis() < Date.now()) {
    return null; // Report has expired
  }
  
  // Check visibility
  if (data.visibility !== 'public') {
    return null; // Report is not public
  }
  
  return {
    shareToken: token,
    ...data,
  } as PublicReportDoc;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use getPublicReportByToken instead
 */
export async function getPublicReport(params: {
  coachUid: string;
  assessmentId: string;
}): Promise<PublicReportDoc | null> {
  const { coachUid, assessmentId } = params;
  const q = query(
    collection(getDb(), collectionName),
    where('coachUid', '==', coachUid),
    where('assessmentId', '==', assessmentId),
    where('visibility', '==', 'public'),
    limit(1)
  );
  
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) return null;
  
  const docSnap = snapshot.docs[0];
  const data = docSnap.data() as Omit<PublicReportDoc, 'shareToken'>;
  
  return {
    shareToken: docSnap.id,
    ...data,
  } as PublicReportDoc;
}




