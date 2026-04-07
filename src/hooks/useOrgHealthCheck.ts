/**
 * Derives which multi-tenancy fields are missing from the current org.
 *
 * Legacy orgs (created before multi-tenancy) may be missing type, region,
 * subscription.planKind, or equipmentConfig. This hook reads from the already-
 * loaded auth state — no extra Firestore reads required.
 */

import { useAuth } from '@/hooks/useAuth';

export interface OrgHealthIssues {
  /** org.type or org.region is absent */
  missingBusinessInfo: boolean;
  /** subscription is absent or still set to 'pending_onboarding' */
  missingPlan: boolean;
  /** equipmentConfig is absent */
  missingEquipment: boolean;
  /** profile.onboardingCompleted is not true */
  incompleteProfile: boolean;
}

export interface OrgHealthCheck {
  /** True while auth / org settings are still loading */
  loading: boolean;
  /** True when the org has everything it needs — no wizard required */
  allHealthy: boolean;
  issues: OrgHealthIssues;
}

export function useOrgHealthCheck(): OrgHealthCheck {
  const { loading, profile, orgSettings } = useAuth();

  if (loading || !profile) {
    return {
      loading: true,
      allHealthy: false,
      issues: {
        missingBusinessInfo: false,
        missingPlan: false,
        missingEquipment: false,
        incompleteProfile: false,
      },
    };
  }

  // New users (no org yet) are handled by the /onboarding signup flow — not this wizard.
  if (!profile.organizationId) {
    return {
      loading: false,
      allHealthy: true,
      issues: {
        missingBusinessInfo: false,
        missingPlan: false,
        missingEquipment: false,
        incompleteProfile: false,
      },
    };
  }

  // Wait for orgSettings to resolve before declaring unhealthy.
  // orgSettings can be null while the snapshot is still loading.
  if (!orgSettings) {
    return {
      loading: true,
      allHealthy: false,
      issues: {
        missingBusinessInfo: false,
        missingPlan: false,
        missingEquipment: false,
        incompleteProfile: false,
      },
    };
  }

  const missingBusinessInfo = !orgSettings.type || !orgSettings.region;

  const planKind = orgSettings.subscription?.planKind;
  const missingPlan = !planKind || planKind === 'pending_onboarding';

  const missingEquipment = !orgSettings.equipmentConfig;

  const incompleteProfile = !profile.onboardingCompleted;

  const allHealthy =
    !missingBusinessInfo && !missingPlan && !missingEquipment && !incompleteProfile;

  return {
    loading: false,
    allHealthy,
    issues: { missingBusinessInfo, missingPlan, missingEquipment, incompleteProfile },
  };
}
