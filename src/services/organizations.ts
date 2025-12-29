import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getDb, getStorage } from '@/lib/firebase';
import { sanitizeForFirestore } from '@/lib/utils/firebaseUtils';

export interface OrgSettings {
  name: string;
  logoUrl?: string;
  brandColor?: string; // hex
  modules: {
    inbody: boolean;
    posture: boolean;
    movement: boolean;
    fitness: boolean;
    strength: boolean;
    lifestyle: boolean;
  };
}

/**
 * Upload organization logo
 */
export async function uploadOrgLogo(orgId: string, file: File): Promise<string> {
  const storage = getStorage();
  const logoRef = ref(storage, `organizations/${orgId}/logo_${Date.now()}`);
  
  await uploadBytes(logoRef, file);
  const downloadUrl = await getDownloadURL(logoRef);
  
  await updateOrgSettings(orgId, { logoUrl: downloadUrl });
  return downloadUrl;
}

const DEFAULT_SETTINGS: OrgSettings = {
  name: 'New Organization',
  brandColor: '#03dee2', 
  modules: {
    inbody: true,
    posture: true,
    movement: true,
    fitness: true,
    strength: true,
    lifestyle: true,
  }
};

/**
 * Get organization settings
 */
export async function getOrgSettings(orgId: string): Promise<OrgSettings> {
  if (!orgId) throw new Error('Organization ID is required');
  
  const ref = doc(getDb(), 'organizations', orgId);
  const snap = await getDoc(ref);
  
  if (!snap.exists()) {
    // If it doesn't exist, create default settings
    await setDoc(ref, DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
  
  const data = snap.data() as OrgSettings;
  // Deep merge with defaults to ensure all module keys exist
  return {
    ...DEFAULT_SETTINGS,
    ...data,
    modules: {
      ...DEFAULT_SETTINGS.modules,
      ...(data.modules || {})
    }
  };
}

/**
 * Update organization settings
 */
export async function updateOrgSettings(orgId: string, updates: Partial<OrgSettings>): Promise<void> {
  const ref = doc(getDb(), 'organizations', orgId);
  await updateDoc(ref, sanitizeForFirestore(updates) as any);
}
