import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getDb, getStorage } from '@/services/firebase';
import { sanitizeForFirestore } from '@/lib/utils/firebaseUtils';

import type { GripStrengthMethod, BodyCompositionMethod, SkinfoldMethod } from '@/lib/utils/measurementConverters';

/**
 * Equipment configuration for assessments
 * Allows different facilities to use different equipment while maintaining comparable scoring
 */
export interface EquipmentConfig {
  gripStrength: {
    method: GripStrengthMethod;
    enabled: boolean; // Toggle to enable/disable grip strength testing
  };
  bodyComposition: {
    method: BodyCompositionMethod;
    skinfoldMethod?: SkinfoldMethod; // Required if method is 'skinfold'
  };
}

/**
 * Granular assessment toggles - each assessment can be enabled/disabled independently
 * Section IDs map to phaseConfig section.id values
 */
export interface OrgSettings {
  name: string;
  logoUrl?: string;
  brandColor?: string; // hex (deprecated - use gradientId instead)
  gradientId?: string; // Gradient ID from gradient system (e.g., 'purple-indigo', 'blue-cyan')
  modules: {
    parq: boolean; // P0 - PAR-Q health screening
    inbody: boolean; // P2 - Body composition scan (section: 'body-comp')
    fitness: boolean; // P3 - Metabolic fitness assessment (section: 'fitness-assessment')
    posture: boolean; // P4 - Posture analysis (section: 'posture')
    overheadSquat: boolean; // P4 - Overhead squat assessment (section: 'overhead-squat')
    hinge: boolean; // P4 - Hinge assessment (section: 'hinge-assessment')
    lunge: boolean; // P4 - Lunge assessment (section: 'lunge-assessment')
    mobility: boolean; // P4 - Mobility assessment (section: 'mobility')
    strength: boolean; // P5 - Muscular strength (section: 'strength-endurance')
    lifestyle: boolean; // P1 - Lifestyle factors (section: 'lifestyle-overview')
  };
  equipmentConfig?: EquipmentConfig; // Optional: defaults provided if not set
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

export const DEFAULT_EQUIPMENT_CONFIG: EquipmentConfig = {
  gripStrength: {
    method: 'dynamometer',
    enabled: true, // Default: grip test is enabled
  },
  bodyComposition: {
    method: 'inbody',
  },
};

const DEFAULT_SETTINGS: OrgSettings = {
  name: 'New Organization',
  brandColor: '#03dee2', // Deprecated - kept for backward compatibility
  gradientId: 'purple-indigo', // Default gradient
  modules: {
    parq: true,
    inbody: true,
    fitness: true,
    posture: true,
    overheadSquat: true,
    hinge: true,
    lunge: true,
    mobility: true,
    strength: true,
    lifestyle: true,
  },
  equipmentConfig: DEFAULT_EQUIPMENT_CONFIG,
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
  // Return actual data - only use defaults for missing/null/undefined fields
  // This prevents overwriting user-entered values with defaults when reloading
  return {
    name: data.name ?? DEFAULT_SETTINGS.name,
    brandColor: data.brandColor ?? DEFAULT_SETTINGS.brandColor,
    gradientId: data.gradientId ?? DEFAULT_SETTINGS.gradientId,
    logoUrl: data.logoUrl,
    modules: {
      ...DEFAULT_SETTINGS.modules,
      ...(data.modules || {})
    },
    equipmentConfig: {
      ...DEFAULT_EQUIPMENT_CONFIG,
      ...(data.equipmentConfig || {}),
      gripStrength: {
        ...DEFAULT_EQUIPMENT_CONFIG.gripStrength,
        ...(data.equipmentConfig?.gripStrength || {})
      },
      bodyComposition: {
        ...DEFAULT_EQUIPMENT_CONFIG.bodyComposition,
        ...(data.equipmentConfig?.bodyComposition || {}),
      }
    }
  };
}

/**
 * Update organization settings
 */
export async function updateOrgSettings(orgId: string, updates: Partial<OrgSettings>): Promise<void> {
  const ref = doc(getDb(), 'organizations', orgId);
  await updateDoc(ref, sanitizeForFirestore(updates) as Record<string, unknown>);
}
