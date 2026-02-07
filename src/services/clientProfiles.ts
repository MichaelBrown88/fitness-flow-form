import { doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot, Timestamp } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { validateOrganizationId } from '@/lib/utils/validateOrganizationId';
import type { UserProfile } from '@/types/auth';
import { ORGANIZATION } from '@/lib/database/paths';
import type { PillarCadence } from '@/types/client';

/**
 * Retest schedule stored with client profile
 * Stored as Firestore-compatible structure (dates as Timestamps)
 */
export interface StoredRetestSchedule {
  /** Auto-generated recommendations from assessment */
  recommended: PillarCadence;
  /** Coach overrides (takes precedence) */
  custom?: Partial<PillarCadence>;
  /** When recommendations were generated */
  generatedAt: Timestamp;
  /** Assessment ID that generated these recommendations */
  sourceAssessmentId: string;
}

export type ClientProfile = {
  clientName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  notes?: string;
  tags?: string[];
  status?: 'active' | 'inactive' | 'on-hold';
  organizationId?: string;
  assignedCoachUid?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastAssessmentDate?: Timestamp;
  lastInBodyDate?: Timestamp;
  lastPostureDate?: Timestamp;
  lastFitnessDate?: Timestamp;
  lastStrengthDate?: Timestamp;
  lastLifestyleDate?: Timestamp;
  /** Smart retest cadence schedule */
  retestSchedule?: StoredRetestSchedule;
};

/**
 * Get a client document reference using organization path
 * Client ID is derived from client name (lowercase, hyphenated)
 */
const clientProfileDoc = (orgId: string, clientName: string) => {
  const clientId = clientName.toLowerCase().replace(/\s+/g, '-');
  return doc(getDb(), ORGANIZATION.clients.doc(orgId, clientId));
};

/**
 * Get a client profile
 * @param coachUid - The coach's user ID (kept for backwards compatibility)
 * @param clientName - The client's name
 * @param organizationId - Required: The organization ID for path construction
 */
export async function getClientProfile(
  coachUid: string,
  clientName: string,
  organizationId?: string,
): Promise<ClientProfile | null> {
  if (!organizationId) {
    return null;
  }

  const ref = clientProfileDoc(organizationId, clientName);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as ClientProfile;

  // Verify organization ownership
  if (data.organizationId && data.organizationId !== organizationId) {
    return null;
  }

  return data;
}

/**
 * Create or update a client profile
 * @param coachUid - The coach's user ID (used for assignedCoachUid)
 * @param clientName - The client's name
 * @param data - Profile data to save
 * @param organizationId - Required: The organization ID for path construction
 * @param profile - User profile for validation
 */
export async function createOrUpdateClientProfile(
  coachUid: string,
  clientName: string,
  data: Partial<Omit<ClientProfile, 'clientName' | 'createdAt' | 'updatedAt'>>,
  organizationId?: string,
  profile?: UserProfile | null,
): Promise<void> {
  // Validate organizationId before proceeding
  const validOrgId = validateOrganizationId(organizationId, profile);

  const ref = clientProfileDoc(validOrgId, clientName);
  const snap = await getDoc(ref);

  const existingData = snap.exists() ? (snap.data() as ClientProfile) : null;

  if (snap.exists()) {
    // Verify ownership: if existing doc has orgId, it must match validated orgId
    if (existingData?.organizationId && existingData.organizationId !== validOrgId) {
      throw new Error('Cannot update client profile: Organization mismatch.');
    }

    await updateDoc(ref, {
      ...data,
      organizationId: validOrgId,
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(ref, {
      clientName,
      organizationId: validOrgId,
      assignedCoachUid: coachUid,
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Subscribe to a client profile for real-time updates
 * @param coachUid - The coach's user ID (kept for backwards compatibility)
 * @param clientName - The client's name
 * @param callback - Callback function for profile updates
 * @param organizationId - Required: The organization ID for path construction
 */
export function subscribeToClientProfile(
  coachUid: string,
  clientName: string,
  callback: (profile: ClientProfile | null) => void,
  organizationId?: string,
): () => void {
  if (!organizationId) {
    callback(null);
    return () => {};
  }

  const ref = clientProfileDoc(organizationId, clientName);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      const data = snap.data() as ClientProfile;
      // Verify organization ownership
      if (data.organizationId && data.organizationId !== organizationId) {
        callback(null);
      } else {
        callback(data);
      }
    } else {
      callback(null);
    }
  });
}

/**
 * Update the retest schedule for a client
 * Called when a full assessment is completed to store recommendations
 */
export async function updateRetestSchedule(
  clientName: string,
  organizationId: string,
  retestSchedule: StoredRetestSchedule,
): Promise<void> {
  const ref = clientProfileDoc(organizationId, clientName);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error(`Client profile not found: ${clientName}`);
  }

  await updateDoc(ref, {
    retestSchedule,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update custom cadence overrides for a client
 * Called when coach modifies the retest schedule
 */
export async function updateCustomCadence(
  clientName: string,
  organizationId: string,
  customSchedule: Partial<PillarCadence>,
): Promise<void> {
  const ref = clientProfileDoc(organizationId, clientName);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error(`Client profile not found: ${clientName}`);
  }

  const existing = snap.data() as ClientProfile;
  
  // Merge with existing custom schedule
  const updatedCustom = {
    ...existing.retestSchedule?.custom,
    ...customSchedule,
  };

  await updateDoc(ref, {
    'retestSchedule.custom': updatedCustom,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Reset custom cadence to use recommendations only
 */
export async function resetCustomCadence(
  clientName: string,
  organizationId: string,
): Promise<void> {
  const ref = clientProfileDoc(organizationId, clientName);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error(`Client profile not found: ${clientName}`);
  }

  await updateDoc(ref, {
    'retestSchedule.custom': null,
    updatedAt: serverTimestamp(),
  });
}
