/**
 * Platform Configuration Service
 * 
 * Handles reading and writing platform-wide configuration including:
 * - Feature flags (kill switches for AI features)
 * - Maintenance mode settings
 * 
 * Uses real-time listeners for instant propagation of config changes.
 */

import { getDoc, setDoc, onSnapshot, serverTimestamp, Unsubscribe } from 'firebase/firestore';
import { getPlatformConfigDoc } from '@/lib/database/collections';
import { logAdminAction } from './auditLog';
import type { PlatformConfig, PlatformFeatureFlags } from '@/types/platform';
import { DEFAULT_PLATFORM_CONFIG } from '@/types/platform';
import { logger } from '@/lib/utils/logger';

/**
 * Get the current platform configuration
 * Returns default config if document doesn't exist
 */
export async function getPlatformConfig(): Promise<PlatformConfig> {
  try {
    const docRef = getPlatformConfigDoc();
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      logger.debug('Platform config document does not exist, using defaults');
      return DEFAULT_PLATFORM_CONFIG;
    }

    const data = docSnap.data();
    return {
      features: {
        posture_enabled: data.features?.posture_enabled ?? true,
        ocr_enabled: data.features?.ocr_enabled ?? true,
        report_generation_enabled: data.features?.report_generation_enabled ?? true,
      },
      maintenance: {
        message: data.maintenance?.message,
        affected_features: data.maintenance?.affected_features,
        is_maintenance_mode: data.maintenance?.is_maintenance_mode ?? false,
      },
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
      updatedBy: data.updatedBy || 'unknown',
    };
  } catch (error) {
    logger.error('Error fetching platform config:', error);
    // Return defaults on error to prevent app from breaking
    return DEFAULT_PLATFORM_CONFIG;
  }
}

/**
 * Subscribe to platform configuration changes in real-time
 * @param callback Function called when config changes
 * @returns Unsubscribe function
 */
export function subscribeToPlatformConfig(
  callback: (config: PlatformConfig) => void
): Unsubscribe {
  const docRef = getPlatformConfigDoc();

  return onSnapshot(
    docRef,
    (docSnap) => {
      if (!docSnap.exists()) {
        callback(DEFAULT_PLATFORM_CONFIG);
        return;
      }

      const data = docSnap.data();
      const config: PlatformConfig = {
        features: {
          posture_enabled: data.features?.posture_enabled ?? true,
          ocr_enabled: data.features?.ocr_enabled ?? true,
          report_generation_enabled: data.features?.report_generation_enabled ?? true,
        },
        maintenance: {
          message: data.maintenance?.message,
          affected_features: data.maintenance?.affected_features,
          is_maintenance_mode: data.maintenance?.is_maintenance_mode ?? false,
        },
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        updatedBy: data.updatedBy || 'unknown',
      };

      callback(config);
    },
    (error) => {
      logger.error('Error subscribing to platform config:', 'PLATFORM_CONFIG', error);
      // Provide defaults on error
      callback(DEFAULT_PLATFORM_CONFIG);
    }
  );
}

/**
 * Update a single feature flag
 * @param featureKey The feature to update
 * @param enabled Whether the feature should be enabled
 * @param adminUid UID of the platform admin making the change
 */
export async function updateFeatureFlag(
  featureKey: keyof PlatformFeatureFlags,
  enabled: boolean,
  adminUid: string
): Promise<void> {
  try {
    const docRef = getPlatformConfigDoc();
    const currentConfig = await getPlatformConfig();

    await setDoc(docRef, {
      ...currentConfig,
      features: {
        ...currentConfig.features,
        [featureKey]: enabled,
      },
      updatedAt: serverTimestamp(),
      updatedBy: adminUid,
    });

    logger.info(`Feature flag ${featureKey} set to ${enabled} by ${adminUid}`);
    await logAdminAction(adminUid, 'feature_toggle', featureKey, { enabled });
  } catch (error) {
    logger.error(`Error updating feature flag ${featureKey}:`, error);
    throw error;
  }
}

/**
 * Update multiple feature flags at once
 * @param features Partial feature flags to update
 * @param adminUid UID of the platform admin making the change
 */
export async function updateFeatureFlags(
  features: Partial<PlatformFeatureFlags>,
  adminUid: string
): Promise<void> {
  try {
    const docRef = getPlatformConfigDoc();
    const currentConfig = await getPlatformConfig();

    await setDoc(docRef, {
      ...currentConfig,
      features: {
        ...currentConfig.features,
        ...features,
      },
      updatedAt: serverTimestamp(),
      updatedBy: adminUid,
    });

    logger.info(`Feature flags updated by ${adminUid}`, 'PLATFORM_CONFIG', features);
  } catch (error) {
    logger.error('Error updating feature flags', 'PLATFORM_CONFIG', error);
    throw error;
  }
}

/**
 * Set maintenance mode with optional message
 * @param isEnabled Whether maintenance mode is enabled
 * @param message Optional message to display to users
 * @param affectedFeatures Optional list of affected feature keys
 * @param adminUid UID of the platform admin making the change
 */
export async function setMaintenanceMode(
  isEnabled: boolean,
  adminUid: string,
  message?: string,
  affectedFeatures?: (keyof PlatformFeatureFlags)[]
): Promise<void> {
  try {
    const docRef = getPlatformConfigDoc();
    const currentConfig = await getPlatformConfig();

    await setDoc(docRef, {
      ...currentConfig,
      maintenance: {
        is_maintenance_mode: isEnabled,
        message: isEnabled ? message : undefined,
        affected_features: isEnabled ? affectedFeatures : undefined,
      },
      updatedAt: serverTimestamp(),
      updatedBy: adminUid,
    });

    logger.info(`Maintenance mode ${isEnabled ? 'enabled' : 'disabled'} by ${adminUid}`);
    await logAdminAction(adminUid, 'maintenance_mode', undefined, {
      isEnabled,
      message: message ?? undefined,
      affectedFeatures: affectedFeatures ?? undefined,
    });
  } catch (error) {
    logger.error('Error setting maintenance mode:', error);
    throw error;
  }
}

/**
 * Check if a specific feature is enabled
 * Useful for quick checks in components/services
 */
export async function isFeatureEnabled(
  featureKey: keyof PlatformFeatureFlags
): Promise<boolean> {
  const config = await getPlatformConfig();
  return config.features[featureKey] ?? true;
}
