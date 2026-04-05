import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc, query, where, limit, getDocs, onSnapshot } from 'firebase/firestore';
import type { Timestamp, Unsubscribe } from 'firebase/firestore';
import type { FormData } from '@/contexts/FormContext';
import { getDb, getFirebaseAuth } from '@/services/firebase';
import { sanitizeForFirestore } from '@/lib/utils/firebaseUtils';
import { COLLECTIONS } from '@/constants/collections';
import { logger } from '@/lib/utils/logger';
import { validateOrganizationId } from '@/lib/utils/validateOrganizationId';
import type { UserProfile } from '@/types/auth';
import { computeScores } from '@/lib/scoring';
import type { SocialShareArtifacts } from '@/constants/socialShareArtifacts';

export interface SnapshotSummary {
  id: string;
  score: number;
  date: Timestamp;
  type: string;
}

/**
 * Root document at `publicReports/{shareToken}` with `allow read: if true` in Firestore rules.
 * Anyone with the URL can read these fields — keep coach-only ops data out of the client UI.
 * `formData` is sanitized before publish (see `sanitizeFormDataForPublic`); `coachUid` is for
 * rule enforcement (coach writes) and must not be shown on public report pages.
 */
export type PublicReportDoc = {
  shareToken: string;
  coachUid: string;
  assessmentId: string;
  organizationId?: string;
  clientName: string;
  clientNameLower: string;
  visibility: 'public' | 'private';
  revoked?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt?: Timestamp | null;
  formData: FormData;
  previousFormData?: FormData;
  snapshotSummaries?: SnapshotSummary[];
  /** AI-generated 2-sentence progress summary — written after coach first shares the report */
  changeNarrative?: string;
  /** Denormalized at publish for server-side share graphics (no scoring port to Functions). */
  latestOverallScore?: number;
  /** Server-generated PNG URLs (signed); see generatePublicReportSocialShareArtifacts. */
  socialShareArtifacts?: SocialShareArtifacts;
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
  profile?: UserProfile | null;
  /** Snapshot type label written to the history subcollection. Defaults to 'full-assessment'. */
  snapshotType?: string;
}): Promise<string> {
  const { coachUid, assessmentId, formData, visibility = 'public', organizationId, profile, snapshotType = 'full-assessment' } = params;
  
  // Validate organizationId before proceeding
  // If updating existing report, verify ownership
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
  let existingReport: PublicReportDoc | null = null;

  if (!existingSnapshot.empty) {
    // Reuse existing token
    const existingDoc = existingSnapshot.docs[0];
    shareToken = existingDoc.id;
    existingReport = {
      shareToken: existingDoc.id,
      ...existingDoc.data(),
    } as PublicReportDoc;
    
    // Verify ownership: if existing report has orgId, validate it matches
    if (existingReport.organizationId) {
      const validOrgId = validateOrganizationId(organizationId || existingReport.organizationId, profile);
      if (existingReport.organizationId !== validOrgId) {
        throw new Error('Cannot update report: Organization mismatch. This report belongs to a different organization.');
      }
    }
  } else {
    // Generate new secure token
    shareToken = generateShareToken();
    isNew = true;
  }

  // Validate organizationId for new reports or when updating
  const validOrgId = validateOrganizationId(organizationId || existingReport?.organizationId, profile);

  const ref = doc(getDb(), COLLECTIONS.PUBLIC_REPORTS, shareToken);
  const snapshot = await getDoc(ref);

  const safeFormData = sanitizeFormDataForPublic(formData);
  const latestOverallScore = computeScores(safeFormData).overall;

  // Capture previous formData for score change animations on the client viewer
  let previousFormData: FormData | undefined;
  if (snapshot.exists()) {
    const existingData = snapshot.data();
    if (existingData?.formData) {
      previousFormData = existingData.formData as FormData;
    }
  }

  const payload = {
    coachUid,
    assessmentId,
    organizationId: validOrgId, // Use validated organizationId (never null)
    clientName: (safeFormData.fullName || 'Unnamed client').trim(),
    clientNameLower: (safeFormData.fullName || 'Unnamed client').toLowerCase(),
    visibility,
    formData: sanitizeForFirestore(safeFormData) as FormData,
    latestOverallScore,
    updatedAt: serverTimestamp(),
    expiresAt: null, // No expiry by default
    ...(previousFormData ? { previousFormData: sanitizeForFirestore(previousFormData) as FormData } : {}),
    ...(isNew && !snapshot.exists() ? { createdAt: serverTimestamp() } : {}),
  } as Omit<PublicReportDoc, 'shareToken' | 'createdAt' | 'updatedAt'> & {
    createdAt?: ReturnType<typeof serverTimestamp>;
    updatedAt: ReturnType<typeof serverTimestamp>;
  };

  await setDoc(ref, payload, { merge: true });

  // Write snapshot to subcollection for version history (requires active auth)
  const currentUser = getFirebaseAuth().currentUser;
  if (currentUser) {
    try {
      const overallScore = latestOverallScore;
      const snapshotId = `${assessmentId}_${Date.now()}`;
      const snapshotRef = doc(getDb(), COLLECTIONS.PUBLIC_REPORTS, shareToken, COLLECTIONS.PUBLIC_REPORT_SNAPSHOTS, snapshotId);
      await setDoc(snapshotRef, sanitizeForFirestore({
        schemaVersion: 1,
        formData: safeFormData,
        overallScore,
        timestamp: serverTimestamp(),
        type: snapshotType,
      }));

      // Update snapshotSummaries on the main doc (capped at 50)
      const existingSummaries: SnapshotSummary[] = snapshot.exists()
        ? (snapshot.data()?.snapshotSummaries ?? [])
        : [];
      const newSummary: SnapshotSummary = {
        id: snapshotId,
        score: overallScore,
        date: serverTimestamp() as unknown as Timestamp,
        type: snapshotType,
      };
      const updatedSummaries = [newSummary, ...existingSummaries].slice(0, 50);
      await setDoc(ref, { snapshotSummaries: updatedSummaries }, { merge: true });
    } catch (snapErr) {
      logger.warn('[publishPublicReport] Failed to write snapshot subcollection', snapErr);
    }
  }

  return shareToken;
}

