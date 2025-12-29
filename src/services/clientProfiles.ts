import { doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot, Timestamp } from 'firebase/firestore';
import { getDb } from '@/lib/firebase';

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
): Promise<void> {
  const ref = clientProfileDoc(coachUid, clientName);
  const snap = await getDoc(ref);
  
  if (snap.exists()) {
    await updateDoc(ref, {
      ...data,
      organizationId: organizationId || (snap.data() as ClientProfile).organizationId || null,
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(ref, {
      clientName,
      organizationId: organizationId || null,
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

