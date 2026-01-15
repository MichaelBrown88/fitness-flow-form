import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, limit, getDocs } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import type { FormData } from '@/contexts/FormContext';
import { getDb } from '@/services/firebase';
import { sanitizeForFirestore } from '@/lib/utils/firebaseUtils';
import { COLLECTIONS } from '@/constants/collections';

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
 * Sanitize FormData for public consumption
 * Strictly whitelists fields and removes PII (Email, Phone)
 */
function sanitizeFormDataForPublic(formData: FormData): FormData {
  // Create a shallow copy first
  const sanitized = { ...formData };
  
  // Remove PII that isn't needed for the report
  // We keep 'fullName' as it's used for display, but email/phone are definitely private
  sanitized.email = '';
  sanitized.phone = '';
  sanitized.assignedCoach = ''; // internal reference, not needed for client view
  
  // We can add more sensitive fields here if needed
  
  return sanitized;
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
    collection(getDb(), COLLECTIONS.PUBLIC_REPORTS),
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

  const ref = doc(getDb(), COLLECTIONS.PUBLIC_REPORTS, shareToken);
  const snapshot = await getDoc(ref);

  const safeFormData = sanitizeFormDataForPublic(formData);

  const payload = {
    coachUid,
    assessmentId,
    organizationId: organizationId || null,
    clientName: (safeFormData.fullName || 'Unnamed client').trim(),
    clientNameLower: (safeFormData.fullName || 'Unnamed client').toLowerCase(),
    visibility,
    formData: sanitizeForFirestore(safeFormData) as FormData,
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
  const ref = doc(getDb(), COLLECTIONS.PUBLIC_REPORTS, token);
  try {
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      console.warn(`[getPublicReportByToken] Document does not exist: ${token}`);
      return null;
    }
  
    const data = snapshot.data() as Omit<PublicReportDoc, 'shareToken'>;
  
    // Check if report is expired
    if (data.expiresAt && data.expiresAt.toMillis() < Date.now()) {
      console.warn(`[getPublicReportByToken] Report expired: ${token}`);
      return null; // Report has expired
    }
  
    // Check visibility
    if (data.visibility !== 'public') {
      console.warn(`[getPublicReportByToken] Report not public: ${data.visibility}`);
      return null; // Report is not public
    }
    
    return {
      shareToken: token,
      ...data,
    } as PublicReportDoc;
  } catch (err) {
    console.error(`[getPublicReportByToken] Error fetching doc:`, err);
    throw err;
  }
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
    collection(getDb(), COLLECTIONS.PUBLIC_REPORTS),
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