/**
 * Fetch paginated snapshots from the public report snapshots subcollection
 */
export async function getPublicSnapshot(
  token: string,
  snapshotId: string,
): Promise<{ formData: FormData; overallScore: number } | null> {
  try {
    const ref = doc(getDb(), COLLECTIONS.PUBLIC_REPORTS, token, COLLECTIONS.PUBLIC_REPORT_SNAPSHOTS, snapshotId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      formData: data.formData as FormData,
      overallScore: typeof data.overallScore === 'number' ? data.overallScore : 0,
    };
  } catch (err) {
    logger.error('[getPublicSnapshot] Error:', err);
    return null;
  }
}

/**
 * Subscribe to a public report document by token (real-time updates).
 * Returns an unsubscribe function. Callback receives the doc or null if missing/invalid.
 */
export function subscribeToPublicReport(
  token: string,
  onData: (data: PublicReportDoc | null) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const ref = doc(getDb(), COLLECTIONS.PUBLIC_REPORTS, token);
  return onSnapshot(
    ref,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      const data = snapshot.data() as Omit<PublicReportDoc, 'shareToken'>;
      if (data.expiresAt && data.expiresAt.toMillis() < Date.now()) {
        onData(null);
        return;
      }
      if (data.visibility !== 'public') {
        onData(null);
        return;
      }
      onData({ shareToken: token, ...data } as PublicReportDoc);
    },
    (err) => {
      logger.error('[subscribeToPublicReport] Error:', err);
      onError?.(err);
      onData(null);
    },
  );
}

/**
 * Get a public report by its secure token
 */
export async function getPublicReportByToken(token: string): Promise<PublicReportDoc | null> {
  const ref = doc(getDb(), COLLECTIONS.PUBLIC_REPORTS, token);
  try {
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      logger.warn(`[getPublicReportByToken] Document does not exist: ${token}`);
      return null;
    }
  
    const data = snapshot.data() as Omit<PublicReportDoc, 'shareToken'>;
  
    // Check if report is expired
    if (data.expiresAt && data.expiresAt.toMillis() < Date.now()) {
      logger.warn(`[getPublicReportByToken] Report expired: ${token}`);
      return null; // Report has expired
    }
  
    // Check visibility
    if (data.visibility !== 'public') {
      logger.warn(`[getPublicReportByToken] Report not public: ${data.visibility}`);
      return null; // Report is not public
    }
    
    return {
      shareToken: token,
      ...data,
    } as PublicReportDoc;
  } catch (err) {
    logger.error(`[getPublicReportByToken] Error fetching doc:`, err);
    throw err;
  }
}

export interface LifestyleCheckinPayload {
  activityLevel?: string;
  sleepArchetype?: string;
  stressLevel?: string;
  nutritionHabits?: string;
  hydrationHabits?: string;
  stepsPerDay?: string;
}

/**
 * Submit a lifestyle check-in for a token-scoped public report.
 * Writes to publicReports/{token}/lifestyleCheckins.
 */
export async function submitLifestyleCheckin(
  token: string,
  payload: LifestyleCheckinPayload,
): Promise<string> {
  const colRef = collection(getDb(), COLLECTIONS.PUBLIC_REPORTS, token, COLLECTIONS.LIFESTYLE_CHECKINS);
  const docRef = await addDoc(colRef, {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}




