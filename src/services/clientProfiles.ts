import { doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot, Timestamp } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { validateOrganizationId } from '@/lib/utils/validateOrganizationId';
import type { UserProfile } from '@/types/auth';

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
};

const clientProfileDoc = (coachUid: string, clientName: string) =>
  doc(getDb(), 'coaches', coachUid, 'clients', clientName.toLowerCase().replace(/\s+/g, '-'));

export async function getClientProfile(
  coachUid: string,
  clientName: string,
  organizationId?: string,
): Promise<ClientProfile | null> {
  const ref = clientProfileDoc(coachUid, clientName);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as ClientProfile;
  
  if (organizationId && data.organizationId && data.organizationId !== organizationId) {
    return null;
  }
  
  return data;
}

export async function createOrUpdateClientProfile(
  coachUid: string,
  clientName: string,
  data: Partial<Omit<ClientProfile, 'clientName' | 'createdAt' | 'updatedAt'>>,
  organizationId?: string,
  profile?: UserProfile | null,
): Promise<void> {
  const ref = clientProfileDoc(coachUid, clientName);
  const snap = await getDoc(ref);
  
  // Validate organizationId before proceeding
  // Use provided orgId, fall back to existing, then validate
  const existingData = snap.exists() ? (snap.data() as ClientProfile) : null;
  const orgIdToValidate = organizationId || existingData?.organizationId;
  const validOrgId = validateOrganizationId(orgIdToValidate, profile);
  
  if (snap.exists()) {
    // Verify ownership: if existing doc has orgId, it must match validated orgId
    if (existingData?.organizationId && existingData.organizationId !== validOrgId) {
      throw new Error('Cannot update client profile: Organization mismatch. This client belongs to a different organization.');
    }
    
    await updateDoc(ref, {
      ...data,
      organizationId: validOrgId, // Use validated organizationId (never null)
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(ref, {
      clientName,
      organizationId: validOrgId, // Use validated organizationId (never null)
      assignedCoachUid: coachUid,
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

export function subscribeToClientProfile(
  coachUid: string,
  clientName: string,
  callback: (profile: ClientProfile | null) => void,
  organizationId?: string,
): () => void {
  const ref = clientProfileDoc(coachUid, clientName);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      const data = snap.data() as ClientProfile;
      if (organizationId && data.organizationId && data.organizationId !== organizationId) {
        callback(null);
      } else {
        callback(data);
      }
    } else {
      callback(null);
    }
  });
}

