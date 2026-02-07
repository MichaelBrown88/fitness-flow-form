/**
 * FeatureGate Component
 * 
 * Conditionally renders children based on feature flag status.
 * Shows a disabled message when the feature is turned off.
 * 
 * Usage:
 *   <FeatureGate feature="posture_enabled" fallback={<DisabledMessage />}>
 *     <PostureAnalysisButton />
 *   </FeatureGate>
 */

import React from 'react';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import type { PlatformFeatureFlags } from '@/types/platform';
import { FEATURE_NAMES } from '@/constants/platform';
import { AlertTriangle, Power } from 'lucide-react';

interface FeatureGateProps {
  /** The feature key to check */
  feature: keyof PlatformFeatureFlags;
  /** Content to render when feature is enabled */
  children: React.ReactNode;
  /** Optional custom fallback when feature is disabled */
  fallback?: React.ReactNode;
  /** If true, shows nothing instead of fallback when disabled */
  hideWhenDisabled?: boolean;
}

/**
 * Gate component that conditionally renders children based on feature flags
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  hideWhenDisabled = false,
}) => {
  const { isFeatureEnabled, loading } = useFeatureFlags();

  // Show children while loading to prevent flash
  if (loading) {
    return <>{children}</>;
  }

  if (isFeatureEnabled(feature)) {
    return <>{children}</>;
  }

  // Feature is disabled
  if (hideWhenDisabled) {
    return null;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Default disabled message
  const constantKey = feature.toUpperCase() as keyof typeof FEATURE_NAMES;
  const featureName = FEATURE_NAMES[constantKey] || feature;

  return <FeatureDisabledMessage featureName={featureName} />;
};

interface FeatureDisabledMessageProps {
  featureName: string;
  compact?: boolean;
}

/**
 * Default message shown when a feature is disabled
 */
export const FeatureDisabledMessage: React.FC<FeatureDisabledMessageProps> = ({
  featureName,
  compact = false,
}) => {
  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
        <Power className="w-4 h-4" />
        <span>{featureName} temporarily unavailable</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-amber-50 border border-amber-200 rounded-xl text-center">
      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-3">
        <AlertTriangle className="w-6 h-6 text-amber-600" />
      </div>
      <h4 className="text-amber-800 font-semibold mb-1">Feature Temporarily Unavailable</h4>
      <p className="text-amber-600 text-sm max-w-xs">
        {featureName} is currently disabled for maintenance. Please try again later.
      </p>
    </div>
  );
};

/**
 * Hook to check feature status and get disabled props for buttons
 * Returns props to spread onto buttons when feature is disabled
 */
export function useFeatureGateProps(feature: keyof PlatformFeatureFlags) {
  const { isFeatureEnabled, loading } = useFeatureFlags();
  const enabled = loading || isFeatureEnabled(feature);

  const constantKey = feature.toUpperCase() as keyof typeof FEATURE_NAMES;
  const featureName = FEATURE_NAMES[constantKey] || feature;

  return {
    enabled,
    disabled: !enabled,
    title: enabled ? undefined : `${featureName} is temporarily disabled`,
    'aria-disabled': !enabled,
  };
}
