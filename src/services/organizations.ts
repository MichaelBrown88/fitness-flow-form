import { doc, getDoc, updateDoc, collection, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getDb, getStorage } from '@/services/firebase';
import { sanitizeForFirestore } from '@/lib/utils/firebaseUtils';
import { logger } from '@/lib/utils/logger';


/**
 * Equipment configuration for assessments
 * Simple enabled/disabled toggle for each piece of equipment.
 * When disabled, assessments automatically show ALL equipment-free alternative methods.
 * 
 * Equipment Structure (ALL equipment types use ONLY enabled: boolean):
 * - bodyComposition.enabled: true = analyzer (InBody, DEXA, etc.), false = body measurements + skinfold test (clients can still bring reports)
 * - gripStrength.enabled: true = dynamometer, false = deadhang + pinch test options
 * - cardioEquipment.enabled: true = treadmill/bike/rower, false = step test
 * - heartRateSensor.enabled: true = HR sensor integration, false = manual pulse check
 */
export interface EquipmentConfig {
  // Body Composition Analyser (BIA Scanner, InBody, DEXA, etc.)
  bodyComposition: {
    enabled: boolean; // true = use analyzer, false = body measurements + skinfold + allow client reports
  };
  // Grip Strength Equipment (Dynamometer)
  gripStrength: {
    enabled: boolean; // true = dynamometer, false = deadhang + pinch test options
  };
  // Cardio Equipment (Treadmill, Bike, Rower with watt/speed readout)
  cardioEquipment: {
    enabled: boolean; // true = treadmill/bike/rower, false = step test
  };
  // Heart Rate Sensor (Polar, Garmin, chest strap, etc.)
  heartRateSensor: {
    enabled: boolean; // true = HR sensor integration, false = manual pulse check
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
    mobility: boolean; // P5 - Joint mobility screen (section: 'mobility')
    strength: boolean; // P6 - Strength & endurance tests (section: 'strength')
    lifestyle: boolean; // P7 - Lifestyle & habits questionnaire (section: 'lifestyle')
  };
  equipmentConfig: EquipmentConfig;
  onboardingCompletedAt?: Timestamp; // Firestore Timestamp
  // Platform admin controlled features
  demoAutoFillEnabled?: boolean; // Demo persona auto-fill (for affiliates/sales demos) - OFF by default
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
  bodyComposition: {
    enabled: false, // Default: no analyzer → shows body measurements + skinfold (clients can bring reports)
  },
  gripStrength: {
    enabled: false, // Default: no dynamometer → shows deadhang + pinch test options
  },
  cardioEquipment: {
    enabled: false, // Default: no treadmill/bike/rower → shows step test
  },
  heartRateSensor: {
    enabled: false, // Default: no HR sensor → shows manual pulse check
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
  demoAutoFillEnabled: false, // OFF by default - platform admin controlled for affiliates/sales demos
};

/**
 * Get organization settings
 * Automatically migrates old equipmentConfig structure to new simplified structure
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
  
  const data = snap.data() as OrgSettings & { equipmentConfig?: Record<string, unknown> };
  
  // Define type for old equipment config structure (for migration)
  interface OldEquipmentItem {
    enabled?: boolean;
    method?: string;
  }
  
  // Migrate old equipmentConfig structure to new simplified structure
  const oldEquipmentConfig = (data.equipmentConfig as Record<string, unknown>) || {};
  
  // Handle old "treadmill" field → migrate to "cardioEquipment"
  // Old structure might have treadmill.enabled or treadmill as boolean
  const oldTreadmillValue = oldEquipmentConfig.treadmill;
  const oldTreadmillEnabled = typeof oldTreadmillValue === 'object' && oldTreadmillValue !== null
    ? ((oldTreadmillValue as OldEquipmentItem)?.enabled ?? false)
    : (typeof oldTreadmillValue === 'boolean' ? oldTreadmillValue : false);
  
  const cardioEquipmentEnabled = (oldEquipmentConfig.cardioEquipment as OldEquipmentItem | undefined)?.enabled ?? oldTreadmillEnabled;
  
  // Determine bodyComposition.enabled from old structure
  // If bodyComposition has method but no enabled, infer enabled from method
  // method = "measurements" or "none" → enabled = false
  // method = "inbody", "dexa", etc. → enabled = true
  const oldBodyComp = (oldEquipmentConfig.bodyComposition as OldEquipmentItem | undefined) || {};
  const bodyCompEnabled = oldBodyComp.enabled !== undefined 
    ? oldBodyComp.enabled 
    : (oldBodyComp.method !== undefined && 
       oldBodyComp.method !== 'measurements' && 
       oldBodyComp.method !== 'none');
  
  // Determine gripStrength.enabled from old structure
  // method = "none" or "deadhang" → enabled = false (equipment-free)
  // method = "dynamometer", etc. → enabled = true
  const oldGripStrength = (oldEquipmentConfig.gripStrength as OldEquipmentItem | undefined) || {};
  const gripStrengthEnabled = oldGripStrength.enabled !== undefined
    ? oldGripStrength.enabled
    : (oldGripStrength.method !== undefined && 
       oldGripStrength.method !== 'none' && 
       oldGripStrength.method !== 'deadhang');
  
  // Build clean equipment config (only enabled fields, no method fields)
  const cleanEquipmentConfig: EquipmentConfig = {
    bodyComposition: {
      enabled: bodyCompEnabled,
    },
    gripStrength: {
      enabled: gripStrengthEnabled,
    },
    cardioEquipment: {
      enabled: cardioEquipmentEnabled,
    },
    heartRateSensor: {
      enabled: (oldEquipmentConfig.heartRateSensor as OldEquipmentItem | undefined)?.enabled ?? DEFAULT_EQUIPMENT_CONFIG.heartRateSensor.enabled,
    },
  };
  
  // Migration is performed in-memory during every fetch.
  // The automatic updateDoc call has been removed to ensure getOrgSettings is a pure read operation.
  // Manual migration can still be triggered via migrateEquipmentConfig.
  
  // Return cleaned data structure
  return {
    name: data.name ?? DEFAULT_SETTINGS.name,
    brandColor: data.brandColor ?? DEFAULT_SETTINGS.brandColor,
    gradientId: data.gradientId ?? DEFAULT_SETTINGS.gradientId,
    logoUrl: data.logoUrl,
    modules: {
      ...DEFAULT_SETTINGS.modules,
      ...(data.modules || {})
    },
    equipmentConfig: cleanEquipmentConfig,
    demoAutoFillEnabled: data.demoAutoFillEnabled ?? DEFAULT_SETTINGS.demoAutoFillEnabled,
  };
}

/**
 * Update organization settings
 * Automatically cleans equipmentConfig to remove method fields (ensures only enabled field exists)
 */
export async function updateOrgSettings(orgId: string, updates: Partial<OrgSettings>): Promise<void> {
  const ref = doc(getDb(), 'organizations', orgId);
  
  // If updating equipmentConfig, ensure only enabled field is saved (remove any method fields)
  if (updates.equipmentConfig) {
    updates.equipmentConfig = {
      bodyComposition: {
        enabled: updates.equipmentConfig.bodyComposition?.enabled ?? false,
      },
      gripStrength: {
        enabled: updates.equipmentConfig.gripStrength?.enabled ?? false,
      },
      cardioEquipment: {
        enabled: updates.equipmentConfig.cardioEquipment?.enabled ?? false,
      },
      heartRateSensor: {
        enabled: updates.equipmentConfig.heartRateSensor?.enabled ?? false,
      },
    };
  }
  
  await updateDoc(ref, sanitizeForFirestore(updates) as Record<string, unknown>);
}

/**
 * Migrate organization's equipmentConfig to simplified structure
 * This can be called manually to fix existing organizations
 * Run from browser console: await window.migrateEquipmentConfig?.('org-xxx')
 */
export async function migrateEquipmentConfig(orgId: string): Promise<{ success: boolean; message: string }> {
  try {
    // getOrgSettings will automatically detect and migrate old structure if needed
    await getOrgSettings(orgId);
    return { 
      success: true, 
      message: `Equipment config migrated successfully for org ${orgId}. All equipment now uses only 'enabled' field.` 
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to migrate: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Expose migration function to window in development for easy console access
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as Window & { migrateEquipmentConfig?: typeof migrateEquipmentConfig }).migrateEquipmentConfig = migrateEquipmentConfig;
  logger.info('Equipment Migration Utility loaded. Use: await window.migrateEquipmentConfig("org-xxx")', 'organizations');
}
