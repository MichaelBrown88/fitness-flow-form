/**
 * useFeatureFlags Hook
 * 
 * Provides real-time access to platform feature flags (kill switches).
 * Subscribes to platform/config document and updates automatically when flags change.
 * 
 * Usage:
 *   const { isFeatureEnabled, features, loading } = useFeatureFlags();
 *   
 *   if (!isFeatureEnabled('posture_enabled')) {
 *     return <FeatureDisabledMessage feature="AI Posture Analysis" />;
 *   }
 */

import { useState, useEffect, useCallback } from 'react';
import { subscribeToPlatformConfig } from '@/services/platform/platformConfig';
import type { PlatformConfig, PlatformFeatureFlags, PlatformMaintenanceSettings } from '@/types/platform';
import { DEFAULT_PLATFORM_CONFIG } from '@/types/platform';

export interface UseFeatureFlagsResult {
  /** Check if a specific feature is enabled */
  isFeatureEnabled: (featureKey: keyof PlatformFeatureFlags) => boolean;
  /** All feature flags */
  features: PlatformFeatureFlags;
  /** Maintenance settings */
  maintenance: PlatformMaintenanceSettings;
  /** Whether the initial config has loaded */
  loading: boolean;
  /** Full platform config (for advanced use cases) */
  config: PlatformConfig;
}

/**
 * Hook to access platform feature flags with real-time updates
 */
export function useFeatureFlags(): UseFeatureFlagsResult {
  const [config, setConfig] = useState<PlatformConfig>(DEFAULT_PLATFORM_CONFIG);
  const [loading, setLoading] = useState(true);

  // Subscribe to platform config changes
  useEffect(() => {
    const unsubscribe = subscribeToPlatformConfig((newConfig) => {
      setConfig(newConfig);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Check if a specific feature is enabled
  const isFeatureEnabled = useCallback((featureKey: keyof PlatformFeatureFlags): boolean => {
    // If still loading, assume features are enabled to prevent flash of disabled state
    if (loading) return true;
    return config.features[featureKey] ?? true;
  }, [config.features, loading]);

  return {
    isFeatureEnabled,
    features: config.features,
    maintenance: config.maintenance,
    loading,
    config,
  };
}

/**
 * Quick check function for use outside of React components
 * Note: This is a one-time check, not a subscription. Use the hook for real-time updates.
 */
export { isFeatureEnabled as checkFeatureEnabled } from '@/services/platform/platformConfig';
