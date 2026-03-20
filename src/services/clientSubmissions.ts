/**
 * Client Submissions Service
 * 
 * Handles CRUD for client self-service captures.
 * Collection: organizations/{orgId}/clientSubmissions/{clientUid}/items/{submissionId}
 */

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  type Unsubscribe,
  onSnapshot,
} from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { logger } from '@/lib/utils/logger';
import type { AnySubmission, SubmissionType } from '@/types/submissions';
import type { FormData } from '@/contexts/FormContext';
import { ORGANIZATION } from '@/lib/database/paths';

function submissionsRef(organizationId: string, clientUid: string) {
  return collection(
    getDb(),
    ORGANIZATION.clientSubmissions.itemsCollection(organizationId, clientUid),
  );
}

/**
 * Save a body composition scan submission
 */
export async function saveBodyCompSubmission(
  clientUid: string,
  organizationId: string,
  imageUrl: string,
  extractedData: Partial<FormData>,
  ocrConfidence: number
): Promise<string> {
  const ref = submissionsRef(organizationId, clientUid);
  
  const submission = {
    clientUid,
    organizationId,
    type: 'body_comp_scan' as const,
    status: 'pending' as const,
    createdAt: serverTimestamp(),
    imageUrl,
    extractedData,
    ocrConfidence,
  };

  const docRef = await addDoc(ref, submission);
  logger.info('[Submissions] Body comp scan saved', { id: docRef.id });
  return docRef.id;
}

/**
 * Save posture image submission
 */
export async function savePostureSubmission(
  clientUid: string,
  organizationId: string,
  images: { front?: string; right?: string; back?: string; left?: string },
  viewCount: number
): Promise<string> {
  const ref = submissionsRef(organizationId, clientUid);
  
  const submission = {
    clientUid,
    organizationId,
    type: 'posture_images' as const,
    status: 'pending' as const,
    createdAt: serverTimestamp(),
    images,
    viewCount,
  };

  const docRef = await addDoc(ref, submission);
  logger.info('[Submissions] Posture images saved', { id: docRef.id });
  return docRef.id;
}

/**
 * Save lifestyle check-in submission
 */
export async function saveLifestyleSubmission(
  clientUid: string,
  organizationId: string,
  responses: Partial<FormData>
): Promise<string> {
  const ref = submissionsRef(organizationId, clientUid);
  
  const submission = {
    clientUid,
    organizationId,
    type: 'lifestyle_checkin' as const,
    status: 'pending' as const,
    createdAt: serverTimestamp(),
    responses,
  };

  const docRef = await addDoc(ref, submission);
  logger.info('[Submissions] Lifestyle check-in saved', { id: docRef.id });
  return docRef.id;
}

/**
 * Get recent submissions for a client
 */
export async function getClientSubmissions(
  clientUid: string,
  organizationId: string,
  typeFilter?: SubmissionType,
  maxResults = 20
): Promise<AnySubmission[]> {
  const ref = submissionsRef(organizationId, clientUid);

  let q = query(ref, orderBy('createdAt', 'desc'), limit(maxResults));
  if (typeFilter) {
    q = query(ref, where('type', '==', typeFilter), orderBy('createdAt', 'desc'), limit(maxResults));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as AnySubmission[];
}

/**
 * Subscribe to real-time submissions for a client (used by coach review UI)
 */
export function subscribeToSubmissions(
  clientUid: string,
  organizationId: string,
  onUpdate: (submissions: AnySubmission[]) => void,
  statusFilter?: 'pending' | 'reviewed'
): Unsubscribe {
  const ref = submissionsRef(organizationId, clientUid);

  let q = query(ref, orderBy('createdAt', 'desc'), limit(20));
  if (statusFilter) {
    q = query(ref, where('status', '==', statusFilter), orderBy('createdAt', 'desc'), limit(20));
  }

  return onSnapshot(q, (snapshot) => {
    const submissions = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as AnySubmission[];
    onUpdate(submissions);
  });
}
